import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useClient } from "@/hooks/useClients";
import { useLocations } from "@/hooks/useLocations";
import { useInvoices, useCompletedPickups } from "@/hooks/useFinance";
import { CreateInvoiceDialog } from "@/components/finance/CreateInvoiceDialog";
import { RecordPaymentDialog } from "@/components/finance/RecordPaymentDialog";
import { OptimizedSchedulingCalendar } from "@/components/OptimizedSchedulingCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CapacityGauge } from "@/components/CapacityGauge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, FileText, Calendar, CreditCard, MapPin } from "lucide-react";
import { TopNav } from "@/components/TopNav";

export default function ClientDetail() {
  const { id } = useParams();
  const { data: client, isLoading } = useClient(id!);
  const { data: locations = [] } = useLocations(id);
  const { data: invoices = [] } = useInvoices(id);
  const { data: completedPickups = [] } = useCompletedPickups(id);
  const [showSchedulingCalendar, setShowSchedulingCalendar] = useState(false);

  useEffect(() => {
    document.title = client ? `${client.company_name} – Client – BSG` : "Client – BSG";
  }, [client]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <main className="container py-10">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background">
        <TopNav />
        <main className="container py-10">
          <p className="text-muted-foreground">Client not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main>
      <header className="container py-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{client.company_name}</h1>
          <p className="text-sm text-muted-foreground">Last pickup {client.last_pickup_at ? new Date(client.last_pickup_at).toLocaleDateString() : 'Never'}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="brand" 
            onClick={() => setShowSchedulingCalendar(true)}
          >
            Schedule Pickup
          </Button>
          <Link to="/routes/today"><Button variant="outline">View Today’s Routes</Button></Link>
        </div>
      </header>

      <section className="container grid md:grid-cols-3 gap-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Lifetime Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">${(client.lifetime_revenue || 0).toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total revenue from all pickups</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-destructive" />
              Open Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-destructive">${(client.open_balance || 0).toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Outstanding invoices</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              Last Pickup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-foreground">
              {client.last_pickup_at 
                ? new Date(client.last_pickup_at).toLocaleDateString()
                : 'Never'
              }
            </div>
            <div className="text-sm text-muted-foreground">Most recent service</div>
          </CardContent>
        </Card>
      </section>

      <section className="container grid md:grid-cols-2 gap-6 pb-12">
        {/* Invoices and Finance */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Invoices
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <CreateInvoiceDialog 
                  clientId={client.id}
                  trigger={
                    <Button size="sm" disabled={completedPickups.length === 0} className="w-full sm:w-auto">
                      Create Invoice
                    </Button>
                  }
                />
                <RecordPaymentDialog 
                  clientId={client.id}
                  trigger={
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                      Record Payment
                    </Button>
                  }
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No invoices found for this client.
              </p>
            ) : (
              <div className="space-y-3">
                {invoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.issued_date && new Date(invoice.issued_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${invoice.total_amount.toFixed(2)}</p>
                      <Badge 
                        variant={
                          invoice.status === 'paid' ? 'default' : 
                          invoice.status === 'partial' ? 'secondary' : 
                          'outline'
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Locations ({locations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No locations found for this client.
              </p>
            ) : (
              <div className="space-y-3">
                {locations.map((location) => (
                  <div key={location.id} className="p-3 border rounded-lg">
                    <div className="space-y-2">
                      {location.name && (
                        <p className="font-medium">{location.name}</p>
                      )}
                      <p className="text-sm text-muted-foreground">{location.address}</p>
                      {location.access_notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {location.access_notes}
                        </p>
                      )}
                      <div className="flex justify-between items-center">
                        <Badge variant={location.is_active ? "default" : "secondary"}>
                          {location.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {location.pricing_tier && (
                          <Badge variant="outline">{location.pricing_tier.name}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      </main>

      {/* Optimized Scheduling Calendar Dialog */}
      <Dialog open={showSchedulingCalendar} onOpenChange={setShowSchedulingCalendar}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Optimized Pickup</DialogTitle>
          </DialogHeader>
          {client && (
            <OptimizedSchedulingCalendar
              clientId={client.id}
              clientName={client.company_name}
              onClose={() => setShowSchedulingCalendar(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
