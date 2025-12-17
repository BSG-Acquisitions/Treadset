import { useState, useEffect, useRef } from 'react';
import { useServiceZones, useCreateServiceZone, useUpdateServiceZone, useDeleteServiceZone, useAnalyzeServiceZones, ServiceZone, SuggestedZone } from '@/hooks/useServiceZones';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Plus, Wand2, Trash2, Edit, Loader2, Calendar, Info } from 'lucide-react';
import { SlideUp } from '@/components/motion/SlideUp';
import { MichiganHeatMap } from '@/components/zones/MichiganHeatMap';
import { ZonePerformanceTable } from '@/components/zones/ZonePerformanceTable';
import { AtRiskClientsPanel } from '@/components/zones/AtRiskClientsPanel';
import { GrowthOpportunitiesPanel } from '@/components/zones/GrowthOpportunitiesPanel';
import { toast } from 'sonner';

const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function ServiceZones() {
  const { data: zones = [], isLoading } = useServiceZones();
  const createZone = useCreateServiceZone();
  const updateZone = useUpdateServiceZone();
  const deleteZone = useDeleteServiceZone();
  const analyzeZones = useAnalyzeServiceZones();
  const hasAutoAnalyzed = useRef(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<ServiceZone | null>(null);
  const [suggestedZones, setSuggestedZones] = useState<SuggestedZone[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autoAnalyzing, setAutoAnalyzing] = useState(false);

  const [formData, setFormData] = useState({
    zone_name: '',
    description: '',
    zip_codes: '',
    primary_service_days: [] as string[],
    max_detour_miles: 10,
  });

  useEffect(() => {
    document.title = 'Service Zones | TreadSet';
  }, []);

  // Auto-analyze on first visit if no zones exist
  useEffect(() => {
    if (!isLoading && zones.length === 0 && !hasAutoAnalyzed.current && !analyzeZones.isPending) {
      hasAutoAnalyzed.current = true;
      setAutoAnalyzing(true);
      analyzeZones.mutateAsync().then(result => {
        if (result.suggestedZones.length > 0) {
          setSuggestedZones(result.suggestedZones);
          setShowSuggestions(true);
          toast.success(`Found ${result.suggestedZones.length} zone suggestions`);
        }
      }).catch(() => {
        // Silently fail auto-analysis
      }).finally(() => {
        setAutoAnalyzing(false);
      });
    }
  }, [isLoading, zones.length]);

  const resetForm = () => {
    setFormData({
      zone_name: '',
      description: '',
      zip_codes: '',
      primary_service_days: [],
      max_detour_miles: 10,
    });
  };

  const handleAnalyze = async () => {
    const result = await analyzeZones.mutateAsync();
    if (result.suggestedZones.length > 0) {
      setSuggestedZones(result.suggestedZones);
      setShowSuggestions(true);
      toast.success(`Found ${result.suggestedZones.length} zone suggestions from ${result.analyzedManifests} manifests`);
    } else {
      toast.info('Not enough data to suggest zones yet');
    }
  };

  const handleAcceptSuggestion = async (suggestion: SuggestedZone) => {
    await createZone.mutateAsync({
      zone_name: suggestion.zone_name,
      description: `Auto-generated from ${suggestion.pickup_count} historical pickups`,
      zip_codes: suggestion.zip_codes,
      primary_service_days: suggestion.primary_service_days,
      center_lat: suggestion.center_lat,
      center_lng: suggestion.center_lng,
      max_detour_miles: 10,
      is_active: true,
    });
    setSuggestedZones(prev => prev.filter(s => s.zone_name !== suggestion.zone_name));
  };

  const handleCreate = async () => {
    await createZone.mutateAsync({
      zone_name: formData.zone_name,
      description: formData.description || null,
      zip_codes: formData.zip_codes.split(',').map(z => z.trim()).filter(Boolean),
      primary_service_days: formData.primary_service_days,
      max_detour_miles: formData.max_detour_miles,
      center_lat: null,
      center_lng: null,
      is_active: true,
    });
    setShowCreateDialog(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingZone) return;
    await updateZone.mutateAsync({
      id: editingZone.id,
      zone_name: formData.zone_name,
      description: formData.description || null,
      zip_codes: formData.zip_codes.split(',').map(z => z.trim()).filter(Boolean),
      primary_service_days: formData.primary_service_days,
      max_detour_miles: formData.max_detour_miles,
    });
    setEditingZone(null);
    resetForm();
  };

  const openEditDialog = (zone: ServiceZone) => {
    setEditingZone(zone);
    setFormData({
      zone_name: zone.zone_name,
      description: zone.description || '',
      zip_codes: zone.zip_codes.join(', '),
      primary_service_days: zone.primary_service_days,
      max_detour_miles: zone.max_detour_miles,
    });
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      primary_service_days: prev.primary_service_days.includes(day)
        ? prev.primary_service_days.filter(d => d !== day)
        : [...prev.primary_service_days, day],
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Service Zones</h1>
            <p className="text-muted-foreground mt-1">
              Define geographic zones for efficient route planning
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleAnalyze} disabled={analyzeZones.isPending}>
              {analyzeZones.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              Auto-Detect Zones
            </Button>
            <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Zone
            </Button>
          </div>
        </div>
      </SlideUp>

      {/* Suggested Zones */}
      {showSuggestions && suggestedZones.length > 0 && (
        <SlideUp delay={0.1}>
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Suggested Zones
              </CardTitle>
              <CardDescription>
                Based on your pickup history. Click to accept or dismiss.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestedZones.map((suggestion) => (
                  <Card key={suggestion.zone_name} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <h4 className="font-medium">{suggestion.zone_name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {suggestion.zip_codes.length} ZIP codes • {suggestion.pickup_count} pickups
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {suggestion.primary_service_days.map(day => (
                          <Badge key={day} variant="outline" className="text-xs capitalize">
                            {day}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" onClick={() => handleAcceptSuggestion(suggestion)}>
                          Accept
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSuggestedZones(prev => prev.filter(s => s !== suggestion))}>
                          Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button variant="ghost" className="mt-4" onClick={() => setShowSuggestions(false)}>
                Hide Suggestions
              </Button>
            </CardContent>
          </Card>
        </SlideUp>
      )}

      {/* Michigan Heat Map - Always show */}
      <SlideUp delay={0.15}>
        <MichiganHeatMap />
      </SlideUp>

      {/* Zone Performance & At-Risk Clients Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SlideUp delay={0.2}>
            <ZonePerformanceTable />
          </SlideUp>
        </div>
        <div className="lg:col-span-1">
          <SlideUp delay={0.25}>
            <AtRiskClientsPanel />
          </SlideUp>
        </div>
      </div>

      {/* Growth Opportunities */}
      <SlideUp delay={0.3}>
        <GrowthOpportunitiesPanel />
      </SlideUp>

      {/* Getting Started Guide - show when no zones and not auto-analyzing */}
      {!isLoading && zones.length === 0 && !autoAnalyzing && suggestedZones.length === 0 && (
        <SlideUp delay={0.1}>
          <Card className="border-brand-primary/30 bg-brand-primary/5">
            <CardContent className="py-8">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-brand-primary/10">
                  <Info className="h-6 w-6 text-brand-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">What are Service Zones?</h3>
                  <p className="text-muted-foreground mb-4">
                    Service zones help you organize your pickup areas by geography and schedule. 
                    When clients book pickups, the system automatically matches them to the right zone 
                    and suggests optimal pickup dates based on your service schedule.
                  </p>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-background rounded-lg">
                      <p className="font-medium text-sm">📍 Geographic Coverage</p>
                      <p className="text-xs text-muted-foreground">Group ZIP codes into logical service areas</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="font-medium text-sm">📅 Service Schedules</p>
                      <p className="text-xs text-muted-foreground">Set which days you service each zone</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="font-medium text-sm">🚀 Auto-Scheduling</p>
                      <p className="text-xs text-muted-foreground">Smart booking suggestions for clients</p>
                    </div>
                  </div>
                  <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Zone
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideUp>
      )}

      {/* Auto-analyzing state */}
      {autoAnalyzing && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 mx-auto text-brand-primary mb-4 animate-spin" />
            <h3 className="text-lg font-medium mb-2">Analyzing your pickup history...</h3>
            <p className="text-muted-foreground">
              We're looking for patterns to suggest optimal service zones
            </p>
          </CardContent>
        </Card>
      )}

      {/* Existing Zones */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : zones.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((zone, index) => (
            <SlideUp key={zone.id} delay={index * 0.05}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {zone.zone_name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(zone)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteZone.mutate(zone.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {zone.description && (
                    <CardDescription>{zone.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Service Days</p>
                      <div className="flex flex-wrap gap-1">
                        {zone.primary_service_days.map(day => (
                          <Badge key={day} variant="secondary" className="text-xs capitalize">
                            <Calendar className="h-3 w-3 mr-1" />
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">ZIP Codes ({zone.zip_codes.length})</p>
                      <p className="text-sm">{zone.zip_codes.slice(0, 5).join(', ')}{zone.zip_codes.length > 5 && ` +${zone.zip_codes.length - 5} more`}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Max Detour: {zone.max_detour_miles} miles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          ))}
        </div>
      ) : null}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingZone} onOpenChange={() => { setShowCreateDialog(false); setEditingZone(null); resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Zone' : 'Create Service Zone'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Zone Name</Label>
              <Input
                value={formData.zone_name}
                onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
                placeholder="e.g., East Side, Downtown"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Notes about this zone..."
              />
            </div>

            <div className="space-y-2">
              <Label>ZIP Codes (comma-separated)</Label>
              <Textarea
                value={formData.zip_codes}
                onChange={(e) => setFormData({ ...formData, zip_codes: e.target.value })}
                placeholder="48201, 48202, 48203"
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Service Days</Label>
              <div className="grid grid-cols-4 gap-2">
                {DAYS_OF_WEEK.filter(d => d !== 'sunday').map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={formData.primary_service_days.includes(day)}
                      onCheckedChange={() => toggleDay(day)}
                    />
                    <Label htmlFor={day} className="text-sm capitalize">{day.slice(0, 3)}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Max Detour Distance (miles)</Label>
              <Input
                type="number"
                value={formData.max_detour_miles}
                onChange={(e) => setFormData({ ...formData, max_detour_miles: Number(e.target.value) })}
                min={1}
                max={50}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingZone(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={editingZone ? handleUpdate : handleCreate}>
              {editingZone ? 'Save Changes' : 'Create Zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
