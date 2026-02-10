import { useEffect, useState, useMemo } from "react";
import { useDriverAssignments } from "@/hooks/useDriverAssignments";
import { useDriverWeeklyAssignments } from "@/hooks/useDriverWeeklyAssignments";
import { useClientPickupStats } from "@/hooks/useClientPickupStats";
import { useDriverRouteSuggestions, type StopLocation, type RouteSuggestion } from "@/hooks/useDriverRouteSuggestions";
import { useAuth } from "@/contexts/AuthContext";
import { DriverAssignmentInterface } from "@/components/driver/DriverAssignmentInterface";
import { DriverSchedulePickupDialog } from "@/components/driver/DriverSchedulePickupDialog";
import { MovePickupDialog } from "@/components/MovePickupDialog";
import { RouteOptimizationSuggestions } from "@/components/driver/RouteOptimizationSuggestions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { Building, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Package, Truck, MoreVertical, Move, Phone, Plus, TrendingUp, DollarSign, ChevronLeft, ChevronRight, Search, Route } from "lucide-react";
import { format, addWeeks, startOfWeek } from "date-fns";
import { toast } from "sonner";

type ViewMode = 'day' | 'week';

export default function DriverRoutes() {
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weekStartDate, setWeekStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [movePickupOpen, setMovePickupOpen] = useState(false);
  const [selectedPickupToMove, setSelectedPickupToMove] = useState<any>(null);
  
  // Route suggestions state
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [alongRouteSuggestions, setAlongRouteSuggestions] = useState<RouteSuggestion[]>([]);
  const [overdueSuggestions, setOverdueSuggestions] = useState<RouteSuggestion[]>([]);
  const [suggestionDate, setSuggestionDate] = useState<string>("");
  const [suggestionStopCount, setSuggestionStopCount] = useState<number>(0);
  const [isFindingNearby, setIsFindingNearby] = useState(false);
  
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  const { getRouteSuggestions, isLoading: routeSuggestionsLoading } = useDriverRouteSuggestions();
  
  // Day view data
  const { data: dayAssignments = [], isLoading: isDayLoading } = useDriverAssignments(selectedDate);
  
  // Week view data
  const { data: weekData, isLoading: isWeekLoading } = useDriverWeeklyAssignments(weekStartDate);
  const weekAssignments = weekData?.assignments || [];
  const weekDays = weekData?.weekDays || [];

  const assignments = viewMode === 'day' ? dayAssignments : weekAssignments;
  const isLoading = viewMode === 'day' ? isDayLoading : isWeekLoading;

  // Extract unique client IDs for stats lookup
  const clientIds = useMemo(() => {
    const ids = assignments
      .map(a => a.pickup?.client?.id)
      .filter((id): id is string => !!id);
    return [...new Set(ids)];
  }, [assignments]);

  const { data: clientStats = {} } = useClientPickupStats(clientIds);
  
  // Find nearby shops based on ALL scheduled stops for a specific date
  const handleFindNearbyShops = async (forDate?: string, assignmentsForDate?: typeof dayAssignments) => {
    if (!organizationId) {
      toast.error("Organization not found");
      return;
    }
    
    // Determine which assignments to analyze
    const targetDate = forDate || (viewMode === 'day' ? selectedDate : null);
    let stopsToAnalyze = assignmentsForDate;
    
    if (!stopsToAnalyze) {
      stopsToAnalyze = viewMode === 'day' ? dayAssignments : weekAssignments;
    }
    
    if (stopsToAnalyze.length === 0) {
      toast.info("No scheduled stops to analyze");
      return;
    }
    
    // Extract location data from all stops
    const scheduledStops: StopLocation[] = stopsToAnalyze
      .filter(a => a.pickup?.location?.latitude && a.pickup?.location?.longitude)
      .map(a => ({
        client_id: a.pickup?.client?.id || '',
        company_name: a.pickup?.client?.company_name || 'Unknown',
        latitude: a.pickup?.location?.latitude || 0,
        longitude: a.pickup?.location?.longitude || 0,
        address: a.pickup?.location?.address || '',
      }));
    
    if (scheduledStops.length === 0) {
      toast.info("No geocoded stops available for route analysis");
      return;
    }
    
    setIsFindingNearby(true);
    setSuggestionDate(targetDate || selectedDate);
    setSuggestionStopCount(stopsToAnalyze.length);
    setSuggestionsOpen(true);
    
    try {
      const result = await getRouteSuggestions({
        scheduledStops,
        organizationId,
        routeDate: targetDate || selectedDate,
      });
      
      setAlongRouteSuggestions(result.along_route || []);
      setOverdueSuggestions(result.overdue || []);
      
      if ((result.along_route?.length || 0) === 0 && (result.overdue?.length || 0) === 0) {
        toast.info(result.message || "No additional clients found near your route");
      }
    } catch (error) {
      console.error("Error finding nearby shops:", error);
      toast.error("Failed to analyze route for suggestions");
    } finally {
      setIsFindingNearby(false);
    }
  };

  // Group assignments by date for week view - MUST be before any conditional returns
  const assignmentsByDate = useMemo(() => {
    const grouped: Record<string, typeof weekAssignments> = {};
    weekAssignments.forEach(assignment => {
      const date = assignment.scheduled_date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(assignment);
    });
    return grouped;
  }, [weekAssignments]);

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
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                <Truck className="h-6 w-6 md:h-8 md:w-8 text-brand-primary" />
                My Assignments
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {viewMode === 'day' 
                  ? `${format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')} • ${assignments.length} stops scheduled`
                  : `Week of ${format(weekStartDate, 'MMM d')} - ${format(addWeeks(weekStartDate, 0), 'MMM d, yyyy')} • ${weekAssignments.length} stops`
                }
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DriverSchedulePickupDialog
                trigger={
                  <Button size="sm" className="!bg-brand-primary hover:!bg-brand-primary-hover text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Pickup
                  </Button>
                }
              />
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleFindNearbyShops()}
                disabled={isFindingNearby || assignments.length === 0}
              >
                <Search className="h-4 w-4 mr-2" />
                {isFindingNearby ? "Finding..." : "Find Nearby Shops"}
              </Button>
            </div>
          </div>

          {/* View Toggle + Date Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-auto">
              <TabsList className="grid grid-cols-2 w-[160px]">
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
              </TabsList>
            </Tabs>

            {viewMode === 'day' ? (
              <div className="flex items-center gap-2 bg-card p-2 rounded-lg border">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekStartDate(addWeeks(weekStartDate, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">
                  {format(weekStartDate, 'MMM d')} - {format(addWeeks(weekStartDate, 1), 'MMM d')}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWeekStartDate(addWeeks(weekStartDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWeekStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                  className="text-xs"
                >
                  This Week
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Day View */}
        {viewMode === 'day' && (
          <>
            {dayAssignments.length === 0 ? (
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
                      {dayAssignments
                        .sort((a, b) => {
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

                            <div className="mb-3">
                              <h2 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                                {assignment.pickup?.client?.company_name || 'Unknown Shop'}
                              </h2>
                            </div>

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

                            <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                              <Truck className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
                              <div>
                                <div className="text-sm md:text-base font-medium text-gray-700">Vehicle:</div>
                                <div className="text-base md:text-lg font-semibold text-gray-900">
                                  {assignment.vehicle?.name || 'Vehicle TBD'}
                                </div>
                              </div>
                            </div>

                            {(() => {
                              const clientId = assignment.pickup?.client?.id;
                              const stats = clientId ? clientStats[clientId] : null;
                              return (
                                <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                                  <div className="flex sm:flex-col items-center sm:text-center justify-between sm:justify-start p-3 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
                                      <TrendingUp className="hidden sm:block h-4 w-4 text-blue-600" />
                                      <span className="text-sm sm:text-xs md:text-sm text-blue-600 sm:order-2">Avg Tires</span>
                                    </div>
                                    <div className="text-lg md:text-xl font-bold text-blue-700">
                                      {stats?.avgTires ?? '--'}
                                    </div>
                                  </div>
                                  <div className="flex sm:flex-col items-center sm:text-center justify-between sm:justify-start p-3 md:p-3 bg-green-50 rounded-lg border border-green-200">
                                    <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
                                      <DollarSign className="hidden sm:block h-4 w-4 text-green-600" />
                                      <span className="text-sm sm:text-xs md:text-sm text-green-600 sm:order-2">Avg Revenue</span>
                                    </div>
                                    <div className="text-lg md:text-xl font-bold text-green-700">
                                      {stats?.avgPrice ? `$${stats.avgPrice.toFixed(2)}` : '--'}
                                    </div>
                                  </div>
                                  <div className="flex sm:flex-col items-center sm:text-center justify-between sm:justify-start p-3 md:p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="flex items-center gap-2 sm:flex-col sm:gap-1">
                                      <DollarSign className="hidden sm:block h-4 w-4 text-purple-600" />
                                      <span className="text-sm sm:text-xs md:text-sm text-purple-600 sm:order-2">Last $/Tire</span>
                                    </div>
                                    <div className="text-lg md:text-xl font-bold text-purple-700">
                                      {stats?.lastPricePerTire ? `$${stats.lastPricePerTire.toFixed(2)}` : '--'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Payment & Revenue Info for completed stops */}
                            {assignment.status === 'completed' && (
                              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <DollarSign className="h-4 w-4 text-emerald-600" />
                                  <span className="text-base md:text-lg font-bold text-emerald-700">
                                    {assignment.pickup?.computed_revenue
                                      ? `$${Number(assignment.pickup.computed_revenue).toFixed(2)}`
                                      : '$0.00'}
                                  </span>
                                </div>
                                <div>
                                  {assignment.pickup?.payment_method === 'CASH' && (
                                    <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 border border-green-300 px-2.5 py-0.5 text-xs font-semibold">Cash</span>
                                  )}
                                  {assignment.pickup?.payment_method === 'CHECK' && (
                                    <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 border border-green-300 px-2.5 py-0.5 text-xs font-semibold">
                                      Check {assignment.pickup?.check_number ? `#${assignment.pickup.check_number}` : ''}
                                    </span>
                                  )}
                                  {assignment.pickup?.payment_method === 'INVOICE' && (
                                    <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 text-xs font-semibold">To Be Invoiced</span>
                                  )}
                                  {assignment.pickup?.payment_method === 'CARD_ON_FILE' && (
                                    <span className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300 px-2.5 py-0.5 text-xs font-semibold">Card on File</span>
                                  )}
                                  {assignment.pickup?.payment_method === 'CARD' && (
                                    <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-0.5 text-xs font-semibold">Card</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {assignment.pickup?.notes && (
                              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="text-sm md:text-base font-medium text-yellow-800 mb-1">Special Notes:</div>
                                <div className="text-sm md:text-base text-yellow-700">{assignment.pickup.notes}</div>
                              </div>
                            )}

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
                        <div className="text-xl md:text-2xl font-bold text-brand-primary">{dayAssignments.length}</div>
                        <div className="text-xs md:text-sm text-muted-foreground">Total Stops</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xl md:text-2xl font-bold text-brand-success">
                          {dayAssignments.filter(a => a.status === 'completed').length}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">Completed</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xl md:text-2xl font-bold text-brand-warning">
                          {dayAssignments.filter(a => a.status !== 'completed').length}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">Remaining</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xl md:text-2xl font-bold text-foreground">
                          ${dayAssignments.reduce((sum, a) => sum + (a.pickup?.computed_revenue || 0), 0).toFixed(2)}
                        </div>
                        <div className="text-xs md:text-sm text-muted-foreground">Total Value</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div className="space-y-4">
            {/* Week Summary */}
            <Card className="bg-brand-primary/5 border-brand-primary/20">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-brand-primary">{weekAssignments.length}</div>
                    <div className="text-xs md:text-sm text-muted-foreground">Total Stops</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-brand-success">
                      {weekAssignments.filter(a => a.status === 'completed').length}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-brand-warning">
                      {weekAssignments.filter(a => a.status !== 'completed').length}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">Remaining</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl md:text-2xl font-bold text-foreground">
                      ${weekAssignments.reduce((sum, a) => sum + (a.pickup?.computed_revenue || 0), 0).toFixed(2)}
                    </div>
                    <div className="text-xs md:text-sm text-muted-foreground">Total Value</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Day-by-day breakdown */}
            {weekDays.map((day) => {
              const dayStops = assignmentsByDate[day.date] || [];
              const completedCount = dayStops.filter(a => a.status === 'completed').length;
              
              return (
                <Card key={day.date} className={day.isToday ? 'ring-2 ring-brand-primary' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold ${
                          day.isToday 
                            ? 'bg-brand-primary text-white' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {day.dayNumber}
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {day.dayName}
                            {day.isToday && (
                              <Badge variant="secondary" className="text-xs">Today</Badge>
                            )}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(day.date + 'T00:00:00'), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{dayStops.length}</div>
                        <div className="text-xs text-muted-foreground">
                          {completedCount}/{dayStops.length} done
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    {dayStops.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">No stops scheduled</p>
                    ) : (
                      <div className="space-y-2">
                        {dayStops.map((assignment, idx) => {
                          const StatusIcon = getStatusIcon(assignment.status);
                          return (
                            <div 
                              key={assignment.id}
                              className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-secondary/5 transition-colors cursor-pointer"
                              onClick={() => {
                                setSelectedDate(day.date);
                                setViewMode('day');
                              }}
                            >
                              <div className="bg-brand-primary/10 text-brand-primary rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {assignment.pickup?.client?.company_name || 'Unknown'}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {assignment.pickup?.client?.city}, {assignment.pickup?.client?.state}
                                </div>
                              </div>
                              <StatusIcon className={`h-5 w-5 flex-shrink-0 ${
                                assignment.status === 'completed' ? 'text-green-600' :
                                assignment.status === 'in_progress' ? 'text-orange-500' : 'text-blue-500'
                              }`} />
                            </div>
                          );
                        })}
                        
                        {/* Per-day Find Nearby button */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFindNearbyShops(day.date, dayStops);
                          }}
                        >
                          <Route className="h-4 w-4 mr-2" />
                          Find Shops Along This Route
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
        
        {/* Route Optimization Suggestions Modal */}
        <RouteOptimizationSuggestions
          open={suggestionsOpen}
          onOpenChange={setSuggestionsOpen}
          alongRoute={alongRouteSuggestions}
          overdue={overdueSuggestions}
          selectedDate={suggestionDate}
          stopCount={suggestionStopCount}
          isLoading={isFindingNearby}
        />
      </main>
    </div>
  );
}