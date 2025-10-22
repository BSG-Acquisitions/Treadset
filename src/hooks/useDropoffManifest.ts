import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useManifestIntegration } from "@/hooks/useManifestIntegration";
import type { Database } from "@/integrations/supabase/types";

type Dropoff = Database["public"]["Tables"]["dropoffs"]["Row"] & {
  dropoff_customers?: {
    contact_name: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

export const useGenerateDropoffManifest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const manifestIntegration = useManifestIntegration();

  return useMutation({
    mutationFn: async (dropoff: Dropoff) => {
      // 1. First check if manifest already exists for this dropoff
      if (dropoff.manifest_id) {
        // If manifest exists, just generate the PDF
        return await manifestIntegration.mutateAsync({
          manifestId: dropoff.manifest_id
        });
      }

      // 2. Create a new manifest from dropoff data
      // Resolve organization
      const { data: orgId, error: orgErr } = await supabase.rpc('get_current_user_organization', { org_slug: 'bsg' });
      if (orgErr) throw orgErr;
      if (!orgId) throw new Error('No organization configured for current user');

      // Generate manifest number
      const { data: manifestNumber, error: numberError } = await supabase
        .rpc('generate_manifest_number', { org_id: orgId });
      if (numberError) throw numberError;

      // First, get or create a default dropoff client to satisfy the client_id requirement
      let clientId: string;
      
      // Check if we have a default "Dropoff Customers" client
      const { data: existingClient, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', orgId)
        .eq('company_name', 'Dropoff Customers')
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create a default client for dropoffs
        const { data: newClient, error: createClientError } = await supabase
          .from('clients')
          .insert({
            organization_id: orgId,
            company_name: 'Dropoff Customers',
            contact_name: 'Various Customers',
            email: 'dropoffs@bsgtires.com',
            notes: 'Default client for dropoff manifests'
          })
          .select('id')
          .single();

        if (createClientError) throw createClientError;
        clientId = newClient.id;
      }

      // Find existing BSG hauler - global table (no organization_id column)
      // Use ILIKE with trim to handle any whitespace issues
      const { data: haulerRow, error: haulerError } = await supabase
        .from('haulers')
        .select('id')
        .ilike('hauler_name', '%BSG Tire Recycling%')
        .eq('is_active', true)
        .maybeSingle();

      if (haulerError) throw haulerError;
      if (!haulerRow) {
        throw new Error('BSG Tire Recycling hauler not found. Please create or activate it in Haulers.');
      }

      const haulerId = haulerRow.id;

      // Create manifest data from dropoff
      const manifestData = {
        manifest_number: manifestNumber as string,
        organization_id: orgId as string,
        client_id: clientId, // Use the default dropoff client
        hauler_id: haulerId, // BSG is always the hauler for dropoffs
        location_id: null,
        pickup_id: null,
        dropoff_id: dropoff.id, // Link to the dropoff
        pte_off_rim: dropoff.pte_count || 0,
        pte_on_rim: 0,
        commercial_17_5_19_5_off: 0,
        commercial_17_5_19_5_on: 0,
        commercial_22_5_off: 0,
        commercial_22_5_on: 0,
        otr_count: dropoff.otr_count || 0,
        tractor_count: dropoff.tractor_count || 0,
        weight_tons: null,
        volume_yards: null,
        payment_method: (dropoff.payment_method?.toUpperCase() || 'CASH') as 'CARD' | 'INVOICE' | 'CASH' | 'CHECK',
        payment_status: 'SUCCEEDED', // Dropoffs are typically already paid
        paid_amount: Number(dropoff.computed_revenue || 0),
        subtotal: Number(dropoff.computed_revenue || 0),
        surcharges: 0,
        total: Number(dropoff.computed_revenue || 0),
        status: 'AWAITING_SIGNATURE' as const,
        // Add dropoff customer info 
        signed_by_name: dropoff.dropoff_customers?.contact_name || 'Dropoff Customer',
        // Set signed timestamp using actual dropoff date/time
        signed_at: (() => {
          const date = dropoff.dropoff_date || new Date().toISOString().split('T')[0];
          const time = dropoff.dropoff_time || new Date().toTimeString().split(' ')[0];
          return `${date}T${time}`;
        })(),
        generator_signed_at: (() => {
          const date = dropoff.dropoff_date || new Date().toISOString().split('T')[0];
          const time = dropoff.dropoff_time || new Date().toTimeString().split(' ')[0];
          return `${date}T${time}`;
        })(),
        hauler_signed_at: (() => {
          const date = dropoff.dropoff_date || new Date().toISOString().split('T')[0];
          const time = dropoff.dropoff_time || new Date().toTimeString().split(' ')[0];
          return `${date}T${time}`;
        })()
      };

      // Create the manifest
      const { data: manifest, error: manifestError } = await supabase
        .from('manifests')
        .insert(manifestData)
        .select()
        .single();

      if (manifestError) throw manifestError;

      // 3. Update the dropoff to link to the manifest
      const { error: updateError } = await supabase
        .from('dropoffs')
        .update({ 
          manifest_id: manifest.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', dropoff.id);

      if (updateError) throw updateError;

      // 4. Generate the PDF using the manifest integration
      const result = await manifestIntegration.mutateAsync({
        manifestId: manifest.id,
        overrides: {
          // Override with dropoff customer information as generator
          generator_name: dropoff.dropoff_customers?.company_name || dropoff.dropoff_customers?.contact_name || 'Dropoff Customer',
          generator_print_name: dropoff.dropoff_customers?.contact_name || 'Dropoff Customer',
          generator_phone: dropoff.dropoff_customers?.phone || '',
          generator_mail_address: '', // Dropoffs don't typically have addresses
          generator_city: '',
          generator_state: '',
          generator_zip: '',
          generator_physical_address: '',
          generator_physical_city: '',
          generator_physical_state: '',
          generator_physical_zip: '',
          // Set tire counts based on dropoff data
          passenger_car_count: (dropoff.pte_count || 0).toString(),
          truck_count: '0',
          oversized_count: ((dropoff.otr_count || 0) + (dropoff.tractor_count || 0)).toString(),
          // Set hauler as the processing organization
          hauler_name: 'BSG Tire Recycling',
          hauler_print_name: 'BSG Representative',
          hauler_date: new Date().toISOString().split('T')[0],
          hauler_mail_address: '2971 Bellevue Street',
          hauler_city: 'Detroit',
          hauler_state: 'MI',
          hauler_zip: '48207',
          hauler_phone: '313-731-0817',
          hauler_mi_reg: 'H-82220004',
          // Leave receiver blank for now
          receiver_name: '',
          receiver_print_name: '',
        }
      });

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      toast({
        title: "Manifest Generated",
        description: "Dropoff manifest has been generated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed", 
        description: error?.message || "Failed to generate dropoff manifest",
        variant: "destructive"
      });
    }
  });
};