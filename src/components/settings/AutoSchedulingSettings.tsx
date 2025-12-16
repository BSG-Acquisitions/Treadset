import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, Truck, Mail, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AutoSchedulingSettingsData {
  min_tire_threshold: number;
  auto_approve_existing_clients: boolean;
  auto_approve_in_zone: boolean;
  outreach_frequency_days: number;
  booking_email_subject: string;
}

export function AutoSchedulingSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<AutoSchedulingSettingsData>({
    min_tire_threshold: 50,
    auto_approve_existing_clients: false,
    auto_approve_in_zone: false,
    outreach_frequency_days: 14,
    booking_email_subject: 'Your Tire Pickup Request Has Been Received',
  });

  const organizationId = user?.currentOrganization?.id;

  useEffect(() => {
    async function fetchSettings() {
      if (!organizationId) return;
      
      try {
        const { data } = await supabase
          .from('organization_settings')
          .select('min_tire_threshold, auto_approve_existing_clients, auto_approve_in_zone, outreach_frequency_days, booking_email_subject')
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (data) {
          setSettings({
            min_tire_threshold: (data as any).min_tire_threshold ?? 50,
            auto_approve_existing_clients: (data as any).auto_approve_existing_clients ?? false,
            auto_approve_in_zone: (data as any).auto_approve_in_zone ?? false,
            outreach_frequency_days: (data as any).outreach_frequency_days ?? 14,
            booking_email_subject: (data as any).booking_email_subject ?? 'Your Tire Pickup Request Has Been Received',
          });
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, [organizationId]);

  const handleSave = async () => {
    if (!organizationId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organization_settings')
        .upsert({
          organization_id: organizationId,
          ...settings,
        } as any, { onConflict: 'organization_id' });

      if (error) throw error;

      toast.success('Auto-scheduling settings saved');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="auto-scheduling-section">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Auto-Scheduling Settings
        </CardTitle>
        <CardDescription>
          Configure self-service booking options for clients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="min_tire_threshold" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Minimum Tire Threshold (PTE)
          </Label>
          <Input
            id="min_tire_threshold"
            type="number"
            min={1}
            max={500}
            value={settings.min_tire_threshold}
            onChange={(e) => setSettings({ ...settings, min_tire_threshold: parseInt(e.target.value) || 50 })}
            className="max-w-[200px]"
          />
          <p className="text-sm text-muted-foreground">
            Minimum PTE required for self-service booking.
          </p>
        </div>

        <Separator />

        <div className="space-y-4">
          <Label className="text-base font-medium">Auto-Approval Rules</Label>
          
          <div className="space-y-4 pl-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-approve existing clients</Label>
                <p className="text-sm text-muted-foreground">
                  Instantly approve bookings from known clients
                </p>
              </div>
              <Switch
                checked={settings.auto_approve_existing_clients}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_approve_existing_clients: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-approve in-zone requests</Label>
                <p className="text-sm text-muted-foreground">
                  Instantly approve bookings within service zones
                </p>
              </div>
              <Switch
                checked={settings.auto_approve_in_zone}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_approve_in_zone: checked })}
              />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <Label className="flex items-center gap-2 text-base font-medium">
            <Mail className="h-4 w-4" />
            Outreach Settings
          </Label>
          
          <div className="space-y-2">
            <Label htmlFor="outreach_frequency">Days between outreach emails</Label>
            <Input
              id="outreach_frequency"
              type="number"
              min={7}
              max={90}
              value={settings.outreach_frequency_days}
              onChange={(e) => setSettings({ ...settings, outreach_frequency_days: parseInt(e.target.value) || 14 })}
              className="max-w-[200px]"
            />
          </div>
        </div>

        <Separator />

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save Settings</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
