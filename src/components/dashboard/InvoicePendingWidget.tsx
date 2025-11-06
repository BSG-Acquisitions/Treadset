import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, AlertCircle, ExternalLink } from "lucide-react";
import { useInvoicePendingClients } from "@/hooks/useInvoicePendingClients";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
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
    return (
      <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-success/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-success" />
            Pending Invoices
          </CardTitle>
          <CardDescription>Clients requiring invoice generation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/10 mb-3">
              <FileText className="w-6 h-6 text-success" />
            </div>
            <p className="text-muted-foreground">All caught up! No pending invoices.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/20 shadow-elevation-lg bg-gradient-to-br from-card to-warning/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-warning" />
              Pending Invoices
              <Badge variant="destructive" className="ml-2">
                {pendingClients.length}
              </Badge>
            </CardTitle>
            <CardDescription>Clients requiring invoice generation</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/clients">
              View All
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {pendingClients.map((client) => (
              <div
                key={client.client_id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
                      <h4 className="font-semibold truncate">{client.client_name}</h4>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {client.pending_manifest_count} pickup{client.pending_manifest_count !== 1 ? 's' : ''}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-foreground">
                          ${client.total_pending_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-xs">
                        Oldest: {formatDistanceToNow(new Date(client.oldest_pending_date), { addSuffix: true })}
                      </div>
                      {client.pending_manifest_count > 1 && (
                        <div className="text-xs">
                          Latest: {format(new Date(client.latest_pending_date), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/clients/${client.client_id}`}>
                      Create Invoice
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {pendingClients.length > 5 && (
          <div className="mt-4 pt-4 border-t text-center">
            <Button asChild variant="link" size="sm">
              <Link to="/clients">
                View all {pendingClients.length} clients needing invoices →
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
