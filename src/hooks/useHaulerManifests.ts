import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useManifestIntegration } from "@/hooks/useManifestIntegration";
import { useSendManifestEmail } from "@/hooks/useSendManifestEmail";
import { MICHIGAN_CONVERSIONS } from "@/lib/michigan-conversions";

interface CreateHaulerManifestData {
  hauler_customer_id: string;
  pte_off_rim?: number;
  pte_on_rim?: number;
  commercial_17_5_19_5_off?: number;
  commercial_17_5_19_5_on?: number;
  commercial_22_5_off?: number;
  commercial_22_5_on?: number;
  otr_count?: number;
  tractor_count?: number;
  gross_weight_lbs?: number;
  tare_weight_lbs?: number;
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
  const sendEmail = useSendManifestEmail();

  // Fetch manifests created by this hauler
  const { data: manifests, isLoading } = useQuery({
    queryKey: ['hauler-manifests', haulerId],
    queryFn: async () => {
      if (!haulerId) return [];
      
      const { data, error } = await supabase
        .from('manifests')
        .select(`
          *,
          clients:client_id(id, company_name, email)
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

      // 6. Create manifest with timestamps (to-the-second precision)
      const generatorSignedAt = new Date().toISOString();
      const haulerSignedAt = new Date().toISOString();
      
      // Calculate total PTE for the manifest
      const totalPTE = 
        ((data.pte_off_rim || 0) + (data.pte_on_rim || 0)) * MICHIGAN_CONVERSIONS.PASSENGER_TIRE_TO_PTE +
        ((data.commercial_17_5_19_5_off || 0) + (data.commercial_17_5_19_5_on || 0) + 
         (data.commercial_22_5_off || 0) + (data.commercial_22_5_on || 0)) * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE +
        (data.tractor_count || 0) * MICHIGAN_CONVERSIONS.SEMI_TIRE_TO_PTE +
        (data.otr_count || 0) * MICHIGAN_CONVERSIONS.OTR_TIRE_TO_PTE;
      
      const manifestData = {
        manifest_number: manifestNumber as string,
        organization_id: orgId,
        client_id: clientId,
        hauler_id: haulerId,
        pte_off_rim: data.pte_off_rim || 0,
        pte_on_rim: data.pte_on_rim || 0,
        commercial_17_5_19_5_off: data.commercial_17_5_19_5_off || 0,
        commercial_17_5_19_5_on: data.commercial_17_5_19_5_on || 0,
        commercial_22_5_off: data.commercial_22_5_off || 0,
        commercial_22_5_on: data.commercial_22_5_on || 0,
        otr_count: data.otr_count || 0,
        tractor_count: data.tractor_count || 0,
        gross_weight_lbs: data.gross_weight_lbs || 0,
        tare_weight_lbs: data.tare_weight_lbs || 0,
        net_weight_lbs: (data.gross_weight_lbs || 0) - (data.tare_weight_lbs || 0),
        weight_tons: totalPTE / 89, // Michigan conversion: 89 PTE = 1 ton
        payment_method: data.payment_method,
        payment_status: 'SUCCEEDED',
        paid_amount: data.payment_amount,
        subtotal: data.payment_amount,
        total: data.payment_amount,
        signed_by_name: data.generator_print_name,
        signed_at: generatorSignedAt,
        generator_signed_at: generatorSignedAt,
        hauler_signed_at: haulerSignedAt,
        customer_signature_png_path: `signatures/${genSigFileName}`,
        driver_signature_png_path: `signatures/${haulSigFileName}`,
        status: 'AWAITING_RECEIVER_SIGNATURE' as const
      };

      const { data: manifest, error: manifestError } = await supabase
        .from('manifests')
        .insert(manifestData)
        .select()
        .single();

      if (manifestError) throw manifestError;

      // 7. Generate PDF with hauler and generator info (matching driver wizard exactly)
      const pteTotal = (data.pte_off_rim || 0) + (data.pte_on_rim || 0);
      const commercialTotal = (data.commercial_17_5_19_5_off || 0) + (data.commercial_17_5_19_5_on || 0) + 
                             (data.commercial_22_5_off || 0) + (data.commercial_22_5_on || 0);
      const oversizedTotal = (data.otr_count || 0) + (data.tractor_count || 0);
      
      const grossWeight = data.gross_weight_lbs || 0;
      const tareWeight = data.tare_weight_lbs || 0;
      const netWeight = Math.max(0, grossWeight - tareWeight);
      
      await manifestIntegration.mutateAsync({
        manifestId: manifest.id,
        overrides: {
          // Generator info
          generator_name: customer.company_name || customer.contact_name,
          generator_mail_address: customer.address || '',
          generator_city: customer.city || '',
          generator_state: customer.state || '',
          generator_zip: customer.zip || '',
          generator_county: '',
          generator_phone: customer.phone || '',
          generator_signature: `signatures/${genSigFileName}`,
          generator_print_name: `${data.generator_print_name} - ${new Date(generatorSignedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`,
          generator_date: new Date(generatorSignedAt).toLocaleDateString('en-US'),
          generator_time: new Date(generatorSignedAt).toLocaleTimeString('en-US', { hour12: false }),
          generator_volume_weight: String(totalPTE),
          
          // Tire counts for PDF
          passenger_car_count: String(pteTotal),
          truck_count: String(commercialTotal),
          oversized_count: String(oversizedTotal),
          
          // Hauler info
          hauler_name: hauler.company_name,
          hauler_mail_address: hauler.mailing_address || '',
          hauler_city: hauler.city || '',
          hauler_state: hauler.state || '',
          hauler_zip: hauler.zip || '',
          hauler_phone: hauler.phone || '',
          hauler_mi_reg: hauler.hauler_mi_reg || '',
          hauler_signature: `signatures/${haulSigFileName}`,
          hauler_print_name: `${data.hauler_print_name} - ${new Date(haulerSignedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`,
          hauler_date: new Date(haulerSignedAt).toLocaleDateString('en-US'),
          hauler_time: new Date(haulerSignedAt).toLocaleTimeString('en-US', { hour12: false }),
          hauler_total_pte: String(totalPTE),
          
          // Weight fields
          hauler_gross_weight: grossWeight > 0 ? grossWeight.toFixed(1) : '0.0',
          hauler_tare_weight: tareWeight > 0 ? tareWeight.toFixed(1) : '0.0',
          hauler_net_weight: netWeight > 0 ? netWeight.toFixed(1) : '0.0',
        }
      });

      // 8. Send email to customer with initial manifest
      if (customer.email) {
        await sendEmail.mutateAsync({
          manifestId: manifest.id,
          to: customer.email,
          subject: `Tire Manifest - ${customer.company_name || customer.contact_name}`,
          messageHtml: `<p>Your tire pickup manifest is attached. This is the initial manifest with generator and hauler signatures. A final version will be sent once the receiver has signed.</p>`,
        });
      }

      return { manifest };
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
