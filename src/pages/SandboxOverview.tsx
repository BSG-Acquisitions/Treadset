import { useSandboxMode } from '@/contexts/SandboxModeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  AlertTriangle, 
  FileText, 
  Database,
  TestTube,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const SandboxOverview = () => {
  const { isSandboxMode } = useSandboxMode();
  const navigate = useNavigate();

  const modules = [
    {
      name: 'Enhanced Notification Center',
      icon: Bell,
      description: 'In-app notifications with priority scoring, quick actions, and quiet hours',
      route: '/test/notifications',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      name: 'Contextual Notifications',
      icon: AlertTriangle,
      description: 'Auto-alerts for incomplete manifests, missing client data, unassigned pickups',
      route: '/test/notifications',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    },
    {
      name: 'Manifest Follow-Up System',
      icon: FileText,
      description: '48-hour reminders with escalation rules for unsigned manifests',
      route: '/test/manifest-reminders',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      name: 'Data Quality Checker',
      icon: Database,
      description: 'Non-destructive scanner for incomplete records with manual resolution',
      route: '/data-quality',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <TestTube className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Sandbox Test Environment</h1>
          </div>
          <p className="text-muted-foreground">
            All features below are running in isolated TEST MODE and won't affect production data
          </p>
        </div>
        {isSandboxMode && (
          <Badge variant="outline" className="h-8 px-4 text-lg border-yellow-500 text-yellow-600 dark:text-yellow-400">
            <TestTube className="h-4 w-4 mr-2" />
            TEST MODE ACTIVE
          </Badge>
        )}
      </div>

      <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-700 dark:text-green-400">
              Sandbox Visualization Activated
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            ✓ Sandbox schema created with isolated test tables
          </p>
          <p className="text-sm text-muted-foreground">
            ✓ System updates registered and tracked
          </p>
          <p className="text-sm text-muted-foreground">
            ✓ Test features accessible below
          </p>
          <p className="text-sm text-muted-foreground">
            ✓ Production data fully protected
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card key={module.name} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-3 rounded-lg ${module.bgColor}`}>
                    <Icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Sandboxed
                  </Badge>
                </div>
                <CardTitle className="mt-4">{module.name}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate(module.route)}
                  variant="outline"
                  className="w-full group"
                >
                  Test Module
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sandbox Schema Tables</CardTitle>
          <CardDescription>
            Isolated test tables that mirror production structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['clients', 'pickups', 'manifests', 'notifications', 'data_quality_flags'].map(table => (
              <div key={table} className="p-3 border rounded-lg">
                <Database className="h-4 w-4 text-muted-foreground mb-2" />
                <p className="text-sm font-mono">sandbox_.{table}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          onClick={() => navigate('/deployment')}
          size="lg"
          className="gap-2"
        >
          View Feature Deployment Dashboard
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default SandboxOverview;
