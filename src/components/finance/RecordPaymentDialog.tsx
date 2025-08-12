import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useCreatePayment } from "@/hooks/useFinance";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard } from "lucide-react";

const createPaymentSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  invoiceId: z.string().optional(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["check", "credit_card", "bank_transfer", "cash"]),
  paymentDate: z.string().min(1, "Payment date is required"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type CreatePaymentData = z.infer<typeof createPaymentSchema>;

interface RecordPaymentDialogProps {
  trigger?: React.ReactNode;
  clientId: string;
  invoiceId?: string;
  defaultAmount?: number;
}

export function RecordPaymentDialog({ 
  trigger, 
  clientId, 
  invoiceId, 
  defaultAmount 
}: RecordPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const createPayment = useCreatePayment();

  const form = useForm<CreatePaymentData>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      clientId,
      invoiceId: invoiceId || "",
      amount: defaultAmount || 0,
      paymentMethod: "check",
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: "",
      notes: "",
    },
  });

  const handleSubmit = async (data: CreatePaymentData) => {
    try {
      // Get current organization ID
      const orgSlug = 'bsg'; // For now, default to BSG
      const { data: orgData } = await supabase.rpc('get_current_user_organization', { org_slug: orgSlug });
      
      await createPayment.mutateAsync({
        client_id: data.clientId,
        invoice_id: data.invoiceId || null,
        organization_id: orgData,
        amount: data.amount,
        payment_method: data.paymentMethod,
        payment_date: data.paymentDate,
        reference_number: data.referenceNumber,
        notes: data.notes
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date *</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field} 
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Check number, transaction ID, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes about the payment..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPayment.isPending}>
                {createPayment.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}