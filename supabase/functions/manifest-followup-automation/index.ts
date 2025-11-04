import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncompleteManifest {
  id: string;
  manifest_number: string;
  client_id: string;
  organization_id: string;
  status: string;
  created_at: string;
  clients?: {
    company_name: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting manifest follow-up automation...');

    // Find manifests incomplete > 72 hours (3 days)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: incompleteManifests, error: manifestError } = await supabase
      .from('manifests')
      .select(`
        id,
        manifest_number,
        client_id,
        organization_id,
        status,
        created_at,
        signed_at,
        customer_sig_path,
        receiver_sig_path,
        clients(company_name)
      `)
      .or('status.eq.DRAFT,customer_sig_path.is.null,receiver_sig_path.is.null')
      .lt('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (manifestError) throw manifestError;

    console.log(`Found ${incompleteManifests?.length || 0} incomplete manifests`);

    let tasksCreated = 0;
    let tasksEscalated = 0;
    let alertsSent = 0;

    for (const manifest of incompleteManifests || []) {
      const daysSince = Math.ceil(
        (new Date().getTime() - new Date(manifest.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(`Processing manifest ${manifest.manifest_number}: ${daysSince} days old`);

      // Check if task already exists
      const { data: existingTask } = await supabase
        .from('manifest_tasks_beta')
        .select('*')
        .eq('manifest_id', manifest.id)
        .eq('status', 'pending')
        .maybeSingle();

      let taskId = existingTask?.id;
      let escalationLevel = existingTask?.escalation_level || 0;

      // Day 3: Create task and send reminder
      if (daysSince >= 3 && !existingTask) {
        // Find receptionist or ops manager to assign
        const { data: orgUsers } = await supabase
          .from('user_organization_roles')
          .select('user_id, role')
          .eq('organization_id', manifest.organization_id)
          .in('role', ['receptionist', 'ops_manager'])
          .order('role', { ascending: true })
          .limit(1);

        const assignedUser = orgUsers?.[0];

        // Create task
        const { data: newTask, error: taskError } = await supabase
          .from('manifest_tasks_beta')
          .insert({
            manifest_id: manifest.id,
            organization_id: manifest.organization_id,
            assigned_to: assignedUser?.user_id,
            assigned_role: assignedUser?.role || 'receptionist',
            status: 'pending',
            priority: 'medium',
            days_overdue: daysSince,
            escalation_level: 0,
          })
          .select()
          .single();

        if (taskError) {
          console.error(`Failed to create task for ${manifest.manifest_number}:`, taskError);
          continue;
        }

        taskId = newTask.id;
        tasksCreated++;

        // Record followup
        await supabase.from('manifest_followups_beta').insert({
          manifest_id: manifest.id,
          task_id: taskId,
          organization_id: manifest.organization_id,
          action_type: 'task_created',
          assigned_to: assignedUser?.user_id,
          details: { days_overdue: daysSince, escalation_level: 0 },
        });

        // Create notification
        if (assignedUser?.user_id) {
          await supabase.from('notifications').insert({
            user_id: assignedUser.user_id,
            organization_id: manifest.organization_id,
            title: `Manifest Needs Follow-Up (Day ${daysSince})`,
            message: `Manifest ${manifest.manifest_number} for ${manifest.clients?.company_name || 'Unknown'} has been incomplete for ${daysSince} days`,
            type: 'warning',
            priority: 'medium',
            action_link: `/manifests`,
            related_type: 'manifest',
            related_id: manifest.id,
          });

          await supabase.from('manifest_followups_beta').insert({
            manifest_id: manifest.id,
            task_id: taskId,
            organization_id: manifest.organization_id,
            action_type: 'reminder_sent',
            assigned_to: assignedUser.user_id,
            details: { days_overdue: daysSince },
          });
        }
      }

      // Day 5: Escalate to Ops Manager
      if (daysSince >= 5 && existingTask && escalationLevel === 0) {
        const { data: opsManager } = await supabase
          .from('user_organization_roles')
          .select('user_id')
          .eq('organization_id', manifest.organization_id)
          .eq('role', 'ops_manager')
          .limit(1)
          .maybeSingle();

        if (opsManager) {
          await supabase
            .from('manifest_tasks_beta')
            .update({
              assigned_to: opsManager.user_id,
              assigned_role: 'ops_manager',
              status: 'escalated',
              priority: 'high',
              escalation_level: 1,
              days_overdue: daysSince,
            })
            .eq('id', taskId);

          await supabase.from('manifest_followups_beta').insert({
            manifest_id: manifest.id,
            task_id: taskId,
            organization_id: manifest.organization_id,
            action_type: 'task_escalated',
            assigned_to: opsManager.user_id,
            details: { days_overdue: daysSince, escalation_level: 1 },
          });

          await supabase.from('notifications').insert({
            user_id: opsManager.user_id,
            organization_id: manifest.organization_id,
            title: `Escalated: Manifest Follow-Up (Day ${daysSince})`,
            message: `Manifest ${manifest.manifest_number} for ${manifest.clients?.company_name || 'Unknown'} escalated to you`,
            type: 'error',
            priority: 'high',
            action_link: `/manifests`,
            related_type: 'manifest',
            related_id: manifest.id,
          });

          tasksEscalated++;
        }
      }

      // Day 7: High Priority Alert
      if (daysSince >= 7 && existingTask && escalationLevel < 2) {
        await supabase
          .from('manifest_tasks_beta')
          .update({
            priority: 'high',
            escalation_level: 2,
            days_overdue: daysSince,
          })
          .eq('id', taskId);

        // Alert all admins and ops managers
        const { data: admins } = await supabase
          .from('user_organization_roles')
          .select('user_id')
          .eq('organization_id', manifest.organization_id)
          .in('role', ['admin', 'ops_manager']);

        for (const admin of admins || []) {
          await supabase.from('notifications').insert({
            user_id: admin.user_id,
            organization_id: manifest.organization_id,
            title: `⚠️ High Priority Manifest`,
            message: `URGENT: Manifest ${manifest.manifest_number} for ${manifest.clients?.company_name || 'Unknown'} has been incomplete for ${daysSince} days`,
            type: 'error',
            priority: 'high',
            action_link: `/manifests`,
            related_type: 'manifest',
            related_id: manifest.id,
          });
        }

        await supabase.from('manifest_followups_beta').insert({
          manifest_id: manifest.id,
          task_id: taskId,
          organization_id: manifest.organization_id,
          action_type: 'alert_sent',
          details: { days_overdue: daysSince, escalation_level: 2 },
        });

        alertsSent++;
      }
    }

    // Log to system_updates
    await supabase.from('system_updates').insert({
      module_name: 'manifest_followup_automation',
      status: 'live',
      notes: `Processed ${incompleteManifests?.length || 0} manifests. Created ${tasksCreated} tasks, escalated ${tasksEscalated}, sent ${alertsSent} high-priority alerts.`,
      impacted_tables: ['manifest_tasks_beta', 'manifest_followups_beta', 'notifications'],
    });

    console.log(`Automation complete: ${tasksCreated} created, ${tasksEscalated} escalated, ${alertsSent} alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          manifestsProcessed: incompleteManifests?.length || 0,
          tasksCreated,
          tasksEscalated,
          alertsSent,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Manifest follow-up automation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
