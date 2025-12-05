import { useState } from "react";
import { useTrailerVehicles, useCreateTrailerVehicle, useDeleteTrailerVehicle } from "@/hooks/useTrailerVehicles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Truck, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function TrailerVehicles() {
  const { data: vehicles, isLoading } = useTrailerVehicles();
  const createVehicle = useCreateTrailerVehicle();
  const deleteVehicle = useDeleteTrailerVehicle();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    vehicle_number: '',
    vehicle_type: 'semi_truck',
    license_plate: '',
    vin: '',
    notes: '',
  });

  const handleAddVehicle = async () => {
    if (!newVehicle.vehicle_number.trim()) return;
    
    await createVehicle.mutateAsync(newVehicle);
    setNewVehicle({
      vehicle_number: '',
      vehicle_type: 'semi_truck',
      license_plate: '',
      vin: '',
      notes: '',
    });
    setShowAddDialog(false);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trailer Vehicles</h1>
          <p className="text-muted-foreground">Manage semi-trucks and trailer-pulling vehicles</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Trailer Vehicle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="vehicle_number">Vehicle Number *</Label>
                <Input
                  id="vehicle_number"
                  value={newVehicle.vehicle_number}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicle_number: e.target.value }))}
                  placeholder="e.g., SEMI-001"
                />
              </div>
              <div>
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Input
                  id="vehicle_type"
                  value={newVehicle.vehicle_type}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, vehicle_type: e.target.value }))}
                  placeholder="e.g., semi_truck, box_truck"
                />
              </div>
              <div>
                <Label htmlFor="license_plate">License Plate</Label>
                <Input
                  id="license_plate"
                  value={newVehicle.license_plate}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, license_plate: e.target.value }))}
                  placeholder="ABC-1234"
                />
              </div>
              <div>
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  value={newVehicle.vin}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, vin: e.target.value }))}
                  placeholder="Vehicle Identification Number"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newVehicle.notes}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                />
              </div>
              <Button 
                onClick={handleAddVehicle} 
                disabled={!newVehicle.vehicle_number.trim() || createVehicle.isPending}
                className="w-full"
              >
                {createVehicle.isPending ? 'Adding...' : 'Add Vehicle'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Vehicle Fleet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead>VIN</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles?.map(vehicle => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-medium">{vehicle.vehicle_number}</TableCell>
                  <TableCell>{vehicle.vehicle_type}</TableCell>
                  <TableCell>{vehicle.license_plate || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{vehicle.vin || '-'}</TableCell>
                  <TableCell>{format(new Date(vehicle.created_at), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteVehicle.mutate(vehicle.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!vehicles || vehicles.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No vehicles added yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
