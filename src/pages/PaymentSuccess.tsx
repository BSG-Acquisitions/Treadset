import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft } from "lucide-react";
import { useVerifyPayment } from "@/hooks/useStripePayment";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [verified, setVerified] = useState(false);
  
  const verifyPayment = useVerifyPayment();

  useEffect(() => {
    if (sessionId && !verified) {
      verifyPayment.mutateAsync({ session_id: sessionId })
        .then(() => setVerified(true))
        .catch(console.error);
    }
  }, [sessionId, verified]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Your payment has been processed successfully. You will receive a confirmation email shortly.
          </p>
          
          {sessionId && (
            <div className="text-sm text-muted-foreground">
              <p>Transaction ID: {sessionId.slice(-8)}</p>
            </div>
          )}

          {verifyPayment.isPending && (
            <p className="text-sm text-muted-foreground">Verifying payment...</p>
          )}

          <div className="pt-4">
            <Button asChild className="w-full">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}