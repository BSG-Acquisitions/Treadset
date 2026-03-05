import { useState, useEffect } from "react";
import { TrailerRoute, useUpdateTrailerRoute } from "@/hooks/useTrailerRoutes";
import { useSemiHaulerDrivers } from "@/hooks/useDriverCapabilities";
import { useTrailerVehicles } from "@/hooks/useTrailerVehicles";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EditTrailerRouteDialogProps {
  route: TrailerRoute;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTrailerRouteDialog({ route, open, onOpenChange }: EditTrailerRouteDialogProps) {
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date(route.scheduled_date + 'T00:00:00'));
  const [driverId, setDriverId] = useState(route.driver_id || '');
  const [vehicleId, setVehicleId] = useState(route.vehicle_id || '');
  const [notes, setNotes] = useState(route.notes || '');

  const { data: drivers } = useSemiHaulerDrivers();
  const { data: vehicles } = useTrailerVehicles();
  const updateRoute = useUpdateTrailerRoute();

  useEffect(() => {
    if (open) {
      setScheduledDate(new Date(route.scheduled_date + 'T00:00:00'));
      setDriverId(route.driver_id || '');
      setVehicleId(route.vehicle_id || '');
      setNotes(route.notes || '');
    }
  }, [open, route]);

  const handleSave = async () => {
    await updateRoute.mutateAsync({
      id: route.id,
      scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
      driver_id: driverId || null,
      vehicle_id: vehicleId || null,
      notes: notes || null,
    } as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Route</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Scheduled Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(scheduledDate, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={(d) => d && setScheduledDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No driver</SelectItem>
                {drivers?.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vehicle</SelectItem>
                {vehicles?.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vehicle_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Route notes..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateRoute.isPending}>
            {updateRoute.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
