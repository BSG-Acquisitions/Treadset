import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getCachedRevenueForecast } from '@/lib/performance/smartCache';

export const useRevenueForecasts = () => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['revenue-forecasts', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');

      return await getCachedRevenueForecast(
        organizationId,
        'revenue_forecasts_all',
        async () => {
          const { data, error } = await supabase
            .from('revenue_forecasts')
            .select('*')
            .order('forecast_month', { ascending: true });

          if (error) throw error;
          return data;
        },
        { ttlHours: 6 }
      );
    },
    enabled: !!organizationId,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });
};
