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

    let organization_id: string | null = null;
    try {
      const body = await req.json();
      organization_id = body.organization_id;
    } catch {
      // No body - will check all orgs
    }

    // Get organizations to check
    let orgsQuery = supabase.from('organizations').select('id');
    if (organization_id) {
      orgsQuery = orgsQuery.eq('id', organization_id);
    }
    const { data: orgs, error: orgsError } = await orgsQuery;
    if (orgsError) throw orgsError;

    console.log(`[MISSING_PICKUPS] Checking ${orgs?.length || 0} organization(s)`);
    
    let totalNotifications = 0;
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const currentWeekOfMonth = Math.ceil(today.getDate() / 7);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    
    for (const org of orgs || []) {
      const orgId = org.id;
      console.log(`[MISSING_PICKUPS] Processing org: ${orgId}`);

      // Get admin users to create notifications for - need auth_user_id for FK constraint
      const { data: adminUsers, error: usersError } = await supabase
        .from('user_organization_roles')
        .select('user_id, users!inner(auth_user_id)')
        .eq('organization_id', orgId)
        .in('role', ['admin', 'ops_manager', 'dispatcher', 'receptionist']);

      if (usersError) {
        console.error(`[MISSING_PICKUPS] Error getting admin users for org ${orgId}:`, usersError);
        continue;
      }

      if (!adminUsers || adminUsers.length === 0) {
        console.log(`[MISSING_PICKUPS] No admin users found for org ${orgId}`);
        continue;
      }
      
      // Extract auth_user_ids
      const authUserIds = adminUsers
        .map(u => (u as any).users?.auth_user_id)
        .filter(Boolean);

      // Get all patterns that should have pickups this week
      const { data: patterns, error: patternsError } = await supabase
        .from('client_pickup_patterns')
        .select(`
          *,
          client:clients(id, company_name, email)
        `)
        .eq('organization_id', orgId)
        .gte('confidence_score', 60)
        .neq('frequency', 'irregular');

      if (patternsError) {
        console.error(`[MISSING_PICKUPS] Error getting patterns for org ${orgId}:`, patternsError);
        continue;
      }

      if (!patterns || patterns.length === 0) {
        console.log(`[MISSING_PICKUPS] No patterns found for org ${orgId}`);
        continue;
      }

      const notificationsToCreate: any[] = [];

      for (const pattern of patterns) {
        const client = pattern.client;
        if (!client) continue;

        // Check if client should be picked up in the next week
        let shouldBeScheduled = false;
        let scheduleReason = '';

        const daysSinceLastPickup = pattern.last_pickup_date 
          ? Math.round((today.getTime() - new Date(pattern.last_pickup_date).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (pattern.frequency === 'weekly') {
          if (pattern.typical_day_of_week !== null) {
            const daysUntilTypicalDay = (pattern.typical_day_of_week - currentDayOfWeek + 7) % 7;
            if (daysUntilTypicalDay <= 7) {
              shouldBeScheduled = true;
              scheduleReason = `usually scheduled every ${DAYS_OF_WEEK[pattern.typical_day_of_week]}`;
            }
          }
          if (daysSinceLastPickup >= 7) {
            shouldBeScheduled = true;
            scheduleReason = scheduleReason || `usually picked up weekly (last pickup was ${daysSinceLastPickup} days ago)`;
          }
        } else if (pattern.frequency === 'biweekly') {
          if (daysSinceLastPickup >= 14) {
            shouldBeScheduled = true;
            scheduleReason = `usually picked up every 2 weeks (last pickup was ${daysSinceLastPickup} days ago)`;
          }
        } else if (pattern.frequency === 'monthly') {
          if (pattern.typical_week_of_month !== null && currentWeekOfMonth === pattern.typical_week_of_month) {
            shouldBeScheduled = true;
            scheduleReason = `usually picked up in week ${pattern.typical_week_of_month} of the month`;
          }
          if (daysSinceLastPickup >= 30) {
            shouldBeScheduled = true;
            scheduleReason = scheduleReason || `usually picked up monthly (last pickup was ${daysSinceLastPickup} days ago)`;
          }
        }

        if (!shouldBeScheduled) continue;

        // Check if client is already scheduled in the next 7 days
        const { data: scheduledPickups } = await supabase
          .from('pickups')
          .select('id')
          .eq('client_id', client.id)
          .eq('organization_id', orgId)
          .gte('pickup_date', today.toISOString().split('T')[0])
          .lte('pickup_date', endDate.toISOString().split('T')[0])
          .in('status', ['scheduled', 'in_progress', 'completed']);

        if (scheduledPickups && scheduledPickups.length > 0) {
          continue;
        }

        // Build notification content
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 3);

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

        const notificationTitle = `${client.company_name} may need scheduling`;

        // Create notification for EACH admin user - with per-user deduplication
        for (const authUserId of authUserIds) {
          // Check for recent notification for THIS USER (last 3 days)
          const { data: existingNotifs } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', authUserId)
            .eq('organization_id', orgId)
            .eq('type', 'missing_pickup')
            .ilike('title', `%${client.company_name}%`)
            .gte('created_at', threeDaysAgo.toISOString());

          if (existingNotifs && existingNotifs.length > 0) {
            console.log(`[MISSING_PICKUPS] Skipping duplicate for user ${authUserId}, client ${client.company_name}`);
            continue; // Skip creating for this user - they already have one
          }

          notificationsToCreate.push({
            user_id: authUserId,
            organization_id: orgId,
            type: 'missing_pickup',
            title: notificationTitle,
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
        }

        console.log(`[MISSING_PICKUPS] Processed notifications for ${client.company_name}`);
      }

      // Insert notifications for this org
      if (notificationsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notificationsToCreate);

        if (insertError) {
          console.error(`[MISSING_PICKUPS] Error inserting notifications for org ${orgId}:`, insertError);
        } else {
          totalNotifications += notificationsToCreate.length;
          console.log(`[MISSING_PICKUPS] Inserted ${notificationsToCreate.length} notifications for org ${orgId}`);
        }
      }
    }

    console.log(`[MISSING_PICKUPS] Complete. Total notifications: ${totalNotifications}`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: totalNotifications,
        organizations_checked: orgs?.length || 0,
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
