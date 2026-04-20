import { useActiveFollowups, useUpdateWorkflow } from "@/hooks/useClientWorkflows";
import { useSendOutreachEmail } from "@/hooks/useSendOutreachEmail";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar, Building, Clock, Truck, Mail, Info, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function FollowupWorkflows() {
  const { data: followups, isLoading } = useActiveFollowups();
  const updateWorkflow = useUpdateWorkflow();
  const sendOutreachEmail = useSendOutreachEmail();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearAll = async () => {
    if (!followups?.length) return;
    setIsClearing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const updates = followups.map((w) => {
        const intervalDays = w.contact_interval_days || 30;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + intervalDays);
        return supabase
          .from('client_workflows')
          .update({
            last_contact_date: today,
            next_contact_date: nextDate.toISOString().split('T')[0],
            notes: 'Bulk marked as followed up',
            updated_at: new Date().toISOString(),
          })
          .eq('id', w.id);
      });

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length) throw new Error(`${errors.length} updates failed`);

      await queryClient.invalidateQueries({ queryKey: ['client-workflows'] });
      await queryClient.invalidateQueries({ queryKey: ['active-followups'] });
      toast({
        title: 'Followups cleared',
        description: `Marked ${followups.length} client followups as complete.`,
      });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsClearing(false);
    }
  };

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

  const handleSendEmail = async (workflowId: string, clientId: string, organizationId: string, intervalDays: number = 30) => {
    try {
      await sendOutreachEmail.mutateAsync({ clientId, organizationId });
      
      // Mark followup as complete after sending email
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + intervalDays);
      
      await updateWorkflow.mutateAsync({
        id: workflowId,
        updates: {
          last_contact_date: new Date().toISOString().split('T')[0],
          next_contact_date: nextDate.toISOString().split('T')[0],
          notes: 'Scheduling email sent',
          updated_at: new Date().toISOString()
        }
      });
    } catch {
      // Error already handled by mutation's onError
    }
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
          <div className="flex items-start gap-2 p-3 rounded-md border bg-muted/40 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Automated weekly outreach is <strong>off</strong> — staff sends these emails manually to protect manifest email delivery. Daily cap: 25 sends.
            </span>
          </div>
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
                  onClick={() => handleSendEmail(workflow.id, workflow.client_id, workflow.organization_id, intervalDays)}
                  disabled={sendOutreachEmail.isPending || updateWorkflow.isPending}
                  className="shrink-0"
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Send Email
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
