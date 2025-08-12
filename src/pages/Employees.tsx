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
import { Users, UserCheck, UserX, Mail, Phone, Truck, Shield, HeadphonesIcon, DollarSign } from 'lucide-react';
import { formatDate, formatPhoneNumber } from '@/lib/formatters';
import { SkeletonTable, EmptyState } from '@/components/ui/loading-states';
import { BrandHeader } from '@/components/BrandHeader';
import { StatsCard } from '@/components/enhanced/StatsCard';

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

const ROLE_ICONS: Record<string, typeof Shield> = {
  admin: Shield,
  ops_manager: Users,
  dispatcher: HeadphonesIcon,
  driver: Truck,
  sales: DollarSign
};

export default function EmployeesPage() {
  const { data: employees = [], isLoading, error } = useEmployees();

  const activeEmployees = employees.filter(emp => emp.isActive);
  const inactiveEmployees = employees.filter(emp => !emp.isActive);
  const adminCount = employees.filter(emp => emp.roles.includes('admin')).length;
  const driversCount = employees.filter(emp => emp.roles.includes('driver')).length;

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
    <div className="min-h-screen bg-background">
      {/* Enhanced Header */}
      <BrandHeader 
        title="Team Management" 
        subtitle="Manage your BSG workforce and operations team"
        className="mb-6"
      />
      
      <div className="space-y-8 p-6 max-w-7xl mx-auto">
        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Employee Directory</h2>
            <p className="text-muted-foreground">Track team performance and manage access permissions</p>
          </div>
          <CreateEmployeeDialog />
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Team"
            value={employees.length}
            icon={<Users className="w-5 h-5" />}
            variant="primary"
            change={8.2}
          />
          
          <StatsCard
            title="Active Members"
            value={activeEmployees.length}
            icon={<UserCheck className="w-5 h-5" />}
            variant="success"
            change={5.1}
          />
          
          <StatsCard
            title="Drivers"
            value={driversCount}
            icon={<Truck className="w-5 h-5" />}
            variant="accent"
            change={12.3}
          />
          
          <StatsCard
            title="Admins"
            value={adminCount}
            icon={<Shield className="w-5 h-5" />}
            variant="warning"
            change={-2.1}
          />
        </div>

        {/* Enhanced Employees Table */}
        <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-card-hover">
          <CardHeader className="border-b border-border/10 bg-gradient-to-r from-card to-secondary/30">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="w-5 h-5 text-brand-primary" />
              Team Directory
            </CardTitle>
            <CardDescription>
              Complete workforce overview with role assignments and contact information
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
                      <div className="flex flex-wrap gap-2">
                        {employee.roles.map((role) => {
                          const IconComponent = ROLE_ICONS[role];
                          return (
                            <Badge
                              key={role}
                              variant={ROLE_COLORS[role] as any || 'default'}
                              className="text-xs flex items-center gap-1"
                            >
                              {IconComponent && <IconComponent className="w-3 h-3" />}
                              {ROLE_LABELS[role] || role}
                            </Badge>
                          );
                        })}
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
    </div>
  );
}