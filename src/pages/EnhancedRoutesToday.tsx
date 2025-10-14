import { useState, useEffect, useCallback, useRef } from "react";
import { FixGeocodingButton } from "@/components/FixGeocodingButton";
import { useAssignments, usePickups, useDeletePickup } from "@/hooks/usePickups";
import { useVehicles } from "@/hooks/useVehicles";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { CompleteAssignmentDialog } from "@/components/driver/CompleteAssignmentDialog";
import { CompletePickupDialog } from "@/components/CompletePickupDialog";
import { MovePickupDialog } from "@/components/MovePickupDialog";
import { DriverAssignmentDropdown } from "@/components/DriverAssignmentDropdown";
import { VehicleManagementDialog } from "@/components/VehicleManagementDialog";
import { AddressValidationDialog } from "@/components/AddressValidationDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CapacityGauge } from "@/components/CapacityGauge";
import { TreadSetAnimatedLogo } from "@/components/TreadSetAnimatedLogo";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";
import { 
  Truck, 
  MapPin, 
  Clock, 
  Package, 
  Play, 
  CheckCircle, 
  Route,
  TrendingUp,
  Fuel,
  Printer,
  RefreshCw,
  Navigation,
  Timer,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Move,
  Building,
  Trash2
} from "lucide-react";

import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { motion } from "framer-motion";
import { WeeklyPickupsGrid } from "@/components/routes/WeeklyPickupsGrid";

import { LocationGeocodeDialog } from "@/components/locations/LocationGeocodeDialog";
import { useGeocodeLocations } from "@/hooks/useGeocodeLocations";

interface OptimizedStop {
  id: string;
  coordinates: { lat: number; lng: number };
  pteCount: number;
  clientName: string;
  address: string;
  serviceTimeMinutes: number;
  notes?: string;
}

interface OptimizedRoute {
  vehicleId: string;
  vehicleName: string;
  stops: OptimizedStop[];
  totalDistance: number;
  totalTime: number;
  startTime: string;
  endTime: string;
  efficiency: number;
}

