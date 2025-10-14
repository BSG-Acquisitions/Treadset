import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔧 Starting geocoding fix for all locations...');

    // Get all locations with bad coordinates (outside Detroit metro or missing coords)
    const { data: locations, error: fetchError } = await supabase
      .from('locations')
      .select('id, name, address, latitude, longitude, organization_id')
      .eq('organization_id', 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73'); // BSG org

    if (fetchError) throw fetchError;

    console.log(`📊 Found ${locations.length} locations to check`);

    const DETROIT_BOUNDS = {
      minLat: 42.1,
      maxLat: 42.8,
      minLng: -83.6,
      maxLng: -82.4
    };

    const needsFixing = locations.filter(loc => {
      if (!loc.latitude || !loc.longitude) return true; // Missing coords
      
      const lat = Number(loc.latitude);
      const lng = Number(loc.longitude);
      
      // Outside Detroit metro area
      const isOutside = lat < DETROIT_BOUNDS.minLat || 
                       lat > DETROIT_BOUNDS.maxLat ||
                       lng < DETROIT_BOUNDS.minLng ||
                       lng > DETROIT_BOUNDS.maxLng;
      
      if (isOutside) {
        console.log(`❌ Bad coords for ${loc.name}: (${lat}, ${lng})`);
      }
      
      return isOutside;
    });

    console.log(`🔨 Need to fix ${needsFixing.length} locations`);

    let fixed = 0;
    let failed = 0;

    for (const location of needsFixing) {
      try {
        console.log(`🔄 Re-geocoding: ${location.name}`);
        
        const { data, error } = await supabase.functions.invoke('geocode-locations', {
          body: { locationId: location.id, forceUpdate: true }
        });

        if (error) {
          console.error(`Failed to geocode ${location.name}:`, error);
          failed++;
        } else {
          console.log(`✅ Fixed ${location.name}: (${data.location.latitude}, ${data.location.longitude})`);
          fixed++;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (err) {
        console.error(`Error processing ${location.name}:`, err);
        failed++;
      }
    }

    console.log(`✨ Geocoding fix complete: ${fixed} fixed, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Geocoding fix complete: ${fixed} locations fixed, ${failed} failed`,
        total: locations.length,
        needsFixing: needsFixing.length,
        fixed,
        failed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Fix geocoding error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
