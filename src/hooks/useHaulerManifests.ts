import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useManifestIntegration } from "@/hooks/useManifestIntegration";

interface CreateHaulerManifestData {
  hauler_customer_id: string;
  pte_count: number;
  otr_count: number;
  tractor_count: number;
  payment_method: 'CASH' | 'CHECK' | 'CARD';
  payment_amount: number;
  notes?: string;
  generator_signature: string; // base64 data URL
  generator_print_name: string;
  hauler_signature: string; // base64 data URL
  hauler_print_name: string;
}

export const useHaulerManifests = (haulerId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const manifestIntegration = useManifestIntegration();

  // Fetch manifests created by this hauler
  const { data: manifests, isLoading } = useQuery({
    queryKey: ['hauler-manifests', haulerId],
    queryFn: async () => {
      if (!haulerId) return [];
      
      const { data, error } = await supabase
        .from('manifests')
        .select(`
          *,
          clients:client_id(id, company_name, email),
          hauler_customers:dropoff_id(
            dropoff_customer_id,
            dropoff_customers(id, company_name, contact_name, email, phone)
          )
        `)
        .eq('hauler_id', haulerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!haulerId
  });

  // Create a new manifest from hauler
  const createManifest = useMutation({
    mutationFn: async (data: CreateHaulerManifestData) => {
      // 1. Get hauler info and resolve organization
      const { data: hauler, error: haulerError} = await supabase
        .from('haulers')
        .select('*')
        .eq('id', haulerId)
        .single();

      if (haulerError) throw haulerError;

      // Get organization from current user
      const { data: orgId, error: orgError } = await supabase
        .rpc('get_current_user_organization', { org_slug: 'bsg' });
      
      if (orgError) throw orgError;
      if (!orgId) throw new Error('No organization found');

      // 2. Get customer info
      const { data: customer, error: customerError } = await supabase
        .from('hauler_customers')
        .select('*')
        .eq('id', data.hauler_customer_id)
        .single();

      if (customerError) throw customerError;

      // 3. Generate manifest number
      const { data: manifestNumber, error: numberError } = await supabase
        .rpc('generate_manifest_number', { org_id: orgId });

      if (numberError) throw numberError;

      // 4. Upload signatures to storage
      const timestamp = new Date().toISOString();
      
      // Generator signature
      const genSigResponse = await fetch(data.generator_signature);
      const genSigBlob = await genSigResponse.blob();
      const genSigFileName = `generator_signature_${Date.now()}.png`;
      const { error: genUploadError } = await supabase.storage
        .from('manifests')
        .upload(`signatures/${genSigFileName}`, genSigBlob);

      if (genUploadError) throw genUploadError;

      // Hauler signature
      const haulSigResponse = await fetch(data.hauler_signature);
      const haulSigBlob = await haulSigResponse.blob();
      const haulSigFileName = `hauler_signature_${Date.now()}.png`;
      const { error: haulUploadError } = await supabase.storage
        .from('manifests')
        .upload(`signatures/${haulSigFileName}`, haulSigBlob);

      if (haulUploadError) throw haulUploadError;

      // 5. Get or create default client for hauler manifests
      let clientId: string;
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', orgId)
        .eq('company_name', `Hauler Manifests - ${hauler.company_name}`)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient, error: createClientError } = await supabase
          .from('clients')
          .insert({
            organization_id: orgId,
            company_name: `Hauler Manifests - ${hauler.company_name}`,
            contact_name: customer.contact_name,
            email: customer.email,
            phone: customer.phone,
            notes: `Auto-created for hauler ${hauler.company_name}`
          })
          .select('id')
          .single();

        if (createClientError) throw createClientError;
        clientId = newClient.id;
      }

      // 6. Create manifest
      const manifestData = {
        manifest_number: manifestNumber as string,
        organization_id: orgId,
        client_id: clientId,
        hauler_id: haulerId,
        pte_off_rim: data.pte_count,
        pte_on_rim: 0,
        commercial_17_5_19_5_off: 0,
        commercial_17_5_19_5_on: 0,
        commercial_22_5_off: 0,
        commercial_22_5_on: 0,
        otr_count: data.otr_count,
        tractor_count: data.tractor_count,
        payment_method: data.payment_method,
        payment_status: 'SUCCEEDED',
        paid_amount: data.payment_amount,
        subtotal: data.payment_amount,
        total: data.payment_amount,
        notes: data.notes,
        signed_by_name: data.generator_print_name,
        signed_at: timestamp,
        generator_signed_at: timestamp,
        hauler_signed_at: timestamp,
        sig_path: `signatures/${genSigFileName}`,
        hauler_sig_path: `signatures/${haulSigFileName}`,
        status: 'AWAITING_RECEIVER_SIGNATURE' as const
      };

      const { data: manifest, error: manifestError } = await supabase
        .from('manifests')
        .insert(manifestData)
        .select()
        .single();

      if (manifestError) throw manifestError;

      // 7. Generate PDF with hauler and generator info
      const pdfResult = await manifestIntegration.mutateAsync({
        manifestId: manifest.id,
        overrides: {
          generator_name: customer.company_name || customer.contact_name,
          generator_print_name: data.generator_print_name,
          generator_signature: `signatures/${genSigFileName}`,
          generator_phone: customer.phone || '',
          generator_mail_address: customer.address || '',
          generator_city: customer.city || '',
          generator_state: customer.state || '',
          generator_zip: customer.zip || '',
          hauler_name: hauler.company_name,
          hauler_print_name: data.hauler_print_name,
          hauler_signature: `signatures/${haulSigFileName}`,
          hauler_phone: hauler.phone || '',
          hauler_mail_address: hauler.mailing_address || '',
          hauler_city: hauler.city || '',
          hauler_state: hauler.state || '',
          hauler_zip: hauler.zip || '',
          passenger_car_count: data.pte_count.toString(),
          truck_count: '0',
          oversized_count: (data.otr_count + data.tractor_count).toString(),
        }
      });

      return { manifest, pdfResult };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hauler-manifests', haulerId] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      toast({
        title: "Manifest Created",
        description: "Your manifest has been created and sent to the facility for receiver signature."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error?.message || "Failed to create manifest",
        variant: "destructive"
      });
    }
  });

  return {
    manifests,
    isLoading,
    createManifest
  };
};
