import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useManifestIntegration } from "./useManifestIntegration";

export const useGenerateDropoffManifest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const manifestIntegration = useManifestIntegration();

  return useMutation({
    mutationFn: async (dropoffId: string) => {
      // 1. Fetch the dropoff with all related data
      const { data: dropoffData, error: dropoffError } = await supabase
        .from('dropoffs')
        .select('*, clients(*)')
        .eq('id', dropoffId)
        .single();

      if (dropoffError) throw dropoffError;

      // 2. Generate a manifest number
      const { data: manifestNumber, error: manifestNumberError } = await supabase
        .rpc('generate_manifest_number', { org_id: dropoffData.organization_id });

      if (manifestNumberError) throw manifestNumberError;

      // 3. Create a manifest record for this dropoff
      const { data: manifestData, error: manifestError } = await supabase
        .from('manifests')
        .insert({
          manifest_number: manifestNumber,
          client_id: dropoffData.client_id,
          hauler_id: dropoffData.hauler_id,
          dropoff_id: dropoffData.id,
          organization_id: dropoffData.organization_id,
          // Map dropoff tire counts to manifest fields
          pte_off_rim: dropoffData.pte_count || 0,
          pte_on_rim: 0,
          otr_count: dropoffData.otr_count || 0,
          tractor_count: dropoffData.tractor_count || 0,
          commercial_17_5_19_5_off: 0,
          commercial_17_5_19_5_on: 0,
          commercial_22_5_off: 0,
          commercial_22_5_on: 0,
          total: dropoffData.computed_revenue || 0,
          status: 'AWAITING_RECEIVER_SIGNATURE',
        })
        .select()
        .single();

      if (manifestError) throw manifestError;

      // 4. Generate the manifest PDF
      const pdfResult = await manifestIntegration.mutateAsync({
        manifestId: manifestData.id,
      });

      // 5. Update dropoff with manifest_id and manifest_pdf_path
      const { error: updateError } = await supabase
        .from('dropoffs')
        .update({
          manifest_id: manifestData.id,
          manifest_pdf_path: pdfResult.pdfPath,
        })
        .eq('id', dropoffData.id);

      if (updateError) throw updateError;

      // Note: Email will be sent after receiver signature is added

      return { manifest: manifestData, pdfPath: pdfResult.pdfPath };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      toast({ 
        title: "Success", 
        description: "Manifest generated and emailed successfully" 
      });
    },
    onError: (error: Error) => {
      console.error('Dropoff manifest generation error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate manifest", 
        variant: "destructive" 
      });
    }
  });
};
