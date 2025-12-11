import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export interface DailyStats {
  date: string;
  stopsCompleted: number;
  activeMinutes: number;
  revenueCollected: number;
}

export interface DriverStats {
  driverId: string;
  driverName: string;
  driverEmail: string;
  stopsCompleted: number;
  firstStopTime: string | null;
  lastStopTime: string | null;
  activeMinutes: number;
  revenueCollected: number;
}

export interface TodayStats {
  stopsCompleted: number;
  stopsScheduled: number;
  activeMinutes: number;
  revenueCollected: number;
  stopsPerHour: number;
  averageStopDuration: number;
}

export interface RouteStatistics {
  today: TodayStats;
  drivers: DriverStats[];
  dailyTrend: DailyStats[];
  isLoading: boolean;
}

export function useRouteStatistics(activeDay: string) {
  // Fetch today's completed assignments with actual timing data
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['route-statistics-today', activeDay],
    queryFn: async () => {
      // Get all assignments for the active day with their pickups and manifests
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          id,
          status,
          actual_arrival,
          scheduled_date,
          driver_id,
          pickup:pickups(
            id,
            status,
            computed_revenue,
            final_revenue,
            manifests!manifests_pickup_id_fkey(id, total, signed_at)
          )
        `)
        .eq('scheduled_date', activeDay)
        .order('actual_arrival', { ascending: true });

      if (error) throw error;

      // Filter completed assignments
      const completed = (assignments || []).filter(a => a.status === 'completed' && a.actual_arrival);
      const scheduled = (assignments || []).length;

      // Calculate active time (first to last actual_arrival)
      let activeMinutes = 0;
      let firstTime: Date | null = null;
      let lastTime: Date | null = null;

      completed.forEach(a => {
        if (a.actual_arrival) {
          const time = new Date(a.actual_arrival);
          if (!firstTime || time < firstTime) firstTime = time;
          if (!lastTime || time > lastTime) lastTime = time;
        }
      });

      if (firstTime && lastTime) {
        activeMinutes = Math.round((lastTime.getTime() - firstTime.getTime()) / 60000);
      }

      // Calculate revenue - pick first non-null and > 0 from manifest.total, pickup.final_revenue, pickup.computed_revenue
      let totalRevenue = 0;
      completed.forEach(a => {
        const pickup = a.pickup as any;
        if (pickup) {
          const manifests = Array.isArray(pickup.manifests) ? pickup.manifests : [];
          const candidates = [manifests[0]?.total, pickup.final_revenue, pickup.computed_revenue];
          const revenue = candidates
            .map((v: any) => (v === null || v === undefined ? null : (typeof v === 'string' ? parseFloat(v) : Number(v))))
            .find((v: number | null) => typeof v === 'number' && !Number.isNaN(v) && v > 0) ?? 0;
          totalRevenue += revenue;
        }
      });

      // Calculate stops per hour
      const stopsPerHour = activeMinutes > 0 ? (completed.length / (activeMinutes / 60)) : 0;
      
      // Average stop duration (rough estimate: activeMinutes / stops)
      const averageStopDuration = completed.length > 0 ? Math.round(activeMinutes / completed.length) : 0;

      return {
        stopsCompleted: completed.length,
        stopsScheduled: scheduled,
        activeMinutes,
        revenueCollected: totalRevenue,
        stopsPerHour: Math.round(stopsPerHour * 10) / 10,
        averageStopDuration,
        completedAssignments: completed,
      };
    },
    staleTime: 30000,
  });

  // Fetch driver-specific stats for today
  const { data: driverData, isLoading: driverLoading } = useQuery({
    queryKey: ['route-statistics-drivers', activeDay],
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          id,
          status,
          actual_arrival,
          driver_id,
          driver:users!assignments_driver_id_fkey(id, full_name, email),
          pickup:pickups(
            id,
            computed_revenue,
            final_revenue,
            manifests!manifests_pickup_id_fkey(id, total)
          )
        `)
        .eq('scheduled_date', activeDay)
        .eq('status', 'completed')
        .not('driver_id', 'is', null);

      if (error) throw error;

      // Group by driver
      const driverMap = new Map<string, {
        driverId: string;
        driverName: string;
        driverEmail: string;
        stops: any[];
      }>();

      (assignments || []).forEach(a => {
        const driver = a.driver as any;
        if (!driver) return;
        
        const driverId = driver.id;
        if (!driverMap.has(driverId)) {
          driverMap.set(driverId, {
            driverId,
            driverName: driver.full_name || driver.email || 'Unknown Driver',
            driverEmail: driver.email || '',
            stops: [],
          });
        }
        driverMap.get(driverId)!.stops.push(a);
      });

      // Calculate stats per driver
      const driverStats: DriverStats[] = Array.from(driverMap.values()).map(d => {
        const arrivals = d.stops
          .filter(s => s.actual_arrival)
          .map(s => new Date(s.actual_arrival))
          .sort((a, b) => a.getTime() - b.getTime());

        const firstStop = arrivals.length > 0 ? arrivals[0] : null;
        const lastStop = arrivals.length > 0 ? arrivals[arrivals.length - 1] : null;
        const activeMinutes = firstStop && lastStop 
          ? Math.round((lastStop.getTime() - firstStop.getTime()) / 60000)
          : 0;

        let revenue = 0;
        d.stops.forEach(s => {
          const pickup = s.pickup as any;
          if (pickup) {
            const manifests = Array.isArray(pickup.manifests) ? pickup.manifests : [];
            const candidates = [manifests[0]?.total, pickup.final_revenue, pickup.computed_revenue];
            const rev = candidates
              .map((v: any) => (v === null || v === undefined ? null : (typeof v === 'string' ? parseFloat(v) : Number(v))))
              .find((v: number | null) => typeof v === 'number' && !Number.isNaN(v) && v > 0) ?? 0;
            revenue += rev;
          }
        });

        return {
          driverId: d.driverId,
          driverName: d.driverName,
          driverEmail: d.driverEmail,
          stopsCompleted: d.stops.length,
          firstStopTime: firstStop ? format(firstStop, 'h:mm a') : null,
          lastStopTime: lastStop ? format(lastStop, 'h:mm a') : null,
          activeMinutes,
          revenueCollected: revenue,
        };
      });

      return driverStats.sort((a, b) => b.stopsCompleted - a.stopsCompleted);
    },
    staleTime: 30000,
  });

  // Fetch 7-day trend data
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['route-statistics-trend', activeDay],
    queryFn: async () => {
      const endDate = new Date(activeDay);
      const startDate = subDays(endDate, 6);
      
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          id,
          status,
          actual_arrival,
          scheduled_date,
          pickup:pickups(
            computed_revenue,
            final_revenue,
            manifests!manifests_pickup_id_fkey(total)
          )
        `)
        .gte('scheduled_date', format(startDate, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(endDate, 'yyyy-MM-dd'))
        .eq('status', 'completed');

      if (error) throw error;

      // Group by date
      const dateMap = new Map<string, { stops: number; revenue: number; arrivals: Date[] }>();
      
      // Initialize all 7 days
      for (let i = 0; i <= 6; i++) {
        const date = format(subDays(endDate, 6 - i), 'yyyy-MM-dd');
        dateMap.set(date, { stops: 0, revenue: 0, arrivals: [] });
      }

      (assignments || []).forEach(a => {
        const date = a.scheduled_date;
        if (!dateMap.has(date)) return;
        
        const entry = dateMap.get(date)!;
        entry.stops++;
        
        if (a.actual_arrival) {
          entry.arrivals.push(new Date(a.actual_arrival));
        }

        const pickup = a.pickup as any;
        if (pickup) {
          const manifests = Array.isArray(pickup.manifests) ? pickup.manifests : [];
          const candidates = [manifests[0]?.total, pickup.final_revenue, pickup.computed_revenue];
          const rev = candidates
            .map((v: any) => (v === null || v === undefined ? null : (typeof v === 'string' ? parseFloat(v) : Number(v))))
            .find((v: number | null) => typeof v === 'number' && !Number.isNaN(v) && v > 0) ?? 0;
          entry.revenue += rev;
        }
      });

      // Convert to array
      const trend: DailyStats[] = Array.from(dateMap.entries()).map(([date, data]) => {
        const arrivals = data.arrivals.sort((a, b) => a.getTime() - b.getTime());
        const first = arrivals[0];
        const last = arrivals[arrivals.length - 1];
        const activeMinutes = first && last 
          ? Math.round((last.getTime() - first.getTime()) / 60000)
          : 0;

        return {
          date,
          stopsCompleted: data.stops,
          activeMinutes,
          revenueCollected: data.revenue,
        };
      });

      return trend;
    },
    staleTime: 60000,
  });

  return {
    today: todayData || {
      stopsCompleted: 0,
      stopsScheduled: 0,
      activeMinutes: 0,
      revenueCollected: 0,
      stopsPerHour: 0,
      averageStopDuration: 0,
    },
    drivers: driverData || [],
    dailyTrend: trendData || [],
    isLoading: todayLoading || driverLoading || trendLoading,
  };
}
