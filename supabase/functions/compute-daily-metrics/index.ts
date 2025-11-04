import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { date } = await req.json();
    const targetDate = date || new Date().toISOString().split('T')[0];

    console.log(`Computing daily metrics for ${targetDate}...`);

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabaseClient
      .from('organizations')
      .select('id');

    if (orgsError) throw orgsError;

    const results = [];

    // Compute metrics for each org
    for (const org of orgs) {
      const { data, error } = await supabaseClient.rpc('compute_daily_metrics', {
        p_org_id: org.id,
        p_date: targetDate,
      });

      if (error) {
        console.error(`Failed for org ${org.id}:`, error);
        results.push({ org_id: org.id, success: false, error: error.message });
      } else {
        console.log(`Computed metrics for org ${org.id}`);
        results.push({ org_id: org.id, success: true, metrics_id: data });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        organizations_processed: orgs.length,
        successful: successCount,
        failed: orgs.length - successCount,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Daily metrics computation failed:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
