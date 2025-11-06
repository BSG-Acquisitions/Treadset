import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, AlertCircle, Bell } from "lucide-react";
import { useInvoicePendingClients } from "@/hooks/useInvoicePendingClients";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export const InvoicePendingWidget = () => {
  const { data: pendingClients = [], isLoading } = useInvoicePendingClients();

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
      <CardHeader>
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
            {pendingClients.map((client) => (
              <div
                key={client.client_id}
                className="p-3 rounded-lg border bg-card/50 flex items-center justify-between gap-3"
              >
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
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
