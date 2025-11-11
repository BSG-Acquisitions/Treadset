import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { organization_id } = await req.json();

    if (!organization_id) {
      return new Response(
        JSON.stringify({ error: 'organization_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MISSING_PICKUPS] Checking for missing pickups in org: ${organization_id}`);

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const currentWeekOfMonth = Math.ceil(today.getDate() / 7);

    // Get next 7 days date range for checking schedule
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);

    // Get all patterns that should have pickups this week
    const { data: patterns, error: patternsError } = await supabase
      .from('client_pickup_patterns')
      .select(`
        *,
        client:clients(id, company_name, email)
      `)
      .eq('organization_id', organization_id)
      .gte('confidence_score', 60)
      .neq('frequency', 'irregular');

    if (patternsError) throw patternsError;

    if (!patterns || patterns.length === 0) {
      console.log('[MISSING_PICKUPS] No patterns found');
      return new Response(
        JSON.stringify({ success: true, notifications_created: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const notificationsToCreate = [];

    for (const pattern of patterns) {
      const client = pattern.client;
      if (!client) continue;

      // Check if client should be picked up in the next week
      let shouldBeScheduled = false;
      let scheduleReason = '';

      const daysSinceLastPickup = Math.round(
        (today.getTime() - new Date(pattern.last_pickup_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (pattern.frequency === 'weekly') {
        // Check if typical day of week falls in next 7 days
        if (pattern.typical_day_of_week !== null) {
          const daysUntilTypicalDay = (pattern.typical_day_of_week - currentDayOfWeek + 7) % 7;
          if (daysUntilTypicalDay <= 7) {
            shouldBeScheduled = true;
            scheduleReason = `usually scheduled every ${DAYS_OF_WEEK[pattern.typical_day_of_week]}`;
          }
        }
        // Also check if it's been 7+ days since last pickup
        if (daysSinceLastPickup >= 7) {
          shouldBeScheduled = true;
          scheduleReason = scheduleReason || `usually picked up weekly (last pickup was ${daysSinceLastPickup} days ago)`;
        }
      } else if (pattern.frequency === 'biweekly') {
        // Check if it's been 14+ days since last pickup
        if (daysSinceLastPickup >= 14) {
          shouldBeScheduled = true;
          scheduleReason = `usually picked up every 2 weeks (last pickup was ${daysSinceLastPickup} days ago)`;
        }
      } else if (pattern.frequency === 'monthly') {
        // Check if we're in the typical week of month
        if (pattern.typical_week_of_month !== null && currentWeekOfMonth === pattern.typical_week_of_month) {
          shouldBeScheduled = true;
          scheduleReason = `usually picked up in week ${pattern.typical_week_of_month} of the month`;
        }
        // Also check if it's been 30+ days since last pickup
        if (daysSinceLastPickup >= 30) {
          shouldBeScheduled = true;
          scheduleReason = scheduleReason || `usually picked up monthly (last pickup was ${daysSinceLastPickup} days ago)`;
        }
      }

      if (!shouldBeScheduled) continue;

      // Check if client is already scheduled in the next 7 days
      const { data: scheduledPickups, error: pickupsError } = await supabase
        .from('pickups')
        .select('id')
        .eq('client_id', client.id)
        .eq('organization_id', organization_id)
        .gte('pickup_date', today.toISOString().split('T')[0])
        .lte('pickup_date', endDate.toISOString().split('T')[0])
        .in('status', ['scheduled', 'in_progress', 'completed']);

      if (pickupsError) throw pickupsError;

      // If already scheduled, skip
      if (scheduledPickups && scheduledPickups.length > 0) {
        console.log(`[MISSING_PICKUPS] ${client.company_name} already scheduled`);
        continue;
      }

      // Check if we already created a notification for this client recently (last 3 days)
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(today.getDate() - 3);

      const { data: existingNotifs, error: notifsError } = await supabase
        .from('notifications')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('type', 'missing_pickup')
        .ilike('title', `%${client.company_name}%`)
        .gte('created_at', threeDaysAgo.toISOString());

      if (notifsError) throw notifsError;

      if (existingNotifs && existingNotifs.length > 0) {
        console.log(`[MISSING_PICKUPS] ${client.company_name} notification already exists`);
        continue;
      }

      // Create notification with pattern details
      const dayName = pattern.typical_day_of_week !== null 
        ? DAYS_OF_WEEK[pattern.typical_day_of_week] 
        : 'this week';
      
      const frequencyText = pattern.frequency === 'weekly' 
        ? 'weekly' 
        : pattern.frequency === 'biweekly' 
        ? 'every 2 weeks' 
        : 'monthly';
      
      const confidenceEmoji = pattern.confidence_score >= 80 
        ? '🎯' 
        : pattern.confidence_score >= 60 
        ? '✓' 
        : '~';

      notificationsToCreate.push({
        organization_id,
        type: 'missing_pickup',
        title: `${client.company_name} may need scheduling`,
        message: `${client.company_name} is ${scheduleReason}. They're not currently scheduled.\n\nPattern Details:\n• Frequency: ${frequencyText}${pattern.typical_day_of_week !== null ? ` on ${dayName}s` : ''}\n• Last pickup: ${daysSinceLastPickup} days ago\n• Confidence: ${pattern.confidence_score}% ${confidenceEmoji}`,
        priority: 'medium',
        metadata: {
          client_id: client.id,
          client_name: client.company_name,
          frequency: pattern.frequency,
          typical_day: dayName,
          days_since_last_pickup: daysSinceLastPickup,
          confidence_score: pattern.confidence_score,
        },
      });

      console.log(`[MISSING_PICKUPS] Created notification for ${client.company_name}`);
    }

    // Insert notifications
    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (insertError) throw insertError;
    }

    console.log(`[MISSING_PICKUPS] Created ${notificationsToCreate.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: notificationsToCreate.length,
        clients_checked: patterns.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[MISSING_PICKUPS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
