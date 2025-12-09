import { useTrailerUtilization, useTrailerEventSummary, useActiveTrailerAlerts } from "@/hooks/useTrailerReports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Package, Clock, AlertTriangle, ArrowRight, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

export function TrailerStatusWidget() {
  if (!FEATURE_FLAGS.TRAILERS) return null;
  
  const navigate = useNavigate();
  const { data: utilization, isLoading } = useTrailerUtilization();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1A4314] text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Trailer Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-2xl font-bold">{utilization?.statusBreakdown.full || 0}</p>
            <p className="text-xs text-white/70">Full</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{utilization?.statusBreakdown.empty || 0}</p>
            <p className="text-xs text-white/70">Empty</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{utilization?.statusBreakdown.waiting_unload || 0}</p>
            <p className="text-xs text-white/70">Waiting</p>
          </div>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => navigate('/trailers/inventory')}
        >
          View Inventory
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function TrailerActivityWidget() {
  if (!FEATURE_FLAGS.TRAILERS) return null;
  
  const navigate = useNavigate();
  const { data: eventSummary, isLoading } = useTrailerEventSummary('week');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const swapsThisWeek = (eventSummary?.eventsByType['pickup_full'] || 0) + 
                        (eventSummary?.eventsByType['drop_full'] || 0);

  return (
    <Card className="bg-[#1A4314] text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Weekly Swaps
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-3xl font-bold">{swapsThisWeek}</p>
            <p className="text-xs text-white/70">swaps this week</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold">{eventSummary?.totalEvents || 0}</p>
            <p className="text-xs text-white/70">total events</p>
          </div>
        </div>
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => navigate('/trailers/reports')}
        >
          View Reports
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function TrailerAlertsWidget() {
  if (!FEATURE_FLAGS.TRAILERS) return null;
  
  const navigate = useNavigate();
  const { data: alerts, isLoading } = useActiveTrailerAlerts();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse h-24 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const criticalCount = alerts?.filter((a: any) => a.severity === 'critical').length || 0;
  const warningCount = alerts?.filter((a: any) => a.severity === 'warning').length || 0;
  const hasAlerts = (alerts?.length || 0) > 0;

  return (
    <Card className={cn(
      "text-white",
      hasAlerts ? "bg-orange-600" : "bg-[#1A4314]"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Trailer Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hasAlerts ? (
          <>
            <div className="flex items-center gap-4 mb-3">
              {criticalCount > 0 && (
                <div>
                  <Badge variant="destructive" className="text-xs">{criticalCount} Critical</Badge>
                </div>
              )}
              {warningCount > 0 && (
                <div>
                  <Badge variant="secondary" className="text-xs">{warningCount} Warning</Badge>
                </div>
              )}
            </div>
            <p className="text-xs text-white/80 mb-3 line-clamp-2">
              {alerts?.[0]?.message}
            </p>
          </>
        ) : (
          <div className="mb-3">
            <p className="text-2xl font-bold">All Clear</p>
            <p className="text-xs text-white/70">No active alerts</p>
          </div>
        )}
        <Button 
          variant="secondary" 
          size="sm" 
          className="w-full text-xs"
          onClick={() => navigate('/trailers/reports')}
        >
          {hasAlerts ? 'View Alerts' : 'View Reports'}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
