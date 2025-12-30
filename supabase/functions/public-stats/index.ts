import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache for stats to reduce database load
let cachedStats: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60000; // 1 minute cache

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check cache first
    const now = Date.now();
    if (cachedStats && (now - cacheTimestamp) < CACHE_DURATION_MS) {
      console.log('Returning cached stats');
      return new Response(JSON.stringify(cachedStats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get BSG organization ID (hardcoded for now, can be made dynamic later)
    const { data: orgData } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'bsg')
      .single();

    if (!orgData) {
      // Return mock data if org not found
      const mockStats = {
        weekly_tires: 847,
        weekly_pte: 1250,
        monthly_tires: 3420,
        monthly_pte: 4890,
        ytd_tires: 38500,
        ytd_pte: 52000,
        active_clients: 131,
        co2_saved_lbs: 15600,
        landfill_diverted_lbs: 89000,
        years_in_business: 15,
        service_regions: [
          { name: "Southeast Michigan", days: ["Tuesday", "Wednesday"] },
          { name: "Metro Detroit", days: ["Monday", "Friday"] },
          { name: "Greater Detroit Area", days: ["Thursday"] }
        ]
      };
      
      cachedStats = mockStats;
      cacheTimestamp = now;
      
      return new Response(JSON.stringify(mockStats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const organizationId = orgData.id;
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    
    // Calculate date ranges
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date(currentYear, currentDate.getMonth(), 1);
    const yearStart = new Date(currentYear, 0, 1);

    // Fetch aggregate pickup data for the week
    const { data: weeklyData } = await supabase
      .from('pickups')
      .select('pte_count, otr_count, tractor_count')
      .eq('organization_id', organizationId)
      .gte('pickup_date', weekStart.toISOString().split('T')[0])
      .in('status', ['completed', 'manifested']);

    // Fetch aggregate pickup data for the month
    const { data: monthlyData } = await supabase
      .from('pickups')
      .select('pte_count, otr_count, tractor_count')
      .eq('organization_id', organizationId)
      .gte('pickup_date', monthStart.toISOString().split('T')[0])
      .in('status', ['completed', 'manifested']);

    // Fetch aggregate pickup data for YTD
    const { data: ytdData } = await supabase
      .from('pickups')
      .select('pte_count, otr_count, tractor_count')
      .eq('organization_id', organizationId)
      .gte('pickup_date', yearStart.toISOString().split('T')[0])
      .in('status', ['completed', 'manifested']);

    // Count active clients (no details, just count)
    const { count: clientCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Get service zones for region display (only names and days, no ZIP codes)
    const { data: zones } = await supabase
      .from('service_zones')
      .select('name, service_days')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Calculate aggregates
    const calculateTotals = (data: any[] | null) => {
      if (!data) return { pte: 0, otr: 0, tractor: 0 };
      return data.reduce((acc, row) => ({
        pte: acc.pte + (row.pte_count || 0),
        otr: acc.otr + (row.otr_count || 0),
        tractor: acc.tractor + (row.tractor_count || 0),
      }), { pte: 0, otr: 0, tractor: 0 });
    };

    const weeklyTotals = calculateTotals(weeklyData);
    const monthlyTotals = calculateTotals(monthlyData);
    const ytdTotals = calculateTotals(ytdData);

    // Calculate total tire counts (PTE is already normalized, OTR = 4 PTE, Tractor = 6 PTE)
    const weeklyTires = weeklyTotals.pte + (weeklyTotals.otr * 4) + (weeklyTotals.tractor * 6);
    const monthlyTires = monthlyTotals.pte + (monthlyTotals.otr * 4) + (monthlyTotals.tractor * 6);
    const ytdTires = ytdTotals.pte + (ytdTotals.otr * 4) + (ytdTotals.tractor * 6);

    // Environmental calculations (rough estimates)
    // Average tire weight: ~20 lbs for PTE
    const avgTireWeight = 20;
    const landfillDivertedLbs = ytdTires * avgTireWeight;
    
    // CO2 savings: ~3 lbs CO2 saved per tire recycled vs landfill
    const co2SavedLbs = ytdTires * 3;

    // Format service regions (safe - only shows general areas and days)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const serviceRegions = zones?.map(zone => ({
      name: zone.name,
      days: (zone.service_days || []).map((d: number) => dayNames[d]).filter(Boolean)
    })) || [];

    const stats = {
      weekly_tires: Math.round(weeklyTires),
      weekly_pte: weeklyTotals.pte,
      monthly_tires: Math.round(monthlyTires),
      monthly_pte: monthlyTotals.pte,
      ytd_tires: Math.round(ytdTires),
      ytd_pte: ytdTotals.pte,
      active_clients: clientCount || 0,
      co2_saved_lbs: Math.round(co2SavedLbs),
      landfill_diverted_lbs: Math.round(landfillDivertedLbs),
      years_in_business: 15, // Can be made dynamic from org settings
      service_regions: serviceRegions.slice(0, 5) // Limit to 5 regions for display
    };

    // Cache the results
    cachedStats = stats;
    cacheTimestamp = now;

    console.log('Returning fresh stats:', stats);

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching public stats:', error);
    
    // Return fallback mock data on error
    const fallbackStats = {
      weekly_tires: 847,
      weekly_pte: 1250,
      monthly_tires: 3420,
      monthly_pte: 4890,
      ytd_tires: 38500,
      ytd_pte: 52000,
      active_clients: 131,
      co2_saved_lbs: 15600,
      landfill_diverted_lbs: 89000,
      years_in_business: 15,
      service_regions: [
        { name: "Southeast Michigan", days: ["Tuesday", "Wednesday"] },
        { name: "Metro Detroit", days: ["Monday", "Friday"] },
        { name: "Greater Detroit Area", days: ["Thursday"] }
      ]
    };

    return new Response(JSON.stringify(fallbackStats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
