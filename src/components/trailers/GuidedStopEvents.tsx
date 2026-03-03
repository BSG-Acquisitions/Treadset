import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrailerSignatureDialog } from "./TrailerSignatureDialog";
import { useCompleteTrailerEvent } from "@/hooks/useStopTrailerEvents";
import { TrailerEventType, EVENT_TYPE_LABELS } from "@/hooks/useTrailerEvents";
import { PlannedEvent } from "@/hooks/useTrailerRoutes";
import { DriverStopEventActions } from "./DriverStopEventActions";
import { Trailer } from "@/hooks/useTrailers";
import {
  Package,
  PackageOpen,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
  Loader2,
  ChevronDown,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface GuidedStopEventsProps {
  stopId: string;
  routeId: string;
  locationName: string;
  locationId?: string;
  plannedEvents: PlannedEvent[];
  completedEvents: { event_type: string; trailer_id: string }[];
  trailers: Trailer[];
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

const SIGNATURE_REQUIRED = ['pickup_full', 'drop_full'];

export function GuidedStopEvents({
  stopId,
  routeId,
  locationName,
  locationId,
  plannedEvents,
  completedEvents,
  trailers,
  onEventCompleted,
}: GuidedStopEventsProps) {
  const [activeEvent, setActiveEvent] = useState<PlannedEvent | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [showUnplanned, setShowUnplanned] = useState(false);
  const completeEvent = useCompleteTrailerEvent();

  const isCompleted = (pe: PlannedEvent) =>
    completedEvents.some(
      (ce) => ce.event_type === pe.event_type && ce.trailer_id === pe.trailer_id
    );

  const allPlannedDone = plannedEvents.every(isCompleted);

  const handleComplete = async (
    pe: PlannedEvent,
    signaturePath?: string,
    notes?: string,
    contactInfo?: { email?: string; name?: string }
  ) => {
    await completeEvent.mutateAsync({
      trailer_id: pe.trailer_id,
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

  const handleTap = (pe: PlannedEvent) => {
    if (isCompleted(pe)) return;
    setActiveEvent(pe);

    if (SIGNATURE_REQUIRED.includes(pe.event_type)) {
      setShowSignature(true);
    } else {
      handleComplete(pe);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-muted-foreground">Planned Events</div>

      <div className="space-y-2">
        {plannedEvents.map((pe, idx) => {
          const done = isCompleted(pe);
          const Icon = EVENT_ICONS[pe.event_type] || Package;
          const label = EVENT_LABELS[pe.event_type] || pe.event_type;
          const isLoading = completeEvent.isPending && activeEvent === pe;

          return (
            <Card
              key={`${pe.event_type}-${pe.trailer_id}-${idx}`}
              className={cn(
                "transition-all",
                done
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : "hover:bg-muted/50 cursor-pointer"
              )}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        Trailer #{pe.trailer_number}
                      </div>
                    </div>
                  </div>

                  {done ? (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">
                      Done
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="min-h-[44px] min-w-[44px] px-4"
                      onClick={() => handleTap(pe)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : SIGNATURE_REQUIRED.includes(pe.event_type) ? (
                        "Sign & Complete"
                      ) : (
                        "Complete"
                      )}
                    </Button>
                  )}
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
            onEventCompleted={onEventCompleted}
          />
        </CollapsibleContent>
      </Collapsible>

      {/* Signature dialog for full pickup/drop */}
      {activeEvent && showSignature && (
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
            await handleComplete(
              activeEvent,
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
