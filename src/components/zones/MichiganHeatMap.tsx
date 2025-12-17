import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Target, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LocationData {
  lat: number;
  lng: number;
  pickupCount: number;
  zip: string | null;
  city: string | null;
}

interface OpportunityZone {
  zip: string;
  city: string | null;
  pickupCount: number;
  status: 'hot' | 'warm' | 'cold' | 'opportunity';
}

export function MichiganHeatMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [opportunityZones, setOpportunityZones] = useState<OpportunityZone[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, hotZones: 0, coldZones: 0 });
  const [mapboxgl, setMapboxgl] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Dynamically load mapbox-gl and its CSS
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const module: any = await import('mapbox-gl');
        await import('mapbox-gl/dist/mapbox-gl.css');

        const candidateDefault = module?.default;
        const candidate =
          candidateDefault && typeof candidateDefault.Map === 'function'
            ? candidateDefault
            : module;

        if (typeof candidate?.Map !== 'function') {
          console.error('Mapbox GL module shape unexpected:', {
            moduleKeys: Object.keys(module || {}),
            defaultKeys: candidateDefault ? Object.keys(candidateDefault) : null,
          });
          if (!cancelled) setMapError('Failed to initialize map library');
          return;
        }

        if (!cancelled) setMapboxgl(candidate);
      } catch (err) {
        console.error('Failed to load mapbox-gl:', err);
        if (!cancelled) setMapError('Failed to load map library');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch Mapbox token
  useEffect(() => {
    async function fetchToken() {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        console.log('Mapbox token response:', { data, error });
        if (error) {
          console.error('Error fetching Mapbox token:', error);
          return;
        }
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (err) {
        console.error('Exception fetching Mapbox token:', err);
      }
    }
    fetchToken();
  }, []);

  // Fetch location data
  useEffect(() => {
    async function fetchLocationData() {
      if (!organizationId) return;
      setLoading(true);

      try {
        // Get all clients with coordinates (primary source)
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, depot_lat, depot_lng, physical_zip, physical_city, company_name')
          .eq('organization_id', organizationId)
          .not('depot_lat', 'is', null)
          .not('depot_lng', 'is', null);

        // Get pickup counts per client
        const { data: clientPickups } = await supabase
          .from('pickups')
          .select('client_id')
          .eq('organization_id', organizationId)
          .eq('status', 'completed');

        const clientPickupCounts = new Map<string, number>();
        for (const p of clientPickups || []) {
          if (p.client_id) {
            clientPickupCounts.set(p.client_id, (clientPickupCounts.get(p.client_id) || 0) + 1);
          }
        }

        // Combine location data
        const combinedLocations: LocationData[] = [];
        const zipCounts = new Map<string, { count: number; city: string | null }>();

        // Add client-based data
        for (const client of clientsData || []) {
          const count = clientPickupCounts.get(client.id) || 0;
          if (client.depot_lat && client.depot_lng) {
            combinedLocations.push({
              lat: client.depot_lat,
              lng: client.depot_lng,
              pickupCount: count,
              zip: client.physical_zip,
              city: client.physical_city,
            });
            if (client.physical_zip) {
              const existing = zipCounts.get(client.physical_zip);
              zipCounts.set(client.physical_zip, {
                count: (existing?.count || 0) + count,
                city: client.physical_city || existing?.city || null
              });
            }
          }
        }

        setLocations(combinedLocations);

        // Calculate opportunity zones
        const zones: OpportunityZone[] = [];
        const maxCount = Math.max(...Array.from(zipCounts.values()).map(v => v.count), 1);

        for (const [zip, data] of zipCounts) {
          let status: OpportunityZone['status'];
          if (data.count >= maxCount * 0.6) status = 'hot';
          else if (data.count >= maxCount * 0.3) status = 'warm';
          else if (data.count > 0) status = 'cold';
          else status = 'opportunity';

          zones.push({
            zip,
            city: data.city,
            pickupCount: data.count,
            status
          });
        }

        // Sort by pickup count descending
        zones.sort((a, b) => b.pickupCount - a.pickupCount);
        setOpportunityZones(zones);

        // Calculate stats
        setStats({
          total: combinedLocations.length,
          hotZones: zones.filter(z => z.status === 'hot').length,
          coldZones: zones.filter(z => z.status === 'cold' || z.status === 'opportunity').length,
        });

      } catch (error) {
        console.error('Error fetching location data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchLocationData();
  }, [organizationId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !mapboxgl || locations.length === 0) return;
    if (map.current) return;

    try {
      // Some Mapbox builds expect a global token, others support the per-map option.
      try {
        if (mapboxgl && typeof mapboxgl === 'object') {
          (mapboxgl as any).accessToken = mapboxToken;
        }
      } catch {
        // ignore (module namespace objects can be read-only)
      }

      map.current = new mapboxgl.Map({
        accessToken: mapboxToken,
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-84.5, 44.0], // Center of Michigan
        zoom: 5.5,
        pitch: 0,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    } catch (err) {
      console.error('Failed to initialize Mapbox map:', err);
      setMapError('Something went wrong loading the map');
      return;
    }

    map.current.on('load', () => {
      if (!map.current) return;

      // Prepare GeoJSON data for heatmap
      const geojsonData = {
        type: 'FeatureCollection' as const,
        features: locations.map(loc => ({
          type: 'Feature' as const,
          properties: {
            pickupCount: loc.pickupCount,
            zip: loc.zip,
            city: loc.city,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [loc.lng, loc.lat],
          },
        })),
      };

      // Add source
      map.current.addSource('pickups', {
        type: 'geojson',
        data: geojsonData,
      });

      // Add heatmap layer
      map.current.addLayer({
        id: 'pickups-heat',
        type: 'heatmap',
        source: 'pickups',
        maxzoom: 15,
        paint: {
          // Weight by pickup count
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'pickupCount'],
            0, 0.1,
            10, 0.5,
            50, 1
          ],
          // Intensity based on zoom
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            15, 3
          ],
          // Color ramp
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)'
          ],
          // Radius based on zoom
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 15,
            15, 30
          ],
          // Opacity fades at high zoom
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1,
            15, 0.6
          ],
        },
      });

      // Add circle layer for high zoom
      map.current.addLayer({
        id: 'pickups-points',
        type: 'circle',
        source: 'pickups',
        minzoom: 10,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'pickupCount'],
            0, 4,
            10, 8,
            50, 15
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'pickupCount'],
            0, '#3b82f6',
            10, '#f59e0b',
            50, '#ef4444'
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
          'circle-opacity': 0.8,
        },
      });

      // Add popup on click
      map.current.on('click', 'pickups-points', (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        const coords = (e.features[0].geometry as any).coordinates.slice();

        new mapboxgl.Popup()
          .setLngLat(coords)
          .setHTML(`
            <div style="padding: 8px;">
              <strong>${props?.city || 'Unknown'}</strong><br/>
              ZIP: ${props?.zip || 'N/A'}<br/>
              Pickups: ${props?.pickupCount || 0}
            </div>
          `)
          .addTo(map.current!);
      });

      map.current.on('mouseenter', 'pickups-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'pickups-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, locations, mapboxgl]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading coverage data...</p>
        </CardContent>
      </Card>
    );
  }

  if (mapError) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MapPin className="h-8 w-8 mx-auto text-destructive" />
          <p className="mt-2 text-muted-foreground">{mapError}</p>
        </CardContent>
      </Card>
    );
  }

  if (!mapboxToken) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Mapbox token not configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Michigan Service Coverage Heat Map
          </CardTitle>
          <CardDescription>
            Visualize pickup frequency across Michigan. Red = high activity, Blue = low activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Locations</p>
            </div>
            <div className="text-center p-3 bg-red-500/10 rounded-lg">
              <p className="text-2xl font-bold text-red-500">{stats.hotZones}</p>
              <p className="text-xs text-muted-foreground">Hot Zones</p>
            </div>
            <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
              <p className="text-2xl font-bold text-emerald-500">{stats.coldZones}</p>
              <p className="text-xs text-muted-foreground">Growth Opportunities</p>
            </div>
          </div>

          {/* Map */}
          <div 
            ref={mapContainer} 
            className="w-full h-[500px] rounded-lg overflow-hidden border border-border"
          />

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-blue-300" />
              <span className="text-muted-foreground">Low Activity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-amber-500 to-amber-300" />
              <span className="text-muted-foreground">Moderate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gradient-to-r from-red-500 to-red-300" />
              <span className="text-muted-foreground">High Activity</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opportunity Zones Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Zone Analysis by ZIP Code
          </CardTitle>
          <CardDescription>
            Identify areas with growth potential for business expansion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Hot Zones */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                Strong Markets
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {opportunityZones.filter(z => z.status === 'hot').slice(0, 5).map(zone => (
                  <div key={zone.zip} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div>
                      <span className="font-medium">{zone.zip}</span>
                      {zone.city && <span className="text-muted-foreground text-sm ml-2">{zone.city}</span>}
                    </div>
                    <Badge variant="secondary">{zone.pickupCount} pickups</Badge>
                  </div>
                ))}
                {opportunityZones.filter(z => z.status === 'hot').length === 0 && (
                  <p className="text-sm text-muted-foreground">No hot zones yet</p>
                )}
              </div>
            </div>

            {/* Opportunity Zones */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                Growth Opportunities
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {opportunityZones.filter(z => z.status === 'cold' || z.status === 'opportunity').slice(0, 5).map(zone => (
                  <div key={zone.zip} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div>
                      <span className="font-medium">{zone.zip}</span>
                      {zone.city && <span className="text-muted-foreground text-sm ml-2">{zone.city}</span>}
                    </div>
                    <Badge variant="outline">{zone.pickupCount} pickups</Badge>
                  </div>
                ))}
                {opportunityZones.filter(z => z.status === 'cold' || z.status === 'opportunity').length === 0 && (
                  <p className="text-sm text-muted-foreground">All areas are well covered!</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
