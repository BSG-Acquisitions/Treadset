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
import { BrandHeader } from "@/components/BrandHeader";
import { StatsCard } from "@/components/enhanced/StatsCard";
import { format } from "date-fns";
import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    document.title = "BSG Tire Recycling Dashboard";
  }, []);

  const { user, hasAnyRole } = useAuth();
  
  // Demo data for enhanced dashboard
  const todayPickups = [
    { id: '1', client: { company_name: 'AutoZone Detroit' }, pte_count: 85, pickup_date: '2024-01-15', status: 'scheduled' },
    { id: '2', client: { company_name: 'Michigan Tire Center' }, pte_count: 92, pickup_date: '2024-01-15', status: 'in_progress' },
    { id: '3', client: { company_name: 'Fleet Services LLC' }, pte_count: 76, pickup_date: '2024-01-15', status: 'completed' },
    { id: '4', client: { company_name: 'Firestone Complete' }, pte_count: 88, pickup_date: '2024-01-15', status: 'scheduled' },
    { id: '5', client: { company_name: 'Belle Tire' }, pte_count: 94, pickup_date: '2024-01-15', status: 'overdue' }
  ];
  
  const clients = [
    { id: '1', company_name: 'AutoZone Detroit', is_active: true, lifetime_revenue: 125000, type: 'commercial' },
    { id: '2', company_name: 'Michigan Tire Center', is_active: true, lifetime_revenue: 89000, type: 'commercial' },
    { id: '3', company_name: 'Fleet Services LLC', is_active: true, lifetime_revenue: 156000, type: 'commercial' },
    { id: '4', company_name: 'Firestone Complete', is_active: true, lifetime_revenue: 203000, type: 'commercial' },
    { id: '5', company_name: 'Belle Tire', is_active: true, lifetime_revenue: 178000, type: 'commercial' }
  ];
  
  const vehicles = [
    { id: '1', name: 'Truck 1', status: 'active' },
    { id: '2', name: 'Truck 2', status: 'active' },
    { id: '3', name: 'Truck 3', status: 'maintenance' },
    { id: '4', name: 'Truck 4', status: 'active' }
  ];

  // Enhanced statistics with BSG metrics
  const activeClients = clients.filter((client: any) => client.is_active);
  const totalRevenue = clients.reduce((sum: number, client: any) => sum + (client.lifetime_revenue || 0), 0);
  const assignedPickups = todayPickups.filter(p => p.status !== 'pending');
  const completedPickups = todayPickups.filter(p => p.status === 'completed');
  const overduePickups = todayPickups.filter(p => p.status === 'overdue');
  const totalTiresRecycled = todayPickups.reduce((sum, pickup) => sum + (pickup.pte_count || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced BSG Header */}
      <BrandHeader 
        title="Operations Dashboard" 
        subtitle="Real-time tire recycling logistics and fleet management"
        className="mb-8"
      />
      
      <main className="container mx-auto px-6 pb-8">
        {/* Welcome Section */}
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

        {/* Enhanced Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Today's Pickups"
            value={todayPickups.length}
            icon={<Package className="w-5 h-5" />}
            variant="primary"
            change={12.5}
            changeLabel="vs yesterday"
          />
          
          <StatsCard
            title="Tires Recycled"
            value={`${totalTiresRecycled} PTEs`}
            icon={<Recycle className="w-5 h-5" />}
            variant="success"
            change={8.3}
            changeLabel="vs last week"
          />
          
          <StatsCard
            title="Active Fleet"
            value={vehicles.filter(v => v.status === 'active').length}
            icon={<Truck className="w-5 h-5" />}
            variant="accent"
            change={-2.1}
            changeLabel="1 in maintenance"
          />
          
          <StatsCard
            title="Revenue YTD"
            value={`$${(totalRevenue / 1000).toFixed(0)}K`}
            icon={<BarChart3 className="w-5 h-5" />}
            variant="warning"
            change={15.7}
            changeLabel="vs last year"
          />
        </div>

        {/* Performance Metrics */}
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
                  {(totalTiresRecycled * 22).toLocaleString()} lbs
                </div>
                <div className="text-sm text-muted-foreground">Tires Recycled Today</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>CO₂ Saved</span>
                  <span className="font-medium">{(totalTiresRecycled * 0.5).toFixed(1)} tons</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Fuel Equivalent</span>
                  <span className="font-medium">{(totalTiresRecycled * 2.5).toFixed(0)} gallons</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
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
        </div>

        {/* Today's Activity */}
        {todayPickups.length > 0 && (
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
              <RowCarousel
                title=""
                items={todayPickups.map(pickup => ({
                  id: pickup.id,
                  name: pickup.client?.company_name || 'Unknown Client',
                  capacity: pickup.pte_count || 0,
                  lastPickup: pickup.pickup_date,
                  revenue: Math.floor(Math.random() * 15000) + 5000,
                  pickupsThisMonth: Math.floor(Math.random() * 8) + 3,
                  status: pickup.status === 'completed' ? 'active' : 
                          pickup.status === 'overdue' ? 'overdue' : 'scheduled'
                }))}
              />
            </CardContent>
          </Card>
        )}

        {/* Fleet Status */}
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
                Weekly Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tire Collection</span>
                    <span className="font-medium">847 / 1000 PTEs</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-brand-recycling h-2 rounded-full" style={{width: '84.7%'}}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Revenue Target</span>
                    <span className="font-medium">$73K / $85K</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className="bg-brand-primary h-2 rounded-full" style={{width: '85.9%'}}></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}