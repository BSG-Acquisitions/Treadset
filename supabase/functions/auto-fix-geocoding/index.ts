import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Michigan ZIP code centers for validation
const MI_ZIP_CENTERS: Record<string, { lat: number; lng: number; city: string }> = {
  // Detroit Metro
  '48134': { lat: 42.0973, lng: -83.2918, city: 'Flat Rock' },
  '48093': { lat: 42.4987, lng: -82.9892, city: 'Warren' },
  '48215': { lat: 42.4006, lng: -82.9591, city: 'Detroit' },
  '48150': { lat: 42.4178, lng: -83.3617, city: 'Livonia' },
  '48127': { lat: 42.3222, lng: -83.2594, city: 'Dearborn Heights' },
  '48180': { lat: 42.2317, lng: -83.2728, city: 'Taylor' },
  // Lansing Area
  '48842': { lat: 42.6475, lng: -84.5167, city: 'Holt' },
  '48906': { lat: 42.7558, lng: -84.5553, city: 'Lansing' },
  '48910': { lat: 42.7003, lng: -84.5514, city: 'Lansing' },
  '48911': { lat: 42.6728, lng: -84.5872, city: 'Lansing' },
  '48912': { lat: 42.7336, lng: -84.5167, city: 'Lansing' },
  '48933': { lat: 42.7336, lng: -84.5553, city: 'Lansing' },
  '48915': { lat: 42.7475, lng: -84.5803, city: 'Lansing' },
  '48917': { lat: 42.7253, lng: -84.6336, city: 'Lansing' },
  '48864': { lat: 42.7003, lng: -84.4697, city: 'Okemos' },
  '48823': { lat: 42.7253, lng: -84.4697, city: 'East Lansing' },
  '48824': { lat: 42.7336, lng: -84.4836, city: 'East Lansing' },
  // Ann Arbor Area
  '48103': { lat: 42.2808, lng: -83.7631, city: 'Ann Arbor' },
  '48104': { lat: 42.2731, lng: -83.7303, city: 'Ann Arbor' },
  '48105': { lat: 42.3042, lng: -83.7053, city: 'Ann Arbor' },
  '48108': { lat: 42.2369, lng: -83.7233, city: 'Ann Arbor' },
  '48109': { lat: 42.2808, lng: -83.7386, city: 'Ann Arbor' },
};

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

