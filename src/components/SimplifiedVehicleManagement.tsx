import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCreateVehicle, useVehicles, useUpdateVehicle, useDeleteVehicle } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";
import { Truck, Plus, Edit, Trash2 } from "lucide-react";

interface VehicleFormData {
  name: string;
  license_plate: string;
  capacity: number;
  driver_name: string;
}

export function SimplifiedVehicleManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [formData, setFormData] = useState<VehicleFormData>({
    name: "",
    license_plate: "",
    capacity: 500,
    driver_name: "",
  });

  const { data: vehicles = [], refetch } = useVehicles();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const vehicleName = `Truck ${vehicles.length + 1} - ${formData.driver_name}`;

      if (editingVehicle) {
        await updateVehicle.mutateAsync({
          vehicleId: editingVehicle.id,
          updates: {
            name: vehicleName,
            license_plate: formData.license_plate || undefined,
            capacity: formData.capacity,
          }
        });
        toast({
          title: "Vehicle Updated",
          description: `${vehicleName} has been updated successfully`
        });
      } else {
        await createVehicle.mutateAsync({
          name: vehicleName,
          license_plate: formData.license_plate || undefined,
          capacity: formData.capacity,
          is_active: true,
          organization_id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
        });
        toast({
          title: "Vehicle Added",
          description: `${vehicleName} has been added to your fleet`
        });
      }
      
      resetForm();
    } catch (error) {
      // Error handling is in the mutations
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      license_plate: "",
      capacity: 500,
      driver_name: "",
    });
    setShowForm(false);
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle: any) => {
    const driverName = vehicle.name.split(' - ')[1] || "";
    setFormData({
      name: vehicle.name,
      license_plate: vehicle.license_plate || "",
      capacity: vehicle.capacity || 500,
      driver_name: driverName,
    });
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  const handleDelete = async (vehicleId: string, vehicleName: string) => {
    if (confirm(`Are you sure you want to delete ${vehicleName}?`)) {
      await deleteVehicle.mutateAsync(vehicleId);
    }
  };

  const getTruckNumber = (vehicleName: string) => {
    const match = vehicleName.match(/Truck (\d+)/);
    return match ? match[1] : "?";
  };

  const getDriverName = (vehicleName: string) => {
    const parts = vehicleName.split(' - ');
    return parts.length > 1 ? parts[1] : "No Driver";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-6 w-6" />
                Fleet Management
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Simple truck and driver management
              </p>
            </div>
            
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingVehicle(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Truck
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingVehicle ? "Edit Truck & Driver" : "Add New Truck & Driver"}
                  </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="driver_name">Driver Name</Label>
                    <Input
                      id="driver_name"
                      value={formData.driver_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
                      placeholder="e.g., John Smith"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="capacity">PTE Capacity</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                        min={1}
                        max={1000}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="license_plate">License Plate</Label>
                      <Input
                        id="license_plate"
                        value={formData.license_plate}
                        onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value }))}
                        placeholder="e.g., BSG-003"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={createVehicle.isPending || updateVehicle.isPending} className="flex-1">
                      {createVehicle.isPending || updateVehicle.isPending ? "Saving..." : editingVehicle ? "Update Truck" : "Add Truck"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No trucks in your fleet yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add trucks to start managing routes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle, index) => (
                <div key={vehicle.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Truck {index + 1}</p>
                      <p className="text-sm text-muted-foreground">{getDriverName(vehicle.name)}</p>
                      {vehicle.license_plate && (
                        <p className="text-xs text-muted-foreground mt-1">
                          License: {vehicle.license_plate}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-sm px-3 py-1 rounded-full bg-blue-50 text-blue-600">
                      {vehicle.capacity} PTE
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(vehicle)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(vehicle.id, vehicle.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {vehicles.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Fleet Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Trucks:</span> {vehicles.length}
                </div>
                <div>
                  <span className="text-blue-700">Total Capacity:</span> {vehicles.reduce((sum, v) => sum + (v.capacity || 0), 0)} PTE
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}