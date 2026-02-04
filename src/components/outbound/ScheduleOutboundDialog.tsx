import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Truck, MapPin, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useDrivers } from '@/hooks/useDrivers';
import { useDestinationEntities } from '@/hooks/useEntities';
import { useVehicles } from '@/hooks/useVehicles';
import { useCreateOutboundAssignment } from '@/hooks/useOutboundAssignments';
import type { Database } from '@/integrations/supabase/types';

type MaterialForm = Database['public']['Enums']['material_form'];
type UnitBasis = Database['public']['Enums']['unit_basis'];

interface ScheduleOutboundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultDate?: Date;
  defaultDriverId?: string;
}

const MATERIAL_FORMS: { value: MaterialForm; label: string }[] = [
  { value: 'whole_off_rim', label: 'Whole Tires (Off Rim)' },
  { value: 'shreds', label: 'Shredded Material' },
  { value: 'crumb', label: 'Crumb Rubber' },
  { value: 'baled', label: 'Baled Tires' },
  { value: 'tdf', label: 'TDF (Tire Derived Fuel)' },
];

const UNIT_OPTIONS: { value: UnitBasis; label: string }[] = [
  { value: 'tons', label: 'Tons' },
  { value: 'pte', label: 'PTE' },
  { value: 'cubic_yards', label: 'Cubic Yards' },
];

export function ScheduleOutboundDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultDate,
  defaultDriverId,
}: ScheduleOutboundDialogProps) {
  const [driverId, setDriverId] = useState(defaultDriverId || '');
  const [destinationId, setDestinationId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(defaultDate);
  const [materialForm, setMaterialForm] = useState<MaterialForm | ''>('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<UnitBasis>('tons');
  const [notes, setNotes] = useState('');

  const { data: drivers = [] } = useDrivers();
  const { data: destinations = [] } = useDestinationEntities();
  const { data: vehicles = [] } = useVehicles();
  const createAssignment = useCreateOutboundAssignment();

  const handleSubmit = async () => {
    if (!driverId || !destinationId || !scheduledDate) return;

    await createAssignment.mutateAsync({
      driver_id: driverId,
      destination_entity_id: destinationId,
      vehicle_id: vehicleId || undefined,
      scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
      material_form: materialForm || undefined,
      estimated_quantity: quantity ? parseFloat(quantity) : undefined,
      estimated_unit: quantity ? unit : undefined,
      notes: notes || undefined,
    });

    // Reset form
    setDriverId(defaultDriverId || '');
    setDestinationId('');
    setVehicleId('');
    setScheduledDate(defaultDate);
    setMaterialForm('');
    setQuantity('');
    setUnit('tons');
    setNotes('');
    
    onOpenChange(false);
    onSuccess?.();
  };

  const isValid = !!driverId && !!destinationId && !!scheduledDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Schedule Outbound Delivery
          </DialogTitle>
          <DialogDescription>
            Assign a driver to deliver material to an external processor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Driver Selection */}
          <div className="space-y-2">
            <Label htmlFor="driver">Driver *</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Select driver..." />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.first_name} {driver.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !scheduledDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Destination Selection */}
          <div className="space-y-2">
            <Label htmlFor="destination" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Destination *
            </Label>
            <Select value={destinationId} onValueChange={setDestinationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination..." />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((dest) => (
                  <SelectItem key={dest.id} value={dest.id}>
                    {dest.legal_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vehicle Selection (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle (Optional)</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No specific vehicle</SelectItem>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Pre-fill Section */}
          <div className="border-t pt-4 mt-2">
            <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Optional: Pre-fill material estimates
            </p>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="materialForm">Material Type</Label>
                <Select 
                  value={materialForm} 
                  onValueChange={(v) => setMaterialForm(v as MaterialForm)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_FORMS.map((form) => (
                      <SelectItem key={form.value} value={form.value}>
                        {form.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Est. Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={unit} onValueChange={(v) => setUnit(v as UnitBasis)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes for Driver</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special instructions..."
                  className="min-h-[60px]"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || createAssignment.isPending}
          >
            {createAssignment.isPending ? 'Scheduling...' : 'Schedule Delivery'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
