import { useState } from "react";
import { useDriverTrailerRoutes, useUpdateTrailerRoute, TrailerRouteStop, PlannedEvent } from "@/hooks/useTrailerRoutes";
import { useTrailers } from "@/hooks/useTrailers";
import { useRouteStopEvents } from "@/hooks/useStopTrailerEvents";
import { useHasSemiHaulerCapability } from "@/hooks/useDriverCapabilities";
import { GuidedStopEvents } from "@/components/trailers/GuidedStopEvents";
import { DriverStopEventActions } from "@/components/trailers/DriverStopEventActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatManifestTimestamp } from "@/lib/manifestTimestamps";
import { 
  Truck, 
  MapPin, 
  Phone, 
  User, 
  Calendar, 
  CheckCircle, 
  AlertCircle, 
  ChevronDown,
  ChevronRight,
  PlayCircle,
  Flag,
  Clock,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

export default function DriverTrailerAssignments() {
  const { hasSemiHauler, isLoading: capabilityLoading } = useHasSemiHaulerCapability();
  const { data: routes, isLoading: routesLoading, refetch } = useDriverTrailerRoutes();
  const { data: trailers } = useTrailers();
  const updateRoute = useUpdateTrailerRoute();
  
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set());
  const [expandedStops, setExpandedStops] = useState<Set<string>>(new Set());

  // Check feature flag
  if (!FEATURE_FLAGS.TRAILERS) {
    return null;
  }

  const toggleRoute = (routeId: string) => {
    setExpandedRoutes(prev => {
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  };

  const toggleStop = (stopId: string) => {
    setExpandedStops(prev => {
      const next = new Set(prev);
      if (next.has(stopId)) {
        next.delete(stopId);
      } else {
        next.add(stopId);
      }
      return next;
    });
  };

  const handleStartRoute = async (routeId: string) => {
    await updateRoute.mutateAsync({ id: routeId, status: 'in_progress' });
    setExpandedRoutes(prev => new Set([...prev, routeId]));
    // Auto-expand the first stop so Jody sees what to do
    const route = routes?.find(r => r.id === routeId);
    const firstStop = route?.stops
      ?.sort((a, b) => a.sequence_number - b.sequence_number)
      ?.find(s => !s.completed_at);
    if (firstStop) {
      setExpandedStops(prev => new Set([...prev, firstStop.id]));
    }
  };

  const handleCompleteRoute = async (routeId: string) => {
    await updateRoute.mutateAsync({ id: routeId, status: 'completed' });
    toast.success('Route completed successfully!');
  };

  const markStopComplete = async (stopId: string) => {
    await supabase
      .from('trailer_route_stops')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', stopId);
    refetch();
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
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Trailer Assignments</h1>
        <p className="text-sm text-muted-foreground">Your scheduled trailer move routes</p>
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
          {routes.map(route => (
            <RouteCard
              key={route.id}
              route={route}
              trailers={trailers || []}
              expanded={expandedRoutes.has(route.id)}
              expandedStops={expandedStops}
              onToggleRoute={() => toggleRoute(route.id)}
              onToggleStop={toggleStop}
              onStartRoute={() => handleStartRoute(route.id)}
              onCompleteRoute={() => handleCompleteRoute(route.id)}
              onStopComplete={markStopComplete}
              onEventCompleted={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RouteCardProps {
  route: any;
  trailers: any[];
  expanded: boolean;
  expandedStops: Set<string>;
  onToggleRoute: () => void;
  onToggleStop: (stopId: string) => void;
  onStartRoute: () => void;
  onCompleteRoute: () => void;
  onStopComplete: (stopId: string) => void;
  onEventCompleted: () => void;
}

function RouteCard({
  route,
  trailers,
  expanded,
  expandedStops,
  onToggleRoute,
  onToggleStop,
  onStartRoute,
  onCompleteRoute,
  onStopComplete,
  onEventCompleted,
}: RouteCardProps) {
  const { data: routeEvents = [] } = useRouteStopEvents(route.id);
  
  const completedStops = route.stops?.filter((s: TrailerRouteStop) => s.completed_at).length || 0;
  const totalStops = route.stops?.length || 0;
  const allStopsCompleted = completedStops === totalStops && totalStops > 0;

  const getStopEvents = (stopId: string) => {
    return routeEvents.filter(e => e.stop_id === stopId);
  };

  const isStopComplete = (stop: TrailerRouteStop) => {
    const stopEvents = getStopEvents(stop.id);
    return stop.completed_at !== null || stopEvents.length > 0;
  };

  return (
    <Card className={cn(
      "transition-all",
      route.status === 'in_progress' && "border-primary"
    )}>
      <Collapsible open={expanded} onOpenChange={onToggleRoute}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="mt-1">
                {expanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <CardTitle className="text-base sm:text-lg leading-tight">{route.route_name}</CardTitle>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(route.scheduled_date), 'EEE, MMM d')}
                  </span>
                  {route.vehicle && (
                    <span className="flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />
                      {route.vehicle.vehicle_number}
                    </span>
                  )}
                </div>

                {route.trailer && (
                  <div className="mt-2 p-2 rounded-md bg-accent/50 border border-accent">
                    <span className="text-sm font-semibold flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-primary" />
                      Trailer: {route.trailer.trailer_number}
                      {route.trailer.current_status && (
                        <Badge variant="outline" className="text-xs ml-1">
                          {route.trailer.current_status}
                        </Badge>
                      )}
                    </span>
                    {route.trailer.current_location && (
                      <span className="text-xs text-muted-foreground mt-0.5 block">
                        Currently at: {route.trailer.current_location}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant={route.status === 'in_progress' ? 'default' : 'secondary'}>
                    {route.status === 'in_progress' ? (
                      <><Clock className="h-3 w-3 mr-1" /> In Progress</>
                    ) : (
                      route.status.replace('_', ' ')
                    )}
                  </Badge>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          
          {route.status === 'scheduled' && (
            <div className="mt-3 pl-7 sm:pl-8">
              <Button size="sm" className="min-h-[44px] w-full" onClick={onStartRoute}>
                <PlayCircle className="h-4 w-4 mr-1" />
                Start Route
              </Button>
            </div>
          )}
          
          {route.status === 'in_progress' && allStopsCompleted && (
            <div className="mt-3 pl-7 sm:pl-8">
              <Button size="sm" className="min-h-[44px] w-full" onClick={onCompleteRoute} variant="default">
                <Flag className="h-4 w-4 mr-1" />
                Finish Route
              </Button>
            </div>
          )}
          
          <div className="mt-3 pl-7 sm:pl-8">
            <div className="text-xs sm:text-sm text-muted-foreground mb-1">
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

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {route.stops
                ?.sort((a: TrailerRouteStop, b: TrailerRouteStop) => a.sequence_number - b.sequence_number)
                .map((stop: TrailerRouteStop, index: number) => (
                  <StopCard
                    key={stop.id}
                    stop={stop}
                    index={index}
                    routeId={route.id}
                    routeStatus={route.status}
                    trailers={trailers}
                    stopEvents={getStopEvents(stop.id)}
                    expanded={expandedStops.has(stop.id)}
                    onToggle={() => onToggleStop(stop.id)}
                    onStopComplete={() => onStopComplete(stop.id)}
                    onEventCompleted={onEventCompleted}
                  />
                ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface StopCardProps {
  stop: TrailerRouteStop;
  index: number;
  routeId: string;
  routeStatus: string;
  trailers: any[];
  stopEvents: any[];
  expanded: boolean;
  onToggle: () => void;
  onStopComplete: () => void;
  onEventCompleted: () => void;
}

function StopCard({
  stop,
  index,
  routeId,
  routeStatus,
  trailers,
  stopEvents,
  expanded,
  onToggle,
  onStopComplete,
  onEventCompleted,
}: StopCardProps) {
  const isComplete = stop.completed_at !== null;
  const hasEvents = stopEvents.length > 0;
  const canInteract = routeStatus === 'in_progress' && !isComplete;

  const handleEventCompleted = () => {
    onEventCompleted();
    // If this was the first event, we could auto-expand, etc.
  };

  const handleMarkComplete = () => {
    onStopComplete();
    onToggle(); // Collapse after completing
  };

  return (
    <Collapsible open={expanded && canInteract} onOpenChange={canInteract ? onToggle : undefined}>
      <div
        className={cn(
          "rounded-lg border transition-all",
          isComplete 
            ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
            : canInteract
              ? "bg-card hover:bg-muted/50 cursor-pointer border-border"
              : "bg-muted/30 border-border/50"
        )}
      >
        <CollapsibleTrigger asChild disabled={!canInteract}>
          <div className="p-3 sm:p-4" onClick={(e) => { e.stopPropagation(); if (canInteract) onToggle(); }}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium flex-shrink-0",
                isComplete 
                  ? "bg-green-600 text-white" 
                  : canInteract
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}>
                {isComplete ? <CheckCircle className="h-4 w-4" /> : index + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium">{stop.location_name}</div>
                
                {stop.location_address && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{stop.location_address}</span>
                  </div>
                )}
                
                {stop.contact_name && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <User className="h-3 w-3 flex-shrink-0" />
                    <span>{stop.contact_name}</span>
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

                {/* Show planned events preview (always visible) */}
                {(stop as any).planned_events && (stop as any).planned_events.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {((stop as any).planned_events as PlannedEvent[]).map((pe, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm font-medium text-primary">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {pe.event_type.replace('_', ' ')} — #{pe.trailer_number}
                      </div>
                    ))}
                  </div>
                )}

                {stop.instructions && (
                  <div className="mt-2 p-2 bg-muted rounded text-sm">
                    {stop.instructions}
                  </div>
                )}

                {/* Completed events timeline */}
                {hasEvents && (
                  <div className="mt-2 space-y-1.5">
                    {stopEvents.map((event: any) => (
                      <div key={event.id} className="flex items-center gap-2 text-xs">
                        <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="font-medium">
                          {event.event_type.replace('_', ' ')}
                        </span>
                        <span className="text-muted-foreground">
                          #{event.trailer?.trailer_number}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-0.5 ml-auto">
                          <Clock className="h-3 w-3" />
                          {formatManifestTimestamp(event.timestamp)}
                        </span>
                        {event.manifest_number && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">
                            <FileText className="h-2.5 w-2.5" />
                            {event.manifest_number}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canInteract && (
                <div className="flex items-center">
                  {expanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              )}

              {isComplete && (
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                  Complete
                </Badge>
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t">
            <div className="pt-4 space-y-4">
              {(stop as any).planned_events && (stop as any).planned_events.length > 0 ? (
                <GuidedStopEvents
                  stopId={stop.id}
                  routeId={routeId}
                  locationName={stop.location_name || ''}
                  locationId={stop.location_id || undefined}
                  plannedEvents={(stop as any).planned_events as PlannedEvent[]}
                  completedEvents={stopEvents.map((e: any) => ({
                    event_type: e.event_type,
                    trailer_id: e.trailer_id,
                  }))}
                  trailers={trailers}
                  onEventCompleted={handleEventCompleted}
                />
              ) : (
                <DriverStopEventActions
                  stopId={stop.id}
                  routeId={routeId}
                  locationName={stop.location_name || ''}
                  locationId={stop.location_id || undefined}
                  trailers={trailers}
                  completedEvents={stopEvents.map((e: any) => ({
                    event_type: e.event_type,
                    trailer_id: e.trailer_id,
                  }))}
                  onEventCompleted={handleEventCompleted}
                />
              )}

              {hasEvents && (
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={handleMarkComplete}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark Stop Complete
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
