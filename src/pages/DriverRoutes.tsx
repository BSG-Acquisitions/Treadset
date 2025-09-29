import { useEffect, useState } from "react";
import { useDriverAssignments } from "@/hooks/useDriverAssignments";
import { DriverAssignmentInterface } from "@/components/driver/DriverAssignmentInterface";
import { MovePickupDialog } from "@/components/MovePickupDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Building, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Package, Truck, MoreVertical, Move } from "lucide-react";
import { format } from "date-fns";

export default function DriverRoutes() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [movePickupOpen, setMovePickupOpen] = useState(false);
  const [selectedPickupToMove, setSelectedPickupToMove] = useState<any>(null);
  const { data: assignments = [], isLoading } = useDriverAssignments(selectedDate);
  
  // Debug logging
  console.log('DriverRoutes - assignments:', assignments);
  console.log('DriverRoutes - selectedAssignment:', selectedAssignment);

  useEffect(() => {
    document.title = "Driver Routes – BSG";
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in_progress': return Clock;
      case 'overdue': return AlertCircle;
      default: return Calendar;
    }
  };

  if (selectedAssignment) {
    const assignment = assignments.find(a => a.id === selectedAssignment);
    if (assignment) {
      return (
        <div className="min-h-screen bg-background">
          <main className="container py-8">
            <div className="mb-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedAssignment(null)}
                className="mb-4"
              >
                ← Back to Route List
              </Button>
            </div>
            <DriverAssignmentInterface 
              assignment={assignment} 
              onComplete={() => setSelectedAssignment(null)}
            />
          </main>
        </div>
      );
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-10">
          <p className="text-muted-foreground">Loading today's routes...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-8 w-8 text-brand-primary" />
              My Assignments
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')} • {assignments.length} stops scheduled
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No routes scheduled</h3>
              <p className="text-muted-foreground">
                {selectedDate === new Date().toISOString().split('T')[0] 
                  ? "No routes assigned to you for today"
                  : "No routes assigned to you for this date"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Today's Assigned Routes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {assignments.map((assignment, index) => {
                    const StatusIcon = getStatusIcon(assignment.status);
                    return (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/10 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-brand-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <StatusIcon className={`h-5 w-5 ${
                              assignment.status === 'completed' ? 'text-brand-success' :
                              assignment.status === 'in_progress' ? 'text-brand-warning' : 'text-muted-foreground'
                            }`} />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                              <div>
                                <h3 className="font-semibold text-foreground">
                                  {assignment.pickup?.client?.company_name || 'Unknown Client'}
                                </h3>
                                <div className="flex items-center gap-1 text-base font-medium text-foreground bg-background px-2 py-1 rounded border mt-1">
                                  <MapPin className="h-4 w-4 text-red-500" />
                                  <span className="truncate">
                                    {assignment.pickup?.location?.address || 'No address available'}
                                  </span>
                                </div>
                                {assignment.pickup?.location?.name && (
                                  <div className="text-sm text-muted-foreground">
                                    Location: {assignment.pickup.location.name}
                                  </div>
                                )}
                                {assignment.pickup?.notes && (
                                  <p className="text-sm text-muted-foreground italic">
                                    Notes: {assignment.pickup.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {assignment.pickup?.preferred_window || 'No time preference'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Vehicle: {assignment.vehicle?.name || 'TBD'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Expected: PTE {assignment.pickup?.pte_count || 0} | OTR {assignment.pickup?.otr_count || 0} | Tractor {assignment.pickup?.tractor_count || 0}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Est. Revenue: ${assignment.pickup?.computed_revenue?.toFixed(2) || '0.00'}
                            </div>
                            <Badge variant={getStatusColor(assignment.status)}>
                              {assignment.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <Button 
                              size="sm" 
                              disabled={assignment.status === 'completed'}
                              onClick={() => setSelectedAssignment(assignment.id)}
                              className="bg-brand-primary hover:bg-brand-primary/90"
                            >
                              {assignment.status === 'completed' ? '✅ Completed' : '📝 Start Pickup'}
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedPickupToMove(assignment.pickup);
                                    setMovePickupOpen(true);
                                  }}
                                >
                                  <Move className="h-4 w-4 mr-2" />
                                  Move to Different Date
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="bg-brand-primary/5 border-brand-primary/20">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-brand-primary">{assignments.length}</div>
                    <div className="text-sm text-muted-foreground">Total Stops</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-brand-success">
                      {assignments.filter(a => a.status === 'completed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-brand-warning">
                      {assignments.filter(a => a.status !== 'completed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Remaining</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      ${assignments.reduce((sum, a) => sum + (a.pickup?.computed_revenue || 0), 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {selectedPickupToMove && (
          <MovePickupDialog
            open={movePickupOpen}
            onOpenChange={(open) => {
              setMovePickupOpen(open);
              if (!open) {
                setSelectedPickupToMove(null);
              }
            }}
            pickup={selectedPickupToMove}
          />
        )}
      </main>
    </div>
  );
}