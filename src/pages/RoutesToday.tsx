import { useEffect, useState } from "react";
import { usePickups } from "@/hooks/usePickups";
import { CompletePickupDialog } from "@/components/CompletePickupDialog";
import { MovePickupDialog } from "@/components/MovePickupDialog";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TopNav } from "@/components/TopNav";
import { Building, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Package, MoreVertical, Move, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from "date-fns";

export default function RoutesToday() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [activeDay, setActiveDay] = useState(new Date().toISOString().split('T')[0]);
  const [movePickupOpen, setMovePickupOpen] = useState(false);
  const [selectedPickupToMove, setSelectedPickupToMove] = useState<any>(null);
  
  // Get 7 days starting from current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  
  // Fetch pickups for all days in the week
  const weekPickups = weekDays.map(day => {
    const dateStr = day.toISOString().split('T')[0];
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data: pickups = [], isLoading } = usePickups(dateStr);
    return { date: dateStr, pickups, isLoading, day };
  });
  
  const activeDayData = weekPickups.find(d => d.date === activeDay);
  const { data: pickups = [], isLoading } = usePickups(activeDay);

  useEffect(() => {
    document.title = "Route Planning – BSG";
  }, []);

  const goToPreviousWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(startOfWeek(today));
    setActiveDay(today.toISOString().split('T')[0]);
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
        <TopNav />
        <main className="container py-10">
          <p className="text-muted-foreground">Loading route data...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Route Planning</h1>
            <p className="text-muted-foreground">
              Plan and manage pickups across multiple days
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Week of {format(currentWeek, 'MMMM d, yyyy')}
            </h2>
            <div className="text-sm text-muted-foreground">
              Total pickups this week: {weekPickups.reduce((sum, day) => sum + day.pickups.length, 0)}
            </div>
          </div>
          
          <Tabs value={activeDay} onValueChange={setActiveDay}>
            <TabsList className="grid w-full grid-cols-7">
              {weekDays.map((day) => {
                const dateStr = day.toISOString().split('T')[0];
                const dayData = weekPickups.find(d => d.date === dateStr);
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                
                return (
                  <TabsTrigger 
                    key={dateStr} 
                    value={dateStr}
                    className="flex flex-col items-center p-3"
                  >
                    <div className="text-xs font-medium">
                      {format(day, 'EEE')}
                    </div>
                    <div className={`text-sm ${isToday ? 'font-bold' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    {dayData && dayData.pickups.length > 0 && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {dayData.pickups.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            {weekDays.map((day) => {
              const dateStr = day.toISOString().split('T')[0];
              const dayData = weekPickups.find(d => d.date === dateStr);
              
              return (
                <TabsContent key={dateStr} value={dateStr} className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">
                        {format(day, 'EEEE, MMMM d, yyyy')}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        {dayData?.pickups.length || 0} pickups scheduled
                      </div>
                    </div>

                    {!dayData?.pickups.length ? (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                          <h4 className="font-medium mb-1">No pickups scheduled</h4>
                          <p className="text-sm text-muted-foreground">
                            No pickups scheduled for this date
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Scheduled Pickups
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {dayData.pickups.map((pickup) => {
                              const StatusIcon = getStatusIcon(pickup.status);
                              return (
                                <div
                                  key={pickup.id}
                                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/10 transition-colors"
                                >
                                  <div className="flex items-center gap-4">
                                    <StatusIcon className={`h-5 w-5 ${
                                      pickup.status === 'completed' ? 'text-brand-success' :
                                      pickup.status === 'overdue' ? 'text-destructive' :
                                      'text-muted-foreground'
                                    }`} />
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium text-lg">
                                          {pickup.client?.company_name || 'Unknown Client'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span>{pickup.location?.name || pickup.location?.address || 'No address'}</span>
                                      </div>
                                      {pickup.notes && (
                                        <p className="text-sm text-muted-foreground italic">
                                          Notes: {pickup.notes}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
                                    <div className="text-right">
                                      <div className="text-sm font-medium mb-1">
                                        PTE {pickup.pte_count} | OTR {pickup.otr_count} | Tractor {pickup.tractor_count}
                                      </div>
                                      <div className="text-xs text-muted-foreground mb-2">
                                        Revenue: ${pickup.computed_revenue?.toFixed(2) || '0.00'}
                                      </div>
                                       <Badge variant={getStatusColor(pickup.status)}>
                                         {pickup.status.replace('_', ' ')}
                                       </Badge>
                                       {pickup.status === 'completed' && pickup.manifest_pdf_path && (
                                         <ManifestPDFControls 
                                           manifestId={pickup.manifest_id}
                                           acroformPdfPath={pickup.manifest_pdf_path}
                                           clientEmails={[]}
                                           className="mt-2"
                                         />
                                       )}
                                     </div>
                                     
                                     <div className="flex items-center gap-2">
                                      <CompletePickupDialog
                                        pickup={pickup}
                                        trigger={
                                          <Button size="sm" disabled={pickup.status === 'completed'}>
                                            {pickup.status === 'completed' ? 'Completed' : 'Complete Pickup'}
                                          </Button>
                                        }
                                      />
                                      
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="outline" size="sm">
                                            <MoreVertical className="h-4 w-4" />
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
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
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