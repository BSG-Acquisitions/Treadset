import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Settings } from 'lucide-react';
import { useUpdateEmployee, Employee, UpdateEmployeeData } from '@/hooks/useEmployees';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator', description: 'Full system access' },
  { value: 'ops_manager', label: 'Operations Manager', description: 'Manage clients, routes, and operations' },
  { value: 'dispatcher', label: 'Dispatcher', description: 'Route planning and assignments' },
  { value: 'driver', label: 'Driver', description: 'Execute routes and complete pickups' },
  { value: 'sales', label: 'Sales', description: 'Client management and booking' }
];

interface EditEmployeeDialogProps {
  employee: Employee;
  trigger?: React.ReactNode;
}

export function EditEmployeeDialog({ employee, trigger }: EditEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<UpdateEmployeeData>({
    firstName: employee.firstName || '',
    lastName: employee.lastName || '',
    phone: employee.phone || '',
    roles: employee.roles,
    isActive: employee.isActive
  });

  const updateEmployee = useUpdateEmployee();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.roles?.length) {
      return;
    }

    try {
      await updateEmployee.mutateAsync({
        employeeId: employee.id,
        updates: formData
      });
      setOpen(false);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...(prev.roles || []), role]
        : (prev.roles || []).filter(r => r !== role)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update employee information and permissions.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={employee.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed after account creation
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
            />
            <Label htmlFor="isActive">Active Employee</Label>
          </div>

          <div className="space-y-3">
            <Label>Roles * (Select at least one)</Label>
            <div className="space-y-3">
              {ROLE_OPTIONS.map((role) => (
                <div key={role.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={role.value}
                    checked={formData.roles?.includes(role.value) || false}
                    onCheckedChange={(checked) => 
                      handleRoleChange(role.value, checked as boolean)
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={role.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {role.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateEmployee.isPending || !formData.roles?.length}
            >
              {updateEmployee.isPending ? 'Updating...' : 'Update Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}