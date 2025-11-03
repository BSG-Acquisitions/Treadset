import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManifestAlerts } from '@/hooks/useManifestAlerts';
import { AlertTriangle, CheckCircle, FileWarning } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ManifestAlertsList = () => {
  const { alerts, isLoading, resolveAlert } = useManifestAlerts();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading alerts...</div>;
  }

  const getPriorityColor = (priority: string) => {
    if (priority === 'high') return 'text-destructive';
    if (priority === 'medium') return 'text-warning';
    return 'text-muted-foreground';
  };

  const getAlertIcon = (type: string) => {
    if (type === 'missing_signature') return <FileWarning className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Manifest Follow-Up Alerts
              <Badge variant="outline" className="text-xs">Beta</Badge>
            </CardTitle>
            <CardDescription>
              Active alerts for incomplete or overdue manifests
            </CardDescription>
          </div>
          <Badge variant="secondary">{alerts.length} Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>No active alerts — all manifests are up to date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={getPriorityColor(alert.priority)}>
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  <div>
                    <div className="font-medium">
                      {alert.alert_type.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {alert.days_overdue > 0 && `${alert.days_overdue} days overdue`}
                    </div>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {alert.priority.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/manifests`)}
                  >
                    View
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