export default function EnhancedRoutesToday() {
  // Initialize activeDay with current local date string to avoid timezone issues
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDay = String(today.getDate()).padStart(2, '0');
  const [activeDay, setActiveDay] = useState(`${todayYear}-${todayMonth}-${todayDay}`);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  // Local date object for header/labels to avoid UTC shift
  const [ay, am, ad] = activeDay.split('-').map(Number);
  const activeDateLocal = new Date((ay || todayYear), ((am || parseInt(todayMonth, 10)) - 1), (ad || parseInt(todayDay, 10)));
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [completingAssignment, setCompletingAssignment] = useState<any>(null);
  const [showDriverView, setShowDriverView] = useState(false);
  const [movePickupOpen, setMovePickupOpen] = useState(false);
  const [selectedPickupToMove, setSelectedPickupToMove] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pickupToDelete, setPickupToDelete] = useState<any>(null);
  const lastOptimizeRef = useRef<number>(0);
  const optimizeRef = useRef<() => void>(() => {});
  const [dataVersion, setDataVersion] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  // Get 7 days starting from current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  
  const { data: assignments = [], isLoading } = useAssignments(activeDay);
  const { data: pickups = [] } = usePickups(activeDay);
  const { data: vehicles = [] } = useVehicles();
  const { toast } = useToast();
  const deletePickup = useDeletePickup();
  const queryClient = useQueryClient();
  const { geocodeLocation, isLoading: isGeocoding } = useGeocodeLocations();

  // Real-time location updates
  useEffect(() => {
    const channel = supabase
      .channel('location-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'locations'
        },
        (payload) => {
          console.log('Location updated:', payload);
          // Invalidate all route-related queries to trigger re-fetch
          queryClient.invalidateQueries({ queryKey: ['routes'] });
          queryClient.invalidateQueries({ queryKey: ['optimized-routes'] });
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          queryClient.invalidateQueries({ queryKey: ['locations'] });
          queryClient.invalidateQueries({ queryKey: ['pickups'] });
          
          // Force AI insights to re-fetch with new data
          setDataVersion((v) => v + 1);
          
          toast({
            title: "Location Updated",
            description: "Routes and AI insights will refresh with new coordinates",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  useEffect(() => {
    document.title = "Route Planning – TreadSet";
  }, []);

  const goToPreviousWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(startOfWeek(today, { weekStartsOn: 0 }));
    // Use local date string to avoid timezone issues
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setActiveDay(`${year}-${month}-${day}`);
  };

  const fixDetroitMisGeocodes = async () => {
    try {
      const { data: hoodRows, error: hoodErr } = await supabase
        .from('locations')
        .select('id, name, address')
        .ilike('name', "Hood%");

      const { data: hantzRows, error: hantzErr } = await supabase
        .from('locations')
        .select('id, name, address')
        .ilike('name', "Hantz%");

      if (hoodErr || hantzErr) throw (hoodErr || hantzErr);

      const targets = [...(hoodRows || []), ...(hantzRows || [])];

      if (!targets.length) {
        toast({
          title: "No matching locations",
          description: "Couldn't find Hood's or Hantz locations.",
        });
        return;
      }

      for (const loc of targets) {
        await geocodeLocation(loc.id, true);
      }

      await queryClient.invalidateQueries({ queryKey: ['locations'] });
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['routes'] });

      toast({
        title: "Coordinates corrected",
        description: `Updated ${targets.length} location(s).`,
      });
    } catch (e: any) {
      toast({
        title: "Fix failed",
        description: e.message || 'Unable to fix coordinates',
        variant: "destructive",
      });
    }
  };

  const optimizeRoutes = useCallback(async () => {
    const now = Date.now();
    // Throttle calls to avoid 429s: max once every 12s
    if (now - lastOptimizeRef.current < 12000 || isOptimizing) {
      return;
    }
    lastOptimizeRef.current = now;
    setIsOptimizing(true);
    try {
      console.log(`Calling enhanced-route-optimizer for date: ${activeDay}`);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
      // Removed automatic mass geocoding to avoid clobbering valid coordinates
      // If needed, run geocode-locations manually from an admin tool or only for explicit fixes.

      const optimizePromise = supabase.functions.invoke('enhanced-route-optimizer', {
        body: {
          date: activeDay,
          vehicleId: selectedVehicle === 'all' ? null : selectedVehicle,
          optimize: true
        }
      });

      const result = await Promise.race([optimizePromise, timeoutPromise]) as any;
      const { data, error } = result;

      if (error) throw error;
      
      console.log('Route optimization response:', data);

      // Apply AI sequencing suggestions on top of base route metrics
      let aiSuggestions: any[] = [];
      let fullAiAnalysis: any = null;
      try {
        const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-route-optimizer', {
          body: { date: activeDay }
        });
        if (aiError) throw aiError;
        fullAiAnalysis = aiData?.ai_analysis;
        aiSuggestions = aiData?.ai_analysis?.route_suggestions || [];
        setAiAnalysis(fullAiAnalysis);
      } catch (e) {
        console.warn('AI suggestions unavailable, proceeding with base optimization:', e);
        setAiAnalysis(null);
      }

      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const reordered = (data.routes || []).map((route: any) => {
        const suggestion = aiSuggestions.find((s) => {
          const v = normalize(s.vehicle || '');
          return v.includes(normalize(route.vehicleName)) || v.includes(normalize(route.vehicleId));
        });
        if (!suggestion || !Array.isArray(suggestion.suggested_sequence)) return route;

        const seq: string[] = suggestion.suggested_sequence;
        const originalStops = route.stops || [];
        const withIndex = originalStops.map((stop: any, idx: number) => ({ ...stop, __originalIdx: idx }));

        const scoreFor = (stop: any) => {
          const keys = [stop.clientName, stop.address, stop.coordinates ? `${stop.coordinates.lat},${stop.coordinates.lng}` : '']
            .map(normalize);
          let best = Number.POSITIVE_INFINITY;
          seq.forEach((label, i) => {
            const l = normalize(label);
            if (keys.some((k) => k && (l.includes(k) || k.includes(l)))) {
              best = Math.min(best, i);
            }
          });
          return best;
        };

        const sorted = [...withIndex].sort((a, b) => {
          const sa = scoreFor(a);
          const sb = scoreFor(b);
          if (sa === sb) return a.__originalIdx - b.__originalIdx; // stable fallback
          return sa - sb;
        }).map(({ __originalIdx, ...rest }) => rest);

        return { ...route, stops: sorted };
      });

      setOptimizedRoutes(reordered);
      toast({
        title: "AI Optimization Applied",
        description: `Sequenced ${reordered.length || 0} routes using AI suggestions.`,
      });
    } catch (error: any) {
      console.error('Route optimization error:', error);
      toast({
        title: "Optimization Error", 
        description: `Failed to optimize routes: ${error.message}`,
        variant: "destructive"
      });
      // Set empty routes on error to stop loading state
      setOptimizedRoutes([]);
    } finally {
      setIsOptimizing(false);
    }
  }, [activeDay, selectedVehicle, toast]);

  useEffect(() => {
    if (assignments.length > 0 && !isOptimizing) {
      optimizeRoutes();
    } else {
      setOptimizedRoutes([]);
    }
  }, [assignments.length, optimizeRoutes]);

  const handlePrintRoute = (route: OptimizedRoute) => {
    const printContent = generatePrintableRoute(route);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generatePrintableRoute = (route: OptimizedRoute) => {
    const startTime = new Date(route.startTime);
    const endTime = new Date(route.endTime);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Route Sheet - ${route.vehicleName}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #333; 
            padding-bottom: 20px; 
            margin-bottom: 20px;
          }
          .route-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-weight: bold;
          }
          .stop {
            border: 1px solid #ccc;
            margin: 10px 0;
            padding: 15px;
            border-radius: 5px;
          }
          .stop-number {
            background: #4a5568;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-weight: bold;
          }
          .client-name { font-size: 18px; font-weight: bold; }
          .address { color: #666; margin: 5px 0; }
          .details { font-size: 14px; margin-top: 10px; }
          .notes { background: #f7fafc; padding: 10px; margin-top: 10px; font-style: italic; }
          .footer { 
            margin-top: 30px; 
            border-top: 1px solid #ccc; 
            padding-top: 20px; 
            text-align: center;
          }
          @media print {
            body { margin: 10px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BSG Tire Recycling - Route Sheet</h1>
          <h2>${route.vehicleName}</h2>
          <p>Date: ${format(activeDateLocal, 'EEEE, MMMM d, yyyy')}</p>
        </div>
        
        <div class="route-info">
          <div>Start Time: ${format(startTime, 'h:mm a')}</div>
          <div>Estimated End: ${format(endTime, 'h:mm a')}</div>
          <div>Total Distance: ${route.totalDistance.toFixed(1)} mi</div>
          <div>Efficiency: ${route.efficiency}%</div>
        </div>
        
        <h3>Route Stops (${route.stops.length} locations)</h3>
        
        ${route.stops.map((stop, index) => `
          <div class="stop">
            <div style="display: flex; align-items: flex-start;">
              <span class="stop-number">${index + 1}</span>
              <div style="flex: 1;">
                                <div class="client-name">${stop.clientName}</div>
                                <div class="address"><strong>📍 ${stop.address}</strong></div>
                <div class="details">
                  <strong>PTE Count:</strong> ${stop.pteCount} | 
                  <strong>Service Time:</strong> ${stop.serviceTimeMinutes} min
                </div>
                ${stop.notes ? `<div class="notes"><strong>Notes:</strong> ${stop.notes}</div>` : ''}
                <div style="margin-top: 15px; border-top: 1px dashed #ccc; padding-top: 10px;">
                  <strong>Driver Notes:</strong> ________________________
                </div>
              </div>
            </div>
          </div>
        `).join('')}
        
        <div class="footer">
          <p><strong>Important Reminders:</strong></p>
          <ul style="text-align: left; display: inline-block;">
            <li>Follow truck-designated routes only</li>
            <li>Complete safety inspection before departure</li>
            <li>Call dispatch for any delays or issues</li>
            <li>End of day return by 4:30 PM</li>
          </ul>
          <p style="margin-top: 20px;">
            <strong>Driver Signature:</strong> __________________ 
            <strong>Date:</strong> __________________
          </p>
        </div>
      </body>
      </html>
    `;
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return "text-green-600 bg-green-50 border-green-200";
    if (efficiency >= 70) return "text-blue-600 bg-blue-50 border-blue-200";
    if (efficiency >= 55) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const formatTime = (dateString: string) => {
    console.log('Formatting time for:', dateString, 'Result:', format(new Date(dateString), 'h:mm a'));
    return format(new Date(dateString), 'h:mm a');
  };

  const getTotalStops = () => {
    return optimizedRoutes.reduce((sum, route) => sum + route.stops.length, 0);
  };

  const getAverageEfficiency = () => {
    if (optimizedRoutes.length === 0) return 0;
    const total = optimizedRoutes.reduce((sum, route) => sum + route.efficiency, 0);
    return Math.round(total / optimizedRoutes.length);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <TreadSetAnimatedLogo size="md" animated={true} showText={false} />
              <p className="text-muted-foreground">Loading route data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <main>
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-background to-secondary/20 border-b border-border/20">
          <div className="container py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <TreadSetAnimatedLogo size="sm" animated={true} showText={false} />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Route Planning</h1>
                <p className="text-muted-foreground">
                  AI-optimized routes across multiple days for maximum efficiency
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous Week
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                Next Week
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              
              <FixGeocodingButton />
              <LocationGeocodeDialog />
              <VehicleManagementDialog 
                trigger={
                  <Button variant="outline" size="sm">
                    <Truck className="h-4 w-4 mr-2" />
                    Manage Fleet
                  </Button>
                }
              />
              
              <Button 
                onClick={optimizeRoutes} 
                disabled={isOptimizing}
                className="whitespace-nowrap"
              >
                {isOptimizing ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Optimizing...</>
                ) : (
                  <><Route className="h-4 w-4 mr-2" /> Re-optimize Routes</>
                )}
              </Button>
            </div>
          </div>
          </div>
        </div>

        <div className="py-6 px-2 sm:px-4">
          {/* Tabs for better organization */}
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="today">Today's Routes</TabsTrigger>
              <TabsTrigger value="week">Week View</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            {/* Today's Routes Tab */}
            <TabsContent value="today" className="space-y-6">
              {/* Pickups and Routes Section */}
              {/* AI Insights Section */}
              {aiAnalysis && (
                <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      AI Route Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Efficiency Score */}
                    <div className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border">
                      <div className="flex-1">
                        <div className="text-sm text-muted-foreground mb-1">Route Efficiency Score</div>
                        <div className="text-3xl font-bold text-primary">{aiAnalysis.efficiency_score}%</div>
                      </div>
                      <TrendingUp className="h-12 w-12 text-primary/20" />
                    </div>

                    {/* Top Improvements */}
                    {aiAnalysis.improvements && aiAnalysis.improvements.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                          Top Improvements
                        </h4>
                        <div className="space-y-2">
                          {aiAnalysis.improvements.map((improvement: any, idx: number) => (
                            <div key={idx} className="p-3 bg-background/50 rounded-lg border border-border/50">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="font-medium mb-1">{improvement.title}</div>
                                  <div className="text-sm text-muted-foreground">{improvement.description}</div>
                                  {improvement.estimated_savings && (
                                    <div className="text-xs text-primary mt-1">💡 {improvement.estimated_savings}</div>
                                  )}
                                </div>
                                <Badge variant={
                                  improvement.impact === 'high' ? 'destructive' : 
                                  improvement.impact === 'medium' ? 'default' : 
                                  'secondary'
                                }>
                                  {improvement.impact}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Overall Analysis */}
                    {aiAnalysis.overall_analysis && (
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <h4 className="font-semibold mb-2 text-sm">Overall Analysis</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{aiAnalysis.overall_analysis}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {pickups.length === 0 && optimizedRoutes.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg">No pickups or routes scheduled for {format(activeDateLocal, 'EEEE, MMMM d')}</p>
                    <p className="text-sm text-muted-foreground mt-2">Pickups and routes will appear here once scheduled</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
              {/* Scheduled Pickups */}
              {pickups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Scheduled Pickups - {format(activeDateLocal, 'EEEE, MMMM d')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-4">
                       {pickups.map((pickup) => (
                          <div
                            key={pickup.id}
                            className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-secondary/10 transition-colors"
                          >
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                              <Package className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              <div className="space-y-2 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium text-base sm:text-lg truncate">
                                    {pickup.client?.company_name || 'Unknown Client'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin className="h-4 w-4 flex-shrink-0" />
                                  <span className="truncate">{pickup.location?.name || pickup.location?.address || 'No address'}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                  <span>PTE {pickup.pte_count}</span>
                                  <span>•</span>
                                  <span>OTR {pickup.otr_count}</span>
                                  <span>•</span>
                                  <span>Tractor {pickup.tractor_count}</span>
                                  <span>•</span>
                                  <span>Revenue: ${pickup.computed_revenue?.toFixed(2) || '0.00'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto">
                              <Badge variant="outline" className="whitespace-nowrap">
                                {pickup.status.replace('_', ' ')}
                              </Badge>
                              
                              {pickup.status === 'completed' && pickup.manifest_pdf_path && (
                                <ManifestPDFControls
                                  manifestId={pickup.manifest_id}
                                  acroformPdfPath={pickup.manifest_pdf_path}
                                  clientEmails={[]}
                                  className="flex-shrink-0"
                                />
                              )}
                              
                              <CompletePickupDialog
                                pickup={pickup}
                                trigger={
                                  <Button size="sm" disabled={pickup.status === 'completed'} className="whitespace-nowrap">
                                    {pickup.status === 'completed' ? 'Completed' : 'Complete'}
                                  </Button>
                                }
                              />
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="flex-shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background border z-50">
                                  <DropdownMenuItem 
                                    onClick={() => {
                                      setSelectedPickupToMove(pickup);
                                      setMovePickupOpen(true);
                                    }}
                                  >
                                    <Move className="h-4 w-4 mr-2" />
                                    Move to Different Date
                                  </DropdownMenuItem>
                                  
                                  {pickup.status === 'scheduled' && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem 
                                          onSelect={(e) => e.preventDefault()}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete Pickup
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                     <AlertDialogContent className="bg-card border z-50">
                                       <AlertDialogHeader>
                                         <AlertDialogTitle>Delete Pickup</AlertDialogTitle>
                                         <AlertDialogDescription>
                                           Are you sure you want to delete this pickup for {pickup.client?.company_name}? 
                                           This action cannot be undone and will remove it from the schedule.
                                         </AlertDialogDescription>
                                       </AlertDialogHeader>
                                       <AlertDialogFooter>
                                         <AlertDialogCancel>Cancel</AlertDialogCancel>
                                         <AlertDialogAction
                                           onClick={() => deletePickup.mutate(pickup.id)}
                                           className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                         >
                                           Delete Pickup
                                         </AlertDialogAction>
                                       </AlertDialogFooter>
                                     </AlertDialogContent>
                                   </AlertDialog>
                                 )}
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Optimized Routes */}
              {optimizedRoutes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Optimized Routes - {format(activeDateLocal, 'EEEE, MMMM d')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {optimizedRoutes.map((route, routeIndex) => (
                        <Collapsible key={route.vehicleId} className="border rounded-lg">
                          <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-brand-primary rounded-md">
                                  <Truck className="h-4 w-4 text-white" />
                                </div>
                                <div className="text-left">
                                  <p className="font-semibold">{route.vehicleName}</p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{route.stops.length} stops</span>
                                    <span>•</span>
                                    <span>{route.totalDistance.toFixed(1)} mi</span>
                                    <span>•</span>
                                    <span>{formatTime(route.startTime)} - {formatTime(route.endTime)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`${getEfficiencyColor(route.efficiency)} border text-xs`}>
                                  {route.efficiency}%
                                </Badge>
                                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="px-4 pb-4">
                            <div className="pt-3 border-t space-y-3">
                              {/* Driver Assignment */}
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Driver:</span>
                                <DriverAssignmentDropdown
                                  vehicleId={route.vehicleId}
                                  vehicleName={route.vehicleName}
                                  routeDate={activeDay}
                                  currentDriverId={
                                    assignments?.find(a => a.vehicle_id === route.vehicleId)?.assigned_driver?.id
                                  }
                                  onDriverAssigned={(driverId) => {
                                    console.log(`Driver ${driverId} assigned to ${route.vehicleName}`);
                                  }}
                                />
                              </div>
                              
                              {/* Stops */}
                              <div className="space-y-2">
                                {route.stops.map((stop, index) => (
                                  <div key={stop.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-md text-sm">
                                    <div className="flex-shrink-0 w-6 h-6 bg-brand-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                                      {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{stop.clientName}</p>
                                      <p className="text-xs text-muted-foreground truncate">📍 {stop.address}</p>
                                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                        <span>{stop.pteCount} PTE</span>
                                        <span>•</span>
                                        <span>{stop.serviceTimeMinutes} min</span>
                                      </div>
                                      {stop.notes && (
                                        <p className="text-xs text-muted-foreground mt-1 italic">📝 {stop.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrintRoute(route)}
                                  className="flex-1"
                                >
                                  <Printer className="h-4 w-4 mr-2" />
                                  Print Route
                                </Button>
                              </div>
                              
                              {/* Warning */}
                              {(new Date(route.endTime).getHours() > 16 || 
                               (new Date(route.endTime).getHours() === 16 && new Date(route.endTime).getMinutes() > 30)) && (
                                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                  <span className="text-xs text-yellow-800">
                                    Route extends beyond 4:30 PM
                                  </span>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Week View Tab */}
        <TabsContent value="week">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Week of {format(currentWeek, 'MMMM d, yyyy')}</h2>
              <div className="text-sm text-muted-foreground">All pickups by day</div>
            </div>
            <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-x-hidden">
              <div className="px-2 sm:px-4">
                <WeeklyPickupsGrid
                  currentWeek={currentWeek}
                  onMovePickup={(pickup) => {
                    setSelectedPickupToMove(pickup);
                    setMovePickupOpen(true);
                  }}
                />
              </div>
            </div>
          </div>
        </TabsContent>


        {/* Statistics Tab */}
        <TabsContent value="stats">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Route Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-brand-primary/10 rounded-lg">
                      <Truck className="h-6 w-6 text-brand-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{optimizedRoutes.length}</p>
                      <p className="text-sm text-muted-foreground">Active Vehicles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-brand-recycling/10 rounded-lg">
                      <MapPin className="h-6 w-6 text-brand-recycling" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{getTotalStops()}</p>
                      <p className="text-sm text-muted-foreground">Total Stops</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{getAverageEfficiency()}%</p>
                      <p className="text-sm text-muted-foreground">Avg Efficiency</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <Timer className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">8:30-4:30</p>
                      <p className="text-sm text-muted-foreground">Work Hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional stats could go here */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Distance</span>
                    <span className="font-semibold">
                      {optimizedRoutes.reduce((sum, route) => sum + route.totalDistance, 0).toFixed(1)} miles
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Scheduled Pickups</span>
                    <span className="font-semibold">{pickups.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Completed Pickups</span>
                    <span className="font-semibold">{pickups.filter(p => p.status === 'completed').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
          
          {/* Move Pickup Dialog */}
        {selectedPickupToMove && (
          <MovePickupDialog
            open={movePickupOpen}
            onOpenChange={setMovePickupOpen}
            pickup={selectedPickupToMove}
            currentWeek={currentWeek}
            onDelete={() => {
              setPickupToDelete(selectedPickupToMove);
              setDeleteDialogOpen(true);
              setMovePickupOpen(false);
            }}
          />
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Stop</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently remove this pickup for{' '}
                <span className="font-semibold">{pickupToDelete?.client?.company_name}</span>?
                This action cannot be undone and will delete all associated assignments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPickupToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (pickupToDelete?.id) {
                    deletePickup.mutate(pickupToDelete.id);
                  }
                  setDeleteDialogOpen(false);
                  setPickupToDelete(null);
                }}
              >
                Remove Stop
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </main>
    </div>
  );
}