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

async function geocodeAddress(address: string, googleMapsApiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${googleMapsApiKey}`;
    
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

    const { locationId, address, forceUpdate = false } = await req.json();
    console.log('Geocoding request:', { locationId, address, forceUpdate });

    if (locationId) {
      // Geocode a specific location
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id, name, address, latitude, longitude')
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

      const coordinates = await geocodeAddress(addressToGeocode, googleMapsApiKey);
      
      if (!coordinates) {
        throw new Error(`Failed to geocode address: ${addressToGeocode}`);
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
      // Geocode all locations without coordinates
      const { data: locations, error: locationsError } = await supabase
        .from('locations')
        .select('id, name, address, latitude, longitude')
        .is('latitude', null)
        .is('longitude', null)
        .limit(20); // Process in batches to avoid rate limits

      if (locationsError) throw locationsError;

      if (!locations || locations.length === 0) {
        return new Response(
          JSON.stringify({ 
            message: 'No locations need geocoding',
            processed: 0 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const results = [];
      let successful = 0;
      let failed = 0;

      for (const location of locations) {
        if (!location.address) {
          console.log(`Skipping location ${location.id} - no address`);
          failed++;
          continue;
        }

        const coordinates = await geocodeAddress(location.address, googleMapsApiKey);
        
        if (coordinates) {
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
        } else {
          console.log(`Failed to geocode location ${location.id}: ${location.address}`);
          failed++;
        }

        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return new Response(
        JSON.stringify({
          message: `Geocoding completed: ${successful} successful, ${failed} failed`,
          processed: successful + failed,
          successful,
          failed,
          locations: results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});