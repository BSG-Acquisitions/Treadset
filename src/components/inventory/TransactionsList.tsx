import { format } from 'date-fns';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from '@/components/ui/alert-dialog';
import {
  InventoryTransaction,
  useInventoryTransactions,
  useDeleteInventoryTransaction,
  REFERENCE_TYPES,
} from '@/hooks/useInventoryTransactions';

interface TransactionsListProps {
  productId?: string;
  limit?: number;
}

export function TransactionsList({ productId, limit = 50 }: TransactionsListProps) {
  const { data: transactions, isLoading } = useInventoryTransactions({
    productId,
    limit,
  });
  const deleteTransaction = useDeleteInventoryTransaction();

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'inbound':
        return <ArrowDownToLine className="h-4 w-4 text-green-600" />;
      case 'outbound':
        return <ArrowUpFromLine className="h-4 w-4 text-orange-600" />;
      case 'adjustment':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'inbound':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Inbound</Badge>;
      case 'outbound':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Outbound</Badge>;
      case 'adjustment':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Adjustment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getReferenceLabel = (type: string | null) => {
    if (!type) return '-';
    return REFERENCE_TYPES.find(r => r.value === type)?.label ?? type;
  };

  const formatUnit = (unit: string) => {
    switch (unit) {
      case 'cubic_yards':
        return 'yd³';
      default:
        return unit;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!transactions?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No transactions recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Customer/Notes</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">
                {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getTypeIcon(transaction.transaction_type)}
                  <span>{transaction.product?.name ?? 'Unknown'}</span>
                </div>
              </TableCell>
              <TableCell>
                {getTypeBadge(transaction.transaction_type)}
              </TableCell>
              <TableCell className="text-right font-medium">
                <span className={
                  transaction.transaction_type === 'inbound' 
                    ? 'text-green-600' 
                    : transaction.transaction_type === 'outbound' 
                      ? 'text-orange-600' 
                      : 'text-blue-600'
                }>
                  {transaction.transaction_type === 'inbound' && '+'}
                  {transaction.transaction_type === 'outbound' && '-'}
                  {transaction.quantity.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                </span>
                <span className="text-muted-foreground ml-1 text-sm">
                  {formatUnit(transaction.unit_of_measure)}
                </span>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {getReferenceLabel(transaction.reference_type)}
              </TableCell>
              <TableCell className="text-sm max-w-[200px] truncate">
                {transaction.customer_name || transaction.notes || '-'}
              </TableCell>
              <TableCell>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove this transaction and update your inventory levels accordingly.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteTransaction.mutate(transaction.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
