import { TrailerWithLastEvent } from "@/hooks/useTrailerInventory";
import { TrailerStatus } from "@/hooks/useTrailers";
import { EVENT_TYPE_LABELS } from "@/hooks/useTrailerEvents";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, MapPin, Clock, User, ArrowRight, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface TrailerCardProps {
  trailer: TrailerWithLastEvent;
  onClick: () => void;
  compact?: boolean;
}

const STATUS_COLORS: Record<TrailerStatus, string> = {
  empty: 'border-l-green-500',
  full: 'border-l-red-500',
  staged: 'border-l-blue-500',
  in_transit: 'border-l-yellow-500',
  waiting_unload: 'border-l-orange-500',
};

export function TrailerCard({ trailer, onClick, compact = false }: TrailerCardProps) {
  const driverName = trailer.last_event?.driver
    ? `${trailer.last_event.driver.first_name || ''} ${trailer.last_event.driver.last_name || ''}`.trim()
    : null;

  if (compact) {
    return (
      <div
        className={cn(
          "p-3 bg-card rounded-lg border border-l-4 cursor-pointer hover:bg-muted/50 transition-all hover:shadow-sm",
          STATUS_COLORS[trailer.current_status]
        )}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{trailer.trailer_number}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        {trailer.current_location && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{trailer.current_location}</span>
          </div>
        )}
        
        {trailer.last_event && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(trailer.last_event.timestamp), { addSuffix: true })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:shadow-md transition-all border-l-4 group",
        STATUS_COLORS[trailer.current_status]
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Truck className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <div className="font-semibold text-lg">{trailer.trailer_number}</div>
              {trailer.current_location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {trailer.current_location}
                </div>
              )}
              {(trailer.ownership_type || trailer.owner_name) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {trailer.owner_name || trailer.ownership_type}
                </div>
              )}
            </div>
          </div>
          
          <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {trailer.last_event && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {EVENT_TYPE_LABELS[trailer.last_event.event_type]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(trailer.last_event.timestamp), { addSuffix: true })}
              </span>
            </div>
            
            {driverName && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <User className="h-3 w-3" />
                {driverName}
              </div>
            )}
          </div>
        )}

        {!trailer.last_event && (
          <div className="mt-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground">No recent activity</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
