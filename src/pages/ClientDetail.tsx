import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useClient } from "@/hooks/useClients";
import { useLocations } from "@/hooks/useLocations";
import { usePaymentHistory } from "@/hooks/usePaymentHistory";
import { useUpdatePaymentStatus } from "@/hooks/useUpdatePaymentStatus";
import { useUpdatePickupPayment } from "@/hooks/useUpdatePickupPayment";
import { useManifests } from "@/hooks/useManifests";
import { SchedulePickupDialog } from "@/components/SchedulePickupDialog";
import { EditClientDialog } from "@/components/EditClientDialog";
import { ManifestPDFControls } from "@/components/ManifestPDFControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, CreditCard, MapPin, Plus, Receipt, Clock, CheckCircle2, XCircle, Edit2, Building2, Search, Pencil } from "lucide-react";
import { AddLocationDialog } from "@/components/AddLocationDialog";
import { Input } from "@/components/ui/input";
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, isWithinInterval, format, parseISO } from "date-fns";
import { formatDateLocal, parseLocalDate } from "@/lib/formatters";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";


export default function ClientDetail() {
  const { id } = useParams();
  const { data: client, isLoading } = useClient(id!);
  const { data: locations = [] } = useLocations(id);
  const { data: paymentHistory = [] } = usePaymentHistory(id!);
  const { data: manifests = [] } = useManifests(id);
  const updatePaymentStatus = useUpdatePaymentStatus();
  const updatePickupPayment = useUpdatePickupPayment();
  const [editingAmount, setEditingAmount] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  
  // Manifest search/filter state
  const [manifestSearch, setManifestSearch] = useState("");
  const [manifestDateFrom, setManifestDateFrom] = useState<Date | undefined>();
  const [manifestDateTo, setManifestDateTo] = useState<Date | undefined>();

  // Filter manifests based on search and date range
  const filteredManifests = useMemo(() => {
    return manifests.filter(manifest => {
      // Text search on manifest number
      if (manifestSearch && !manifest.manifest_number?.toLowerCase().includes(manifestSearch.toLowerCase())) {
        return false;
      }
      
      // Date range filter
      const manifestDate = manifest.signed_at || manifest.created_at;
      if (manifestDate) {
        const date = parseISO(manifestDate);
        if (manifestDateFrom && date < manifestDateFrom) return false;
        if (manifestDateTo) {
          const endOfDay = new Date(manifestDateTo);
          endOfDay.setHours(23, 59, 59, 999);
          if (date > endOfDay) return false;
        }
      }
      
      return true;
    });
  }, [manifests, manifestSearch, manifestDateFrom, manifestDateTo]);

  // Calculate last rate charged from most recent pickup
  const lastRateCharged = useMemo(() => {
    if (paymentHistory.length === 0) return null;
    
    // Sort by date descending to get most recent
    const sorted = [...paymentHistory].sort((a, b) => 
      new Date(b.pickup_date).getTime() - new Date(a.pickup_date).getTime()
    );
    
    const lastPickup = sorted[0];
    const revenue = lastPickup.computed_revenue || 0;
    
    // Calculate total tires from manifest or pickup data
    let totalTires = 0;
    const manifest = lastPickup.manifest;
    if (manifest) {
      totalTires = (manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0) +
                   (manifest.commercial_17_5_19_5_on || 0) + (manifest.commercial_17_5_19_5_off || 0) +
                   (manifest.commercial_22_5_on || 0) + (manifest.commercial_22_5_off || 0) +
                   (manifest.otr_count || 0) + (manifest.tractor_count || 0);
    } else {
      totalTires = (lastPickup.pte_count || 0) + (lastPickup.otr_count || 0) + (lastPickup.tractor_count || 0);
    }
    
    if (totalTires === 0) return { rate: 0, date: lastPickup.pickup_date };
    
    return {
      rate: revenue / totalTires,
      date: lastPickup.pickup_date
    };
  }, [paymentHistory]);

  // Group payments by time period
  const groupPaymentsByPeriod = (payments: typeof paymentHistory) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const monthStart = startOfMonth(now);
    const quarterStart = startOfQuarter(now);
    const yearStart = startOfYear(now);

    const groups = {
      thisWeek: [] as typeof paymentHistory,
      thisMonth: [] as typeof paymentHistory,
      thisQuarter: [] as typeof paymentHistory,
      thisYear: [] as typeof paymentHistory,
      older: [] as typeof paymentHistory,
    };

    payments.forEach(payment => {
      const parsed = parseLocalDate(payment.pickup_date);
      const paymentDate = parsed || new Date(payment.pickup_date);
      if (isWithinInterval(paymentDate, { start: weekStart, end: now })) {
        groups.thisWeek.push(payment);
      } else if (isWithinInterval(paymentDate, { start: monthStart, end: now })) {
        groups.thisMonth.push(payment);
      } else if (isWithinInterval(paymentDate, { start: quarterStart, end: now })) {
        groups.thisQuarter.push(payment);
      } else if (isWithinInterval(paymentDate, { start: yearStart, end: now })) {
        groups.thisYear.push(payment);
      } else {
        groups.older.push(payment);
      }
    });

    return groups;
  };

  const groupedPayments = groupPaymentsByPeriod(paymentHistory);

  const renderPaymentRows = (payments: typeof paymentHistory) => (
    <>
      {payments.map((payment) => (
        <TableRow key={payment.id} className="hover:bg-muted/30">
          <TableCell className="font-medium">
            {formatDateLocal(payment.pickup_date)}
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
    </>
  );

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
              <h1 className="text-3xl font-bold text-foreground">
                {client.company_name}
              </h1>
              <p className="text-muted-foreground">
                <span className="font-semibold">Last pickup:</span> {client.last_pickup_at ? new Date(client.last_pickup_at).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <EditClientDialog
                client={client}
                trigger={
                  <Button variant="outline">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Client
                  </Button>
                }
              />
              <SchedulePickupDialog
                defaultClientId={client.id}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Pickup
                  </Button>
                }
              />
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
                <DollarSign className="h-5 w-5 text-primary" />
                Last Rate Charged
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {lastRateCharged && lastRateCharged.rate > 0
                  ? `$${lastRateCharged.rate.toFixed(2)}/tire`
                  : 'N/A'
                }
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {lastRateCharged?.date
                  ? `Rate from ${formatDateLocal(lastRateCharged.date)}`
                  : 'No pickup history'
                }
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
              <Accordion type="multiple" className="space-y-2">
                {groupedPayments.thisWeek.length > 0 && (
                  <AccordionItem value="thisWeek" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold">This Week</span>
                        <Badge variant="secondary">{groupedPayments.thisWeek.length} pickups</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-lg border overflow-hidden mt-2">
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
                            {renderPaymentRows(groupedPayments.thisWeek)}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {groupedPayments.thisMonth.length > 0 && (
                  <AccordionItem value="thisMonth" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold">This Month</span>
                        <Badge variant="secondary">{groupedPayments.thisMonth.length} pickups</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-lg border overflow-hidden mt-2">
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
                            {renderPaymentRows(groupedPayments.thisMonth)}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {groupedPayments.thisQuarter.length > 0 && (
                  <AccordionItem value="thisQuarter" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold">This Quarter</span>
                        <Badge variant="secondary">{groupedPayments.thisQuarter.length} pickups</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-lg border overflow-hidden mt-2">
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
                            {renderPaymentRows(groupedPayments.thisQuarter)}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {groupedPayments.thisYear.length > 0 && (
                  <AccordionItem value="thisYear" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold">This Year</span>
                        <Badge variant="secondary">{groupedPayments.thisYear.length} pickups</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-lg border overflow-hidden mt-2">
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
                            {renderPaymentRows(groupedPayments.thisYear)}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {groupedPayments.older.length > 0 && (
                  <AccordionItem value="older" className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-semibold">Older</span>
                        <Badge variant="secondary">{groupedPayments.older.length} pickups</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="rounded-lg border overflow-hidden mt-2">
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
                            {renderPaymentRows(groupedPayments.older)}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Manifests Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="h-6 w-6 text-primary" />
              Manifests
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              View, download, and print all completed manifests
            </p>
            
            {/* Search and Filter Controls */}
            {manifests.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by manifest number..."
                    value={manifestSearch}
                    onChange={(e) => setManifestSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !manifestDateFrom && "text-muted-foreground"
                        )}
                      >
                        {manifestDateFrom ? format(manifestDateFrom, "MMM d, yyyy") : "From date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={manifestDateFrom}
                        onSelect={setManifestDateFrom}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !manifestDateTo && "text-muted-foreground"
                        )}
                      >
                        {manifestDateTo ? format(manifestDateTo, "MMM d, yyyy") : "To date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={manifestDateTo}
                        onSelect={setManifestDateTo}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {(manifestSearch || manifestDateFrom || manifestDateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setManifestSearch("");
                        setManifestDateFrom(undefined);
                        setManifestDateTo(undefined);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {manifests.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No manifests yet</p>
                <p className="text-sm text-muted-foreground">
                  Completed manifests will appear here
                </p>
              </div>
            ) : filteredManifests.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                <Search className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No manifests found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or date filters
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredManifests.map((manifest) => (
                  <div
                    key={manifest.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                  >
                    <div className="flex items-start gap-4 flex-1">
                      <FileText className="h-5 w-5 text-primary mt-1" />
                      <div className="flex flex-col space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">
                            {manifest.manifest_number}
                          </span>
                          <Badge variant={manifest.status === 'COMPLETED' ? 'default' : 'secondary'}>
                            {manifest.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          {manifest.location && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="truncate">{manifest.location.address}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>
                              {format(new Date(manifest.signed_at || manifest.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          {(manifest.pte_off_rim + manifest.pte_on_rim) > 0 && (
                            <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 px-2 py-0.5 rounded text-xs font-medium">
                              {manifest.pte_off_rim + manifest.pte_on_rim} PTE
                            </span>
                          )}
                          {manifest.otr_count > 0 && (
                            <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 px-2 py-0.5 rounded text-xs font-medium">
                              {manifest.otr_count} OTR
                            </span>
                          )}
                          {(manifest.commercial_17_5_19_5_off + manifest.commercial_17_5_19_5_on + manifest.commercial_22_5_off + manifest.commercial_22_5_on + manifest.tractor_count) > 0 && (
                            <span className="inline-flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 px-2 py-0.5 rounded text-xs font-medium">
                              {manifest.commercial_17_5_19_5_off + manifest.commercial_17_5_19_5_on + manifest.commercial_22_5_off + manifest.commercial_22_5_on + manifest.tractor_count} COM
                            </span>
                          )}
                        </div>

                        {manifest.status === 'COMPLETED' && (manifest.pdf_path || manifest.acroform_pdf_path) && (
                          <div className="mt-2">
                            <ManifestPDFControls
                              manifestId={manifest.id}
                              acroformPdfPath={manifest.acroform_pdf_path}
                              initialPdfPath={manifest.initial_pdf_path}
                              clientEmails={client?.email ? [client.email] : []}
                              className="text-xs"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-semibold text-foreground">
                        ${manifest.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address Section */}
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {locations.length === 1 ? 'Address' : 'Addresses'}
              </CardTitle>
              <AddLocationDialog 
                clientId={client.id}
                trigger={
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Address
                  </Button>
                }
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Address from Client Record */}
              {(client.physical_address || client.mailing_address) && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm text-primary">Primary Address</span>
                  </div>
                  <p className="text-sm text-foreground">
                    {client.physical_address || client.mailing_address}
                  </p>
                  {(client.physical_city || client.city) && (
                    <p className="text-sm text-muted-foreground">
                      {client.physical_city || client.city}, {client.physical_state || client.state} {client.physical_zip || client.zip}
                    </p>
                  )}
                  {client.county && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {client.county} County
                    </p>
                  )}
                </div>
              )}
              
              {/* Additional Locations */}
              {locations.length === 0 && !client.physical_address && !client.mailing_address ? (
                <div className="text-center py-6">
                  <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">No addresses found</p>
                  <p className="text-sm text-muted-foreground">Add an address to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {locations.map((location) => (
                    <div key={location.id} className="p-3 bg-muted/30 rounded-lg">
                      {location.name && (
                        <p className="font-medium mb-1">{location.name}</p>
                      )}
                      <p className="text-sm text-muted-foreground mb-2">{location.address}</p>
                      {location.access_notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {location.access_notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
      </main>
    </div>
  );
}
