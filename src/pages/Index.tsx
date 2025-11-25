import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, CalendarDays, Clock, Package, Recycle, BarChart3, CheckCircle2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, Tooltip as ChartTooltip, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer } from "recharts";
import { usePickups } from "@/hooks/usePickups";
import { useClients } from "@/hooks/useClients";
import { useTodaysDropoffs } from "@/hooks/useDropoffs";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { CapacityGauge } from "@/components/CapacityGauge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { calculateManifestPTE } from "@/lib/michigan-conversions";

import { StatsCard } from "@/components/enhanced/StatsCard";
import { PTEBreakdownDialog } from "@/components/dashboard/PTEBreakdownDialog";
import { InvoicePendingWidget } from "@/components/dashboard/InvoicePendingWidget";
import { format, addDays } from "date-fns";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StaggerList } from "@/components/motion/StaggerList";
import { FadeIn } from "@/components/motion/FadeIn";
import { SlideUp } from "@/components/motion/SlideUp";
import { FollowupWorkflows } from "@/components/workflows/FollowupWorkflows";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { SchedulePickupWithDriverDialog } from "@/components/SchedulePickupWithDriverDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
// Intelligence components moved to /intelligence page

export default function Index() {
  const navigate = useNavigate();
  const { user, hasAnyRole } = useAuth();
  const [breakdownDialog, setBreakdownDialog] = useState<{
    open: boolean;
    title: string;
    period: 'today' | 'yesterday' | 'week' | 'month';
  }>({
    open: false,
    title: '',
    period: 'today'
  });

  useEffect(() => {
    document.title = "TreadSet Dashboard";
  }, []);
  
  // Redirect ONLY pure drivers (not admins who also have driver role) to their routes
  useEffect(() => {
    if (user && user.roles?.includes('driver') && !hasAnyRole(['admin', 'ops_manager', 'dispatcher', 'sales'])) {
      console.log('Redirecting pure driver to routes');
      navigate('/routes/driver', { replace: true });
    }
  }, [user?.id, navigate, hasAnyRole]);
  
  // Don't render admin content for pure drivers while redirecting
  if (user && user.roles?.includes('driver') && !hasAnyRole(['admin', 'ops_manager', 'dispatcher', 'sales'])) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading your assigned routes...</div>
        </div>
      </div>
    );
  }
  
  // Enable real-time updates for auto-refreshing tiles
  useRealtimeUpdates();
  
  // Real data hooks - now enabled for live updates
  const { data: todayPickupsData = [] } = usePickups(format(new Date(), 'yyyy-MM-dd'));
  const { data: clientsResponse } = useClients();
  const { data: todaysDropoffs = [] } = useTodaysDropoffs();
  
  // Fetch today's manifests to get actual PTE counts
  const { data: todaysManifests = [] } = useQuery({
    queryKey: ['manifests', 'today', user?.currentOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('manifests')
        .select('*')
        .eq('organization_id', user?.currentOrganization?.id)
        .gte('created_at', format(new Date(), 'yyyy-MM-dd'))
        .lt('created_at', format(addDays(new Date(), 1), 'yyyy-MM-dd'));
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.currentOrganization?.id,
  });

  // Fetch monthly stats for environmental impact chart
  const { data: monthlyData = [] } = useQuery({
    queryKey: ['monthly-stats', user?.currentOrganization?.id],
    queryFn: async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
        const { data, error } = await supabase
          .from('manifests')
          .select('pte_on_rim, pte_off_rim, commercial_17_5_19_5_off, commercial_17_5_19_5_on, commercial_22_5_off, commercial_22_5_on, otr_count, tractor_count, created_at')
          .eq('organization_id', user?.currentOrganization?.id)
          .eq('status', 'COMPLETED')
          .gte('created_at', sixMonthsAgo.toISOString());
      
        if (error) throw error;
        
        // Group by month with date tracking for sorting
        const byMonth: Record<string, { ptes: number; date: Date }> = {};
        (data || []).forEach((manifest) => {
          const manifestDate = new Date(manifest.created_at);
          const monthKey = format(manifestDate, 'MMM yy');
          const ptes = calculateManifestPTE(manifest as any);
          
          if (!byMonth[monthKey]) {
            byMonth[monthKey] = { ptes: 0, date: manifestDate };
          }
          byMonth[monthKey].ptes += ptes;
        });
      
      // Convert to array and sort chronologically (oldest to newest)
      return Object.entries(byMonth)
        .map(([month, data]) => ({ month, ptes: data.ptes, date: data.date }))
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(-6) // Take last 6 months
        .map(({ month, ptes }) => ({ month, ptes }));
    },
    enabled: !!user?.currentOrganization?.id,
  });

  // Fetch this week's tire totals (Monday through today) - TIMEZONE ALIGNED
  const { data: weeklyTireStats } = useQuery({
    queryKey: ['weekly-tire-totals', user?.currentOrganization?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_pte_totals', {
        org_id: user?.currentOrganization?.id
      });
      
      if (error) throw error;
      
      console.log('📊 WEEKLY PTE TOTALS:');
      console.log(`  Pickups: ${data[0]?.pickup_ptes || 0} PTEs`);
      console.log(`  Drop-offs: ${data[0]?.dropoff_ptes || 0} PTEs`);
      const weeklyCombined = Number(data[0]?.pickup_ptes || 0) + Number(data[0]?.dropoff_ptes || 0);
      console.log(`  Combined: ${weeklyCombined} PTEs`);
      
      return weeklyCombined;
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
    staleTime: 0
  });

  // Fetch yesterday's tire totals - TIMEZONE ALIGNED
  const { data: yesterdayTireStats } = useQuery({
    queryKey: ['yesterday-tire-totals', user?.currentOrganization?.id, format(addDays(new Date(), -1), 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_yesterday_pte_totals', {
        org_id: user?.currentOrganization?.id
      });
      
      if (error) throw error;
      
      console.log('📊 YESTERDAY PTE TOTALS:');
      console.log(`  Pickups: ${data[0]?.pickup_ptes || 0} PTEs`);
      console.log(`  Drop-offs: ${data[0]?.dropoff_ptes || 0} PTEs`);
      const yesterdayCombined = Number(data[0]?.pickup_ptes || 0) + Number(data[0]?.dropoff_ptes || 0);
      console.log(`  Combined: ${yesterdayCombined} PTEs`);
      
      return yesterdayCombined;
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
    staleTime: 0
  });

  // Fetch this month's tire totals (1st through today) - TIMEZONE ALIGNED
  const { data: monthlyTireStats } = useQuery({
    queryKey: ['monthly-tire-totals', user?.currentOrganization?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_pte_totals', {
        org_id: user?.currentOrganization?.id
      });
      
      if (error) throw error;
      
      console.log('📊 MONTHLY PTE TOTALS:');
      console.log(`  Pickups: ${data[0]?.pickup_ptes || 0} PTEs`);
      console.log(`  Drop-offs: ${data[0]?.dropoff_ptes || 0} PTEs`);
      const monthlyCombined = Number(data[0]?.pickup_ptes || 0) + Number(data[0]?.dropoff_ptes || 0);
      console.log(`  Combined: ${monthlyCombined} PTEs`);
      
      return monthlyCombined;
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
    staleTime: 0
  });

  // Fetch this week's daily stats for PTE goal chart (current week Mon-Fri only) - MANIFEST-BASED
  const { data: weeklyData = [] } = useQuery({
    queryKey: ['weekly-stats', user?.currentOrganization?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const today = new Date();
      const todayDay = today.getDay();
      const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);
      
      const days = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        days.push({
          date: format(date, 'yyyy-MM-dd'),
          label: format(date, 'EEE')
        });
      }
      
      const startDate = format(monday, 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');
      
      // Use manifests (actual tire counts) + dropoffs
      const [manifestsResult, dropoffsResult] = await Promise.all([
        supabase
          .from('manifests')
          .select('pte_on_rim, pte_off_rim, commercial_17_5_19_5_off, commercial_17_5_19_5_on, commercial_22_5_off, commercial_22_5_on, otr_count, tractor_count, signed_at, created_at')
          .eq('organization_id', user?.currentOrganization?.id)
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59`),
        supabase
          .from('dropoffs')
          .select('pte_count, otr_count, tractor_count, dropoff_date')
          .eq('organization_id', user?.currentOrganization?.id)
          .gte('dropoff_date', startDate)
          .lte('dropoff_date', endDate)
      ]);
      
      if (manifestsResult.error) throw manifestsResult.error;
      if (dropoffsResult.error) throw dropoffsResult.error;
      
      const ptesByDate: Record<string, number> = {};
      
      // Sum manifest tire counts by completion date
      (manifestsResult.data || []).forEach(m => {
        const completionDate = m.signed_at || m.created_at;
        const dateKey = format(new Date(completionDate), 'yyyy-MM-dd');
        const ptes = calculateManifestPTE(m as any);
        ptesByDate[dateKey] = (ptesByDate[dateKey] || 0) + ptes;
      });
      
      // Add dropoff counts
      (dropoffsResult.data || []).forEach(d => {
        const converted = (d.pte_count || 0) + ((d.otr_count || 0) * 15) + ((d.tractor_count || 0) * 5);
        ptesByDate[d.dropoff_date] = (ptesByDate[d.dropoff_date] || 0) + converted;
      });
      
      return days.map(({ date, label }) => ({
        day: label,
        ptes: ptesByDate[date] || 0,
        target: 2600
      }));
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
  });
  
  // Pickups this month by client (live)
  const { data: pickupsThisMonth = [] } = useQuery({
    queryKey: ['pickups-this-month', user?.currentOrganization?.id, format(new Date(), 'yyyy-MM')],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setMonth(start.getMonth() + 1);

      const { data, error } = await supabase
        .from('pickups')
        .select('client_id, pickup_date, status')
        .eq('organization_id', user?.currentOrganization?.id)
        .gte('pickup_date', format(start, 'yyyy-MM-dd'))
        .lt('pickup_date', format(end, 'yyyy-MM-dd'))
        .in('status', ['completed','in_progress','scheduled']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.currentOrganization?.id,
  });

  const pickupsThisMonthMap = (pickupsThisMonth || []).reduce((acc: Record<string, number>, p: any) => {
    if (!p.client_id) return acc;
    acc[p.client_id] = (acc[p.client_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Extract clients data from response
  const clientsData = Array.isArray(clientsResponse) ? clientsResponse : (clientsResponse?.data || []);
  const totalActiveClientsCount = Array.isArray(clientsResponse) ? clientsResponse.length : (clientsResponse?.count || 0);
  
  // Process real data
  const todayPickups = todayPickupsData.map(pickup => ({
    id: pickup.id,
    client_id: pickup.client_id,
    client: { company_name: pickup.client?.company_name || 'Unknown Client' },
    location: pickup.location,
    pte_count: pickup.pte_count || 0,
    pickup_date: pickup.pickup_date,
    status: pickup.status || 'scheduled',
    computed_revenue: pickup.computed_revenue || 0
  }));
  
  const clients = clientsData.map(client => ({
    id: client.id,
    company_name: client.company_name,
    is_active: client.is_active,
    lifetime_revenue: client.lifetime_revenue || 0,
    last_pickup_at: client.last_pickup_at,
    pickups_count: client.pickups?.[0]?.count || 0
  }));

  // Enhanced statistics with real BSG metrics
  const activeClients = { length: totalActiveClientsCount }; // Use total count instead of filtered array
  const totalRevenue = clients.reduce((sum: number, client: any) => sum + (client.lifetime_revenue || 0), 0);
  const assignedPickups = todayPickups.filter(p => p.status !== 'pending');
  const completedPickups = todayPickups.filter(p => p.status === 'completed');
  const overduePickups = todayPickups.filter(p => p.status === 'overdue');
  
  // Calculate TODAY's PTEs - TIMEZONE ALIGNED
  const { data: todayPTEStats = { ptes: 0, pounds: 0 } } = useQuery({
    queryKey: ['today-pte-stats', user?.currentOrganization?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_today_pte_totals', {
        org_id: user?.currentOrganization?.id
      });
      
      if (error) throw error;
      
      const pickup = Number(data[0]?.pickup_ptes || 0);
      const dropoff = Number(data[0]?.dropoff_ptes || 0);
      const ptes = pickup + dropoff;
      const pounds = ptes * 22;
      
      return { ptes, pounds };
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
  });
  
  // Yesterday's PTEs
  const { data: yesterdayPTEStats = { ptes: 0 } } = useQuery({
    queryKey: ['yesterday-pte-stats', user?.currentOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_yesterday_pte_totals', {
        org_id: user?.currentOrganization?.id
      });
      if (error) throw error;
      const ptes = Number(data[0]?.total_ptes || 0);
      return { ptes };
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
  });
  
  // This Week's PTEs
  const { data: weeklyPTEStats = { ptes: 0 } } = useQuery({
    queryKey: ['weekly-pte-stats', user?.currentOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_pte_totals', {
        org_id: user?.currentOrganization?.id
      });
      if (error) throw error;
      const ptes = Number(data[0]?.total_ptes || 0);
      return { ptes };
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
  });
  
  // This Month's PTEs
  const { data: monthlyPTEStats = { ptes: 0 } } = useQuery({
    queryKey: ['monthly-pte-stats', user?.currentOrganization?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_pte_totals', {
        org_id: user?.currentOrganization?.id
      });
      if (error) throw error;
      const ptes = Number(data[0]?.total_ptes || 0);
      return { ptes };
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
  });
  
  // Calculate percent changes
  const todayChange = yesterdayTireStats && yesterdayTireStats > 0 
    ? ((todayPTEStats.ptes - yesterdayTireStats) / yesterdayTireStats) * 100 
    : 0;
  
  const yesterdayChange = 0; // Would need day-before-yesterday data
  const weeklyChange = 0; // Would need last week data
  const monthlyChange = 0; // Would need last month data
  
  const totalTiresRecycled = todayPTEStats.ptes;
  const totalPoundsRecycled = todayPTEStats.pounds;

// Calculate revenue from manifests and drop-offs
const manifestRevenue = todaysManifests.reduce((sum: number, manifest: any) => sum + (manifest.total || 0), 0);
const dropoffRevenue = todaysDropoffs.reduce((sum: number, dropoff: any) => sum + (dropoff.computed_revenue || 0), 0);
const totalDailyRevenue = manifestRevenue + dropoffRevenue; // ... keep existing code

  // Fetch detailed breakdown data for each period
  const { data: breakdownData } = useQuery({
    queryKey: ['pte-breakdown', breakdownDialog.period, user?.currentOrganization?.id],
    queryFn: async () => {
      const today = new Date();
      let startDate: Date;
      let endDate: Date = new Date(today);
      endDate.setHours(23, 59, 59, 999);

      switch (breakdownDialog.period) {
        case 'today':
          startDate = new Date(today);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          const todayDay = today.getDay();
          const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;
          startDate = new Date(today);
          startDate.setDate(today.getDate() - daysFromMonday);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          startDate = new Date(today);
          startDate.setHours(0, 0, 0, 0);
      }

      // Fetch manifests for client pickups only
      const { data: manifestsData, error: manifestsError } = await supabase
        .from('manifests')
        .select(`
          id,
          signed_at,
          created_at,
          pte_on_rim,
          pte_off_rim,
          commercial_17_5_19_5_off,
          commercial_17_5_19_5_on,
          commercial_22_5_off,
          commercial_22_5_on,
          otr_count,
          tractor_count,
          client:clients(company_name),
          location:locations(name)
        `)
        .eq('organization_id', user?.currentOrganization?.id)
        .gte('created_at', format(startDate, 'yyyy-MM-dd') + 'T00:00:00')
        .lte('created_at', format(endDate, 'yyyy-MM-dd') + 'T23:59:59')
        .in('status', ['COMPLETED', 'AWAITING_RECEIVER_SIGNATURE'])
        .not('client_id', 'is', null);

      if (manifestsError) throw manifestsError;

      // Filter and transform manifests with tire counts
      const pickupsData = manifestsData
        ?.filter(m => {
          const totalPTE = calculateManifestPTE(m as any);
          const isDropoffPseudoClient = m.client?.company_name && /drop[- ]?off customers/i.test(m.client.company_name.trim());
          return totalPTE > 0 && m.client && !isDropoffPseudoClient;
        })
        .map(m => ({
          id: m.id,
          pickup_date: format(new Date(m.signed_at || m.created_at), 'yyyy-MM-dd'),
          pte_count: calculateManifestPTE(m as any),
          otr_count: m.otr_count || 0,
          tractor_count: m.tractor_count || 0,
          client: m.client,
          location: m.location
        })) || [];

      // Fetch standalone dropoffs (without linked manifests to avoid double-counting)
      const { data: dropoffsData, error: dropoffsError } = await supabase
        .from('dropoffs')
        .select(`
          id,
          dropoff_date,
          pte_count,
          otr_count,
          tractor_count,
          client:clients(company_name, contact_name)
        `)
        .eq('organization_id', user?.currentOrganization?.id)
        .gte('dropoff_date', format(startDate, 'yyyy-MM-dd'))
        .lte('dropoff_date', format(endDate, 'yyyy-MM-dd'))
        .is('manifest_id', null);

      if (dropoffsError) throw dropoffsError;

      // Filter dropoffs with tire counts
      const filteredDropoffs = dropoffsData?.filter(d => {
        const totalTires = (d.pte_count || 0) + (d.otr_count || 0) + (d.tractor_count || 0);
        return totalTires > 0;
      }) || [];

      return {
        pickups: pickupsData,
        dropoffs: filteredDropoffs
      };
    },
    enabled: breakdownDialog.open && !!user?.currentOrganization?.id,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    staleTime: 0
  });

  return (
    <div className="min-h-screen bg-background">
      
      
      <main className="container mx-auto px-6 pb-8 pt-8">
        {/* Welcome Section */}
        <FadeIn delay={0.1}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Welcome back, {user?.firstName || 'Operator'}!
              </h2>
              <p className="text-muted-foreground mt-1">
                Today is {format(new Date(), 'EEEE, MMMM do, yyyy')} • Here's your operational overview
              </p>
            </div>
            <UserMenu />
          </div>
        </FadeIn>

        {/* Enhanced Stats Grid - Now with staggered animation */}
        <StaggerList className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8" staggerDelay={0.1}>
          <SlideUp>
            <StatsCard
              title="Tires Recycled Today"
              value={totalTiresRecycled > 0 ? `${totalTiresRecycled} PTEs` : '0 PTEs'}
              icon={<Recycle className="w-5 h-5" />}
              variant="success"
              change={todayChange}
              changeLabel="vs yesterday"
              onClick={() => setBreakdownDialog({ open: true, title: 'Tires Recycled Today', period: 'today' })}
            />
          </SlideUp>
          
          <SlideUp>
            <StatsCard
              title="Tires Recycled Yesterday"
              value={yesterdayTireStats ? `${yesterdayTireStats} PTEs` : '0 PTEs'}
              icon={<Recycle className="w-5 h-5" />}
              variant="primary"
              change={yesterdayChange}
              changeLabel="vs previous day"
              onClick={() => setBreakdownDialog({ open: true, title: 'Tires Recycled Yesterday', period: 'yesterday' })}
            />
          </SlideUp>
          
          <SlideUp>
            <StatsCard
              title="Tires Recycled This Week"
              value={weeklyTireStats ? `${weeklyTireStats} PTEs` : '0 PTEs'}
              icon={<Recycle className="w-5 h-5" />}
              variant="primary"
              change={weeklyChange}
              changeLabel="vs last week"
              onClick={() => setBreakdownDialog({ open: true, title: 'Tires Recycled This Week', period: 'week' })}
            />
          </SlideUp>
          
          <SlideUp>
            <StatsCard
              title="Tires Recycled This Month"
              value={monthlyTireStats ? `${monthlyTireStats} PTEs` : '0 PTEs'}
              icon={<Recycle className="w-5 h-5" />}
              variant="success"
              change={monthlyChange}
              changeLabel="vs last month"
              onClick={() => setBreakdownDialog({ open: true, title: 'Tires Recycled This Month', period: 'month' })}
            />
          </SlideUp>
        </StaggerList>

        {/* AI Insights moved to /intelligence page - available in sidebar/settings */}

        {/* Client Followups - Prominent section for sales team */}
        {hasAnyRole(['admin', 'ops_manager', 'sales']) && (
          <SlideUp delay={0.3}>
            <div className="mb-8">
              <FollowupWorkflows />
            </div>
          </SlideUp>
        )}

        {/* Invoice Pending Widget - Shows clients needing invoices */}
        {hasAnyRole(['admin', 'ops_manager', 'sales']) && (
          <SlideUp delay={0.35}>
            <div className="mb-8">
              <InvoicePendingWidget />
            </div>
          </SlideUp>
        )}

        {/* Performance Metrics */}
        <SlideUp delay={0.3}>
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            <Card className="border-2 shadow-xl bg-gradient-to-br from-card to-secondary/10">
              <CardHeader className="bg-brand-success border-b">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Recycle className="w-5 h-5 text-white" />
                  Environmental Impact
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">
                          <strong>Data source:</strong> manifests table<br/>
                          <strong>Period:</strong> Last 6 months<br/>
                          <strong>Filter:</strong> status = COMPLETED<br/>
                          <strong>Updates:</strong> Real-time
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-recycling mb-1">
                    {totalPoundsRecycled > 0 ? totalPoundsRecycled.toLocaleString() : '0'} lbs
                  </div>
                  <div className="text-sm text-muted-foreground">Tires Recycled Today</div>
                </div>

                {/* Monthly Trend Chart */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">6-Month Recycling Trend (PTEs)</div>
                  <ResponsiveContainer width="100%" height={140}>
                    <LineChart
                      data={monthlyData || []}
                      margin={{ top: 10, right: 15, left: 0, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                        stroke="hsl(var(--border))"
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        stroke="hsl(var(--border))"
                        width={50}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ptes" 
                        stroke="hsl(var(--brand-recycling))" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(var(--brand-recycling))', r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }}
                        activeDot={{ r: 6 }}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                                <p className="font-semibold text-sm">{payload[0].payload.month}</p>
                                <p className="text-brand-recycling font-bold text-base">{payload[0].value?.toLocaleString()} PTEs</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>CO₂ Saved</span>
                    <span className="font-medium">{totalTiresRecycled > 0 ? (totalTiresRecycled * 0.00427).toFixed(3) : '0'} tons</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Revenue Today</span>
                    <span className="font-medium">${totalDailyRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-xl bg-gradient-to-br from-card to-brand-recycling/5">
              <CardHeader className="bg-brand-success border-b">
                <CardTitle className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  Daily PTE Goal
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">
                          <strong>Data source:</strong> manifests + dropoffs + pickups tables<br/>
                          <strong>Filter:</strong> Today, status = COMPLETED<br/>
                          <strong>Calculation:</strong> Sum of ALL tire intake<br/>
                          <strong>Updates:</strong> Real-time
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
                <CardDescription>Progress toward 2,600 PTEs daily target</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Main Goal Progress */}
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center">
                      <CapacityGauge
                        value={Math.min((totalTiresRecycled / 2600) * 100, 100)}
                        size={120}
                        strokeWidth={12}
                        animateOnMount
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-3xl font-bold text-brand-recycling">
                        {totalTiresRecycled.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        of 2,600 PTEs goal
                      </div>
                      <div className="text-lg font-semibold">
                        {2600 - totalTiresRecycled > 0 ? 
                          `${(2600 - totalTiresRecycled).toLocaleString()} remaining` : 
                          '🎯 Goal achieved!'
                        }
                      </div>
                    </div>
                  </div>

                  {/* Weekly Trend Chart */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-muted-foreground">This Week's Activity (Target: 2,600 PTEs/day)</div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs max-w-xs">
                              <strong>Data source:</strong> manifests + pickups + dropoffs tables<br/>
                              <strong>Period:</strong> Current week (Mon-today)<br/>
                              <strong>Aggregation:</strong> All tire intake sources combined<br/>
                              <strong>Scale:</strong> 0-5,000 PTEs<br/>
                              <strong>Updates:</strong> Real-time
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart
                        data={weeklyData}
                        margin={{ top: 10, right: 15, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis 
                          dataKey="day" 
                          tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                          stroke="hsl(var(--border))"
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          stroke="hsl(var(--border))"
                          width={50}
                          domain={[0, 5000]}
                        />
                        <ReferenceLine 
                          y={2600} 
                          stroke="hsl(var(--brand-primary))" 
                          strokeDasharray="5 5"
                          strokeWidth={2}
                          label={{ 
                            value: 'Target: 2,600', 
                            position: 'top', 
                            fontSize: 10, 
                            fill: 'hsl(var(--brand-primary))',
                            fontWeight: 600
                          }}
                        />
                        <ChartTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const value = payload[0].value as number;
                              const target = 2600;
                              const diff = value - target;
                              const percentage = ((value / target) * 100).toFixed(0);
                              return (
                                <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg">
                                  <p className="font-semibold text-sm">{payload[0].payload.day}</p>
                                  <p className="text-brand-recycling font-bold text-base">{value?.toLocaleString()} PTEs</p>
                                  <p className={`text-xs font-medium ${diff >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                                    {percentage}% of target ({diff >= 0 ? '+' : ''}{diff})
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar 
                          dataKey="ptes" 
                          fill="hsl(var(--brand-recycling))" 
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Additional Metrics */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/10">
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-bold text-brand-primary">
                        {totalTiresRecycled > 0 ? Math.round(totalTiresRecycled / todayPickups.length) || 0 : 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Avg PTEs/Pickup</div>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-bold text-brand-secondary">
                        {((totalTiresRecycled / 2600) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">Goal Progress</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SlideUp>

        {/* Quick Actions removed - navigation available in sidebar/top nav */}

        {/* Today's Pickup Activity removed - stats shown in top cards */}
      </main>

      {/* PTE Breakdown Dialog */}
      <PTEBreakdownDialog
        open={breakdownDialog.open}
        onOpenChange={(open) => setBreakdownDialog({ ...breakdownDialog, open })}
        title={breakdownDialog.title}
        pickups={breakdownData?.pickups || []}
        dropoffs={breakdownData?.dropoffs || []}
        totalPTEs={
          breakdownDialog.period === 'today' ? totalTiresRecycled :
          breakdownDialog.period === 'yesterday' ? (yesterdayTireStats || 0) :
          breakdownDialog.period === 'week' ? (weeklyTireStats || 0) :
          (monthlyTireStats || 0)
        }
      />
    </div>
  );
}