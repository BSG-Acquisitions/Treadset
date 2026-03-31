import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { assignment_id } = await req.json();

    if (!assignment_id) {
      return new Response(
        JSON.stringify({ error: "assignment_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: pings, error } = await supabase
      .from("route_location_pings")
      .select("latitude, longitude, event_type, recorded_at")
      .eq("assignment_id", assignment_id)
      .order("recorded_at", { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pings || pings.length === 0) {
      return new Response(
        JSON.stringify({
          total_distance_miles: 0,
          total_duration_minutes: 0,
          stops_completed: 0,
          average_time_per_stop_minutes: 0,
          efficiency_score: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Total distance (Haversine sum between sequential pings)
    let totalDistanceKm = 0;
    for (let i = 0; i < pings.length - 1; i++) {
      totalDistanceKm += haversineDistance(
        pings[i].latitude,
        pings[i].longitude,
        pings[i + 1].latitude,
        pings[i + 1].longitude
      );
    }
    const totalDistanceMiles = totalDistanceKm * 0.621371;

    // Duration
    const firstTime = new Date(pings[0].recorded_at).getTime();
    const lastTime = new Date(pings[pings.length - 1].recorded_at).getTime();
    const totalDurationMinutes = (lastTime - firstTime) / 60000;

    // Stops completed
    const stopsCompleted = pings.filter(
      (p: any) => p.event_type === "stop_completed"
    ).length;

    // Avg time per stop
    const averageTimePerStopMinutes =
      stopsCompleted > 0 ? totalDurationMinutes / stopsCompleted : 0;

    // Efficiency score
    const rawScore =
      totalDurationMinutes > 0
        ? (stopsCompleted / totalDurationMinutes) * 100
        : 0;
    const efficiencyScore = Math.min(100, Math.round(rawScore * 10) / 10);

    return new Response(
      JSON.stringify({
        total_distance_miles: Math.round(totalDistanceMiles * 100) / 100,
        total_duration_minutes: Math.round(totalDurationMinutes * 100) / 100,
        stops_completed: stopsCompleted,
        average_time_per_stop_minutes:
          Math.round(averageTimePerStopMinutes * 100) / 100,
        efficiency_score: efficiencyScore,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
