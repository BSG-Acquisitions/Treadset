import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Edit3, Save, X } from "lucide-react";
import { useVehicles, useUpdateVehicle } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";

interface VehicleManagementDialogProps {
  trigger?: React.ReactNode;
}

export const VehicleManagementDialog: React.FC<VehicleManagementDialogProps> = ({ trigger }) => {
  const { data: vehicles = [] } = useVehicles();
  const updateVehicle = useUpdateVehicle();
  const { toast } = useToast();
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ name: string; capacity: number; licensePlate?: string }>({
    name: '',
    capacity: 0,
    licensePlate: ''
  });

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle.id);
    setEditValues({
      name: vehicle.name,
      capacity: vehicle.capacity || 500,
      licensePlate: vehicle.license_plate || ''
    });
  };

  const handleSave = async (vehicleId: string) => {
    try {
      await updateVehicle.mutateAsync({
        vehicleId,
        updates: {
          name: editValues.name,
          capacity: editValues.capacity,
          license_plate: editValues.licensePlate
        }
      });
      setEditingVehicle(null);
      toast({
        title: "Vehicle Updated",
        description: `Successfully updated ${editValues.name}`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update vehicle details",
        variant: "destructive"
      });
    }
  };

  const handleCancel = () => {
    setEditingVehicle(null);
    setEditValues({ name: '', capacity: 0, licensePlate: '' });
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Truck className="h-4 w-4 mr-2" />
      Manage Vehicles
    </Button>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Vehicle & Subcontractor Management
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage your fleet vehicles and subcontractor trucks. Update names, capacity, and license plates as needed.
          </p>
          
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                {editingVehicle === vehicle.id ? (
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="name" className="text-xs">Vehicle/Company Name</Label>
                      <Input
                        id="name"
                        value={editValues.name}
                        onChange={(e) => setEditValues(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., RMH, ABC Trucking"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="capacity" className="text-xs">Capacity (PTE)</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={editValues.capacity}
                        onChange={(e) => setEditValues(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="licensePlate" className="text-xs">License Plate (Optional)</Label>
                      <Input
                        id="licensePlate"
                        value={editValues.licensePlate}
                        onChange={(e) => setEditValues(prev => ({ ...prev, licensePlate: e.target.value }))}
                        placeholder="ABC-1234"
                        className="mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <Truck className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{vehicle.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Capacity: {vehicle.capacity || 500} PTE
                        {vehicle.license_plate && ` • ${vehicle.license_plate}`}
                      </div>
                    </div>
                    <Badge variant={vehicle.is_active ? "default" : "secondary"}>
                      {vehicle.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  {editingVehicle === vehicle.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSave(vehicle.id)}
                        disabled={updateVehicle.isPending}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancel}
                        disabled={updateVehicle.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(vehicle)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {vehicles.length === 0 && (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No vehicles found</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};