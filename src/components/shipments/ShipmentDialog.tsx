import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateShipment, useUpdateShipment, type ShipmentFormData, type ShipmentWithRelations } from "@/hooks/useShipments";
import { useDestinationEntities, useCreateEntity, useOwnEntity } from "@/hooks/useEntities";
import { MICHIGAN_CONVERSIONS, pteToTons, tonsToPTE } from "@/lib/michigan-conversions";
import type { Database } from "@/integrations/supabase/types";

type MaterialForm = Database['public']['Enums']['material_form'];
type EndUse = Database['public']['Enums']['end_use'];
type UnitBasis = Database['public']['Enums']['unit_basis'];

interface ShipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingShipment?: ShipmentWithRelations | null;
}

const MATERIAL_FORM_OPTIONS: { value: MaterialForm; label: string }[] = [
  { value: 'whole_off_rim', label: 'Whole Tires (Off-Rim)' },
  { value: 'on_rim', label: 'Tires (On-Rim)' },
  { value: 'semi', label: 'Semi/Truck Tires' },
  { value: 'otr', label: 'OTR Tires' },
  { value: 'shreds', label: 'Shredded Material' },
  { value: 'crumb', label: 'Crumb Rubber' },
  { value: 'baled', label: 'Baled Tires' },
  { value: 'tdf', label: 'TDF (Tire Derived Fuel)' }
];

const END_USE_OPTIONS: { value: EndUse; label: string }[] = [
  { value: 'reuse', label: 'Reuse/Retread' },
  { value: 'tdf', label: 'Tire Derived Fuel' },
  { value: 'crumb_rubberized', label: 'Crumb/Rubberized Products' },
  { value: 'civil_construction', label: 'Civil Construction' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'landfill', label: 'Landfill' },
  { value: 'export', label: 'Export' },
  { value: 'other', label: 'Other/Further Processing' }
];

const UNIT_BASIS_OPTIONS: { value: UnitBasis; label: string }[] = [
  { value: 'pte', label: 'PTE (Passenger Tire Equivalent)' },
  { value: 'tons', label: 'Tons' },
  { value: 'cubic_yards', label: 'Cubic Yards' }
];

