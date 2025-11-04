import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useOperationalMetrics = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['operational-metrics-beta', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('operational_metrics')
        .select('*')
        .order('metric_date', { ascending: false });

      if (startDate) query = query.gte('metric_date', startDate);
      if (endDate) query = query.lte('metric_date', endDate);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};
