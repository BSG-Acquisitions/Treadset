import { useEffect, useState } from "react";
import { usePickups } from "@/hooks/usePickups";
import { DriverPickupInterface } from "@/components/driver/DriverPickupInterface";
import { MovePickupDialog } from "@/components/MovePickupDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { Building, MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Package, Truck, MoreVertical, Move } from "lucide-react";
import { format } from "date-fns";

export default function DriverRoutes() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPickup, setSelectedPickup] = useState<string | null>(null);
  const [movePickupOpen, setMovePickupOpen] = useState(false);
  const [selectedPickupToMove, setSelectedPickupToMove] = useState<any>(null);
  const { data: pickups = [], isLoading } = usePickups(selectedDate);

  useEffect(() => {
    document.title = "Driver Routes – BSG";
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

  if (selectedPickup) {
    const pickup = pickups.find(p => p.id === selectedPickup);
    if (pickup) {
      return (
        <div className="min-h-screen bg-background">
          <main className="container py-8">
            <div className="mb-4">
              <Button 
                variant="outline" 
                onClick={() => setSelectedPickup(null)}
                className="mb-4"
              >
                ← Back to Route List
              </Button>
            </div>
            <DriverPickupInterface 
              pickup={pickup} 
              onComplete={() => setSelectedPickup(null)}
            />
          </main>
        </div>
      );
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-10">
          <p className="text-muted-foreground">Loading today's routes...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Truck className="h-8 w-8 text-brand-primary" />
              Driver Routes
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')} • {pickups.length} stops scheduled
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
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No routes scheduled</h3>
              <p className="text-muted-foreground">
                {selectedDate === new Date().toISOString().split('T')[0] 
                  ? "No routes scheduled for today"
                  : "No routes scheduled for this date"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Today's Pickup Route
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pickups.map((pickup, index) => {
                    const StatusIcon = getStatusIcon(pickup.status);
                    return (
                      <div
                        key={pickup.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/10 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-brand-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <StatusIcon className={`h-5 w-5 ${
                              pickup.status === 'completed' ? 'text-brand-success' :
                              pickup.status === 'overdue' ? 'text-destructive' :
                              'text-muted-foreground'
                            }`} />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-lg">
                                {pickup.client?.company_name || 'Unknown Client'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{pickup.location?.name || pickup.location?.address || 'No address'}</span>
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
                              Expected: PTE {pickup.pte_count} | OTR {pickup.otr_count} | Tractor {pickup.tractor_count}
                            </div>
                            <div className="text-xs text-muted-foreground mb-2">
                              Est. Revenue: ${pickup.computed_revenue?.toFixed(2) || '0.00'}
                            </div>
                            <Badge variant={getStatusColor(pickup.status)}>
                              {pickup.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              disabled={pickup.status === 'completed'}
                              onClick={() => setSelectedPickup(pickup.id)}
                              className="bg-brand-primary hover:bg-brand-primary/90"
                            >
                              {pickup.status === 'completed' ? '✅ Completed' : '📝 Start Pickup'}
                            </Button>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedPickupToMove(pickup);
                                    setMovePickupOpen(true);
                                  }}
                                >
                                  <Move className="h-4 w-4 mr-2" />
                                  Move to Different Date
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="bg-brand-primary/5 border-brand-primary/20">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-brand-primary">{pickups.length}</div>
                    <div className="text-sm text-muted-foreground">Total Stops</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-brand-success">
                      {pickups.filter(p => p.status === 'completed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-brand-warning">
                      {pickups.filter(p => p.status !== 'completed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Remaining</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      ${pickups.reduce((sum, p) => sum + (p.computed_revenue || 0), 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {selectedPickupToMove && (
          <MovePickupDialog
            open={movePickupOpen}
            onOpenChange={setMovePickupOpen}
            pickup={selectedPickupToMove}
          />
        )}
      </main>
    </div>
  );
}