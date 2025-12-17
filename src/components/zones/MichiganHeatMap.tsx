import { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Loader2, MapPin, Target, TrendingUp, Search, Maximize2, Filter, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationData {
  id: string;
  lat: number;
  lng: number;
  pickupCount: number;
  zip: string | null;
  city: string | null;
  clientName: string;
  address: string | null;
  phone: string | null;
}

interface ActivityZone {
  city: string;
  pickupCount: number;
  locationCount: number;
  status: 'hot' | 'warm' | 'cold' | 'opportunity';
  topClients: string[];
}

export function MichiganHeatMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const popupRef = useRef<any>(null);

  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapboxgl, setMapboxgl] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [minPickups, setMinPickups] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Calculate activity zones by city
  const activityZones = useMemo(() => {
    const cityMap = new Map<string, { count: number; locations: number; clients: Set<string> }>();
    
    locations.forEach(loc => {
      const city = loc.city || 'Unknown';
      const existing = cityMap.get(city) || { count: 0, locations: 0, clients: new Set() };
      existing.count += loc.pickupCount;
      existing.locations += 1;
      existing.clients.add(loc.clientName);
      cityMap.set(city, existing);
    });

    const zones: ActivityZone[] = [];
    cityMap.forEach((data, city) => {
      let status: ActivityZone['status'];
      if (data.count >= 10) status = 'hot';
      else if (data.count >= 5) status = 'warm';
      else if (data.count > 0) status = 'cold';
      else status = 'opportunity';

      zones.push({
        city,
        pickupCount: data.count,
        locationCount: data.locations,
        status,
        topClients: Array.from(data.clients).slice(0, 3),
      });
    });

    return zones.sort((a, b) => b.pickupCount - a.pickupCount);
  }, [locations]);

  // Stats
  const stats = useMemo(() => ({
    total: locations.length,
    hotZones: activityZones.filter(z => z.status === 'hot' || z.status === 'warm').length,
    coldZones: activityZones.filter(z => z.status === 'cold' || z.status === 'opportunity').length,
    totalPickups: locations.reduce((sum, l) => sum + l.pickupCount, 0),
  }), [locations, activityZones]);

  // Filtered locations based on search and min pickups
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const matchesSearch = !searchQuery || 
        loc.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.zip?.includes(searchQuery);
      const matchesMinPickups = loc.pickupCount >= minPickups;
      return matchesSearch && matchesMinPickups;
    });
  }, [locations, searchQuery, minPickups]);

  // Max pickups for slider
  const maxPickups = useMemo(() => Math.max(...locations.map(l => l.pickupCount), 1), [locations]);

  // Dynamically load mapbox-gl
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mapboxModule = await import('mapbox-gl');
        if (cancelled) return;
        const gl = mapboxModule.default;
        if (gl && typeof gl.Map === 'function') {
          setMapboxgl(gl);
        } else {
          setMapError('Failed to initialize map library');
        }
      } catch (err) {
        console.error('Failed to load mapbox-gl:', err);
        if (!cancelled) setMapError('Failed to load map library');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch Mapbox token
  useEffect(() => {
    async function fetchToken() {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
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

  // Fetch location data with client details
  useEffect(() => {
    async function fetchLocationData() {
      if (!organizationId) return;
      setLoading(true);

      try {
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('id, latitude, longitude, address, client_id, name, clients(company_name, physical_city, physical_zip, phone)')
          .eq('organization_id', organizationId)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);

        if (locationsError) {
          console.error('Failed to fetch locations:', locationsError);
          setMapError('Failed to load location data');
          setLoading(false);
          return;
        }

        const { data: locationPickups, error: pickupsError } = await supabase
          .from('pickups')
          .select('location_id')
          .eq('organization_id', organizationId)
          .eq('status', 'completed');

        if (pickupsError) {
          console.error('Failed to fetch pickups:', pickupsError);
        }

        const locationPickupCounts = new Map<string, number>();
        for (const p of locationPickups || []) {
          if (p.location_id) {
            locationPickupCounts.set(p.location_id, (locationPickupCounts.get(p.location_id) || 0) + 1);
          }
        }

        const combinedLocations: LocationData[] = [];
        for (const loc of locationsData || []) {
          const count = locationPickupCounts.get(loc.id) || 0;
          if (loc.latitude && loc.longitude) {
            const clientData = loc.clients as { company_name?: string; physical_city?: string; physical_zip?: string; phone?: string } | null;
            combinedLocations.push({
              id: loc.id,
              lat: loc.latitude,
              lng: loc.longitude,
              pickupCount: count,
              zip: clientData?.physical_zip || null,
              city: clientData?.physical_city || null,
              clientName: clientData?.company_name || loc.name || 'Unknown Location',
              address: loc.address || null,
              phone: clientData?.phone || null,
            });
          }
        }

        setLocations(combinedLocations);
      } catch (error) {
        console.error('Error fetching location data:', error);
        setMapError('Failed to load location data');
      } finally {
        setLoading(false);
      }
    }

    fetchLocationData();
  }, [organizationId]);

  // Get marker color based on pickup count
  const getMarkerColor = (pickupCount: number): string => {
    if (pickupCount >= 10) return '#ef4444'; // Red - high activity
    if (pickupCount >= 5) return '#f59e0b'; // Orange - moderate
    if (pickupCount >= 1) return '#3b82f6'; // Blue - low activity
    return '#94a3b8'; // Gray - no pickups
  };

  // Create marker HTML element
  const createMarkerElement = (loc: LocationData, isSelected: boolean = false): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'marker-container';
    const size = isSelected ? 40 : (loc.pickupCount >= 10 ? 32 : loc.pickupCount >= 5 ? 28 : 24);
    const color = getMarkerColor(loc.pickupCount);
    
    el.innerHTML = `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size > 28 ? 12 : 10}px;
        cursor: pointer;
        transition: transform 0.2s;
        ${isSelected ? 'transform: scale(1.2); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);' : ''}
      ">
        ${loc.pickupCount}
      </div>
    `;
    
    el.addEventListener('mouseenter', () => {
      el.querySelector('div')!.style.transform = 'scale(1.15)';
    });
    el.addEventListener('mouseleave', () => {
      if (!isSelected) {
        el.querySelector('div')!.style.transform = 'scale(1)';
      }
    });
    
    return el;
  };

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (popupRef.current) popupRef.current.remove();
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Initialize map and add markers
  useEffect(() => {
    if (loading || !mapContainer.current || !mapboxToken || !mapboxgl || locations.length === 0) return;
    if (map.current) return;

    try {
      if (mapboxgl && typeof mapboxgl === 'object') {
        (mapboxgl as any).accessToken = mapboxToken;
      }
    } catch { /* ignore */ }

    // Calculate initial bounds
    let initialCenter: [number, number] = [-84.5, 44.0];
    let initialZoom = 6;
    
    if (locations.length > 0) {
      const lats = locations.map(l => l.lat);
      const lngs = locations.map(l => l.lng);
      const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      initialCenter = [avgLng, avgLat];
      initialZoom = 8;
    }

    try {
      map.current = new mapboxgl.Map({
        accessToken: mapboxToken,
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: initialCenter,
        zoom: initialZoom,
        pitch: 0,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add markers after map loads
      map.current.on('load', () => {
        updateMarkers();
      });

    } catch (err) {
      console.error('Failed to initialize Mapbox map:', err);
      setMapError('Something went wrong loading the map');
    }
  }, [mapboxToken, locations, mapboxgl, loading]);

  // Update markers when filtered locations change
  const updateMarkers = () => {
    if (!map.current || !mapboxgl) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add new markers for filtered locations
    filteredLocations.forEach(loc => {
      const el = createMarkerElement(loc, loc.id === selectedLocation);
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map.current!);

      // Click handler for popup
      el.addEventListener('click', () => {
        setSelectedLocation(loc.id);
        
        // Close existing popup
        if (popupRef.current) popupRef.current.remove();
        
        // Create popup with client details
        popupRef.current = new mapboxgl.Popup({ offset: 25, closeButton: true })
          .setLngLat([loc.lng, loc.lat])
          .setHTML(`
            <div style="padding: 12px; min-width: 200px;">
              <h3 style="margin: 0 0 8px; font-weight: 600; font-size: 14px; color: #1a1a1a;">
                ${loc.clientName}
              </h3>
              ${loc.address ? `<p style="margin: 0 0 4px; font-size: 12px; color: #666;">${loc.address}</p>` : ''}
              ${loc.city || loc.zip ? `<p style="margin: 0 0 8px; font-size: 12px; color: #666;">${[loc.city, loc.zip].filter(Boolean).join(', ')}</p>` : ''}
              ${loc.phone ? `<p style="margin: 0 0 8px; font-size: 12px; color: #3b82f6;">${loc.phone}</p>` : ''}
              <div style="display: flex; align-items: center; gap: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                <span style="
                  background: ${getMarkerColor(loc.pickupCount)};
                  color: white;
                  padding: 2px 8px;
                  border-radius: 12px;
                  font-size: 11px;
                  font-weight: 600;
                ">${loc.pickupCount} pickup${loc.pickupCount !== 1 ? 's' : ''}</span>
                <span style="font-size: 11px; color: #888;">
                  ${loc.pickupCount >= 10 ? 'High Activity' : loc.pickupCount >= 5 ? 'Moderate' : loc.pickupCount >= 1 ? 'Low Activity' : 'No Pickups'}
                </span>
              </div>
            </div>
          `)
          .addTo(map.current!);

        popupRef.current.on('close', () => {
          setSelectedLocation(null);
        });
      });

      markersRef.current.push(marker);
    });
  };

  // Re-render markers when filters change
  useEffect(() => {
    if (map.current && mapboxgl && !loading) {
      updateMarkers();
    }
  }, [filteredLocations, selectedLocation]);

  // Fit all locations in view
  const fitAllLocations = () => {
    if (!map.current || !mapboxgl || filteredLocations.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    filteredLocations.forEach(loc => bounds.extend([loc.lng, loc.lat]));
    
    map.current.fitBounds(bounds, {
      padding: 50,
      maxZoom: 12,
      duration: 1000,
    });
  };

  // Fly to specific location
  const flyToLocation = (loc: LocationData) => {
    if (!map.current) return;
    
    setSelectedLocation(loc.id);
    map.current.flyTo({
      center: [loc.lng, loc.lat],
      zoom: 14,
      duration: 1500,
    });

    // Trigger marker click after flying
    setTimeout(() => {
      const markerIndex = filteredLocations.findIndex(l => l.id === loc.id);
      if (markerIndex >= 0 && markersRef.current[markerIndex]) {
        const el = markersRef.current[markerIndex].getElement();
        el?.click();
      }
    }, 1600);
  };

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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Sidebar - Location List */}
      <Card className="lg:col-span-1 h-fit max-h-[calc(100vh-200px)] flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Locations ({filteredLocations.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search client, city, ZIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter by pickups */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3" /> Min Pickups
              </span>
              <span className="font-medium">{minPickups}+</span>
            </div>
            <Slider
              value={[minPickups]}
              onValueChange={([val]) => setMinPickups(val)}
              max={maxPickups}
              step={1}
              className="w-full"
            />
          </div>

          {/* Location List */}
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {filteredLocations.slice(0, 50).map(loc => (
              <button
                key={loc.id}
                onClick={() => flyToLocation(loc)}
                className={`w-full text-left p-2 rounded-md transition-colors ${
                  selectedLocation === loc.id 
                    ? 'bg-primary/10 border border-primary/30' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{loc.clientName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[loc.city, loc.zip].filter(Boolean).join(', ') || 'No address'}
                    </p>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="shrink-0 text-xs"
                    style={{ backgroundColor: `${getMarkerColor(loc.pickupCount)}20`, color: getMarkerColor(loc.pickupCount) }}
                  >
                    {loc.pickupCount}
                  </Badge>
                </div>
              </button>
            ))}
            {filteredLocations.length > 50 && (
              <p className="text-xs text-center text-muted-foreground py-2">
                +{filteredLocations.length - 50} more locations
              </p>
            )}
            {filteredLocations.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-8">
                No locations match your filters
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Map Area */}
      <div className="lg:col-span-3 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Michigan Service Coverage
                </CardTitle>
                <CardDescription>
                  Click markers to view client details. Marker size and color indicate activity level.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fitAllLocations}>
                <Maximize2 className="h-4 w-4 mr-1" />
                Fit All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Locations</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-xl font-bold">{stats.totalPickups}</p>
                <p className="text-xs text-muted-foreground">Total Pickups</p>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg">
                <p className="text-xl font-bold text-red-500">{stats.hotZones}</p>
                <p className="text-xs text-muted-foreground">High Activity Cities</p>
              </div>
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <p className="text-xl font-bold text-blue-500">{stats.coldZones}</p>
                <p className="text-xs text-muted-foreground">Growth Opportunity</p>
              </div>
            </div>

            {/* Map */}
            <div 
              ref={mapContainer} 
              className="w-full h-[450px] rounded-lg overflow-hidden border border-border"
              style={{ minHeight: '450px' }}
            />

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-400 border-2 border-white shadow" />
                <span className="text-muted-foreground">No Pickups</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow" />
                <span className="text-muted-foreground">1-4 Pickups</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow" />
                <span className="text-muted-foreground">5-9 Pickups</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-500 border-2 border-white shadow" />
                <span className="text-muted-foreground">10+ Pickups</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Zones Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Activity by City
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Strong Markets */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  Strong Markets
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activityZones.filter(z => z.status === 'hot' || z.status === 'warm').slice(0, 6).map(zone => (
                    <div key={zone.city} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="min-w-0">
                        <span className="font-medium text-sm block">{zone.city}</span>
                        <span className="text-xs text-muted-foreground">
                          {zone.locationCount} client{zone.locationCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Badge 
                        variant="secondary"
                        className="shrink-0"
                        style={{ backgroundColor: zone.status === 'hot' ? '#fef2f2' : '#fffbeb', color: zone.status === 'hot' ? '#dc2626' : '#d97706' }}
                      >
                        {zone.pickupCount} pickups
                      </Badge>
                    </div>
                  ))}
                  {activityZones.filter(z => z.status === 'hot' || z.status === 'warm').length === 0 && (
                    <p className="text-sm text-muted-foreground">No high activity areas yet</p>
                  )}
                </div>
              </div>

              {/* Growth Opportunities */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  Growth Opportunities
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activityZones.filter(z => z.status === 'cold' || z.status === 'opportunity').slice(0, 6).map(zone => (
                    <div key={zone.city} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="min-w-0">
                        <span className="font-medium text-sm block">{zone.city}</span>
                        <span className="text-xs text-muted-foreground">
                          {zone.locationCount} client{zone.locationCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {zone.pickupCount} pickup{zone.pickupCount !== 1 ? 's' : ''}
                      </Badge>
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
    </div>
  );
}
