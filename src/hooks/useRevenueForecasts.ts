import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRevenueForecasts = () => {
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['revenue-forecasts', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');

      const { data, error } = await supabase
        .from('revenue_forecasts')
        .select('*')
        .order('forecast_month', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
    staleTime: 6 * 60 * 60 * 1000, // 6 hours
  });
};
