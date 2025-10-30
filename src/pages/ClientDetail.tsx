import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useClient } from "@/hooks/useClients";
import { useLocations } from "@/hooks/useLocations";
import { useInvoices, useCompletedPickups } from "@/hooks/useFinance";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";
import { CreateInvoiceDialog } from "@/components/finance/CreateInvoiceDialog";
import { RecordPaymentDialog } from "@/components/finance/RecordPaymentDialog";
import { PaymentDialog } from "@/components/PaymentDialog";
import { OptimizedSchedulingCalendar } from "@/components/OptimizedSchedulingCalendar";
import { SchedulePickupDialog } from "@/components/SchedulePickupDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CapacityGauge } from "@/components/CapacityGauge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DollarSign, FileText, Calendar, CreditCard, MapPin, Plus, CheckCircle2, Receipt } from "lucide-react";


export default function ClientDetail() {
  const { id } = useParams();
  const { data: client, isLoading } = useClient(id!);
  const { data: locations = [] } = useLocations(id);
  const { data: invoices = [] } = useInvoices(id);
  const { data: completedPickups = [] } = useCompletedPickups(id);
  const { data: paymentHistory = [] } = usePaymentHistory(id!);
  const [showSchedulingCalendar, setShowSchedulingCalendar] = useState(false);

  useEffect(() => {
    document.title = client ? `${client.company_name} – Client – TreadSet` : "Client – TreadSet";
  }, [client]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-10">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container py-10">
          <p className="text-muted-foreground">Client not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{client.company_name}</h1>
              <p className="text-muted-foreground">
                Last pickup: {client.last_pickup_at ? new Date(client.last_pickup_at).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SchedulePickupDialog
                defaultClientId={client.id}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Pickup
                  </Button>
                }
              />
              <Button variant="outline" onClick={() => setShowSchedulingCalendar(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Optimize Routes
              </Button>
              <Link to="/routes/today">
                <Button variant="outline">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Today's Routes
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-5 w-5 text-primary" />
                Lifetime Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                ${(client.lifetime_revenue || 0).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Total revenue from all pickups
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-destructive" />
                Open Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                ${(client.open_balance || 0).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Outstanding invoices
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Last Pickup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {client.last_pickup_at 
                  ? new Date(client.last_pickup_at).toLocaleDateString()
                  : 'Never'
                }
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Most recent service
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment History Section - Full Width */}
        {paymentHistory.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-center">Tires</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Payment Method</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          {new Date(payment.pickup_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.location?.name || payment.location?.address || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          <div className="flex gap-2 justify-center text-xs">
                            {payment.pte_count > 0 && (
                              <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                                {payment.pte_count} PTE
                              </span>
                            )}
                            {payment.otr_count > 0 && (
                              <span className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                                {payment.otr_count} OTR
                              </span>
                            )}
                            {payment.tractor_count > 0 && (
                              <span className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                                {payment.tractor_count} COM
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${(payment.computed_revenue || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={
                              payment.payment_method === 'CARD' ? 'default' : 
                              payment.payment_method === 'CASH' ? 'secondary' :
                              payment.payment_method === 'CHECK' ? 'outline' :
                              'secondary'
                            }
                          >
                            {payment.payment_method || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant={
                              payment.payment_status === 'SUCCEEDED' ? 'default' : 
                              payment.payment_status === 'PENDING' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {payment.payment_status || 'PENDING'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Financial Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Financial Management
              </CardTitle>
               <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CreateInvoiceDialog 
                    clientId={client.id}
                    trigger={
                      <Button 
                        size="sm" 
                        disabled={completedPickups.length === 0}
                        className="w-full"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Create Invoice
                      </Button>
                    }
                  />
                  <RecordPaymentDialog 
                    clientId={client.id}
                    trigger={
                      <Button size="sm" variant="outline" className="w-full">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Record Payment
                      </Button>
                    }
                  />
                </div>
                <PaymentDialog 
                  defaultClientId={client.id}
                  defaultDescription={`Payment for ${client.company_name} services`}
                  trigger={
                    <Button size="sm" variant="default" className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Accept Online Payment
                    </Button>
                  }
                />
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="font-medium mb-3">Recent Invoices</h4>
              {invoices.length === 0 ? (
                <div className="text-center py-6">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">No invoices found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.slice(0, 3).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
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
                  {invoices.length > 3 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{invoices.length - 3} more invoices
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Locations ({locations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="text-center py-6">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">No locations found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {locations.slice(0, 4).map((location) => (
                    <div key={location.id} className="p-3 bg-muted/30 rounded-lg">
                      {location.name && (
                        <p className="font-medium mb-1">{location.name}</p>
                      )}
                      <p className="text-sm text-muted-foreground mb-2">{location.address}</p>
                      {location.access_notes && (
                        <p className="text-xs text-muted-foreground italic mb-2">
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
                  ))}
                  {locations.length > 4 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{locations.length - 4} more locations
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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