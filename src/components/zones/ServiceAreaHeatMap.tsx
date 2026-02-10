import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Loader2, MapPin, Target, TrendingUp, Search, Maximize2, Filter, Building2, AlertTriangle, RefreshCw, Wrench, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/formatters';
import { useMapDataCompleteness } from '@/hooks/useMapDataCompleteness';
import 'mapbox-gl/dist/mapbox-gl.css';

interface LocationData {
  id: string;
  clientId: string;
  lat: number;
  lng: number;
  pickupCount: number;
  dropoffCount: number;
  totalActivity: number;
  revenue: number;
  zip: string | null;
  city: string | null;
  clientName: string;
  address: string | null;
  phone: string | null;
  isAtRisk: boolean;
  riskLevel: 'high' | 'medium' | 'low' | null;
  daysSinceLastPickup: number | null;
}

interface ActivityZone {
  city: string;
  pickupCount: number;
  locationCount: number;
  revenue: number;
  atRiskCount: number;
  status: 'hot' | 'warm' | 'cold' | 'opportunity';
  topClients: string[];
}

export function ServiceAreaHeatMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const popupRef = useRef<any>(null);
  const navigate = useNavigate();

  const { user } = useAuth();
  const organizationId = user?.currentOrganization?.id;
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [mapboxgl, setMapboxgl] = useState<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data completeness tracking
  const { stats: completenessStats, isFixing, fixMissingData, refreshMapData } = useMapDataCompleteness();
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [minPickups, setMinPickups] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'activity' | 'revenue' | 'risk'>('activity');
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);

  // Calculate activity zones by city
  const activityZones = useMemo(() => {
    const cityMap = new Map<string, { count: number; locations: number; revenue: number; atRisk: number; clients: Set<string> }>();
    
    locations.forEach(loc => {
      const city = loc.city || 'Unknown';
      const existing = cityMap.get(city) || { count: 0, locations: 0, revenue: 0, atRisk: 0, clients: new Set() };
      existing.count += loc.totalActivity; // Use total activity (pickups + dropoffs)
      existing.locations += 1;
      existing.revenue += loc.revenue;
      if (loc.isAtRisk) existing.atRisk += 1;
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
        revenue: data.revenue,
        atRiskCount: data.atRisk,
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
    totalActivity: locations.reduce((sum, l) => sum + l.totalActivity, 0),
    totalPickups: locations.reduce((sum, l) => sum + l.pickupCount, 0),
    totalDropoffs: locations.reduce((sum, l) => sum + l.dropoffCount, 0),
    totalRevenue: locations.reduce((sum, l) => sum + l.revenue, 0),
    atRiskCount: locations.filter(l => l.isAtRisk).length,
  }), [locations, activityZones]);

  // Filtered locations based on search, min activity, and at-risk filter
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const matchesSearch = !searchQuery || 
        loc.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.zip?.includes(searchQuery);
      const matchesMinActivity = loc.totalActivity >= minPickups;
      const matchesAtRisk = !showAtRiskOnly || loc.isAtRisk;
      return matchesSearch && matchesMinActivity && matchesAtRisk;
    });
  }, [locations, searchQuery, minPickups, showAtRiskOnly]);


  // Max pickups for slider
  const maxPickups = useMemo(() => Math.max(...locations.map(l => l.totalActivity), 1), [locations]);

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

  // Fetch location data function
  const fetchLocationData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      // Fetch locations with client data
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, latitude, longitude, address, client_id, name, clients(id, company_name, physical_city, physical_zip, phone, last_pickup_at)')
        .eq('organization_id', organizationId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (locationsError) {
        console.error('Failed to fetch locations:', locationsError);
        setMapError('Failed to load location data');
        setLoading(false);
        return;
      }

      // Fetch pickups with revenue data
      const { data: pickupsData } = await supabase
        .from('pickups')
        .select('location_id, computed_revenue')
        .eq('organization_id', organizationId)
        .eq('status', 'completed');

      // Fetch dropoffs with revenue data (includes drop-off activity)
      const { data: dropoffsData } = await supabase
        .from('dropoffs')
        .select('client_id, computed_revenue')
        .eq('organization_id', organizationId);

      // Fetch at-risk clients
      const { data: riskData } = await supabase
        .from('client_risk_scores')
        .select('client_id, risk_level, risk_score')
        .eq('organization_id', organizationId);

      // Build pickup counts and revenue by location
      const locationStats = new Map<string, { pickups: number; revenue: number }>();
      for (const p of pickupsData || []) {
        if (p.location_id) {
          const existing = locationStats.get(p.location_id) || { pickups: 0, revenue: 0 };
          existing.pickups += 1;
          existing.revenue += p.computed_revenue || 0;
          locationStats.set(p.location_id, existing);
        }
      }

      // Build dropoff counts and revenue by client
      const clientDropoffs = new Map<string, { count: number; revenue: number }>();
      for (const d of dropoffsData || []) {
        if (d.client_id) {
          const existing = clientDropoffs.get(d.client_id) || { count: 0, revenue: 0 };
          existing.count += 1;
          existing.revenue += d.computed_revenue || 0;
          clientDropoffs.set(d.client_id, existing);
        }
      }

      // Build risk lookup by client
      const clientRisk = new Map<string, { level: string; score: number }>();
      for (const r of riskData || []) {
        clientRisk.set(r.client_id, { level: r.risk_level, score: r.risk_score });
      }

      const combinedLocations: LocationData[] = [];
      for (const loc of locationsData || []) {
        if (loc.latitude && loc.longitude) {
          const stats = locationStats.get(loc.id) || { pickups: 0, revenue: 0 };
          const clientData = loc.clients as { id?: string; company_name?: string; physical_city?: string; physical_zip?: string; phone?: string; last_pickup_at?: string } | null;
          const clientId = clientData?.id || loc.client_id;
          const risk = clientId ? clientRisk.get(clientId) : null;
          const dropoffs = clientId ? clientDropoffs.get(clientId) || { count: 0, revenue: 0 } : { count: 0, revenue: 0 };
          
          const lastPickup = clientData?.last_pickup_at ? new Date(clientData.last_pickup_at) : null;
          const daysSince = lastPickup 
            ? Math.floor((Date.now() - lastPickup.getTime()) / (1000 * 60 * 60 * 24))
            : null;

          combinedLocations.push({
            id: loc.id,
            clientId: clientId || '',
            lat: loc.latitude,
            lng: loc.longitude,
            pickupCount: stats.pickups,
            dropoffCount: dropoffs.count,
            totalActivity: stats.pickups + dropoffs.count,
            revenue: stats.revenue + dropoffs.revenue,
            zip: clientData?.physical_zip || null,
            city: clientData?.physical_city || null,
            clientName: clientData?.company_name || loc.name || 'Unknown Location',
            address: loc.address || null,
            phone: clientData?.phone || null,
            isAtRisk: risk?.level === 'high' || risk?.level === 'medium',
            riskLevel: (risk?.level as 'high' | 'medium' | 'low') || null,
            daysSinceLastPickup: daysSince,
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
  }, [organizationId]);

  // Initial data fetch
  useEffect(() => {
    fetchLocationData();
  }, [fetchLocationData]);

  // Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLocationData();
    await refreshMapData();
    setIsRefreshing(false);
    toast.success('Map data refreshed');
  };

  // Get marker color based on view mode
  const getMarkerColor = (loc: LocationData): string => {
    if (viewMode === 'risk') {
      if (loc.riskLevel === 'high') return '#dc2626'; // Red
      if (loc.riskLevel === 'medium') return '#f59e0b'; // Amber
      return '#22c55e'; // Green - healthy
    }
    if (viewMode === 'revenue') {
      if (loc.revenue >= 1000) return '#22c55e'; // Green - high revenue
      if (loc.revenue >= 500) return '#3b82f6'; // Blue - moderate
      if (loc.revenue > 0) return '#f59e0b'; // Amber - low
      return '#94a3b8'; // Gray - no revenue
    }
    // Activity view (default) - uses total activity
    if (loc.totalActivity >= 10) return '#ef4444'; // Red - high activity
    if (loc.totalActivity >= 5) return '#f59e0b'; // Orange - moderate
    if (loc.totalActivity >= 1) return '#3b82f6'; // Blue - low activity
    return '#94a3b8'; // Gray - no activity
  };

  // Hover tooltip ref
  const hoverPopupRef = useRef<any>(null);

  // Create marker HTML element
  const createMarkerElement = (loc: LocationData, isSelected: boolean = false): HTMLDivElement => {
    const el = document.createElement('div');
    el.className = 'marker-container';
    const baseSize = loc.totalActivity >= 10 ? 32 : loc.totalActivity >= 5 ? 28 : 24;
    const size = isSelected ? 40 : baseSize;
    const color = getMarkerColor(loc);
    
    // Add at-risk ring if applicable
    const riskRing = loc.isAtRisk ? `box-shadow: 0 0 0 3px ${loc.riskLevel === 'high' ? '#dc2626' : '#f59e0b'}, 0 2px 8px rgba(0,0,0,0.3);` : 'box-shadow: 0 2px 8px rgba(0,0,0,0.3);';
    
    el.innerHTML = `
      <div style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 3px solid white;
        ${riskRing}
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size > 28 ? 12 : 10}px;
        cursor: pointer;
        transition: transform 0.2s;
        position: relative;
        ${isSelected ? 'transform: scale(1.2);' : ''}
      ">
        ${viewMode === 'revenue' ? '$' : loc.totalActivity}
      </div>
      ${loc.isAtRisk ? `<div style="position: absolute; top: -4px; right: -4px; width: 12px; height: 12px; background: ${loc.riskLevel === 'high' ? '#dc2626' : '#f59e0b'}; border-radius: 50%; border: 2px solid white;"></div>` : ''}
    `;
    
    el.addEventListener('mouseenter', () => {
      const innerDiv = el.querySelector('div');
      if (innerDiv) innerDiv.style.transform = 'scale(1.15)';
    });
    el.addEventListener('mouseleave', () => {
      const innerDiv = el.querySelector('div');
      if (innerDiv && !isSelected) innerDiv.style.transform = 'scale(1)';
    });
    
    return el;
  };

  // Create hover tooltip for marker
  const showHoverTooltip = (loc: LocationData) => {
    if (!map.current || !mapboxgl) return;
    
    // Remove existing hover tooltip
    if (hoverPopupRef.current) {
      hoverPopupRef.current.remove();
      hoverPopupRef.current = null;
    }
    
    hoverPopupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: [0, -15],
      className: 'hover-tooltip'
    })
      .setLngLat([loc.lng, loc.lat])
      .setHTML(`
        <div style="padding: 8px 12px; background: white; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
          <p style="margin: 0; font-weight: 600; font-size: 13px; color: #1a1a1a;">${loc.clientName}</p>
          <p style="margin: 2px 0 0; font-size: 11px; color: #666;">
            ${loc.city || 'Unknown'} • ${loc.pickupCount} pickup${loc.pickupCount !== 1 ? 's' : ''}${loc.dropoffCount > 0 ? `, ${loc.dropoffCount} drop-off${loc.dropoffCount !== 1 ? 's' : ''}` : ''}
          </p>
        </div>
      `)
      .addTo(map.current);
  };

  const hideHoverTooltip = () => {
    if (hoverPopupRef.current) {
      hoverPopupRef.current.remove();
      hoverPopupRef.current = null;
    }
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
    let initialCenter: [number, number] = [-98.5, 39.8];
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
        style: 'mapbox://styles/mapbox/streets-v12', // Colorful streets style
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

      // Hover handler for tooltip
      el.addEventListener('mouseenter', () => {
        showHoverTooltip(loc);
      });
      el.addEventListener('mouseleave', () => {
        hideHoverTooltip();
      });

      // Click handler for popup
      el.addEventListener('click', () => {
        hideHoverTooltip(); // Hide hover tooltip when clicking
        setSelectedLocation(loc.id);
        
        // Close existing popup
        if (popupRef.current) popupRef.current.remove();
        
        // Create popup with client details
        popupRef.current = new mapboxgl.Popup({ offset: 25, closeButton: true })
          .setLngLat([loc.lng, loc.lat])
          .setHTML(`
            <div style="padding: 12px; min-width: 220px;">
              <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 8px;">
                <h3 style="margin: 0; font-weight: 600; font-size: 14px; color: #1a1a1a;">
                  ${loc.clientName}
                </h3>
                ${loc.isAtRisk ? `<span style="background: ${loc.riskLevel === 'high' ? '#fef2f2' : '#fffbeb'}; color: ${loc.riskLevel === 'high' ? '#dc2626' : '#d97706'}; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${loc.riskLevel === 'high' ? 'HIGH RISK' : 'AT RISK'}</span>` : ''}
              </div>
              ${loc.address ? `<p style="margin: 0 0 4px; font-size: 12px; color: #666;">${loc.address}</p>` : ''}
              ${loc.city || loc.zip ? `<p style="margin: 0 0 8px; font-size: 12px; color: #666;">${[loc.city, loc.zip].filter(Boolean).join(', ')}</p>` : ''}
              <div style="display: flex; gap: 12px; margin-bottom: 8px; font-size: 11px;">
                <span><strong>${loc.pickupCount}</strong> pickups</span>
                <span><strong>$${loc.revenue.toLocaleString()}</strong> revenue</span>
              </div>
              ${loc.daysSinceLastPickup !== null ? `<p style="margin: 0 0 8px; font-size: 11px; color: #888;">Last pickup: ${loc.daysSinceLastPickup} days ago</p>` : ''}
              <div style="display: flex; gap: 6px; padding-top: 8px; border-top: 1px solid #eee;">
                <a href="/clients/${loc.clientId}" style="flex: 1; text-align: center; padding: 6px 8px; background: #f1f5f9; color: #334155; border-radius: 6px; font-size: 11px; text-decoration: none; font-weight: 500;">View Details</a>
                ${loc.phone ? `<a href="tel:${loc.phone}" style="padding: 6px 8px; background: #dbeafe; color: #1d4ed8; border-radius: 6px; font-size: 11px; text-decoration: none;">📞 Call</a>` : ''}
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
                    style={{ backgroundColor: `${getMarkerColor(loc)}20`, color: getMarkerColor(loc) }}
                  >
                    {loc.isAtRisk && <AlertTriangle className="h-3 w-3 mr-1" />}
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
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={fitAllLocations}>
                  <Maximize2 className="h-4 w-4 mr-1" />
                  Fit All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Data Completeness Indicator */}
            {completenessStats.totalClients > 0 && completenessStats.completionPercentage < 100 && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">
                      {completenessStats.clientsWithCoordinates} of {completenessStats.totalClients} clients mapped ({completenessStats.completionPercentage}%)
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={fixMissingData}
                    disabled={isFixing}
                    className="text-xs"
                  >
                    {isFixing ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Wrench className="h-3 w-3 mr-1" />
                    )}
                    Fix Missing Data
                  </Button>
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  {completenessStats.clientsNeedingGeocode > 0 && (
                    <span>{completenessStats.clientsNeedingGeocode} need geocoding</span>
                  )}
                  {completenessStats.clientsMissingLocation > 0 && (
                    <span>{completenessStats.clientsMissingLocation} missing address</span>
                  )}
                </div>
              </div>
            )}
            
            {completenessStats.completionPercentage === 100 && completenessStats.totalClients > 0 && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">
                  All {completenessStats.totalClients} clients mapped
                </span>
              </div>
            )}

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
