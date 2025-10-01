import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/formatters";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  const sessionId = searchParams.get('session_id');
  const pickupId = searchParams.get('pickup_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !pickupId) {
        toast({
          title: "Invalid Payment Link",
          description: "Missing session or pickup information",
          variant: "destructive"
        });
        setIsVerifying(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-pickup-payment', {
          body: {
            session_id: sessionId,
            pickup_id: pickupId
          }
        });

        if (error) throw error;

        if (data?.success) {
          setPaymentDetails(data);
          toast({
            title: "Payment Successful",
            description: `Payment of ${formatCurrency(data.amount)} has been processed`,
          });
        } else {
          throw new Error('Payment verification failed');
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        toast({
          title: "Verification Failed",
          description: error.message || "Could not verify payment status",
          variant: "destructive"
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, pickupId, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          {isVerifying ? (
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Verifying payment...</p>
            </div>
          ) : paymentDetails?.success ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Payment Successful!
                </h1>
                <p className="text-muted-foreground">
                  The payment has been processed successfully
                </p>
              </div>

              {paymentDetails.amount && (
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(paymentDetails.amount)}
                  </p>
                </div>
              )}

              <div className="space-y-3 pt-4">
                <Button
                  onClick={() => navigate('/driver/dashboard')}
                  className="w-full"
                  size="lg"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
                  <CheckCircle2 className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Payment Verification Failed
                </h1>
                <p className="text-muted-foreground">
                  Could not verify payment status. Please contact support.
                </p>
              </div>

              <Button
                onClick={() => navigate('/driver/dashboard')}
                className="w-full"
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
