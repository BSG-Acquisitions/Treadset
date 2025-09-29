import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard } from "lucide-react";
import { useCreatePayment, CreatePaymentParams } from "@/hooks/useStripePayment";
import { useClients } from "@/hooks/useClients";

interface PaymentDialogProps {
  trigger?: React.ReactNode;
  defaultAmount?: number;
  defaultDescription?: string;
  defaultClientId?: string;
  defaultPickupId?: string;
  defaultManifestId?: string;
  onPaymentCreated?: (data: any) => void;
}

export function PaymentDialog({
  trigger,
  defaultAmount = 50.00, // Default to $50 (minimum $0.50 for Stripe)
  defaultDescription = "",
  defaultClientId = "",
  defaultPickupId = "",
  defaultManifestId = "",
  onPaymentCreated
}: PaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(defaultAmount);
  const [description, setDescription] = useState(defaultDescription);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [clientId, setClientId] = useState(defaultClientId);

  const { data: clients } = useClients();
  const createPayment = useCreatePayment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (amount < 0.50) {
      return; // Stripe minimum is $0.50
    }

    const paymentParams: CreatePaymentParams = {
      amount,
      description,
      customer_email: customerEmail || undefined,
      customer_name: customerName || undefined,
      client_id: (clientId && clientId !== "__no_client__") ? clientId : (defaultClientId || undefined),
      pickup_id: defaultPickupId || undefined,
      manifest_id: defaultManifestId || undefined,
    };

    try {
      const result = await createPayment.mutateAsync(paymentParams);
      onPaymentCreated?.(result);
      setOpen(false);
      
      // Reset form
      setAmount(defaultAmount);
      setDescription(defaultDescription);
      setCustomerEmail("");
      setCustomerName("");
      setClientId(defaultClientId);
    } catch (error) {
      // Error is handled by the hook
      console.error("Payment creation failed:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <CreditCard className="h-4 w-4 mr-2" />
            Accept Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Accept Online Payment
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Create a secure Stripe checkout session for your customer. They'll be redirected to Stripe's secure payment page to enter their card details.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.50"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0.50)}
                placeholder="50.00"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum amount: $0.50 (Stripe requirement)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client (Optional)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__no_client__">No client selected</SelectItem>
                  {clients?.data?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Payment Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Service charge for tire pickup and disposal..."
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              This description will appear on the customer's receipt and invoice.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name (Optional)</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer Email (Optional)</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createPayment.isPending || amount < 0.50}
              className="min-w-[140px]"
            >
              {createPayment.isPending ? (
                <>Creating Session...</>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Open Stripe Checkout
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}