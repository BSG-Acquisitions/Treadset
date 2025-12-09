import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TrailerEventType = 
  | 'pickup_empty'
  | 'drop_empty'
  | 'pickup_full'
  | 'drop_full'
  | 'swap'
  | 'stage_empty'
  | 'external_pickup'
  | 'external_drop'
  | 'waiting_unload';

export interface TrailerEvent {
  id: string;
  organization_id: string;
  trailer_id: string;
  route_id: string | null;
  stop_id: string | null;
  event_type: TrailerEventType;
  location_id: string | null;
  location_name: string | null;
  driver_id: string | null;
  timestamp: string;
  notes: string | null;
  created_at: string;
  trailer?: {
    trailer_number: string;
  };
}

export const useTrailerEvents = (trailerId?: string) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['trailer-events', orgId, trailerId],
    queryFn: async () => {
      if (!orgId) return [];
      
      let query = supabase
        .from('trailer_events')
        .select(`
          *,
          trailer:trailers!trailer_events_trailer_id_fkey(trailer_number)
        `)
        .eq('organization_id', orgId)
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (trailerId) {
        query = query.eq('trailer_id', trailerId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TrailerEvent[];
    },
    enabled: !!orgId,
  });
};

export const useCreateTrailerEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async (data: {
      trailer_id: string;
      event_type: TrailerEventType;
      location_name?: string;
      location_id?: string;
      route_id?: string;
      stop_id?: string;
      driver_id?: string;
      notes?: string;
    }) => {
      if (!orgId) throw new Error('No organization selected');
      
      const { data: event, error } = await supabase
        .from('trailer_events')
        .insert({
          organization_id: orgId,
          trailer_id: data.trailer_id,
          event_type: data.event_type,
          location_name: data.location_name,
          location_id: data.location_id,
          route_id: data.route_id,
          stop_id: data.stop_id,
          driver_id: data.driver_id,
          notes: data.notes,
        })
        .select()
        .single();
      
      if (error) throw error;
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trailer-events'] });
      queryClient.invalidateQueries({ queryKey: ['trailers'] });
      toast.success('Trailer event recorded');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record event: ${error.message}`);
    },
  });
};

export const EVENT_TYPE_LABELS: Record<TrailerEventType, string> = {
  pickup_empty: 'Pick Up Empty',
  drop_empty: 'Drop Off Empty',
  pickup_full: 'Pick Up Full',
  drop_full: 'Drop Off Full',
  swap: 'Swap Trailer',
  stage_empty: 'Stage Empty',
  external_pickup: 'External Pickup',
  external_drop: 'External Drop',
  waiting_unload: 'Waiting to Unload',
};
