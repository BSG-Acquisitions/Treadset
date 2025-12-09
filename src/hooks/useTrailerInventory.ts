import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { TrailerStatus } from "./useTrailers";
import { TrailerEventType } from "./useTrailerEvents";

export interface TrailerWithLastEvent {
  id: string;
  trailer_number: string;
  current_status: TrailerStatus;
  current_location: string | null;
  current_location_id: string | null;
  notes: string | null;
  is_active: boolean;
  ownership_type: string | null;
  owner_name: string | null;
  created_at: string;
  updated_at: string;
  last_event?: {
    id: string;
    event_type: TrailerEventType;
    timestamp: string;
    location_name: string | null;
    driver_id: string | null;
    driver?: {
      first_name: string | null;
      last_name: string | null;
    };
  };
}

export const useTrailerInventory = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['trailer-inventory', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      // Fetch trailers
      const { data: trailers, error: trailersError } = await supabase
        .from('trailers')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('trailer_number');
      
      if (trailersError) throw trailersError;
      if (!trailers || trailers.length === 0) return [];

      // Fetch the most recent event for each trailer
      const trailerIds = trailers.map(t => t.id);
      
      const { data: events, error: eventsError } = await supabase
        .from('trailer_events')
        .select(`
          id,
          trailer_id,
          event_type,
          timestamp,
          location_name,
          driver_id
        `)
        .eq('organization_id', orgId)
        .in('trailer_id', trailerIds)
        .order('timestamp', { ascending: false });
      
      if (eventsError) throw eventsError;

      // Get unique driver IDs from events
      const driverIds = [...new Set(events?.map(e => e.driver_id).filter(Boolean) || [])];
      
      // Fetch driver names
      let driverMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
      if (driverIds.length > 0) {
        const { data: drivers } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', driverIds);
        
        if (drivers) {
          driverMap = drivers.reduce((acc, d) => {
            acc[d.id] = { first_name: d.first_name, last_name: d.last_name };
            return acc;
          }, {} as Record<string, { first_name: string | null; last_name: string | null }>);
        }
      }

      // Map events to trailers (get most recent for each)
      const latestEventByTrailer: Record<string, typeof events[0]> = {};
      events?.forEach(event => {
        if (!latestEventByTrailer[event.trailer_id]) {
          latestEventByTrailer[event.trailer_id] = event;
        }
      });

      // Combine data
      return trailers.map(trailer => ({
        ...trailer,
        last_event: latestEventByTrailer[trailer.id] ? {
          id: latestEventByTrailer[trailer.id].id,
          event_type: latestEventByTrailer[trailer.id].event_type as TrailerEventType,
          timestamp: latestEventByTrailer[trailer.id].timestamp,
          location_name: latestEventByTrailer[trailer.id].location_name,
          driver_id: latestEventByTrailer[trailer.id].driver_id,
          driver: latestEventByTrailer[trailer.id].driver_id 
            ? driverMap[latestEventByTrailer[trailer.id].driver_id!] 
            : undefined,
        } : undefined,
      })) as TrailerWithLastEvent[];
    },
    enabled: !!orgId,
    refetchInterval: 30000, // Fallback polling every 30 seconds
  });

  // Real-time subscription for trailer_events changes
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('trailer-inventory-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trailer_events',
        },
        () => {
          // Invalidate and refetch when events change
          queryClient.invalidateQueries({ queryKey: ['trailer-inventory', orgId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trailers',
        },
        () => {
          // Invalidate and refetch when trailers change
          queryClient.invalidateQueries({ queryKey: ['trailer-inventory', orgId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return query;
};

// Get unique locations from trailers
export const useTrailerLocations = () => {
  const { data: trailers } = useTrailerInventory();
  
  const locations = [...new Set(
    trailers
      ?.map(t => t.current_location)
      .filter((loc): loc is string => !!loc) || []
  )].sort();
  
  return locations;
};

// Get unique drivers from trailer events
export const useTrailerDrivers = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['trailer-drivers', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      // Get drivers who have been involved in trailer events
      const { data: events } = await supabase
        .from('trailer_events')
        .select('driver_id')
        .eq('organization_id', orgId)
        .not('driver_id', 'is', null);
      
      if (!events || events.length === 0) return [];
      
      const driverIds = [...new Set(events.map(e => e.driver_id).filter(Boolean))];
      
      const { data: drivers } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', driverIds);
      
      return drivers || [];
    },
    enabled: !!orgId,
  });
};
