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

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id');

    if (orgsError) throw orgsError;

    let totalNotifications = 0;
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    for (const org of orgs || []) {
      // Get incomplete manifests older than 2 days
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

      // Get admin users for this org - need auth_user_id for FK constraint
      const { data: adminUsers, error: usersError } = await supabase
        .from('user_organization_roles')
        .select('user_id, users!inner(auth_user_id)')
        .eq('organization_id', org.id)
        .in('role', ['admin', 'ops_manager', 'dispatcher', 'receptionist']);

      if (usersError || !adminUsers || adminUsers.length === 0) {
        console.log(`[MANIFEST_REMINDERS] No admin users found for org ${org.id}`);
        continue;
      }

      for (const manifest of incompleteManifests) {
        const issues: string[] = [];
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(manifest.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (manifest.status === 'DRAFT') {
          issues.push('still in DRAFT status');
        }
        if (!manifest.customer_sig_path) {
          issues.push('missing generator signature');
        }
        if (!manifest.receiver_sig_path) {
          issues.push('missing receiver signature');
        }

        if (issues.length === 0) continue;

        // Check if notification already exists for this manifest in last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('organization_id', org.id)
          .eq('related_type', 'manifest')
          .eq('related_id', manifest.id)
          .eq('type', 'warning')
          .gte('created_at', oneDayAgo.toISOString())
          .limit(1);

        if (existingNotif && existingNotif.length > 0) continue;

        const clientName = manifest.client?.company_name || 'Unknown Client';
        const priority = daysSinceCreation >= 7 ? 'high' : daysSinceCreation >= 3 ? 'medium' : 'low';

        for (const user of adminUsers) {
          // Use auth_user_id from the joined users table for FK constraint
          const authUserId = (user as any).users?.auth_user_id;
          if (!authUserId) {
            console.warn(`[MANIFEST_REMINDERS] No auth_user_id for user role, skipping`);
            continue;
          }

          const { error: insertError } = await supabase
            .from('notifications')
            .insert({
              user_id: authUserId,
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

          if (insertError) {
            console.error(`[MANIFEST_REMINDERS] Failed to insert notification for user ${user.user_id}:`, insertError.message);
          } else {
            totalNotifications++;
          }
        }

        console.log(`[MANIFEST_REMINDERS] Processed manifest ${manifest.manifest_number}, notifications created for ${adminUsers.length} users`);
      }
    }

    console.log(`[MANIFEST_REMINDERS] Created ${totalNotifications} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: totalNotifications,
      }),
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
