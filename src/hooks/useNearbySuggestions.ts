import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NearbySuggestion {
  client_id: string;
  company_name: string;
  distance: number;
  last_pickup_at: string | null;
  address: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface SuggestNearbySuggestion {
  scheduledClientId: string;
  organizationId: string;
}

export function useNearbySuggestions() {
  const suggestNearby = useMutation({
    mutationFn: async ({ scheduledClientId, organizationId }: SuggestNearbySuggestion) => {
      const { data, error } = await supabase.functions.invoke('suggest-nearby-clients', {
        body: { scheduledClientId, organizationId }
      });

      if (error) throw error;
      return data as { suggestions: NearbySuggestion[] };
    },
    onError: (error: Error) => {
      console.error('Error getting nearby suggestions:', error);
      toast.error('Failed to get nearby client suggestions');
    }
  });

  return {
    suggestNearby: suggestNearby.mutateAsync,
    isLoading: suggestNearby.isPending
  };
}
