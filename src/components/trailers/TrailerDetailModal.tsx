import { useTrailerEvents, EVENT_TYPE_LABELS } from "@/hooks/useTrailerEvents";
import { TrailerWithLastEvent } from "@/hooks/useTrailerInventory";
import { TrailerStatus } from "@/hooks/useTrailers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Truck, 
  MapPin, 
  Clock, 
  User, 
  History, 
  FileText,
  Package,
  PackageOpen,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface TrailerDetailModalProps {
  trailer: TrailerWithLastEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_CONFIG: Record<TrailerStatus, { color: string; label: string }> = {
  empty: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Empty' },
  full: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Full' },
  staged: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Staged' },
  in_transit: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'In Transit' },
  waiting_unload: { color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'Waiting to Unload' },
};

const EVENT_ICONS: Record<string, typeof Package> = {
  pickup_empty: PackageOpen,
  drop_empty: ArrowDownToLine,
  pickup_full: Package,
  drop_full: ArrowUpFromLine,
  swap: RefreshCw,
  stage_empty: ArrowDownToLine,
  waiting_unload: Clock,
  external_pickup: ArrowUpFromLine,
  external_drop: ArrowDownToLine,
};

export function TrailerDetailModal({ trailer, open, onOpenChange }: TrailerDetailModalProps) {
  const { data: events, isLoading } = useTrailerEvents(trailer?.id);

  if (!trailer) return null;

  const statusConfig = STATUS_CONFIG[trailer.current_status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Truck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-xl">Trailer {trailer.trailer_number}</div>
              <div className="text-sm font-normal text-muted-foreground">
                Full lifecycle history
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Current Status Section */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Current Status
              </div>
              <Badge className={cn("text-sm", statusConfig.color)}>
                {statusConfig.label}
              </Badge>
            </div>
            
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Current Location
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {trailer.current_location || 'Unknown'}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {trailer.last_event && (
              <>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Last Activity
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {formatDistanceToNow(new Date(trailer.last_event.timestamp), { addSuffix: true })}
                  </div>
                </div>

                {trailer.last_event.driver && (
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Last Driver
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {trailer.last_event.driver.first_name} {trailer.last_event.driver.last_name}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {trailer.notes && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-1">
              <FileText className="h-3 w-3" />
              Notes
            </div>
            <div className="text-sm">{trailer.notes}</div>
          </div>
        )}

        <Separator />

        {/* Event History */}
        <div className="flex items-center gap-2 pt-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Event History</h3>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : events && events.length > 0 ? (
            <div className="space-y-1">
              {events.map((event, index) => {
                const Icon = EVENT_ICONS[event.event_type] || Package;
                const isFirst = index === 0;
                
                return (
                  <div 
                    key={event.id} 
                    className={cn(
                      "flex gap-3 py-3 relative",
                      !isFirst && "before:absolute before:left-5 before:top-0 before:h-3 before:w-px before:bg-border"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      isFirst ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {EVENT_TYPE_LABELS[event.event_type]}
                        </Badge>
                        {isFirst && (
                          <Badge variant="secondary" className="text-xs">Latest</Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-muted-foreground mt-1">
                        {format(new Date(event.timestamp), 'MMM d, yyyy \'at\' h:mm a')}
                      </div>
                      
                      {event.location_name && (
                        <div className="flex items-center gap-1 text-sm mt-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {event.location_name}
                        </div>
                      )}
                      
                      {event.notes && (
                        <div className="text-sm text-muted-foreground mt-1 truncate">
                          {event.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No events recorded for this trailer</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
