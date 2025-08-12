import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building, MapPin, Clock, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Onboarding() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const { user, switchOrganization } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form states
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandPrimaryColor, setBrandPrimaryColor] = useState('#3b82f6');
  const [brandSecondaryColor, setBrandSecondaryColor] = useState('#64748b');
  const [depotLat, setDepotLat] = useState('30.2672');
  const [depotLng, setDepotLng] = useState('-97.7431');
  const [serviceHoursStart, setServiceHoursStart] = useState('08:00');
  const [serviceHoursEnd, setServiceHoursEnd] = useState('17:00');
  const [defaultPteRate, setDefaultPteRate] = useState('25.00');
  const [defaultOtrRate, setDefaultOtrRate] = useState('45.00');
  const [defaultTractorRate, setDefaultTractorRate] = useState('35.00');
  const [taxRate, setTaxRate] = useState('8.25');

  useEffect(() => {
    document.title = 'Organization Setup – BSG';
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setOrgSlug(slug);
  }, [orgName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          slug: orgSlug,
          logo_url: logoUrl || null,
          brand_primary_color: brandPrimaryColor,
          brand_secondary_color: brandSecondaryColor,
          depot_lat: parseFloat(depotLat),
          depot_lng: parseFloat(depotLng),
          service_hours_start: serviceHoursStart,
          service_hours_end: serviceHoursEnd,
          default_pte_rate: parseFloat(defaultPteRate),
          default_otr_rate: parseFloat(defaultOtrRate),
          default_tractor_rate: parseFloat(defaultTractorRate),
          tax_rate: parseFloat(taxRate) / 100, // Convert percentage to decimal
        })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      // Add user as admin of the new organization
      if (user) {
        const { error: roleError } = await supabase
          .from('user_organization_roles')
          .insert({
            user_id: user.id,
            organization_id: orgData.id,
            role: 'admin'
          });

        if (roleError) {
          throw roleError;
        }
      }

      toast({
        title: 'Organization Created',
        description: `${orgName} has been successfully set up.`,
      });

      // Switch to the new organization
      switchOrganization(orgSlug);
      
    } catch (error: any) {
      console.error('Error creating organization:', error);
      setError(error.message || 'An error occurred while creating the organization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Organization Setup</h1>
          <p className="text-muted-foreground">
            Set up your logistics organization to get started
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Create Your Organization
            </CardTitle>
            <CardDescription>
              Configure your organization's basic settings and operational parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name *</Label>
                    <Input
                      id="org-name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                      placeholder="Acme Logistics"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org-slug">URL Slug *</Label>
                    <Input
                      id="org-slug"
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(e.target.value)}
                      required
                      placeholder="acme-logistics"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-url">Logo URL (optional)</Label>
                  <Input
                    id="logo-url"
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand-primary">Primary Brand Color</Label>
                    <Input
                      id="brand-primary"
                      type="color"
                      value={brandPrimaryColor}
                      onChange={(e) => setBrandPrimaryColor(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand-secondary">Secondary Brand Color</Label>
                    <Input
                      id="brand-secondary"
                      type="color"
                      value={brandSecondaryColor}
                      onChange={(e) => setBrandSecondaryColor(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Depot Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Depot Location
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depot-lat">Latitude</Label>
                    <Input
                      id="depot-lat"
                      type="number"
                      step="any"
                      value={depotLat}
                      onChange={(e) => setDepotLat(e.target.value)}
                      placeholder="30.2672"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depot-lng">Longitude</Label>
                    <Input
                      id="depot-lng"
                      type="number"
                      step="any"
                      value={depotLng}
                      onChange={(e) => setDepotLng(e.target.value)}
                      placeholder="-97.7431"
                    />
                  </div>
                </div>
              </div>

              {/* Service Hours */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Service Hours
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service-start">Start Time</Label>
                    <Input
                      id="service-start"
                      type="time"
                      value={serviceHoursStart}
                      onChange={(e) => setServiceHoursStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service-end">End Time</Label>
                    <Input
                      id="service-end"
                      type="time"
                      value={serviceHoursEnd}
                      onChange={(e) => setServiceHoursEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Default Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Default Pricing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pte-rate">PTE Rate ($)</Label>
                    <Input
                      id="pte-rate"
                      type="number"
                      step="0.01"
                      value={defaultPteRate}
                      onChange={(e) => setDefaultPteRate(e.target.value)}
                      placeholder="25.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otr-rate">OTR Rate ($)</Label>
                    <Input
                      id="otr-rate"
                      type="number"
                      step="0.01"
                      value={defaultOtrRate}
                      onChange={(e) => setDefaultOtrRate(e.target.value)}
                      placeholder="45.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tractor-rate">Tractor Rate ($)</Label>
                    <Input
                      id="tractor-rate"
                      type="number"
                      step="0.01"
                      value={defaultTractorRate}
                      onChange={(e) => setDefaultTractorRate(e.target.value)}
                      placeholder="35.00"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="8.25"
                    className="w-32"
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Organization
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}