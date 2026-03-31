import { useState, useEffect } from "react";
import { useAssignments, usePickups, useDeletePickup } from "@/hooks/usePickups";
import { useVehicles } from "@/hooks/useVehicles";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEnsureManifestPdf } from "@/hooks/useEnsureManifestPdf";
import { useVoidManifest } from "@/hooks/useVoidManifest";
import { CompletePickupDialog } from "@/components/CompletePickupDialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MovePickupDialog } from "@/components/MovePickupDialog";
import { DriverAssignmentDropdown } from "@/components/DriverAssignmentDropdown";

import { VehicleManagementDialog } from "@/components/VehicleManagementDialog";
import { SchedulePickupDialog } from "@/components/SchedulePickupDialog";
import { useGeocodeLocations } from "@/hooks/useGeocodeLocations";
import { EditPickupRevenueDialog } from "@/components/EditPickupRevenueDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TreadSetAnimatedLogo } from "@/components/TreadSetAnimatedLogo";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";
import { RouteStatisticsPanel } from "@/components/routes/RouteStatisticsPanel";
import { 
  Truck, 
  MapPin, 
  Package, 
  Route,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Move,
  Building,
  Trash2,
  Settings,
  CalendarPlus
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
import { WeeklyPickupsGrid } from "@/components/routes/WeeklyPickupsGrid";
import { calculateManifestPTE } from "@/lib/michigan-conversions";
import { LocationGeocodeDialog } from "@/components/locations/LocationGeocodeDialog";
import { RouteEfficiencyTab } from "@/components/routes/RouteEfficiencyTab";

export default function EnhancedRoutesToday() {
  // Initialize activeDay with current local date string to avoid timezone issues
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
  const todayDay = String(today.getDate()).padStart(2, '0');
  const [activeDay, setActiveDay] = useState(`${todayYear}-${todayMonth}-${todayDay}`);
  const [activeTab, setActiveTab] = useState("today");
  
  // Local date object for header/labels to avoid UTC shift
  const [ay, am, ad] = activeDay.split('-').map(Number);
  const activeDateLocal = new Date((ay || todayYear), ((am || parseInt(todayMonth, 10)) - 1), (ad || parseInt(todayDay, 10)));
  
  const [movePickupOpen, setMovePickupOpen] = useState(false);
  const [selectedPickupToMove, setSelectedPickupToMove] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pickupToDelete, setPickupToDelete] = useState<any>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isFixingGeocoding, setIsFixingGeocoding] = useState(false);
  const [geocodeDialogOpen, setGeocodeDialogOpen] = useState(false);
  const [isGeneratingMissingPdfs, setIsGeneratingMissingPdfs] = useState(false);

  const { data: allAssignments = [], isLoading } = useAssignments(activeDay);
  const assignments = allAssignments.filter(a => a.status !== 'completed');
  const { data: pickups = [] } = usePickups(activeDay);
  const { data: vehicles = [] } = useVehicles();
  const { toast } = useToast();
  const deletePickup = useDeletePickup();
  const voidManifest = useVoidManifest();
  const queryClient = useQueryClient();
  const { geocodeLocation, isLoading: isGeocoding } = useGeocodeLocations();
  const ensureManifestPdf = useEnsureManifestPdf();

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
        () => {
          queryClient.invalidateQueries({ queryKey: ['assignments'] });
          queryClient.invalidateQueries({ queryKey: ['locations'] });
          queryClient.invalidateQueries({ queryKey: ['pickups'] });
          
          toast({
            title: "Location Updated",
            description: "Routes will refresh with new coordinates",
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

  // Sync week view when active day changes
  useEffect(() => {
    const [y, m, d] = activeDay.split('-').map(Number);
    const dayDate = new Date(y, m - 1, d);
    setCurrentWeek(startOfWeek(dayDate, { weekStartsOn: 0 }));
  }, [activeDay]);

  const goToPreviousWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  
  const goToPreviousDay = () => {
    const currentDate = new Date(activeDateLocal);
    const prevDay = subDays(currentDate, 1);
    const year = prevDay.getFullYear();
    const month = String(prevDay.getMonth() + 1).padStart(2, '0');
    const day = String(prevDay.getDate()).padStart(2, '0');
    setActiveDay(`${year}-${month}-${day}`);
  };
  
  const goToNextDay = () => {
    const currentDate = new Date(activeDateLocal);
    const nextDay = addDays(currentDate, 1);
    const year = nextDay.getFullYear();
    const month = String(nextDay.getMonth() + 1).padStart(2, '0');
    const day = String(nextDay.getDate()).padStart(2, '0');
    setActiveDay(`${year}-${month}-${day}`);
  };
  
  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(startOfWeek(today, { weekStartsOn: 0 }));
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setActiveDay(`${year}-${month}-${day}`);
  };

  const fixGeocodingIssues = async () => {
    setIsFixingGeocoding(true);
    try {
      toast({
        title: "Starting geocoding fix",
        description: "This may take a few minutes...",
      });
      
      const { data, error } = await supabase.functions.invoke('fix-geocoding');
      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || 'Geocoding fix completed successfully',
      });
      
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Fix geocoding error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to fix geocoding issues',
        variant: "destructive",
      });
    } finally {
      setIsFixingGeocoding(false);
    }
  };

  const generateMissingPdfs = async () => {
    setIsGeneratingMissingPdfs(true);
    try {
      const completedWithoutPdf = pickups.filter(
        p => p.status === 'completed' && !p.manifest_pdf_path
      );

      if (completedWithoutPdf.length === 0) {
        toast({
          title: "All PDFs exist",
          description: "All completed pickups already have PDFs generated.",
        });
        return;
      }

      toast({
        title: "Generating PDFs",
        description: `Generating ${completedWithoutPdf.length} missing manifest PDFs...`,
      });

      for (const pickup of completedWithoutPdf) {
        await ensureManifestPdf.mutateAsync({
          pickup_id: pickup.id,
          force_regenerate: false,
        });
      }

      toast({
        title: "Success",
        description: `Generated ${completedWithoutPdf.length} manifest PDFs`,
      });
    } catch (error: any) {
      console.error('Error generating missing PDFs:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to generate missing PDFs',
        variant: "destructive",
      });
    } finally {
      setIsGeneratingMissingPdfs(false);
    }
  };

  // Group pickups by vehicle for display
  const pickupsByVehicle = pickups.reduce((acc, pickup) => {
    const assignment = allAssignments.find(a => a.pickup_id === pickup.id);
    const vehicleId = assignment?.vehicle_id || 'unassigned';
    if (!acc[vehicleId]) acc[vehicleId] = [];
    acc[vehicleId].push({ ...pickup, assignment });
    return acc;
  }, {} as Record<string, any[]>);

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
        {/* Compact Header */}
        <div className="bg-gradient-to-br from-background to-secondary/20 border-b border-border/20">
          <div className="container py-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <TreadSetAnimatedLogo size="sm" animated={true} showText={false} />
                <div>
                  <h1 className="text-xl font-bold text-foreground">Route Planning</h1>
                  <p className="text-xs text-muted-foreground">
                    Manage daily pickups and driver assignments
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {activeTab === "today" ? (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={goToPreviousDay} title="Previous day">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday} className="min-w-[80px]">
                      {format(activeDateLocal, 'MMM d') === format(new Date(), 'MMM d') ? 'Today' : format(activeDateLocal, 'MMM d')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToNextDay} title="Next day">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : activeTab === "week" ? (
                  <div className="flex gap-1 items-center">
                    <Button variant="outline" size="sm" onClick={goToPreviousWeek} title="Previous week">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="min-w-[140px] font-medium">
                      Week of {format(currentWeek, 'MMM d, yyyy')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToNextWeek} title="Next week">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs h-8"
                      onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 0 }))}
                    >
                      This Week
                    </Button>
                  </div>
                ) : null}
                
                <SchedulePickupDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      Schedule Pickup
                    </Button>
                  }
                />
                
                <VehicleManagementDialog 
                  trigger={
                    <Button variant="outline" size="sm">
                      <Truck className="h-4 w-4" />
                    </Button>
                  }
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={fixGeocodingIssues} disabled={isFixingGeocoding}>
                      <MapPin className="h-4 w-4 mr-2" />
                      {isFixingGeocoding ? "Fixing Geocoding..." : "Fix Geocoding"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setGeocodeDialogOpen(true)}>
                      <MapPin className="h-4 w-4 mr-2" />
                      Geocode Locations
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={generateMissingPdfs} disabled={isGeneratingMissingPdfs}>
                      <Package className="h-4 w-4 mr-2" />
                      {isGeneratingMissingPdfs ? "Generating PDFs..." : "Generate Missing PDFs"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <div className="py-3 px-2 sm:px-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-3">
              <TabsTrigger value="today">Day View</TabsTrigger>
              <TabsTrigger value="week">Week View</TabsTrigger>
              <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>

            {/* Today's Routes Tab */}
            <TabsContent value="today" className="space-y-3">
              {pickups.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Route className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <h3 className="font-semibold">No Pickups Scheduled</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Schedule pickups to see them here
                    </p>
                    <SchedulePickupDialog
                      trigger={
                        <Button>
                          <CalendarPlus className="h-4 w-4 mr-2" />
                          Schedule First Pickup
                        </Button>
                      }
                    />
                  </CardContent>
                </Card>
              ) : (
                <Collapsible defaultOpen={true}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="py-3 cursor-pointer hover:bg-secondary/10 transition-colors">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Package className="h-4 w-4" />
                          Scheduled Pickups - {format(activeDateLocal, 'EEE, MMM d')} ({pickups.length})
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {pickups.map((pickup) => {
                            const assignment = allAssignments.find(a => a.pickup_id === pickup.id);
                            const vehicle = vehicles.find(v => v.id === assignment?.vehicle_id);
                            
                            return (
                              <div
                                key={pickup.id}
                                className="flex flex-col gap-2 p-2 border rounded-lg hover:bg-secondary/10 transition-colors"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="font-medium text-sm truncate">
                                      {pickup.client?.company_name || 'Unknown Client'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs text-muted-foreground truncate">
                                      {pickup.location?.name || pickup.location?.address || 
                                       pickup.client?.physical_address || pickup.client?.mailing_address || 
                                       (pickup.client?.city && pickup.client?.state 
                                         ? `${pickup.client.city}, ${pickup.client.state}` 
                                         : 'No address')}
                                    </span>
                                  </div>
                                  
                                  {/* Vehicle/Driver Assignment */}
                                   {vehicle && (
                                    <div className="flex items-center gap-1.5">
                                      <Truck className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                      <span className="text-xs text-muted-foreground">{vehicle.name}</span>
                                    </div>
                                   )}
                                   
                                  
                                  {/* PTE and Revenue for completed pickups */}
                                  {(() => {
                                    const manifests = Array.isArray(pickup.manifests) ? pickup.manifests : [];
                                    const hasCompletedManifest = pickup.status === 'completed' && manifests.length > 0;
                                    
                                    if (hasCompletedManifest) {
                                      const manifest = manifests[0];
                                      const totalPTE = calculateManifestPTE(manifest);
                                      
                                      return (
                                        <div className="text-xs text-muted-foreground">
                                          <span className="font-semibold">Total: {totalPTE} PTE</span>
                                        </div>
                                      );
                                    }
                                    
                                    return null;
                                  })()}
                                  
                                  {/* Revenue */}
                                  {(() => {
                                    const manifests = Array.isArray(pickup.manifests) ? pickup.manifests : [];
                                    const hasCompletedManifest = pickup.status === 'completed' && manifests.length > 0;
                                    
                                    if (hasCompletedManifest) {
                                      const candidates = [manifests[0]?.total, pickup.final_revenue, pickup.computed_revenue];
                                      const parseNum = (v: any) => v === null || v === undefined ? null : (typeof v === 'string' ? parseFloat(v) : Number(v));
                                      const revenue = candidates
                                        .map(parseNum)
                                        .find(v => typeof v === 'number' && !Number.isNaN(v) && v > 0) ?? 0;
                                      
                                      return (
                                        <div className="flex items-center gap-1">
                                          <div className="text-xs font-semibold text-green-600">
                                            ${revenue.toFixed(2)}
                                          </div>
                                          {revenue === 0 && (
                                            <EditPickupRevenueDialog
                                              pickupId={pickup.id}
                                              manifestId={manifests[0]?.id}
                                              clientName={pickup.client?.company_name || 'Unknown'}
                                              currentRevenue={0}
                                            />
                                          )}
                                        </div>
                                      );
                                    }
                                    
                                    return null;
                                  })()}
                                  
                                  {/* Payment Method Badge */}
                                  {pickup.status === 'completed' && pickup.payment_method && (
                                    <div>
                                      {pickup.payment_method === 'CASH' && (
                                        <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700 text-xs">
                                          Cash
                                        </Badge>
                                      )}
                                      {pickup.payment_method === 'CHECK' && (
                                        <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/40 dark:text-green-200 dark:border-green-700 text-xs">
                                          Check{pickup.check_number ? ` #${pickup.check_number}` : ''}
                                        </Badge>
                                      )}
                                      {pickup.payment_method === 'INVOICE' && (
                                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-700 text-xs">
                                          To Be Invoiced
                                        </Badge>
                                      )}
                                      {pickup.payment_method === 'CARD_ON_FILE' && (
                                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700 text-xs">
                                          Card on File - Pending
                                        </Badge>
                                      )}
                                      {pickup.payment_method === 'CARD' && (
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700 text-xs">
                                          Card
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex gap-1 pt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {pickup.status.replace('_', ' ')}
                                  </Badge>
                                  
                                  <CompletePickupDialog
                                    pickup={pickup}
                                    trigger={
                                      <Button size="sm" disabled={pickup.status === 'completed'} className="h-6 text-xs px-2 flex-1">
                                        {pickup.status === 'completed' ? 'Done' : 'Complete'}
                                      </Button>
                                    }
                                  />
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-6 w-6 p-0">
                                        <MoreVertical className="h-3 w-3" />
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
                                      
                                      <DropdownMenuItem 
                                        onSelect={(e) => {
                                          e.preventDefault();
                                          setPickupToDelete(pickup);
                                          setDeleteConfirmText("");
                                          setDeleteDialogOpen(true);
                                        }}
                                        className="text-destructive focus:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Pickup
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                
                                {pickup.status === 'completed' && pickup.manifest_pdf_path && (
                                  <ManifestPDFControls
                                    manifestId={pickup.manifest_id}
                                    acroformPdfPath={pickup.manifest_pdf_path}
                                    clientEmails={[]}
                                    className="text-xs"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}
            </TabsContent>

            {/* Week View Tab */}
            <TabsContent value="week">
              <div className="space-y-2">
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

            {/* Statistics Tab - Now with real data */}
            <TabsContent value="stats">
              <RouteStatisticsPanel activeDay={activeDay} />
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

          {/* Delete confirmation dialog */}
          {pickupToDelete && (() => {
            const hasManifest = pickupToDelete.status === 'completed' && pickupToDelete.manifest_id;
            const companyName = pickupToDelete?.client?.company_name || '';
            const confirmMatch = deleteConfirmText.trim().toLowerCase() === companyName.trim().toLowerCase();

            const handleDelete = async () => {
              if (!pickupToDelete?.id) return;
              // Void manifest first if one exists
              if (hasManifest) {
                const manifestIds = pickupToDelete.manifests?.map((m: any) => m.id) || 
                  (pickupToDelete.manifest_id ? [pickupToDelete.manifest_id] : []);
                for (const mid of manifestIds) {
                  await voidManifest.mutateAsync(mid);
                }
              }
              deletePickup.mutate(pickupToDelete.id);
              setDeleteDialogOpen(false);
              setPickupToDelete(null);
              setDeleteConfirmText("");
            };

            return hasManifest ? (
              <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
                setDeleteDialogOpen(open);
                if (!open) { setPickupToDelete(null); setDeleteConfirmText(""); }
              }}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-destructive">Delete Completed Pickup</DialogTitle>
                    <DialogDescription>
                      This pickup for <span className="font-semibold">{companyName}</span> has a completed manifest. 
                      The manifest will be voided and all associated data will be permanently deleted. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 py-2">
                    <label className="text-sm font-medium">
                      Type <span className="font-bold text-destructive">{companyName}</span> to confirm
                    </label>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={companyName}
                      autoComplete="off"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setPickupToDelete(null); setDeleteConfirmText(""); }}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={!confirmMatch || deletePickup.isPending || voidManifest.isPending}
                      onClick={handleDelete}
                    >
                      {(deletePickup.isPending || voidManifest.isPending) ? "Deleting..." : "Delete Pickup"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Pickup</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this pickup for{' '}
                      <span className="font-semibold">{companyName}</span>?
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPickupToDelete(null)}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => handleDelete()}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            );
          })()}
          
          <LocationGeocodeDialog 
            open={geocodeDialogOpen} 
            onOpenChange={setGeocodeDialogOpen} 
          />
        </div>
      </main>
    </div>
  );
}
