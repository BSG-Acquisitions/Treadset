import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Target, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationData {
  lat: number;
  lng: number;
  pickupCount: number;
  zip: string | null;
  city: string | null;
}

interface ActivityZone {
  gridKey: string;
  label: string;
  pickupCount: number;
  status: 'hot' | 'warm' | 'cold' | 'opportunity';
}

export function MichiganHeatMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const hasShownMapErrorToast = useRef(false);

  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [activityZones, setActivityZones] = useState<ActivityZone[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, hotZones: 0, coldZones: 0 });
  const [mapboxgl, setMapboxgl] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  // Dynamically load mapbox-gl and its CSS
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Import mapbox-gl - with Vite pre-bundling, default export should work
        const mapboxModule = await import('mapbox-gl');
        // CSS is now imported statically at the top of the file

        if (cancelled) return;

        // mapbox-gl default export contains Map, NavigationControl, Popup, etc.
        const gl = mapboxModule.default;
        
        if (gl && typeof gl.Map === 'function') {
          setMapboxgl(gl);
        } else {
          console.error('Mapbox GL Map constructor not found');
          setMapError('Failed to initialize map library');
        }
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
        console.log('Fetching location data for organization:', organizationId);
        
        // Get all locations with geocoded coordinates - NO lat/lng filters
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('id, latitude, longitude, address, client_id, name, clients(company_name, physical_city, physical_zip)')
          .eq('organization_id', organizationId)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (locationsError) {
          console.error('Failed to fetch locations:', locationsError);
          setMapError('Failed to load location data');
          setLoading(false);
          return;
        }

        console.log('Fetched', locationsData?.length || 0, 'locations from database');

        // Get pickup counts per location
        const { data: locationPickups, error: pickupsError } = await supabase
          .from('pickups')
          .select('location_id')
          .eq('organization_id', organizationId)
          .eq('status', 'completed');

        if (pickupsError) {
          console.error('Failed to fetch pickups:', pickupsError);
        }

        console.log('Fetched', locationPickups?.length || 0, 'completed pickups');

        const locationPickupCounts = new Map<string, number>();
        for (const p of locationPickups || []) {
          if (p.location_id) {
            locationPickupCounts.set(p.location_id, (locationPickupCounts.get(p.location_id) || 0) + 1);
          }
        }

        // Combine location data
        const combinedLocations: LocationData[] = [];
        
        // Use grid-based clustering instead of ZIP codes (since ZIP data is missing)
        // Grid cells are ~0.05° lat/lng squares (roughly 3-5 km)
        const gridCells = new Map<string, { count: number; lat: number; lng: number; locations: string[] }>();

        // Add location-based data
        for (const loc of locationsData || []) {
          const count = locationPickupCounts.get(loc.id) || 1; // Count at least 1 for each location
          if (loc.latitude && loc.longitude) {
            const clientData = loc.clients as { company_name?: string; physical_city?: string; physical_zip?: string } | null;
            const cityName = clientData?.physical_city || null;
            const zipCode = clientData?.physical_zip || null;
            const locationName = clientData?.company_name || loc.name || 'Location';
            
            combinedLocations.push({
              lat: loc.latitude,
              lng: loc.longitude,
              pickupCount: count,
              zip: zipCode,
              city: cityName,
            });
            
            // Grid-based clustering
            const gridKey = `${Math.floor(loc.latitude * 20) / 20}_${Math.floor(loc.longitude * 20) / 20}`;
            const existing = gridCells.get(gridKey) || { count: 0, lat: loc.latitude, lng: loc.longitude, locations: [] };
            existing.count += count;
            if (!existing.locations.includes(locationName)) {
              existing.locations.push(locationName);
            }
            gridCells.set(gridKey, existing);
          }
        }

        console.log('Processed', combinedLocations.length, 'locations for heatmap');
        setLocations(combinedLocations);

        // Calculate activity zones from grid cells
        const zones: ActivityZone[] = [];
        const maxCount = Math.max(...Array.from(gridCells.values()).map(v => v.count), 1);

        for (const [gridKey, data] of gridCells) {
          let status: ActivityZone['status'];
          if (data.count >= 5) status = 'hot';
          else if (data.count >= 3) status = 'warm';
          else if (data.count > 0) status = 'cold';
          else status = 'opportunity';

          // Create a readable label from the locations
          const label = data.locations.slice(0, 2).join(', ') + (data.locations.length > 2 ? ` +${data.locations.length - 2}` : '');

          zones.push({
            gridKey,
            label,
            pickupCount: data.count,
            status
          });
        }

        // Sort by pickup count descending
        zones.sort((a, b) => b.pickupCount - a.pickupCount);
        setActivityZones(zones);

        // Calculate stats
        setStats({
          total: combinedLocations.length,
          hotZones: zones.filter(z => z.status === 'hot' || z.status === 'warm').length,
          coldZones: zones.filter(z => z.status === 'cold' || z.status === 'opportunity').length,
        });

        console.log('Stats:', { total: combinedLocations.length, zones: zones.length });

      } catch (error) {
        console.error('Error fetching location data:', error);
        setMapError('Failed to load location data');
      } finally {
        setLoading(false);
      }
    }

    fetchLocationData();
  }, [organizationId]);

  // Cleanup map on unmount only
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    // Wait for loading to complete so mapContainer div is in DOM
    if (loading || !mapContainer.current || !mapboxToken || !mapboxgl || locations.length === 0) return;
    if (map.current) return;

    console.log('Initializing Mapbox map with', locations.length, 'locations');
    let layerTimeout: ReturnType<typeof setTimeout> | null = null;
    let layersAdded = false;

    try {
      // Some Mapbox builds expect a global token, others support the per-map option.
      try {
        if (mapboxgl && typeof mapboxgl === 'object') {
          (mapboxgl as any).accessToken = mapboxToken;
        }
      } catch {
        // ignore (module namespace objects can be read-only)
      }

      // Calculate bounds from data to center the map properly
      let initialCenter: [number, number] = [-84.5, 44.0];
      let initialZoom = 5.5;
      
      if (locations.length > 0) {
        const lats = locations.map(l => l.lat);
        const lngs = locations.map(l => l.lng);
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
        initialCenter = [avgLng, avgLat];
        initialZoom = 9; // Closer zoom for concentrated data
        console.log('Map center calculated:', initialCenter, 'zoom:', initialZoom);
      }

      map.current = new mapboxgl.Map({
        accessToken: mapboxToken,
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: initialCenter,
        zoom: initialZoom,
        pitch: 0,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      console.log('Map created successfully');
    } catch (err) {
      console.error('Failed to initialize Mapbox map:', err);
      setMapError('Something went wrong loading the map');
      return;
    }

    // Function to add heatmap layers
    const addHeatmapLayers = () => {
      if (!map.current || layersAdded) return;
      
      // Check if source already exists
      if (map.current.getSource('pickups')) {
        console.log('Heatmap source already exists, skipping');
        layersAdded = true;
        return;
      }

      console.log('Adding heatmap source with', locations.length, 'features');
      layersAdded = true;

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
      console.log('Source added, adding heatmap layer');

      // Add heatmap layer
      map.current.addLayer({
        id: 'pickups-heat',
        type: 'heatmap',
        source: 'pickups',
        maxzoom: 15,
        paint: {
          // Weight by pickup count - high weight even for single pickups
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'pickupCount'],
            0, 0.5,
            1, 0.7,
            5, 0.9,
            10, 1
          ],
          // Intensity - much higher for visibility
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 3,
            8, 4,
            12, 5,
            15, 6
          ],
          // Color ramp - START VISIBLE instead of transparent
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(103,169,207,0.3)',
            0.1, 'rgb(103,169,207)',
            0.3, 'rgb(209,229,240)',
            0.5, 'rgb(253,219,199)',
            0.7, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)'
          ],
          // Radius based on zoom - very large for few points
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 50,
            6, 60,
            8, 80,
            10, 100,
            15, 120
          ],
          // Constant opacity - no fade out
          'heatmap-opacity': 0.85,
        },
      });
      console.log('Heatmap layer added');

      // Add circle layer - visible at ALL zoom levels
      map.current.addLayer({
        id: 'pickups-points',
        type: 'circle',
        source: 'pickups',
        minzoom: 0, // Show at ALL zoom levels
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 6,
            8, 8,
            12, 12,
            15, 16
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'pickupCount'],
            0, '#3b82f6',
            5, '#f59e0b',
            10, '#ef4444'
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9,
        },
      });
      console.log('Circle layer added');

      // Add popup on click
      map.current.on('click', 'pickups-points', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        const coords = e.features[0].geometry.coordinates.slice();

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

      // Force resize and repaint
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
          map.current.triggerRepaint();
          console.log('Map resize and repaint triggered');
        }
      }, 100);
    };

    // Add DEBUG MARKERS - visible immediately without waiting for layers
    const addDebugMarkers = () => {
      console.log('Adding', locations.length, 'debug markers');
      locations.forEach((loc, i) => {
        const marker = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div style="padding: 4px;">
              <strong>Location ${i + 1}</strong><br/>
              ${loc.city || 'N/A'}<br/>
              Pickups: ${loc.pickupCount}
            </div>
          `))
          .addTo(map.current!);
      });
      console.log('Debug markers added');
    };

    // Use multiple strategies to ensure layers are added

    // Strategy 1: 'idle' event - fires when map is fully rendered
    map.current.once('idle', () => {
      console.log('Map idle event fired');
      if (!layersAdded) {
        addHeatmapLayers();
      }
    });

    // Strategy 2: 'load' event - traditional approach
    map.current.on('load', () => {
      console.log('Map load event fired');
      if (!layersAdded) {
        addHeatmapLayers();
      }
      // Add debug markers after load
      addDebugMarkers();
    });

    // Strategy 3: 'style.load' event - fires when style is ready
    map.current.on('style.load', () => {
      console.log('Style.load event fired');
      if (!layersAdded) {
        addHeatmapLayers();
      }
    });

    // Strategy 4: Timeout fallback - force add after 3 seconds
    layerTimeout = setTimeout(() => {
      console.log('Timeout fallback triggered');
      if (!layersAdded && map.current) {
        console.log('Forcing layer addition via timeout');
        addHeatmapLayers();
        addDebugMarkers();
      }
    }, 3000);

    // Cleanup timeout on unmount
    return () => {
      if (layerTimeout) {
        clearTimeout(layerTimeout);
      }
    };
  }, [mapboxToken, locations, mapboxgl, loading]);

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
              <p className="text-xs text-muted-foreground">High Activity Areas</p>
            </div>
            <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
              <p className="text-2xl font-bold text-emerald-500">{stats.coldZones}</p>
              <p className="text-xs text-muted-foreground">Low Activity Areas</p>
            </div>
          </div>

          {/* Map */}
          <div 
            ref={mapContainer} 
            className="w-full h-[500px] rounded-lg overflow-hidden border border-border"
            style={{ minHeight: '500px' }}
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
            Activity Zone Analysis
          </CardTitle>
          <CardDescription>
            Geographic clustering of pickup activity by area.
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
                {activityZones.filter(z => z.status === 'hot' || z.status === 'warm').slice(0, 5).map(zone => (
                  <div key={zone.gridKey} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div>
                      <span className="font-medium text-sm">{zone.label}</span>
                    </div>
                    <Badge variant="secondary">{zone.pickupCount} pickups</Badge>
                  </div>
                ))}
                {activityZones.filter(z => z.status === 'hot' || z.status === 'warm').length === 0 && (
                  <p className="text-sm text-muted-foreground">No high activity areas yet</p>
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
                {activityZones.filter(z => z.status === 'cold' || z.status === 'opportunity').slice(0, 5).map(zone => (
                  <div key={zone.gridKey} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <div>
                      <span className="font-medium text-sm">{zone.label}</span>
                    </div>
                    <Badge variant="outline">{zone.pickupCount} pickups</Badge>
                  </div>
                ))}
                {activityZones.filter(z => z.status === 'cold' || z.status === 'opportunity').length === 0 && (
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
