import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MapboxGeocodeFeature {
  center: [number, number]; // [lng, lat]
  place_type: string[];
  relevance: number;
  context?: Array<{
    id: string;
    text: string;
  }>;
  properties?: {
    accuracy?: string;
  };
}

interface MapboxGeocodeResponse {
  type: string;
  features: MapboxGeocodeFeature[];
}

// Detroit Metro Area Boundaries (Wayne, Oakland, Macomb counties)
const DETROIT_BOUNDS = {
  minLat: 42.1,
  maxLat: 42.8,
  minLng: -83.6,
  maxLng: -82.4
};

const DETROIT_METRO_COUNTIES = ['Wayne', 'Oakland', 'Macomb'];
const MAX_DISTANCE_FROM_DEPOT_KM = 160; // ~100 miles

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371; // km
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function guessState(address: string): string | null {
  // Try to pick up a two-letter state before ZIP
  const m = address.match(/,\s*([A-Z]{2})\s*\d{5}/i);
  if (m) return m[1].toUpperCase();
  if (/\bMI\b/i.test(address)) return 'MI';
  return null;
}

function isWithinDetroitMetro(lat: number, lng: number): boolean {
  return lat >= DETROIT_BOUNDS.minLat &&
         lat <= DETROIT_BOUNDS.maxLat &&
         lng >= DETROIT_BOUNDS.minLng &&
         lng <= DETROIT_BOUNDS.maxLng;
}

function extractCounty(feature: MapboxGeocodeFeature): string | null {
  if (!feature.context) return null;
  // Mapbox uses 'district' for US counties
  const countyContext = feature.context.find(ctx => 
    ctx.id.startsWith('district.') || ctx.id.startsWith('region.')
  );
  if (countyContext) {
    return countyContext.text.replace(' County', '');
  }
  return null;
}

function enhanceAddress(address: string, clientCity?: string, clientState?: string): string {
  // If address already has city and state, return as-is
  if (/,\s*[A-Z]{2}\s*\d{5}/.test(address)) {
    return address;
  }
  
  // Add city and state if available from client
  if (clientCity && clientState) {
    return `${address}, ${clientCity}, ${clientState}`;
  }
  
  // Default to Detroit, MI if no other info available
  if (!/Detroit|MI/i.test(address)) {
    return `${address}, Detroit, MI`;
  }
  
  return address;
}

async function getOrgDepot(supabase: any, orgId: string): Promise<{ lat: number; lng: number }> {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('depot_lat, depot_lng')
    .eq('id', orgId)
    .maybeSingle();
  if (error) {
    console.log('Failed to fetch org depot, using Detroit default:', error.message);
  }
  const lat = Number(org?.depot_lat ?? 42.3314);
  const lng = Number(org?.depot_lng ?? -83.0458);
  return { lat, lng };
}

function boundsFromCenter(center: { lat: number; lng: number }, radiusKm: number) {
  const latDelta = radiusKm / 111; // ~111km per degree lat
  const lngDelta = radiusKm / (111 * Math.cos(toRadians(center.lat)) || 1);
  const sw = { lat: center.lat - latDelta, lng: center.lng - lngDelta };
  const ne = { lat: center.lat + latDelta, lng: center.lng + lngDelta };
  return `${sw.lat},${sw.lng}|${ne.lat},${ne.lng}`;
}

