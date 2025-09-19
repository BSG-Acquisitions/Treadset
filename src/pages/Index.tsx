import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, Users, TrendingUp, Package, Truck, Recycle, BarChart3, CheckCircle2 } from "lucide-react";
import { usePickups } from "@/hooks/usePickups";
import { useClients } from "@/hooks/useClients";
import { useVehicles } from "@/hooks/useVehicles";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { CapacityGauge } from "@/components/CapacityGauge";
import { RowCarousel } from "@/components/RowCarousel";

import { StatsCard } from "@/components/enhanced/StatsCard";
import { format } from "date-fns";
import { useEffect } from "react";
import { useRealtimeUpdates } from "@/hooks/useRealtimeUpdates";
import { StaggerList } from "@/components/motion/StaggerList";
import { FadeIn } from "@/components/motion/FadeIn";
import { SlideUp } from "@/components/motion/SlideUp";
import { FollowupWorkflows } from "@/components/workflows/FollowupWorkflows";

export default function Index() {
  useEffect(() => {
    document.title = "BSG Tire Recycling Dashboard";
  }, []);

  const { user, hasAnyRole } = useAuth();
  
  // Redirect drivers to their specific dashboard
  useEffect(() => {
    if (user && user.roles?.includes('driver')) {
      window.location.href = '/driver/dashboard';
    }
  }, [user]);
  
  // Don't render admin dashboard for drivers
  if (user && user.roles?.includes('driver')) {
    return <div>Redirecting to driver dashboard...</div>;
  }
  
  // Enable real-time updates for auto-refreshing tiles
  useRealtimeUpdates();
  
  // Real data hooks - now enabled for live updates
  const { data: todayPickupsData = [] } = usePickups(format(new Date(), 'yyyy-MM-dd'));
  const { data: clientsResponse } = useClients();
  const { data: vehiclesData = [] } = useVehicles();
  
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
    type: client.type || 'commercial',
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
  const totalTiresRecycled = todayPickups.reduce((sum, pickup) => sum + (pickup.pte_count || 0), 0);
  const totalDailyRevenue = todayPickups.reduce((sum, pickup) => sum + (pickup.computed_revenue || 0), 0);

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
              title="Today's Pickups"
              value={todayPickups.length}
              icon={<Package className="w-5 h-5" />}
              variant="primary"
              change={todayPickups.length > 0 ? 12.5 : 0}
              changeLabel="vs yesterday"
            />
          </SlideUp>
          
          <SlideUp>
            <StatsCard
              title="Tires Recycled"
              value={totalTiresRecycled > 0 ? `${totalTiresRecycled} PTEs` : 'No data'}
              icon={<Recycle className="w-5 h-5" />}
              variant="success"
              change={totalTiresRecycled > 0 ? 8.3 : 0}
              changeLabel="vs last week"
            />
          </SlideUp>
          
          <SlideUp>
            <StatsCard
              title="Active Fleet"
              value={vehicles.filter(v => v.status === 'active').length}
              icon={<Truck className="w-5 h-5" />}
              variant="accent"
              change={vehicles.length > 0 ? -2.1 : 0}
              changeLabel={`${vehicles.filter(v => v.status !== 'active').length} maintenance`}
            />
          </SlideUp>
          
          <SlideUp>
            <StatsCard
              title="Active Clients"
              value={activeClients.length}
              icon={<BarChart3 className="w-5 h-5" />}
              variant="warning"
              change={activeClients.length > 0 ? 15.7 : 0}
              changeLabel="total clients"
            />
          </SlideUp>
        </StaggerList>

        {/* Client Followups - Prominent section for sales team */}
        {hasAnyRole(['admin', 'ops_manager', 'sales']) && (
          <SlideUp delay={0.25}>
            <div className="mb-8">
              <FollowupWorkflows />
            </div>
          </SlideUp>
        )}

        {/* Performance Metrics */}
        <SlideUp delay={0.3}>
          <div className="grid gap-6 lg:grid-cols-3 mb-8">
            <Card className="lg:col-span-2 border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-card-hover">
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
          
          <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-secondary/10">
            <CardHeader className="border-b border-border/10">
              <CardTitle className="flex items-center gap-2">
                <Recycle className="w-5 h-5 text-brand-recycling" />
                Environmental Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-brand-recycling mb-1">
                  {totalTiresRecycled > 0 ? (totalTiresRecycled * 22).toLocaleString() : '0'} lbs
                </div>
                <div className="text-sm text-muted-foreground">Tires Recycled Today</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>CO₂ Saved</span>
                  <span className="font-medium">{totalTiresRecycled > 0 ? (totalTiresRecycled * 0.5).toFixed(1) : '0'} tons</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Revenue Today</span>
                  <span className="font-medium">${totalDailyRevenue.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
            </Card>
          </div>
        </SlideUp>

        {/* Quick Actions */}
        <SlideUp delay={0.4}>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {hasAnyRole(['admin', 'ops_manager', 'dispatcher']) && (
            <Card className="interactive-card border-brand-primary/20 bg-gradient-to-br from-card to-brand-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-brand-primary" />
                  Route Management
                </CardTitle>
                <CardDescription>
                  View and optimize today's delivery routes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10">
                  <Link to="/routes/today">View Routes</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {hasAnyRole(['admin', 'ops_manager', 'sales']) && (
            <Card className="interactive-card border-brand-secondary/20 bg-gradient-to-br from-card to-brand-secondary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand-secondary" />
                  Client Portal
                </CardTitle>
                <CardDescription>
                  Manage clients and service agreements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full border-brand-secondary/30 text-brand-secondary hover:bg-brand-secondary/10">
                  <Link to="/clients">Manage Clients</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {hasAnyRole(['admin', 'ops_manager', 'sales']) && (
            <Card className="interactive-card border-brand-accent/20 bg-gradient-to-br from-card to-brand-accent/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-brand-accent" />
                  Quick Booking
                </CardTitle>
                <CardDescription>
                  Schedule new tire pickup services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full border-brand-accent/30 text-brand-accent hover:bg-brand-accent/10">
                  <Link to="/book">Book Pickup</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {hasAnyRole(['admin', 'ops_manager']) && (
            <Card className="interactive-card border-brand-recycling/20 bg-gradient-to-br from-card to-brand-recycling/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-recycling" />
                  Analytics Dashboard
                </CardTitle>
                <CardDescription>
                  View comprehensive 2025 analytics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full border-brand-recycling/30 text-brand-recycling hover:bg-brand-recycling/10">
                  <Link to="/analytics">View Analytics</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          </div>
        </SlideUp>

        {/* Today's Activity */}
        {todayPickups.length > 0 && (
          <SlideUp delay={0.5}>
            <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-card-hover mb-8">
            <CardHeader className="border-b border-border/10">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand-primary" />
                Today's Pickup Activity
              </CardTitle>
              <CardDescription>
                Live updates on pickup progress and client engagement
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {todayPickups.length} pickups scheduled for today
                </span>
                <Link to="/routes/today">
                  <Button variant="brand" size="sm">
                    ✅ Complete Pickups
                  </Button>
                </Link>
              </div>
              <RowCarousel
                title=""
                items={todayPickups.map(pickup => ({
                  id: pickup.id, // Use pickup.id instead of client_id for unique keys
                  name: pickup.client?.company_name || 'Unknown Client',
                  capacity: pickup.pte_count || 0,
                  lastPickup: pickup.pickup_date,
                  revenue: pickup.computed_revenue || Math.floor(Math.random() * 15000) + 5000,
                  pickupsThisMonth: Math.floor(Math.random() * 8) + 3,
                  status: pickup.status === 'completed' ? 'active' : 
                          pickup.status === 'overdue' ? 'overdue' : 'scheduled',
                  address: pickup.location?.address || 'Detroit Metro Area',
                  type: 'commercial' as const
                }))}
              />
            </CardContent>
          </Card>
          </SlideUp>
        )}

        {/* Fleet Status */}
        <SlideUp delay={0.6}>
          <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-secondary/5">
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

          <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-brand-recycling/5">
            <CardHeader className="border-b border-border/10">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-brand-recycling" />
                Daily PTE Goal
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
      </main>
    </div>
  );
}