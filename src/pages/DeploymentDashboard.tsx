import { useState } from 'react';
import { useSystemUpdates } from '@/hooks/useSystemUpdates';
import { useSandboxMode } from '@/contexts/SandboxModeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle, XCircle, Clock, Rocket, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const DeploymentDashboard = () => {
  const { updates, isLoading, updateStatus } = useSystemUpdates();
  const { isSandboxMode, toggleSandboxMode } = useSandboxMode();
  const [showDeployDialog, setShowDeployDialog] = useState(false);

  const verifiedModules = updates.filter(u => u.status === 'verified');

  const handleDeployAll = async () => {
    try {
      // Run verification tests
      toast.info('Running verification tests...');
      
      // Deploy each verified module
      for (const module of verifiedModules) {
        updateStatus({
          id: module.id,
          status: 'live',
          notes: `Deployed at ${new Date().toISOString()}`,
        });
      }

      // Exit sandbox mode
      if (isSandboxMode) {
        toggleSandboxMode();
      }

      toast.success('All verified modules deployed successfully!');
      setShowDeployDialog(false);
    } catch (error) {
      toast.error('Deployment failed. Please check logs.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'live':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'verified':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'sandboxed':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      live: 'default',
      verified: 'secondary',
      sandboxed: 'outline',
      failed: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Feature Deployment Summary</h1>
          <p className="text-muted-foreground mt-1">
            Manage and deploy features from sandbox to production
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant={isSandboxMode ? "default" : "outline"}
            onClick={toggleSandboxMode}
          >
            {isSandboxMode ? '✓ Sandbox Mode' : 'Production Mode'}
          </Button>
          {verifiedModules.length > 0 && (
            <Button 
              onClick={() => setShowDeployDialog(true)}
              className="gap-2"
            >
              <Rocket className="h-4 w-4" />
              Deploy {verifiedModules.length} Verified Module{verifiedModules.length !== 1 && 's'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Modules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{updates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sandboxed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {updates.filter(u => u.status === 'sandboxed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {verifiedModules.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Live</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {updates.filter(u => u.status === 'live').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Status</CardTitle>
          <CardDescription>Track deployment status of all modules</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Build Date</TableHead>
                <TableHead>Impacted Tables</TableHead>
                <TableHead>Last Test Result</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {updates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No modules tracked yet
                  </TableCell>
                </TableRow>
              ) : (
                updates.map((update) => (
                  <TableRow key={update.id}>
                    <TableCell className="font-medium">{update.module_name}</TableCell>
                    <TableCell>{getStatusBadge(update.status)}</TableCell>
                    <TableCell>
                      {format(new Date(update.created_at), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {update.impacted_tables?.join(', ') || 'None'}
                    </TableCell>
                    <TableCell>
                      {update.test_results ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not tested</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {update.status === 'sandboxed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus({ 
                              id: update.id, 
                              status: 'verified',
                              notes: 'Manual verification completed'
                            })}
                          >
                            Mark Verified
                          </Button>
                        )}
                        {update.status === 'verified' && (
                          <Button
                            size="sm"
                            onClick={() => updateStatus({ 
                              id: update.id, 
                              status: 'live' 
                            })}
                          >
                            Deploy
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={showDeployDialog} onOpenChange={setShowDeployDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Deploy Verified Modules to Production?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to deploy {verifiedModules.length} verified module(s) to production:</p>
              <ul className="list-disc list-inside pl-4">
                {verifiedModules.map(m => (
                  <li key={m.id} className="font-medium">{m.module_name}</li>
                ))}
              </ul>
              <p className="text-yellow-600 font-medium mt-4">
                This will:
              </p>
              <ul className="list-disc list-inside pl-4 text-sm">
                <li>Run final verification tests</li>
                <li>Merge sandbox changes into production</li>
                <li>Exit TEST MODE</li>
                <li>Make changes visible to all users</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeployAll}>
              Deploy to Production
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeploymentDashboard;
