import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useClient } from "@/hooks/useClients";
import { useLocations } from "@/hooks/useLocations";
import { useInvoices, useCompletedPickups } from "@/hooks/useFinance";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";
import { useClientHealthScores } from "@/hooks/useClientHealthScores";
import { useUpdatePaymentStatus } from "@/hooks/useUpdatePaymentStatus";
import { useUpdatePickupPayment } from "@/hooks/useUpdatePickupPayment";
import { CreateInvoiceDialog } from "@/components/finance/CreateInvoiceDialog";
import { RecordPaymentDialog } from "@/components/finance/RecordPaymentDialog";
import { PaymentDialog } from "@/components/PaymentDialog";
import { SchedulePickupDialog } from "@/components/SchedulePickupDialog";
import { ClientHealthBadge } from "@/components/ClientHealthBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, CreditCard, MapPin, Plus, Receipt, Clock, CheckCircle2, XCircle, Edit2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


export default function ClientDetail() {
  const { id } = useParams();
  const { data: client, isLoading } = useClient(id!);
  const { data: locations = [] } = useLocations(id);
  const { data: invoices = [] } = useInvoices(id);
  const { data: completedPickups = [] } = useCompletedPickups(id);
  const { data: paymentHistory = [] } = usePaymentHistory(id!);
  const { healthScores } = useClientHealthScores(id);
  const clientHealth = healthScores.find(h => h.client_id === id);
  const updatePaymentStatus = useUpdatePaymentStatus();
  const updatePickupPayment = useUpdatePickupPayment();
  const [editingAmount, setEditingAmount] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");

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
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                {client.company_name}
                {clientHealth && (
                  <ClientHealthBadge 
                    score={clientHealth.score} 
                    riskLevel={clientHealth.risk_level}
                  />
                )}
              </h1>
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
              <Link to={`/manifests?client=${client.id}`}>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Manifests
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
                ${paymentHistory.reduce((sum, p) => sum + (p.computed_revenue || 0), 0).toFixed(2)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Total revenue from all completed pickups
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-5 w-5 text-primary" />
                Avg Tires per Pickup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {paymentHistory.length > 0 
                  ? (paymentHistory.reduce((sum, p) => {
                      const manifest = p.manifest;
                      if (manifest) {
                        // Calculate PTEs from manifest data
                        const ptes = (manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0);
                        const commercial = (manifest.commercial_17_5_19_5_on || 0) + (manifest.commercial_17_5_19_5_off || 0) +
                                         (manifest.commercial_22_5_on || 0) + (manifest.commercial_22_5_off || 0) +
                                         (manifest.tractor_count || 0);
                        const otr = manifest.otr_count || 0;
                        return sum + ptes + (commercial * 5) + (otr * 15);
                      }
                      // Fallback to pickup data if no manifest
                      return sum + (p.pte_count || 0) + ((p.otr_count || 0) * 15) + ((p.tractor_count || 0) * 5);
                    }, 0) / paymentHistory.length).toFixed(1)
                  : '0.0'
                }
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                PTE equivalent per service
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-muted-foreground" />
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
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Receipt className="h-6 w-6 text-primary" />
              Payment History
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Complete record of all completed pickups and payments
            </p>
          </CardHeader>
          <CardContent>
            {paymentHistory.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                <Receipt className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No payment history yet</p>
                <p className="text-sm text-muted-foreground">
                  Completed pickups with payment details will appear here
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="text-center font-semibold">Tires Collected</TableHead>
                      <TableHead className="text-right font-semibold">Amount</TableHead>
                      <TableHead className="text-center font-semibold">Payment Method</TableHead>
                      <TableHead className="text-center font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {new Date(payment.pickup_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {payment.location?.name && (
                              <div className="font-medium text-sm">{payment.location.name}</div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {payment.location?.address || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1.5 justify-center flex-wrap">
                            {payment.pte_count > 0 && (
                              <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 px-2.5 py-1 rounded-md text-xs font-medium">
                                {payment.pte_count} PTE
                              </span>
                            )}
                            {payment.otr_count > 0 && (
                              <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 px-2.5 py-1 rounded-md text-xs font-medium">
                                {payment.otr_count} OTR
                              </span>
                            )}
                            {payment.tractor_count > 0 && (
                              <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 px-2.5 py-1 rounded-md text-xs font-medium">
                                {payment.tractor_count} COM
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {editingAmount === payment.id ? (
                            <div className="flex items-center gap-2 justify-end">
                              <Input
                                type="number"
                                step="0.01"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                className="w-24 h-8 text-right"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updatePickupPayment.mutate({
                                      pickupId: payment.id,
                                      computed_revenue: parseFloat(editAmount)
                                    });
                                    setEditingAmount(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingAmount(null);
                                  }
                                }}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  updatePickupPayment.mutate({
                                    pickupId: payment.id,
                                    computed_revenue: parseFloat(editAmount)
                                  });
                                  setEditingAmount(null);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => setEditingAmount(null)}
                              >
                                <XCircle className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingAmount(payment.id);
                                setEditAmount((payment.computed_revenue || 0).toString());
                              }}
                              className="text-base font-semibold hover:text-primary transition-colors flex items-center gap-2 justify-end w-full"
                            >
                              ${(payment.computed_revenue || 0).toFixed(2)}
                              <Edit2 className="h-3 w-3 opacity-50" />
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8">
                                <Badge 
                                  variant={
                                    payment.payment_method === 'CARD_ON_FILE' ? 'default' :
                                    payment.payment_method === 'CARD' ? 'default' : 
                                    payment.payment_method === 'CASH' ? 'secondary' :
                                    payment.payment_method === 'CHECK' ? 'outline' :
                                    payment.payment_method === 'INVOICE' ? 'outline' :
                                    'secondary'
                                  }
                                  className="font-medium cursor-pointer"
                                >
                                  {payment.payment_method === 'CARD_ON_FILE' ? 'CARD ON FILE' : payment.payment_method || 'PENDING'}
                                </Badge>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => updatePickupPayment.mutate({ 
                                  pickupId: payment.id, 
                                  payment_method: 'CASH' 
                                })}
                                className="cursor-pointer"
                              >
                                <DollarSign className="h-4 w-4 mr-2" />
                                Cash
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updatePickupPayment.mutate({ 
                                  pickupId: payment.id, 
                                  payment_method: 'CARD' 
                                })}
                                className="cursor-pointer"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Card
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updatePickupPayment.mutate({ 
                                  pickupId: payment.id, 
                                  payment_method: 'CARD_ON_FILE' 
                                })}
                                className="cursor-pointer"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Card on File
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updatePickupPayment.mutate({ 
                                  pickupId: payment.id, 
                                  payment_method: 'INVOICE' 
                                })}
                                className="cursor-pointer"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Invoice Later
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updatePickupPayment.mutate({ 
                                  pickupId: payment.id, 
                                  payment_method: 'CHECK' 
                                })}
                                className="cursor-pointer"
                              >
                                <Receipt className="h-4 w-4 mr-2" />
                                Check
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8">
                                <Badge 
                                  variant={
                                    payment.payment_status === 'SUCCEEDED' ? 'default' : 
                                    payment.payment_status === 'PENDING' ? 'secondary' : 
                                    'destructive'
                                  }
                                  className="font-medium cursor-pointer"
                                >
                                  {payment.payment_status || 'PENDING'}
                                </Badge>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => updatePaymentStatus.mutate({ 
                                  pickupId: payment.id, 
                                  paymentStatus: 'SUCCEEDED' 
                                })}
                                className="cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                                Mark as Paid
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updatePaymentStatus.mutate({ 
                                  pickupId: payment.id, 
                                  paymentStatus: 'PENDING' 
                                })}
                                className="cursor-pointer"
                              >
                                <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                                Mark as Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => updatePaymentStatus.mutate({ 
                                  pickupId: payment.id, 
                                  paymentStatus: 'FAILED' 
                                })}
                                className="cursor-pointer"
                              >
                                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                Mark as Failed
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
    </div>
  );
}