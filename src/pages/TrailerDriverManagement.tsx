import { useState } from "react";
import { useEmployees } from "@/hooks/useEmployees";
import { useDriverCapabilities, useGrantCapability, useRevokeCapability } from "@/hooks/useDriverCapabilities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, User, Shield } from "lucide-react";

export default function TrailerDriverManagement() {
  const { data: employees, isLoading } = useEmployees();
  const grantCapability = useGrantCapability();
  const revokeCapability = useRevokeCapability();

  // Get drivers only
  const drivers = employees?.filter(emp => emp.roles?.includes('driver')) || [];

  const handleToggleCapability = async (userId: string, hasCapability: boolean) => {
    if (hasCapability) {
      await revokeCapability.mutateAsync({ userId, capability: 'semi_hauler' });
    } else {
      await grantCapability.mutateAsync({ userId, capability: 'semi_hauler' });
    }
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Trailer Driver Management</h1>
        <p className="text-muted-foreground">
          Manage which drivers can be assigned to trailer move routes
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Semi-Hauler Capability
          </CardTitle>
          <CardDescription>
            Only drivers with this capability can be assigned to trailer routes and will see trailer assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Semi-Hauler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map(driver => (
                <DriverRow 
                  key={driver.id} 
                  driver={driver}
                  onToggle={handleToggleCapability}
                />
              ))}
              {drivers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No drivers found. Add drivers in the Employees section first.
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

function DriverRow({ 
  driver, 
  onToggle 
}: { 
  driver: any; 
  onToggle: (userId: string, hasCapability: boolean) => void;
}) {
  const { data: capabilities, isLoading } = useDriverCapabilities(driver.user_id);
  const hasSemiHauler = capabilities?.some(c => c.capability === 'semi_hauler') ?? false;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="font-medium">
            {driver.first_name} {driver.last_name}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{driver.email}</TableCell>
      <TableCell>
        <Badge variant="outline">{driver.role}</Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {hasSemiHauler && (
            <Truck className="h-4 w-4 text-green-600" />
          )}
          <Switch
            checked={hasSemiHauler}
            onCheckedChange={() => onToggle(driver.user_id, hasSemiHauler)}
            disabled={isLoading}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}
