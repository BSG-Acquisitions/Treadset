import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfWeek, startOfMonth, subDays, format } from "date-fns";

export interface TrailerUtilizationStats {
  totalTrailers: number;
  activeTrailers: number;
  utilizationRate: number;
  statusBreakdown: {
    empty: number;
    full: number;
    staged: number;
    in_transit: number;
    waiting_unload: number;
  };
}

export interface TrailerEventSummary {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsPerDay: { date: string; count: number }[];
  topLocations: { location: string; count: number }[];
  averageTurnaroundHours: number;
}

export interface TrailerReport {
  utilization: TrailerUtilizationStats;
  events: TrailerEventSummary;
  alerts: {
    active: number;
    resolved: number;
    bySeverity: Record<string, number>;
  };
}

export const useTrailerUtilization = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['trailer-utilization', orgId],
    queryFn: async (): Promise<TrailerUtilizationStats> => {
      if (!orgId) throw new Error('No organization');

      const { data: trailers, error } = await supabase
        .from('trailers')
        .select('current_status, is_active')
        .eq('organization_id', orgId);

      if (error) throw error;

      const activeTrailers = trailers?.filter(t => t.is_active) || [];
      const statusBreakdown = {
        empty: 0,
        full: 0,
        staged: 0,
        in_transit: 0,
        waiting_unload: 0,
      };

      activeTrailers.forEach(t => {
        const status = t.current_status as keyof typeof statusBreakdown;
        if (statusBreakdown.hasOwnProperty(status)) {
          statusBreakdown[status]++;
        }
      });

      // Utilization = trailers that are doing work (full, in_transit, waiting_unload) vs total
      const workingTrailers = statusBreakdown.full + statusBreakdown.in_transit + statusBreakdown.waiting_unload;
      const utilizationRate = activeTrailers.length > 0 
        ? Math.round((workingTrailers / activeTrailers.length) * 100) 
        : 0;

      return {
        totalTrailers: trailers?.length || 0,
        activeTrailers: activeTrailers.length,
        utilizationRate,
        statusBreakdown,
      };
    },
    enabled: !!orgId,
  });
};

export const useTrailerEventSummary = (dateRange: 'week' | 'month' | '30days' = 'month') => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['trailer-event-summary', orgId, dateRange],
    queryFn: async (): Promise<TrailerEventSummary> => {
      if (!orgId) throw new Error('No organization');

      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case 'week':
          startDate = startOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          break;
        case '30days':
        default:
          startDate = subDays(now, 30);
      }

      const { data: events, error } = await supabase
        .from('trailer_events')
        .select('id, event_type, timestamp, location_name')
        .eq('organization_id', orgId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Events by type
      const eventsByType: Record<string, number> = {};
      events?.forEach(e => {
        eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1;
      });

      // Events per day
      const eventsPerDayMap: Record<string, number> = {};
      events?.forEach(e => {
        const date = format(new Date(e.timestamp), 'yyyy-MM-dd');
        eventsPerDayMap[date] = (eventsPerDayMap[date] || 0) + 1;
      });
      const eventsPerDay = Object.entries(eventsPerDayMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top locations
      const locationCounts: Record<string, number> = {};
      events?.forEach(e => {
        if (e.location_name) {
          locationCounts[e.location_name] = (locationCounts[e.location_name] || 0) + 1;
        }
      });
      const topLocations = Object.entries(locationCounts)
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate average turnaround time (time between pickup_full and drop_full for same trailer)
      // This is a simplified calculation
      const avgTurnaround = 8; // Default to 8 hours for now

      return {
        totalEvents: events?.length || 0,
        eventsByType,
        eventsPerDay,
        topLocations,
        averageTurnaroundHours: avgTurnaround,
      };
    },
    enabled: !!orgId,
  });
};

export const useTrailerAlertsSummary = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['trailer-alerts-summary', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('No organization');

      const { data: alerts, error } = await supabase
        .from('trailer_alerts')
        .select('is_resolved, severity, alert_type')
        .eq('organization_id', orgId);

      if (error) throw error;

      const active = alerts?.filter(a => !a.is_resolved).length || 0;
      const resolved = alerts?.filter(a => a.is_resolved).length || 0;
      
      const bySeverity: Record<string, number> = {};
      const byType: Record<string, number> = {};
      
      alerts?.filter(a => !a.is_resolved).forEach(a => {
        bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1;
        byType[a.alert_type] = (byType[a.alert_type] || 0) + 1;
      });

      return {
        active,
        resolved,
        bySeverity,
        byType,
      };
    },
    enabled: !!orgId,
  });
};

export const useActiveTrailerAlerts = () => {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;

  return useQuery({
    queryKey: ['active-trailer-alerts', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('trailer_alerts')
        .select(`
          *,
          trailer:trailers!trailer_alerts_trailer_id_fkey(trailer_number, current_status, current_location)
        `)
        .eq('organization_id', orgId)
        .eq('is_resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });
};
