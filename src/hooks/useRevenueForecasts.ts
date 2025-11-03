import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRevenueForecasts = () => {
  return useQuery({
    queryKey: ['revenue-forecasts-beta'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('revenue_forecasts_beta')
        .select('*')
        .order('forecast_month', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};
