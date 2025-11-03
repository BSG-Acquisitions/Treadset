import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

export const useAnalyzePickupPatterns = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('analyze-pickup-patterns', {
        body: {}
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['client-workflows'] });
      
      toast({
        title: "Analysis Complete",
        description: `Found ${data.summary.overdueClients} clients overdue for pickup. ${data.summary.notificationsCreated} notifications created.`,
      });
    },
    onError: (error: Error) => {
      console.error('Error analyzing pickup patterns:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze pickup patterns",
        variant: "destructive",
      });
    },
  });
};
