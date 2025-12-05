import { useState } from "react";
import { useTrailerRoutes, useCreateTrailerRoute, useUpdateTrailerRoute, useAddRouteStop, useDeleteRouteStop, TrailerRoute } from "@/hooks/useTrailerRoutes";
import { useSemiHaulerDrivers } from "@/hooks/useDriverCapabilities";
import { useTrailerVehicles } from "@/hooks/useTrailerVehicles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, CalendarIcon, Truck, MapPin, User, GripVertical, Trash2, Play, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TrailerRoutes() {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { data: routes, isLoading } = useTrailerRoutes(selectedDate?.toISOString().split('T')[0]);
  const { data: drivers } = useSemiHaulerDrivers();
  const { data: vehicles } = useTrailerVehicles();
  
  const createRoute = useCreateTrailerRoute();
  const updateRoute = useUpdateTrailerRoute();
  const addStop = useAddRouteStop();
  const deleteStop = useDeleteRouteStop();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<TrailerRoute | null>(null);
  const [newRoute, setNewRoute] = useState({
    route_name: '',
    scheduled_date: new Date(),
    driver_id: '',
    vehicle_id: '',
    notes: '',
  });
  const [newStop, setNewStop] = useState({
    location_name: '',
    location_address: '',
    contact_name: '',
    contact_phone: '',
    instructions: '',
  });

  const handleCreateRoute = async () => {
    if (!newRoute.route_name.trim()) return;
    
    await createRoute.mutateAsync({
      route_name: newRoute.route_name,
      scheduled_date: format(newRoute.scheduled_date, 'yyyy-MM-dd'),
      driver_id: newRoute.driver_id || undefined,
      vehicle_id: newRoute.vehicle_id || undefined,
      notes: newRoute.notes || undefined,
    });
    
    setNewRoute({
      route_name: '',
      scheduled_date: new Date(),
      driver_id: '',
      vehicle_id: '',
      notes: '',
    });
    setShowCreateDialog(false);
  };

  const handleAddStop = async () => {
    if (!selectedRoute || !newStop.location_name.trim()) return;
    
    const nextSequence = (selectedRoute.stops?.length || 0) + 1;
    
    await addStop.mutateAsync({
      route_id: selectedRoute.id,
      location_name: newStop.location_name,
      location_address: newStop.location_address || undefined,
      sequence_number: nextSequence,
      contact_name: newStop.contact_name || undefined,
      contact_phone: newStop.contact_phone || undefined,
      instructions: newStop.instructions || undefined,
    });
    
    setNewStop({
      location_name: '',
      location_address: '',
      contact_name: '',
      contact_phone: '',
      instructions: '',
    });
  };

  const handleStatusChange = async (routeId: string, status: string) => {
    await updateRoute.mutateAsync({ id: routeId, status: status as any });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trailer Routes</h1>
          <p className="text-muted-foreground">Plan and manage trailer move routes</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'All Dates'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
              />
              {selectedDate && (
                <div className="p-2 border-t">
                  <Button 
                    variant="ghost" 
                    className="w-full" 
                    onClick={() => setSelectedDate(undefined)}
                  >
                    Clear Filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Route
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Trailer Route</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Route Name</Label>
                  <Input
                    value={newRoute.route_name}
                    onChange={(e) => setNewRoute(prev => ({ ...prev, route_name: e.target.value }))}
                    placeholder="e.g., Downtown Trailer Swap"
                  />
                </div>
                
                <div>
                  <Label>Scheduled Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(newRoute.scheduled_date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newRoute.scheduled_date}
                        onSelect={(date) => date && setNewRoute(prev => ({ ...prev, scheduled_date: date }))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label>Assign Driver (Semi-Hauler Only)</Label>
                  <Select
                    value={newRoute.driver_id}
                    onValueChange={(value) => setNewRoute(prev => ({ ...prev, driver_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.first_name} {driver.last_name} ({driver.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!drivers || drivers.length === 0) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No drivers with semi_hauler capability found
                    </p>
                  )}
                </div>
                
                <div>
                  <Label>Assign Vehicle</Label>
                  <Select
                    value={newRoute.vehicle_id}
                    onValueChange={(value) => setNewRoute(prev => ({ ...prev, vehicle_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles?.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.vehicle_number} ({vehicle.vehicle_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={newRoute.notes}
                    onChange={(e) => setNewRoute(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any special instructions..."
                  />
                </div>
                
                <Button 
                  onClick={handleCreateRoute}
                  disabled={!newRoute.route_name.trim() || createRoute.isPending}
                  className="w-full"
                >
                  {createRoute.isPending ? 'Creating...' : 'Create Route'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Routes List */}
      <div className="grid gap-4">
        {routes?.map(route => (
          <Card key={route.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">{route.route_name}</CardTitle>
                  <Badge className={STATUS_COLORS[route.status]}>
                    {route.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {route.status === 'draft' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(route.id, 'scheduled')}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Schedule
                    </Button>
                  )}
                  {route.status === 'scheduled' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(route.id, 'in_progress')}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  )}
                  {route.status === 'in_progress' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange(route.id, 'completed')}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => setSelectedRoute(route)}
                  >
                    Edit Stops
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  {format(new Date(route.scheduled_date), 'MMM d, yyyy')}
                </span>
                {route.driver && (
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {route.driver.first_name} {route.driver.last_name}
                  </span>
                )}
                {route.vehicle && (
                  <span className="flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    {route.vehicle.vehicle_number}
                  </span>
                )}
              </div>
            </CardHeader>
            {route.stops && route.stops.length > 0 && (
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {route.stops
                    .sort((a, b) => a.sequence_number - b.sequence_number)
                    .map((stop, index) => (
                      <div 
                        key={stop.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg bg-muted/50",
                          stop.completed_at && "opacity-60"
                        )}
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{stop.location_name}</div>
                          {stop.location_address && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {stop.location_address}
                            </div>
                          )}
                        </div>
                        {stop.completed_at && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
        
        {(!routes || routes.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No trailer routes found</p>
              <p className="text-sm">Create a new route to get started</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Stops Dialog */}
      <Dialog open={!!selectedRoute} onOpenChange={() => setSelectedRoute(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Stops - {selectedRoute?.route_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Existing Stops */}
            <div className="space-y-2">
              {selectedRoute?.stops
                ?.sort((a, b) => a.sequence_number - b.sequence_number)
                .map((stop, index) => (
                  <div 
                    key={stop.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{stop.location_name}</div>
                      {stop.contact_name && (
                        <div className="text-sm text-muted-foreground">
                          Contact: {stop.contact_name} {stop.contact_phone && `• ${stop.contact_phone}`}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteStop.mutate(stop.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>

            {/* Add Stop Form */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium">Add Stop</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Location Name</Label>
                  <Input
                    value={newStop.location_name}
                    onChange={(e) => setNewStop(prev => ({ ...prev, location_name: e.target.value }))}
                    placeholder="e.g., Warehouse A"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={newStop.location_address}
                    onChange={(e) => setNewStop(prev => ({ ...prev, location_address: e.target.value }))}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={newStop.contact_name}
                    onChange={(e) => setNewStop(prev => ({ ...prev, contact_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input
                    value={newStop.contact_phone}
                    onChange={(e) => setNewStop(prev => ({ ...prev, contact_phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Instructions</Label>
                <Textarea
                  value={newStop.instructions}
                  onChange={(e) => setNewStop(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Special instructions for this stop..."
                />
              </div>
              <Button 
                onClick={handleAddStop}
                disabled={!newStop.location_name.trim() || addStop.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Stop
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
