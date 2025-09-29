import { useEffect, useState } from "react";
import { usePickups } from "@/hooks/usePickups";
import { CompletePickupDialog } from "@/components/CompletePickupDialog";
import { MovePickupDialog } from "@/components/MovePickupDialog";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Building, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Package, MoreVertical, Move, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from "date-fns";

export default function RoutesToday() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [movePickupOpen, setMovePickupOpen] = useState(false);
  const [selectedPickupToMove, setSelectedPickupToMove] = useState<any>(null);
  
  // Get 7 days starting from current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  
  // Fetch pickups for all days in the week
  const weekPickups = weekDays.map(day => {
    // Use local date string to avoid timezone issues
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(day.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dayOfMonth}`;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: pickups = [], isLoading } = usePickups(dateStr);
    return { date: dateStr, pickups, isLoading, day };
  });

  useEffect(() => {
    document.title = "Route Planning – BSG";
  }, []);

  const goToPreviousWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(startOfWeek(today, { weekStartsOn: 0 }));
  };

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

  const isAnyDayLoading = weekPickups.some(d => d.isLoading);

  if (isAnyDayLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-10">
          <p className="text-muted-foreground">Loading route data...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container py-4 sm:py-8 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Route Planning</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Plan and manage pickups across multiple days
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek} className="px-2 sm:px-3">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday} className="px-2 sm:px-3 text-xs sm:text-sm">
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek} className="px-2 sm:px-3">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Full Week View */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Week of {format(currentWeek, 'MMM d, yyyy')}
            </h2>
            <div className="text-sm text-muted-foreground">
              Total pickups: {weekPickups.reduce((sum, day) => sum + day.pickups.length, 0)}
            </div>
          </div>

          {/* Weekly Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {weekDays.map((day, idx) => {
              const year = day.getFullYear();
              const month = String(day.getMonth() + 1).padStart(2, '0');
              const dayOfMonth = String(day.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${dayOfMonth}`;
              const dayData = weekPickups[idx];
              
              // Check if today
              const today = new Date();
              const todayYear = today.getFullYear();
              const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
              const todayDay = String(today.getDate()).padStart(2, '0');
              const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;
              const isToday = dateStr === todayStr;

              return (
                <Card key={dateStr} className={`flex flex-col ${isToday ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader className="pb-3 text-center border-b">
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-2xl font-bold ${isToday ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(day, 'MMM yyyy')}
                      </div>
                      <Badge variant="secondary" className="mt-2">
                        {dayData?.pickups.length || 0} pickups
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-1 p-0">
                    <ScrollArea className="h-[600px]">
                      <div className="p-3 space-y-2">
                        {!dayData?.pickups.length ? (
                          <div className="text-center py-8">
                            <Calendar className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No pickups</p>
                          </div>
                        ) : (
                          dayData.pickups.map((pickup) => {
                            const StatusIcon = getStatusIcon(pickup.status);
                            return (
                              <div
                                key={pickup.id}
                                className="p-3 border rounded-lg hover:bg-secondary/10 transition-colors space-y-2 bg-card"
                              >
                                {/* Client Name */}
                                <div className="flex items-start gap-2">
                                  <Building className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <span className="font-semibold text-sm leading-tight">
                                    {pickup.client?.company_name || 'Unknown Client'}
                                  </span>
                                </div>

                                {/* Location */}
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <span className="text-xs text-muted-foreground leading-tight">
                                    {pickup.location?.name || pickup.location?.address || 'No address'}
                                  </span>
                                </div>

                                {/* Counts */}
                                <div className="text-xs font-medium space-y-0.5">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">PTE:</span>
                                    <span>{pickup.pte_count}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">OTR:</span>
                                    <span>{pickup.otr_count}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tractor:</span>
                                    <span>{pickup.tractor_count}</span>
                                  </div>
                                  <div className="flex justify-between pt-1 border-t">
                                    <span className="text-muted-foreground">Revenue:</span>
                                    <span className="font-semibold">${pickup.computed_revenue?.toFixed(2) || '0.00'}</span>
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <div className="flex items-center gap-2">
                                  <StatusIcon className={`h-3 w-3 flex-shrink-0 ${
                                    pickup.status === 'completed' ? 'text-brand-success' :
                                    pickup.status === 'overdue' ? 'text-destructive' :
                                    'text-muted-foreground'
                                  }`} />
                                  <Badge variant={getStatusColor(pickup.status)} className="text-xs flex-1 justify-center">
                                    {pickup.status.replace('_', ' ')}
                                  </Badge>
                                </div>

                                {/* Notes */}
                                {pickup.notes && (
                                  <p className="text-xs text-muted-foreground italic pt-1 border-t">
                                    {pickup.notes}
                                  </p>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                  <CompletePickupDialog
                                    pickup={pickup}
                                    trigger={
                                      <Button 
                                        size="sm" 
                                        disabled={pickup.status === 'completed'} 
                                        className="flex-1 text-xs h-8"
                                      >
                                        {pickup.status === 'completed' ? 'Completed' : 'Complete'}
                                      </Button>
                                    }
                                  />
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="px-2 h-8">
                                        <MoreVertical className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem 
                                        onClick={() => {
                                          setSelectedPickupToMove(pickup);
                                          setMovePickupOpen(true);
                                        }}
                                      >
                                        <Move className="h-4 w-4 mr-2" />
                                        Move to Different Date
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>

                                {/* Manifest PDF */}
                                {pickup.status === 'completed' && pickup.manifest_pdf_path && (
                                  <div className="pt-2 border-t">
                                    <ManifestPDFControls 
                                      manifestId={pickup.manifest_id}
                                      acroformPdfPath={pickup.manifest_pdf_path}
                                      clientEmails={[]}
                                      className="w-full"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        
        {selectedPickupToMove && (
          <MovePickupDialog
            open={movePickupOpen}
            onOpenChange={setMovePickupOpen}
            pickup={selectedPickupToMove}
          />
        )}
      </main>
    </div>
  );
}