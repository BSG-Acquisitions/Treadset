import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StopLocation {
  client_id: string;
  company_name: string;
  latitude: number;
  longitude: number;
  address: string;
}

interface ClientWithLocation {
  id: string;
  company_name: string;
  last_pickup_at: string | null;
  physical_address: string | null;
  physical_city: string | null;
  physical_state: string | null;
  physical_zip: string | null;
  locations: Array<{
    id: string;
    latitude: number | null;
    longitude: number | null;
    address: string;
  }>;
}

interface RouteSuggestion {
  client_id: string;
  company_name: string;
  distance_from_route_miles: number;
  last_pickup_at: string | null;
  address: string;
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  days_since_pickup: number | null;
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

    const { scheduledStops, organizationId, routeDate } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing organization ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no stops provided, get today's assignments for the driver
    let stopLocations: StopLocation[] = [];
    
    if (scheduledStops && scheduledStops.length > 0) {
      stopLocations = scheduledStops;
    }

    if (stopLocations.length === 0) {
      return new Response(
        JSON.stringify({ 
          along_route: [],
          overdue: [],
          message: 'No scheduled stops provided to analyze'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active clients in the organization with locations
    const { data: allClients, error: clientsError } = await supabase
      .from('clients')
      .select(`
        id,
        company_name,
        last_pickup_at,
        physical_address,
        physical_city,
        physical_state,
        physical_zip,
        locations(id, latitude, longitude, address)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (clientsError) {
      throw clientsError;
    }

    // Exclude clients that are already on the route
    const scheduledClientIds = new Set(stopLocations.map(s => s.client_id));
    
    // Calculate which clients are nearby any stop on the route
    const nearbyClients: Array<ClientWithLocation & { 
      minDistanceFromRoute: number;
      nearestStopName: string;
    }> = [];

    for (const client of (allClients as ClientWithLocation[])) {
      // Skip if already scheduled
      if (scheduledClientIds.has(client.id)) continue;
      
      // Get client's location
      const clientLocation = client.locations?.[0];
      if (!clientLocation?.latitude || !clientLocation?.longitude) continue;

      // Find minimum distance to any stop on the route
      let minDistance = Infinity;
      let nearestStop = '';
      
      for (const stop of stopLocations) {
        const distance = calculateDistance(
          stop.latitude,
          stop.longitude,
          clientLocation.latitude,
          clientLocation.longitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestStop = stop.company_name;
        }
      }

      // Only include clients within 5 miles of any stop
      if (minDistance <= 5) {
        nearbyClients.push({
          ...client,
          minDistanceFromRoute: minDistance,
          nearestStopName: nearestStop,
        });
      }
    }

    if (nearbyClients.length === 0) {
      return new Response(
        JSON.stringify({ 
          along_route: [],
          overdue: [],
          message: 'No additional clients found within 5 miles of your route'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate days since last pickup for prioritization
    const now = new Date();
    const clientsWithMetrics = nearbyClients.map(client => {
      const lastPickup = client.last_pickup_at ? new Date(client.last_pickup_at) : null;
      const daysSincePickup = lastPickup 
        ? Math.floor((now.getTime() - lastPickup.getTime()) / (1000 * 60 * 60 * 24))
        : null;
      
      return {
        ...client,
        daysSincePickup,
      };
    });

    // Use AI to analyze and prioritize suggestions
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      // Fall back to simple distance + recency based suggestions
      const suggestions = prioritizeWithoutAI(clientsWithMetrics);
      return new Response(
        JSON.stringify({ 
          along_route: suggestions.alongRoute,
          overdue: suggestions.overdue,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an intelligent routing assistant for a tire recycling company. Analyze nearby clients and suggest which ones the driver should add to their route based on:
1. Minimal detour distance (closer to existing route is better)
2. Time since last pickup (longer = higher priority, especially 30+ days)
3. Potential pickup value
4. Clustering opportunities (multiple nearby clients)

Return prioritized suggestions grouped into:
- along_route: Clients that are very close to the existing route (<2 miles detour)
- overdue: Clients who haven't been serviced in 30+ days, regardless of distance`;

    const userPrompt = `Driver has ${stopLocations.length} stops scheduled today:
${stopLocations.map((s, i) => `${i + 1}. ${s.company_name}`).join('\n')}

Here are potential additional stops near the route:
${clientsWithMetrics.slice(0, 15).map(c => `
- ${c.company_name} (${c.minDistanceFromRoute.toFixed(1)} mi from ${c.nearestStopName})
  Location: ${c.locations?.[0]?.address || buildAddress(c)}
  Last pickup: ${c.daysSincePickup !== null ? `${c.daysSincePickup} days ago` : 'Never'}
`).join('\n')}

Suggest the best 5-8 clients to add, with reasoning for each.`;

    try {
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          tools: [{
            type: 'function',
            function: {
              name: 'suggest_route_additions',
              description: 'Return prioritized route addition suggestions',
              parameters: {
                type: 'object',
                properties: {
                  along_route: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        client_id: { type: 'string' },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                        reasoning: { type: 'string' }
                      },
                      required: ['client_id', 'priority', 'reasoning']
                    }
                  },
                  overdue: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        client_id: { type: 'string' },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                        reasoning: { type: 'string' }
                      },
                      required: ['client_id', 'priority', 'reasoning']
                    }
                  }
                },
                required: ['along_route', 'overdue']
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'suggest_route_additions' } }
        }),
      });

      if (!aiResponse.ok) {
        console.error('AI API error:', aiResponse.status);
        const suggestions = prioritizeWithoutAI(clientsWithMetrics);
        return new Response(
          JSON.stringify({ 
            along_route: suggestions.alongRoute,
            overdue: suggestions.overdue,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall) {
        const suggestions = prioritizeWithoutAI(clientsWithMetrics);
        return new Response(
          JSON.stringify({ 
            along_route: suggestions.alongRoute,
            overdue: suggestions.overdue,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const aiSuggestions = JSON.parse(toolCall.function.arguments);

      // Enrich AI suggestions with full client data
      const enrichSuggestions = (suggestions: any[], clients: typeof clientsWithMetrics): RouteSuggestion[] => {
        return suggestions
          .map((suggestion: any) => {
            const client = clients.find(c => c.id === suggestion.client_id);
            if (!client) return null;
            return {
              client_id: client.id,
              company_name: client.company_name,
              distance_from_route_miles: client.minDistanceFromRoute,
              last_pickup_at: client.last_pickup_at,
              address: client.locations?.[0]?.address || buildAddress(client),
              priority: suggestion.priority,
              reasoning: suggestion.reasoning,
              days_since_pickup: client.daysSincePickup,
            };
          })
          .filter(Boolean) as RouteSuggestion[];
      };

      return new Response(
        JSON.stringify({ 
          along_route: enrichSuggestions(aiSuggestions.along_route || [], clientsWithMetrics),
          overdue: enrichSuggestions(aiSuggestions.overdue || [], clientsWithMetrics),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (aiError) {
      console.error('AI processing error:', aiError);
      const suggestions = prioritizeWithoutAI(clientsWithMetrics);
      return new Response(
        JSON.stringify({ 
          along_route: suggestions.alongRoute,
          overdue: suggestions.overdue,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in driver-route-suggestions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Fallback prioritization without AI
function prioritizeWithoutAI(clients: Array<ClientWithLocation & { 
  minDistanceFromRoute: number; 
  nearestStopName: string;
  daysSincePickup: number | null;
}>): { alongRoute: RouteSuggestion[]; overdue: RouteSuggestion[] } {
  // Along route: within 2 miles, sorted by distance
  const alongRoute = clients
    .filter(c => c.minDistanceFromRoute <= 2)
    .sort((a, b) => a.minDistanceFromRoute - b.minDistanceFromRoute)
    .slice(0, 5)
    .map(c => ({
      client_id: c.id,
      company_name: c.company_name,
      distance_from_route_miles: c.minDistanceFromRoute,
      last_pickup_at: c.last_pickup_at,
      address: c.locations?.[0]?.address || buildAddress(c),
      priority: c.minDistanceFromRoute <= 1 ? 'high' as const : 'medium' as const,
      reasoning: `Only ${c.minDistanceFromRoute.toFixed(1)} miles from ${c.nearestStopName}`,
      days_since_pickup: c.daysSincePickup,
    }));

  // Overdue: 30+ days since last pickup
  const overdue = clients
    .filter(c => c.daysSincePickup !== null && c.daysSincePickup >= 30)
    .sort((a, b) => (b.daysSincePickup || 0) - (a.daysSincePickup || 0))
    .slice(0, 5)
    .map(c => ({
      client_id: c.id,
      company_name: c.company_name,
      distance_from_route_miles: c.minDistanceFromRoute,
      last_pickup_at: c.last_pickup_at,
      address: c.locations?.[0]?.address || buildAddress(c),
      priority: (c.daysSincePickup || 0) >= 60 ? 'high' as const : 'medium' as const,
      reasoning: `${c.daysSincePickup} days since last pickup`,
      days_since_pickup: c.daysSincePickup,
    }));

  return { alongRoute, overdue };
}

function buildAddress(client: ClientWithLocation): string {
  const parts = [
    client.physical_address,
    client.physical_city,
    client.physical_state,
    client.physical_zip,
  ].filter(Boolean);
  return parts.join(', ') || 'Address not available';
}

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
