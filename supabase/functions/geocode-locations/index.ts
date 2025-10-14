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


async function geocodeAddress(
  address: string,
  googleMapsApiKey: string,
  opts?: { components?: string; region?: string }
): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const params = new URLSearchParams({ address: encodedAddress, key: googleMapsApiKey });
    if (opts?.region) params.set('region', opts.region);
    if (opts?.components) params.set('components', opts.components);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;

    const response = await fetch(url);
    const data: GoogleMapsGeocodeResponse = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
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

      let coordinates = await geocodeAddress(addressToGeocode, googleMapsApiKey, { region: 'us' });
      
      if (!coordinates) {
        throw new Error(`Failed to geocode address: ${addressToGeocode}`);
      }

      // Validate against org depot and retry with state bias if it's an outlier
      const depot = await getOrgDepot(supabase, location.organization_id);
      if (haversineDistance(depot, coordinates) > 300) {
        const state = guessState(addressToGeocode) || 'MI';
        const strict = await geocodeAddress(addressToGeocode, googleMapsApiKey, { 
          region: 'us', 
          components: `administrative_area:${state}|country:US` 
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

      // Get org depot for outlier detection
      const orgId = allLocations[0]?.organization_id;
      const depot = orgId ? await getOrgDepot(supabase, orgId) : { lat: 42.3314, lng: -83.0458 };

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

        // Skip if has valid coordinates and not fixing outliers
        const hasCoords = location.latitude && location.longitude;
        const isOutlier = hasCoords && haversineDistance(depot, { lat: Number(location.latitude), lng: Number(location.longitude) }) > 300;
        
        if (hasCoords && !fixOutliers && !isOutlier) {
          console.log(`Skipping location ${location.id} - already has coordinates`);
          continue;
        }

        let coordinates = await geocodeAddress(location.address, googleMapsApiKey, { region: 'us' });
        
        if (!coordinates) {
          console.log(`Failed to geocode location ${location.id}: ${location.address}`);
          failed++;
          continue;
        }

        // Auto-detect and fix outliers with state bias
        if (haversineDistance(depot, coordinates) > 300) {
          const state = guessState(location.address) || 'MI';
          console.log(`Location ${location.id} is an outlier (${haversineDistance(depot, coordinates).toFixed(0)}km from depot), retrying with state: ${state}`);
          const strict = await geocodeAddress(location.address, googleMapsApiKey, { 
            region: 'us', 
            components: `administrative_area:${state}|country:US` 
          });
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