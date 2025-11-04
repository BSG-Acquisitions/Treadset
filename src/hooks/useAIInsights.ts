import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { measureQuery } from '@/lib/performance/queryPerformance';

export interface AIInsight {
  id: string;
  organization_id: string;
  summary_text: string;
  insights_data: any;
  generated_at: string;
  created_at: string;
}

export const useAIInsights = (limit = 7) => {
  return useQuery({
    queryKey: ['ai-insights', limit],
    queryFn: async () => {
      const { data } = await measureQuery(
        'ai_insights_fetch',
        async () => {
          const { data, error } = await supabase
            .from('ai_insights')
            .select('*')
            .order('generated_at', { ascending: false })
            .limit(limit);

          if (error) throw error;
          return data as AIInsight[];
        },
        { limit }
      );

      return data;
    },
  });
};

export const useGenerateInsights = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-ai-insights', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      toast.success('AI Insights generated', {
        description: `Generated ${data.count} insight${data.count !== 1 ? 's' : ''}`,
      });
    },
    onError: (error: Error) => {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate insights', {
        description: error.message,
      });
    },
  });
};