import { useState, useEffect } from "react";
import { useAssignments } from "@/hooks/usePickups";
import { useVehicles } from "@/hooks/useVehicles";
import { supabase } from "@/integrations/supabase/client";
import { CompleteAssignmentDialog } from "@/components/driver/CompleteAssignmentDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  AlertTriangle
} from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [optimizedRoutes, setOptimizedRoutes] = useState<OptimizedRoute[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [completingAssignment, setCompletingAssignment] = useState<any>(null);
  const [showDriverView, setShowDriverView] = useState(false);

  const { data: assignments = [], isLoading } = useAssignments(selectedDate);
  const { data: vehicles = [] } = useVehicles();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Enhanced Routes – BSG Tire Recycling";
  }, []);

  useEffect(() => {
    if (assignments.length > 0) {
      optimizeRoutes();
    } else {
      setOptimizedRoutes([]);
    }
  }, [selectedDate, assignments]);

  const optimizeRoutes = async () => {
    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-route-optimizer', {
        body: {
          date: selectedDate,
          vehicleId: selectedVehicle === 'all' ? null : selectedVehicle,
          optimize: true
        }
      });

      if (error) throw error;
      
      setOptimizedRoutes(data.routes || []);
      toast({
        title: "Routes Optimized",
        description: `Generated ${data.routes?.length || 0} optimized routes for maximum efficiency.`,
      });
    } catch (error) {
      console.error('Route optimization error:', error);
      toast({
        title: "Optimization Error", 
        description: "Failed to optimize routes. Using default order.",
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

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
          <p>Date: ${format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}</p>
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
                <div class="address">${stop.address}</div>
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
                  <h1 className="text-2xl font-bold text-foreground">Intelligent Route Management</h1>
                  <p className="text-muted-foreground">
                    AI-optimized routes for maximum efficiency and driver convenience
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + i);
                      const dateStr = date.toISOString().split('T')[0];
                      return (
                        <SelectItem key={dateStr} value={dateStr}>
                          {format(date, 'EEE, MMM d')}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
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

        {/* Route Statistics */}
        <div className="container py-6">
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

          {/* Route Cards */}
          {optimizedRoutes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Route className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No routes scheduled for {format(new Date(selectedDate), 'EEEE, MMMM d')}</p>
                <p className="text-sm text-muted-foreground mt-2">Routes will appear here once pickups are scheduled</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {optimizedRoutes.map((route, routeIndex) => (
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
                                  <p className="text-sm text-muted-foreground truncate">
                                    {stop.address}
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
        </div>
      </main>
    </div>
  );
}