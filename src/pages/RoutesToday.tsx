import { useEffect } from "react";
import { useAssignments } from "@/hooks/usePickups";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CapacityGauge } from "@/components/CapacityGauge";
import { Truck, MapPin, Clock, Package } from "lucide-react";

export default function RoutesToday() {
  useEffect(() => {
    document.title = "Today's Routes – BSG";
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const { data: assignments = [], isLoading } = useAssignments(today);

  // Group assignments by vehicle
  const vehicleRoutes = assignments.reduce((acc, assignment) => {
    const vehicleId = assignment.vehicle_id;
    if (!acc[vehicleId]) {
      acc[vehicleId] = {
        vehicle: assignment.vehicle,
        assignments: []
      };
    }
    acc[vehicleId].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { vehicle: any; assignments: any[] }>);

  // Sort assignments within each vehicle by ETA
  Object.values(vehicleRoutes).forEach(route => {
    route.assignments.sort((a, b) => 
      new Date(a.estimated_arrival || 0).getTime() - new Date(b.estimated_arrival || 0).getTime()
    );
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <header className="container py-6">
          <h1 className="text-2xl font-semibold text-foreground">Today's Routes</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </header>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="container py-6">
        <h1 className="text-2xl font-semibold text-foreground">Today's Routes</h1>
        <p className="text-sm text-muted-foreground">
          {Object.keys(vehicleRoutes).length} vehicles with {assignments.length} scheduled pickups
        </p>
      </header>

      <div className="container pb-12 space-y-6">
        {Object.keys(vehicleRoutes).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No routes scheduled for today.</p>
            </CardContent>
          </Card>
        ) : (
          Object.values(vehicleRoutes).map(({ vehicle, assignments }) => {
            const totalPTE = assignments.reduce((sum, a) => sum + (a.pickup?.pte_count || 0), 0);
            const capacityPercentage = vehicle ? Math.round((totalPTE / vehicle.capacity) * 100) : 0;

            return (
              <Card key={vehicle?.id || 'unknown'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      {vehicle?.name || 'Unknown Vehicle'}
                    </CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{totalPTE} / {vehicle?.capacity || 0} PTE</div>
                        <div className="text-xs text-muted-foreground">Capacity Used</div>
                      </div>
                      <CapacityGauge value={capacityPercentage} size={60} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {assignments.map((assignment, index) => (
                      <div key={assignment.id} className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {assignment.pickup?.client?.company_name || 'Unknown Client'}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {assignment.status}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {assignment.pickup?.location?.name || assignment.pickup?.location?.address || 'Location TBD'}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {assignment.estimated_arrival 
                                ? new Date(assignment.estimated_arrival).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })
                                : 'Time TBD'
                              }
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {assignment.pickup?.pte_count || 0} PTE
                              {assignment.pickup?.otr_count ? `, ${assignment.pickup.otr_count} OTR` : ''}
                              {assignment.pickup?.tractor_count ? `, ${assignment.pickup.tractor_count} Tractor` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </main>
  );
}