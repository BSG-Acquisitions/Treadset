import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

export default function Payments() {
  useEffect(() => {
    document.title = "Payments – TreadSet";
  }, []);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stripe_payments")
        .select(`
          *,
          client:client_id(company_name),
          pickup:pickup_id(pickup_date),
          processed_by_user:processed_by(first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const totalPayments = payments.filter(p => p.status === 'paid').length;
  const totalAmount = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0) / 100; // Convert from cents

  const pendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0) / 100;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Payments</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="animate-pulse h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="animate-pulse h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="animate-pulse h-8 bg-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payments</h1>
        <PaymentDialog 
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Payment
            </Button>
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {totalPayments} completed payments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {payments.filter(p => p.status === 'pending').length} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
            <p className="text-xs text-muted-foreground">
              All payment attempts
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Processed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {new Date(payment.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {payment.client?.company_name || "Guest"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {payment.description}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency((payment.amount || 0) / 100)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(payment.status)}>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {payment.customer_name || payment.customer_email || "Anonymous"}
                  </TableCell>
                  <TableCell>
                    {payment.processed_by_user 
                      ? `${payment.processed_by_user.first_name} ${payment.processed_by_user.last_name}`
                      : "System"
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {payments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No payments found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}