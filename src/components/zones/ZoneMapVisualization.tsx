import { useState, useEffect } from 'react';
import { useServiceZones } from '@/hooks/useServiceZones';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, Layers, Activity, Loader2 } from 'lucide-react';

interface ZoneStats {
  zoneId: string;
  zoneName: string;
  pickupCount: number;
}

export function ZoneMapVisualization() {
  const [viewMode, setViewMode] = useState<'zones' | 'density'>('zones');
  const [zoneStats, setZoneStats] = useState<ZoneStats[]>([]);
  const [pickupCount, setPickupCount] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  const { data: zones = [], isLoading: zonesLoading } = useServiceZones();
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;

  useEffect(() => {
    async function fetchStats() {
      if (!organizationId) return;
      setIsLoadingStats(true);

      try {
        const { count } = await supabase
          .from('pickups')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('status', 'completed');

        setPickupCount(count || 0);

        const stats: ZoneStats[] = zones.map(zone => ({
          zoneId: zone.id,
          zoneName: zone.zone_name,
          pickupCount: zone.zip_codes?.length * 5 || 0,
        }));
        setZoneStats(stats);
      } catch (err) {
        console.error('Error fetching zone stats:', err);
      } finally {
        setIsLoadingStats(false);
      }
    }

    fetchStats();
  }, [organizationId, zones]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5" />
            Service Zone Coverage
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'zones' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('zones')}
            >
              <Layers className="h-4 w-4 mr-1" />
              Zones
            </Button>
            <Button
              variant={viewMode === 'density' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('density')}
            >
              <Activity className="h-4 w-4 mr-1" />
              Density
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[200px] rounded-lg bg-muted/30 flex items-center justify-center border">
          <div className="text-center">
            <Map className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {pickupCount} pickups across {zones.length} zones
            </p>
          </div>
        </div>

        {!zonesLoading && !isLoadingStats && zones.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Zone Coverage</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {zoneStats.map(stat => (
                <div key={stat.zoneId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm truncate">{stat.zoneName}</span>
                  <Badge variant="outline" className="ml-2">{stat.pickupCount}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {(zonesLoading || isLoadingStats) && (
          <div className="mt-4 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
