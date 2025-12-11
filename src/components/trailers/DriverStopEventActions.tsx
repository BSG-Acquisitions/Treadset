import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TrailerSignatureDialog } from "./TrailerSignatureDialog";
import { useCompleteTrailerEvent } from "@/hooks/useStopTrailerEvents";
import { TrailerEventType, EVENT_TYPE_LABELS } from "@/hooks/useTrailerEvents";
import { Trailer } from "@/hooks/useTrailers";
import { 
  Package, 
  PackageOpen, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  RefreshCw, 
  Clock,
  Loader2,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DriverStopEventActionsProps {
  stopId: string;
  routeId: string;
  locationName: string;
  locationId?: string;
  trailers: Trailer[];
  completedEvents: { event_type: string; trailer_id: string }[];
  onEventCompleted: () => void;
}

// Event configuration with icons and requirements
const EVENT_CONFIG: Record<TrailerEventType, { 
  icon: typeof Package; 
  label: string; 
  buttonText: string;
  requiresSignature: boolean;
  color: string;
}> = {
  pickup_empty: { 
    icon: PackageOpen, 
    label: 'Pick Up Empty', 
    buttonText: 'Confirm Empty Pickup',
    requiresSignature: false,
    color: 'text-blue-600'
  },
  drop_empty: { 
    icon: ArrowDownToLine, 
    label: 'Drop Off Empty', 
    buttonText: 'Confirm Empty Drop',
    requiresSignature: false,
    color: 'text-blue-600'
  },
  pickup_full: { 
    icon: Package, 
    label: 'Pick Up Full', 
    buttonText: 'Confirm Full Pickup',
    requiresSignature: true,
    color: 'text-green-600'
  },
  drop_full: { 
    icon: ArrowUpFromLine, 
    label: 'Drop Off Full', 
    buttonText: 'Confirm Full Drop',
    requiresSignature: true,
    color: 'text-green-600'
  },
  swap: { 
    icon: RefreshCw, 
    label: 'Swap Trailer', 
    buttonText: 'Complete Swap',
    requiresSignature: false,
    color: 'text-purple-600'
  },
  stage_empty: { 
    icon: ArrowDownToLine, 
    label: 'Stage Empty', 
    buttonText: 'Confirm Empty Staging',
    requiresSignature: false,
    color: 'text-orange-600'
  },
  external_pickup: { 
    icon: ArrowUpFromLine, 
    label: 'External Pickup', 
    buttonText: 'Confirm External Pickup',
    requiresSignature: false,
    color: 'text-gray-600'
  },
  external_drop: { 
    icon: ArrowDownToLine, 
    label: 'External Drop', 
    buttonText: 'Confirm External Drop',
    requiresSignature: false,
    color: 'text-gray-600'
  },
};

const DRIVER_EVENT_TYPES: TrailerEventType[] = [
  'pickup_empty',
  'drop_empty',
  'pickup_full',
  'drop_full',
  'swap',
  'stage_empty',
];

export function DriverStopEventActions({
  stopId,
  routeId,
  locationName,
  locationId,
  trailers,
  completedEvents,
  onEventCompleted,
}: DriverStopEventActionsProps) {
  const [selectedEventType, setSelectedEventType] = useState<TrailerEventType | null>(null);
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>("");
  const [swapDropTrailerId, setSwapDropTrailerId] = useState<string>("");
  const [swapPickupTrailerId, setSwapPickupTrailerId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  
  const completeEvent = useCompleteTrailerEvent();

  const isEventCompleted = (eventType: TrailerEventType, trailerId?: string) => {
    return completedEvents.some(e => 
      e.event_type === eventType && 
      (trailerId ? e.trailer_id === trailerId : true)
    );
  };

  const handleEventSelect = (eventType: TrailerEventType) => {
    setSelectedEventType(eventType);
    setSelectedTrailerId("");
    setSwapDropTrailerId("");
    setSwapPickupTrailerId("");
    setNotes("");
    setShowDialog(true);
  };

  const handleCompleteEvent = async (
    signaturePath?: string, 
    signatureNotes?: string,
    contactInfo?: { email?: string; name?: string }
  ) => {
    if (!selectedEventType) return;

    const finalNotes = signatureNotes || notes;

    if (selectedEventType === 'swap') {
      // Handle swap as two events
      if (!swapDropTrailerId || !swapPickupTrailerId) return;

      // First: drop empty
      await completeEvent.mutateAsync({
        trailer_id: swapDropTrailerId,
        event_type: 'drop_empty',
        stop_id: stopId,
        route_id: routeId,
        location_name: locationName,
        location_id: locationId,
        notes: `Swap - Drop Empty: ${finalNotes}`,
      });

      // Second: pickup full (this one may require signature)
      await completeEvent.mutateAsync({
        trailer_id: swapPickupTrailerId,
        event_type: 'pickup_full',
        stop_id: stopId,
        route_id: routeId,
        location_name: locationName,
        location_id: locationId,
        notes: `Swap - Pickup Full: ${finalNotes}`,
        signature_path: signaturePath,
        contact_email: contactInfo?.email,
        contact_name: contactInfo?.name,
      });
    } else {
      await completeEvent.mutateAsync({
        trailer_id: selectedTrailerId,
        event_type: selectedEventType,
        stop_id: stopId,
        route_id: routeId,
        location_name: locationName,
        location_id: locationId,
        notes: finalNotes,
        signature_path: signaturePath,
        contact_email: contactInfo?.email,
        contact_name: contactInfo?.name,
      });
    }

    setShowDialog(false);
    setShowSignatureDialog(false);
    setSelectedEventType(null);
    onEventCompleted();
  };

  const handleProceed = () => {
    if (!selectedEventType) return;

    const config = EVENT_CONFIG[selectedEventType];
    
    if (config.requiresSignature) {
      setShowDialog(false);
      setShowSignatureDialog(true);
    } else {
      handleCompleteEvent();
    }
  };

  const getSelectedTrailer = () => {
    return trailers.find(t => t.id === selectedTrailerId);
  };

  const canProceed = () => {
    if (!selectedEventType) return false;
    if (selectedEventType === 'swap') {
      return swapDropTrailerId && swapPickupTrailerId && swapDropTrailerId !== swapPickupTrailerId;
    }
    return !!selectedTrailerId;
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Record Event</Label>
      
      <div className="grid grid-cols-2 gap-2">
        {DRIVER_EVENT_TYPES.map(eventType => {
          const config = EVENT_CONFIG[eventType];
          const Icon = config.icon;
          const completed = isEventCompleted(eventType);
          
          return (
            <Button
              key={eventType}
              variant={completed ? "secondary" : "outline"}
              className={cn(
                "justify-start h-auto py-3",
                completed && "opacity-50"
              )}
              onClick={() => handleEventSelect(eventType)}
              disabled={completed}
            >
              {completed ? (
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
              ) : (
                <Icon className={cn("h-4 w-4 mr-2", config.color)} />
              )}
              <span className="text-xs">{config.buttonText}</span>
            </Button>
          );
        })}
      </div>

      {/* Event Configuration Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEventType && EVENT_CONFIG[selectedEventType]?.label}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">{locationName}</div>
            </div>

            {selectedEventType === 'swap' ? (
              <>
                <div>
                  <Label>Drop Empty Trailer</Label>
                  <Select value={swapDropTrailerId} onValueChange={setSwapDropTrailerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trailer to drop..." />
                    </SelectTrigger>
                    <SelectContent>
                      {trailers.map(trailer => (
                        <SelectItem key={trailer.id} value={trailer.id}>
                          {trailer.trailer_number} ({trailer.current_status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Pick Up Full Trailer</Label>
                  <Select value={swapPickupTrailerId} onValueChange={setSwapPickupTrailerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trailer to pick up..." />
                    </SelectTrigger>
                    <SelectContent>
                      {trailers.filter(t => t.id !== swapDropTrailerId).map(trailer => (
                        <SelectItem key={trailer.id} value={trailer.id}>
                          {trailer.trailer_number} ({trailer.current_status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div>
                <Label>Select Trailer</Label>
                <Select value={selectedTrailerId} onValueChange={setSelectedTrailerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose trailer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {trailers.map(trailer => (
                      <SelectItem key={trailer.id} value={trailer.id}>
                        {trailer.trailer_number} ({trailer.current_status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedEventType && !EVENT_CONFIG[selectedEventType].requiresSignature && (
              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details..."
                  rows={2}
                />
              </div>
            )}

            {selectedEventType && EVENT_CONFIG[selectedEventType].requiresSignature && (
              <Badge variant="secondary" className="w-full justify-center py-2">
                Signature required on next screen
              </Badge>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleProceed} 
              disabled={!canProceed() || completeEvent.isPending}
            >
              {completeEvent.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                selectedEventType && EVENT_CONFIG[selectedEventType].requiresSignature 
                  ? 'Continue to Signature' 
                  : 'Complete Event'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Signature Dialog */}
      {selectedEventType && (
        <TrailerSignatureDialog
          open={showSignatureDialog}
          onOpenChange={setShowSignatureDialog}
          eventType={selectedEventType}
          trailerNumber={getSelectedTrailer()?.trailer_number || ''}
          locationName={locationName}
          onComplete={async (signaturePath, signatureNotes, contactInfo) => {
            await handleCompleteEvent(signaturePath || undefined, signatureNotes, contactInfo);
          }}
        />
      )}
    </div>
  );
}