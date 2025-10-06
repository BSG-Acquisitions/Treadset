import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMovePickup } from "@/hooks/useMovePickup";
import { CalendarIcon, Clock, MapPin } from "lucide-react";
import { format, startOfWeek, addDays } from "date-fns";
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
  currentWeek?: Date; // Optional: if provided, show week view with quick day selection
}

export function MovePickupDialog({ open, onOpenChange, pickup, currentWeek }: MovePickupDialogProps) {
  const [newDate, setNewDate] = useState<Date>();
  const movePickup = useMovePickup();

  // Generate week days if currentWeek is provided
  const weekDays = currentWeek 
    ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(currentWeek, { weekStartsOn: 0 }), i))
    : [];

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

  const handleQuickDaySelect = (date: Date) => {
    setNewDate(date);
  };

  const today = new Date();
  const todayDateString = formatLocalDateString(today);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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

          {/* Quick Week Day Selection (if in week view) */}
          {weekDays.length > 0 && (
            <div className="space-y-2">
              <Label>Quick Select Day</Label>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day, index) => {
                  const dayDateString = formatLocalDateString(day);
                  const isToday = dayDateString === todayDateString;
                  const isSelected = newDate && formatLocalDateString(newDate) === dayDateString;
                  const isCurrentPickupDate = formatLocalDateString(new Date(pickup.pickup_date)) === dayDateString;
                  
                  return (
                    <Button
                      key={index}
                      type="button"
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleQuickDaySelect(day)}
                      disabled={isCurrentPickupDate}
                      className={cn(
                        "flex flex-col items-center py-2 h-auto",
                        isToday && !isSelected && "border-primary border-2",
                        isCurrentPickupDate && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className="text-xs font-medium">
                        {format(day, "EEE")}
                      </span>
                      <span className="text-sm font-bold">
                        {format(day, "d")}
                      </span>
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Click a day to quickly move the pickup within this week
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>{weekDays.length > 0 ? "Or Select Different Week" : "Select New Date *"}</Label>
            <Popover modal={true}>
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
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  initialFocus
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