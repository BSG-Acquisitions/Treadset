import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Alert thresholds
const FULL_IDLE_HOURS = 24; // Alert if full trailer sits idle for more than 24 hours
const ROUTE_START_GRACE_MINUTES = 30; // Alert if route hasn't started within 30 min of scheduled time

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[TrailerAlerts] Starting alert check...');

    const now = new Date();
    const alertsCreated: string[] = [];

    // Get all organizations with active trailers
    const { data: orgs } = await supabase
      .from('trailers')
      .select('organization_id')
      .eq('is_active', true);

    const uniqueOrgIds = [...new Set(orgs?.map(o => o.organization_id) || [])];

    for (const orgId of uniqueOrgIds) {
      console.log(`[TrailerAlerts] Checking organization: ${orgId}`);

      // 1. Check for full trailers sitting idle
      const fullIdleThreshold = new Date(now.getTime() - FULL_IDLE_HOURS * 60 * 60 * 1000);
      
      const { data: fullTrailers } = await supabase
        .from('trailers')
        .select(`
          id, trailer_number, current_location, updated_at,
          last_event:trailer_events!trailers_last_event_id_fkey(timestamp)
        `)
        .eq('organization_id', orgId)
        .eq('current_status', 'full')
        .eq('is_active', true);

      for (const trailer of fullTrailers || []) {
        const eventTime = trailer.last_event?.timestamp 
          ? new Date(trailer.last_event.timestamp) 
          : new Date(trailer.updated_at);
        
        if (eventTime < fullIdleThreshold) {
          const { data: existingAlert } = await supabase
            .from('trailer_alerts')
            .select('id')
            .eq('trailer_id', trailer.id)
            .eq('alert_type', 'full_idle')
            .eq('is_resolved', false)
            .single();

          if (!existingAlert) {
            const hoursIdle = Math.round((now.getTime() - eventTime.getTime()) / (60 * 60 * 1000));
            
            await supabase.from('trailer_alerts').insert({
              organization_id: orgId,
              trailer_id: trailer.id,
              alert_type: 'full_idle',
              severity: hoursIdle > 48 ? 'critical' : 'warning',
              message: `Full trailer ${trailer.trailer_number} has been idle for ${hoursIdle} hours at ${trailer.current_location || 'unknown location'}`,
            });
            
            alertsCreated.push(`full_idle: ${trailer.trailer_number}`);
          }
        }
      }

      // 2. Check for routes not started on time
      const routeGraceThreshold = new Date(now.getTime() - ROUTE_START_GRACE_MINUTES * 60 * 1000);
      const today = now.toISOString().split('T')[0];
      
      const { data: unstartedRoutes } = await supabase
        .from('trailer_routes')
        .select('id, route_name, scheduled_date')
        .eq('organization_id', orgId)
        .eq('status', 'scheduled')
        .eq('scheduled_date', today);

      for (const route of unstartedRoutes || []) {
        // Check if we should have started by now (assuming 8 AM start time if no specific time)
        const scheduledStart = new Date(`${route.scheduled_date}T08:00:00`);
        
        if (scheduledStart < routeGraceThreshold) {
          // Check existing alerts by route info in message (no route_id on alerts table)
          const { data: existingAlert } = await supabase
            .from('trailer_alerts')
            .select('id')
            .eq('organization_id', orgId)
            .eq('alert_type', 'route_not_started')
            .eq('is_resolved', false)
            .ilike('message', `%${route.route_name}%`);

          if (!existingAlert || existingAlert.length === 0) {
            // Get first trailer from route to attach alert to
            const { data: routeStops } = await supabase
              .from('trailer_route_stops')
              .select('id')
              .eq('route_id', route.id)
              .limit(1);

            // Get any trailer for this org to attach alert
            const { data: anyTrailer } = await supabase
              .from('trailers')
              .select('id')
              .eq('organization_id', orgId)
              .eq('is_active', true)
              .limit(1)
              .single();

            if (anyTrailer) {
              await supabase.from('trailer_alerts').insert({
                organization_id: orgId,
                trailer_id: anyTrailer.id,
                alert_type: 'route_not_started',
                severity: 'warning',
                message: `Route "${route.route_name}" scheduled for today has not been started yet`,
              });
              
              alertsCreated.push(`route_not_started: ${route.route_name}`);
            }
          }
        }
      }
    }

    // Also create notifications for critical alerts
    const { data: criticalAlerts } = await supabase
      .from('trailer_alerts')
      .select('*, trailer:trailers(trailer_number)')
      .eq('severity', 'critical')
      .eq('is_resolved', false)
      .gte('created_at', new Date(now.getTime() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

    for (const alert of criticalAlerts || []) {
      // Get admin users to notify
      const { data: adminUsers } = await supabase
        .from('user_organization_roles')
        .select('user_id')
        .eq('organization_id', alert.organization_id)
        .in('role', ['admin', 'ops_manager', 'dispatcher']);

      for (const user of adminUsers || []) {
        await supabase.from('notifications').insert({
          user_id: user.user_id,
          organization_id: alert.organization_id,
          title: 'Trailer Alert',
          message: alert.message,
          type: 'warning',
          priority: 'high',
          related_type: 'trailer_alert',
          related_id: alert.id,
          metadata: {
            trailer_id: alert.trailer_id,
            trailer_number: alert.trailer?.trailer_number,
            alert_type: alert.alert_type,
          },
        });
      }
    }

    console.log(`[TrailerAlerts] Created ${alertsCreated.length} alerts:`, alertsCreated);

    return new Response(
      JSON.stringify({
        success: true,
        alerts_created: alertsCreated.length,
        details: alertsCreated,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TrailerAlerts] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
