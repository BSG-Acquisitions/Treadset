import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { measureQuery } from '@/lib/performance/queryPerformance';
import { getCachedCapacity } from '@/lib/performance/smartCache';

export const useCapacityForecast = (organizationId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['capacity-forecast', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');

      return await getCachedCapacity(
        organizationId,
        async () => {
          const { data } = await measureQuery(
            'capacity_forecast_fetch',
            async () => {
              const { data, error } = await supabase
                .from('capacity_preview')
                .select('*')
                .eq('organization_id', organizationId)
                .order('forecast_date', { ascending: true });

              if (error) throw error;
              return data;
            },
            { organizationId }
          );

          return data;
        },
        { ttlHours: 2 }
      );
    },
    enabled: !!organizationId,
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchInterval: 15 * 60 * 1000, // Refresh every 15 minutes
  });

  const generateForecast = useMutation({
    mutationFn: async (orgId: string) => {
      const { data, error } = await supabase.functions.invoke('calculate-capacity-forecast', {
        body: { organization_id: orgId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-forecast'] });
    },
  });

  return {
    ...query,
    generateForecast: generateForecast.mutateAsync,
    isGenerating: generateForecast.isPending,
  };
};
