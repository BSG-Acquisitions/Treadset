import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

interface EnsureManifestPdfParams {
  pickup_id: string;
  force_regenerate?: boolean;
}

export const useEnsureManifestPdf = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pickup_id, force_regenerate = false }: EnsureManifestPdfParams) => {
      const { data, error } = await supabase.functions.invoke('ensure-manifest-pdf', {
        body: { pickup_id, force_regenerate }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pickups'] });
      queryClient.invalidateQueries({ queryKey: ['manifests'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      
      if (!data.skipped) {
        toast({
          title: "Success",
          description: "Manifest PDF generated successfully",
        });
      }
    },
    onError: (error: Error) => {
      console.error('Error ensuring manifest PDF:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate manifest PDF",
        variant: "destructive",
      });
    },
  });
};
