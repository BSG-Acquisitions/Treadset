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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve caller's organization from the request's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerAuthUser } } = await callerClient.auth.getUser();
    if (!callerAuthUser) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { data: callerRow } = await supabase
      .from('users')
      .select('id, user_organization_roles(organization_id)')
      .eq('auth_user_id', callerAuthUser.id)
      .maybeSingle();
    const organizationId = (callerRow as any)?.user_organization_roles?.[0]?.organization_id as string | undefined;
    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Caller has no organization assigned' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔧 Starting geocoding fix for organization', organizationId);

    // Get all locations with bad coordinates (outside Detroit metro or missing coords)
    const { data: locations, error: fetchError } = await supabase
      .from('locations')
      .select('id, name, address, latitude, longitude, organization_id')
      .eq('organization_id', organizationId);

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