function extractZipCode(address: string): string | null {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
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

    console.log('🔧 Starting automated geocoding health check...');

    // Get all locations with coordinates
    const { data: locations, error: fetchError } = await supabase
      .from('locations')
      .select('id, name, address, latitude, longitude, organization_id, client_id');

    if (fetchError) throw fetchError;

    console.log(`📊 Checking ${locations?.length || 0} locations`);

    const MAX_DISTANCE_FROM_ZIP_KM = 25; // ~15 miles tolerance
    const issuesFound: Array<{ id: string; name: string; issue: string }> = [];
    let regeocoded = 0;
    let failed = 0;

    for (const loc of locations || []) {
      if (!loc.address) continue;

      const zip = extractZipCode(loc.address);
      if (!zip || !MI_ZIP_CENTERS[zip]) continue;

      const expected = MI_ZIP_CENTERS[zip];
      
      // Check if location has coordinates
      if (!loc.latitude || !loc.longitude) {
        // Location needs geocoding - trigger it
        console.log(`🔄 Missing coords for ${loc.name}, triggering geocode...`);
        try {
          const { error: geocodeError } = await supabase.functions.invoke('geocode-locations', {
            body: { locationId: loc.id, forceUpdate: true }
          });
          if (geocodeError) {
            console.error(`Failed to geocode ${loc.name}:`, geocodeError);
            failed++;
            issuesFound.push({ id: loc.id, name: loc.name, issue: 'Failed to geocode' });
          } else {
            regeocoded++;
          }
        } catch (err) {
          console.error(`Error geocoding ${loc.name}:`, err);
          failed++;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
        continue;
      }

      // Validate existing coordinates against ZIP center
      const distanceKm = haversineDistance(
        { lat: loc.latitude, lng: loc.longitude },
        { lat: expected.lat, lng: expected.lng }
      );

      if (distanceKm > MAX_DISTANCE_FROM_ZIP_KM) {
        console.log(`❌ ${loc.name}: ${distanceKm.toFixed(1)}km from ${expected.city} (ZIP ${zip}) - re-geocoding...`);
        
        try {
          const { error: geocodeError } = await supabase.functions.invoke('geocode-locations', {
            body: { locationId: loc.id, forceUpdate: true }
          });
          if (geocodeError) {
            console.error(`Failed to re-geocode ${loc.name}:`, geocodeError);
            failed++;
            issuesFound.push({ id: loc.id, name: loc.name, issue: `${distanceKm.toFixed(1)}km from expected location` });
          } else {
            regeocoded++;
            console.log(`✅ Re-geocoded ${loc.name}`);
          }
        } catch (err) {
          console.error(`Error re-geocoding ${loc.name}:`, err);
          failed++;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      }
    }

    // Find clients with addresses but no location records
    // Skip drop-off-only clients (they don't need geocoding for route planning)
    const { data: clientsWithoutLocations, error: clientsError } = await supabase
      .from('clients')
      .select('id, company_name, mailing_address, city, state, zip, organization_id')
      .not('mailing_address', 'is', null);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    } else {
      // Check which clients have location records
      const { data: existingLocations } = await supabase
        .from('locations')
        .select('client_id');

      const clientsWithLocations = new Set((existingLocations || []).map(l => l.client_id));

      // Get pickup counts per client to identify drop-off-only clients
      const { data: pickupCounts } = await supabase
        .from('pickups')
        .select('client_id')
        .eq('status', 'completed');

      const clientsWithPickups = new Set((pickupCounts || []).map(p => p.client_id));

      for (const client of clientsWithoutLocations || []) {
        if (clientsWithLocations.has(client.id)) continue;
        if (!client.mailing_address) continue;

        // Skip drop-off-only clients - they don't need geocoding
        if (!clientsWithPickups.has(client.id)) {
          console.log(`⏭️ Skipping ${client.company_name} - drop-off only client (no pickup history)`);
          continue;
        }

        // Create location record
        const fullAddress = [
          client.mailing_address,
          client.city,
          client.state,
          client.zip
        ].filter(Boolean).join(', ');

        console.log(`📍 Creating location for ${client.company_name}...`);
        
        const { data: newLoc, error: createError } = await supabase
          .from('locations')
          .insert({
            client_id: client.id,
            organization_id: client.organization_id,
            name: client.company_name,
            address: fullAddress
          })
          .select('id')
          .single();

        if (createError) {
          console.error(`Failed to create location for ${client.company_name}:`, createError);
          failed++;
        } else if (newLoc) {
          // Trigger geocoding
          try {
            await supabase.functions.invoke('geocode-locations', {
              body: { locationId: newLoc.id, forceUpdate: true }
            });
            regeocoded++;
          } catch (err) {
            console.error(`Error geocoding new location:`, err);
            failed++;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // Only create notification if there are issues that couldn't be auto-fixed
    if (issuesFound.length > 0) {
      // Get first organization for notification
      const orgId = locations?.[0]?.organization_id;
      if (orgId) {
        await supabase.from('notifications').insert({
          organization_id: orgId,
          type: 'data_quality',
          title: 'Geocoding Issues Detected',
          message: `${issuesFound.length} location(s) have coordinate accuracy issues that couldn't be automatically resolved.`,
          metadata: { issues: issuesFound.slice(0, 10) },
          priority: 'medium'
        });
      }
    }

    console.log(`✨ Geocoding health check complete: ${regeocoded} fixed, ${failed} failed, ${issuesFound.length} issues`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Geocoding health check complete`,
        regeocoded,
        failed,
        issuesFound: issuesFound.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Auto-fix geocoding error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
