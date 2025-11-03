import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientHealthScore {
  id: string;
  client_id: string;
  organization_id: string;
  score: number;
  days_since_last_pickup: number | null;
  total_pickups: number;
  avg_revenue_per_pickup: number;
  risk_level: 'low' | 'medium' | 'high';
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export const useClientHealthScores = (clientId?: string) => {
  const queryClient = useQueryClient();

  const { data: healthScores, isLoading } = useQuery({
    queryKey: ['client-health-scores', clientId],
    queryFn: async () => {
      let query = supabase
        .from('client_health_scores')
        .select('*')
        .order('score', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClientHealthScore[];
    },
  });

  const recalculateScore = useMutation({
    mutationFn: async (clientId: string) => {
      // Call edge function to recalculate client health score
      const { data, error } = await supabase.functions.invoke('calculate-client-health', {
        body: { client_id: clientId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-health-scores'] });
      toast.success('Client health score updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to recalculate: ${error.message}`);
    },
  });

  return {
    healthScores: healthScores || [],
    isLoading,
    recalculateScore: recalculateScore.mutate,
  };
};
