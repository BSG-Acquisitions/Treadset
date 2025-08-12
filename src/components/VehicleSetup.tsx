import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateVehicle, useVehicles } from "@/hooks/useVehicles";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Plus, CheckCircle } from "lucide-react";

export function VehicleSetup() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    license_plate: "",
    capacity: 150
  });
  const [isCreatingDefaults, setIsCreatingDefaults] = useState(false);

  const { data: vehicles = [], refetch } = useVehicles();
  const createVehicle = useCreateVehicle();
  const { toast } = useToast();

  const handleCreateDefaults = async () => {
    setIsCreatingDefaults(true);
    try {
      const { error } = await supabase.functions.invoke('vehicle-setup', {
        body: { action: 'create_default_fleet' }
      });

      if (error) throw error;

      toast({
        title: "Default Fleet Created",
        description: "Added 3 vehicles to your fleet (Truck 1, Truck 2, Backup Truck)"
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsCreatingDefaults(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createVehicle.mutateAsync({
        name: formData.name,
        license_plate: formData.license_plate || undefined,
        capacity: formData.capacity,
        is_active: true,
        organization_id: 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73' // BSG organization ID
      });
      
      setFormData({ name: "", license_plate: "", capacity: 150 });
      setShowForm(false);
    } catch (error) {
      // Error handling is in the mutation
    }
  };

  if (vehicles.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <Truck className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle>Set Up Your Fleet</CardTitle>
          <p className="text-muted-foreground">
            You need to add vehicles before you can schedule optimized pickups.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleCreateDefaults}
            disabled={isCreatingDefaults}
            className="w-full"
            size="lg"
          >
            {isCreatingDefaults ? "Creating..." : "Create Default Fleet"}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            This will add:
            <ul className="mt-2 space-y-1">
              <li>• Truck 1 - Brenner Whitt (150 PTE capacity)</li>
              <li>• Truck 2 - Drop off (200 PTE capacity)</li>  
              <li>• Backup Truck (120 PTE capacity)</li>
            </ul>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={() => setShowForm(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Custom Vehicle
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
        <CardTitle>Fleet Ready!</CardTitle>
        <p className="text-muted-foreground">
          You have {vehicles.length} active vehicle{vehicles.length === 1 ? '' : 's'} in your fleet.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {vehicles.map(vehicle => (
            <div key={vehicle.id} className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="font-medium">{vehicle.name}</span>
              <span className="text-sm text-muted-foreground">{vehicle.capacity} PTE</span>
            </div>
          ))
        }
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => setShowForm(true)}
          className="w-full mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Vehicle
        </Button>
      </CardContent>
    </Card>
  );

  // Rest of the component for the form...
}
