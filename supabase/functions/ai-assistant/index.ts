import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryResult {
  type: string;
  data: any;
  summary: string;
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query, userId, organizationId } = await req.json();
    const startTime = Date.now();

    console.log('Processing AI query:', query);

    // Get current date for AI context
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Use Lovable AI to interpret the query and extract parameters
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
            content: `You are a data analyst for a tire recycling business. Parse user queries and extract structured parameters.

IMPORTANT: Today's date is ${todayStr}. Tomorrow is ${tomorrowStr}.
            
Available query types:
- top_clients_revenue: Top clients by revenue (params: period, limit)
- pte_processed: Total PTEs processed (params: period)
- driver_performance: Driver on-time rates (params: threshold)
- recent_pickups: Recent pickup activity (params: days, limit)
- revenue_forecast: Revenue projections (params: period)
- manifest_status: Manifest completion status (params: status)
- client_risk: At-risk clients (params: risk_level)
- route_call_list: Recommend clients to call near scheduled route stops (params: date, driver_id, limit)

Time periods: today, this_week, last_week, this_month, last_month, this_year
Risk levels: high, medium, low

For route_call_list queries:
- "date" must be ISO format (YYYY-MM-DD)
- If user says "today", use ${todayStr}
- If user says "tomorrow", use ${tomorrowStr}
- If user says a day name like "Monday", calculate the next occurrence from ${todayStr}
- Examples: "who should I call near tomorrow's route" → date: "${tomorrowStr}"

Return ONLY valid JSON.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'parse_query',
            description: 'Extract structured parameters from natural language query',
            parameters: {
              type: 'object',
              properties: {
                query_type: {
                  type: 'string',
                  enum: ['top_clients_revenue', 'pte_processed', 'driver_performance', 'recent_pickups', 'revenue_forecast', 'manifest_status', 'client_risk', 'route_call_list']
                },
                parameters: {
                  type: 'object',
                  properties: {
                    period: { type: 'string' },
                    limit: { type: 'number' },
                    threshold: { type: 'number' },
                    days: { type: 'number' },
                    status: { type: 'string' },
                    risk_level: { type: 'string' },
                    date: { type: 'string' },
                    driver_id: { type: 'string' }
                  }
                }
              },
              required: ['query_type', 'parameters']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'parse_query' } }
      })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('Failed to parse query');
    }

    const parsedQuery = JSON.parse(toolCall.function.arguments);
    console.log('Parsed query:', parsedQuery);

    // Execute the appropriate database query based on query type
    let result: QueryResult;

    switch (parsedQuery.query_type) {
      case 'top_clients_revenue': {
        const limit = parsedQuery.parameters.limit || 10;
        const { data, error } = await supabase
          .from('clients')
          .select('id, company_name, lifetime_revenue')
          .eq('organization_id', organizationId)
          .order('lifetime_revenue', { ascending: false })
          .limit(limit);

        if (error) throw error;

        result = {
          type: 'top_clients_revenue',
          data,
          summary: `Top ${data.length} clients by lifetime revenue`
        };
        break;
      }

      case 'pte_processed': {
        const period = parsedQuery.parameters.period || 'this_week';
        let dateFilter = new Date();
        
        if (period === 'today') {
          dateFilter.setHours(0, 0, 0, 0);
        } else if (period === 'this_week') {
          dateFilter.setDate(dateFilter.getDate() - 7);
        } else if (period === 'this_month') {
          dateFilter.setDate(1);
        }

        const { data, error } = await supabase
          .from('manifests')
          .select('pte_on_rim, pte_off_rim')
          .eq('organization_id', organizationId)
          .eq('status', 'COMPLETED')
          .gte('created_at', dateFilter.toISOString());

        if (error) throw error;

        const totalPtes = data.reduce((sum, m) => sum + (m.pte_on_rim || 0) + (m.pte_off_rim || 0), 0);

        result = {
          type: 'pte_processed',
          data: { total: totalPtes, period },
          summary: `Processed ${totalPtes} PTEs ${period}`
        };
        break;
      }

      case 'driver_performance': {
        const threshold = parsedQuery.parameters.threshold || 90;
        
        // Get assignments with completion data
        const { data, error } = await supabase
          .from('assignments')
          .select(`
            driver_id,
            status,
            estimated_arrival,
            actual_arrival,
            users!assignments_driver_id_fkey(first_name, last_name)
          `)
          .eq('organization_id', organizationId)
          .not('driver_id', 'is', null);

        if (error) throw error;

        // Calculate on-time rates per driver
        const driverStats = data.reduce((acc: any, assignment: any) => {
          if (!assignment.driver_id) return acc;
          
          if (!acc[assignment.driver_id]) {
            acc[assignment.driver_id] = {
              name: assignment.users ? `${assignment.users.first_name} ${assignment.users.last_name}` : 'Unknown',
              total: 0,
              onTime: 0
            };
          }
          
          acc[assignment.driver_id].total++;
          
          if (assignment.actual_arrival && assignment.estimated_arrival) {
            const actual = new Date(assignment.actual_arrival);
            const estimated = new Date(assignment.estimated_arrival);
            if (actual <= estimated) {
              acc[assignment.driver_id].onTime++;
            }
          }
          
          return acc;
        }, {});

        const driversWithRates = Object.entries(driverStats)
          .map(([id, stats]: [string, any]) => ({
            driver_id: id,
            driver_name: stats.name,
            on_time_rate: stats.total > 0 ? (stats.onTime / stats.total) * 100 : 0,
            total_assignments: stats.total
          }))
          .filter(d => d.on_time_rate < threshold);

        result = {
          type: 'driver_performance',
          data: driversWithRates,
          summary: `${driversWithRates.length} driver(s) with on-time rate below ${threshold}%`
        };
        break;
      }

      case 'recent_pickups': {
        const days = parsedQuery.parameters.days || 7;
        const limit = parsedQuery.parameters.limit || 20;
        const dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - days);

        const { data, error } = await supabase
          .from('pickups')
          .select(`
            id,
            pickup_date,
            status,
            pte_count,
            otr_count,
            computed_revenue,
            clients(company_name)
          `)
          .eq('organization_id', organizationId)
          .gte('pickup_date', dateFilter.toISOString().split('T')[0])
          .order('pickup_date', { ascending: false })
          .limit(limit);

        if (error) throw error;

        result = {
          type: 'recent_pickups',
          data,
          summary: `${data.length} pickups in the last ${days} days`
        };
        break;
      }

      case 'revenue_forecast': {
        const { data, error } = await supabase
          .from('revenue_forecasts')
          .select('*')
          .eq('organization_id', organizationId)
          .order('forecast_date', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        result = {
          type: 'revenue_forecast',
          data: data || null,
          summary: data 
            ? `30-day forecast: $${data.forecast_30_day?.toFixed(2)}, 60-day: $${data.forecast_60_day?.toFixed(2)}, 90-day: $${data.forecast_90_day?.toFixed(2)}`
            : 'No forecast data available'
        };
        break;
      }

      case 'client_risk': {
        const riskLevel = parsedQuery.parameters.risk_level || 'high';
        
        const { data, error } = await supabase
          .from('client_risk_scores')
          .select(`
            *,
            clients(company_name, email, phone)
          `)
          .eq('organization_id', organizationId)
          .eq('risk_level', riskLevel)
          .order('risk_score', { ascending: false });

        if (error) throw error;

        result = {
          type: 'client_risk',
          data,
          summary: `${data.length} client(s) at ${riskLevel} risk of churn`
        };
        break;
      }

      case 'route_call_list': {
        const limit = parsedQuery.parameters.limit || 10;
        const targetDate = parsedQuery.parameters.date || new Date().toISOString().split('T')[0];
        const driverId = parsedQuery.parameters.driver_id;
        
        console.log('Route call list for date:', targetDate, 'driver:', driverId);

        // 1. Get all scheduled assignments for the target date
        let assignmentsQuery = supabase
          .from('assignments')
          .select(`
            id,
            pickup_id,
            driver_id,
            pickups!assignments_pickup_id_fkey(
              id,
              client_id,
              clients!pickups_client_id_fkey(
                id,
                company_name,
                depot_lat,
                depot_lng
              )
            )
          `)
          .eq('organization_id', organizationId)
          .eq('scheduled_date', targetDate);

        if (driverId) {
          assignmentsQuery = assignmentsQuery.eq('driver_id', driverId);
        }

        const { data: assignments, error: assignmentsError } = await assignmentsQuery;
        
        if (assignmentsError) throw assignmentsError;

        if (!assignments || assignments.length === 0) {
          result = {
            type: 'route_call_list',
            data: {
              route_date: targetDate,
              total_stops: 0,
              suggestions: []
            },
            summary: `No stops scheduled for ${targetDate}. Schedule some pickups first to get call list recommendations.`
          };
          break;
        }

        // 2. Extract route stop coordinates
        const routeStops: { lat: number; lng: number; clientId: string }[] = [];
        const scheduledClientIds = new Set<string>();
        
        for (const assignment of assignments) {
          const pickup = assignment.pickups as any;
          const client = pickup?.clients;
          if (client?.depot_lat && client?.depot_lng) {
            routeStops.push({
              lat: client.depot_lat,
              lng: client.depot_lng,
              clientId: client.id
            });
            scheduledClientIds.add(client.id);
          }
        }

        if (routeStops.length === 0) {
          result = {
            type: 'route_call_list',
            data: {
              route_date: targetDate,
              total_stops: assignments.length,
              suggestions: []
            },
            summary: `${assignments.length} stops scheduled but no geocoded locations available.`
          };
          break;
        }

        // 3. Get all active clients with locations
        const { data: allClients, error: clientsError } = await supabase
          .from('clients')
          .select('id, company_name, phone, email, depot_lat, depot_lng, last_pickup_at, lifetime_revenue, physical_address, physical_city, physical_state')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .not('depot_lat', 'is', null)
          .not('depot_lng', 'is', null);

        if (clientsError) throw clientsError;

        // 4. Filter clients not already scheduled and within radius of any route stop
        const maxDistance = 8; // miles
        const nearbyClients: any[] = [];

        for (const client of allClients || []) {
          if (scheduledClientIds.has(client.id)) continue;

          // Find minimum distance to any route stop
          let minDistance = Infinity;
          for (const stop of routeStops) {
            const dist = calculateDistance(
              stop.lat, stop.lng,
              client.depot_lat!, client.depot_lng!
            );
            if (dist < minDistance) minDistance = dist;
          }

          if (minDistance <= maxDistance) {
            const daysSincePickup = client.last_pickup_at 
              ? Math.floor((Date.now() - new Date(client.last_pickup_at).getTime()) / (1000 * 60 * 60 * 24))
              : 999;

            nearbyClients.push({
              ...client,
              nearest_stop_distance: Math.round(minDistance * 10) / 10,
              days_since_pickup: daysSincePickup
            });
          }
        }

        // 5. Score and sort candidates
        nearbyClients.sort((a, b) => {
          // Score based on: proximity (lower better), days since pickup (higher better)
          const scoreA = (a.nearest_stop_distance * 2) - (Math.min(a.days_since_pickup, 90) / 10);
          const scoreB = (b.nearest_stop_distance * 2) - (Math.min(b.days_since_pickup, 90) / 10);
          return scoreA - scoreB;
        });

        const topCandidates = nearbyClients.slice(0, Math.min(limit, 15));

        // 6. Use AI to prioritize and add reasoning
        let suggestions = [];
        
        if (topCandidates.length > 0) {
          const prioritizeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
                  content: `You are a route optimization assistant for a tire recycling business. 
                  Prioritize which clients to call based on proximity to an existing route and time since last pickup.
                  Return a brief reasoning for each suggestion (max 15 words).`
                },
                {
                  role: 'user',
                  content: `Prioritize these clients for a call list. Route has ${routeStops.length} stops on ${targetDate}.
                  
