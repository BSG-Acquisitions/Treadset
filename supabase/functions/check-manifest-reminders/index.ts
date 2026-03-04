import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[MANIFEST_REMINDERS] Starting manifest reminder check...');

    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id');

    if (orgsError) throw orgsError;

    let totalNotifications = 0;
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Dedup window: 7 days instead of 1 day
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const org of orgs || []) {
      const { data: incompleteManifests, error: manifestsError } = await supabase
        .from('manifests')
        .select(`
          id,
          manifest_number,
          status,
          customer_sig_path,
          receiver_sig_path,
          created_at,
          client:clients(company_name)
        `)
        .eq('organization_id', org.id)
        .or('status.eq.DRAFT,customer_sig_path.is.null,receiver_sig_path.is.null')
        .lt('created_at', twoDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (manifestsError) {
        console.error(`[MANIFEST_REMINDERS] Error fetching manifests for org ${org.id}:`, manifestsError);
        continue;
      }

      if (!incompleteManifests || incompleteManifests.length === 0) continue;

      const { data: adminUsers, error: usersError } = await supabase
        .from('user_organization_roles')
        .select('user_id')
        .eq('organization_id', org.id)
        .in('role', ['admin', 'ops_manager', 'dispatcher', 'receptionist']);

      if (usersError || !adminUsers || adminUsers.length === 0) continue;

      const userIds = adminUsers.map(u => u.user_id).filter(Boolean);

      // Batch: check existing notifications for dedup (7-day window)
      const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('related_id')
        .eq('organization_id', org.id)
        .eq('related_type', 'manifest')
        .eq('type', 'warning')
        .gte('created_at', sevenDaysAgo.toISOString());

      const notifiedManifestIds = new Set((existingNotifs || []).map(n => n.related_id));

      // Check per-user unread cap
      const { data: unreadCounts } = await supabase
        .from('notifications')
        .select('user_id')
        .in('user_id', userIds)
        .eq('is_read', false);

      const unreadByUser = new Map<string, number>();
      for (const n of unreadCounts || []) {
        unreadByUser.set(n.user_id, (unreadByUser.get(n.user_id) || 0) + 1);
      }

      const notificationsToInsert: any[] = [];

      for (const manifest of incompleteManifests) {
        // Skip if already notified in last 7 days
        if (notifiedManifestIds.has(manifest.id)) continue;

        const issues: string[] = [];
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(manifest.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (manifest.status === 'DRAFT') issues.push('still in DRAFT status');
        if (!manifest.customer_sig_path) issues.push('missing generator signature');
        if (!manifest.receiver_sig_path) issues.push('missing receiver signature');
        if (issues.length === 0) continue;

        const clientName = manifest.client?.company_name || 'Unknown Client';
        const priority = daysSinceCreation >= 7 ? 'high' : daysSinceCreation >= 3 ? 'medium' : 'low';

        for (const userId of userIds) {
          // Skip if user already at 100 unread cap
          if ((unreadByUser.get(userId) || 0) >= 100) continue;

          notificationsToInsert.push({
            user_id: userId,
            organization_id: org.id,
            title: `Incomplete Manifest: ${manifest.manifest_number || clientName}`,
            message: `Manifest for ${clientName} is ${issues.join(', ')}. Created ${daysSinceCreation} days ago.`,
            type: 'warning',
            priority,
            related_type: 'manifest',
            related_id: manifest.id,
            metadata: {
              manifest_id: manifest.id,
              manifest_number: manifest.manifest_number,
              client_name: clientName,
              issues,
              days_since_creation: daysSinceCreation,
            },
          });
        }
      }

      // Batch insert
      if (notificationsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notificationsToInsert);

        if (insertError) {
          console.error(`[MANIFEST_REMINDERS] Insert error for org ${org.id}:`, insertError);
        } else {
          totalNotifications += notificationsToInsert.length;
        }
      }
    }

    console.log(`[MANIFEST_REMINDERS] Created ${totalNotifications} notifications`);

    return new Response(
      JSON.stringify({ success: true, notifications_created: totalNotifications }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[MANIFEST_REMINDERS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
