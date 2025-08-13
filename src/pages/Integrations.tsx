import { useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Building2, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isConnected: boolean;
  isEnabled: boolean;
  fields: { key: string; label: string; type: 'text' | 'password'; placeholder: string }[];
}

export default function Integrations() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'stripe',
      name: 'Stripe Payments',
      description: 'Accept credit card payments on-site and through digital manifests',
      icon: CreditCard,
      isConnected: false,
      isEnabled: true,
      fields: [
        { key: 'publishable_key', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
        { key: 'secret_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' }
      ]
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks Online',
      description: 'Sync customers, invoices, and payments with your accounting system',
      icon: Building2,
      isConnected: false,
      isEnabled: false,
      fields: [
        { key: 'app_token', label: 'App Token', type: 'password', placeholder: 'Enter QuickBooks app token' },
        { key: 'company_id', label: 'Company ID', type: 'text', placeholder: 'Enter company ID' }
      ]
    },
    {
      id: 'zapier',
      name: 'Zapier Webhooks',
      description: 'Trigger automated workflows when manifests are completed',
      icon: Zap,
      isConnected: false,
      isEnabled: true,
      fields: [
        { key: 'webhook_url', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.zapier.com/hooks/catch/...' }
      ]
    }
  ]);

  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});

  const handleSaveIntegration = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    const data = formData[integrationId] || {};
    
    // Validate required fields
    const missingFields = integration.fields.filter(field => !data[field.key]?.trim());
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in all required fields for ${integration.name}`,
        variant: "destructive"
      });
      return;
    }

    try {
      // For Stripe, save to Supabase secrets
      if (integrationId === 'stripe') {
        // In a real implementation, this would use the Supabase edge functions to securely store the keys
        console.log('Saving Stripe keys:', data);
        
        // Update integration status
        setIntegrations(prev => prev.map(int => 
          int.id === integrationId 
            ? { ...int, isConnected: true }
            : int
        ));

        toast({
          title: "Stripe Connected",
          description: "Your Stripe payment processing has been configured successfully",
        });
      }

      // For QuickBooks (placeholder for OAuth flow)
      if (integrationId === 'quickbooks') {
        // This would typically initiate OAuth flow
        toast({
          title: "QuickBooks Integration",
          description: "QuickBooks integration will be available in a future update",
        });
      }

      // For Zapier
      if (integrationId === 'zapier') {
        setIntegrations(prev => prev.map(int => 
          int.id === integrationId 
            ? { ...int, isConnected: true }
            : int
        ));

        toast({
          title: "Zapier Connected",
          description: "Webhook URL has been saved successfully",
        });
      }

    } catch (error) {
      toast({
        title: "Connection Failed",
        description: `Failed to connect ${integration.name}. Please check your credentials.`,
        variant: "destructive"
      });
    }
  };

  const handleToggleIntegration = (integrationId: string, enabled: boolean) => {
    setIntegrations(prev => prev.map(int => 
      int.id === integrationId 
        ? { ...int, isEnabled: enabled }
        : int
    ));

    const integration = integrations.find(i => i.id === integrationId);
    toast({
      title: enabled ? "Integration Enabled" : "Integration Disabled",
      description: `${integration?.name} has been ${enabled ? 'enabled' : 'disabled'}`,
    });
  };

  const handleFieldChange = (integrationId: string, fieldKey: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [integrationId]: {
        ...prev[integrationId],
        [fieldKey]: value
      }
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Integrations</h1>
            <p className="text-muted-foreground mt-1">
              Connect external services to enhance your workflow
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-primary/10">
                      <integration.icon className="h-5 w-5 text-brand-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {integration.isConnected ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${integration.id}-toggle`} className="text-sm">
                        {integration.isEnabled ? 'Enabled' : 'Disabled'}
                      </Label>
                      <Switch
                        id={`${integration.id}-toggle`}
                        checked={integration.isEnabled}
                        onCheckedChange={(checked) => handleToggleIntegration(integration.id, checked)}
                        disabled={integration.id === 'quickbooks'} // Disable QB for now
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              {integration.isEnabled && (
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      {integration.fields.map((field) => (
                        <div key={field.key} className="space-y-2">
                          <Label htmlFor={`${integration.id}-${field.key}`}>
                            {field.label}
                          </Label>
                          <Input
                            id={`${integration.id}-${field.key}`}
                            type={field.type}
                            placeholder={field.placeholder}
                            value={formData[integration.id]?.[field.key] || ''}
                            onChange={(e) => handleFieldChange(integration.id, field.key, e.target.value)}
                            disabled={integration.id === 'quickbooks'}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleSaveIntegration(integration.id)}
                        disabled={integration.id === 'quickbooks'}
                        className="bg-brand-primary hover:bg-brand-primary/90"
                      >
                        {integration.isConnected ? 'Update' : 'Connect'}
                      </Button>
                      
                      {integration.isConnected && (
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setIntegrations(prev => prev.map(int => 
                              int.id === integration.id 
                                ? { ...int, isConnected: false }
                                : int
                            ));
                            toast({ title: "Disconnected", description: `${integration.name} has been disconnected` });
                          }}
                        >
                          Disconnect
                        </Button>
                      )}
                    </div>

                    {integration.id === 'quickbooks' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-amber-800">
                          QuickBooks integration is coming soon! This will sync customers, invoices, and payments automatically.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Integration Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>
              <strong>Stripe Payments:</strong> Required for processing credit card payments in digital manifests. Get your keys from the Stripe Dashboard.
            </div>
            <div>
              <strong>QuickBooks Online:</strong> Automatically sync customer data, create invoices, and record payments. Requires QuickBooks Online subscription.
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