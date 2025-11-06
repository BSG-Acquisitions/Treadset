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

    // Group by vehicle
    const routesByVehicle: Record<string, RouteData> = {};
    
    for (const assignment of (assignments as Assignment[])) {
      const vehicleId = assignment.vehicle_id;
      
      if (!routesByVehicle[vehicleId]) {
        const vehicle = vehicles?.find(v => v.id === vehicleId);
        routesByVehicle[vehicleId] = {
          vehicle_id: vehicleId,
          vehicle_name: vehicle?.name || 'Unknown Vehicle',
          stops: []
        };
      }

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
    }

    // Build AI prompt with geographic context
    const prompt = `You are an expert logistics optimizer. Analyze these delivery routes for ${date} and provide actionable optimization suggestions.

ROUTE DATA:
${Object.values(routesByVehicle).map(route => `
Vehicle: ${route.vehicle_name}
Stops (${route.stops.length}):
${route.stops.map((stop, idx) => `
  ${idx + 1}. ${stop.client} - ${stop.location}
     Address: ${stop.address}
     Coordinates: ${stop.coordinates.lat}, ${stop.coordinates.lng}
     Items: ${stop.items.pte} PTEs, ${stop.items.otr} OTRs, ${stop.items.tractor} Tractors
     Time Window: ${stop.time_window}
`).join('')}
`).join('\n---\n')}

OPTIMIZATION FACTORS TO CONSIDER:
- Geographic clustering (stops close together should be grouped)
- Time windows (AM pickups vs PM pickups)
- Load balancing across vehicles
- Minimize total travel distance
- Reduce backtracking and inefficient routing
- Consider Detroit metro area traffic patterns

PROVIDE:
1. Overall route efficiency score (0-100)
2. Top 3 specific improvements with impact estimates
3. Suggested stop reordering for each vehicle
4. Load balancing recommendations
5. Any geographic patterns or clusters identified

Format your response as JSON with this structure:
{
  "efficiency_score": number,
  "improvements": [
    {
      "title": string,
      "description": string,
      "impact": "high" | "medium" | "low",
      "estimated_savings": string (e.g., "15 minutes", "8 miles")
    }
  ],
  "route_suggestions": [
    {
      "vehicle": string,
      "suggested_sequence": [stop names in optimal order],
      "reasoning": string
    }
  ],
  "insights": string (overall analysis)
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
    const analysisText = aiData.choices[0].message.content;
    
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', analysisText);
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
