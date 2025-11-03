import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QualityIssue {
  organization_id: string;
  record_type: 'client' | 'pickup' | 'manifest' | 'location';
  record_id: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting data quality scan...');
    const issues: QualityIssue[] = [];

    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('id');

    if (orgsError) throw orgsError;

    for (const org of orgs || []) {
      console.log(`Scanning organization: ${org.id}`);

      // Scan clients for missing data
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, company_name, email, phone, physical_address, is_active')
        .eq('organization_id', org.id)
        .eq('is_active', true);

      if (!clientsError && clients) {
        for (const client of clients) {
          if (!client.email) {
            issues.push({
              organization_id: org.id,
              record_type: 'client',
              record_id: client.id,
              issue: `Client "${client.company_name}" is missing email address`,
              severity: 'medium',
            });
          }
          if (!client.phone) {
            issues.push({
              organization_id: org.id,
              record_type: 'client',
              record_id: client.id,
              issue: `Client "${client.company_name}" is missing phone number`,
              severity: 'low',
            });
          }
          if (!client.physical_address) {
            issues.push({
              organization_id: org.id,
              record_type: 'client',
              record_id: client.id,
              issue: `Client "${client.company_name}" is missing physical address`,
              severity: 'high',
            });
          }
        }
      }

      // Scan locations for missing geocode data
      const { data: locations, error: locationsError } = await supabase
        .from('locations')
        .select('id, name, address, latitude, longitude, clients(company_name)')
        .eq('organization_id', org.id)
        .eq('is_active', true);

      if (!locationsError && locations) {
        for (const location of locations) {
          if (!location.latitude || !location.longitude) {
            issues.push({
              organization_id: org.id,
              record_type: 'location',
              record_id: location.id,
              issue: `Location "${location.name || location.address}" for ${location.clients?.company_name} is missing geocode data`,
              severity: 'high',
            });
          }
        }
      }

      // Scan pickups for missing geocode data
      const { data: pickups, error: pickupsError } = await supabase
        .from('pickups')
        .select(`
          id,
          pickup_date,
          locations(id, latitude, longitude, clients(company_name))
        `)
        .eq('organization_id', org.id)
        .eq('status', 'scheduled')
        .gte('pickup_date', new Date().toISOString().split('T')[0]);

      if (!pickupsError && pickups) {
        for (const pickup of pickups) {
          if (!pickup.locations?.latitude || !pickup.locations?.longitude) {
            issues.push({
              organization_id: org.id,
              record_type: 'pickup',
              record_id: pickup.id,
              issue: `Pickup for ${pickup.locations?.clients?.company_name} on ${pickup.pickup_date} has no geocode data`,
              severity: 'high',
            });
          }
        }
      }

      // Scan manifests for missing signatures/receiver info
      const { data: manifests, error: manifestsError } = await supabase
        .from('manifests')
        .select('id, manifest_number, status, receiver_sig_path, receiver_signed_by, clients(company_name)')
        .eq('organization_id', org.id)
        .in('status', ['COMPLETED', 'AWAITING_RECEIVER_SIGNATURE']);

      if (!manifestsError && manifests) {
        for (const manifest of manifests) {
          if (!manifest.receiver_sig_path && manifest.status === 'COMPLETED') {
            issues.push({
              organization_id: org.id,
              record_type: 'manifest',
              record_id: manifest.id,
              issue: `Manifest ${manifest.manifest_number} for ${manifest.clients?.company_name} is completed but missing receiver signature`,
              severity: 'medium',
            });
          }
          if (!manifest.receiver_signed_by) {
            issues.push({
              organization_id: org.id,
              record_type: 'manifest',
              record_id: manifest.id,
              issue: `Manifest ${manifest.manifest_number} for ${manifest.clients?.company_name} is missing receiver name`,
              severity: 'low',
            });
          }
        }
      }
    }

    console.log(`Found ${issues.length} data quality issues`);

    // Remove duplicate issues (check if issue already exists and is unresolved)
    const newIssues: QualityIssue[] = [];
    for (const issue of issues) {
      const { data: existing } = await supabase
        .from('data_quality_flags')
        .select('id')
        .eq('record_type', issue.record_type)
        .eq('record_id', issue.record_id)
        .eq('issue', issue.issue)
        .is('resolved_at', null)
        .single();

      if (!existing) {
        newIssues.push(issue);
      }
    }

    console.log(`Inserting ${newIssues.length} new issues`);

    // Insert new issues
    if (newIssues.length > 0) {
      const { error: insertError } = await supabase
        .from('data_quality_flags')
        .insert(newIssues);

      if (insertError) throw insertError;

      // Create low-priority notifications for admins
      for (const org of orgs || []) {
        const orgIssues = newIssues.filter(i => i.organization_id === org.id);
        if (orgIssues.length === 0) continue;

        // Get admin users for this org
        const { data: adminUsers } = await supabase
          .from('user_organization_roles')
          .select('user_id')
          .eq('organization_id', org.id)
          .eq('role', 'admin');

        if (!adminUsers) continue;

        const notifications = adminUsers.map(admin => ({
          user_id: admin.user_id,
          organization_id: org.id,
          title: 'Data Quality Issues Detected',
          message: `${orgIssues.length} new data quality issue${orgIssues.length !== 1 ? 's' : ''} found`,
          type: 'info',
          priority: 'low',
          action_link: '/data-quality',
          role_visibility: ['admin'],
        }));

        await supabase.from('notifications').insert(notifications);
      }

      // Log to system_updates
      await supabase.from('system_updates').insert({
        module_name: 'data_quality_scan',
        status: 'live',
        notes: `Nightly scan completed: ${newIssues.length} new issues flagged`,
        impacted_tables: ['data_quality_flags', 'notifications'],
        organization_id: orgs?.[0]?.id,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_issues_found: issues.length,
        new_issues_flagged: newIssues.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Data quality scan error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
