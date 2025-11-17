import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Assignment {
  id: string;
  pickup_id: string;
  vehicle_id: string;
  driver_id: string;
  pickup: {
    client: {
      company_name: string;
    };
    location: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
    };
    pte_count: number;
    otr_count: number;
    tractor_count: number;
    preferred_window: string;
  };
}

interface RouteData {
  vehicle_id: string;
  vehicle_name: string;
  stops: {
    client: string;
    location: string;
    address: string;
    coordinates: { lat: number; lng: number };
    items: { pte: number; otr: number; tractor: number };
    time_window: string;
  }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { date } = await req.json();
    
    console.log(`AI route optimization request for date: ${date}`);

    // Fetch assignments with full location data
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        id,
        pickup_id,
        vehicle_id,
        driver_id,
        pickup:pickups(
          client:clients(company_name),
          location:locations(name, address, latitude, longitude),
          pte_count,
          otr_count,
          tractor_count,
          preferred_window
        )
      `)
      .eq('scheduled_date', date);

    if (assignmentsError) throw assignmentsError;

    // Fetch vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, name, capacity')
      .eq('is_active', true);

    if (vehiclesError) throw vehiclesError;

    // Group by vehicle - LIMIT to prevent resource exhaustion
    const routesByVehicle: Record<string, RouteData> = {};
    const MAX_STOPS_PER_VEHICLE = 20;
    const MAX_TOTAL_STOPS = 50;
    let totalStops = 0;
    
    for (const assignment of (assignments as Assignment[])) {
      if (totalStops >= MAX_TOTAL_STOPS) break;
      
      const vehicleId = assignment.vehicle_id;
      
      if (!routesByVehicle[vehicleId]) {
        const vehicle = vehicles?.find(v => v.id === vehicleId);
        routesByVehicle[vehicleId] = {
          vehicle_id: vehicleId,
          vehicle_name: vehicle?.name || 'Unknown Vehicle',
          stops: []
        };
      }

      // Skip if vehicle already at capacity
      if (routesByVehicle[vehicleId].stops.length >= MAX_STOPS_PER_VEHICLE) continue;

      // Skip assignments with missing data
      if (!assignment.pickup?.client || !assignment.pickup?.location) {
        console.warn(`Skipping assignment ${assignment.id} - missing pickup data`);
        continue;
      }

      routesByVehicle[vehicleId].stops.push({
        client: assignment.pickup.client.company_name || 'Unknown Client',
        location: assignment.pickup.location.name || 'Unknown Location',
        address: assignment.pickup.location.address || '',
        coordinates: {
          lat: assignment.pickup.location.latitude || 0,
          lng: assignment.pickup.location.longitude || 0
        },
        items: {
          pte: assignment.pickup.pte_count || 0,
          otr: assignment.pickup.otr_count || 0,
          tractor: assignment.pickup.tractor_count || 0
        },
        time_window: assignment.pickup.preferred_window || ''
      });
      totalStops++;
    }

    // Build compact AI prompt
    const routeSummary = Object.values(routesByVehicle).map(route => ({
      vehicle: route.vehicle_name,
      stopCount: route.stops.length,
      stops: route.stops.map(s => ({
        name: s.client,
        coords: `${s.coordinates.lat.toFixed(4)},${s.coordinates.lng.toFixed(4)}`,
        window: s.time_window
      }))
    }));

    const prompt = `Analyze these ${date} delivery routes and suggest optimizations.

Routes: ${JSON.stringify(routeSummary, null, 2)}

Provide JSON with:
{
  "efficiency_score": number (0-100),
  "improvements": [{"title": string, "description": string, "impact": "high"|"medium"|"low", "estimated_savings": string}],
  "route_suggestions": [{"vehicle": string, "suggested_sequence": [client names], "reasoning": string}],
  "insights": string
}`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert logistics and route optimization specialist. Analyze geographic data and provide actionable insights to improve delivery efficiency.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let analysisText = aiData.choices[0].message.content;
    
    // Strip markdown code fences if present (```json ... ```)
    analysisText = analysisText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
      console.log('AI analysis parsed successfully');
    } catch (e) {
      console.error('Failed to parse AI response as JSON after cleanup:', analysisText.substring(0, 200));
      // Fallback: return as text
      analysis = {
        efficiency_score: 0,
        improvements: [],
        route_suggestions: [],
        insights: analysisText
      };
    }

    console.log('AI analysis completed successfully');

    return new Response(
      JSON.stringify({
        date,
        routes: Object.values(routesByVehicle),
        ai_analysis: analysis,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in AI route optimizer:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
