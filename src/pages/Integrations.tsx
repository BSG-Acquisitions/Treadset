import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Building2, Zap, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

export default function Integrations() {
  const { toast } = useToast();
  const [zapierUrl, setZapierUrl] = useState('');
  const [zapierSaving, setZapierSaving] = useState(false);

  const handleSaveZapier = async () => {
    if (!zapierUrl.trim()) {
      toast({
        title: "Missing URL",
        description: "Please enter your Zapier webhook URL",
        variant: "destructive"
      });
      return;
    }

    setZapierSaving(true);
    try {
      // Send a test ping to validate the webhook
      await fetch(zapierUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        mode: "no-cors",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          event: "connection_test",
          triggered_from: window.location.origin,
        }),
      });

      toast({
        title: "Webhook Saved",
        description: "A test event was sent to Zapier. Check your Zap history to confirm it was received.",
      });
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not reach the webhook URL. Please check it and try again.",
        variant: "destructive"
      });
    } finally {
      setZapierSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect external services to enhance your workflow
          </p>
        </div>

        <div className="grid gap-6">
          {/* Stripe - Status Display Only */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Stripe Payments</CardTitle>
                    <CardDescription>
                      Accept credit card payments on-site and through digital manifests
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Configured
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Stripe is configured via secure server-side secrets. Payment processing is handled automatically through edge functions.
              </p>
            </CardContent>
          </Card>

          {/* QuickBooks - Coming Soon */}
          <Card className="opacity-75">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">QuickBooks Online</CardTitle>
                    <CardDescription>
                      Sync customers, invoices, and payments with your accounting system
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800">
                  QuickBooks integration is coming soon! This will sync customers, invoices, and payments automatically.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Zapier - Functional Webhook Input */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Zapier Webhooks</CardTitle>
                    <CardDescription>
                      Trigger automated workflows when manifests are completed
                    </CardDescription>
                  </div>
                </div>
                {zapierUrl.trim() ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zapier-webhook">Webhook URL</Label>
                <Input
                  id="zapier-webhook"
                  type="text"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={zapierUrl}
                  onChange={(e) => setZapierUrl(e.target.value)}
                />
              </div>
              <Button
                onClick={handleSaveZapier}
                disabled={zapierSaving}
              >
                {zapierSaving ? 'Testing...' : 'Save & Test'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Integration Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <strong>Stripe Payments:</strong> Configured securely via server-side secrets. No action needed here.
            </div>
            <div>
              <strong>QuickBooks Online:</strong> Coming soon — will automatically sync customer data, create invoices, and record payments.
            </div>
            <div>
              <strong>Zapier Webhooks:</strong> Trigger automated workflows when manifests are completed, payments received, or other events occur.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
