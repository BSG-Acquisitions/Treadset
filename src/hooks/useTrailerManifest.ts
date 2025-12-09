import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface GenerateManifestParams {
  eventId: string;
  sendEmail?: boolean;
  recipientEmail?: string;
  recipientName?: string;
}

export const useGenerateTrailerManifest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async ({ eventId, sendEmail, recipientEmail, recipientName }: GenerateManifestParams) => {
      if (!orgId) throw new Error('No organization selected');

      console.log('[TrailerManifest] Generating manifest for event:', eventId, { sendEmail, recipientEmail });

      const { data, error } = await supabase.functions.invoke('generate-trailer-manifest', {
        body: {
          event_id: eventId,
          organization_id: orgId,
          send_email: sendEmail,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate manifest');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trailer-events'] });
      queryClient.invalidateQueries({ queryKey: ['route-stop-events'] });
      
      let message = `Manifest ${data.manifest_number} generated`;
      if (data.email?.sent) {
        message += ` and emailed to ${data.email.to}`;
      }
      toast.success(message);
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

export const useResendTrailerManifest = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async ({ eventId, recipientEmail }: { eventId: string; recipientEmail: string }) => {
      if (!orgId) throw new Error('No organization selected');

      const { data, error } = await supabase.functions.invoke('generate-trailer-manifest', {
        body: {
          event_id: eventId,
          organization_id: orgId,
          send_email: true,
          recipient_email: recipientEmail,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to resend manifest');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trailer-events'] });
      toast.success(`Manifest resent to ${data.email?.to || 'recipient'}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to resend manifest: ${error.message}`);
    },
  });
};