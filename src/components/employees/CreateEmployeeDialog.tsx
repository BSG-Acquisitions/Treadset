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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus } from 'lucide-react';
import { useCreateEmployee, CreateEmployeeData } from '@/hooks/useEmployees';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrator', description: 'Full system access' },
  { value: 'ops_manager', label: 'Operations Manager', description: 'Manage clients, routes, and operations' },
  { value: 'dispatcher', label: 'Dispatcher', description: 'Route planning and assignments' },
  { value: 'driver', label: 'Driver', description: 'Execute routes and complete pickups' },
  { value: 'sales', label: 'Sales', description: 'Client management and booking' }
];

interface CreateEmployeeDialogProps {
  trigger?: React.ReactNode;
}

export function CreateEmployeeDialog({ trigger }: CreateEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateEmployeeData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    roles: []
  });

  const createEmployee = useCreateEmployee();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', formData);
    
    if (!formData.email || !formData.password || formData.roles.length === 0) {
      console.log('Form validation failed:', { 
        email: formData.email, 
        password: formData.password.length > 0, 
        roles: formData.roles 
      });
      return;
    }

    try {
      console.log('Attempting to create employee...');
      await createEmployee.mutateAsync(formData);
      console.log('Employee created successfully!');
      setOpen(false);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phone: '',
        roles: []
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      // Error is handled by the hook
    }
  };

  const handleRoleChange = (role: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, role]
        : prev.roles.filter(r => r !== role)
    }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setFormData(prev => ({ ...prev, password }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogDescription>
            Create a new employee account for your organization. They'll be able to log in immediately.
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
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john@company.com"
            />
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

          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type="text"
                required
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generatePassword}
              >
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Roles * (Select at least one)</Label>
            <div className="space-y-3">
              {ROLE_OPTIONS.map((role) => (
                <div key={role.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={role.value}
                    checked={formData.roles.includes(role.value)}
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
              disabled={createEmployee.isPending || !formData.email || !formData.password || formData.roles.length === 0}
            >
              {createEmployee.isPending ? 'Creating...' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}