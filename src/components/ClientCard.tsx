import { Card, CardContent } from "@/components/ui/card";
import { CapacityGauge } from "./CapacityGauge";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar, MapPin, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/formatters";
import { useState, useEffect } from "react";

interface ClientCardProps {
  id: string;
  name: string;
  capacity: number;
  lastPickup: string;
  address?: string;
  revenue?: number;
  pickupsThisMonth?: number;
  status?: 'active' | 'overdue' | 'scheduled';
}

export function ClientCard({ 
  id, 
  name, 
  capacity, 
  lastPickup, 
  address, 
  revenue = 0,
  pickupsThisMonth = 0,
  status = 'active'
}: ClientCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseAnimation(true);
      setTimeout(() => setPulseAnimation(false), 1000);
    }, 8000 + Math.random() * 4000); // Random interval between 8-12 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = () => {
    switch (status) {
      case 'overdue':
        return {
          icon: AlertCircle,
          color: 'text-brand-warning',
          bg: 'status-gradient-warning',
          text: 'Overdue'
        };
      case 'scheduled':
        return {
          icon: CheckCircle2,
          color: 'text-brand-success',
          bg: 'status-gradient-success',
          text: 'Scheduled'
        };
      default:
        return {
          icon: TrendingUp,
          color: 'text-brand-primary',
          bg: 'brand-gradient-subtle',
          text: 'Active'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  const urgencyLevel = capacity >= 90 ? 'high' : capacity >= 70 ? 'medium' : 'low';

  return (
    <Link to={`/clients/${id}`} className="group block focus:outline-none">
      <Card 
        className={`
          h-full overflow-hidden relative transition-all duration-500 ease-out
          bg-gradient-to-br from-card via-card to-card-hover
          border border-border/30 interactive-card
          ${urgencyLevel === 'high' ? 'ring-2 ring-brand-warning/20' : ''}
          ${pulseAnimation ? 'ring-2 ring-primary/40 shadow-elevation-glow' : ''}
          group-hover:border-primary/30 group-hover:shadow-elevation-lg
          group-focus-visible:ring-2 group-focus-visible:ring-primary group-focus-visible:ring-offset-2
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Animated brand stripe */}
        <div className={`h-1.5 brand-gradient relative overflow-hidden ${isHovered ? 'animate-shimmer' : ''}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full h-full translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
        </div>
        
        <CardContent className="p-5 space-y-4 relative">
          {/* Status indicator */}
          <div className={`absolute top-3 right-3 p-1.5 rounded-full ${statusConfig.bg}`}>
            <StatusIcon className={`h-3 w-3 ${statusConfig.color}`} />
          </div>

          {/* Header with enhanced capacity gauge */}
          <div className="flex items-start justify-between pr-8">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg text-card-foreground truncate group-hover:text-primary transition-colors duration-300">
                {name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                {/* Remove type badge entirely */}
                <span className={`
                  inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full
                  ${statusConfig.bg} ${statusConfig.color}
                `}>
                  {statusConfig.text}
                </span>
              </div>
            </div>
            <div className={`transition-transform duration-300 ${isHovered ? 'scale-110' : ''}`}>
              <CapacityGauge value={capacity} size={52} />
            </div>
          </div>

          {/* Enhanced metrics row */}
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Revenue</div>
              <div className="font-semibold text-brand-success">
                ${revenue.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">This Month</div>
              <div className="font-semibold text-primary">
                {pickupsThisMonth} pickups
              </div>
            </div>
          </div>

          {/* Location with enhanced styling */}
          {address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 rounded-lg bg-secondary/30 border border-border/20">
              <MapPin className="h-4 w-4 flex-shrink-0 text-brand-secondary" />
              <span className="truncate">{address}</span>
            </div>
          )}

          {/* Last pickup with status-aware styling */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              Last pickup: <span className="font-medium text-foreground">{formatRelativeTime(lastPickup)}</span>
            </span>
          </div>

          {/* Enhanced action indicator */}
          <div className="flex items-center justify-between pt-3 border-t border-border/30">
            <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
              View details
            </span>
            <div className="flex items-center gap-1">
              <ArrowRight className={`
                h-4 w-4 text-muted-foreground transition-all duration-300
                group-hover:text-primary group-hover:translate-x-1
                ${isHovered ? 'animate-pulse' : ''}
              `} />
            </div>
          </div>
        </CardContent>

        {/* Dynamic overlay effects */}
        <div className={`
          absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none
          bg-gradient-to-br from-primary/5 via-transparent to-brand-secondary/5
        `} />
        
        {/* Urgent attention indicator */}
        {urgencyLevel === 'high' && (
          <div className="absolute top-2 left-2">
            <div className="w-2 h-2 bg-brand-warning rounded-full animate-pulse-glow" />
          </div>
        )}
      </Card>
    </Link>
  );
}
