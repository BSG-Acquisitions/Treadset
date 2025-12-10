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
import { Settings, Loader2, KeyRound, CheckCircle } from 'lucide-react';
import { useUpdateEmployee, Employee, UpdateEmployeeData } from '@/hooks/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
    email: employee.email,
    firstName: employee.firstName || '',
    lastName: employee.lastName || '',
    phone: employee.phone || '',
    roles: employee.roles,
    isActive: employee.isActive
  });
  const [resetting, setResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const updateEmployee = useUpdateEmployee();
  const { resetPassword } = useAuth();

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

  const handleResetPassword = async () => {
    if (!employee.email) {
      toast.error('No email address found for this employee');
      return;
    }

    setResetting(true);
    try {
      await resetPassword(employee.email);
      setResetSent(true);
      toast.success(`Password reset email sent to ${employee.email}`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send password reset email');
    } finally {
      setResetting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setResetSent(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
          <DialogDescription>
            Update employee information and permissions.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@example.com"
            />
            <p className="text-xs text-muted-foreground">
              Email will be normalized to lowercase
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

          {/* Password Reset Section */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Password Reset</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Send a password reset email to this employee. They'll receive a link to set a new password.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetPassword}
              disabled={resetting || resetSent}
              className="w-full sm:w-auto"
            >
              {resetting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : resetSent ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  Reset Email Sent
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
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
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {ROLE_OPTIONS.map((role) => (
                <div key={role.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={role.value}
                    checked={formData.roles?.includes(role.value) || false}
                    onCheckedChange={(checked) => 
                      handleRoleChange(role.value, checked as boolean)
                    }
                  />
                  <div className="grid gap-1 leading-none flex-1">
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateEmployee.isPending || !formData.roles?.length}
              className="w-full sm:w-auto"
            >
              {updateEmployee.isPending ? 'Updating...' : 'Update Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
