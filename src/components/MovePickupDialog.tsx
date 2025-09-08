import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMovePickup } from "@/hooks/useMovePickup";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface MovePickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickup: {
    id: string;
    pickup_date: string;
    client?: { company_name: string };
    location?: { address: string };
  };
}

export function MovePickupDialog({ open, onOpenChange, pickup }: MovePickupDialogProps) {
  const [newDate, setNewDate] = useState("");
  const movePickup = useMovePickup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;

    movePickup.mutate(
      { pickupId: pickup.id, newDate },
      {
        onSuccess: () => {
          onOpenChange(false);
          setNewDate("");
        }
      }
    );
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Move Pickup
          </DialogTitle>
          <DialogDescription>
            Move {pickup.client?.company_name || 'this pickup'} to a different date
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Date</Label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(new Date(pickup.pickup_date), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
          </div>

          {pickup.location?.address && (
            <div className="space-y-2">
              <Label>Location</Label>
              <p className="text-sm text-muted-foreground px-3 py-2 bg-muted rounded-md">
                {pickup.location.address}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newDate">New Date *</Label>
            <Input
              id="newDate"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={minDate}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!newDate || movePickup.isPending}
            >
              {movePickup.isPending ? "Moving..." : "Move Pickup"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}