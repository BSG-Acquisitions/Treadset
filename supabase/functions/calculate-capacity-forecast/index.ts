import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PickupData {
  scheduled_date: string;
  pte_count: number;
  otr_count: number;
  tractor_count: number;
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

    const { organization_id } = await req.json();

    if (!organization_id) {
      throw new Error('organization_id is required');
    }

    console.log(`Calculating capacity forecast for organization: ${organization_id}`);

    // Get organization settings for truck capacity (26-foot box truck = 500 PTEs)
    const { data: orgSettings } = await supabase
      .from('organization_settings')
      .select('avg_truck_capacity_ptes')
      .eq('organization_id', organization_id)
      .single();

    const truckCapacity = orgSettings?.avg_truck_capacity_ptes || 500;

    // Get historical data from ALL sources from last 30 days to establish baseline
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    // 1. Get completed pickups
    const { data: historicalPickups } = await supabase
      .from('pickups')
      .select('pickup_date, pte_count, otr_count, tractor_count')
      .eq('organization_id', organization_id)
      .gte('pickup_date', thirtyDaysAgoStr)
      .eq('status', 'completed');

    // 2. Get completed manifests (linked to pickups)
    const { data: historicalManifests } = await supabase
      .from('manifests')
      .select('created_at, pte_on_rim, pte_off_rim, otr_count, tractor_count')
      .eq('organization_id', organization_id)
      .gte('created_at', thirtyDaysAgoStr)
      .eq('status', 'COMPLETED');

    // 3. Get dropoffs (facility intake)
    const { data: historicalDropoffs } = await supabase
      .from('dropoffs')
      .select('dropoff_date, pte_count, otr_count, tractor_count')
      .eq('organization_id', organization_id)
      .gte('dropoff_date', thirtyDaysAgoStr)
      .in('status', ['completed', 'processed']);

    // Calculate average daily volume from ALL sources
    const dailyVolumes: Record<string, number> = {};
    
    // Add pickups
    (historicalPickups || []).forEach((pickup: any) => {
      const date = pickup.pickup_date;
      const volume = (pickup.pte_count || 0) + (pickup.otr_count || 0) + (pickup.tractor_count || 0);
      dailyVolumes[date] = (dailyVolumes[date] || 0) + volume;
    });

    // Add manifests
    (historicalManifests || []).forEach((manifest: any) => {
      const date = manifest.created_at.split('T')[0];
      const volume = (manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0) + 
                     (manifest.otr_count || 0) + (manifest.tractor_count || 0);
      dailyVolumes[date] = (dailyVolumes[date] || 0) + volume;
    });

    // Add dropoffs
    (historicalDropoffs || []).forEach((dropoff: any) => {
      const date = dropoff.dropoff_date;
      const volume = (dropoff.pte_count || 0) + (dropoff.otr_count || 0) + (dropoff.tractor_count || 0);
      dailyVolumes[date] = (dailyVolumes[date] || 0) + volume;
    });

    const avgDailyVolume = Object.values(dailyVolumes).length > 0
      ? Object.values(dailyVolumes).reduce((sum, vol) => sum + vol, 0) / Object.values(dailyVolumes).length
      : 300; // Default fallback based on typical daily intake

    console.log(`Historical analysis: ${Object.keys(dailyVolumes).length} days, avg ${Math.round(avgDailyVolume)} PTEs/day`);

    // Get scheduled/planned intake for next 7 days from ALL sources
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    // 1. Scheduled pickups
    const { data: scheduledPickups } = await supabase
      .from('pickups')
      .select('pickup_date, pte_count, otr_count, tractor_count')
      .eq('organization_id', organization_id)
      .gte('pickup_date', todayStr)
      .lte('pickup_date', sevenDaysStr)
      .in('status', ['scheduled', 'assigned']);

    // 2. Scheduled dropoffs
    const { data: scheduledDropoffs } = await supabase
      .from('dropoffs')
      .select('dropoff_date, pte_count, otr_count, tractor_count')
      .eq('organization_id', organization_id)
      .gte('dropoff_date', todayStr)
      .lte('dropoff_date', sevenDaysStr)
      .in('status', ['scheduled', 'pending']);

    // Calculate predictions for next 7 days
    const forecasts = [];
    
    for (let i = 0; i < 7; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(today.getDate() + i);
      const dateStr = forecastDate.toISOString().split('T')[0];

      // Sum scheduled intake from all sources for this date
      let scheduledForDate = 0;

      // Add scheduled pickups
      scheduledForDate += (scheduledPickups || [])
        .filter((p: any) => p.pickup_date === dateStr)
        .reduce((sum, p: any) => sum + (p.pte_count || 0) + (p.otr_count || 0) + (p.tractor_count || 0), 0);

      // Add scheduled dropoffs
      scheduledForDate += (scheduledDropoffs || [])
        .filter((d: any) => d.dropoff_date === dateStr)
        .reduce((sum, d: any) => sum + (d.pte_count || 0) + (d.otr_count || 0) + (d.tractor_count || 0), 0);

      // If no scheduled intake, use historical average with slight variation
      const predictedVolume = scheduledForDate > 0 
        ? scheduledForDate 
        : Math.round(avgDailyVolume * (0.9 + Math.random() * 0.2)); // ±10% variation

      const capacityPercentage = (predictedVolume / truckCapacity) * 100;
      
      let capacityStatus = 'normal';
      if (capacityPercentage > 95) {
        capacityStatus = 'critical';
      } else if (capacityPercentage > 80) {
        capacityStatus = 'warning';
      }

      forecasts.push({
        organization_id,
        forecast_date: dateStr,
        predicted_tire_volume: Math.round(predictedVolume),
        predicted_truck_capacity: truckCapacity,
        capacity_percentage: Math.round(capacityPercentage * 10) / 10, // Round to 1 decimal
        capacity_status: capacityStatus,
      });
    }

    // Delete existing forecasts for this organization in the date range
    await supabase
      .from('capacity_preview')
      .delete()
      .eq('organization_id', organization_id)
      .gte('forecast_date', today.toISOString().split('T')[0])
      .lte('forecast_date', sevenDaysFromNow.toISOString().split('T')[0]);

    // Insert new forecasts
    const { error: insertError } = await supabase
      .from('capacity_preview')
      .insert(forecasts);

    if (insertError) {
      console.error('Error inserting forecasts:', insertError);
      throw insertError;
    }

    console.log(`Generated ${forecasts.length} capacity forecasts`);

    return new Response(
      JSON.stringify({
        success: true,
        forecasts,
        summary: {
          avgDailyVolume: Math.round(avgDailyVolume),
          truckCapacity,
          daysAnalyzed: Object.keys(dailyVolumes).length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error calculating capacity forecast:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
