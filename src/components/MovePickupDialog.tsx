import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMovePickup } from "@/hooks/useMovePickup";
import { CalendarIcon, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatLocalDateString } from "@/lib/formatters";

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
  const [newDate, setNewDate] = useState<Date>();
  const movePickup = useMovePickup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) return;

    const dateString = formatLocalDateString(newDate);
    movePickup.mutate(
      { pickupId: pickup.id, newDate: dateString },
      {
        onSuccess: () => {
          onOpenChange(false);
          setNewDate(undefined);
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border z-50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Move Pickup
          </DialogTitle>
          <DialogDescription>
            Move {pickup.client?.company_name || 'this pickup'} to a different date
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>Current Date</Label>
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {format(new Date(pickup.pickup_date), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
          </div>

          {pickup.location?.address && (
            <div className="space-y-2">
              <Label>Location</Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {pickup.location.address}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Select New Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !newDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {newDate ? format(newDate, "EEEE, MMMM d, yyyy") : <span>Pick a new date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setNewDate(undefined);
              }}
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