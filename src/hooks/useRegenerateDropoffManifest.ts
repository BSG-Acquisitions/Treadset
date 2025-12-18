import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useManifestIntegration } from "./useManifestIntegration";

/**
 * Hook to regenerate a manifest PDF for an existing dropoff.
 * Fetches the latest signature data from the dropoffs table and regenerates the PDF.
 * Use this to fix incorrect manifests after signatures have been updated.
 */
export const useRegenerateDropoffManifest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const manifestIntegration = useManifestIntegration();

  return useMutation({
    mutationFn: async (dropoffId: string) => {
      // 1. Fetch the dropoff with its manifest_id and latest signature data
      const { data: dropoff, error: dropoffError } = await supabase
        .from('dropoffs')
        .select(`
          *,
          clients(*),
          haulers(*)
        `)
        .eq('id', dropoffId)
        .single();

      if (dropoffError) throw dropoffError;
      if (!dropoff) throw new Error('Dropoff not found');
      if (!dropoff.manifest_id) throw new Error('No manifest exists for this dropoff. Generate one first.');

      // 2. Build overrides using correct domain field names from latest dropoff data
      const overrides: Record<string, any> = {};
      
      // Generator signature → generator fields (uses generator_sig_path from dropoff)
      if (dropoff.generator_sig_path) {
        overrides.generator_signature = dropoff.generator_sig_path;
        overrides.generator_print_name = dropoff.generator_signed_by || '';
      }
      
      // Hauler signature → hauler fields
      if (dropoff.hauler_sig_path) {
        overrides.hauler_signature = dropoff.hauler_sig_path;
        overrides.hauler_print_name = dropoff.hauler_signed_by || '';
      }
      
      // Receiver signature → receiver fields
      if (dropoff.receiver_sig_path) {
        overrides.receiver_signature = dropoff.receiver_sig_path;
        overrides.receiver_print_name = dropoff.receiver_signed_by || '';
      }

      // Also include generator info from the dropoff's client
      if (dropoff.clients) {
        overrides.generator_name = dropoff.clients.company_name || dropoff.clients.contact_name || '';
        overrides.generator_phone = dropoff.clients.phone || '';
        overrides.generator_mail_address = dropoff.clients.mailing_address || '';
        overrides.generator_city = dropoff.clients.city || '';
        overrides.generator_state = dropoff.clients.state || '';
        overrides.generator_zip = dropoff.clients.zip || '';
        overrides.generator_physical_address = dropoff.clients.physical_address || dropoff.clients.mailing_address || '';
        overrides.generator_physical_city = dropoff.clients.physical_city || dropoff.clients.city || '';
        overrides.generator_physical_state = dropoff.clients.physical_state || dropoff.clients.state || '';
        overrides.generator_physical_zip = dropoff.clients.physical_zip || dropoff.clients.zip || '';
        overrides.generator_county = dropoff.clients.county || '';
      }

      // 3. Regenerate the PDF using the manifest integration hook
      const pdfResult = await manifestIntegration.mutateAsync({
        manifestId: dropoff.manifest_id,
        overrides,
      });

      // 4. Update dropoff with new manifest_pdf_path
      const { error: updateError } = await supabase
        .from('dropoffs')
        .update({
          manifest_pdf_path: pdfResult.pdfPath,
        })
        .eq('id', dropoffId);

      if (updateError) throw updateError;

      return { dropoffId, manifestId: dropoff.manifest_id, pdfPath: pdfResult.pdfPath };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dropoffs'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      toast({ 
        title: "Manifest Regenerated", 
        description: "The manifest PDF has been regenerated with the latest signature data" 
      });
    },
    onError: (error: Error) => {
      console.error('Manifest regeneration error:', error);
      toast({ 
        title: "Regeneration Failed", 
        description: error.message || "Failed to regenerate manifest", 
        variant: "destructive" 
      });
    }
  });
};
