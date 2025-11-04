import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricPayload {
  organizationId: string;
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  metadata?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { organizationId, metricName, metricValue, metricUnit = 'ms', metadata = {} } = await req.json() as MetricPayload;

    console.log(`[PERFORMANCE] Recording metric: ${metricName} = ${metricValue}${metricUnit} for org ${organizationId}`);

    // Record the metric
    const { data: metric, error: insertError } = await supabaseClient
      .from('performance_metrics')
      .insert({
        organization_id: organizationId,
        metric_name: metricName,
        metric_value: metricValue,
        metric_unit: metricUnit,
        metadata,
        captured_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[PERFORMANCE] Error inserting metric:', insertError);
      throw insertError;
    }

    // Check thresholds and create alerts if needed
    await supabaseClient.rpc('check_performance_thresholds');

    // Update system health metrics
    await supabaseClient.rpc('update_system_health_metrics');

    console.log(`[PERFORMANCE] Metric recorded successfully: ${metric.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        metric,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[PERFORMANCE] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
