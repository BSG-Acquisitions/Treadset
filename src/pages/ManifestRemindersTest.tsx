import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useManifestReminders } from '@/hooks/useManifestReminders';
import { ManifestReminderActions } from '@/components/notifications/ManifestReminderActions';
import { format } from 'date-fns';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const ManifestRemindersTest = () => {
  const { 
    incompleteManifests, 
    isLoading, 
    processReminders, 
    isProcessing 
  } = useManifestReminders();

  const getDaysSince = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPriorityForDays = (days: number) => {
    if (days >= 3) return 'high';
    return 'medium';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manifest Reminder System</h1>
          <p className="text-muted-foreground">
            Automated internal reminders for incomplete or unsigned manifests
          </p>
        </div>
        <Button
          onClick={() => processReminders()}
          disabled={isProcessing || isLoading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          Process Reminders
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Incomplete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incompleteManifests.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Manifests needing attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {incompleteManifests.filter(m => getDaysSince(m.created_at) >= 3).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              3+ days old
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Needs Escalation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {incompleteManifests.filter(m => getDaysSince(m.created_at) >= 7).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              7+ days old (task creation)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incomplete Manifests (48+ Hours)</CardTitle>
          <CardDescription>
            Manifests requiring signatures or completion
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : incompleteManifests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No incomplete manifests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incompleteManifests.map((manifest) => {
                const daysSince = getDaysSince(manifest.created_at);
                const priority = getPriorityForDays(daysSince);

                return (
                  <Card key={manifest.id} className={`border-l-4 ${
                    priority === 'high' ? 'border-l-red-500' : 'border-l-yellow-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{manifest.manifest_number}</h4>
                            <Badge variant={priority === 'high' ? 'destructive' : 'default'}>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Day {daysSince} - {priority.toUpperCase()}
                            </Badge>
                            {daysSince >= 7 && (
                              <Badge variant="outline" className="bg-orange-100">
                                Escalation Required
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground mb-1">
                            Client: {manifest.clients?.company_name}
                          </p>

                          <p className="text-sm text-muted-foreground mb-3">
                            Created: {format(new Date(manifest.created_at), 'MMM d, yyyy h:mm a')}
                          </p>

                          <div className="space-y-1 mb-3">
                            {manifest.status === 'DRAFT' && (
                              <Badge variant="outline" className="mr-2">Status: Draft</Badge>
                            )}
                            {!manifest.customer_sig_path && (
                              <Badge variant="outline" className="mr-2">Missing Customer Signature</Badge>
                            )}
                            {!manifest.receiver_sig_path && (
                              <Badge variant="outline">Missing Receiver Signature</Badge>
                            )}
                          </div>

                          <ManifestReminderActions
                            manifestId={manifest.id}
                            manifestNumber={manifest.manifest_number}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reminder System Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✓ Automatic detection of manifests incomplete for 48+ hours</li>
            <li>✓ Internal notifications to Admin and Receptionist roles only</li>
            <li>✓ No external emails or client messages</li>
            <li>✓ Quick action buttons:
              <ul className="ml-6 mt-1">
                <li>• Open Manifest - Navigate to manifest view</li>
                <li>• Mark Complete - Instantly complete the manifest</li>
                <li>• Assign Follow-Up - Assign to team member</li>
              </ul>
            </li>
            <li>✓ Escalation rules:
              <ul className="ml-6 mt-1">
                <li>• Day 3+ → High Priority (red badge)</li>
                <li>• Day 7+ → Task creation trigger (placeholder ready)</li>
              </ul>
            </li>
            <li>✓ All reminders logged to system_updates table</li>
            <li>✓ Hourly background checks</li>
            <li>✓ Respects quiet hours (10 PM - 6 AM EST)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManifestRemindersTest;
