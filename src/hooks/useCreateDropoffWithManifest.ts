import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useManifestIntegration } from "./useManifestIntegration";
import type { Database } from "@/integrations/supabase/types";

type DropoffInsert = Database["public"]["Tables"]["dropoffs"]["Insert"];

interface CreateDropoffWithManifestParams {
  dropoff: DropoffInsert;
  vehicleId?: string;
  receiverId?: string;
}

export const useCreateDropoffWithManifest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const manifestIntegration = useManifestIntegration();

  return useMutation({
    mutationFn: async ({ dropoff, vehicleId, receiverId }: CreateDropoffWithManifestParams) => {
      // 1. Create the dropoff record
      const { data: dropoffData, error: dropoffError } = await supabase
        .from('dropoffs')
        .insert(dropoff)
        .select()
        .single();

      if (dropoffError) throw dropoffError;

      // 2. Generate a manifest number
      const { data: manifestNumber, error: manifestNumberError } = await supabase
        .rpc('generate_manifest_number', { org_id: dropoff.organization_id });

      if (manifestNumberError) throw manifestNumberError;

      // 3. Determine manifest status based on signatures
      const hasHaulerSig = !!dropoff.hauler_sig_path;
      const hasReceiverSig = !!dropoff.receiver_sig_path;
      const manifestStatus = hasHaulerSig && hasReceiverSig ? 'COMPLETED' : 'AWAITING_RECEIVER_SIGNATURE';

      // 4. Create a manifest record for this dropoff
      const { data: manifestData, error: manifestError } = await supabase
        .from('manifests')
        .insert({
          manifest_number: manifestNumber,
          client_id: dropoff.client_id,
          hauler_id: dropoff.hauler_id,
          dropoff_id: dropoffData.id,
          vehicle_id: vehicleId || null,
          organization_id: dropoff.organization_id,
          // Map dropoff tire counts to manifest fields
          pte_off_rim: dropoff.pte_count || 0,
          pte_on_rim: 0,
          otr_count: dropoff.otr_count || 0,
          tractor_count: dropoff.tractor_count || 0,
          commercial_17_5_19_5_off: 0,
          commercial_17_5_19_5_on: 0,
          commercial_22_5_off: 0,
          commercial_22_5_on: 0,
          total: dropoff.computed_revenue || 0,
          status: manifestStatus,
          // Map signatures from dropoff
          driver_sig_path: dropoff.hauler_sig_path || null,
          driver_signed_at: dropoff.hauler_signed_at || null,
          driver_signed_by: dropoff.hauler_signed_by || null,
          customer_sig_path: dropoff.hauler_sig_path || null, // For dropoffs, hauler is also the customer
          customer_signed_at: dropoff.hauler_signed_at || null,
          customer_signed_by: dropoff.hauler_signed_by || null,
          receiver_sig_path: dropoff.receiver_sig_path || null,
          receiver_signed_at: dropoff.receiver_signed_at || null,
          receiver_signed_by: dropoff.receiver_signed_by || null,
        })
        .select()
        .single();

      if (manifestError) throw manifestError;

      // 5. Build overrides for PDF generation with signatures
      const overrides: Record<string, any> = {};
      
      if (dropoff.hauler_sig_path) {
        overrides.driver_signature = dropoff.hauler_sig_path;
        overrides.driver_print_name = dropoff.hauler_signed_by || '';
        overrides.customer_signature = dropoff.hauler_sig_path;
        overrides.customer_print_name = dropoff.hauler_signed_by || '';
      }
      
      if (dropoff.receiver_sig_path) {
        overrides.receiver_signature = dropoff.receiver_sig_path;
        overrides.receiver_print_name = dropoff.receiver_signed_by || '';
      }

      // Get receiver data if provided
      if (receiverId) {
        const { data: receiverData } = await supabase
          .from('receivers')
          .select('*')
          .eq('id', receiverId)
          .single();
        
        if (receiverData) {
          overrides.receiver_name = receiverData.receiver_name || '';
          overrides.receiver_physical_address = receiverData.receiver_mailing_address || '';
          overrides.receiver_city = receiverData.receiver_city || '';
          overrides.receiver_state = receiverData.receiver_state || '';
          overrides.receiver_zip = receiverData.receiver_zip || '';
          overrides.receiver_phone = receiverData.receiver_phone || '';
          overrides.receiver_mi_reg = receiverData.collection_site_reg || '';
        }
      }

      // 6. Generate the manifest PDF
      const pdfResult = await manifestIntegration.mutateAsync({
        manifestId: manifestData.id,
        overrides: Object.keys(overrides).length > 0 ? overrides : undefined,
      });

      // 7. Update dropoff with manifest_id and manifest_pdf_path
      const { error: updateError } = await supabase
        .from('dropoffs')
        .update({
          manifest_id: manifestData.id,
          manifest_pdf_path: pdfResult.pdfPath,
        })
        .eq('id', dropoffData.id);

      if (updateError) throw updateError;

      // Note: Email will be sent after receiver signature is added (or immediately if complete)

      return { dropoff: dropoffData, manifest: manifestData, pdfPath: pdfResult.pdfPath };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      queryClient.invalidateQueries({ queryKey: ['todays-dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-tire-totals'] });
      queryClient.invalidateQueries({ queryKey: ['yesterday-tire-totals'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-tire-totals'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-stats'] });
      queryClient.invalidateQueries({ queryKey: ['client-analytics-deep'] });
      toast({ 
        title: "Success", 
        description: "Drop-off processed and manifest generated successfully" 
      });
    },
    onError: (error: Error) => {
      console.error('Drop-off manifest creation error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to process drop-off", 
        variant: "destructive" 
      });
    }
  });
};
