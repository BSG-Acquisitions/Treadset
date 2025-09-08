import { useEffect, useState } from "react";
import { usePickups } from "@/hooks/usePickups";
import { CompletePickupDialog } from "@/components/CompletePickupDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TopNav } from "@/components/TopNav";
import { Building, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Package } from "lucide-react";
import { format } from "date-fns";

export default function RoutesToday() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  console.log('RoutesToday: Fetching pickups for date:', selectedDate);
  const { data: pickups = [], isLoading } = usePickups(selectedDate);
  console.log('RoutesToday: Received pickups data:', pickups);

  useEffect(() => {
    document.title = "Today's Routes – BSG";
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in_progress': return Clock;
      case 'overdue': return AlertCircle;
      default: return Calendar;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <main className="container py-10">
          <p className="text-muted-foreground">Loading today's pickups...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Complete Today's Pickups</h1>
            <p className="text-muted-foreground">
              {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')} • {pickups.length} pickups scheduled
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        {pickups.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No pickups scheduled</h3>
              <p className="text-muted-foreground">
                {selectedDate === new Date().toISOString().split('T')[0] 
                  ? "No pickups scheduled for today"
                  : "No pickups scheduled for this date"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Scheduled Pickups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pickups.map((pickup) => {
                  const StatusIcon = getStatusIcon(pickup.status);
                  return (
                    <div
                      key={pickup.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <StatusIcon className={`h-5 w-5 ${
                          pickup.status === 'completed' ? 'text-brand-success' :
                          pickup.status === 'overdue' ? 'text-destructive' :
                          'text-muted-foreground'
                        }`} />
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-lg">
                              {pickup.client?.company_name || 'Unknown Client'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{pickup.location?.address || pickup.location?.name || 'No address'}</span>
                          </div>
                          {pickup.notes && (
                            <p className="text-sm text-muted-foreground italic">
                              Notes: {pickup.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium mb-1">
                            Scheduled: PTE {pickup.pte_count} | OTR {pickup.otr_count} | Tractor {pickup.tractor_count}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Revenue: ${pickup.computed_revenue?.toFixed(2) || '0.00'}
                          </div>
                          <Badge variant={getStatusColor(pickup.status)}>
                            {pickup.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        <CompletePickupDialog
                          pickup={pickup}
                          trigger={
                            <Button size="sm" disabled={pickup.status === 'completed'}>
                              {pickup.status === 'completed' ? 'Completed' : 'Complete Pickup'}
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}