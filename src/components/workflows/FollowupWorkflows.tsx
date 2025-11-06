import { useState } from "react";
import { useActiveFollowups, useUpdateWorkflow } from "@/hooks/useClientWorkflows";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Building, Clock, CheckCircle2 } from "lucide-react";

export function FollowupWorkflows() {
  const { data: followups, isLoading } = useActiveFollowups();
  const updateWorkflow = useUpdateWorkflow();
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const handleCompleteFollowup = async (workflowId: string) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 30);
    
    await updateWorkflow.mutateAsync({
      id: workflowId,
      updates: {
        last_contact_date: new Date().toISOString().split('T')[0],
        next_contact_date: nextDate.toISOString().split('T')[0],
        notes: notes || 'Followup completed',
        updated_at: new Date().toISOString()
      }
    });
    
    setSelectedWorkflow(null);
    setNotes("");
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
        <CardHeader className="bg-gradient-to-r from-success/20 to-success/10 border-b">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Client Followups ({followups.length})
          </CardTitle>
          <CardDescription>Clients scheduled for followup contact today</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {followups.map((workflow) => (
            <div key={workflow.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{workflow.clients?.company_name || 'Unknown Client'}</span>
                  <Badge variant="outline">{workflow.workflow_type}</Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Due: {new Date(workflow.next_contact_date).toLocaleDateString()}
                  </div>
                  {workflow.last_contact_date && (
                    <div>
                      Last: {new Date(workflow.last_contact_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                
                {workflow.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{workflow.notes}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleSnoozeFollowup(workflow.id, 7)}
                >
                  Snooze 7d
                </Button>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm"
                      onClick={() => setSelectedWorkflow(workflow)}
                    >
                      Complete
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Complete Followup
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium">{selectedWorkflow?.clients?.company_name || 'Unknown Client'}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {selectedWorkflow?.next_contact_date && 
                            new Date(selectedWorkflow.next_contact_date).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Notes (Optional)</label>
                        <Textarea 
                          placeholder="Add notes about this followup contact..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setSelectedWorkflow(null)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={() => selectedWorkflow && handleCompleteFollowup(selectedWorkflow.id)}
                          disabled={updateWorkflow.isPending}
                        >
                          {updateWorkflow.isPending ? "Completing..." : "Complete & Schedule Next"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}