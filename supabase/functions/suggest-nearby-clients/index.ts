import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClientWithLocation {
  id: string;
  company_name: string;
  last_pickup_at: string | null;
  locations: Array<{
    id: string;
    latitude: number | null;
    longitude: number | null;
    address: string;
  }>;
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

    const { scheduledClientId, organizationId } = await req.json();

    if (!scheduledClientId || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the scheduled client with their primary location
    const { data: scheduledClient, error: clientError } = await supabase
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
      .eq('id', scheduledClientId)
      .single();

    if (clientError || !scheduledClient) {
      console.error('Client lookup error:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found', details: clientError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get location coordinates from locations table or fallback
    let scheduledLat: number | null = null;
    let scheduledLng: number | null = null;
    let scheduledAddress = '';

    // Check if client has locations with coordinates
    const primaryLocation = scheduledClient.locations?.[0];
    if (primaryLocation?.latitude && primaryLocation?.longitude) {
      scheduledLat = primaryLocation.latitude;
      scheduledLng = primaryLocation.longitude;
      scheduledAddress = primaryLocation.address;
    }

    // If no location data, build address from physical fields and return message
    if (!scheduledLat || !scheduledLng) {
      const address = scheduledClient.physical_address;
      const city = scheduledClient.physical_city;
      const state = scheduledClient.physical_state;
      const zip = scheduledClient.physical_zip;
      
      if (address && city && state) {
        scheduledAddress = `${address}, ${city}, ${state} ${zip || ''}`.trim();
      }
      
      return new Response(
        JSON.stringify({ 
          suggestions: [], 
          message: `${scheduledClient.company_name} does not have geocoded location coordinates. Please use the "Fix Geocoding" feature on the Data Quality page to add coordinates before getting nearby suggestions.`,
          client_name: scheduledClient.company_name
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all other active clients in the organization with locations
    const { data: allClients, error: allClientsError } = await supabase
      .from('clients')
      .select(`
        id,
        company_name,
        last_pickup_at,
        locations(id, latitude, longitude, address)
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .neq('id', scheduledClientId);

    if (allClientsError) {
      throw allClientsError;
    }

    // Calculate distances and filter nearby clients (within 5 miles)
    const nearbyClients = (allClients as ClientWithLocation[])
      .filter(client => client.locations?.[0]?.latitude && client.locations?.[0]?.longitude)
      .map(client => {
        const location = client.locations[0];
        const distance = calculateDistance(
          scheduledLat!,
          scheduledLng!,
          location.latitude!,
          location.longitude!
        );
        return { 
          ...client, 
          distance,
          location: location // Flatten for easier access
        };
      })
      .filter(client => client.distance <= 5)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10); // Top 10 nearest

    if (nearbyClients.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [], message: 'No nearby clients found within 5 miles' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Lovable AI to analyze and prioritize suggestions
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are an intelligent routing assistant for a tire recycling company. Analyze nearby clients and suggest which ones should be called for pickup scheduling based on:
1. Geographic proximity (closer is better)
2. Time since last pickup (longer = higher priority)
3. Pickup patterns (if they typically get pickups regularly)

Return 3-5 prioritized suggestions with brief reasoning.`;

    const userPrompt = `The receptionist just scheduled a pickup for "${scheduledClient.company_name}" at ${scheduledAddress}.

Here are nearby clients within 5 miles:
${nearbyClients.map(c => `
- ${c.company_name} (${c.distance.toFixed(1)} miles away)
  Location: ${c.location?.address || 'Address not available'}
  Last pickup: ${c.last_pickup_at ? new Date(c.last_pickup_at).toLocaleDateString() : 'Never'}
`).join('\n')}

Which 3-5 clients should we prioritize calling to schedule in the same area? Provide brief reasoning for each.`;

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
            name: 'suggest_clients',
            description: 'Return prioritized client suggestions for scheduling',
            parameters: {
              type: 'object',
              properties: {
                suggestions: {
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
              required: ['suggestions']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_clients' } }
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', aiResponse.status, await aiResponse.text());
      // Fall back to simple distance-based suggestions
      const fallbackSuggestions = nearbyClients.slice(0, 5).map(client => ({
        client_id: client.id,
        company_name: client.company_name,
        distance: client.distance,
        last_pickup_at: client.last_pickup_at,
        address: client.location?.address || 'Address not available',
        priority: 'medium' as const,
        reasoning: `Located ${client.distance.toFixed(1)} miles from scheduled client`
      }));

      return new Response(
        JSON.stringify({ suggestions: fallbackSuggestions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const aiSuggestions = JSON.parse(toolCall.function.arguments).suggestions;

    // Enrich AI suggestions with client data
    const enrichedSuggestions = aiSuggestions
      .map((suggestion: any) => {
        const client = nearbyClients.find(c => c.id === suggestion.client_id);
        if (!client) return null;
        return {
          client_id: client.id,
          company_name: client.company_name,
          distance: client.distance,
          last_pickup_at: client.last_pickup_at,
          address: client.location?.address || 'Address not available',
          priority: suggestion.priority,
          reasoning: suggestion.reasoning
        };
      })
      .filter(Boolean);

    return new Response(
      JSON.stringify({ suggestions: enrichedSuggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-nearby-clients:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
