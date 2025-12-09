import { useState, useEffect } from "react";
import { useUpdateTrailer, TrailerStatus } from "@/hooks/useTrailers";
import { TrailerWithLastEvent } from "@/hooks/useTrailerInventory";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface EditTrailerDialogProps {
  trailer: TrailerWithLastEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: { value: TrailerStatus; label: string }[] = [
  { value: "empty", label: "Empty" },
  { value: "full", label: "Full" },
  { value: "staged", label: "Staged" },
  { value: "in_transit", label: "In Transit" },
  { value: "waiting_unload", label: "Waiting to Unload" },
];

export function EditTrailerDialog({ trailer, open, onOpenChange }: EditTrailerDialogProps) {
  const updateTrailer = useUpdateTrailer();
  
  const [formData, setFormData] = useState({
    trailer_number: "",
    current_location: "",
    current_status: "empty" as TrailerStatus,
    ownership_type: "",
    owner_name: "",
    notes: "",
  });

  useEffect(() => {
    if (trailer) {
      setFormData({
        trailer_number: trailer.trailer_number || "",
        current_location: trailer.current_location || "",
        current_status: trailer.current_status || "empty",
        ownership_type: (trailer as any).ownership_type || "",
        owner_name: (trailer as any).owner_name || "",
        notes: trailer.notes || "",
      });
    }
  }, [trailer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trailer) return;

    await updateTrailer.mutateAsync({
      id: trailer.id,
      trailer_number: formData.trailer_number,
      current_location: formData.current_location || null,
      current_status: formData.current_status,
      notes: formData.notes || null,
    } as any);

    onOpenChange(false);
  };

  if (!trailer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Trailer {trailer.trailer_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trailer_number">Trailer Number</Label>
            <Input
              id="trailer_number"
              value={formData.trailer_number}
              onChange={(e) => setFormData(prev => ({ ...prev, trailer_number: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_status">Status</Label>
            <Select
              value={formData.current_status}
              onValueChange={(value: TrailerStatus) => 
                setFormData(prev => ({ ...prev, current_status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_location">Current Location</Label>
            <Input
              id="current_location"
              value={formData.current_location}
              onChange={(e) => setFormData(prev => ({ ...prev, current_location: e.target.value }))}
              placeholder="e.g., BSG Yard, Client Site, Processor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownership_type">Ownership Type</Label>
            <Input
              id="ownership_type"
              value={formData.ownership_type}
              onChange={(e) => setFormData(prev => ({ ...prev, ownership_type: e.target.value }))}
              placeholder="e.g., Owned, Rented"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="owner_name">Owner / Rented From</Label>
            <Input
              id="owner_name"
              value={formData.owner_name}
              onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
              placeholder="e.g., BSG Tire Recycling, ABC Rentals"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes about this trailer"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateTrailer.isPending}>
              {updateTrailer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
