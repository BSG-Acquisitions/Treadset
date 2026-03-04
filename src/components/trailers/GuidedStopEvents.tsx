import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TrailerSignatureDialog } from "./TrailerSignatureDialog";
import { DriverManifestCreationWizard } from "@/components/driver/DriverManifestCreationWizard";
import { useCompleteTrailerEvent, StopTrailerEvent } from "@/hooks/useStopTrailerEvents";
import { TrailerEventType, EVENT_TYPE_LABELS } from "@/hooks/useTrailerEvents";
import { PlannedEvent } from "@/hooks/useTrailerRoutes";
import { DriverStopEventActions } from "./DriverStopEventActions";
import { Trailer } from "@/hooks/useTrailers";
import { getFilteredTrailers } from "@/lib/trailerFilterUtils";
import { formatManifestTimestamp } from "@/lib/manifestTimestamps";
import {
  Package,
  PackageOpen,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
  Loader2,
  ChevronDown,
  Plus,
  FileText,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface GuidedStopEventsProps {
  stopId: string;
  routeId: string;
  locationName: string;
  locationId?: string;
  plannedEvents: PlannedEvent[];
  completedEvents: { event_type: string; trailer_id: string }[];
  stopEvents?: StopTrailerEvent[];
  trailers: Trailer[];
  onTruckTrailerIds?: Set<string>;
  onEventCompleted: () => void;
}

const EVENT_ICONS: Record<string, typeof Package> = {
  pickup_empty: PackageOpen,
  drop_empty: ArrowDownToLine,
  pickup_full: Package,
  drop_full: ArrowUpFromLine,
  stage_empty: ArrowDownToLine,
};

const EVENT_LABELS: Record<string, string> = {
  pickup_empty: 'Pick Up Empty',
  drop_empty: 'Drop Off Empty',
  pickup_full: 'Pick Up Full',
  drop_full: 'Drop Off Full',
  stage_empty: 'Stage Empty',
};

const MANIFEST_EVENTS = ['pickup_full', 'drop_full'];
const SIGNATURE_REQUIRED = ['pickup_full', 'drop_full'];

export function GuidedStopEvents({
  stopId,
  routeId,
  locationName,
  locationId,
  plannedEvents,
  completedEvents,
  stopEvents = [],
  trailers,
  onTruckTrailerIds = new Set(),
  onEventCompleted,
}: GuidedStopEventsProps) {
  const [activeEvent, setActiveEvent] = useState<PlannedEvent | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [showUnplanned, setShowUnplanned] = useState(false);
  const [showManifestWizard, setShowManifestWizard] = useState(false);
  // For "Any" trailer events — driver picks the trailer
  const [driverSelectedTrailer, setDriverSelectedTrailer] = useState<Record<number, string>>({});
  const completeEvent = useCompleteTrailerEvent();
  const navigate = useNavigate();

  const isCompleted = (pe: PlannedEvent, idx: number) => {
    if (pe.trailer_id) {
      return completedEvents.some(
        (ce) => ce.event_type === pe.event_type && ce.trailer_id === pe.trailer_id
      );
    }
    // For "Any" trailer events, match by event_type + index (count how many of this type are completed vs planned)
    const plannedOfType = plannedEvents.filter((p, i) => p.event_type === pe.event_type && !p.trailer_id && i <= idx);
    const completedOfType = completedEvents.filter(ce => ce.event_type === pe.event_type);
    // A null-trailer planned event is "done" if there are enough completed events of the same type
    return completedOfType.length >= plannedOfType.length;
  };

  // Find the full event record for a completed planned event
  const getEventRecord = (pe: PlannedEvent): StopTrailerEvent | undefined => {
    if (pe.trailer_id) {
      return stopEvents.find(
        (se) => se.event_type === pe.event_type && se.trailer_id === pe.trailer_id
      );
    }
    // For "Any" events, just find a matching event_type
    return stopEvents.find((se) => se.event_type === pe.event_type);
  };

  const allPlannedDone = plannedEvents.every((pe, idx) => isCompleted(pe, idx));

  const handleComplete = async (
    pe: PlannedEvent,
    overrideTrailerId?: string,
    signaturePath?: string,
    notes?: string,
    contactInfo?: { email?: string; name?: string }
  ) => {
    const trailerId = overrideTrailerId || pe.trailer_id;
    if (!trailerId) return; // shouldn't happen

    await completeEvent.mutateAsync({
      trailer_id: trailerId,
      event_type: pe.event_type as TrailerEventType,
      stop_id: stopId,
      route_id: routeId,
      location_name: locationName,
      location_id: locationId,
      notes: notes || undefined,
      signature_path: signaturePath,
      contact_email: contactInfo?.email,
      contact_name: contactInfo?.name,
    });
    setActiveEvent(null);
    setShowSignature(false);
    onEventCompleted();
  };

  const handleTap = (pe: PlannedEvent, idx: number) => {
    if (isCompleted(pe, idx)) return;

    // For "Any" trailer events, require driver to select a trailer first
    if (!pe.trailer_id) {
      const selected = driverSelectedTrailer[idx];
      if (!selected) return; // button should be disabled
    }

    setActiveEvent(pe);

    if (MANIFEST_EVENTS.includes(pe.event_type)) {
      // Open the full manifest wizard for pickup_full/drop_full
      setShowManifestWizard(true);
    } else if (SIGNATURE_REQUIRED.includes(pe.event_type)) {
      setShowSignature(true);
    } else {
      const overrideId = !pe.trailer_id ? driverSelectedTrailer[idx] : undefined;
      handleComplete(pe, overrideId);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Planned Events</div>

      <div className="space-y-2">
        {plannedEvents.map((pe, idx) => {
          const done = isCompleted(pe, idx);
          const eventRecord = done ? getEventRecord(pe) : undefined;
          const Icon = EVENT_ICONS[pe.event_type] || Package;
          const label = EVENT_LABELS[pe.event_type] || pe.event_type;
          const isLoading = completeEvent.isPending && activeEvent === pe;
          const isAnyTrailer = !pe.trailer_id;
          const selectedTrailerForAny = driverSelectedTrailer[idx];

          return (
            <Card
              key={`${pe.event_type}-${pe.trailer_id || 'any'}-${idx}`}
              className={cn(
                "transition-all",
                done
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : "hover:bg-muted/50"
              )}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {done ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {isAnyTrailer && !done ? (
                          'Any Available Trailer'
                        ) : (
                          `Trailer #${eventRecord?.trailer?.trailer_number || pe.trailer_number}`
                        )}
                      </div>
                      {done && eventRecord && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {formatManifestTimestamp(eventRecord.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {done ? (
                      <div className="flex items-center gap-2">
                        {eventRecord?.manifest_number && (
                          <Badge variant="outline" className="text-xs gap-1 bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">
                            <FileText className="h-3 w-3" />
                            {eventRecord.manifest_number}
                          </Badge>
                        )}
                        {SIGNATURE_REQUIRED.includes(pe.event_type) && !eventRecord?.manifest_number && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 min-h-[36px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              const params = new URLSearchParams();
                              if (locationName) params.set('location', locationName);
                              if (pe.trailer_number) params.set('trailer', pe.trailer_number);
                              navigate(`/driver/manifest/new?${params.toString()}`);
                            }}
                          >
                            <FileText className="h-3 w-3" />
                            Create Manifest
                          </Button>
                        )}
                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                          Done
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {/* Trailer selector for "Any" events */}
                        {isAnyTrailer && (
                          (() => {
                            const { suggested, other } = getFilteredTrailers(
                              pe.event_type,
                              locationName,
                              locationId,
                              trailers,
                              onTruckTrailerIds
                            );
                            // Auto-select if only one suggestion
                            if (suggested.length === 1 && !selectedTrailerForAny) {
                              setTimeout(() => setDriverSelectedTrailer(prev => ({ ...prev, [idx]: suggested[0].id })), 0);
                            }
                            return (
                              <Select
                                value={selectedTrailerForAny || ''}
                                onValueChange={(v) => setDriverSelectedTrailer(prev => ({ ...prev, [idx]: v }))}
                              >
                                <SelectTrigger className="w-[140px] h-9 text-xs">
                                  <SelectValue placeholder="Select trailer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {suggested.length > 0 && (
                                    <SelectGroup>
                                      <SelectLabel className="text-xs">At this location</SelectLabel>
                                      {suggested.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                          {t.trailer_number} ({t.current_status})
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  )}
                                  {suggested.length > 0 && other.length > 0 && (
                                    <Separator className="my-1" />
                                  )}
                                  {other.length > 0 && (
                                    <SelectGroup>
                                      <SelectLabel className="text-xs">Other trailers</SelectLabel>
                                      {other.map(t => (
                                        <SelectItem key={t.id} value={t.id}>
                                          {t.trailer_number} ({t.current_status})
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  )}
                                </SelectContent>
                              </Select>
                            );
                          })()
                        )}
                        <Button
                          size="sm"
                          className="min-h-[44px] min-w-[44px] px-4"
                          onClick={() => handleTap(pe, idx)}
                          disabled={isLoading || (isAnyTrailer && !selectedTrailerForAny)}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : SIGNATURE_REQUIRED.includes(pe.event_type) ? (
                            "Sign & Complete"
                          ) : (
                            "Complete"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {allPlannedDone && plannedEvents.length > 0 && (
        <Badge variant="default" className="w-full justify-center py-2">
          <CheckCircle className="h-4 w-4 mr-2" />
          All planned events complete
        </Badge>
      )}

      {/* Unplanned events section */}
      <Collapsible open={showUnplanned} onOpenChange={setShowUnplanned}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground">
            <Plus className="h-4 w-4" />
            Add Other Event
            <ChevronDown className={cn("h-4 w-4 transition-transform", showUnplanned && "rotate-180")} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <DriverStopEventActions
            stopId={stopId}
            routeId={routeId}
            locationName={locationName}
            locationId={locationId}
            trailers={trailers}
            completedEvents={completedEvents}
            onTruckTrailerIds={onTruckTrailerIds}
            onEventCompleted={onEventCompleted}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Full manifest wizard dialog for pickup_full/drop_full */}
      {activeEvent && showManifestWizard && (
        <Dialog
          open={showManifestWizard}
          onOpenChange={(open) => {
            if (!open) {
              setShowManifestWizard(false);
              setActiveEvent(null);
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0" hideClose>
            <DriverManifestCreationWizard
              locationName={locationName}
              trailerNumber={
                activeEvent.trailer_number ||
                trailers.find(t => t.id === driverSelectedTrailer[plannedEvents.indexOf(activeEvent)])?.trailer_number
              }
              manifestMode={activeEvent.event_type === 'drop_full' ? 'drop_to_processor' : 'pickup'}
              onComplete={async () => {
                const overrideId = !activeEvent.trailer_id
                  ? driverSelectedTrailer[plannedEvents.indexOf(activeEvent)]
                  : undefined;
                await handleComplete(activeEvent, overrideId);
                setShowManifestWizard(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Signature dialog fallback for non-manifest signature events */}
      {activeEvent && showSignature && !showManifestWizard && (
        <TrailerSignatureDialog
          open={showSignature}
          onOpenChange={(open) => {
            if (!open) {
              setShowSignature(false);
              setActiveEvent(null);
            }
          }}
          eventType={activeEvent.event_type as TrailerEventType}
          trailerNumber={activeEvent.trailer_number}
          locationName={locationName}
          onComplete={async (signaturePath, notes, contactInfo) => {
            const overrideId = !activeEvent.trailer_id
              ? driverSelectedTrailer[plannedEvents.indexOf(activeEvent)]
              : undefined;
            await handleComplete(
              activeEvent,
              overrideId,
              signaturePath || undefined,
              notes,
              contactInfo
            );
          }}
        />
      )}
    </div>
  );
}
