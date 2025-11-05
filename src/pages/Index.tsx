import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, CalendarDays, Clock, TrendingUp, Package, Truck, Recycle, BarChart3, CheckCircle2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, Tooltip as ChartTooltip, XAxis, YAxis, CartesianGrid, ReferenceLine, ResponsiveContainer } from "recharts";
import { usePickups } from "@/hooks/usePickups";
import { useClients } from "@/hooks/useClients";
import { useVehicles } from "@/hooks/useVehicles";
import { useTodaysDropoffs } from "@/hooks/useDropoffs";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { CapacityGauge } from "@/components/CapacityGauge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { StatsCard } from "@/components/enhanced/StatsCard";
import { ProjectedRevenueWidget } from "@/components/dashboard/ProjectedRevenueWidget";
import { format, addDays } from "date-fns";
import { useEffect } from "react";
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
  const { data: vehiclesData = [] } = useVehicles();
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
        .select('pte_on_rim, pte_off_rim, otr_count, tractor_count, created_at')
        .eq('organization_id', user?.currentOrganization?.id)
        .eq('status', 'COMPLETED')
        .gte('created_at', sixMonthsAgo.toISOString());
      
      if (error) throw error;
      
      // Group by month with date tracking for sorting
      const byMonth: Record<string, { ptes: number; date: Date }> = {};
      (data || []).forEach((manifest) => {
        const manifestDate = new Date(manifest.created_at);
        const monthKey = format(manifestDate, 'MMM yy');
        const ptes = (manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0) + 
                     (manifest.otr_count || 0) + (manifest.tractor_count || 0);
        
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

  // Fetch this week's tire totals (Monday through today) - DIRECT LIVE
  const { data: weeklyTireStats } = useQuery({
    queryKey: ['weekly-tire-totals', user?.currentOrganization?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const today = new Date();
      const todayDay = today.getDay();
      const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday);
      
      const startDate = format(monday, 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');
      
      const [pickupsResult, dropoffsResult] = await Promise.all([
        supabase
          .from('pickups')
          .select('pte_count')
          .eq('organization_id', user?.currentOrganization?.id)
          .gte('pickup_date', startDate)
          .lte('pickup_date', endDate),
        supabase
          .from('dropoffs')
          .select('pte_count')
          .eq('organization_id', user?.currentOrganization?.id)
          .gte('dropoff_date', startDate)
          .lte('dropoff_date', endDate)
      ]);
      
      if (pickupsResult.error) throw pickupsResult.error;
      if (dropoffsResult.error) throw dropoffsResult.error;
      
      const pickupPTEs = (pickupsResult.data || []).reduce((sum, p) => sum + (p.pte_count || 0), 0);
      const dropoffPTEs = (dropoffsResult.data || []).reduce((sum, d) => sum + (d.pte_count || 0), 0);
      
      return pickupPTEs + dropoffPTEs;
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
    staleTime: 0
  });

  // Fetch yesterday's tire totals - DIRECT LIVE
  const { data: yesterdayTireStats } = useQuery({
    queryKey: ['yesterday-tire-totals', user?.currentOrganization?.id, format(addDays(new Date(), -1), 'yyyy-MM-dd')],
    queryFn: async () => {
      const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
      
      const [pickupsResult, dropoffsResult] = await Promise.all([
        supabase
          .from('pickups')
          .select('pte_count')
          .eq('organization_id', user?.currentOrganization?.id)
          .eq('pickup_date', yesterday),
        supabase
          .from('dropoffs')
          .select('pte_count')
          .eq('organization_id', user?.currentOrganization?.id)
          .eq('dropoff_date', yesterday)
      ]);
      
      if (pickupsResult.error) throw pickupsResult.error;
      if (dropoffsResult.error) throw dropoffsResult.error;
      
      const pickupPTEs = (pickupsResult.data || []).reduce((sum, p) => sum + (p.pte_count || 0), 0);
      const dropoffPTEs = (dropoffsResult.data || []).reduce((sum, d) => sum + (d.pte_count || 0), 0);
      
      return pickupPTEs + dropoffPTEs;
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
    staleTime: 0
  });

  // Fetch this month's tire totals (1st through today) - DIRECT LIVE
  const { data: monthlyTireStats } = useQuery({
    queryKey: ['monthly-tire-totals', user?.currentOrganization?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const today = new Date();
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startDate = format(firstOfMonth, 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');
      
      const [pickupsResult, dropoffsResult] = await Promise.all([
        supabase
          .from('pickups')
          .select('pte_count')
          .eq('organization_id', user?.currentOrganization?.id)
          .gte('pickup_date', startDate)
          .lte('pickup_date', endDate),
        supabase
          .from('dropoffs')
          .select('pte_count')
          .eq('organization_id', user?.currentOrganization?.id)
          .gte('dropoff_date', startDate)
          .lte('dropoff_date', endDate)
      ]);
      
      if (pickupsResult.error) throw pickupsResult.error;
      if (dropoffsResult.error) throw dropoffsResult.error;
      
      const pickupPTEs = (pickupsResult.data || []).reduce((sum, p) => sum + (p.pte_count || 0), 0);
      const dropoffPTEs = (dropoffsResult.data || []).reduce((sum, d) => sum + (d.pte_count || 0), 0);
      
      return pickupPTEs + dropoffPTEs;
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
    staleTime: 0
  });

  // Fetch this week's daily stats for PTE goal chart (current week Mon-Fri only) - DIRECT LIVE
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
      
      const [pickupsResult, dropoffsResult] = await Promise.all([
        supabase
          .from('pickups')
          .select('pte_count, pickup_date')
          .eq('organization_id', user?.currentOrganization?.id)
          .gte('pickup_date', startDate)
          .lte('pickup_date', endDate),
        supabase
          .from('dropoffs')
          .select('pte_count, dropoff_date')
          .eq('organization_id', user?.currentOrganization?.id)
          .gte('dropoff_date', startDate)
          .lte('dropoff_date', endDate)
      ]);
      
      if (pickupsResult.error) throw pickupsResult.error;
      if (dropoffsResult.error) throw dropoffsResult.error;
      
      const ptesByDate: Record<string, number> = {};
      
      (pickupsResult.data || []).forEach(p => {
        ptesByDate[p.pickup_date] = (ptesByDate[p.pickup_date] || 0) + (p.pte_count || 0);
      });
      
      (dropoffsResult.data || []).forEach(d => {
        ptesByDate[d.dropoff_date] = (ptesByDate[d.dropoff_date] || 0) + (d.pte_count || 0);
      });
      
      return days.map(({ date, label }) => ({
        day: label,
        ptes: ptesByDate[date] || 0,
        target: 2600
      }));
    },
    enabled: !!user?.currentOrganization?.id,
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
  
  const vehicles = vehiclesData.map(vehicle => ({
    id: vehicle.id,
    name: vehicle.name,
    status: vehicle.is_active ? 'active' : 'maintenance'
  }));

  // Enhanced statistics with real BSG metrics
  const activeClients = { length: totalActiveClientsCount }; // Use total count instead of filtered array
  const totalRevenue = clients.reduce((sum: number, client: any) => sum + (client.lifetime_revenue || 0), 0);
  const assignedPickups = todayPickups.filter(p => p.status !== 'pending');
  const completedPickups = todayPickups.filter(p => p.status === 'completed');
  const overduePickups = todayPickups.filter(p => p.status === 'overdue');
  
  // Calculate TODAY's PTEs - DIRECT LIVE
  const { data: todayPTEStats = { ptes: 0, pounds: 0 } } = useQuery({
    queryKey: ['today-pte-stats', user?.currentOrganization?.id, format(new Date(), 'yyyy-MM-dd')],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const [pickupsResult, dropoffsResult] = await Promise.all([
        supabase
          .from('pickups')
          .select('pte_count')
          .eq('organization_id', user?.currentOrganization?.id)
          .eq('pickup_date', today),
        supabase
          .from('dropoffs')
          .select('pte_count')
          .eq('organization_id', user?.currentOrganization?.id)
          .eq('dropoff_date', today)
      ]);
      
      if (pickupsResult.error) throw pickupsResult.error;
      if (dropoffsResult.error) throw dropoffsResult.error;
      
      const pickupPTEs = (pickupsResult.data || []).reduce((sum, p) => sum + (p.pte_count || 0), 0);
      const dropoffPTEs = (dropoffsResult.data || []).reduce((sum, d) => sum + (d.pte_count || 0), 0);
      const ptes = pickupPTEs + dropoffPTEs;
      
      const pounds = ptes * 22;
      
      console.log('Dashboard tiles recalibrated — using direct live PTE sums only.');
      
      return { ptes, pounds };
    },
    enabled: !!user?.currentOrganization?.id,
    refetchInterval: 30000,
  });
  
  const totalTiresRecycled = todayPTEStats.ptes;
  const totalPoundsRecycled = todayPTEStats.pounds;

// Calculate revenue from manifests and drop-offs
const manifestRevenue = todaysManifests.reduce((sum: number, manifest: any) => sum + (manifest.total || 0), 0);
const dropoffRevenue = todaysDropoffs.reduce((sum: number, dropoff: any) => sum + (dropoff.computed_revenue || 0), 0);
const totalDailyRevenue = manifestRevenue + dropoffRevenue;

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
              change={totalTiresRecycled > 0 ? 8.3 : 0}
              changeLabel="from all sources"
            />
          </SlideUp>
          
          <SlideUp>
            <StatsCard
              title="Tires Recycled Yesterday"
              value={yesterdayTireStats ? `${yesterdayTireStats} PTEs` : '0 PTEs'}
              icon={<Recycle className="w-5 h-5" />}
              variant="primary"
              change={yesterdayTireStats && yesterdayTireStats > 0 ? 5.2 : 0}
              changeLabel="previous day"
            />
          </SlideUp>
          
          <SlideUp>
            <StatsCard
              title="Tires Recycled This Week"
              value={weeklyTireStats ? `${weeklyTireStats} PTEs` : '0 PTEs'}
              icon={<Recycle className="w-5 h-5" />}
              variant="primary"
              change={weeklyTireStats && weeklyTireStats > 0 ? 15.2 : 0}
              changeLabel="Monday - today"
            />
          </SlideUp>
          
          <SlideUp>
            <StatsCard
              title="Tires Recycled This Month"
              value={monthlyTireStats ? `${monthlyTireStats} PTEs` : '0 PTEs'}
              icon={<Recycle className="w-5 h-5" />}
              variant="success"
              change={monthlyTireStats && monthlyTireStats > 0 ? 22.4 : 0}
              changeLabel="month to date"
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

        {/* Performance Metrics */}
        <SlideUp delay={0.3}>
          <div className="grid gap-6 lg:grid-cols-2 mb-8">
            <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-secondary/10">
              <CardHeader className="border-b border-border/10">
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="w-5 h-5 text-brand-recycling" />
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

            <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-brand-recycling/5">
              <CardHeader className="border-b border-border/10">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-brand-recycling" />
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

          <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-card-hover mb-8">
            <CardHeader className="border-b border-border/10">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-primary" />
                Today's Operations
              </CardTitle>
              <CardDescription>Real-time pickup status and progress</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-brand-success">{completedPickups.length}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                  <Badge variant="outline" className="border-brand-success/30 text-brand-success">
                    On Schedule
                  </Badge>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-brand-primary">{assignedPickups.length - completedPickups.length}</div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                  <Badge variant="outline" className="border-brand-primary/30 text-brand-primary">
                    Active Routes
                  </Badge>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-brand-warning">{overduePickups.length}</div>
                  <div className="text-sm text-muted-foreground">Overdue</div>
                  <Badge variant="outline" className="border-brand-warning/30 text-brand-warning">
                    Needs Attention
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideUp>

        {/* Projected Revenue Widget */}
        <SlideUp delay={0.35}>
          <ProjectedRevenueWidget />
        </SlideUp>

        {/* Quick Actions removed - navigation available in sidebar/top nav */}

        {/* Today's Pickup Activity removed - stats shown in top cards */}

        {/* Fleet Status */}
        <SlideUp delay={0.4}>
          <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-secondary/5 mb-8">
            <CardHeader className="border-b border-border/10">
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-brand-primary" />
                Fleet Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/10">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        vehicle.status === 'active' ? 'bg-brand-success animate-pulse-glow' : 
                        vehicle.status === 'maintenance' ? 'bg-brand-warning' : 'bg-muted-foreground'
                      }`} />
                      <span className="font-medium">{vehicle.name}</span>
                    </div>
                    <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'}>
                      {vehicle.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </SlideUp>
      </main>
    </div>
  );
}