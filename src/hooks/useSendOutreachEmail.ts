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
      if (data?.error) throw new Error(data.error);

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
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
