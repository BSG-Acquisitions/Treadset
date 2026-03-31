import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { BrandHeader } from '@/components/BrandHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RouteOptimizationTips } from '@/components/driver/RouteOptimizationTips';
import { DriverOutboundAssignments } from '@/components/driver/DriverOutboundAssignments';
import { TodayEfficiencyCard } from '@/components/driver/TodayEfficiencyCard';
import { 
  Truck, 
  FileText, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Eye,
  Navigation,
  Package,
  ArrowUpRight,
  Container
} from 'lucide-react';
import { useManifests } from '@/hooks/useManifests';
import { useDriverAssignments } from '@/hooks/useDriverAssignments';
import { useDriverTrailerRoutes } from '@/hooks/useTrailerRoutes';
import { useAuth } from '@/contexts/AuthContext';
import { useHasOutboundHaulerCapability, useHasSemiHaulerCapability } from '@/hooks/useDriverCapabilities';
import { format } from 'date-fns';

export default function DriverDashboard() {
  const { user } = useAuth();
  const { hasOutboundHauler } = useHasOutboundHaulerCapability();
  const { hasSemiHauler } = useHasSemiHaulerCapability();
  
  const { data: manifests = [], isLoading: manifestsLoading } = useManifests(undefined, user?.id);
  
  // Get trailer routes for semi_hauler drivers
  const { data: trailerRoutes = [], isLoading: trailerRoutesLoading } = useDriverTrailerRoutes();

  // Get today's date for filtering
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Get driver-specific assignments for today
  const { data: assignments = [], isLoading: assignmentsLoading } = useDriverAssignments(todayStr);

  // Filter today's trailer routes
  const todayTrailerRoutes = trailerRoutes.filter(route => 
    route.scheduled_date === todayStr && (route.status === 'scheduled' || route.status === 'in_progress')
  );
  const completedTrailerRoutesToday = trailerRoutes.filter(route => 
    route.scheduled_date === todayStr && route.status === 'completed'
  );

  // Filter today's assignments by status
  const todayAssignments = assignments.filter(assignment => 
    assignment.status === 'assigned' || assignment.status === 'in_progress'
  );

  // Filter completed assignments for today
  const completedToday = assignments.filter(assignment => 
    assignment.status === 'completed'
  );

  // Combined counts for stats
  const totalTodayRoutes = todayAssignments.length + (hasSemiHauler ? todayTrailerRoutes.length : 0);
  const totalCompletedToday = completedToday.length + (hasSemiHauler ? completedTrailerRoutesToday.length : 0);

  // Recent manifests (last 5)
  const recentManifests = manifests
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  useEffect(() => {
    document.title = "Driver Dashboard – TreadSet";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <BrandHeader 
          title="Driver Dashboard"
          subtitle="Your complete driver workspace"
        />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Routes</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTodayRoutes}</div>
              <p className="text-xs text-muted-foreground">Scheduled pickups</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalCompletedToday}</div>
              <p className="text-xs text-muted-foreground">Finished today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Manifests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{manifests.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge variant={totalTodayRoutes > 0 ? "default" : "secondary"}>
                  {totalTodayRoutes > 0 ? "Active" : "Available"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Fast access to your most common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button asChild className="h-20 flex-col gap-2">
                <Link to="/routes/driver">
                  <Navigation className="h-6 w-6" />
                  <span>View Routes</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-20 flex-col gap-2">
                <Link to="/driver/manifest/new">
                  <FileText className="h-6 w-6" />
                  <span>New Manifest</span>
                </Link>
              </Button>
              
              {hasOutboundHauler && (
                <Button asChild variant="outline" className="h-20 flex-col gap-2 border-primary/50 bg-primary/5">
                  <Link to="/driver/outbound/new">
                    <ArrowUpRight className="h-6 w-6" />
                    <span>Outbound Manifest</span>
                  </Link>
                </Button>
              )}
              
              {hasSemiHauler && (
                <Button asChild variant="outline" className="h-20 flex-col gap-2 border-primary/50 bg-primary/5">
                  <Link to="/driver/trailer-assignments">
                    <Container className="h-6 w-6" />
                    <span>Trailer Assignments</span>
                  </Link>
                </Button>
              )}
              
              <Button asChild variant="outline" className="h-20 flex-col gap-2">
                <Link to="/driver/manifests">
                  <Eye className="h-6 w-6" />
                  <span>My Manifests</span>
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-20 flex-col gap-2">
                <Link to="/routes/driver">
                  <Package className="h-6 w-6" />
                  <span>Assignments</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Route Optimization Tips */}
        <RouteOptimizationTips />

        {/* Outbound Assignments for drivers with capability */}
        {hasOutboundHauler && (
          <DriverOutboundAssignments date={todayStr} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Assignments
              </CardTitle>
              <CardDescription>
                {totalTodayRoutes} routes scheduled for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(assignmentsLoading || trailerRoutesLoading) ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-muted h-16 rounded" />
                  ))}
                </div>
              ) : (totalTodayRoutes === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No assignments for today</p>
                  <p className="text-sm">Check back later or contact dispatch</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Trailer Routes for semi_hauler drivers */}
                  {hasSemiHauler && todayTrailerRoutes.map((route) => (
                    <div key={route.id} className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Container className="h-4 w-4 text-primary" />
                          <h4 className="font-medium truncate">
                            {route.route_name}
                          </h4>
                          <Badge variant={route.status === 'scheduled' ? 'secondary' : 'default'} className="text-xs">
                            {route.status}
                          </Badge>
                        </div>
                        {route.trailer && (
                          <p className="text-xs font-medium text-primary mt-1">
                            🚛 Trailer #{route.trailer.trailer_number}
                            {route.trailer.current_location && ` • ${route.trailer.current_location}`}
                          </p>
                        )}
                        {route.stops && route.stops.length > 0 && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {route.stops.length} stop{route.stops.length !== 1 ? 's' : ''}: {route.stops.map(s => s.location_name).filter(Boolean).join(', ')}
                          </p>
                        )}
                        {route.vehicle && (
                          <p className="text-xs text-muted-foreground">
                            Vehicle: {route.vehicle.vehicle_number}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to="/driver/trailer-assignments">
                          View Details
                        </Link>
                      </Button>
                    </div>
                  ))}

                  {/* Regular pickup assignments */}
                  {todayAssignments.slice(0, 5).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">
                            {assignment.pickup?.client?.company_name || 'Unknown Client'}
                          </h4>
                          <Badge 
                            variant={assignment.status === 'assigned' ? 'secondary' : 'default'}
                            className="text-xs"
                          >
                            {assignment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {assignment.pickup?.location?.address || 
                           assignment.pickup?.client?.physical_address || 
                           assignment.pickup?.client?.mailing_address ||
                           (assignment.pickup?.client?.city && assignment.pickup?.client?.state 
                             ? `${assignment.pickup.client.city}, ${assignment.pickup.client.state}` 
                             : 'No address')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {assignment.pickup?.preferred_window || 'Time TBD'} • {assignment.vehicle?.name}
                        </p>
                        {assignment.trailer && (
                          <p className="text-xs font-medium text-primary">
                            🚛 Hook to Trailer #{assignment.trailer.trailer_number}
                            {assignment.trailer.current_location && ` • ${assignment.trailer.current_location}`}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/driver/assignment/${assignment.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {todayAssignments.length > 5 && (
                     <div className="text-center pt-3">
                      <Button variant="ghost" asChild>
                        <Link to="/routes/driver">
                          View all {todayAssignments.length} assignments
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Manifests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Manifests
              </CardTitle>
              <CardDescription>
                Your latest manifest activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {manifestsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-muted h-16 rounded" />
                  ))}
                </div>
              ) : recentManifests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No manifests yet</p>
                  <p className="text-sm">Create your first manifest to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentManifests.map((manifest) => (
                    <div key={manifest.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">
                            {manifest.manifest_number}
                          </h4>
                          <Badge 
                            variant={manifest.status === 'COMPLETED' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {manifest.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {manifest.client?.company_name || 'Unknown Client'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(manifest.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/driver/manifest/${manifest.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  ))}
                  <div className="text-center pt-3">
                    <Button variant="ghost" asChild>
                      <Link to="/driver/manifests">
                        View all manifests
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation Footer */}
        <Card>
          <CardHeader>
            <CardTitle>Driver Resources</CardTitle>
            <CardDescription>
              Quick access to all driver-related features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="ghost" asChild className="justify-start">
                <Link to="/routes/driver">
                  <Navigation className="h-4 w-4 mr-2" />
                  Today's Routes
                </Link>
              </Button>
              <Button variant="ghost" asChild className="justify-start">
                <Link to="/routes/driver">
                  <Truck className="h-4 w-4 mr-2" />
                  My Assignments
                </Link>
              </Button>
              <Button variant="ghost" asChild className="justify-start">
                <Link to="/driver/manifests">
                  <FileText className="h-4 w-4 mr-2" />
                  All Manifests
                </Link>
              </Button>
              <Button variant="ghost" asChild className="justify-start">
                <Link to="/settings">
                  <Clock className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}