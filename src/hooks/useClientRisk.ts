import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ClientRiskScore {
  id: string;
  client_id: string;
  organization_id: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  pickup_frequency_decline: number | null;
  avg_payment_delay_days: number | null;
  contact_gap_ratio: number | null;
  last_calculated_at: string;
  created_at: string;
  updated_at: string;
}

export const useClientRiskScores = () => {
  return useQuery({
    queryKey: ['client-risk-scores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_risk_scores')
        .select('*')
        .order('risk_score', { ascending: false });

      if (error) throw error;
      return data as unknown as ClientRiskScore[];
    },
  });
};

export const useClientRiskScore = (clientId: string) => {
  return useQuery({
    queryKey: ['client-risk-score', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_risk_scores')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as unknown as ClientRiskScore | null;
    },
    enabled: !!clientId,
  });
};

export const useCalculateClientRisk = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke('calculate-client-risk', {
        body: { client_id: clientId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ['client-risk-scores'] });
      queryClient.invalidateQueries({ queryKey: ['client-risk-score', clientId] });
      toast.success('Risk score calculated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to calculate risk score: ' + error.message);
    },
  });
};