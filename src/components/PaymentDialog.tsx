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
  defaultAmount = 0,
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
    
    if (amount <= 0) {
      return;
    }

    const paymentParams: CreatePaymentParams = {
      amount,
      description,
      customer_email: customerEmail || undefined,
      customer_name: customerName || undefined,
      client_id: clientId || defaultClientId || undefined,
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
          <DialogTitle>Create Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client (Optional)</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No client selected</SelectItem>
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Payment for tire pickup services..."
              required
            />
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
              disabled={createPayment.isPending || amount <= 0}
            >
              {createPayment.isPending ? "Creating..." : "Create Payment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}