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
            
Available query types:
- top_clients_revenue: Top clients by revenue (params: period, limit)
- pte_processed: Total PTEs processed (params: period)
- driver_performance: Driver on-time rates (params: threshold)
- recent_pickups: Recent pickup activity (params: days, limit)
- revenue_forecast: Revenue projections (params: period)
- manifest_status: Manifest completion status (params: status)
- client_risk: At-risk clients (params: risk_level)

Time periods: today, this_week, last_week, this_month, last_month, this_year
Risk levels: high, medium, low

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
                  enum: ['top_clients_revenue', 'pte_processed', 'driver_performance', 'recent_pickups', 'revenue_forecast', 'manifest_status', 'client_risk']
                },
                parameters: {
                  type: 'object',
                  properties: {
                    period: { type: 'string' },
                    limit: { type: 'number' },
                    threshold: { type: 'number' },
                    days: { type: 'number' },
                    status: { type: 'string' },
                    risk_level: { type: 'string' }
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
          .from('revenue_forecasts_beta')
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
          .from('client_risk_scores_beta')
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

      default:
        throw new Error('Unsupported query type');
    }

    // Log the query
    const executionTime = Date.now() - startTime;
    await supabase.from('ai_query_logs_beta').insert({
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
        await supabase.from('ai_query_logs_beta').insert({
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
