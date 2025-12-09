import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useGenerateTrailerManifest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!orgId) throw new Error('No organization selected');

      console.log('[TrailerManifest] Generating manifest for event:', eventId);

      const { data, error } = await supabase.functions.invoke('generate-trailer-manifest', {
        body: {
          event_id: eventId,
          organization_id: orgId,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate manifest');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trailer-events'] });
      queryClient.invalidateQueries({ queryKey: ['route-stop-events'] });
      toast.success(`Manifest ${data.manifest_number} generated successfully`);
    },
    onError: (error: Error) => {
      console.error('[TrailerManifest] Error:', error);
      toast.error(`Failed to generate manifest: ${error.message}`);
    },
  });
};

export const useViewTrailerManifest = () => {
  return useMutation({
    mutationFn: async (pdfPath: string) => {
      const { data, error } = await supabase.storage
        .from('manifests')
        .createSignedUrl(pdfPath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    },
    onSuccess: (signedUrl) => {
      window.open(signedUrl, '_blank');
    },
    onError: (error: Error) => {
      toast.error(`Failed to open manifest: ${error.message}`);
    },
  });
};

export const useDownloadTrailerManifest = () => {
  return useMutation({
    mutationFn: async ({ pdfPath, manifestNumber }: { pdfPath: string; manifestNumber: string }) => {
      const { data, error } = await supabase.storage
        .from('manifests')
        .download(pdfPath);

      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${manifestNumber}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    },
    onSuccess: () => {
      toast.success('Manifest downloaded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to download: ${error.message}`);
    },
  });
};
