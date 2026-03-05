import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReverseGeocodeResult {
  city: string | null;
  zip: string | null;
  state: string | null;
  county: string | null;
}

async function reverseGeocode(lat: number, lng: number, mapboxToken: string): Promise<ReverseGeocodeResult> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address,postcode,place,district`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      console.log(`No reverse geocode results for (${lat}, ${lng})`);
      return { city: null, zip: null, state: null, county: null };
    }
    
    let city: string | null = null;
    let zip: string | null = null;
    let state: string | null = null;
    let county: string | null = null;
    
    // Extract from context of the first feature
    const feature = data.features[0];
    const context = feature.context || [];
    
    for (const ctx of context) {
      const id = ctx.id || '';
      const text = ctx.text || '';
      
      if (id.startsWith('postcode.')) {
        zip = text;
      } else if (id.startsWith('place.')) {
        city = text;
      } else if (id.startsWith('region.')) {
        state = ctx.short_code?.replace('US-', '') || text;
      } else if (id.startsWith('district.')) {
        county = text.replace(' County', '');
      }
    }
    
    // If the main feature is a place, use it as city
    if (!city && feature.place_type?.includes('place')) {
      city = feature.text;
    }
    
    // If the main feature is a postcode, use it as zip
    if (!zip && feature.place_type?.includes('postcode')) {
      zip = feature.text;
    }
    
    console.log(`📍 Reverse geocoded (${lat}, ${lng}): city=${city}, zip=${zip}, state=${state}, county=${county}`);
    
    return { city, zip, state, county };
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return { city: null, zip: null, state: null, county: null };
  }
}

Deno.serve(async (req) => {
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

    const { clientId, forceUpdate = false, batchSize = 50 } = await req.json();
    console.log('Backfill request:', { clientId, forceUpdate, batchSize });

    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{ clientId: string; companyName: string; city: string | null; zip: string | null; status: string }>
    };

    if (clientId) {
      // Process a single client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, company_name, city, zip, state, physical_city, physical_zip, physical_state')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      // ALWAYS prefer user-entered city/zip over reverse-geocoded data
      if (client.city || client.zip) {
        const copyUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (client.city) copyUpdates.physical_city = client.city;
        if (client.zip) copyUpdates.physical_zip = client.zip;
        if (client.state) copyUpdates.physical_state = client.state;

        const { error: copyError } = await supabase
          .from('clients')
          .update(copyUpdates)
          .eq('id', clientId);

        if (!copyError) {
          console.log(`✅ Copied legacy city/zip for ${client.company_name}: ${client.city}, ${client.zip}`);
          return new Response(
            JSON.stringify({
              message: 'Client geographic data copied from existing fields',
              client: { id: client.id, company_name: client.company_name, city: client.city, zip: client.zip }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Get the client's primary location with coordinates
      const { data: location, error: locError } = await supabase
        .from('locations')
        .select('id, latitude, longitude, address')
        .eq('client_id', clientId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .limit(1)
        .single();

      if (locError || !location) {
        return new Response(
          JSON.stringify({
            message: 'No geocoded location found for this client',
            results: { processed: 1, updated: 0, skipped: 0, failed: 1 }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Skip if already has geography and not forcing
      if (!forceUpdate && client.physical_city && client.physical_zip) {
        return new Response(
          JSON.stringify({
            message: 'Client already has geographic data',
            client: { id: client.id, company_name: client.company_name, city: client.physical_city, zip: client.physical_zip }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reverse geocode
      const geo = await reverseGeocode(Number(location.latitude), Number(location.longitude), mapboxToken);

      if (geo.city || geo.zip) {
        const updates: Record<string, any> = { updated_at: new Date().toISOString() };
        if (geo.city) updates.physical_city = geo.city;
        if (geo.zip) updates.physical_zip = geo.zip;
        if (geo.state) updates.physical_state = geo.state;
        // Do NOT overwrite user-entered county field - only write to physical fields

        const { error: updateError } = await supabase
          .from('clients')
          .update(updates)
          .eq('id', clientId);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({
            message: 'Client geographic data updated',
            client: { id: client.id, company_name: client.company_name, ...geo }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          message: 'Could not determine city/ZIP from coordinates',
          results: { processed: 1, updated: 0, failed: 1 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Batch process all clients
      console.log('🔄 Starting batch backfill of client geography...');

      // Get all clients that need updating - include city/zip fields to use as fallback
      let query = supabase
        .from('clients')
        .select('id, company_name, city, zip, state, physical_city, physical_zip, physical_state')
        .eq('is_active', true);

      if (!forceUpdate) {
        // Only get clients missing physical_city OR physical_zip
        query = query.or('physical_city.is.null,physical_zip.is.null');
      }

      const { data: clients, error: clientsError } = await query.limit(batchSize);

      if (clientsError) throw clientsError;

      if (!clients || clients.length === 0) {
        return new Response(
          JSON.stringify({
            message: 'No clients need geographic data backfill',
            results
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`📊 Found ${clients.length} clients to process`);

      for (const client of clients) {
        results.processed++;

        // Skip if already has data and not forcing
        if (!forceUpdate && client.physical_city && client.physical_zip) {
          results.skipped++;
          continue;
        }

        // FIRST: Check if client already has city/zip in the legacy fields - copy them over
        if ((client.city || client.zip) && (!client.physical_city || !client.physical_zip)) {
          const updates: Record<string, any> = { updated_at: new Date().toISOString() };
          if (client.city && !client.physical_city) updates.physical_city = client.city;
          if (client.zip && !client.physical_zip) updates.physical_zip = client.zip;
          if (client.state && !client.physical_state) updates.physical_state = client.state;

          const { error: updateError } = await supabase
            .from('clients')
            .update(updates)
            .eq('id', client.id);

          if (!updateError) {
            console.log(`✅ Copied legacy city/zip for ${client.company_name}: ${client.city}, ${client.zip}`);
            results.updated++;
            results.details.push({
              clientId: client.id,
              companyName: client.company_name,
              city: client.city,
              zip: client.zip,
              status: 'copied_from_legacy'
            });
            continue;
          }
        }

        // SECOND: Try to get location with coordinates for reverse geocoding
        const { data: location, error: locError } = await supabase
          .from('locations')
          .select('id, latitude, longitude')
          .eq('client_id', client.id)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(1)
          .maybeSingle();

        if (locError || !location) {
          console.log(`⏭️ No geocoded location for client ${client.id} (${client.company_name})`);
          results.failed++;
          results.details.push({
            clientId: client.id,
            companyName: client.company_name,
            city: null,
            zip: null,
            status: 'no_location'
          });
          continue;
        }

        // Reverse geocode
        const geo = await reverseGeocode(Number(location.latitude), Number(location.longitude), mapboxToken);

        if (geo.city || geo.zip) {
          const updates: Record<string, any> = { updated_at: new Date().toISOString() };
          if (geo.city) updates.physical_city = geo.city;
          if (geo.zip) updates.physical_zip = geo.zip;
          if (geo.state) updates.physical_state = geo.state;
          // Do NOT overwrite user-entered county field

          const { error: updateError } = await supabase
            .from('clients')
            .update(updates)
            .eq('id', client.id);

          if (updateError) {
            console.log(`❌ Failed to update client ${client.id}: ${updateError.message}`);
            results.failed++;
            results.details.push({
              clientId: client.id,
              companyName: client.company_name,
              city: geo.city,
              zip: geo.zip,
              status: 'update_failed'
            });
            continue;
          }

          console.log(`✅ Updated ${client.company_name}: ${geo.city}, ${geo.zip}`);
          results.updated++;
          results.details.push({
            clientId: client.id,
            companyName: client.company_name,
            city: geo.city,
            zip: geo.zip,
            status: 'updated'
          });
        } else {
          console.log(`⚠️ No city/ZIP found for ${client.company_name}`);
          results.failed++;
          results.details.push({
            clientId: client.id,
            companyName: client.company_name,
            city: null,
            zip: null,
            status: 'no_geo_data'
          });
        }

        // Rate limit to avoid hitting Mapbox limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ Backfill complete: ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`);

      return new Response(
        JSON.stringify({
          message: `Geographic data backfill complete`,
          results
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in backfill-client-geography:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
