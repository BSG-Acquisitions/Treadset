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

    // Get organization settings for truck capacity
    const { data: orgSettings } = await supabase
      .from('organization_settings')
      .select('avg_truck_capacity_ptes')
      .eq('organization_id', organization_id)
      .single();

    const truckCapacity = orgSettings?.avg_truck_capacity_ptes || 100;

    // Get historical pickups from last 30 days to establish baseline
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: historicalPickups } = await supabase
      .from('pickups')
      .select('scheduled_date, pte_count, otr_count, tractor_count')
      .eq('organization_id', organization_id)
      .gte('scheduled_date', thirtyDaysAgo.toISOString().split('T')[0])
      .eq('status', 'completed') as { data: PickupData[] | null };

    // Calculate average daily volume from historical data
    const dailyVolumes: Record<string, number> = {};
    (historicalPickups || []).forEach((pickup) => {
      const date = pickup.scheduled_date;
      const volume = (pickup.pte_count || 0) + (pickup.otr_count || 0) * 1.5 + (pickup.tractor_count || 0) * 2;
      dailyVolumes[date] = (dailyVolumes[date] || 0) + volume;
    });

    const avgDailyVolume = Object.values(dailyVolumes).length > 0
      ? Object.values(dailyVolumes).reduce((sum, vol) => sum + vol, 0) / Object.values(dailyVolumes).length
      : 50; // Default fallback

    // Get scheduled pickups for next 7 days
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);

    const { data: scheduledPickups } = await supabase
      .from('pickups')
      .select('scheduled_date, pte_count, otr_count, tractor_count')
      .eq('organization_id', organization_id)
      .gte('scheduled_date', today.toISOString().split('T')[0])
      .lte('scheduled_date', sevenDaysFromNow.toISOString().split('T')[0])
      .in('status', ['scheduled', 'assigned']) as { data: PickupData[] | null };

    // Calculate predictions for next 7 days
    const forecasts = [];
    
    for (let i = 0; i < 7; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(today.getDate() + i);
      const dateStr = forecastDate.toISOString().split('T')[0];

      // Sum scheduled pickups for this date
      const scheduledForDate = (scheduledPickups || [])
        .filter(p => p.scheduled_date === dateStr)
        .reduce((sum, p) => {
          const volume = (p.pte_count || 0) + (p.otr_count || 0) * 1.5 + (p.tractor_count || 0) * 2;
          return sum + volume;
        }, 0);

      // If no scheduled pickups, use historical average with slight variation
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
      .from('capacity_preview_beta')
      .delete()
      .eq('organization_id', organization_id)
      .gte('forecast_date', today.toISOString().split('T')[0])
      .lte('forecast_date', sevenDaysFromNow.toISOString().split('T')[0]);

    // Insert new forecasts
    const { error: insertError } = await supabase
      .from('capacity_preview_beta')
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
