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

    // Truck capacity: 1000 PTEs (2 trips x 500 PTEs per trip)
    const truckCapacity = 1000;

    // Get historical PICKUP data ONLY from last 90 days to analyze day-of-week patterns
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

    // Get completed manifests (actual pickups with tire counts)
    const { data: historicalManifests } = await supabase
      .from('manifests')
      .select('created_at, pte_on_rim, pte_off_rim, otr_count, tractor_count, pickup:pickups!inner(pickup_date)')
      .eq('organization_id', organization_id)
      .gte('created_at', ninetyDaysAgoStr)
      .eq('status', 'COMPLETED');

    // Group by day of week (0=Sun, 1=Mon, ..., 6=Sat)
    const dayOfWeekVolumes: Record<number, number[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };
    
    (historicalManifests || []).forEach((manifest: any) => {
      const date = new Date(manifest.created_at);
      const dayOfWeek = date.getDay();
      const volume = (manifest.pte_on_rim || 0) + (manifest.pte_off_rim || 0) + 
                     (manifest.otr_count || 0) + (manifest.tractor_count || 0);
      dayOfWeekVolumes[dayOfWeek].push(volume);
    });

    // Calculate average volume per day of week
    const avgByDayOfWeek: Record<number, number> = {};
    Object.entries(dayOfWeekVolumes).forEach(([day, volumes]) => {
      const dayNum = parseInt(day);
      avgByDayOfWeek[dayNum] = volumes.length > 0
        ? volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
        : 400; // Default fallback
    });

    console.log(`Day-of-week averages:`, avgByDayOfWeek);

    // Get scheduled PICKUPS for next 7 days
    const today = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    const { data: scheduledPickups } = await supabase
      .from('pickups')
      .select('pickup_date, pte_count, otr_count, tractor_count, client_id')
      .eq('organization_id', organization_id)
      .gte('pickup_date', todayStr)
      .lte('pickup_date', sevenDaysStr)
      .in('status', ['scheduled', 'assigned']);

    // Calculate predictions for next 7 days
    const forecasts = [];
    
    for (let i = 0; i < 7; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(today.getDate() + i);
      const dateStr = forecastDate.toISOString().split('T')[0];
      const dayOfWeek = forecastDate.getDay();

      // Sum scheduled pickups for this date
      const scheduledForDate = (scheduledPickups || [])
        .filter((p: any) => p.pickup_date === dateStr)
        .reduce((sum, p: any) => sum + (p.pte_count || 0) + (p.otr_count || 0) + (p.tractor_count || 0), 0);

      // If pickups scheduled, use that. Otherwise use day-of-week average
      const predictedVolume = scheduledForDate > 0 
        ? scheduledForDate 
        : Math.round(avgByDayOfWeek[dayOfWeek] || 400);

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
          truckCapacity,
          dayOfWeekAverages: avgByDayOfWeek,
          historicalManifests: (historicalManifests || []).length,
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
