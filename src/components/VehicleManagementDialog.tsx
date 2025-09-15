import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Truck, Edit3, Save, X, Plus, Trash2 } from "lucide-react";
import { useVehicles, useUpdateVehicle, useCreateVehicle, useDeleteVehicle } from "@/hooks/useVehicles";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface VehicleManagementDialogProps {
  trigger?: React.ReactNode;
}

export const VehicleManagementDialog: React.FC<VehicleManagementDialogProps> = ({ trigger }) => {
  const { data: vehicles = [] } = useVehicles();
  const updateVehicle = useUpdateVehicle();
  const createVehicle = useCreateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingVehicle, setEditingVehicle] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editValues, setEditValues] = useState<{ name: string; capacity: number; licensePlate?: string }>({
    name: '',
    capacity: 500,
    licensePlate: ''
  });
  const [newVehicle, setNewVehicle] = useState<{ name: string; capacity: number; licensePlate?: string }>({
    name: '',
    capacity: 500,
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
    setEditValues({ name: '', capacity: 500, licensePlate: '' });
  };

  const handleCreateVehicle = async () => {
    if (!newVehicle.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a vehicle/company name",
        variant: "destructive"
      });
      return;
    }

    if (!user?.currentOrganization?.id) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive"
      });
      return;
    }

    try {
      await createVehicle.mutateAsync({
        name: newVehicle.name,
        capacity: newVehicle.capacity,
        license_plate: newVehicle.licensePlate || null,
        organization_id: user.currentOrganization.id,
        is_active: true
      });
      setNewVehicle({ name: '', capacity: 500, licensePlate: '' });
      setShowAddForm(false);
      toast({
        title: "Vehicle Added",
        description: `Successfully added ${newVehicle.name} to your fleet`,
      });
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "Failed to create new vehicle",
        variant: "destructive"
      });
    }
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
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Manage your fleet vehicles and subcontractor trucks. Each vehicle can operate separate routes on the same day.
            </p>
            <Button 
              onClick={() => setShowAddForm(!showAddForm)} 
              variant="outline" 
              size="sm"
              disabled={createVehicle.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </div>

          {/* Add New Vehicle Form */}
          {showAddForm && (
            <div className="p-4 border rounded-lg bg-muted/20 border-dashed">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Vehicle/Subcontractor
              </h4>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <Label htmlFor="newName" className="text-xs">Vehicle/Company Name</Label>
                  <Input
                    id="newName"
                    value={newVehicle.name}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., ABC Trucking, XYZ Fleet"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="newCapacity" className="text-xs">Capacity (PTE)</Label>
                  <Input
                    id="newCapacity"
                    type="number"
                    value={newVehicle.capacity}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, capacity: parseInt(e.target.value) || 500 }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="newLicensePlate" className="text-xs">License Plate (Optional)</Label>
                  <Input
                    id="newLicensePlate"
                    value={newVehicle.licensePlate}
                    onChange={(e) => setNewVehicle(prev => ({ ...prev, licensePlate: e.target.value }))}
                    placeholder="ABC-1234"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleCreateVehicle}
                  disabled={createVehicle.isPending}
                >
                  {createVehicle.isPending ? "Creating..." : "Create Vehicle"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowAddForm(false);
                    setNewVehicle({ name: '', capacity: 500, licensePlate: '' });
                  }}
                  disabled={createVehicle.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {showAddForm && <Separator />}
          
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
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(vehicle)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border z-50">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Vehicle</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{vehicle.name}"? This will remove it from your fleet but preserve historical assignment data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteVehicle.mutate(vehicle.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Vehicle
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
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