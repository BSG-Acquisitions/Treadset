import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

// Query hook for fetching pickup patterns
export const usePickupPatterns = (clientId?: string) => {
  return useQuery({
    queryKey: ['pickup-patterns', clientId],
    queryFn: async () => {
      let query = supabase
        .from('pickup_patterns')
        .select('*')
        .order('confidence_score', { ascending: false });

      if (clientId) query = query.eq('client_id', clientId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

// Mutation hook for analyzing pickup patterns
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
