import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useClientEngagement = (clientId?: string) => {
  return useQuery({
    queryKey: ['client-engagement-beta', clientId],
    queryFn: async () => {
      let query = supabase
        .from('client_engagement_beta')
        .select('*')
        .order('engagement_score', { ascending: false });

      if (clientId) query = query.eq('client_id', clientId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};
