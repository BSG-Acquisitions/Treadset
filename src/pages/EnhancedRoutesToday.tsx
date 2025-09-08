import { useState, useEffect, useCallback } from "react";
import { useAssignments, usePickups } from "@/hooks/usePickups";
import { useVehicles } from "@/hooks/useVehicles";
import { supabase } from "@/integrations/supabase/client";
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
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CapacityGauge } from "@/components/CapacityGauge";
import { BSGLogo } from "@/components/BSGLogo";
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
  Building
} from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { motion } from "framer-motion";

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
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date()));
  const [activeDay, setActiveDay] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [completingAssignment, setCompletingAssignment] = useState<any>(null);
  const [showDriverView, setShowDriverView] = useState(false);
  const [movePickupOpen, setMovePickupOpen] = useState(false);
  const [selectedPickupToMove, setSelectedPickupToMove] = useState<any>(null);

  // Get 7 days starting from current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  
  const { data: assignments = [], isLoading } = useAssignments(activeDay);
  const { data: pickups = [] } = usePickups(activeDay);
  const { data: vehicles = [] } = useVehicles();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Route Planning – BSG Tire Recycling";
  }, []);

  const goToPreviousWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(startOfWeek(today));
    setActiveDay(today.toISOString().split('T')[0]);
  };

  const optimizeRoutes = useCallback(async () => {
    setIsOptimizing(true);
    try {
      console.log(`Calling enhanced-route-optimizer for date: ${activeDay}`);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );
      
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
      setOptimizedRoutes(data.routes || []);
      toast({
        title: "Routes Optimized",
        description: `Generated ${data.routes?.length || 0} optimized routes for maximum efficiency.`,
      });
    } catch (error) {
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
          <p>Date: ${format(new Date(activeDay), 'EEEE, MMMM d, yyyy')}</p>
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
        <TopNav />
        <main className="container py-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <BSGLogo size="md" animated={true} showText={false} />
              <p className="text-muted-foreground">Loading route data...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main>
        {/* Enhanced Header */}
        <div className="bg-gradient-to-br from-background to-secondary/20 border-b border-border/20">
          <div className="container py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BSGLogo size="sm" animated={true} showText={false} />
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

        <div className="container py-6">
          {/* Week Navigation */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                Week of {format(currentWeek, 'MMMM d, yyyy')}
              </h2>
              <div className="text-sm text-muted-foreground">
                Planning across multiple days
              </div>
            </div>
            
            <Tabs value={activeDay} onValueChange={setActiveDay}>
              <TabsList className="grid w-full grid-cols-7">
                {weekDays.map((day) => {
                  const dateStr = day.toISOString().split('T')[0];
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
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
          {/* Route Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-brand-primary" />
                  <div>
                    <p className="text-2xl font-bold">{optimizedRoutes.length}</p>
                    <p className="text-xs text-muted-foreground">Active Vehicles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-brand-recycling" />
                  <div>
                    <p className="text-2xl font-bold">{getTotalStops()}</p>
                    <p className="text-xs text-muted-foreground">Total Stops</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{getAverageEfficiency()}%</p>
                    <p className="text-xs text-muted-foreground">Avg Efficiency</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold">8:30-4:30</p>
                    <p className="text-xs text-muted-foreground">Work Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pickups and Routes Section */}
          {pickups.length === 0 && optimizedRoutes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No pickups or routes scheduled for {format(new Date(activeDay), 'EEEE, MMMM d')}</p>
                <p className="text-sm text-muted-foreground mt-2">Pickups and routes will appear here once scheduled</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Pickups Section */}
              {pickups.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Scheduled Pickups - {format(new Date(activeDay), 'EEEE, MMMM d')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pickups.map((pickup) => (
                        <div
                          key={pickup.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/10 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <Package className="h-5 w-5 text-muted-foreground" />
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
                              <Badge variant="outline">
                                {pickup.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <CompletePickupDialog
                                pickup={pickup}
                                trigger={
                                  <Button size="sm" disabled={pickup.status === 'completed'}>
                                    {pickup.status === 'completed' ? 'Completed' : 'Complete'}
                                  </Button>
                                }
                              />
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
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
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Optimized Routes Section */}
              {optimizedRoutes.length > 0 && optimizedRoutes.map((route, routeIndex) => (
                <motion.div
                  key={route.vehicleId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: routeIndex * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-muted/50">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-brand-primary rounded-lg">
                            <Truck className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{route.vehicleName}</CardTitle>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(route.startTime)} - {formatTime(route.endTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Navigation className="h-3 w-3" />
                                {route.totalDistance.toFixed(1)} mi
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {route.stops.length} stops
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
                          {/* Driver Assignment Dropdown */}
                          <DriverAssignmentDropdown
                            vehicleId={route.vehicleId}
                            vehicleName={route.vehicleName}
                            routeDate={activeDay}
                            currentDriverId={
                              // Get driver from assignments for this vehicle
                              assignments?.find(a => a.vehicle_id === route.vehicleId)?.assigned_driver?.id
                            }
                            onDriverAssigned={(driverId) => {
                              // Refresh data when driver is assigned
                              console.log(`Driver ${driverId} assigned to ${route.vehicleName}`);
                            }}
                          />
                          
                          <div className="flex items-center gap-3">
                            <Badge className={`${getEfficiencyColor(route.efficiency)} border`}>
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {route.efficiency}% efficient
                            </Badge>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePrintRoute(route)}
                            >
                              <Printer className="h-4 w-4 mr-2" />
                              Print Route
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {route.stops.map((stop, index) => (
                          <div key={stop.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                            <div className="flex-shrink-0 w-8 h-8 bg-brand-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold text-foreground truncate">
                                    {stop.clientName}
                                  </h4>
                                   <p className="text-sm font-medium text-foreground">
                                     📍 {stop.address}
                                   </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Package className="h-3 w-3" />
                                      {stop.pteCount} PTE
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Timer className="h-3 w-3" />
                                      {stop.serviceTimeMinutes} min
                                    </span>
                                  </div>
                                  {stop.notes && (
                                    <p className="text-xs text-muted-foreground mt-2 italic">
                                      📝 {stop.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Working hours warning */}
                      {new Date(route.endTime).getHours() > 16 || 
                       (new Date(route.endTime).getHours() === 16 && new Date(route.endTime).getMinutes() > 30) && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-800">
                            Route extends beyond normal working hours (4:30 PM)
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Move Pickup Dialog */}
          {selectedPickupToMove && (
            <MovePickupDialog
              open={movePickupOpen}
              onOpenChange={setMovePickupOpen}
              pickup={selectedPickupToMove}
            />
          )}
        </div>
      </main>
    </div>
  );
}