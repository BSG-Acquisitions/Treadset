import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle } from 'lucide-react';
import { useOperationalMetrics } from '@/hooks/useOperationalMetrics';

export const OperationalMetricsCard = () => {
  const { data: metrics, isLoading } = useOperationalMetrics();

  if (isLoading) return null;
  if (!metrics || metrics.length === 0) return null;

  const latest = metrics[0];
  const completionRate = latest.total_pickups > 0 
    ? ((latest.completed_on_time / latest.total_pickups) * 100).toFixed(1)
    : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Operational Efficiency
          </CardTitle>
          <Badge variant="outline" className="text-xs">Beta</Badge>
        </div>
        <CardDescription>Today's performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">On-Time Rate</span>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="font-medium">{completionRate}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Efficiency Score</span>
            <Badge variant="secondary">{latest.route_efficiency_score || 0}/100</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Driver Utilization</span>
            <span className="font-medium">{latest.driver_utilization_pct?.toFixed(1) || 0}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
