import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SendOutreachEmailParams {
  clientId: string;
  organizationId: string;
}

export function useSendOutreachEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, organizationId }: SendOutreachEmailParams) => {
      const { data, error } = await supabase.functions.invoke('send-client-outreach-email', {
        body: { clientId, organizationId }
      });

      if (error) throw error;
      if (data?.error) {
        // Include clientName in the error for better messaging
        const err = new Error(data.error);
        (err as any).clientName = data.clientName;
        throw err;
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Email sent",
        description: `Scheduling email sent to ${data.clientName}`,
      });
      queryClient.invalidateQueries({ queryKey: ['client-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['active-followups'] });
    },
    onError: (error: Error & { clientName?: string }) => {
      const clientName = error.clientName || 'this client';
      const message = error.message === 'Client has no email address'
        ? `${clientName} doesn't have an email address on file`
        : error.message;
      
      toast({
        title: "Could not send email",
        description: message,
        variant: "destructive",
      });
    },
  });
}
