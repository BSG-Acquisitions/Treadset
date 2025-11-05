import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Package, Truck, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

interface Pickup {
  id: string;
  client?: { company_name: string };
  location?: { name: string };
  pickup_date: string;
  pte_count?: number;
  otr_count?: number;
  tractor_count?: number;
}

interface Dropoff {
  id: string;
  dropoff_customer?: { company_name: string; contact_name: string };
  dropoff_date: string;
  pte_count?: number;
  otr_count?: number;
  tractor_count?: number;
}

interface PTEBreakdownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pickups: Pickup[];
  dropoffs: Dropoff[];
  totalPTEs: number;
}

export function PTEBreakdownDialog({
  open,
  onOpenChange,
  title,
  pickups,
  dropoffs,
  totalPTEs
}: PTEBreakdownDialogProps) {
  const pickupPTEs = pickups.reduce((sum, p) => sum + (p.pte_count || 0) + (p.otr_count || 0) + (p.tractor_count || 0), 0);
  const dropoffPTEs = dropoffs.reduce((sum, d) => sum + (d.pte_count || 0) + (d.otr_count || 0) + (d.tractor_count || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Detailed breakdown of pickups and dropoffs
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="text-center p-3 rounded-lg bg-primary/5">
            <div className="text-2xl font-bold text-primary">{totalPTEs}</div>
            <div className="text-sm font-medium text-foreground">Total PTEs</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-success/5">
            <div className="text-2xl font-bold text-success">{pickupPTEs}</div>
            <div className="text-sm font-medium text-foreground">From Pickups</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-accent/5">
            <div className="text-2xl font-bold text-accent">{dropoffPTEs}</div>
            <div className="text-sm font-medium text-foreground">From Dropoffs</div>
          </div>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          {pickups.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-success" />
                <h3 className="font-semibold">Pickups ({pickups.length})</h3>
              </div>
              <div className="space-y-2">
                {pickups.map((pickup) => {
                  const ptes = (pickup.pte_count || 0) + (pickup.otr_count || 0) + (pickup.tractor_count || 0);
                  return (
                    <div key={pickup.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {pickup.client?.company_name || 'Unknown Client'}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {pickup.location?.name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {pickup.location.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(pickup.pickup_date), 'MMM d')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {ptes} PTEs
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pickups.length > 0 && dropoffs.length > 0 && (
            <Separator className="my-4" />
          )}

          {dropoffs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Truck className="w-4 h-4 text-accent" />
                <h3 className="font-semibold">Dropoffs ({dropoffs.length})</h3>
              </div>
              <div className="space-y-2">
                {dropoffs.map((dropoff) => {
                  const ptes = (dropoff.pte_count || 0) + (dropoff.otr_count || 0) + (dropoff.tractor_count || 0);
                  return (
                    <div key={dropoff.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {dropoff.dropoff_customer?.company_name || dropoff.dropoff_customer?.contact_name || 'Unknown Customer'}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(dropoff.dropoff_date), 'MMM d')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {ptes} PTEs
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {pickups.length === 0 && dropoffs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No pickups or dropoffs found for this period
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
