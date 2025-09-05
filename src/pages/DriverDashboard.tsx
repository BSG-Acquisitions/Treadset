import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TopNav } from '@/components/TopNav';
import { BrandHeader } from '@/components/BrandHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Package
} from 'lucide-react';
import { useManifests } from '@/hooks/useManifests';
import { usePickups } from '@/hooks/usePickups';
import { format } from 'date-fns';

export default function DriverDashboard() {
  // For now, assume current user is a driver (in real app, get from auth context)
  const driverId = "current-driver-id";
  
  const { data: manifests = [], isLoading: manifestsLoading } = useManifests(undefined, driverId);
  const { data: pickups = [], isLoading: pickupsLoading } = usePickups();

  // Get today's date for filtering
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Filter today's assignments
  const todayAssignments = pickups.filter(pickup => 
    pickup.pickup_date === todayStr && 
    (pickup.status === 'scheduled' || pickup.status === 'in_progress')
  );

  // Filter completed assignments for today
  const completedToday = pickups.filter(pickup => 
    pickup.pickup_date === todayStr && pickup.status === 'completed'
  );

  // Recent manifests (last 5)
  const recentManifests = manifests
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  useEffect(() => {
    document.title = "Driver Dashboard – BSG";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <TopNav />
      
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
              <div className="text-2xl font-bold">{todayAssignments.length}</div>
              <p className="text-xs text-muted-foreground">Scheduled pickups</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completedToday.length}</div>
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
                <Badge variant={todayAssignments.length > 0 ? "default" : "secondary"}>
                  {todayAssignments.length > 0 ? "Active" : "Available"}
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
                <Link to="/routes/today">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Assignments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Assignments
              </CardTitle>
              <CardDescription>
                {todayAssignments.length} pickups scheduled for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pickupsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-muted h-16 rounded" />
                  ))}
                </div>
              ) : todayAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No assignments for today</p>
                  <p className="text-sm">Check back later or contact dispatch</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayAssignments.slice(0, 5).map((pickup) => (
                    <div key={pickup.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">
                            {pickup.client?.company_name || 'Unknown Client'}
                          </h4>
                          <Badge 
                            variant={pickup.status === 'scheduled' ? 'secondary' : 'default'}
                            className="text-xs"
                          >
                            {pickup.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {pickup.location?.address || 'No address'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pickup.preferred_window || 'Time TBD'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/driver/manifest/new?pickup=${pickup.id}&client=${pickup.client_id}&location=${pickup.location_id}`}>
                            Create Manifest
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  {todayAssignments.length > 5 && (
                    <div className="text-center pt-3">
                      <Button variant="ghost" asChild>
                        <Link to="/routes/today">
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
                <Link to="/routes/today">
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