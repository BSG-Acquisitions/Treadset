import { useActiveFollowups, useUpdateWorkflow } from "@/hooks/useClientWorkflows";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Building, Clock, Truck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function FollowupWorkflows() {
  const { data: followups, isLoading } = useActiveFollowups();
  const updateWorkflow = useUpdateWorkflow();

  const handleCompleteFollowup = async (workflowId: string, intervalDays: number = 30) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + intervalDays);
    
    await updateWorkflow.mutateAsync({
      id: workflowId,
      updates: {
        last_contact_date: new Date().toISOString().split('T')[0],
        next_contact_date: nextDate.toISOString().split('T')[0],
        notes: 'Followup completed',
        updated_at: new Date().toISOString()
      }
    });
  };

  const getFrequencyLabel = (days: number | null) => {
    if (!days) return 'monthly';
    if (days <= 7) return 'weekly';
    if (days <= 14) return 'biweekly';
    return 'monthly';
  };

  const getFrequencyColor = (days: number | null) => {
    if (!days) return 'bg-muted text-muted-foreground';
    if (days <= 7) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (days <= 14) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  const handleSnoozeFollowup = async (workflowId: string, days: number) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    
    await updateWorkflow.mutateAsync({
      id: workflowId,
      updates: {
        next_contact_date: nextDate.toISOString().split('T')[0],
        notes: `Snoozed for ${days} days on ${new Date().toLocaleDateString()}`,
        updated_at: new Date().toISOString()
      }
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading followups...</div>;
  }

  if (!followups?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Client Followups
          </CardTitle>
          <CardDescription>No followups scheduled for today</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 shadow-lg">
        <CardHeader className="bg-brand-success border-b">
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-white" />
            Client Followups ({followups.length})
          </CardTitle>
          <CardDescription className="text-white/90">Clients scheduled for followup contact today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {followups.map((workflow) => {
            const lastPickup = workflow.clients?.last_pickup_at;
            const lastPickupDate = lastPickup ? new Date(lastPickup) : null;
            const intervalDays = workflow.contact_interval_days || 30;
            
            return (
              <div key={workflow.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                {/* One-click checkbox */}
                <Checkbox
                  checked={false}
                  onCheckedChange={() => handleCompleteFollowup(workflow.id, intervalDays)}
                  disabled={updateWorkflow.isPending}
                  className="h-5 w-5"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{workflow.clients?.company_name || 'Unknown Client'}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getFrequencyColor(intervalDays)}`}>
                      {getFrequencyLabel(intervalDays)}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {new Date(workflow.next_contact_date).toLocaleDateString()}
                    </div>
                    
                    {lastPickupDate && (
                      <div className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        Last pickup: {formatDistanceToNow(lastPickupDate, { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </div>

                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleSnoozeFollowup(workflow.id, 7)}
                  disabled={updateWorkflow.isPending}
                  className="shrink-0"
                >
                  Snooze 7d
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
