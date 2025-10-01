import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentCancelled() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3">
                <XCircle className="h-12 w-12 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">
                Payment Cancelled
              </h1>
              <p className="text-muted-foreground">
                The payment was cancelled. You can try again or return to the dashboard.
              </p>
            </div>

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
        </div>
      </div>
    </div>
  );
}
