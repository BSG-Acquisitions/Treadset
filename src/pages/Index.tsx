import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, Users, TrendingUp, Package } from "lucide-react";
import { usePickups } from "@/hooks/usePickups";
import { useClients } from "@/hooks/useClients";
import { useVehicles } from "@/hooks/useVehicles";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { CapacityGauge } from "@/components/CapacityGauge";
import { RowCarousel } from "@/components/RowCarousel";
import { format } from "date-fns";
import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    document.title = "Dashboard – BSG";
  }, []);

  const { user, hasAnyRole } = useAuth();
  // Temporarily disable data fetching to fix loading issue
  const todayPickups: any[] = [];
  const clients: any[] = [];
  const vehicles: any[] = [];

  // Handle the clients data structure properly
  const activeClients = clients.filter((client: any) => client.is_active);
  const totalRevenue = clients.reduce((sum: number, client: any) => sum + (client.lifetime_revenue || 0), 0);
  const assignedPickups = todayPickups; // Keep as array for now
  const unassignedPickups: any[] = []; // Keep as array for now

  const stats = [
    {
      title: "Today's Pickups",
      value: todayPickups.length,
      description: `${assignedPickups.length} assigned, ${unassignedPickups.length} pending`,
      icon: Package,
      color: "text-blue-600"
    },
    {
      title: "Active Clients",
      value: activeClients.length,
      description: "Currently serviced",
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Fleet Vehicles",
      value: vehicles.length,
      description: "Available for routes",
      icon: MapPin,
      color: "text-purple-600"
    },
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toFixed(2)}`,
      description: "Lifetime client value",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  return (
    <main className="min-h-screen bg-background">
      <div className="container py-6 space-y-8">
        {/* Header with User Menu */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your logistics operations today.
            </p>
            {user?.currentOrganization && (
              <p className="text-sm text-muted-foreground mt-1">
                {user.currentOrganization.name} • Role: {user.roles.join(', ')}
              </p>
            )}
          </div>
          <UserMenu />
        </header>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hasAnyRole(['admin', 'ops_manager', 'dispatcher']) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Today's Routes
                </CardTitle>
                <CardDescription>
                  View and manage today's pickup assignments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to="/routes/today">View Routes</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {hasAnyRole(['admin', 'ops_manager', 'sales']) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Management
                </CardTitle>
                <CardDescription>
                  Manage clients and their locations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/clients">Manage Clients</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {hasAnyRole(['admin', 'ops_manager', 'sales']) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Quick Booking
                </CardTitle>
                <CardDescription>
                  Schedule a new pickup quickly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/book">Book Pickup</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Today's Capacity Overview */}
        {todayPickups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Capacity
              </CardTitle>
              <CardDescription>
                Vehicle utilization for today's routes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold">{assignedPickups.length}/{vehicles.length * 10}</div>
                <p className="text-sm text-muted-foreground">Capacity utilization</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {todayPickups.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Today's Pickups</CardTitle>
              <CardDescription>
                Recent pickup activity and status updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RowCarousel
                title="Today's Pickups"
                items={todayPickups.slice(0, 10).map(pickup => ({
                  id: pickup.id,
                  name: pickup.client?.company_name || 'Unknown Client',
                  capacity: pickup.pte_count || 0,
                  lastPickup: pickup.pickup_date
                }))}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}