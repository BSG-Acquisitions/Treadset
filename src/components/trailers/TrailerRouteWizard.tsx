import { useState } from "react";
import { useCreateTrailerRoute, useAddRouteStop } from "@/hooks/useTrailerRoutes";
import { useCreateTrailerEvent, TrailerEventType, EVENT_TYPE_LABELS } from "@/hooks/useTrailerEvents";
import { useSemiHaulerDrivers } from "@/hooks/useDriverCapabilities";
import { useTrailerVehicles } from "@/hooks/useTrailerVehicles";
import { useTrailers } from "@/hooks/useTrailers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Trash2, ChevronLeft, ChevronRight, Check, MapPin, Container } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface StopData {
  id: string;
  location_name: string;
  location_address: string;
  contact_name: string;
  contact_phone: string;
  instructions: string;
  events: EventData[];
}

interface EventData {
  id: string;
  event_type: TrailerEventType;
  trailer_id: string;
  notes: string;
}

interface TrailerRouteWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function TrailerRouteWizard({ onComplete, onCancel }: TrailerRouteWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1 data
  const [routeDetails, setRouteDetails] = useState({
    route_name: '',
    scheduled_date: new Date(),
    driver_id: '',
    vehicle_id: '',
    notes: '',
  });
  
  // Step 2 data
  const [stops, setStops] = useState<StopData[]>([]);
  const [newStop, setNewStop] = useState<Omit<StopData, 'id' | 'events'>>({
    location_name: '',
    location_address: '',
    contact_name: '',
    contact_phone: '',
    instructions: '',
  });
  
  // Hooks
  const { data: drivers } = useSemiHaulerDrivers();
  const { data: vehicles } = useTrailerVehicles();
  const { data: trailers } = useTrailers();
  const createRoute = useCreateTrailerRoute();
  const addStop = useAddRouteStop();
  const createEvent = useCreateTrailerEvent();

  // Step 1 validation
  const isStep1Valid = routeDetails.route_name.trim() !== '';
  
  // Step 2 validation
  const isStep2Valid = stops.length > 0;
  
  // Step 3 validation - each stop should have at least one event
  const isStep3Valid = stops.every(stop => stop.events.length > 0);

  const addNewStop = () => {
    if (!newStop.location_name.trim()) {
      toast.error('Location name is required');
      return;
    }
    
    setStops(prev => [...prev, {
      ...newStop,
      id: crypto.randomUUID(),
      events: [],
    }]);
    
    setNewStop({
      location_name: '',
      location_address: '',
      contact_name: '',
      contact_phone: '',
      instructions: '',
    });
  };

  const removeStop = (stopId: string) => {
    setStops(prev => prev.filter(s => s.id !== stopId));
  };

  const addEventToStop = (stopId: string, eventType: TrailerEventType, trailerId: string, notes: string = '') => {
    if (!trailerId) {
      toast.error('Please select a trailer');
      return;
    }
    
    // Handle swap - creates two events
    if (eventType === 'swap') {
      setStops(prev => prev.map(stop => {
        if (stop.id !== stopId) return stop;
        return {
          ...stop,
          events: [
            ...stop.events,
            { id: crypto.randomUUID(), event_type: 'drop_empty', trailer_id: trailerId, notes },
            { id: crypto.randomUUID(), event_type: 'pickup_full', trailer_id: trailerId, notes: `Swap: ${notes}` },
          ],
        };
      }));
    } else {
      setStops(prev => prev.map(stop => {
        if (stop.id !== stopId) return stop;
        return {
          ...stop,
          events: [...stop.events, { id: crypto.randomUUID(), event_type: eventType, trailer_id: trailerId, notes }],
        };
      }));
    }
  };

  const removeEventFromStop = (stopId: string, eventId: string) => {
    setStops(prev => prev.map(stop => {
      if (stop.id !== stopId) return stop;
      return {
        ...stop,
        events: stop.events.filter(e => e.id !== eventId),
      };
    }));
  };

  const handleSubmit = async () => {
    if (!isStep1Valid || !isStep2Valid) {
      toast.error('Please complete all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create the route
      const route = await createRoute.mutateAsync({
        route_name: routeDetails.route_name,
        scheduled_date: format(routeDetails.scheduled_date, 'yyyy-MM-dd'),
        driver_id: routeDetails.driver_id || undefined,
        vehicle_id: routeDetails.vehicle_id || undefined,
        notes: routeDetails.notes || undefined,
      });
      
      // Create stops and events
      for (let i = 0; i < stops.length; i++) {
        const stopData = stops[i];
        
        const stop = await addStop.mutateAsync({
          route_id: route.id,
          location_name: stopData.location_name,
          location_address: stopData.location_address || undefined,
          sequence_number: i + 1,
          contact_name: stopData.contact_name || undefined,
          contact_phone: stopData.contact_phone || undefined,
          instructions: stopData.instructions || undefined,
        });
        
        // Create events for this stop
        for (const event of stopData.events) {
          await createEvent.mutateAsync({
            trailer_id: event.trailer_id,
            event_type: event.event_type,
            location_name: stopData.location_name,
            notes: event.notes || undefined,
          });
        }
      }
      
      toast.success('Trailer route created successfully');
      onComplete();
    } catch (error) {
      console.error('Failed to create route:', error);
      toast.error('Failed to create route');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step
                  ? 'bg-primary text-primary-foreground'
                  : s < step
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && (
              <div className={`w-12 h-1 mx-1 ${s < step ? 'bg-green-500' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>
      
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">
          {step === 1 && 'Route Details'}
          {step === 2 && 'Add Stops'}
          {step === 3 && 'Assign Trailer Events'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {step === 1 && 'Enter basic route information'}
          {step === 2 && 'Define the stops for this route'}
          {step === 3 && 'Assign trailer events to each stop'}
        </p>
      </div>

      {/* Step 1: Route Details */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label>Route Name *</Label>
            <Input
              value={routeDetails.route_name}
              onChange={(e) => setRouteDetails(prev => ({ ...prev, route_name: e.target.value }))}
              placeholder="e.g., Downtown Trailer Swap"
            />
          </div>
          
          <div>
            <Label>Scheduled Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(routeDetails.scheduled_date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={routeDetails.scheduled_date}
                  onSelect={(date) => date && setRouteDetails(prev => ({ ...prev, scheduled_date: date }))}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div>
            <Label>Assign Driver (Semi-Hauler Only)</Label>
            <Select
              value={routeDetails.driver_id}
              onValueChange={(value) => setRouteDetails(prev => ({ ...prev, driver_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select driver..." />
              </SelectTrigger>
              <SelectContent>
                {drivers?.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.first_name} {driver.last_name}
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
              value={routeDetails.vehicle_id}
              onValueChange={(value) => setRouteDetails(prev => ({ ...prev, vehicle_id: value }))}
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
              value={routeDetails.notes}
              onChange={(e) => setRouteDetails(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any special instructions..."
            />
          </div>
        </div>
      )}

      {/* Step 2: Add Stops */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Existing stops */}
          {stops.length > 0 && (
            <div className="space-y-2">
              {stops.map((stop, index) => (
                <Card key={stop.id} className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeStop(stop.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Add stop form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Stop</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Location Name *</Label>
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
                <Label>Special Instructions</Label>
                <Textarea
                  value={newStop.instructions}
                  onChange={(e) => setNewStop(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Gate code, contact info, etc."
                />
              </div>
              <Button onClick={addNewStop} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Stop
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Assign Trailer Events */}
      {step === 3 && (
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {stops.map((stop, index) => (
            <StopEventEditor
              key={stop.id}
              stop={stop}
              stopIndex={index}
              trailers={trailers || []}
              onAddEvent={(eventType, trailerId, notes) => addEventToStop(stop.id, eventType, trailerId, notes)}
              onRemoveEvent={(eventId) => removeEventFromStop(stop.id, eventId)}
            />
          ))}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => step === 1 ? onCancel() : setStep(step - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        
        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Route'}
          </Button>
        )}
      </div>
    </div>
  );
}

// Sub-component for editing events on a stop
interface StopEventEditorProps {
  stop: StopData;
  stopIndex: number;
  trailers: { id: string; trailer_number: string }[];
  onAddEvent: (eventType: TrailerEventType, trailerId: string, notes: string) => void;
  onRemoveEvent: (eventId: string) => void;
}

function StopEventEditor({ stop, stopIndex, trailers, onAddEvent, onRemoveEvent }: StopEventEditorProps) {
  const [selectedEventType, setSelectedEventType] = useState<TrailerEventType | ''>('');
  const [selectedTrailerId, setSelectedTrailerId] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  const handleAddEvent = () => {
    if (!selectedEventType || !selectedTrailerId) {
      toast.error('Please select event type and trailer');
      return;
    }
    onAddEvent(selectedEventType, selectedTrailerId, eventNotes);
    setSelectedEventType('');
    setSelectedTrailerId('');
    setEventNotes('');
  };

  const eventTypes: TrailerEventType[] = [
    'pickup_empty',
    'drop_empty',
    'pickup_full',
    'drop_full',
    'stage_empty',
    'waiting_unload',
    'external_pickup',
    'external_drop',
    'swap',
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
            {stopIndex + 1}
          </div>
          <CardTitle className="text-base">{stop.location_name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Existing events */}
        {stop.events.length > 0 && (
          <div className="space-y-2">
            {stop.events.map((event) => {
              const trailer = trailers.find(t => t.id === event.trailer_id);
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-2 p-2 rounded bg-muted/50"
                >
                  <Container className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline">{EVENT_TYPE_LABELS[event.event_type]}</Badge>
                  <span className="text-sm">{trailer?.trailer_number || 'Unknown'}</span>
                  {event.notes && <span className="text-xs text-muted-foreground">({event.notes})</span>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6"
                    onClick={() => onRemoveEvent(event.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Add event form */}
        <div className="grid grid-cols-3 gap-2">
          <Select value={selectedEventType} onValueChange={(v) => setSelectedEventType(v as TrailerEventType)}>
            <SelectTrigger>
              <SelectValue placeholder="Event type..." />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {EVENT_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedTrailerId} onValueChange={setSelectedTrailerId}>
            <SelectTrigger>
              <SelectValue placeholder="Trailer..." />
            </SelectTrigger>
            <SelectContent>
              {trailers.map(trailer => (
                <SelectItem key={trailer.id} value={trailer.id}>
                  {trailer.trailer_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button onClick={handleAddEvent} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <Input
          value={eventNotes}
          onChange={(e) => setEventNotes(e.target.value)}
          placeholder="Event notes (optional)"
          className="text-sm"
        />
      </CardContent>
    </Card>
  );
}
