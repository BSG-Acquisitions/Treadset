import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate performance for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log(`Calculating driver performance from ${startDate.toISOString()} to ${endDate.toISOString()}`);

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id');

    if (orgsError) throw orgsError;

    const performanceRecords = [];

    for (const org of orgs || []) {
      console.log(`Processing organization: ${org.id}`);

      // Get all drivers for this organization
      const { data: drivers, error: driversError } = await supabase
        .from('user_organization_roles')
        .select('user_id, users!inner(id, first_name, last_name)')
        .eq('organization_id', org.id)
        .eq('role', 'driver');

      if (driversError) {
        console.error('Drivers query error:', driversError);
        continue;
      }

      for (const driverRole of drivers || []) {
        const driverId = driverRole.user_id;
        console.log(`Calculating metrics for driver: ${driverId}`);

        // Get all assignments for this driver in the period
        const { data: assignments, error: assignmentsError } = await supabase
          .from('assignments')
          .select(`
            id,
            status,
            scheduled_date,
            estimated_arrival,
            actual_arrival,
            pickup:pickups!inner(
              id,
              pte_count,
              otr_count,
              tractor_count,
              location:locations(latitude, longitude)
            )
          `)
          .eq('driver_id', driverId)
          .eq('organization_id', org.id)
          .gte('scheduled_date', startDate.toISOString().split('T')[0])
          .lte('scheduled_date', endDate.toISOString().split('T')[0]);

        if (assignmentsError) {
          console.error('Assignments query error:', assignmentsError);
          continue;
        }

        const totalAssignments = assignments?.length || 0;
        if (totalAssignments === 0) {
          console.log(`No assignments for driver ${driverId}, skipping`);
          continue;
        }

        // Calculate metrics
        const completedAssignments = assignments.filter(a => a.status === 'completed');
        const onTimeArrivals = completedAssignments.filter(a => {
          if (!a.estimated_arrival || !a.actual_arrival) return false;
          const estimated = new Date(a.estimated_arrival);
          const actual = new Date(a.actual_arrival);
          const diffMinutes = (actual.getTime() - estimated.getTime()) / (1000 * 60);
          return diffMinutes <= 15; // Within 15 minutes is considered on-time
        });

        // Calculate avg stops per day
        const uniqueDays = new Set(assignments.map(a => a.scheduled_date)).size;
        const avgStopsPerDay = uniqueDays > 0 ? totalAssignments / uniqueDays : 0;

        // Calculate on-time rate
        const onTimeRate = completedAssignments.length > 0 
          ? (onTimeArrivals.length / completedAssignments.length) * 100 
          : 0;

        // Calculate avg pickup duration
        const durationsMinutes = completedAssignments
          .filter(a => a.estimated_arrival && a.actual_arrival)
          .map(a => {
            const arrival = new Date(a.actual_arrival!);
            const estimated = new Date(a.estimated_arrival!);
            return Math.abs((arrival.getTime() - estimated.getTime()) / (1000 * 60));
          });
        const avgPickupDuration = durationsMinutes.length > 0
          ? durationsMinutes.reduce((sum, d) => sum + d, 0) / durationsMinutes.length
          : 0;

        // Calculate avg mileage per stop (simplified - using straight-line distance)
        let totalMiles = 0;
        for (let i = 1; i < completedAssignments.length; i++) {
          const prev = completedAssignments[i - 1].pickup?.location;
          const curr = completedAssignments[i].pickup?.location;
          
          if (prev?.latitude && prev?.longitude && curr?.latitude && curr?.longitude) {
            const miles = calculateDistance(
              prev.latitude,
              prev.longitude,
              curr.latitude,
              curr.longitude
            );
            totalMiles += miles;
          }
        }
        const avgMileagePerStop = completedAssignments.length > 0 
          ? totalMiles / completedAssignments.length 
          : 0;

        // Build daily trend data (last 30 days)
        const dailyStops: Record<string, number> = {};
        const dailyOnTime: Record<string, { total: number; onTime: number }> = {};

        for (const assignment of assignments) {
          const date = assignment.scheduled_date;
          dailyStops[date] = (dailyStops[date] || 0) + 1;
          
          if (assignment.status === 'completed') {
            if (!dailyOnTime[date]) {
              dailyOnTime[date] = { total: 0, onTime: 0 };
            }
            dailyOnTime[date].total += 1;
            
            if (assignment.estimated_arrival && assignment.actual_arrival) {
              const estimated = new Date(assignment.estimated_arrival);
              const actual = new Date(assignment.actual_arrival);
              const diffMinutes = (actual.getTime() - estimated.getTime()) / (1000 * 60);
              if (diffMinutes <= 15) {
                dailyOnTime[date].onTime += 1;
              }
            }
          }
        }

        // Convert to trend arrays (last 30 days)
        const dailyStopsTrend = [];
        const onTimeTrend = [];
        for (let i = 0; i < 30; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          
          dailyStopsTrend.push({
            date: dateStr,
            value: dailyStops[dateStr] || 0
          });
          
          const dayData = dailyOnTime[dateStr];
          onTimeTrend.push({
            date: dateStr,
            value: dayData ? (dayData.onTime / dayData.total) * 100 : 0
          });
        }

        // Insert or update performance record
        const { data: existing } = await supabase
          .from('driver_performance')
          .select('id')
          .eq('driver_id', driverId)
          .eq('organization_id', org.id)
          .eq('calculation_period_end', endDate.toISOString().split('T')[0])
          .single();

        const performanceData = {
          driver_id: driverId,
          organization_id: org.id,
          avg_stops_per_day: Math.round(avgStopsPerDay * 100) / 100,
          on_time_rate: Math.round(onTimeRate * 100) / 100,
          avg_pickup_duration_minutes: Math.round(avgPickupDuration),
          avg_mileage_per_stop: Math.round(avgMileagePerStop * 100) / 100,
          total_assignments: totalAssignments,
          completed_assignments: completedAssignments.length,
          on_time_arrivals: onTimeArrivals.length,
          total_miles_driven: Math.round(totalMiles * 100) / 100,
          daily_stops_trend: dailyStopsTrend,
          on_time_trend: onTimeTrend,
          calculation_period_start: startDate.toISOString().split('T')[0],
          calculation_period_end: endDate.toISOString().split('T')[0],
          last_calculated_at: new Date().toISOString(),
        };

        if (existing) {
          await supabase
            .from('driver_performance')
            .update(performanceData)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('driver_performance')
            .insert(performanceData);
        }

        performanceRecords.push(performanceData);
        console.log(`Completed metrics for driver ${driverId}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        recordsProcessed: performanceRecords.length,
        summary: {
          organizations: orgs?.length || 0,
          drivers: performanceRecords.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating driver performance:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Haversine formula to calculate distance between two lat/lng points in miles
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}