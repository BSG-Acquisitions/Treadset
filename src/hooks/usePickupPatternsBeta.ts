import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const usePickupPatternsBeta = (clientId?: string) => {
  return useQuery({
    queryKey: ['pickup-patterns-beta', clientId],
    queryFn: async () => {
      let query = supabase
        .from('pickup_patterns')
        .select('*')
        .order('confidence_score', { ascending: false });

      if (clientId) query = query.eq('client_id', clientId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};
