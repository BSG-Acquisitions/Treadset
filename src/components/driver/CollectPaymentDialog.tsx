import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";

interface CollectPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pickupId: string;
  amount: number;
  clientName: string;
}

export const CollectPaymentDialog = ({
  open,
  onOpenChange,
  pickupId,
  amount,
  clientName
}: CollectPaymentDialogProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleCollectPayment = async () => {
    try {
      setIsProcessing(true);
      console.log('[COLLECT_PAYMENT] Initiating payment for pickup:', pickupId);

      const { data, error } = await supabase.functions.invoke('create-pickup-payment', {
        body: { pickup_id: pickupId }
      });

      if (error) throw error;

      if (data?.url) {
        console.log('[COLLECT_PAYMENT] Opening Stripe checkout:', data.url);
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Payment Link Created",
          description: "Payment page opened in new tab. Share this link with the customer.",
        });
        
        // Keep dialog open so driver can see the status
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('[COLLECT_PAYMENT] Error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to create payment link",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Collect Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Customer:</span>
                <span className="font-medium">{clientName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount Due:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    How Payment Collection Works:
                  </p>
                  <ul className="text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>Click "Create Payment Link" below</li>
                    <li>Stripe checkout opens in a new tab</li>
                    <li>Customer can pay with card or Apple Pay</li>
                    <li>Payment status updates automatically</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex gap-2">
                <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  You can share the payment link with the customer or let them complete payment on your device
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCollectPayment}
              disabled={isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Link...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Create Payment Link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
