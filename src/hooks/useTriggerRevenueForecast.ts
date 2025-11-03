import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTriggerRevenueForecast = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculate-revenue-forecast', {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['revenue-forecasts-beta'] });
      
      toast.success('Revenue forecast updated', {
        description: `Generated ${data.forecasts?.length || 0} forecasts based on ${data.summary?.dataPoints || 0} months of data`,
      });
    },
    onError: (error: Error) => {
      console.error('Error calculating revenue forecast:', error);
      toast.error('Forecast calculation failed', {
        description: error.message || 'Failed to calculate revenue forecast',
      });
    },
  });
};
