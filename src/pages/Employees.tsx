import { useEmployees } from '@/hooks/useEmployees';
import { CreateEmployeeDialog } from '@/components/employees/CreateEmployeeDialog';
import { EditEmployeeDialog } from '@/components/employees/EditEmployeeDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, UserCheck, UserX, Mail, Phone } from 'lucide-react';
import { formatDate, formatPhoneNumber } from '@/lib/formatters';
import { SkeletonTable, EmptyState } from '@/components/ui/loading-states';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  ops_manager: 'Ops Manager',
  dispatcher: 'Dispatcher',
  driver: 'Driver',
  sales: 'Sales'
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'destructive',
  ops_manager: 'default',
  dispatcher: 'secondary',
  driver: 'outline',
  sales: 'default'
};

export default function EmployeesPage() {
  const { data: employees = [], isLoading, error } = useEmployees();

  const activeEmployees = employees.filter(emp => emp.isActive);
  const inactiveEmployees = employees.filter(emp => !emp.isActive);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold">Employee Management</h1>
            <p className="text-muted-foreground">Manage your team members and their access</p>
          </div>
        </div>
        <SkeletonTable />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-12">
          <p className="text-destructive">Error loading employees: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employee Management</h1>
          <p className="text-muted-foreground">Manage your team members and their access permissions</p>
        </div>
        <CreateEmployeeDialog />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeEmployees.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive Employees</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{inactiveEmployees.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            View and manage all employees in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <EmptyState
              title="No employees found"
              description="Add your first team member to get started with employee management."
              action={<CreateEmployeeDialog trigger={
                <Button>Add First Employee</Button>
              } />}
              icon={<Users className="h-12 w-12 text-muted-foreground" />}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {employee.firstName || employee.lastName 
                            ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
                            : 'No name set'
                          }
                        </div>
                        <div className="text-sm text-muted-foreground">{employee.email}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          <span>{employee.email}</span>
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{formatPhoneNumber(employee.phone)}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {employee.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={ROLE_COLORS[role] as any || 'default'}
                            className="text-xs"
                          >
                            {ROLE_LABELS[role] || role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(employee.createdAt)}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <EditEmployeeDialog employee={employee} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}