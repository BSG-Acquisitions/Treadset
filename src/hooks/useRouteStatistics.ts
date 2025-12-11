import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, format, parseISO, getDay } from "date-fns";

export type StatsPeriod = 'day' | 'week' | 'month';

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

export interface DriverLeaderboard {
  driverId: string;
  driverName: string;
  totalStops: number;
  totalRevenue: number;
  avgTimePerStop: number;
  activeMinutes: number;
}

export interface TodayStats {
  stopsCompleted: number;
  stopsScheduled: number;
  activeMinutes: number;
  revenueCollected: number;
  stopsPerHour: number;
  averageStopDuration: number;
}

export interface WeeklyStats {
  totalStops: number;
  totalRevenue: number;
  avgStopsPerDay: number;
  avgRevenuePerDay: number;
  bestDay: { date: string; stops: number; revenue: number } | null;
  comparisonToPreviousWeek: { stops: number; revenue: number };
}

export interface MonthlyStats {
  totalStops: number;
  totalRevenue: number;
  avgStopsPerDay: number;
  weekByWeekBreakdown: { weekNum: number; startDate: string; stops: number; revenue: number }[];
  dayOfWeekPattern: { day: string; dayIndex: number; avgStops: number; avgRevenue: number }[];
  comparisonToPreviousMonth: { stops: number; revenue: number };
}

export interface ClientInsight {
  clientId: string;
  clientName: string;
  pickupCount: number;
  totalRevenue: number;
  avgRevenue: number;
}

export interface RouteStatistics {
  today: TodayStats;
  drivers: DriverStats[];
  dailyTrend: DailyStats[];
  weeklyStats: WeeklyStats | null;
  monthlyStats: MonthlyStats | null;
  driverLeaderboard: DriverLeaderboard[];
  clientInsights: ClientInsight[];
  isLoading: boolean;
}

// Helper to extract revenue from assignment
const extractRevenue = (pickup: any): number => {
  if (!pickup) return 0;
  const manifests = Array.isArray(pickup.manifests) ? pickup.manifests : [];
  const candidates = [manifests[0]?.total, pickup.final_revenue, pickup.computed_revenue];
  return candidates
    .map((v: any) => (v === null || v === undefined ? null : (typeof v === 'string' ? parseFloat(v) : Number(v))))
    .find((v: number | null) => typeof v === 'number' && !Number.isNaN(v) && v > 0) ?? 0;
};

