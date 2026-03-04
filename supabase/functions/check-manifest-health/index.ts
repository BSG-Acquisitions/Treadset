import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json().catch(() => ({}));
    const { organization_id } = body;

    // Get all organizations to scan (or just one if specified)
    let orgQuery = supabase.from('organizations').select('id');
    if (organization_id) {
      orgQuery = orgQuery.eq('id', organization_id);
    }
    const { data: orgs, error: orgsError } = await orgQuery;
    if (orgsError) throw orgsError;

    let totalNotificationsCreated = 0;

    for (const org of (orgs || [])) {
      // Get admin/ops_manager users for this org to notify
      const { data: orgUsers } = await supabase
        .from('user_organization_roles')
        .select('user_id, role')
        .eq('organization_id', org.id)
        .in('role', ['admin', 'ops_manager', 'super_admin']);

      if (!orgUsers || orgUsers.length === 0) continue;

      // Fetch manifests with compliance issues (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: manifests, error: manifestError } = await supabase
        .from('manifests')
        .select(`
          id,
          manifest_number,
          status,
          customer_signature_png_path,
          driver_signature_png_path,
          signed_by_name,
          generator_signed_at,
          receiver_signed_at,
          created_at,
          clients(company_name)
        `)
        .eq('organization_id', org.id)
        .in('status', ['COMPLETED', 'AWAITING_RECEIVER_SIGNATURE'])
        .gte('created_at', ninetyDaysAgo.toISOString());

      if (manifestError) {
        console.error('[check-manifest-health] Error fetching manifests:', manifestError);
        continue;
      }

      if (!manifests || manifests.length === 0) continue;

      // Check existing notifications to deduplicate (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('related_id, title')
        .eq('organization_id', org.id)
        .eq('related_type', 'manifest')
        .gte('created_at', sevenDaysAgo.toISOString());

      // Build a set of "manifestId:issueTitle" for dedup
      const existingSet = new Set(
        (existingNotifications || []).map(n => `${n.related_id}:${n.title}`)
      );

      const issues: Array<{
        manifest_id: string;
        manifest_number: string;
        client_name: string;
        title: string;
        message: string;
        priority: 'high' | 'medium' | 'low';
      }> = [];

      for (const manifest of manifests) {
        const clientName = (manifest.clients as any)?.company_name || 'Unknown Client';
        const manifestNum = manifest.manifest_number || manifest.id.substring(0, 8);

        if (!manifest.customer_signature_png_path) {
          issues.push({
            manifest_id: manifest.id,
            manifest_number: manifestNum,
            client_name: clientName,
            title: 'Manifest missing generator signature',
            message: `Manifest ${manifestNum} for ${clientName} is missing the generator (customer) signature.`,
            priority: 'high',
          });
        }

        if (!manifest.driver_signature_png_path) {
          issues.push({
            manifest_id: manifest.id,
            manifest_number: manifestNum,
            client_name: clientName,
            title: 'Manifest missing hauler signature',
            message: `Manifest ${manifestNum} for ${clientName} is missing the hauler (driver) signature.`,
            priority: 'high',
          });
        }

        if (!manifest.signed_by_name) {
          issues.push({
            manifest_id: manifest.id,
            manifest_number: manifestNum,
            client_name: clientName,
            title: 'Manifest missing printed name',
            message: `Manifest ${manifestNum} for ${clientName} is missing the generator's printed name.`,
            priority: 'medium',
          });
        }

        if (!manifest.generator_signed_at) {
          issues.push({
            manifest_id: manifest.id,
            manifest_number: manifestNum,
            client_name: clientName,
            title: 'Manifest missing generator timestamp',
            message: `Manifest ${manifestNum} for ${clientName} is missing the generator signature timestamp.`,
            priority: 'medium',
          });
        }

        if (manifest.status === 'COMPLETED' && !manifest.receiver_signed_at) {
          issues.push({
            manifest_id: manifest.id,
            manifest_number: manifestNum,
            client_name: clientName,
            title: 'Completed manifest missing receiver timestamp',
            message: `Manifest ${manifestNum} for ${clientName} is marked COMPLETED but has no receiver signature timestamp.`,
            priority: 'high',
          });
        }
      }

      // Create notifications for each user and each issue (deduplicated + capped)
      // Check per-user unread cap
      const allUserIds = orgUsers.map(u => u.user_id);
      const { data: unreadCounts } = await supabase
        .from('notifications')
        .select('user_id')
        .in('user_id', allUserIds)
        .eq('is_read', false);

      const unreadByUser = new Map<string, number>();
      for (const n of unreadCounts || []) {
        unreadByUser.set(n.user_id, (unreadByUser.get(n.user_id) || 0) + 1);
      }

      for (const user of orgUsers) {
        // Skip if user already at 100 unread cap
        if ((unreadByUser.get(user.user_id) || 0) >= 100) continue;

        const notificationsToInsert = [];

        for (const issue of issues) {
          const dedupKey = `${issue.manifest_id}:${issue.title}`;
          if (existingSet.has(dedupKey)) continue;

          notificationsToInsert.push({
            user_id: user.user_id,
            organization_id: org.id,
            title: issue.title,
            message: issue.message,
            type: 'warning',
            priority: issue.priority,
            related_type: 'manifest',
            related_id: issue.manifest_id,
            action_link: `/manifests/${issue.manifest_id}`,
            is_read: false,
            metadata: {
              manifest_number: issue.manifest_number,
              client_name: issue.client_name,
            },
          });
        }

        if (notificationsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('notifications')
            .insert(notificationsToInsert);

          if (insertError) {
            console.error('[check-manifest-health] Insert error:', insertError);
          } else {
            totalNotificationsCreated += notificationsToInsert.length;
          }
        }
      }
    }

    console.log(`[check-manifest-health] Created ${totalNotificationsCreated} notifications`);

    return new Response(
      JSON.stringify({ success: true, notifications_created: totalNotificationsCreated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[check-manifest-health] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
