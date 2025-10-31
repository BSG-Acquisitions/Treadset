import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SendManifestEmailParams {
  // Provide either manifestId OR explicit 'to' + pdfPath
  manifestId?: string;
  to?: string | string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  messageHtml?: string;
  pdfPath?: string; // manifests/...pdf
}

export const useSendManifestEmail = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SendManifestEmailParams) => {
      const { data, error } = await supabase.functions.invoke(
        "send-manifest-email",
        {
          body: {
            manifest_id: params.manifestId,
            to: params.to,
            cc: params.cc,
            bcc: params.bcc,
            subject: params.subject,
            messageHtml: params.messageHtml,
            pdf_path: params.pdfPath,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const recipients = data?.recipients?.join(', ') || 'client';
      toast({ 
        title: "Email sent successfully", 
        description: `Manifest email delivered to ${recipients}` 
      });
    },
    onError: (err: any) => {
      toast({
        title: "Email failed",
        description: err?.message ?? "Unexpected error while sending email.",
        variant: "destructive",
      });
    },
  });
};