async function geocodeAddress(
  address: string,
  mapboxToken: string,
  opts?: { proximity?: string; bbox?: string; country?: string }
): Promise<{ lat: number; lng: number; county?: string; confidence: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const params = new URLSearchParams({ 
      access_token: mapboxToken,
      limit: '5', // Get top 5 results to find best match
      types: 'address,poi', // Only precise address or point of interest
      autocomplete: 'false' // Disable autocomplete for more precise results
    });
    
    if (opts?.country) params.set('country', opts.country);
    if (opts?.proximity) params.set('proximity', opts.proximity);
    if (opts?.bbox) params.set('bbox', opts.bbox);
    
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?${params.toString()}`;

    console.log(`🔍 Geocoding: "${address}"`);
    const response = await fetch(url);
    const data: MapboxGeocodeResponse = await response.json();

    if (data.features && data.features.length > 0) {
      // Find the most precise result within Detroit metro
      let bestFeature: MapboxGeocodeFeature | null = null;
      let bestScore = 0;

      for (const feature of data.features) {
        const [lng, lat] = feature.center;
        const placeTypes = feature.place_type || [];
        const relevance = feature.relevance || 0;
        
        // Skip if not precise enough
        const allowedTypes = ['address', 'poi'];
        const isPrecise = placeTypes.some((t) => allowedTypes.includes(t));
        if (!isPrecise) continue;
        
        // Check if within Detroit metro bounds
        const inDetroitBounds = isWithinDetroitMetro(lat, lng);
        if (!inDetroitBounds) continue;
        
        // Calculate score based on relevance and precision
        let score = relevance * 100;
        if (placeTypes.includes('address')) score += 50; // Prefer addresses over POIs
        
        if (score > bestScore) {
          bestScore = score;
          bestFeature = feature;
        }
      }

      if (!bestFeature) {
        console.log(`❌ No precise Detroit metro results for: ${address}`);
        return null;
      }

      const [lng, lat] = bestFeature.center;
      const placeTypes = bestFeature.place_type || [];
      const relevance = bestFeature.relevance || 0;
      
      // Extract county for validation
      const county = extractCounty(bestFeature);
      
      // Validate against Detroit metro area bounds
      const inDetroitBounds = isWithinDetroitMetro(lat, lng);
      const inDetroitCounty = county ? DETROIT_METRO_COUNTIES.includes(county) : false;
      
      // Calculate confidence score
      let confidence = Math.round(relevance * 50); // Base score from relevance
      if (placeTypes.includes('address')) confidence += 30; // Address is better than POI
      if (inDetroitBounds) confidence += 10;
      if (inDetroitCounty) confidence += 10;
      
      // Log validation results
      console.log(`📍 Geocoded: ${address} -> (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
      console.log(`   Type: ${placeTypes.join(',')}, County: ${county || 'unknown'}, Confidence: ${confidence}%, Relevance: ${relevance.toFixed(2)}`);
      
      return { 
        lat, 
        lng,
        county,
        confidence
      };
    }

    console.log(`❌ No results for: ${address}`);
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    if (!mapboxToken) {
      throw new Error('Mapbox access token not configured');
    }

    const { locationId, address, forceUpdate = false, fixOutliers = false } = await req.json();
    console.log('Geocoding request:', { locationId, address, forceUpdate, fixOutliers });

    if (locationId) {
      // Geocode a specific location
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select(`
          id, name, address, latitude, longitude, organization_id,
          client_id,
          clients!inner(city, state)
        `)
        .eq('id', locationId)
        .single();

      if (locationError) throw locationError;

      // Skip if already has coordinates and not forcing update
      if (!forceUpdate && location.latitude && location.longitude) {
        const depot = await getOrgDepot(supabase, location.organization_id);
        const distanceKm = haversineDistance(depot, { lat: Number(location.latitude), lng: Number(location.longitude) });
        const isOutlier = distanceKm > MAX_DISTANCE_FROM_DEPOT_KM;
        
        if (!isOutlier) {
          return new Response(
            JSON.stringify({ 
              message: 'Location already has good coordinates',
              location: {
                id: location.id,
                name: location.name,
                latitude: location.latitude,
                longitude: location.longitude,
                distanceFromDepotMiles: (distanceKm * 0.621371).toFixed(1)
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const addressToGeocode = address || location.address;
      if (!addressToGeocode) {
        throw new Error('No address available for geocoding');
      }

      // Get client city/state if available
      const clientCity = (location as any).clients?.city;
      const clientState = (location as any).clients?.state || 'MI';

      // Enhance address with Detroit context
      const enhancedAddress = enhanceAddress(addressToGeocode, clientCity, clientState);
      console.log(`🔍 Original: "${addressToGeocode}" -> Enhanced: "${enhancedAddress}"`);

      const depot = await getOrgDepot(supabase, location.organization_id);
      const proximity = `${depot.lng},${depot.lat}`; // Mapbox uses lng,lat
      const bbox = `${depot.lng - 1.5},${depot.lat - 1},${depot.lng + 1},${depot.lat + 1}`; // ~100 mile radius
      
      // Try 1: Full address with business name for best precision
      let coordinates = await geocodeAddress(`${location.name}, ${enhancedAddress}`, mapboxToken, { 
        country: 'us',
        proximity,
        bbox
      });
      
      // Try 2: Just the enhanced address
      if (!coordinates) {
        console.log('⚠️  Trying without business name...');
        coordinates = await geocodeAddress(enhancedAddress, mapboxToken, {
          country: 'us',
          proximity,
          bbox
        });
      }
      
      // Try 3: Original address
      if (!coordinates) {
        console.log('⚠️  Trying original address...');
        coordinates = await geocodeAddress(addressToGeocode, mapboxToken, {
          country: 'us',
          proximity,
          bbox
        });
      }
      
      // Try 4: Business name with city (last resort)
      if (!coordinates && location?.name) {
        console.log('⚠️  Last resort: business name with Detroit, MI...');
        coordinates = await geocodeAddress(`${location.name}, Detroit, MI`, mapboxToken, { 
          country: 'us',
          proximity,
          bbox
        });
      }
      
      if (!coordinates) {
        throw new Error(`Failed to geocode address: ${enhancedAddress}. All attempts exhausted.`);
      }

      // Final validation - reject if way outside Detroit area
      const distanceFromDepot = haversineDistance(depot, coordinates);
      if (distanceFromDepot > MAX_DISTANCE_FROM_DEPOT_KM) {
        console.log(`⚠️  WARNING: Geocoded location is ${distanceFromDepot.toFixed(0)}km from depot (>${MAX_DISTANCE_FROM_DEPOT_KM}km threshold)`);
        throw new Error(
          `Geocoded coordinates are too far from depot (${(distanceFromDepot * 0.621371).toFixed(0)} miles). ` +
          `This likely indicates an incorrect geocode result. Please verify the address.`
        );
      }

      // Update the location with coordinates
      const { error: updateError } = await supabase
        .from('locations')
        .update({
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', locationId);

      if (updateError) throw updateError;

      const distanceMiles = (distanceFromDepot * 0.621371).toFixed(1);
      const confidenceMsg = coordinates.confidence >= 80 ? '✅ High confidence' : 
                           coordinates.confidence >= 60 ? '⚠️  Medium confidence' : 
                           '❌ Low confidence - manual review recommended';

      return new Response(
        JSON.stringify({
          message: 'Location coordinates updated successfully',
          location: {
            id: location.id,
            name: location.name,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            county: coordinates.county,
            confidence: coordinates.confidence,
            distanceFromDepotMiles: distanceMiles,
            confidenceLevel: confidenceMsg
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Geocode all locations - batch mode
      console.log('🔄 Starting batch geocoding...');
      const { data: allLocations, error: locationsError } = await supabase
        .from('locations')
        .select(`
          id, name, address, latitude, longitude, organization_id,
          client_id,
          clients!inner(city, state)
        `);

      if (locationsError) throw locationsError;

      if (!allLocations || allLocations.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'No locations found',
            processed: 0 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📊 Found ${allLocations.length} locations to process`);

      const results = [];
      let successful = 0;
      let failed = 0;
      let skipped = 0;
      let outliersCorrected = 0;
      let lowConfidence = 0;

      for (const location of allLocations) {
        if (!location.address) {
          console.log(`⏭️  Skipping location ${location.id} - no address`);
          failed++;
          continue;
        }

        const hasCoords = location.latitude && location.longitude;
        const depot = await getOrgDepot(supabase, location.organization_id);
        const proximity = `${depot.lng},${depot.lat}`;
        const bbox = `${depot.lng - 1.5},${depot.lat - 1},${depot.lng + 1},${depot.lat + 1}`;
        const isOutlier = hasCoords && haversineDistance(depot, { lat: Number(location.latitude), lng: Number(location.longitude) }) > MAX_DISTANCE_FROM_DEPOT_KM;
        
        // Only process if: no coords, is outlier+fixing, or force update
        const shouldProcess = (!hasCoords) || (fixOutliers && isOutlier) || (forceUpdate === true);
        if (!shouldProcess) {
          skipped++;
          continue;
        }

        // Get client location info
        const clientCity = (location as any).clients?.city;
        const clientState = (location as any).clients?.state || 'MI';

        // Enhance address before geocoding
        const enhancedAddress = enhanceAddress(location.address, clientCity, clientState);
        if (enhancedAddress !== location.address) {
          console.log(`🔍 Enhanced: "${location.address}" -> "${enhancedAddress}"`);
        }

        // Try geocoding with business name + enhanced address for better precision
        let coordinates = await geocodeAddress(`${location.name}, ${enhancedAddress}`, mapboxToken, { 
          country: 'us',
          proximity,
          bbox
        });
        
        // Fallback: enhanced address only
        if (!coordinates) {
          console.log(`⚠️  Trying enhanced address without business name...`);
          coordinates = await geocodeAddress(enhancedAddress, mapboxToken, {
            country: 'us',
            proximity,
            bbox
          });
        }
        
        // Fallback: original address
        if (!coordinates) {
          console.log(`⚠️  Trying original address...`);
          coordinates = await geocodeAddress(location.address, mapboxToken, {
            country: 'us',
            proximity,
            bbox
          });
        }
        
        // Last resort: business name with city
        if (!coordinates && location?.name) {
          console.log(`⚠️  Last resort: business name with Detroit, MI`);
          coordinates = await geocodeAddress(`${location.name}, Detroit, MI`, mapboxToken, { 
            country: 'us',
            proximity,
            bbox
          });
        }
        
        if (!coordinates) {
          console.log(`❌ Failed to geocode location ${location.id}: ${location.address}`);
          failed++;
          continue;
        }

        // Final distance validation - reject if too far from depot
        const distanceFromDepot = haversineDistance(depot, coordinates);
        if (distanceFromDepot > MAX_DISTANCE_FROM_DEPOT_KM) {
          console.log(`❌ Rejected geocode for ${location.id}: ${distanceFromDepot.toFixed(0)}km from depot (max: ${MAX_DISTANCE_FROM_DEPOT_KM}km)`);
          failed++;
          continue;
        }

        // Track outlier corrections
        if (isOutlier && hasCoords) {
          outliersCorrected++;
          console.log(`✅ Corrected outlier ${location.id}: was ${haversineDistance(depot, { lat: Number(location.latitude), lng: Number(location.longitude) }).toFixed(0)}km, now ${distanceFromDepot.toFixed(0)}km from depot`);
        }

        // Track low confidence results
        if (coordinates.confidence < 70) {
          lowConfidence++;
          console.log(`⚠️  Low confidence (${coordinates.confidence}%) for ${location.id}`);
        }

        // Update database
        const { error: updateError } = await supabase
          .from('locations')
          .update({
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            updated_at: new Date().toISOString()
          })
          .eq('id', location.id);

        if (updateError) {
          console.error(`Failed to update location ${location.id}:`, updateError);
          failed++;
        } else {
          results.push({
            id: location.id,
            name: location.name,
            latitude: coordinates.lat,
            longitude: coordinates.lng,
            county: coordinates.county,
            confidence: coordinates.confidence,
            distanceFromDepotMiles: (distanceFromDepot * 0.621371).toFixed(1)
          });
          successful++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Batch complete: ${successful} successful, ${failed} failed, ${skipped} skipped, ${outliersCorrected} outliers corrected, ${lowConfidence} low confidence`);

      return new Response(
        JSON.stringify({
          message: `Geocoding completed: ${successful} successful, ${failed} failed, ${skipped} skipped`,
          processed: successful + failed,
          successful,
          failed,
          skipped,
          outliersCorrected,
          lowConfidence,
          locations: results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});