import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays } from "date-fns";
import { calculateManifestPTE } from "@/lib/michigan-conversions";

interface PTEStats {
  ptes: number;
  pounds: number;
}

interface DashboardData {
  // Today's stats (from RPC - timezone aligned)
  todayPTEStats: PTEStats;
  
  // Yesterday's stats (from RPC - timezone aligned)
  yesterdayPTEStats: number;
  
  // Weekly stats (from RPC - timezone aligned)
  weeklyPTEStats: number;
  
  // Monthly stats (from RPC - timezone aligned)
  monthlyPTEStats: number;
  
  // Comparison periods (for percent change calculations)
  dayBeforeYesterdayPTEs: number;
  lastWeekPTEs: number;
  lastMonthPTEs: number;
  
  // Monthly revenue
  thisMonthRevenue: number;
  
  // Chart data
  weeklyChartData: Array<{ day: string; ptes: number; target: number }>;
  monthlyChartData: Array<{ day: string; ptes: number }>;
  
  // Loading state
  isLoading: boolean;
}

export function useDashboardData(): DashboardData {
  const { user } = useAuth();
  const orgId = user?.currentOrganization?.id;
  const today = new Date();
  const dateKey = format(today, 'yyyy-MM-dd');
  const monthKey = format(today, 'yyyy-MM');

  // ============= CORE RPC QUERIES (timezone-aligned, required) =============
  
  // Today's PTEs - timezone aligned via RPC
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['dashboard-today-ptes', orgId, dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_today_pte_totals', {
        org_id: orgId
      });
      if (error) throw error;
      const pickup = Number(data[0]?.pickup_ptes || 0);
      const dropoff = Number(data[0]?.dropoff_ptes || 0);
      const ptes = pickup + dropoff;
      return { ptes, pounds: ptes * 22 };
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // Yesterday's PTEs - timezone aligned via RPC (single call, no duplicate)
  const { data: yesterdayData, isLoading: yesterdayLoading } = useQuery({
    queryKey: ['dashboard-yesterday-ptes', orgId, format(addDays(today, -1), 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_yesterday_pte_totals', {
        org_id: orgId
      });
      if (error) throw error;
      return Number(data[0]?.pickup_ptes || 0) + Number(data[0]?.dropoff_ptes || 0);
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // Weekly PTEs - timezone aligned via RPC (single call, no duplicate)
  const { data: weeklyData, isLoading: weeklyLoading } = useQuery({
    queryKey: ['dashboard-weekly-ptes', orgId, dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_pte_totals', {
        org_id: orgId
      });
      if (error) throw error;
      return Number(data[0]?.pickup_ptes || 0) + Number(data[0]?.dropoff_ptes || 0);
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // Monthly PTEs - timezone aligned via RPC
  const { data: monthlyData, isLoading: monthlyLoading } = useQuery({
    queryKey: ['dashboard-monthly-ptes', orgId, dateKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_pte_totals', {
        org_id: orgId
      });
      if (error) throw error;
      return Number(data[0]?.pickup_ptes || 0) + Number(data[0]?.dropoff_ptes || 0);
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  // ============= CONSOLIDATED COMPARISON DATA =============
  // Single query for all comparison periods instead of 3 separate queries
  
  const { data: comparisonData, isLoading: comparisonLoading } = useQuery({
    queryKey: ['dashboard-comparison-data', orgId, monthKey],
    queryFn: async () => {
      const todayDay = today.getDay();
      const currentDayOfMonth = today.getDate();
      const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;
      
      // Date ranges for all comparison periods
      const twoDaysAgo = format(addDays(today, -2), 'yyyy-MM-dd');
      const lastWeekStart = format(addDays(today, -daysFromMonday - 7), 'yyyy-MM-dd');
      const lastWeekEnd = format(addDays(today, -7), 'yyyy-MM-dd');
      const lastMonthStart = format(new Date(today.getFullYear(), today.getMonth() - 1, 1), 'yyyy-MM-dd');
      const lastMonthEnd = format(new Date(today.getFullYear(), today.getMonth() - 1, currentDayOfMonth), 'yyyy-MM-dd');
      
      // Single combined query for all historical data
      const [manifestsResult, dropoffsResult] = await Promise.all([
        supabase.from('manifests')
          .select('pte_on_rim, pte_off_rim, commercial_17_5_19_5_off, commercial_17_5_19_5_on, commercial_22_5_off, commercial_22_5_on, otr_count, tractor_count, signed_at, created_at')
          .eq('organization_id', orgId)
          .gte('created_at', `${lastMonthStart}T00:00:00`), // Get all data from last month start
        supabase.from('dropoffs')
          .select('pte_count, otr_count, tractor_count, dropoff_date')
          .eq('organization_id', orgId)
          .gte('dropoff_date', lastMonthStart)
      ]);
      
      if (manifestsResult.error) throw manifestsResult.error;
      if (dropoffsResult.error) throw dropoffsResult.error;
      
      const manifests = manifestsResult.data || [];
      const dropoffs = dropoffsResult.data || [];
      
      // Helper to calculate PTE from manifest
      const calcManifestPTE = (m: any) => 
        (m.pte_on_rim || 0) + (m.pte_off_rim || 0) + 
        (m.commercial_17_5_19_5_off || 0) + (m.commercial_17_5_19_5_on || 0) +
        (m.commercial_22_5_off || 0) + (m.commercial_22_5_on || 0) +
        ((m.otr_count || 0) * 15) + ((m.tractor_count || 0) * 5);
      
      const calcDropoffPTE = (d: any) =>
        (d.pte_count || 0) + ((d.otr_count || 0) * 15) + ((d.tractor_count || 0) * 5);
      
      // Day before yesterday
      const dayBeforeYesterdayManifests = manifests.filter(m => {
        const dateOnly = format(new Date(m.signed_at || m.created_at), 'yyyy-MM-dd');
        return dateOnly === twoDaysAgo;
      });
      const dayBeforeYesterdayDropoffs = dropoffs.filter(d => d.dropoff_date === twoDaysAgo);
      const dayBeforeYesterdayPTEs = 
        dayBeforeYesterdayManifests.reduce((sum, m) => sum + calcManifestPTE(m), 0) +
        dayBeforeYesterdayDropoffs.reduce((sum, d) => sum + calcDropoffPTE(d), 0);
      
      // Last week (same day range as current week)
      const lastWeekManifests = manifests.filter(m => {
        const dateOnly = format(new Date(m.signed_at || m.created_at), 'yyyy-MM-dd');
        return dateOnly >= lastWeekStart && dateOnly <= lastWeekEnd;
      });
      const lastWeekDropoffs = dropoffs.filter(d => 
        d.dropoff_date >= lastWeekStart && d.dropoff_date <= lastWeekEnd
      );
      const lastWeekPTEs = 
        lastWeekManifests.reduce((sum, m) => sum + calcManifestPTE(m), 0) +
        lastWeekDropoffs.reduce((sum, d) => sum + calcDropoffPTE(d), 0);
      
      // Last month (same day range as current month)
      const lastMonthManifests = manifests.filter(m => {
        const dateOnly = format(new Date(m.signed_at || m.created_at), 'yyyy-MM-dd');
        return dateOnly >= lastMonthStart && dateOnly <= lastMonthEnd;
      });
      const lastMonthDropoffs = dropoffs.filter(d => 
        d.dropoff_date >= lastMonthStart && d.dropoff_date <= lastMonthEnd
      );
      const lastMonthPTEs = 
        lastMonthManifests.reduce((sum, m) => sum + calcManifestPTE(m), 0) +
        lastMonthDropoffs.reduce((sum, d) => sum + calcDropoffPTE(d), 0);
      
      return { dayBeforeYesterdayPTEs, lastWeekPTEs, lastMonthPTEs };
    },
    enabled: !!orgId,
    refetchInterval: 60000, // Less frequent for historical data
    staleTime: 30000,
  });

  // ============= CONSOLIDATED CHART + REVENUE DATA =============
  // Single query for both charts and monthly revenue
  
  const { data: chartAndRevenueData, isLoading: chartLoading } = useQuery({
    queryKey: ['dashboard-charts-revenue', orgId, monthKey],
    queryFn: async () => {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startDate = format(monthStart, 'yyyy-MM-dd');
      const endDate = format(monthEnd, 'yyyy-MM-dd');
      
      // Week calculation
      const todayDay = today.getDay();
      const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);
      const weekStartDate = format(monday, 'yyyy-MM-dd');
      
      const [manifestsResult, dropoffsResult] = await Promise.all([
        supabase.from('manifests')
          .select('pte_on_rim, pte_off_rim, commercial_17_5_19_5_off, commercial_17_5_19_5_on, commercial_22_5_off, commercial_22_5_on, otr_count, tractor_count, signed_at, created_at, total')
          .eq('organization_id', orgId)
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59`),
        supabase.from('dropoffs')
          .select('pte_count, otr_count, tractor_count, dropoff_date, computed_revenue')
          .eq('organization_id', orgId)
          .gte('dropoff_date', startDate)
          .lte('dropoff_date', endDate)
      ]);
      
      if (manifestsResult.error) throw manifestsResult.error;
      if (dropoffsResult.error) throw dropoffsResult.error;
      
      const manifests = manifestsResult.data || [];
      const dropoffs = dropoffsResult.data || [];
      
      // Calculate monthly revenue
      const manifestRevenue = manifests.reduce((sum, m) => sum + (m.total || 0), 0);
      const dropoffRevenue = dropoffs.reduce((sum, d) => sum + (d.computed_revenue || 0), 0);
      const thisMonthRevenue = manifestRevenue + dropoffRevenue;
      
      // Build PTEs by date for charts
      const ptesByDate: Record<string, number> = {};
      
      manifests.forEach(m => {
        const completionDate = m.signed_at || m.created_at;
        const dateKey = format(new Date(completionDate), 'yyyy-MM-dd');
        const ptes = calculateManifestPTE(m as any);
        ptesByDate[dateKey] = (ptesByDate[dateKey] || 0) + ptes;
      });
      
      dropoffs.forEach(d => {
        const converted = (d.pte_count || 0) + ((d.otr_count || 0) * 15) + ((d.tractor_count || 0) * 5);
        ptesByDate[d.dropoff_date] = (ptesByDate[d.dropoff_date] || 0) + converted;
      });
      
      // Generate weekly chart data (Mon-Fri)
      const weekDays = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateKey = format(date, 'yyyy-MM-dd');
        weekDays.push({
          day: format(date, 'EEE'),
          ptes: ptesByDate[dateKey] || 0,
          target: 2600
        });
      }
      
      // Generate monthly chart data (1st through today)
      const monthDays = [];
      const currentDay = today.getDate();
      for (let i = 1; i <= currentDay; i++) {
        const date = new Date(today.getFullYear(), today.getMonth(), i);
        const dateKey = format(date, 'yyyy-MM-dd');
        monthDays.push({
          day: format(date, 'MMM d'),
          ptes: ptesByDate[dateKey] || 0
        });
      }
      
      return { thisMonthRevenue, weeklyChartData: weekDays, monthlyChartData: monthDays };
    },
    enabled: !!orgId,
    refetchInterval: 30000,
  });

  const isLoading = todayLoading || yesterdayLoading || weeklyLoading || monthlyLoading || comparisonLoading || chartLoading;

  return {
    todayPTEStats: todayData || { ptes: 0, pounds: 0 },
    yesterdayPTEStats: yesterdayData || 0,
    weeklyPTEStats: weeklyData || 0,
    monthlyPTEStats: monthlyData || 0,
    dayBeforeYesterdayPTEs: comparisonData?.dayBeforeYesterdayPTEs || 0,
    lastWeekPTEs: comparisonData?.lastWeekPTEs || 0,
    lastMonthPTEs: comparisonData?.lastMonthPTEs || 0,
    thisMonthRevenue: chartAndRevenueData?.thisMonthRevenue || 0,
    weeklyChartData: chartAndRevenueData?.weeklyChartData || [],
    monthlyChartData: chartAndRevenueData?.monthlyChartData || [],
    isLoading,
  };
}
