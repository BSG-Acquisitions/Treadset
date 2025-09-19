import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, UserCheck, UserX } from "lucide-react";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DriverAssignmentDropdownProps {
  vehicleId: string;
  vehicleName: string;
  currentDriverId?: string;
  routeDate: string;
  onDriverAssigned?: (driverId: string | null) => void;
}

export const DriverAssignmentDropdown: React.FC<DriverAssignmentDropdownProps> = ({
  vehicleId,
  vehicleName,
  currentDriverId,
  routeDate,
  onDriverAssigned
}) => {
  const { data: employees = [] } = useEmployees();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filter employees to get only drivers
  const drivers = employees.filter(employee => 
    employee.roles.includes('driver') && employee.isActive
  );

  const currentDriver = drivers.find(driver => driver.id === currentDriverId);

  const assignDriverMutation = useMutation({
    mutationFn: async (driverId: string | null) => {
      // Update assignments to assign driver
      const { data, error } = await supabase
        .from('assignments')
        .update({ 
          driver_id: driverId 
        })
        .eq('vehicle_id', vehicleId)
        .eq('scheduled_date', routeDate)
        .select();

      if (error) throw error;
      
      console.log('Driver assignment updated:', { vehicleId, routeDate, driverId, updatedAssignments: data });
      return driverId;
    },
    onSuccess: (driverId) => {
      const driverName = driverId ? drivers.find(d => d.id === driverId)?.firstName || 'Driver' : 'Unassigned';
      toast({
        title: "Driver Assignment Updated",
        description: `${vehicleName} is now ${driverId ? `assigned to ${driverName}` : 'unassigned'}`,
      });
      onDriverAssigned?.(driverId);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign driver",
        variant: "destructive"
      });
    }
  });

  const handleDriverChange = (driverId: string) => {
    const actualDriverId = driverId === "unassigned" ? null : driverId;
    assignDriverMutation.mutate(actualDriverId);
  };

  const getDriverDisplayName = (driver: Employee) => {
    return `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.email;
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Driver:</span>
      </div>
      
      {currentDriver ? (
        <Badge variant="secondary" className="flex items-center gap-1">
          <UserCheck className="h-3 w-3" />
          {getDriverDisplayName(currentDriver)}
        </Badge>
      ) : (
        <Badge variant="outline" className="flex items-center gap-1">
          <UserX className="h-3 w-3" />
          Unassigned
        </Badge>
      )}

      <Select
        value={currentDriverId || "unassigned"}
        onValueChange={handleDriverChange}
        disabled={assignDriverMutation.isPending}
      >
        <SelectTrigger className="w-48 bg-background border-border hover:bg-accent/50 z-50">
          <SelectValue placeholder="Assign Driver" />
        </SelectTrigger>
        <SelectContent className="bg-background border-border shadow-lg z-50">
          <SelectItem value="unassigned" className="hover:bg-accent/50">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              <span>Unassigned</span>
            </div>
          </SelectItem>
          {drivers.map((driver) => (
            <SelectItem key={driver.id} value={driver.id} className="hover:bg-accent/50">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">{getDriverDisplayName(driver)}</div>
                  <div className="text-xs text-muted-foreground">{driver.email}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {assignDriverMutation.isPending && (
        <div className="text-sm text-muted-foreground">Updating...</div>
      )}
    </div>
  );
};