import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TrailerSignatureDialog } from "./TrailerSignatureDialog";
import { DriverManifestCreationWizard } from "@/components/driver/DriverManifestCreationWizard";
import { useCompleteTrailerEvent } from "@/hooks/useStopTrailerEvents";
import { TrailerEventType, EVENT_TYPE_LABELS } from "@/hooks/useTrailerEvents";
import { Trailer } from "@/hooks/useTrailers";
import { getFilteredTrailers } from "@/lib/trailerFilterUtils";
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
  onTruckTrailerIds?: Set<string>;
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

const NEXT_EVENT_SUGGESTION: Partial<Record<TrailerEventType, TrailerEventType>> = {
  pickup_empty: 'drop_empty',
  drop_empty: 'pickup_full',
  pickup_full: 'drop_full',
  drop_full: 'pickup_empty',
};

export function DriverStopEventActions({
  stopId,
  routeId,
  locationName,
  locationId,
  trailers,
  completedEvents,
  onTruckTrailerIds = new Set(),
  onEventCompleted,
}: DriverStopEventActionsProps) {
  const [selectedEventType, setSelectedEventType] = useState<TrailerEventType | null>(null);
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>("");
  const [swapDropTrailerId, setSwapDropTrailerId] = useState<string>("");
  const [swapPickupTrailerId, setSwapPickupTrailerId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showManifestWizard, setShowManifestWizard] = useState(false);
  
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
    setShowManifestWizard(false);
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
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DRIVER_EVENT_TYPES.map(eventType => {
          const config = EVENT_CONFIG[eventType];
          const Icon = config.icon;
          const completed = isEventCompleted(eventType);
          
          return (
            <Button
              key={eventType}
              variant={completed ? "secondary" : "outline"}
              className={cn(
                "justify-start h-auto py-3 min-h-[44px]",
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
                  {(() => {
                    const { suggested, other } = getFilteredTrailers('drop_empty', locationName, locationId, trailers, onTruckTrailerIds);
                    return (
                      <Select value={swapDropTrailerId} onValueChange={setSwapDropTrailerId}>
                        <SelectTrigger><SelectValue placeholder="Select trailer to drop..." /></SelectTrigger>
                        <SelectContent>
                          {suggested.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-xs">On your truck</SelectLabel>
                              {suggested.map(t => <SelectItem key={t.id} value={t.id}>{t.trailer_number} ({t.current_status})</SelectItem>)}
                            </SelectGroup>
                          )}
                          {suggested.length > 0 && other.length > 0 && <Separator className="my-1" />}
                          {other.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-xs">Other trailers</SelectLabel>
                              {other.map(t => <SelectItem key={t.id} value={t.id}>{t.trailer_number} ({t.current_status})</SelectItem>)}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>
                
                <div>
                  <Label>Pick Up Full Trailer</Label>
                  {(() => {
                    const { suggested, other } = getFilteredTrailers('pickup_full', locationName, locationId, trailers, onTruckTrailerIds);
                    const filtered = { suggested: suggested.filter(t => t.id !== swapDropTrailerId), other: other.filter(t => t.id !== swapDropTrailerId) };
                    return (
                      <Select value={swapPickupTrailerId} onValueChange={setSwapPickupTrailerId}>
                        <SelectTrigger><SelectValue placeholder="Select trailer to pick up..." /></SelectTrigger>
                        <SelectContent>
                          {filtered.suggested.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-xs">At this location</SelectLabel>
                              {filtered.suggested.map(t => <SelectItem key={t.id} value={t.id}>{t.trailer_number} ({t.current_status})</SelectItem>)}
                            </SelectGroup>
                          )}
                          {filtered.suggested.length > 0 && filtered.other.length > 0 && <Separator className="my-1" />}
                          {filtered.other.length > 0 && (
                            <SelectGroup>
                              <SelectLabel className="text-xs">Other trailers</SelectLabel>
                              {filtered.other.map(t => <SelectItem key={t.id} value={t.id}>{t.trailer_number} ({t.current_status})</SelectItem>)}
                            </SelectGroup>
                          )}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>
              </>
            ) : (
              <div>
                <Label>Select Trailer</Label>
                {(() => {
                  const { suggested, other } = getFilteredTrailers(
                    selectedEventType || 'pickup_empty',
                    locationName,
                    locationId,
                    trailers,
                    onTruckTrailerIds
                  );
                  return (
                    <Select value={selectedTrailerId} onValueChange={setSelectedTrailerId}>
                      <SelectTrigger><SelectValue placeholder="Choose trailer..." /></SelectTrigger>
                      <SelectContent>
                        {suggested.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="text-xs">
                              {selectedEventType?.includes('drop') ? 'On your truck' : 'At this location'}
                            </SelectLabel>
                            {suggested.map(t => <SelectItem key={t.id} value={t.id}>{t.trailer_number} ({t.current_status})</SelectItem>)}
                          </SelectGroup>
                        )}
                        {suggested.length > 0 && other.length > 0 && <Separator className="my-1" />}
                        {other.length > 0 && (
                          <SelectGroup>
                            <SelectLabel className="text-xs">Other trailers</SelectLabel>
                            {other.map(t => <SelectItem key={t.id} value={t.id}>{t.trailer_number} ({t.current_status})</SelectItem>)}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  );
                })()}
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
            {selectedEventType && ['pickup_full', 'drop_full'].includes(selectedEventType) ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleProceed}
                  disabled={!canProceed() || completeEvent.isPending}
                >
                  Complete without Manifest
                </Button>
                <Button
                  onClick={() => {
                    if (!canProceed()) return;
                    setShowDialog(false);
                    setShowManifestWizard(true);
                  }}
                  disabled={!canProceed()}
                >
                  Create Manifest & Complete
                </Button>
              </>
            ) : (
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
            )}
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

      {/* Full Manifest Wizard Dialog */}
      {selectedEventType && showManifestWizard && (
        <Dialog
          open={showManifestWizard}
          onOpenChange={(open) => {
            if (!open) {
              setShowManifestWizard(false);
              setSelectedEventType(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0" hideClose>
            <DriverManifestCreationWizard
              locationName={locationName}
              trailerNumber={getSelectedTrailer()?.trailer_number}
              manifestMode={selectedEventType === 'drop_full' ? 'drop_to_processor' : 'pickup'}
              onComplete={async () => {
                await handleCompleteEvent();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}