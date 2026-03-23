import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Minimum days between weekly reminders
const MIN_DAYS_BETWEEN_REMINDERS = 6;

interface ReminderResult {
  client_id: string;
  company_name: string;
  status: 'sent' | 'skipped_recent_email' | 'skipped_has_pickup' | 'skipped_opted_out' | 'skipped_no_email' | 'error';
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("Starting weekly pickup reminder campaign...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const appUrl = "https://app.treadset.co";

    // Parse optional parameters
    let body: { organization_id?: string; dry_run?: boolean; limit?: number } = {};
    try {
      body = await req.json();
    } catch {
      // No body provided, use defaults
    }

    const dryRun = body.dry_run || false;
    const limit = body.limit || 500;

    console.log(`Parameters: dry_run=${dryRun}, limit=${limit}`);

    // Get all active clients with email addresses who haven't opted out
    let clientsQuery = supabase
      .from("clients")
      .select(`
        id, 
        company_name, 
        email, 
        contact_name, 
        organization_id,
        is_active,
        portal_invite_opted_out
      `)
      .eq("is_active", true)
      .not("email", "is", null)
      .or("portal_invite_opted_out.is.null,portal_invite_opted_out.eq.false")
      .limit(limit);

    if (body.organization_id) {
      clientsQuery = clientsQuery.eq("organization_id", body.organization_id);
    }

    const { data: clients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      console.error("Failed to fetch clients:", clientsError);
      throw new Error("Failed to fetch clients");
    }

    console.log(`Found ${clients?.length || 0} active clients with emails`);

    if (!clients || clients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          summary: "No eligible clients found",
          stats: { total: 0, sent: 0, skipped: 0, errors: 0 }
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const clientIds = clients.map(c => c.id);

    // Get email preferences for these clients
    const { data: emailPrefs, error: prefsError } = await supabase
      .from("client_email_preferences")
      .select("client_id, can_receive_reminders, last_outreach_sent_at, last_weekly_reminder_at, unsubscribed_at")
      .in("client_id", clientIds);

    if (prefsError) {
      console.error("Failed to fetch email preferences:", prefsError);
    }

    const prefsMap = new Map(emailPrefs?.map(p => [p.client_id, p]) || []);

    // Get upcoming pickups (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const today = new Date().toISOString().split('T')[0];
    const futureDate = sevenDaysFromNow.toISOString().split('T')[0];

    const { data: upcomingPickups, error: pickupsError } = await supabase
      .from("pickups")
      .select("client_id")
      .in("client_id", clientIds)
      .gte("pickup_date", today)
      .lte("pickup_date", futureDate)
      .in("status", ["scheduled", "confirmed", "in_progress"]);

    if (pickupsError) {
      console.error("Failed to fetch upcoming pickups:", pickupsError);
    }

    const clientsWithUpcomingPickups = new Set(upcomingPickups?.map(p => p.client_id) || []);

    // Get organization info for booking links
    const orgIds = [...new Set(clients.map(c => c.organization_id))];
    const { data: organizations } = await supabase
      .from("organizations")
      .select("id, slug, name")
      .in("id", orgIds);

    const orgMap = new Map(organizations?.map(o => [o.id, o]) || []);

    const results: ReminderResult[] = [];
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - MIN_DAYS_BETWEEN_REMINDERS * 24 * 60 * 60 * 1000);

    for (const client of clients) {
      const prefs = prefsMap.get(client.id);

      // Skip if no email
      if (!client.email) {
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'skipped_no_email',
          message: 'No email address'
        });
        continue;
      }

