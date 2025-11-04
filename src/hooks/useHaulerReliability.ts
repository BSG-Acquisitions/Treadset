import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HaulerReliability {
  id: string;
  hauler_id: string;
  organization_id: string;
  reliability_score: number;
  on_time_rate: number;
  manifest_accuracy_rate: number;
  payment_promptness_rate: number;
  total_dropoffs: number;
  on_time_dropoffs: number;
  accurate_manifests: number;
  prompt_payments: number;
  last_calculated_at: string;
}

export const useHaulerReliability = () => {
  const queryClient = useQueryClient();

  const { data: reliabilityScores, isLoading } = useQuery({
    queryKey: ['hauler-reliability'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hauler_reliability')
        .select('*')
        .order('reliability_score', { ascending: false });

      if (error) throw error;
      return data as HaulerReliability[];
    },
  });

  const calculateReliability = useMutation({
    mutationFn: async (haulerId?: string) => {
      const { data, error } = await supabase.functions.invoke('calculate-hauler-reliability', {
        body: { haulerId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hauler-reliability'] });
      toast.success(`Reliability calculated for ${data.scoresCalculated} hauler(s)`);
    },
    onError: (error) => {
      console.error('Failed to calculate reliability:', error);
      toast.error('Failed to calculate reliability scores');
    },
  });

  const getScoreForHauler = (haulerId: string): HaulerReliability | undefined => {
    return reliabilityScores?.find(score => score.hauler_id === haulerId);
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 85) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  const getTopPerformers = (): HaulerReliability[] => {
    return reliabilityScores?.filter(score => score.reliability_score >= 85) || [];
  };

  const getNeedsAttention = (): HaulerReliability[] => {
    return reliabilityScores?.filter(score => score.reliability_score < 70) || [];
  };

  return {
    reliabilityScores: reliabilityScores || [],
    isLoading,
    calculateReliability: calculateReliability.mutate,
    isCalculating: calculateReliability.isPending,
    getScoreForHauler,
    getScoreBadgeVariant,
    getTopPerformers,
    getNeedsAttention,
  };
};
