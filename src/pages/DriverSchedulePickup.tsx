import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Truck } from "lucide-react";
import { BrandHeader } from "@/components/BrandHeader";
import { DriverSchedulePickupDialog } from "@/components/driver/DriverSchedulePickupDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDriverAssignments } from "@/hooks/useDriverAssignments";
import { format } from "date-fns";

export default function DriverSchedulePickup() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayAssignments = [] } = useDriverAssignments(today);

  useEffect(() => {
    document.title = "Add Pickup – Driver Dashboard";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="container mx-auto px-4 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" asChild>
            <Link to="/routes/driver">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Routes
            </Link>
          </Button>
          <BrandHeader 
            title="Add Pickup"
            subtitle="Schedule pickup for existing client"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Main Add Pickup Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-brand-primary" />
                  Schedule New Pickup
                </CardTitle>
                <CardDescription>
                  Add a pickup for an existing client to today's route
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center">
                    <Truck className="h-8 w-8 text-brand-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Quick Pickup Scheduling</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Search for an existing client and add them to your pickup schedule. 
                      The system will automatically assign the pickup to an available route.
                    </p>
                  </div>
                  
                  <DriverSchedulePickupDialog
                    trigger={
                      <Button size="lg" className="px-8 py-3">
                        <Plus className="h-5 w-5 mr-2" />
                        Add Pickup for Existing Client
                      </Button>
                    }
                  />
                </div>
                
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Search and select an existing client from the dropdown</li>
                    <li>Choose the pickup location and date</li>
                    <li>Enter estimated tire counts and any special notes</li>
                    <li>The pickup will be automatically assigned to an available route</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Schedule Sidebar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today's Schedule</CardTitle>
                <CardDescription>
                  {todayAssignments.length} pickup{todayAssignments.length !== 1 ? 's' : ''} scheduled
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayAssignments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Truck className="h-8 w-8 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No pickups scheduled for today</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayAssignments.slice(0, 5).map((assignment) => (
                      <div 
                        key={assignment.id} 
                        className="p-3 bg-muted/30 rounded-lg border"
                      >
                        <div className="font-medium text-sm">
                          {assignment.pickup?.client?.company_name || 'Unknown Client'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {assignment.pickup?.preferred_window || 'Time TBD'} • 
                          {assignment.vehicle?.name || 'No vehicle'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Status: {assignment.status}
                        </div>
                      </div>
                    ))}
                    {todayAssignments.length > 5 && (
                      <div className="text-center pt-2">
                        <Button variant="ghost" size="sm" asChild>
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
            
            {/* Quick Actions */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/routes/driver">
                    <Truck className="h-4 w-4 mr-2" />
                    View All Routes
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/driver/dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Driver Dashboard
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}