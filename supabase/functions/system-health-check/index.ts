import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheck {
  organization_id: string;
  check_type: string;
  status: 'healthy' | 'warning' | 'critical';
  component: string;
  details: Record<string, any>;
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

    console.log('Starting system health check...');

    // Get all organizations
    const { data: orgs } = await supabase.from('organizations').select('id');
    const healthChecks: HealthCheck[] = [];

    for (const org of orgs || []) {
      const orgId = org.id;

      // Check 1: Verify data bindings - AI Assistant
      const { data: recentQueries, error: queryError } = await supabase
        .from('ai_query_logs')
        .select('id, success')
        .eq('organization_id', orgId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10);

      if (queryError) {
        healthChecks.push({
          organization_id: orgId,
          check_type: 'data_binding',
          status: 'critical',
          component: 'ai_assistant',
          details: { error: queryError.message, table: 'ai_query_logs' }
        });
      } else if (recentQueries && recentQueries.length === 0) {
        healthChecks.push({
          organization_id: orgId,
          check_type: 'data_binding',
          status: 'warning',
          component: 'ai_assistant',
          details: { message: 'No recent queries in last 7 days', table: 'ai_query_logs' }
        });
      }

      // Check 2: Verify intelligence modules have data
      const modules = [
        { name: 'driver_performance', table: 'driver_performance' },
        { name: 'capacity_forecast', table: 'capacity_preview' },
        { name: 'revenue_forecast', table: 'revenue_forecasts' },
        { name: 'client_risk', table: 'client_risk_scores' },
        { name: 'hauler_reliability', table: 'hauler_reliability' }
      ];

      for (const module of modules) {
        const { data, error } = await supabase
          .from(module.table)
          .select('id')
          .eq('organization_id', orgId)
          .limit(1);

        if (error) {
          healthChecks.push({
            organization_id: orgId,
            check_type: 'data_binding',
            status: 'critical',
            component: module.name,
            details: { error: error.message, table: module.table }
          });
        } else if (!data || data.length === 0) {
          healthChecks.push({
            organization_id: orgId,
            check_type: 'empty_result_set',
            status: 'warning',
            component: module.name,
            details: { 
              message: 'No data found - may need initial calculation',
              table: module.table,
              recommendation: `Run calculate-${module.name.replace('_', '-')} edge function`
            }
          });
        }
      }

      // Check 3: Verify core data tables have recent activity
      const { data: recentPickups } = await supabase
        .from('pickups')
        .select('id')
        .eq('organization_id', orgId)
        .gte('pickup_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (!recentPickups || recentPickups.length === 0) {
        healthChecks.push({
          organization_id: orgId,
          check_type: 'data_staleness',
          status: 'warning',
          component: 'pickups',
          details: { 
            message: 'No pickups in last 30 days',
            table: 'pickups',
            impact: 'Intelligence modules may have limited data for predictions'
          }
        });
      }

      // Check 4: Verify manifest completion rate
      const { data: manifests } = await supabase
        .from('manifests')
        .select('status')
        .eq('organization_id', orgId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (manifests && manifests.length > 0) {
        const completedCount = manifests.filter(m => 
          m.status === 'COMPLETED' || m.status === 'AWAITING_RECEIVER_SIGNATURE'
        ).length;
        const completionRate = (completedCount / manifests.length) * 100;

        if (completionRate < 80) {
          healthChecks.push({
            organization_id: orgId,
            check_type: 'data_quality',
            status: 'warning',
            component: 'manifests',
            details: {
              completion_rate: Math.round(completionRate),
              total_manifests: manifests.length,
              completed: completedCount,
              message: 'Low manifest completion rate may affect revenue forecasting'
            }
          });
        }
      }
    }

    // Insert health check results
    if (healthChecks.length > 0) {
      const { error: insertError } = await supabase
        .from('system_health')
        .insert(healthChecks);

      if (insertError) {
        console.error('Error inserting health checks:', insertError);
      }
    }

    // Mark healthy status for organizations with no issues
    const healthyOrgs = (orgs || []).filter(org => 
      !healthChecks.some(check => check.organization_id === org.id)
    );

    if (healthyOrgs.length > 0) {
      await supabase.from('system_health').insert(
        healthyOrgs.map(org => ({
          organization_id: org.id,
          check_type: 'daily_check',
          status: 'healthy',
          component: 'all_modules',
          details: { message: 'All systems operational', checks_passed: modules.length + 4 }
        }))
      );
    }

    console.log(`Health check complete: ${healthChecks.length} issues found, ${healthyOrgs.length} healthy orgs`);

    return new Response(
      JSON.stringify({ 
        success: true,
        issues_found: healthChecks.length,
        healthy_orgs: healthyOrgs.length,
        checks: healthChecks
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('System health check error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
