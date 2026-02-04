import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useInventoryProducts, UNITS_OF_MEASURE } from '@/hooks/useInventoryProducts';
import { useCreateInventoryTransaction, REFERENCE_TYPES } from '@/hooks/useInventoryTransactions';
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw } from 'lucide-react';

const transactionSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  unit_of_measure: z.string().min(1, 'Unit is required'),
  transaction_date: z.string().min(1, 'Date is required'),
  reference_type: z.string().optional(),
  customer_name: z.string().optional(),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'inbound' | 'outbound' | 'adjustment';
  preselectedProductId?: string;
}

export function TransactionDialog({ 
  open, 
  onOpenChange, 
  type,
  preselectedProductId,
}: TransactionDialogProps) {
  const { data: products } = useInventoryProducts();
  const createTransaction = useCreateInventoryTransaction();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      product_id: preselectedProductId ?? '',
      quantity: undefined,
      unit_of_measure: 'tons',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      reference_type: type === 'inbound' ? 'production' : type === 'outbound' ? 'sale' : 'adjustment',
      customer_name: '',
      notes: '',
    },
  });

  // Update unit of measure when product changes
  const selectedProductId = form.watch('product_id');
  useEffect(() => {
    if (selectedProductId && products) {
      const product = products.find(p => p.id === selectedProductId);
      if (product) {
        form.setValue('unit_of_measure', product.unit_of_measure);
      }
    }
  }, [selectedProductId, products, form]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        product_id: preselectedProductId ?? '',
        quantity: undefined,
        unit_of_measure: 'tons',
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        reference_type: type === 'inbound' ? 'production' : type === 'outbound' ? 'sale' : 'adjustment',
        customer_name: '',
        notes: '',
      });
    }
  }, [open, type, preselectedProductId, form]);

  const onSubmit = async (values: TransactionFormValues) => {
    try {
      await createTransaction.mutateAsync({
        product_id: values.product_id,
        quantity: type === 'adjustment' ? values.quantity : Math.abs(values.quantity),
        unit_of_measure: values.unit_of_measure,
        transaction_date: values.transaction_date,
        reference_type: values.reference_type,
        customer_name: values.customer_name,
        notes: values.notes,
        transaction_type: type,
      });
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getDialogConfig = () => {
    switch (type) {
      case 'inbound':
        return {
          title: 'Record Inbound',
          description: 'Record inventory received from production or incoming shipment.',
          icon: <ArrowDownToLine className="h-5 w-5 text-green-600" />,
          buttonText: 'Record Inbound',
          buttonClass: 'bg-green-600 hover:bg-green-700',
        };
      case 'outbound':
        return {
          title: 'Record Outbound',
          description: 'Record inventory sold or shipped to a customer.',
          icon: <ArrowUpFromLine className="h-5 w-5 text-orange-600" />,
          buttonText: 'Record Outbound',
          buttonClass: 'bg-orange-600 hover:bg-orange-700',
        };
      case 'adjustment':
        return {
          title: 'Adjust Inventory',
          description: 'Make a correction to inventory levels. Use positive for increase, negative for decrease.',
          icon: <RefreshCw className="h-5 w-5 text-blue-600" />,
          buttonText: 'Apply Adjustment',
          buttonClass: 'bg-blue-600 hover:bg-blue-700',
        };
    }
  };

  const config = getDialogConfig();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {config.icon}
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quantity *
                      {type === 'adjustment' && <span className="text-muted-foreground text-xs ml-1">(+/-)</span>}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.001"
                        placeholder="0.000"
                        {...field} 
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_of_measure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UNITS_OF_MEASURE.map((unit) => (
                          <SelectItem key={unit.value} value={unit.value}>
                            {unit.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transaction_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REFERENCE_TYPES.map((ref) => (
                          <SelectItem key={ref.value} value={ref.value}>
                            {ref.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {type === 'outbound' && (
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Optional notes..."
                      className="resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createTransaction.isPending}
                className={config.buttonClass}
              >
                {createTransaction.isPending ? 'Saving...' : config.buttonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
