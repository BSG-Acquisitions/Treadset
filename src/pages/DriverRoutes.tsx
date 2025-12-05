import { useEffect, useState } from "react";
import { useDriverAssignments } from "@/hooks/useDriverAssignments";
import { DriverAssignmentInterface } from "@/components/driver/DriverAssignmentInterface";
import { MovePickupDialog } from "@/components/MovePickupDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Building, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Package, Truck, MoreVertical, Move, Phone } from "lucide-react";
import { format } from "date-fns";

export default function DriverRoutes() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [movePickupOpen, setMovePickupOpen] = useState(false);
  const [selectedPickupToMove, setSelectedPickupToMove] = useState<any>(null);
  const { data: assignments = [], isLoading } = useDriverAssignments(selectedDate);

  useEffect(() => {
    document.title = "Driver Routes – TreadSet";
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
      
      <main className="container max-w-4xl mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
              My Assignments
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')} • {assignments.length} stops scheduled
            </p>
          </div>
          <div className="flex items-center gap-2 bg-card p-2 rounded-lg border">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
          </div>
        </div>

        {assignments.length === 0 ? (
          <Card className="mx-auto max-w-md">
            <CardContent className="p-8 text-center">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No routes scheduled</h3>
              <p className="text-muted-foreground text-sm">
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
                  {assignments
                    .sort((a, b) => {
                      // Sort: non-completed first, completed last
                      if (a.status === 'completed' && b.status !== 'completed') return 1;
                      if (a.status !== 'completed' && b.status === 'completed') return -1;
                      return 0;
                    })
                    .map((assignment, index) => {
                    const StatusIcon = getStatusIcon(assignment.status);
                    return (
                      <div
                        key={assignment.id}
                        className="p-4 md:p-6 border rounded-xl hover:bg-secondary/5 transition-colors bg-card shadow-sm"
                      >
                        {/* Header with stop number and status */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-brand-primary text-white rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-lg md:text-xl font-bold">
                              {index + 1}
                            </div>
                            <Badge variant={getStatusColor(assignment.status)} className="text-sm md:text-base px-3 py-1">
                              {assignment.status === 'completed' ? 'Complete' : 
                               assignment.status === 'in_progress' ? 'In Progress' : 'Assigned'}
                            </Badge>
                          </div>
                          <StatusIcon className={`h-6 w-6 md:h-7 md:w-7 ${
                            assignment.status === 'completed' ? 'text-green-600' :
                            assignment.status === 'in_progress' ? 'text-orange-500' : 'text-blue-500'
                          }`} />
                        </div>

                        {/* Shop Name */}
                        <div className="mb-3">
                          <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                            {assignment.pickup?.client?.company_name || 'Unknown Shop'}
                          </h2>
                        </div>

                        {/* Address */}
                        <div className="mb-4 p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0 mt-1" />
                            <div>
                              <div className="text-sm md:text-base font-medium text-blue-800 mb-1">Client Address:</div>
                              <div className="text-base md:text-lg font-semibold text-blue-900 leading-relaxed">
                                {[
                                  assignment.pickup?.client?.mailing_address,
                                  [assignment.pickup?.client?.city, assignment.pickup?.client?.state].filter(Boolean).join(', '),
                                  assignment.pickup?.client?.zip,
                                ].filter(Boolean).join(' ').replace(/\s+,/g, ',') || assignment.pickup?.location?.address || 'No address available'}
                              </div>
                               {assignment.pickup?.location?.name && (
                                 <div className="text-sm text-blue-700 mt-1">
                                   Location Reference: {assignment.pickup.location.name}
                                 </div>
                               )}
                            </div>
                          </div>
                        </div>

                        {/* Phone Number */}
                        {assignment.pickup?.client?.phone && (
                          <div className="mb-4 p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-3">
                              <Phone className="h-5 w-5 md:h-6 md:w-6 text-green-600 flex-shrink-0" />
                              <div>
                                <div className="text-sm md:text-base font-medium text-green-800 mb-1">Phone:</div>
                                <a 
                                  href={`tel:${assignment.pickup.client.phone}`}
                                  className="text-base md:text-lg font-semibold text-green-900 hover:underline"
                                >
                                  {assignment.pickup.client.phone}
                                </a>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Vehicle Info */}
                        <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Truck className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
                          <div>
                            <div className="text-sm md:text-base font-medium text-gray-700">Vehicle:</div>
                            <div className="text-base md:text-lg font-semibold text-gray-900">
                              {assignment.vehicle?.name || 'Vehicle TBD'}
                            </div>
                          </div>
                        </div>

                        {/* Tire Counts - Simplified */}
                        <div className="mb-4 grid grid-cols-3 gap-2 md:gap-3">
                          <div className="text-center p-2 md:p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="text-lg md:text-xl font-bold text-green-700">{assignment.pickup?.pte_count || 0}</div>
                            <div className="text-xs md:text-sm text-green-600">PTE</div>
                          </div>
                          <div className="text-center p-2 md:p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <div className="text-lg md:text-xl font-bold text-orange-700">{assignment.pickup?.otr_count || 0}</div>
                            <div className="text-xs md:text-sm text-orange-600">OTR</div>
                          </div>
                          <div className="text-center p-2 md:p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="text-lg md:text-xl font-bold text-purple-700">{assignment.pickup?.tractor_count || 0}</div>
                            <div className="text-xs md:text-sm text-purple-600">Tractor</div>
                          </div>
                        </div>

                        {/* Notes if present */}
                        {assignment.pickup?.notes && (
                          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="text-sm md:text-base font-medium text-yellow-800 mb-1">Special Notes:</div>
                            <div className="text-sm md:text-base text-yellow-700">{assignment.pickup.notes}</div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button 
                            size="lg" 
                            disabled={assignment.status === 'completed'}
                            onClick={() => setSelectedAssignment(assignment.id)}
                            className="bg-brand-primary hover:bg-brand-primary/90 text-white flex-1 h-12 md:h-14 text-base md:text-lg font-semibold"
                          >
                            {assignment.status === 'completed' ? '✅ Completed' : '📍 Start Stop'}
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="lg" className="px-4 h-12 md:h-14">
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border shadow-lg z-50">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedPickupToMove(assignment.pickup);
                                  setMovePickupOpen(true);
                                }}
                                className="hover:bg-accent"
                              >
                                <Move className="h-4 w-4 mr-2" />
                                Move to Different Date
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="bg-brand-primary/5 border-brand-primary/20">
              <CardContent className="p-4 md:p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-brand-primary">{assignments.length}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Total Stops</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-brand-success">
                      {assignments.filter(a => a.status === 'completed').length}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-brand-warning">
                      {assignments.filter(a => a.status !== 'completed').length}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">Remaining</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-foreground">
                      ${assignments.reduce((sum, a) => sum + (a.pickup?.computed_revenue || 0), 0).toFixed(2)}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">Total Value</div>
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