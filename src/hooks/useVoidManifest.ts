import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useVoidManifest = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (manifestId: string) => {
      // 1. Fetch the manifest to get pickup_id
      const { data: manifest, error: fetchError } = await supabase
        .from('manifests')
        .select('id, pickup_id, status')
        .eq('id', manifestId)
        .single();

      if (fetchError) throw fetchError;
      if (!manifest) throw new Error('Manifest not found');

      // 2. Void the manifest and clear all signature fields
      const { error: voidError } = await supabase
        .from('manifests')
        .update({
          status: 'VOIDED',
          customer_signature_png_path: null,
          driver_signature_png_path: null,
          receiver_sig_path: null,
          signed_by_name: null,
          signed_by_title: null,
          signed_at: null,
          generator_signed_at: null,
          hauler_signed_at: null,
          receiver_signed_at: null,
          receiver_signed_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', manifestId);

      if (voidError) throw voidError;

      // 3. Reset pickup back to "needs manifest" so driver can redo signing
      if (manifest.pickup_id) {
        const { error: pickupError } = await supabase
          .from('pickups')
          .update({
            manifest_id: null,
            manifest_pdf_path: null,
            manifest_payment_status: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', manifest.pickup_id);

        if (pickupError) {
          console.warn('[useVoidManifest] Could not reset pickup:', pickupError);
          // Non-fatal — manifest is still voided
        }
      }

      return { manifestId, pickupId: manifest.pickup_id };
    },
    onSuccess: () => {
      toast({
        title: 'Manifest Voided',
        description: 'The manifest has been voided and the pickup is now available for re-signing.',
      });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Void Failed',
        description: error?.message || 'Failed to void manifest. Please try again.',
        variant: 'destructive',
      });
    },
  });
};
