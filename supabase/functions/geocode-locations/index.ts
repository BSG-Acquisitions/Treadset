import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GoogleMapsGeocodeResult {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  partial_match?: boolean;
}

interface GoogleMapsGeocodeResponse {
  results: GoogleMapsGeocodeResult[];
  status: string;
}

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
  googleMapsApiKey: string,
  opts?: { components?: string; region?: string; bounds?: string }
): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address.trim());
    const params = new URLSearchParams({ address: encodedAddress, key: googleMapsApiKey });
    if (opts?.region) params.set('region', opts.region);
    if (opts?.components) params.set('components', opts.components);
    if (opts?.bounds) params.set('bounds', opts.bounds);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;

    const response = await fetch(url);
    const data: GoogleMapsGeocodeResponse = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      const types = result.types || [];
      const isCoarse = types.includes('administrative_area_level_1') || types.includes('country');
      if (isCoarse) {
        console.log(`Rejected coarse geocode result (types: ${types.join(',')}) for: ${address}`);
        return null;
      }
      const allowedTypes = ['street_address','premise','establishment','subpremise','point_of_interest'];
      const isPrecise = types.some((t) => allowedTypes.includes(t));
      if (!isPrecise) {
        console.log(`Rejected imprecise geocode result (types: ${types.join(',')}) for: ${address}`);
        return null;
      }
      return { lat: location.lat, lng: location.lng };
    }

    console.log(`Geocoding failed for address: ${address}, status: ${data.status}`);
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

    const googleMapsApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!googleMapsApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    const { locationId, address, forceUpdate = false, fixOutliers = false } = await req.json();
    console.log('Geocoding request:', { locationId, address, forceUpdate, fixOutliers });

    if (locationId) {
      // Geocode a specific location
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id, name, address, latitude, longitude, organization_id')
        .eq('id', locationId)
        .single();

      if (locationError) throw locationError;

      // Skip if already has coordinates and not forcing update
      if (!forceUpdate && location.latitude && location.longitude) {
        return new Response(
          JSON.stringify({ 
            message: 'Location already has coordinates',
            location: {
              id: location.id,
              name: location.name,
              latitude: location.latitude,
              longitude: location.longitude
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const addressToGeocode = address || location.address;
      if (!addressToGeocode) {
        throw new Error('No address available for geocoding');
      }

      const initialState = guessState(addressToGeocode) || 'MI';
      const depot = await getOrgDepot(supabase, location.organization_id);
      const bounds = boundsFromCenter(depot, 120);
      let coordinates = await geocodeAddress(addressToGeocode, googleMapsApiKey, { region: 'us', components: `administrative_area:${initialState}|country:US`, bounds });
      
      if (!coordinates) {
        // Retry with state bias (defaults to MI) to resolve ambiguous addresses like "10031 Greenfield"
        const state = initialState;
        let strict = await geocodeAddress(addressToGeocode, googleMapsApiKey, {
          region: 'us',
          components: `administrative_area:${state}|country:US`,
          bounds
        });
        if (!strict) {
          // Fallback: append state to the address to disambiguate
          strict = await geocodeAddress(`${addressToGeocode}, ${state}`, googleMapsApiKey, { region: 'us', components: `administrative_area:${state}|country:US`, bounds });
        }
        if (!strict && location?.name) {
          // Last attempt: try business name with state near depot city
          strict = await geocodeAddress(`${location.name}, ${state}`, googleMapsApiKey, { region: 'us', components: `administrative_area:${state}|country:US`, bounds });
        }
        if (strict) {
          coordinates = strict;
        } else {
          throw new Error(`Failed to geocode address: ${addressToGeocode}`);
        }
      }

      // Validate against org depot and retry with state bias if it's an outlier
      if (haversineDistance(depot, coordinates) > 300) {
        const state = initialState;
        let strict = await geocodeAddress(`${addressToGeocode}, ${state}`, googleMapsApiKey, { 
          region: 'us', 
          components: `administrative_area:${state}|country:US`,
          bounds
        });
        if (strict) coordinates = strict;
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

      return new Response(
        JSON.stringify({
          message: 'Location coordinates updated successfully',
          location: {
            id: location.id,
            name: location.name,
            latitude: coordinates.lat,
            longitude: coordinates.lng
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Geocode all locations - batch mode with automatic outlier detection
      const { data: allLocations, error: locationsError } = await supabase
        .from('locations')
        .select('id, name, address, latitude, longitude, organization_id');

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

      // We'll compute depot per location to respect multi-org data


      const results = [];
      let successful = 0;
      let failed = 0;
      let outliersCorrected = 0;

      for (const location of allLocations) {
        if (!location.address) {
          console.log(`Skipping location ${location.id} - no address`);
          failed++;
          continue;
        }

        const hasCoords = location.latitude && location.longitude;
        const depot = await getOrgDepot(supabase, location.organization_id);
        const isOutlier = hasCoords && haversineDistance(depot, { lat: Number(location.latitude), lng: Number(location.longitude) }) > 300;
        
        // Determine if we should process this location
        const shouldProcess = (!hasCoords) || (fixOutliers && isOutlier) || (forceUpdate === true);
        if (!shouldProcess) {
          console.log(`Skipping location ${location.id} - already has good coordinates`);
          continue;
        }

        const defaultState = guessState(location.address) || 'MI';
        let coordinates = await geocodeAddress(location.address, googleMapsApiKey, { region: 'us', components: `administrative_area:${defaultState}|country:US` });
        
        if (!coordinates) {
          // Retry with state bias (defaults to MI) for ambiguous addresses
          const state = guessState(location.address) || 'MI';
          let strict = await geocodeAddress(location.address, googleMapsApiKey, {
            region: 'us',
            components: `administrative_area:${state}|country:US`
          });
          if (!strict) {
            // Fallback: append state to the address to disambiguate
            strict = await geocodeAddress(`${location.address}, ${state}`, googleMapsApiKey, { region: 'us' });
          }
          if (!strict && location?.name) {
            // Last attempt: try business name with state
            strict = await geocodeAddress(`${location.name}, ${state}`, googleMapsApiKey, { region: 'us' });
          }
          if (strict) {
            coordinates = strict;
          } else {
            console.log(`Failed to geocode location ${location.id}: ${location.address}`);
            failed++;
            continue;
          }
        }

        // Auto-detect and fix outliers with state bias
        if (haversineDistance(depot, coordinates) > 300) {
          const state = guessState(location.address) || 'MI';
          console.log(`Location ${location.id} is an outlier (${haversineDistance(depot, coordinates).toFixed(0)}km from depot), retrying with state: ${state}`);
          let strict = await geocodeAddress(location.address, googleMapsApiKey, { 
            region: 'us', 
            components: `administrative_area:${state}|country:US` 
          });
          if (!strict) {
            // Fallback: append state to address to disambiguate
            strict = await geocodeAddress(`${location.address}, ${state}`, googleMapsApiKey, { region: 'us' });
          }
          if (strict) {
            coordinates = strict;
            if (hasCoords) outliersCorrected++;
          }
        }

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
            longitude: coordinates.lng
          });
          successful++;
        }

        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return new Response(
        JSON.stringify({
          message: `Geocoding completed: ${successful} successful, ${failed} failed${outliersCorrected > 0 ? `, ${outliersCorrected} outliers corrected` : ''}`,
          processed: successful + failed,
          successful,
          failed,
          outliersCorrected,
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