export function ShipmentDialog({ open, onOpenChange, editingShipment }: ShipmentDialogProps) {
  const { data: destinations, isLoading: destinationsLoading } = useDestinationEntities();
  const { data: ownEntity } = useOwnEntity();
  const createShipment = useCreateShipment();
  const updateShipment = useUpdateShipment();
  const createEntity = useCreateEntity();

  const [showNewDestinationForm, setShowNewDestinationForm] = useState(false);
  const [newDestinationName, setNewDestinationName] = useState("");

  // Form state
  const [departedAt, setDepartedAt] = useState<Date>(new Date());
  const [arrivedAt, setArrivedAt] = useState<Date | null>(null);
  const [destinationEntityId, setDestinationEntityId] = useState<string>("");
  const [materialForm, setMaterialForm] = useState<MaterialForm>("whole_off_rim");
  const [quantity, setQuantity] = useState<number>(0);
  const [unitBasis, setUnitBasis] = useState<UnitBasis>("pte");
  const [endUse, setEndUse] = useState<EndUse>("other");
  const [carrier, setCarrier] = useState("");
  const [bolNumber, setBolNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Calculate PTE based on quantity and unit
  const calculatePTE = (): number => {
    if (unitBasis === 'pte') return quantity;
    if (unitBasis === 'tons') return tonsToPTE(quantity);
    if (unitBasis === 'cubic_yards') return quantity * MICHIGAN_CONVERSIONS.CUBIC_YARD_TO_PTE;
    return quantity;
  };

  // Calculate tons for display
  const displayTons = pteToTons(calculatePTE());

  // Populate form when editing
  useEffect(() => {
    if (editingShipment) {
      setDepartedAt(new Date(editingShipment.departed_at));
      setArrivedAt(editingShipment.arrived_at ? new Date(editingShipment.arrived_at) : null);
      setDestinationEntityId(editingShipment.destination_entity_id);
      setMaterialForm(editingShipment.material_form);
      setQuantity(editingShipment.quantity);
      setUnitBasis(editingShipment.unit_basis);
      setEndUse(editingShipment.end_use || 'other');
      setCarrier(editingShipment.carrier || "");
      setBolNumber(editingShipment.bol_number || "");
      setNotes(editingShipment.notes || "");
    } else {
      // Reset form for new shipment
      setDepartedAt(new Date());
      setArrivedAt(null);
      setDestinationEntityId("");
      setMaterialForm("whole_off_rim");
      setQuantity(0);
      setUnitBasis("pte");
      setEndUse("other");
      setCarrier("");
      setBolNumber("");
      setNotes("");
    }
  }, [editingShipment, open]);

  const handleAddNewDestination = async () => {
    if (!newDestinationName.trim()) return;
    
    try {
      const newEntity = await createEntity.mutateAsync({
        legal_name: newDestinationName.trim(),
        kind: 'processor'
      });
      setDestinationEntityId(newEntity.id);
      setShowNewDestinationForm(false);
      setNewDestinationName("");
    } catch (error) {
      console.error('Error creating entity:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!destinationEntityId || !ownEntity?.id) {
      return;
    }

    const formData: ShipmentFormData = {
      departed_at: format(departedAt, "yyyy-MM-dd'T'HH:mm:ss"),
      arrived_at: arrivedAt ? format(arrivedAt, "yyyy-MM-dd'T'HH:mm:ss") : null,
      destination_entity_id: destinationEntityId,
      origin_entity_id: ownEntity.id,
      material_form: materialForm,
      quantity,
      quantity_pte: calculatePTE(),
      unit_basis: unitBasis,
      direction: 'outbound',
      end_use: endUse,
      carrier: carrier || null,
      bol_number: bolNumber || null,
      notes: notes || null
    };

    try {
      if (editingShipment) {
        await updateShipment.mutateAsync({ id: editingShipment.id, data: formData });
      } else {
        await createShipment.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving shipment:', error);
    }
  };

  const isSubmitting = createShipment.isPending || updateShipment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingShipment ? 'Edit Shipment' : 'Record Outbound Shipment'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Departure Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !departedAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {departedAt ? format(departedAt, "PP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={departedAt}
                    onSelect={(date) => date && setDepartedAt(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Arrival Date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !arrivedAt && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {arrivedAt ? format(arrivedAt, "PP") : "Not arrived yet"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={arrivedAt || undefined}
                    onSelect={setArrivedAt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label>Destination *</Label>
            {showNewDestinationForm ? (
              <div className="flex gap-2">
                <Input
                  placeholder="New destination name"
                  value={newDestinationName}
                  onChange={(e) => setNewDestinationName(e.target.value)}
                />
                <Button type="button" onClick={handleAddNewDestination} disabled={createEntity.isPending}>
                  Add
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowNewDestinationForm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={destinationEntityId} onValueChange={setDestinationEntityId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations?.map(dest => (
                      <SelectItem key={dest.id} value={dest.id}>
                        {dest.legal_name}
                        {dest.city && ` - ${dest.city}, ${dest.state || ''}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => setShowNewDestinationForm(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Material Form */}
          <div className="space-y-2">
            <Label>Material Type *</Label>
            <Select value={materialForm} onValueChange={(v) => setMaterialForm(v as MaterialForm)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_FORM_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={quantity || ""}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={unitBasis} onValueChange={(v) => setUnitBasis(v as UnitBasis)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_BASIS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calculated Values Display */}
          <div className="p-3 rounded-md bg-muted text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Calculated:</span>
              <span><strong>{calculatePTE().toFixed(0)}</strong> PTE = <strong>{displayTons.toFixed(2)}</strong> tons</span>
            </div>
          </div>

          {/* End Use */}
          <div className="space-y-2">
            <Label>End Use</Label>
            <Select value={endUse} onValueChange={(v) => setEndUse(v as EndUse)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {END_USE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Carrier and BOL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Carrier/Driver</Label>
              <Input
                placeholder="e.g., Jody Green"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>BOL Number</Label>
              <Input
                placeholder="e.g., BOL-2026-0042"
                value={bolNumber}
                onChange={(e) => setBolNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional details, paper manifest reference, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !destinationEntityId || !quantity}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingShipment ? 'Update Shipment' : 'Record Shipment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
