import { DemoLayout } from '@/components/demo/DemoLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserCog, Mail, Shield } from 'lucide-react';
import { DEMO_EMPLOYEES } from '@/lib/demo';

export default function DemoEmployees() {
  const employees = DEMO_EMPLOYEES;

  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    ops_manager: 'Operations Manager',
    dispatcher: 'Dispatcher',
    driver: 'Driver',
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    ops_manager: 'bg-blue-100 text-blue-800 border-blue-200',
    dispatcher: 'bg-green-100 text-green-800 border-green-200',
    driver: 'bg-orange-100 text-orange-800 border-orange-200',
  };

  return (
    <DemoLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employees</h1>
            <p className="text-muted-foreground">{employees.length} team members</p>
          </div>
          <Button disabled>Invite Employee</Button>
        </div>

        {/* Employee Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => (
            <Card key={employee.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                      {employee.first_name[0]}{employee.last_name[0]}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {employee.first_name} {employee.last_name}
                      </CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="outline" className={roleColors[employee.role]}>
                  <Shield className="h-3 w-3 mr-1" />
                  {roleLabels[employee.role]}
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{employee.email}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DemoLayout>
  );
}
