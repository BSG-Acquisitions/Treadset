import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { CardPaymentForm } from "./CardPaymentForm";
import { Loader2 } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_live_51RH91jL4kzdpGjJn2yM2S2mHMaHkeVcpjEFnfU2EtrVZgaJEyIJzOwDULj98YLfPOxi13T2wcKp4eZlS1OsDtrR9002ch7uIfT");

interface CollectPaymentWithCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickupId: string;
  amount: number;
  onSuccess: () => void;
}

export function CollectPaymentWithCard({
  open,
  onOpenChange,
  pickupId,
  amount,
  onSuccess,
}: CollectPaymentWithCardProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !pickupId) {
      // Reset clientSecret when dialog closes so a fresh intent is created on next open
      setClientSecret(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-pickup-payment", {
          body: { pickup_id: pickupId },
        });
        if (cancelled) return;
        if (error) throw error;
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        if (cancelled) return;
        toast({
          title: "Error",
          description: error.message || "Failed to initialize payment",
          variant: "destructive",
        });
        onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, pickupId, toast, onOpenChange]);

  const handleSuccess = async () => {
    // Update pickup payment status with new payment tracking columns
    const { error } = await supabase
      .from("pickups")
      .update({ 
        payment_status: "SUCCEEDED",
        payment_method: "CARD",
        manifest_payment_status: "SUCCEEDED" // Keep legacy field for compatibility
      })
      .eq("id", pickupId);

    if (error) {
      console.error("Error updating pickup:", error);
    }

    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
        </DialogHeader>

        {loading || !clientSecret ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Elements
            key={clientSecret}
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
              },
              loader: 'never',
            }}
          >
            <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium">Collecting payment from customer</p>
              <p className="text-muted-foreground">Enter the customer's card details below</p>
            </div>
            <CardPaymentForm
              amount={amount}
              clientSecret={clientSecret}
              onSuccess={handleSuccess}
              onCancel={() => onOpenChange(false)}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