Candidates:
${topCandidates.map((c, i) => `${i + 1}. ${c.company_name} - ${c.nearest_stop_distance} miles from route, ${c.days_since_pickup} days since last pickup, $${c.lifetime_revenue || 0} lifetime revenue`).join('\n')}

Return JSON array with client priorities.`
                }
              ],
              tools: [{
                type: 'function',
                function: {
                  name: 'prioritize_clients',
                  description: 'Return prioritized client list with reasoning',
                  parameters: {
                    type: 'object',
                    properties: {
                      suggestions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            index: { type: 'number' },
                            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
                            reasoning: { type: 'string' }
                          },
                          required: ['index', 'priority', 'reasoning']
                        }
                      }
                    },
                    required: ['suggestions']
                  }
                }
              }],
              tool_choice: { type: 'function', function: { name: 'prioritize_clients' } }
            })
          });

          if (prioritizeResponse.ok) {
            const prioritizeData = await prioritizeResponse.json();
            const priorityCall = prioritizeData.choices[0].message.tool_calls?.[0];
            
            if (priorityCall) {
              const priorities = JSON.parse(priorityCall.function.arguments);
              
              suggestions = priorities.suggestions
                .slice(0, limit)
                .map((p: any) => {
                  const client = topCandidates[p.index - 1];
                  if (!client) return null;
                  return {
                    client_id: client.id,
                    company_name: client.company_name,
                    phone: client.phone,
                    email: client.email,
                    address: [client.physical_address, client.physical_city, client.physical_state].filter(Boolean).join(', '),
                    nearest_stop_distance: client.nearest_stop_distance,
                    last_pickup_at: client.last_pickup_at,
                    days_since_pickup: client.days_since_pickup,
                    priority: p.priority,
                    reasoning: p.reasoning
                  };
                })
                .filter(Boolean);
            }
          }
          
          // Fallback if AI prioritization fails
          if (suggestions.length === 0) {
            suggestions = topCandidates.slice(0, limit).map(client => ({
              client_id: client.id,
              company_name: client.company_name,
              phone: client.phone,
              email: client.email,
              address: [client.physical_address, client.physical_city, client.physical_state].filter(Boolean).join(', '),
              nearest_stop_distance: client.nearest_stop_distance,
              last_pickup_at: client.last_pickup_at,
              days_since_pickup: client.days_since_pickup,
              priority: client.days_since_pickup > 30 ? 'high' : client.days_since_pickup > 14 ? 'medium' : 'low',
              reasoning: `${client.nearest_stop_distance} mi from route, ${client.days_since_pickup} days since pickup`
            }));
          }
        }

        result = {
          type: 'route_call_list',
          data: {
            route_date: targetDate,
            total_stops: routeStops.length,
            suggestions
          },
          summary: suggestions.length > 0 
            ? `Found ${suggestions.length} clients to call near your ${routeStops.length}-stop route on ${targetDate}`
            : `No nearby clients found for the ${routeStops.length}-stop route on ${targetDate}`
        };
        break;
      }

      default:
        throw new Error('Unsupported query type');
    }

    // Log the query
    const executionTime = Date.now() - startTime;
    await supabase.from('ai_query_logs').insert({
      user_id: userId,
      organization_id: organizationId,
      query_text: query,
      response_summary: result.summary,
      query_type: parsedQuery.query_type,
      execution_time_ms: executionTime,
      success: true
    });

    console.log(`Query completed in ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        result
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI assistant error:', error);
    
    // Log failed query
    try {
      const { userId, organizationId, query } = await req.json().catch(() => ({}));
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      if (userId && organizationId) {
        await supabase.from('ai_query_logs').insert({
          user_id: userId,
          organization_id: organizationId,
          query_text: query,
          success: false,
          error_message: error.message
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
