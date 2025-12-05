import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TrailerEventType } from "./useTrailerEvents";
import { TrailerStatus } from "./useTrailers";

export interface StopTrailerEvent {
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
    id: string;
    trailer_number: string;
    current_status: string;
  };
}

// Fetch all trailer events for a specific route (grouped by stop)
export const useRouteStopEvents = (routeId: string) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['route-stop-events', routeId, orgId],
    queryFn: async () => {
      if (!orgId || !routeId) return [];
      
      const { data, error } = await supabase
        .from('trailer_events')
        .select(`
          *,
          trailer:trailers(id, trailer_number, current_status)
        `)
        .eq('organization_id', orgId)
        .eq('route_id', routeId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as StopTrailerEvent[];
    },
    enabled: !!orgId && !!routeId,
  });
};

// Complete a trailer event with optional signature
export const useCompleteTrailerEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useMutation({
    mutationFn: async (data: {
      trailer_id: string;
      event_type: TrailerEventType;
      stop_id: string;
      route_id: string;
      location_name?: string;
      location_id?: string;
      notes?: string;
    }) => {
      if (!orgId) throw new Error('No organization selected');
      
      // Get the driver's internal user ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user?.id)
        .single();
      
      // Create the event record
      const { data: event, error } = await supabase
        .from('trailer_events')
        .insert({
          organization_id: orgId,
          trailer_id: data.trailer_id,
          event_type: data.event_type,
          stop_id: data.stop_id,
          route_id: data.route_id,
          location_name: data.location_name,
          location_id: data.location_id,
          driver_id: userData?.id,
          notes: data.notes,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Update trailer status based on event type
      let newStatus: TrailerStatus | null = null;
      switch (data.event_type) {
        case 'pickup_empty':
        case 'drop_full':
          newStatus = 'empty';
          break;
        case 'pickup_full':
        case 'drop_empty':
          newStatus = 'full';
          break;
        case 'stage_empty':
          newStatus = 'staged';
          break;
        case 'waiting_unload':
          newStatus = 'waiting_unload';
          break;
      }

      if (newStatus) {
        await supabase
          .from('trailers')
          .update({
            current_status: newStatus,
            current_location: data.location_name,
            current_location_id: data.location_id,
            last_event_id: event.id,
          })
          .eq('id', data.trailer_id);
      }

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['route-stop-events'] });
      queryClient.invalidateQueries({ queryKey: ['driver-trailer-routes'] });
      queryClient.invalidateQueries({ queryKey: ['trailers'] });
      toast.success('Event completed');
    },
    onError: (error: Error) => {
      toast.error(`Failed to complete event: ${error.message}`);
    },
  });
};

// Get events for a specific stop
export const useStopEvents = (stopId: string) => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['stop-events', stopId, orgId],
    queryFn: async () => {
      if (!orgId || !stopId) return [];
      
      const { data, error } = await supabase
        .from('trailer_events')
        .select(`
          *,
          trailer:trailers(id, trailer_number, current_status)
        `)
        .eq('organization_id', orgId)
        .eq('stop_id', stopId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as StopTrailerEvent[];
    },
    enabled: !!orgId && !!stopId,
  });
};