      // Skip if opted out of reminders OR fully unsubscribed
      if (prefs?.can_receive_reminders === false || prefs?.unsubscribed_at) {
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'skipped_opted_out',
          message: prefs?.unsubscribed_at ? 'Fully unsubscribed' : 'Opted out of reminders'
        });
        continue;
      }

      // Skip if client has portal_invite_opted_out flag set (double check)
      if (client.portal_invite_opted_out === true) {
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'skipped_opted_out',
          message: 'Client opted out of all communications'
        });
        continue;
      }

      // Skip if already has an upcoming pickup
      if (clientsWithUpcomingPickups.has(client.id)) {
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'skipped_has_pickup',
          message: 'Already has pickup scheduled'
        });
        continue;
      }

      // Skip if received any outreach email recently (last 6 days)
      const lastOutreach = prefs?.last_outreach_sent_at ? new Date(prefs.last_outreach_sent_at) : null;
      const lastWeeklyReminder = prefs?.last_weekly_reminder_at ? new Date(prefs.last_weekly_reminder_at) : null;
      const mostRecentEmail = lastOutreach && lastWeeklyReminder 
        ? (lastOutreach > lastWeeklyReminder ? lastOutreach : lastWeeklyReminder)
        : lastOutreach || lastWeeklyReminder;

      if (mostRecentEmail && mostRecentEmail > cutoffDate) {
        const daysSinceEmail = Math.floor((now.getTime() - mostRecentEmail.getTime()) / (24 * 60 * 60 * 1000));
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'skipped_recent_email',
          message: `Email sent ${daysSinceEmail} days ago`
        });
        continue;
      }

      // Client is eligible for a weekly reminder
      if (dryRun) {
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'sent',
          message: 'Would send (dry run)'
        });
        continue;
      }

      // Send the reminder email
      try {
        const org = orgMap.get(client.organization_id);
        const bookingUrl = `${appUrl}/book/${org?.slug || 'bsg'}`;
        
        // Generate unsubscribe token
        const unsubscribeToken = await generateSecurityToken(client.id, client.email);
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/portal-invite-unsubscribe?client=${client.id}&token=${unsubscribeToken}&type=reminder`;

        const emailResponse = await resend.emails.send({
          from: `${org?.name || 'Your Service Provider'} <noreply@bsgtires.com>`,
          to: [client.email],
          subject: "🗓️ Ready to schedule your tire pickup this week?",
          html: generateEmailHtml(client, bookingUrl, unsubscribeUrl, org?.name || 'BSG Tire Recycling'),
        });

        console.log(`Weekly reminder sent to ${client.email} (${client.company_name}):`, emailResponse);

        // Update email preferences
        await supabase
          .from("client_email_preferences")
          .upsert({
            client_id: client.id,
            organization_id: client.organization_id,
            last_weekly_reminder_at: new Date().toISOString(),
            reminder_count: (prefs?.reminder_count || 0) + 1,
          }, { onConflict: 'client_id' });

        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'sent',
          message: 'Weekly reminder sent'
        });

      } catch (error: any) {
        console.error(`Error sending to ${client.company_name}:`, error);
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'error',
          message: error.message
        });
      }
    }

    const stats = {
      total: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      skipped_recent_email: results.filter(r => r.status === 'skipped_recent_email').length,
      skipped_has_pickup: results.filter(r => r.status === 'skipped_has_pickup').length,
      skipped_opted_out: results.filter(r => r.status === 'skipped_opted_out').length,
      skipped_no_email: results.filter(r => r.status === 'skipped_no_email').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    const duration = Date.now() - startTime;
    console.log(`Weekly reminder campaign completed in ${duration}ms:`, stats);

    return new Response(
      JSON.stringify({
        success: true,
        summary: `Sent ${stats.sent} weekly reminders, skipped ${stats.skipped_has_pickup + stats.skipped_recent_email} (${stats.skipped_has_pickup} have pickups, ${stats.skipped_recent_email} recent emails), ${stats.errors} errors`,
        stats,
        results: dryRun ? results : undefined,
        duration_ms: duration
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-weekly-pickup-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// Generate security token for unsubscribe links - MUST use same salt as portal-invite-unsubscribe
async function generateSecurityToken(clientId: string, email: string): Promise<string> {
  const data = `${clientId}-${email}-portal-invite-salt`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateEmailHtml(
  client: { company_name: string; contact_name: string | null },
  bookingUrl: string,
  unsubscribeUrl: string,
  orgName: string
): string {
  const greeting = client.contact_name ? `Hi ${client.contact_name}` : 'Hi there';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header with BSG green gradient -->
        <div style="background: linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">🗓️ Weekly Pickup Reminder</h1>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; margin-bottom: 20px;">${greeting},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Happy Monday from <strong>${orgName}</strong>! Just a quick reminder that we're ready to pick up your scrap tires whenever you need us.
          </p>
          
          <p style="font-size: 16px; margin-bottom: 25px;">
            If you've got tires piling up, now's a great time to schedule a pickup for this week. It only takes a minute!
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${bookingUrl}" style="display: inline-block; background: linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(26, 67, 20, 0.3);">
              Schedule Your Pickup
            </a>
          </div>

          <p style="font-size: 14px; color: #64748b; text-align: center;">
            Questions? Just reply to this email or give us a call!
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin: 0; font-size: 14px;">
            <a href="tel:3137310817" style="color: #1A4314; text-decoration: none;">(313) 731-0817</a> • 
            <a href="mailto:bsgtires@gmail.com" style="color: #1A4314; text-decoration: none;">bsgtires@gmail.com</a>
          </p>
        </div>
      </div>

      <!-- Unsubscribe footer -->
      <div style="text-align: center; margin-top: 20px;">
        <p style="font-size: 12px; color: #94a3b8;">
          ${orgName}<br>
          <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">
            Unsubscribe from weekly reminders
          </a><br>
          <span style="font-size: 11px;">Powered by <a href="https://treadset.co" style="color: #94a3b8;">TreadSet</a></span>
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
