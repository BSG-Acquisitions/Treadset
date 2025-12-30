import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache for stats to reduce database load
let cachedStats: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 30000; // 30 second cache for fresher data

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();
    const cacheHit = cachedStats && (now - cacheTimestamp) < CACHE_DURATION_MS;
    
    // Check cache first
    if (cacheHit) {
      console.log('Returning cached stats');
      return new Response(JSON.stringify({
        ...cachedStats,
        cache_hit: true,
        generated_at: new Date(cacheTimestamp).toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get BSG organization ID
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'bsg')
      .single();

    if (orgError || !orgData) {
      console.error('Organization not found:', orgError);
      return new Response(JSON.stringify({
        error: 'Organization not found',
        data_unavailable: true,
        monthly_tires: 0,
        weekly_tires: 0,
        ytd_tires: 0,
        active_clients: 0,
        generated_at: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 so UI can handle gracefully
      });
    }

    const organizationId = orgData.id;
    console.log('Fetching stats for org:', organizationId);

    // Use RPCs for accurate data aggregation
    // get_ytd_pte_totals properly aggregates manifests + dropoffs for the full year
    const [monthlyResult, weeklyResult, todayResult, ytdResult] = await Promise.all([
      supabase.rpc('get_monthly_pte_totals', { org_id: organizationId }),
      supabase.rpc('get_weekly_pte_totals', { org_id: organizationId }),
      supabase.rpc('get_today_pte_totals', { org_id: organizationId }),
      supabase.rpc('get_ytd_pte_totals', { org_id: organizationId }),
    ]);

    console.log('Monthly RPC result:', monthlyResult);
    console.log('Weekly RPC result:', weeklyResult);
    console.log('Today RPC result:', todayResult);
    console.log('YTD RPC result:', ytdResult);

    // Extract totals from RPC results (returns { pickup_ptes, dropoff_ptes, total_ptes })
    const monthlyData = monthlyResult.data?.[0] || { pickup_ptes: 0, dropoff_ptes: 0, total_ptes: 0 };
    const weeklyData = weeklyResult.data?.[0] || { pickup_ptes: 0, dropoff_ptes: 0, total_ptes: 0 };
    const todayData = todayResult.data?.[0] || { pickup_ptes: 0, dropoff_ptes: 0, total_ptes: 0 };
    const ytdData = ytdResult.data?.[0] || { pickup_ptes: 0, dropoff_ptes: 0, total_ptes: 0 };

    // The RPC returns PTEs - these ARE the tire counts (1 PTE = 1 tire equivalent)
    const monthlyTires = Number(monthlyData.total_ptes) || 0;
    const weeklyTires = Number(weeklyData.total_ptes) || 0;
    const todayTires = Number(todayData.total_ptes) || 0;
    const ytdTires = Number(ytdData.total_ptes) || 0;

    console.log('Calculated totals - YTD:', ytdTires, 'Monthly:', monthlyTires, 'Weekly:', weeklyTires, 'Today:', todayTires);

    // Count active clients
    const { count: clientCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Get service zones for region display
    const { data: zones } = await supabase
      .from('service_zones')
      .select('name, service_days')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Format service regions
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const serviceRegions = zones?.map(zone => ({
      name: zone.name,
      days: (zone.service_days || []).map((d: number) => dayNames[d]).filter(Boolean)
    })) || [];

    // Environmental calculations based on YTD tires (not monthly)
    // Average tire weight: ~20 lbs for PTE
    const avgTireWeight = 20;
    const landfillDivertedLbs = ytdTires * avgTireWeight;
    const landfillDivertedTons = landfillDivertedLbs / 2000;
    
    // CO2 savings: ~3 lbs CO2 saved per tire recycled vs landfill
    const co2SavedLbs = ytdTires * 3;
    const co2SavedTons = co2SavedLbs / 2000;

    const stats = {
      // Primary stat for hero counter
      monthly_tires: monthlyTires,
      weekly_tires: weeklyTires,
      today_tires: todayTires,
      ytd_tires: ytdTires,
      
      // Legacy fields for compatibility
      monthly_pte: monthlyTires,
      weekly_pte: weeklyTires,
      ytd_pte: ytdTires,
      
      // Other stats
      active_clients: clientCount || 0,
      co2_saved_lbs: Math.round(co2SavedLbs),
      co2_saved_tons: Math.round(co2SavedTons),
      landfill_diverted_lbs: Math.round(landfillDivertedLbs),
      landfill_diverted_tons: Math.round(landfillDivertedTons),
      years_in_business: 15,
      service_regions: serviceRegions.slice(0, 5),
      
      // Metadata for transparency
      source: 'rpc:get_ytd_pte_totals',
      generated_at: new Date().toISOString(),
      cache_hit: false,
    };

    // Cache the results
    cachedStats = stats;
    cacheTimestamp = now;

    console.log('Returning fresh stats:', JSON.stringify(stats, null, 2));

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching public stats:', error);
    
    // Return error response with zeros - NO fake data
    return new Response(JSON.stringify({
      error: 'Failed to fetch stats',
      data_unavailable: true,
      monthly_tires: 0,
      weekly_tires: 0,
      today_tires: 0,
      ytd_tires: 0,
      active_clients: 0,
      co2_saved_lbs: 0,
      landfill_diverted_lbs: 0,
      years_in_business: 15,
      service_regions: [],
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 so UI can handle gracefully
    });
  }
});
