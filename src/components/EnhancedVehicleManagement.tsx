import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCreateVehicle, useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";
import { Truck, Plus, Edit, Trash2 } from "lucide-react";

interface VehicleFormData {
  name: string;
  license_plate: string;
  capacity: number;
  driver_name: string;
  truck_type: 'active' | 'backup';
}

export function EnhancedVehicleManagement() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<VehicleFormData>({
    name: "",
    license_plate: "",
    capacity: 500,
    driver_name: "",
    truck_type: 'active'
  });

  const { data: vehicles = [], refetch } = useVehicles();
  const createVehicle = useCreateVehicle();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const vehicleName = formData.driver_name 
        ? `${formData.driver_name} - ${formData.truck_type === 'active' ? 'Active Truck' : 'Backup Truck'}`
        : formData.name;

      await createVehicle.mutateAsync({
        name: vehicleName,
        license_plate: formData.license_plate || undefined,
        capacity: formData.capacity,
        is_active: true,
        organization_id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'
      });
      
      setFormData({
        name: "",
        license_plate: "",
        capacity: 500,
        driver_name: "",
        truck_type: 'active'
      });
      setShowForm(false);
      
      toast({
        title: "Vehicle Added",
        description: `${vehicleName} has been added to your fleet`
      });
    } catch (error) {
      // Error handling is in the mutation
    }
  };

  const getVehicleType = (vehicleName: string) => {
    if (vehicleName.includes('Active Truck')) return 'Active';
    if (vehicleName.includes('Backup')) return 'Backup';
    return 'Standard';
  };

  const getCapacityColor = (capacity: number) => {
    if (capacity >= 500) return 'text-green-600 bg-green-50';
    if (capacity >= 350) return 'text-blue-600 bg-blue-50';
    return 'text-orange-600 bg-orange-50';
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
                Manage your vehicles and drivers for optimized routing
              </p>
            </div>
            
            <Dialog open={showForm} onOpenChange={setShowForm}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Vehicle & Driver</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
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
                    
                    <div>
                      <Label htmlFor="truck_type">Truck Type</Label>
                      <Select value={formData.truck_type} onValueChange={(value: 'active' | 'backup') =>
                        setFormData(prev => ({ ...prev, truck_type: value }))
                      }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active Truck (Multi-trip capable)</SelectItem>
                          <SelectItem value="backup">Backup Truck</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Brenner's capacity: 500 PTE, Standard: 300-350 PTE
                      </p>
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

                  <div>
                    <Label htmlFor="name">Vehicle Name (Optional)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Auto-generated from driver name"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={createVehicle.isPending} className="flex-1">
                      {createVehicle.isPending ? "Adding..." : "Add Vehicle"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
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
              <p className="text-muted-foreground">No vehicles in your fleet yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add vehicles to start optimizing routes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map(vehicle => (
                <div key={vehicle.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{vehicle.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-secondary px-2 py-1 rounded">
                          {getVehicleType(vehicle.name)}
                        </span>
                        {vehicle.license_plate && (
                          <span className="text-xs text-muted-foreground">
                            {vehicle.license_plate}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`text-sm px-3 py-1 rounded-full ${getCapacityColor(vehicle.capacity || 0)}`}>
                      {vehicle.capacity} PTE
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
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
              <h4 className="font-medium text-blue-900 mb-2">Fleet Capabilities</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Total Vehicles:</span> {vehicles.length}
                </div>
                <div>
                  <span className="text-blue-700">Total Capacity:</span> {vehicles.reduce((sum, v) => sum + (v.capacity || 0), 0)} PTE
                </div>
                <div>
                  <span className="text-blue-700">Active Trucks:</span> {vehicles.filter(v => v.name.includes('Active')).length}
                </div>
                <div>
                  <span className="text-blue-700">Multi-trip Capable:</span> Yes
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}