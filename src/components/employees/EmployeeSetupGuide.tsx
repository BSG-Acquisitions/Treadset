import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Settings, 
  Users, 
  Shield, 
  Mail,
  ExternalLink,
  AlertTriangle
} from 'lucide-react';
import { configureSupabaseForEmployees, checkEmployeeManagementAccess } from '@/lib/employee-setup';
import { useAuth } from '@/contexts/AuthContext';

interface SetupStatus {
  success: boolean;
  message: string;
  instructions?: string[];
  error?: string;
  troubleshooting?: string[];
}

export function EmployeeSetupGuide() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [accessCheck, setAccessCheck] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const runSetupCheck = async () => {
    setLoading(true);
    try {
      const [setupResult, accessResult] = await Promise.all([
        configureSupabaseForEmployees(),
        checkEmployeeManagementAccess()
      ]);
      
      setSetupStatus(setupResult);
      setAccessCheck(accessResult);
    } catch (error) {
      setSetupStatus({
        success: false,
        message: 'Setup check failed',
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSetupCheck();
  }, []);

  const setupSteps = [
    {
      title: 'Supabase Authentication',
      description: 'Configure email settings and user registration',
      status: setupStatus?.success ? 'complete' : 'pending',
      link: 'https://supabase.com/dashboard/project/wvjehbozyxhmgdljwsiz/auth/providers'
    },
    {
      title: 'User Management Access',
      description: 'Verify admin permissions for employee management',
      status: accessCheck?.canManage ? 'complete' : 'pending'
    },
    {
      title: 'Organization Setup',
      description: 'Complete your organization configuration',
      status: user?.currentOrganization ? 'complete' : 'pending'
    }
  ];

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Employee Management Setup</h1>
        <p className="text-muted-foreground">
          Configure your system to manage team members and their access
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-4">
        <Button onClick={runSetupCheck} disabled={loading}>
          {loading ? 'Checking...' : 'Run Setup Check'}
        </Button>
        <Button variant="outline" asChild>
          <a 
            href="https://supabase.com/dashboard/project/wvjehbozyxhmgdljwsiz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            Open Supabase Dashboard
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {/* Status Overview */}
      {setupStatus && (
        <Alert className={setupStatus.success ? 'border-primary' : 'border-destructive'}>
          <div className="flex items-center gap-2">
            {setupStatus.success ? (
              <CheckCircle className="h-5 w-5 text-primary" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <AlertDescription className="font-medium">
              {setupStatus.message}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Setup Steps */}
      <div className="grid gap-4">
        <h2 className="text-xl font-semibold text-foreground">Setup Steps</h2>
        {setupSteps.map((step, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    {step.status === 'complete' ? (
                      <CheckCircle className="h-5 w-5 text-primary" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                    <CardDescription>{step.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={step.status === 'complete' ? 'default' : 'secondary'}>
                    {step.status === 'complete' ? 'Complete' : 'Pending'}
                  </Badge>
                  {step.link && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={step.link} target="_blank" rel="noopener noreferrer">
                        Configure
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      {setupStatus?.instructions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {setupStatus.instructions.map((instruction, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="font-medium text-primary">{index + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting */}
      {setupStatus?.troubleshooting && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {setupStatus.troubleshooting.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-destructive">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <CardTitle>What You'll Be Able To Do</CardTitle>
          <CardDescription>
            Once setup is complete, you'll have full employee management capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">Add Team Members</h3>
                <p className="text-sm text-muted-foreground">
                  Create employee accounts with email and password
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">Assign Roles</h3>
                <p className="text-sm text-muted-foreground">
                  Control access with Admin, Manager, Driver, and Sales roles
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Settings className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">Manage Permissions</h3>
                <p className="text-sm text-muted-foreground">
                  Update employee information and activate/deactivate accounts
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium">Instant Access</h3>
                <p className="text-sm text-muted-foreground">
                  Employees can log in immediately with their credentials
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ready to proceed */}
      {setupStatus?.success && accessCheck?.canManage && (
        <div className="text-center">
          <Button size="lg" asChild>
            <a href="/employees">
              Go to Employee Management
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}