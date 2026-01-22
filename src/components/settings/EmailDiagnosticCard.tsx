import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DiagnosticResult {
  success: boolean;
  diagnostic: {
    id?: string;
    step: string;
    status: string;
    message: string;
    messageId?: string;
    responseTime?: string;
    recipient?: string;
  };
  error?: string;
}

export function EmailDiagnosticCard() {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const handleSendTest = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-diagnostic-email', {
        body: {
          to: email,
          organizationId: user?.currentOrganization?.id,
        },
      });

      if (error) {
        setResult({
          success: false,
          diagnostic: {
            step: 'invoke',
            status: 'failed',
            message: error.message,
          },
          error: error.message,
        });
        toast.error('Failed to send test email');
        return;
      }

      setResult(data as DiagnosticResult);
      
      if (data.success) {
        toast.success('Test email sent! Check your inbox.');
      } else {
        toast.error(data.diagnostic?.message || 'Failed to send email');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setResult({
        success: false,
        diagnostic: {
          step: 'exception',
          status: 'failed',
          message: errorMessage,
        },
        error: errorMessage,
      });
      toast.error('Error sending test email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Diagnostics
        </CardTitle>
        <CardDescription>
          Send a test email to verify your email delivery pipeline is working correctly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="test-email" className="sr-only">
              Email Address
            </Label>
            <Input
              id="test-email"
              type="email"
              placeholder="Enter email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button onClick={handleSendTest} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Test Email
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-brand-primary/10' : 'bg-destructive/10'}`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-brand-primary mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {result.success ? 'Email Sent Successfully' : 'Email Failed'}
                  </span>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.diagnostic.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {result.diagnostic.message}
                </p>
                {result.diagnostic.responseTime && (
                  <p className="text-xs text-muted-foreground">
                    Response time: {result.diagnostic.responseTime}
                  </p>
                )}
                {result.diagnostic.messageId && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Message ID: {result.diagnostic.messageId}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          This sends a diagnostic email through your Resend pipeline to verify everything is configured correctly.
        </p>
      </CardContent>
    </Card>
  );
}
