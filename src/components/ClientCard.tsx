import { Card, CardContent } from "@/components/ui/card";
import { CapacityGauge } from "./CapacityGauge";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, MapPin } from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/formatters";

interface ClientCardProps {
  id: string;
  name: string;
  capacity: number;
  lastPickup: string;
  address?: string;
  type?: 'commercial' | 'residential';
}

export function ClientCard({ id, name, capacity, lastPickup, address, type = 'commercial' }: ClientCardProps) {
  return (
    <Link to={`/clients/${id}`} className="group block focus:outline-none">
      <Card className="h-full overflow-hidden bg-card border border-border/50 transition-all duration-300 hover:border-primary/20 hover:shadow-elevation-md hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        {/* Brand stripe */}
        <div className="h-1 brand-gradient" />
        
        <CardContent className="p-6 space-y-4">
          {/* Header with capacity gauge */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-card-foreground truncate group-hover:text-primary transition-colors">
                {name}
              </h3>
              {type && (
                <span className="inline-flex items-center px-2 py-1 mt-2 text-xs font-medium bg-secondary text-secondary-foreground rounded-full">
                  {type === 'commercial' ? 'Commercial' : 'Residential'}
                </span>
              )}
            </div>
            <CapacityGauge value={capacity} size={56} />
          </div>

          {/* Location */}
          {address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{address}</span>
            </div>
          )}

          {/* Last pickup */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>Last pickup: {formatRelativeTime(lastPickup)}</span>
          </div>

          {/* Action indicator */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-sm font-medium text-muted-foreground">View details</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </div>
        </CardContent>

        {/* Subtle overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-background/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </Card>
    </Link>
  );
}
