import { useState } from "react";
import { useDriverTrailerRoutes, useUpdateTrailerRoute, TrailerRouteStop } from "@/hooks/useTrailerRoutes";
import { useTrailers } from "@/hooks/useTrailers";
import { useCreateTrailerEvent, EVENT_TYPE_LABELS, TrailerEventType } from "@/hooks/useTrailerEvents";
import { useHasSemiHaulerCapability } from "@/hooks/useDriverCapabilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Truck, MapPin, Phone, User, Calendar, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STOP_EVENT_TYPES: TrailerEventType[] = [
  'pickup_empty',
  'drop_empty',
  'pickup_full',
  'drop_full',
  'swap',
];

export default function DriverTrailerAssignments() {
  const { hasSemiHauler, isLoading: capabilityLoading } = useHasSemiHaulerCapability();
  const { data: routes, isLoading: routesLoading, refetch } = useDriverTrailerRoutes();
  const { data: trailers } = useTrailers();
  const createEvent = useCreateTrailerEvent();
  const updateRoute = useUpdateTrailerRoute();
  
  const [selectedStop, setSelectedStop] = useState<{ routeId: string; stop: TrailerRouteStop } | null>(null);
  const [eventForm, setEventForm] = useState({
    trailer_id: '',
    event_type: '' as TrailerEventType | '',
    notes: '',
  });

  const handleRecordEvent = async () => {
    if (!selectedStop || !eventForm.trailer_id || !eventForm.event_type) {
      toast.error('Please select a trailer and event type');
      return;
    }
    
    await createEvent.mutateAsync({
      trailer_id: eventForm.trailer_id,
      event_type: eventForm.event_type,
      route_id: selectedStop.routeId,
      stop_id: selectedStop.stop.id,
      location_name: selectedStop.stop.location_name || undefined,
      location_id: selectedStop.stop.location_id || undefined,
      notes: eventForm.notes || undefined,
    });
    
    // Mark stop as completed
    await supabase
      .from('trailer_route_stops')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', selectedStop.stop.id);
    
    setSelectedStop(null);
    setEventForm({ trailer_id: '', event_type: '', notes: '' });
    refetch();
  };

  const handleStartRoute = async (routeId: string) => {
    await updateRoute.mutateAsync({ id: routeId, status: 'in_progress' });
  };

  const handleCompleteRoute = async (routeId: string) => {
    await updateRoute.mutateAsync({ id: routeId, status: 'completed' });
  };

  if (capabilityLoading || routesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!hasSemiHauler) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              You need the semi_hauler capability to access trailer assignments.
              <br />
              Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Trailer Assignments</h1>
        <p className="text-muted-foreground">Your scheduled trailer move routes</p>
      </div>

      {(!routes || routes.length === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No trailer routes assigned</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {routes.map(route => {
            const completedStops = route.stops?.filter(s => s.completed_at).length || 0;
            const totalStops = route.stops?.length || 0;
            const allCompleted = completedStops === totalStops && totalStops > 0;
            
            return (
              <Card key={route.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{route.route_name}</CardTitle>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(route.scheduled_date), 'EEEE, MMM d')}
                        </span>
                        {route.vehicle && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-4 w-4" />
                            {route.vehicle.vehicle_number}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={route.status === 'in_progress' ? 'default' : 'secondary'}>
                        {route.status.replace('_', ' ')}
                      </Badge>
                      {route.status === 'scheduled' && (
                        <Button size="sm" onClick={() => handleStartRoute(route.id)}>
                          Start Route
                        </Button>
                      )}
                      {route.status === 'in_progress' && allCompleted && (
                        <Button size="sm" onClick={() => handleCompleteRoute(route.id)}>
                          Complete Route
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="text-sm text-muted-foreground mb-1">
                      Progress: {completedStops} / {totalStops} stops
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {route.stops
                      ?.sort((a, b) => a.sequence_number - b.sequence_number)
                      .map((stop, index) => (
                        <div
                          key={stop.id}
                          className={cn(
                            "p-4 rounded-lg border",
                            stop.completed_at 
                              ? "bg-green-50 border-green-200" 
                              : "bg-card hover:bg-muted/50 cursor-pointer"
                          )}
                          onClick={() => {
                            if (!stop.completed_at && route.status === 'in_progress') {
                              setSelectedStop({ routeId: route.id, stop });
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                              stop.completed_at 
                                ? "bg-green-600 text-white" 
                                : "bg-primary text-primary-foreground"
                            )}>
                              {stop.completed_at ? <CheckCircle className="h-4 w-4" /> : index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{stop.location_name}</div>
                              {stop.location_address && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {stop.location_address}
                                </div>
                              )}
                              {stop.contact_name && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <User className="h-3 w-3" />
                                  {stop.contact_name}
                                  {stop.contact_phone && (
                                    <a 
                                      href={`tel:${stop.contact_phone}`}
                                      className="flex items-center gap-1 ml-2 text-primary hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Phone className="h-3 w-3" />
                                      {stop.contact_phone}
                                    </a>
                                  )}
                                </div>
                              )}
                              {stop.instructions && (
                                <div className="mt-2 p-2 bg-muted rounded text-sm">
                                  {stop.instructions}
                                </div>
                              )}
                            </div>
                            {!stop.completed_at && route.status === 'in_progress' && (
                              <ArrowRight className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Record Event Dialog */}
      <Dialog open={!!selectedStop} onOpenChange={() => setSelectedStop(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Trailer Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="font-medium">{selectedStop?.stop.location_name}</div>
              {selectedStop?.stop.location_address && (
                <div className="text-sm text-muted-foreground">
                  {selectedStop.stop.location_address}
                </div>
              )}
            </div>

            <div>
              <Label>Select Trailer</Label>
              <Select
                value={eventForm.trailer_id}
                onValueChange={(value) => setEventForm(prev => ({ ...prev, trailer_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose trailer..." />
                </SelectTrigger>
                <SelectContent>
                  {trailers?.map(trailer => (
                    <SelectItem key={trailer.id} value={trailer.id}>
                      {trailer.trailer_number} ({trailer.current_status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Event Type</Label>
              <Select
                value={eventForm.event_type}
                onValueChange={(value) => setEventForm(prev => ({ ...prev, event_type: value as TrailerEventType }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="What are you doing?" />
                </SelectTrigger>
                <SelectContent>
                  {STOP_EVENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={eventForm.notes}
                onChange={(e) => setEventForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional details..."
              />
            </div>

            <Button 
              onClick={handleRecordEvent}
              disabled={!eventForm.trailer_id || !eventForm.event_type || createEvent.isPending}
              className="w-full"
            >
              {createEvent.isPending ? 'Recording...' : 'Complete Stop'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
