import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useCapacityForecast = (organizationId?: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['capacity-forecast', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID required');

      const { data, error } = await supabase
        .from('capacity_preview')
        .select('*')
        .eq('organization_id', organizationId)
        .order('forecast_date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
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