export function useRouteStatistics(activeDay: string, period: StatsPeriod = 'day') {
  // Calculate date ranges based on period
  const activeDayDate = parseISO(activeDay);
  
  const getDateRange = () => {
    switch (period) {
      case 'week':
        return {
          start: startOfWeek(activeDayDate, { weekStartsOn: 0 }),
          end: endOfWeek(activeDayDate, { weekStartsOn: 0 }),
        };
      case 'month':
        return {
          start: startOfMonth(activeDayDate),
          end: endOfMonth(activeDayDate),
        };
      default:
        return {
          start: activeDayDate,
          end: activeDayDate,
        };
    }
  };

  const { start: periodStart, end: periodEnd } = getDateRange();

  // Fetch today's completed assignments with actual timing data
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['route-statistics-today', activeDay],
    queryFn: async () => {
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

      const completed = (assignments || []).filter(a => a.status === 'completed' && a.actual_arrival);
      const scheduled = (assignments || []).length;

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

      let totalRevenue = 0;
      completed.forEach(a => {
        totalRevenue += extractRevenue(a.pickup);
      });

      const stopsPerHour = activeMinutes > 0 ? (completed.length / (activeMinutes / 60)) : 0;
      const averageStopDuration = completed.length > 0 ? Math.round(activeMinutes / completed.length) : 0;

      return {
        stopsCompleted: completed.length,
        stopsScheduled: scheduled,
        activeMinutes,
        revenueCollected: totalRevenue,
        stopsPerHour: Math.round(stopsPerHour * 10) / 10,
        averageStopDuration,
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
          revenue += extractRevenue(s.pickup);
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

  // Fetch extended trend data (30 days for month view)
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['route-statistics-trend', activeDay, period],
    queryFn: async () => {
      const daysToFetch = period === 'month' ? 30 : 7;
      const endDate = new Date(activeDay);
      const startDate = subDays(endDate, daysToFetch - 1);
      
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

      const dateMap = new Map<string, { stops: number; revenue: number; arrivals: Date[] }>();
      
      for (let i = 0; i < daysToFetch; i++) {
        const date = format(subDays(endDate, daysToFetch - 1 - i), 'yyyy-MM-dd');
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

        entry.revenue += extractRevenue(a.pickup);
      });

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

  // Fetch weekly stats
  const { data: weeklyStats, isLoading: weeklyLoading } = useQuery({
    queryKey: ['route-statistics-weekly', format(periodStart, 'yyyy-MM-dd'), period],
    enabled: period === 'week' || period === 'month',
    queryFn: async () => {
      const weekStart = startOfWeek(activeDayDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(activeDayDate, { weekStartsOn: 0 });
      const prevWeekStart = subWeeks(weekStart, 1);
      const prevWeekEnd = subWeeks(weekEnd, 1);

      // Current week
      const { data: currentWeek, error: cwError } = await supabase
        .from('assignments')
        .select(`
          id, status, scheduled_date,
          pickup:pickups(computed_revenue, final_revenue, manifests!manifests_pickup_id_fkey(total))
        `)
        .gte('scheduled_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(weekEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed');

      if (cwError) throw cwError;

      // Previous week
      const { data: prevWeek, error: pwError } = await supabase
        .from('assignments')
        .select(`
          id, status, scheduled_date,
          pickup:pickups(computed_revenue, final_revenue, manifests!manifests_pickup_id_fkey(total))
        `)
        .gte('scheduled_date', format(prevWeekStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(prevWeekEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed');

      if (pwError) throw pwError;

      // Calculate current week stats
      const dayMap = new Map<string, { stops: number; revenue: number }>();
      let totalStops = 0;
      let totalRevenue = 0;

      (currentWeek || []).forEach(a => {
        totalStops++;
        const rev = extractRevenue(a.pickup);
        totalRevenue += rev;

        if (!dayMap.has(a.scheduled_date)) {
          dayMap.set(a.scheduled_date, { stops: 0, revenue: 0 });
        }
        const entry = dayMap.get(a.scheduled_date)!;
        entry.stops++;
        entry.revenue += rev;
      });

      // Find best day
      let bestDay: { date: string; stops: number; revenue: number } | null = null;
      dayMap.forEach((val, date) => {
        if (!bestDay || val.stops > bestDay.stops) {
          bestDay = { date, stops: val.stops, revenue: val.revenue };
        }
      });

      // Previous week totals
      let prevStops = 0;
      let prevRevenue = 0;
      (prevWeek || []).forEach(a => {
        prevStops++;
        prevRevenue += extractRevenue(a.pickup);
      });

      const daysInWeek = 7;
      const activeDays = dayMap.size || 1;

      return {
        totalStops,
        totalRevenue,
        avgStopsPerDay: Math.round((totalStops / activeDays) * 10) / 10,
        avgRevenuePerDay: Math.round(totalRevenue / activeDays),
        bestDay,
        comparisonToPreviousWeek: {
          stops: prevStops > 0 ? Math.round(((totalStops - prevStops) / prevStops) * 100) : 0,
          revenue: prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0,
        },
      } as WeeklyStats;
    },
    staleTime: 60000,
  });

  // Fetch monthly stats
  const { data: monthlyStats, isLoading: monthlyLoading } = useQuery({
    queryKey: ['route-statistics-monthly', format(startOfMonth(activeDayDate), 'yyyy-MM-dd'), period],
    enabled: period === 'month',
    queryFn: async () => {
      const monthStart = startOfMonth(activeDayDate);
      const monthEnd = endOfMonth(activeDayDate);
      const prevMonthStart = startOfMonth(subMonths(activeDayDate, 1));
      const prevMonthEnd = endOfMonth(subMonths(activeDayDate, 1));

      // Current month
      const { data: currentMonth, error: cmError } = await supabase
        .from('assignments')
        .select(`
          id, status, scheduled_date,
          pickup:pickups(computed_revenue, final_revenue, manifests!manifests_pickup_id_fkey(total))
        `)
        .gte('scheduled_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(monthEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed');

      if (cmError) throw cmError;

      // Previous month
      const { data: prevMonth, error: pmError } = await supabase
        .from('assignments')
        .select(`
          id, status, scheduled_date,
          pickup:pickups(computed_revenue, final_revenue, manifests!manifests_pickup_id_fkey(total))
        `)
        .gte('scheduled_date', format(prevMonthStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(prevMonthEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed');

      if (pmError) throw pmError;

      // Process current month
      let totalStops = 0;
      let totalRevenue = 0;
      const dayMap = new Map<string, { stops: number; revenue: number }>();
      const dayOfWeekMap = new Map<number, { stops: number; revenue: number; count: number }>();

      // Initialize day of week map
      for (let i = 0; i < 7; i++) {
        dayOfWeekMap.set(i, { stops: 0, revenue: 0, count: 0 });
      }

      (currentMonth || []).forEach(a => {
        totalStops++;
        const rev = extractRevenue(a.pickup);
        totalRevenue += rev;

        const date = a.scheduled_date;
        if (!dayMap.has(date)) {
          dayMap.set(date, { stops: 0, revenue: 0 });
        }
        const entry = dayMap.get(date)!;
        entry.stops++;
        entry.revenue += rev;

        // Day of week
        const dayIndex = getDay(parseISO(date));
        const dowEntry = dayOfWeekMap.get(dayIndex)!;
        dowEntry.stops++;
        dowEntry.revenue += rev;
      });

      // Count occurrences of each day of week in the month
      let currentDate = monthStart;
      while (currentDate <= monthEnd) {
        const dayIndex = getDay(currentDate);
        dayOfWeekMap.get(dayIndex)!.count++;
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      }

      // Calculate week by week breakdown
      const weekBreakdown: { weekNum: number; startDate: string; stops: number; revenue: number }[] = [];
      let weekNum = 1;
      let weekStart = monthStart;
      
      while (weekStart <= monthEnd) {
        let weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });
        if (weekEnd > monthEnd) weekEnd = monthEnd;
        
        let weekStops = 0;
        let weekRevenue = 0;
        
        dayMap.forEach((val, date) => {
          const d = parseISO(date);
          if (d >= weekStart && d <= weekEnd) {
            weekStops += val.stops;
            weekRevenue += val.revenue;
          }
        });

        weekBreakdown.push({
          weekNum,
          startDate: format(weekStart, 'MMM d'),
          stops: weekStops,
          revenue: weekRevenue,
        });

        weekNum++;
        weekStart = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000);
      }

      // Calculate day of week pattern
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayOfWeekPattern = dayNames.map((day, index) => {
        const data = dayOfWeekMap.get(index)!;
        return {
          day,
          dayIndex: index,
          avgStops: data.count > 0 ? Math.round((data.stops / data.count) * 10) / 10 : 0,
          avgRevenue: data.count > 0 ? Math.round(data.revenue / data.count) : 0,
        };
      });

      // Previous month totals
      let prevStops = 0;
      let prevRevenue = 0;
      (prevMonth || []).forEach(a => {
        prevStops++;
        prevRevenue += extractRevenue(a.pickup);
      });

      const activeDays = dayMap.size || 1;

      return {
        totalStops,
        totalRevenue,
        avgStopsPerDay: Math.round((totalStops / activeDays) * 10) / 10,
        weekByWeekBreakdown: weekBreakdown,
        dayOfWeekPattern,
        comparisonToPreviousMonth: {
          stops: prevStops > 0 ? Math.round(((totalStops - prevStops) / prevStops) * 100) : 0,
          revenue: prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0,
        },
      } as MonthlyStats;
    },
    staleTime: 60000,
  });

  // Fetch driver leaderboard for period
  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery({
    queryKey: ['route-statistics-leaderboard', format(periodStart, 'yyyy-MM-dd'), format(periodEnd, 'yyyy-MM-dd'), period],
    enabled: period === 'week' || period === 'month',
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          id, status, actual_arrival, driver_id, scheduled_date,
          driver:users!assignments_driver_id_fkey(id, full_name, email),
          pickup:pickups(computed_revenue, final_revenue, manifests!manifests_pickup_id_fkey(total))
        `)
        .gte('scheduled_date', format(periodStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(periodEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed')
        .not('driver_id', 'is', null);

      if (error) throw error;

      const driverMap = new Map<string, {
        driverId: string;
        driverName: string;
        totalStops: number;
        totalRevenue: number;
        totalActiveMinutes: number;
        dayArrivals: Map<string, Date[]>;
      }>();

      (assignments || []).forEach(a => {
        const driver = a.driver as any;
        if (!driver) return;

        const driverId = driver.id;
        if (!driverMap.has(driverId)) {
          driverMap.set(driverId, {
            driverId,
            driverName: driver.full_name || driver.email || 'Unknown Driver',
            totalStops: 0,
            totalRevenue: 0,
            totalActiveMinutes: 0,
            dayArrivals: new Map(),
          });
        }

        const entry = driverMap.get(driverId)!;
        entry.totalStops++;
        entry.totalRevenue += extractRevenue(a.pickup);

        if (a.actual_arrival) {
          if (!entry.dayArrivals.has(a.scheduled_date)) {
            entry.dayArrivals.set(a.scheduled_date, []);
          }
          entry.dayArrivals.get(a.scheduled_date)!.push(new Date(a.actual_arrival));
        }
      });

      // Calculate active minutes per driver (sum of daily active spans)
      const leaderboard: DriverLeaderboard[] = Array.from(driverMap.values()).map(d => {
        let totalActiveMinutes = 0;
        d.dayArrivals.forEach((arrivals) => {
          arrivals.sort((a, b) => a.getTime() - b.getTime());
          if (arrivals.length > 1) {
            totalActiveMinutes += Math.round((arrivals[arrivals.length - 1].getTime() - arrivals[0].getTime()) / 60000);
          }
        });

        return {
          driverId: d.driverId,
          driverName: d.driverName,
          totalStops: d.totalStops,
          totalRevenue: d.totalRevenue,
          avgTimePerStop: d.totalStops > 0 ? Math.round(totalActiveMinutes / d.totalStops) : 0,
          activeMinutes: totalActiveMinutes,
        };
      });

      return leaderboard.sort((a, b) => b.totalStops - a.totalStops);
    },
    staleTime: 60000,
  });

  // Fetch client insights for period
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['route-statistics-clients', format(periodStart, 'yyyy-MM-dd'), format(periodEnd, 'yyyy-MM-dd'), period],
    enabled: period === 'week' || period === 'month',
    queryFn: async () => {
      const { data: assignments, error } = await supabase
        .from('assignments')
        .select(`
          id, status, scheduled_date,
          pickup:pickups(
            id, client_id, computed_revenue, final_revenue,
            client:clients(id, company_name),
            manifests!manifests_pickup_id_fkey(total)
          )
        `)
        .gte('scheduled_date', format(periodStart, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(periodEnd, 'yyyy-MM-dd'))
        .eq('status', 'completed');

      if (error) throw error;

      const clientMap = new Map<string, {
        clientId: string;
        clientName: string;
        pickupCount: number;
        totalRevenue: number;
      }>();

      (assignments || []).forEach(a => {
        const pickup = a.pickup as any;
        if (!pickup?.client) return;

        const clientId = pickup.client.id;
        const clientName = pickup.client.company_name || 'Unknown Client';

        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            clientId,
            clientName,
            pickupCount: 0,
            totalRevenue: 0,
          });
        }

        const entry = clientMap.get(clientId)!;
        entry.pickupCount++;
        entry.totalRevenue += extractRevenue(pickup);
      });

      const insights: ClientInsight[] = Array.from(clientMap.values()).map(c => ({
        clientId: c.clientId,
        clientName: c.clientName,
        pickupCount: c.pickupCount,
        totalRevenue: c.totalRevenue,
        avgRevenue: c.pickupCount > 0 ? Math.round(c.totalRevenue / c.pickupCount) : 0,
      }));

      return insights.sort((a, b) => b.pickupCount - a.pickupCount).slice(0, 10);
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
    weeklyStats: weeklyStats || null,
    monthlyStats: monthlyStats || null,
    driverLeaderboard: leaderboardData || [],
    clientInsights: clientData || [],
    isLoading: todayLoading || driverLoading || trendLoading || weeklyLoading || monthlyLoading || leaderboardLoading || clientLoading,
  };
}
