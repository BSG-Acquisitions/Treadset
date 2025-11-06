import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, AlertCircle, Bell, Check } from "lucide-react";
import { useInvoicePendingClients } from "@/hooks/useInvoicePendingClients";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const InvoicePendingWidget = () => {
  const { data: pendingClients = [], isLoading } = useInvoicePendingClients();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const markAsInvoicedMutation = useMutation({
    mutationFn: async (clientId: string) => {
      // Find all manifests for this client that are pending
      const client = pendingClients.find(c => c.client_id === clientId);
      if (!client) return;

      // Get all manifest IDs for this client from today
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const { data: manifests } = await supabase
        .from('manifests')
        .select('id')
        .eq('client_id', clientId)
        .eq('payment_method', 'INVOICE')
        .eq('payment_status', 'PENDING')
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString());

      if (!manifests || manifests.length === 0) return;

      // Update all manifests for this client to SUCCEEDED (invoiced)
      const { error } = await supabase
        .from('manifests')
        .update({ payment_status: 'SUCCEEDED' })
        .in('id', manifests.map(m => m.id));

      if (error) throw error;

      return clientId;
    },
    onMutate: (clientId) => {
      setProcessingIds(prev => new Set(prev).add(clientId));
    },
    onSuccess: (clientId) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-pending-clients'] });
      const client = pendingClients.find(c => c.client_id === clientId);
      toast({
        title: "Marked as invoiced",
        description: `${client?.client_name} removed from invoice reminders`,
      });
    },
    onError: (error, clientId) => {
      console.error('Error marking as invoiced:', error);
      toast({
        title: "Error",
        description: "Failed to mark as invoiced. Please try again.",
        variant: "destructive",
      });
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    },
    onSettled: (clientId) => {
      if (clientId) {
        setProcessingIds(prev => {
          const next = new Set(prev);
          next.delete(clientId);
          return next;
        });
      }
    }
  });

  if (isLoading) {
    return (
      <Card className="border-border/20 shadow-elevation-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Pending Invoices
          </CardTitle>
          <CardDescription>Clients requiring invoice generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingClients.length === 0) {
    return null; // Don't show widget if no pending invoices today
  }

  return (
    <Card className="border-warning/20 shadow-elevation-lg bg-gradient-to-br from-card to-warning/5 border-2">
      <CardHeader className="bg-gradient-to-r from-success/20 to-success/10 border-b">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-warning/10">
            <Bell className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              Invoice Reminder
              <Badge variant="secondary" className="ml-2">
                {pendingClients.length} client{pendingClients.length !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <CardDescription>
              Create invoices in QuickBooks for today's pickups
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className={pendingClients.length > 4 ? "h-[280px] pr-4" : ""}>
          <div className="space-y-2">
            {pendingClients.map((client) => {
              const isProcessing = processingIds.has(client.client_id);
              return (
                <div
                  key={client.client_id}
                  className={`p-3 rounded-lg border bg-card/50 flex items-center gap-3 transition-opacity ${
                    isProcessing ? 'opacity-50' : ''
                  }`}
                >
                  <Checkbox
                    checked={isProcessing}
                    disabled={isProcessing}
                    onCheckedChange={() => markAsInvoicedMutation.mutate(client.client_id)}
                    className="flex-shrink-0"
                  />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm truncate">{client.client_name}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>
                          {client.pending_manifest_count} pickup{client.pending_manifest_count !== 1 ? 's' : ''}
                        </span>
                        <span>•</span>
                        <span className="font-medium">
                          ${client.total_pending_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        {client.pending_manifest_count > 1 && (
                          <>
                            <span>•</span>
                            <span>{format(new Date(client.latest_pending_date), 'h:mm a')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
