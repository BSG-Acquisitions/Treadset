import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StopLocation {
  client_id: string;
  company_name: string;
  latitude: number;
  longitude: number;
  address: string;
}

interface RouteSuggestion {
  client_id: string;
  company_name: string;
  distance_from_route_miles: number;
  last_pickup_at: string | null;
  address: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  days_since_pickup: number | null;
}

interface RouteSuggestionsRequest {
  scheduledStops: StopLocation[];
  organizationId: string;
  routeDate?: string;
}

interface RouteSuggestionsResponse {
  along_route: RouteSuggestion[];
  overdue: RouteSuggestion[];
  message?: string;
}

export function useDriverRouteSuggestions() {
  const getRouteSuggestions = useMutation({
    mutationFn: async ({ scheduledStops, organizationId, routeDate }: RouteSuggestionsRequest) => {
      const { data, error } = await supabase.functions.invoke('driver-route-suggestions', {
        body: { scheduledStops, organizationId, routeDate }
      });

      if (error) throw error;
      return data as RouteSuggestionsResponse;
    },
    onError: (error: Error) => {
      console.error('Error getting route suggestions:', error);
      toast.error('Failed to get route suggestions');
    }
  });

  return {
    getRouteSuggestions: getRouteSuggestions.mutateAsync,
    isLoading: getRouteSuggestions.isPending,
  };
}

export type { RouteSuggestion, StopLocation };
