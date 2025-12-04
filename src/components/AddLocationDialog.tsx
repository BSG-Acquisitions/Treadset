import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateLocation } from "@/hooks/useLocations";
import { useAuth } from "@/contexts/AuthContext";

interface AddLocationDialogProps {
  clientId: string;
  trigger: React.ReactNode;
}

export function AddLocationDialog({ clientId, trigger }: AddLocationDialogProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const createLocation = useCreateLocation();
  
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    access_notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.currentOrganization?.id) return;
    
    await createLocation.mutateAsync({
      client_id: clientId,
      organization_id: user.currentOrganization.id,
      name: formData.name || null,
      address: formData.address,
      access_notes: formData.access_notes || null,
      is_active: true,
    });
    
    setFormData({ name: "", address: "", access_notes: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Address</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Location Name (optional)</Label>
            <Input
              id="name"
              placeholder="e.g., Main Shop, Warehouse"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              placeholder="Full street address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="access_notes">Access Notes (optional)</Label>
            <Textarea
              id="access_notes"
              placeholder="Gate code, parking instructions, etc."
              value={formData.access_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, access_notes: e.target.value }))}
              rows={2}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.address || createLocation.isPending}>
              {createLocation.isPending ? "Adding..." : "Add Address"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
