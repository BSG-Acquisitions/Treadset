import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reminder schedule configuration
const REMINDER_1_DAYS = 7;  // First reminder after 7 days
const REMINDER_2_DAYS = 14; // Second reminder after 14 days

interface ReminderResult {
  invite_id: string;
  client_id: string;
  company_name: string;
  status: 'sent' | 'skipped' | 'error';
  reminder_type?: 'day7' | 'day14';
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("Starting automated invite reminder check...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const appUrl = "https://bsgtires.com";

    // Parse optional parameters
    let body: { organization_id?: string; dry_run?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // No body provided, use defaults
    }

    const dryRun = body.dry_run || false;
    console.log(`Parameters: dry_run=${dryRun}, organization_id=${body.organization_id || 'all'}`);

    const now = new Date();
    const day7Cutoff = new Date(now.getTime() - REMINDER_1_DAYS * 24 * 60 * 60 * 1000);
    const day14Cutoff = new Date(now.getTime() - REMINDER_2_DAYS * 24 * 60 * 60 * 1000);

    // Find invites eligible for Day 7 reminder:
    // - Sent 7+ days ago
    // - Never opened OR opened but not clicked
    // - Not used (signed up)
    // - reminder_count = 0
    let query7 = supabase
      .from("client_invites")
      .select(`
        id,
        token,
        client_id,
        organization_id,
        sent_to_email,
        opened_at,
        clicked_at,
        reminder_count,
        clients!inner (
          id,
          company_name,
          contact_name,
          email,
          is_active,
          portal_invite_opted_out
        )
      `)
      .is("used_at", null)
      .eq("reminder_count", 0)
      .lt("created_at", day7Cutoff.toISOString())
      .gte("created_at", day14Cutoff.toISOString()); // Not old enough for day14

    if (body.organization_id) {
      query7 = query7.eq("organization_id", body.organization_id);
    }

    // Find invites eligible for Day 14 reminder:
    // - Sent 14+ days ago
    // - Not used (signed up)
    // - reminder_count = 1 (already got day 7)
    let query14 = supabase
      .from("client_invites")
      .select(`
        id,
        token,
        client_id,
        organization_id,
        sent_to_email,
        opened_at,
        clicked_at,
        reminder_count,
        clients!inner (
          id,
          company_name,
          contact_name,
          email,
          is_active,
          portal_invite_opted_out
        )
      `)
      .is("used_at", null)
      .eq("reminder_count", 1)
      .lt("created_at", day14Cutoff.toISOString());

    if (body.organization_id) {
      query14 = query14.eq("organization_id", body.organization_id);
    }

    const [result7, result14] = await Promise.all([query7, query14]);

    if (result7.error) {
      console.error("Failed to fetch day 7 candidates:", result7.error);
    }
    if (result14.error) {
      console.error("Failed to fetch day 14 candidates:", result14.error);
    }

    const day7Invites = result7.data || [];
    const day14Invites = result14.data || [];

    console.log(`Found ${day7Invites.length} candidates for Day 7 reminder`);
    console.log(`Found ${day14Invites.length} candidates for Day 14 reminder`);

    const results: ReminderResult[] = [];

    // Process Day 7 reminders
    for (const invite of day7Invites) {
      const client = invite.clients as any;
      
      // Skip inactive or opted-out clients
      if (!client.is_active || client.portal_invite_opted_out) {
        results.push({
          invite_id: invite.id,
          client_id: invite.client_id,
          company_name: client.company_name,
          status: 'skipped',
          reminder_type: 'day7',
          message: client.portal_invite_opted_out ? 'Opted out' : 'Inactive client'
        });
        continue;
      }

      if (dryRun) {
        results.push({
          invite_id: invite.id,
          client_id: invite.client_id,
          company_name: client.company_name,
          status: 'sent',
          reminder_type: 'day7',
          message: `Would send Day 7 reminder (opened: ${!!invite.opened_at}, clicked: ${!!invite.clicked_at})`
        });
        continue;
      }

      try {
        await sendReminderEmail(
          supabase,
          resend,
          appUrl,
          supabaseUrl,
          invite,
          client,
          'day7'
        );

        // Update reminder_count
        await supabase
          .from("client_invites")
          .update({ reminder_count: 1 })
          .eq("id", invite.id);

        // Log the event
        await supabase
          .from("email_events")
          .insert({
            invite_id: invite.id,
            client_id: invite.client_id,
            event_type: 'reminder_sent',
            metadata: { reminder_type: 'day7' }
          });

        results.push({
          invite_id: invite.id,
          client_id: invite.client_id,
          company_name: client.company_name,
          status: 'sent',
          reminder_type: 'day7',
          message: 'Day 7 reminder sent'
        });
      } catch (error: any) {
        console.error(`Error sending Day 7 reminder to ${client.company_name}:`, error);
        results.push({
          invite_id: invite.id,
          client_id: invite.client_id,
          company_name: client.company_name,
          status: 'error',
          reminder_type: 'day7',
          message: error.message
        });
      }
    }

    // Process Day 14 reminders
    for (const invite of day14Invites) {
      const client = invite.clients as any;
      
      // Skip inactive or opted-out clients
      if (!client.is_active || client.portal_invite_opted_out) {
        results.push({
          invite_id: invite.id,
          client_id: invite.client_id,
          company_name: client.company_name,
          status: 'skipped',
          reminder_type: 'day14',
          message: client.portal_invite_opted_out ? 'Opted out' : 'Inactive client'
        });
        continue;
      }

      if (dryRun) {
        results.push({
          invite_id: invite.id,
          client_id: invite.client_id,
          company_name: client.company_name,
          status: 'sent',
          reminder_type: 'day14',
          message: `Would send Day 14 reminder (opened: ${!!invite.opened_at}, clicked: ${!!invite.clicked_at})`
        });
        continue;
      }

      try {
        await sendReminderEmail(
          supabase,
          resend,
          appUrl,
          supabaseUrl,
          invite,
          client,
          'day14'
        );

        // Update reminder_count
        await supabase
          .from("client_invites")
          .update({ reminder_count: 2 })
          .eq("id", invite.id);

        // Log the event
        await supabase
          .from("email_events")
          .insert({
            invite_id: invite.id,
            client_id: invite.client_id,
            event_type: 'reminder_sent',
            metadata: { reminder_type: 'day14' }
          });

        results.push({
          invite_id: invite.id,
          client_id: invite.client_id,
          company_name: client.company_name,
          status: 'sent',
          reminder_type: 'day14',
          message: 'Day 14 reminder sent'
        });
      } catch (error: any) {
        console.error(`Error sending Day 14 reminder to ${client.company_name}:`, error);
        results.push({
          invite_id: invite.id,
          client_id: invite.client_id,
          company_name: client.company_name,
          status: 'error',
          reminder_type: 'day14',
          message: error.message
        });
      }
    }

    const stats = {
      total: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      day7_sent: results.filter(r => r.status === 'sent' && r.reminder_type === 'day7').length,
      day14_sent: results.filter(r => r.status === 'sent' && r.reminder_type === 'day14').length,
    };

    const duration = Date.now() - startTime;
    console.log(`Reminder campaign completed in ${duration}ms:`, stats);

    return new Response(
      JSON.stringify({
        success: true,
        summary: `Sent ${stats.sent} reminders (${stats.day7_sent} Day 7, ${stats.day14_sent} Day 14), skipped ${stats.skipped}, ${stats.errors} errors`,
        stats,
        results: dryRun ? results : undefined,
        duration_ms: duration
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-invite-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function sendReminderEmail(
  supabase: any,
  resend: any,
  appUrl: string,
  supabaseUrl: string,
  invite: any,
  client: any,
  reminderType: 'day7' | 'day14'
): Promise<void> {
  const inviteUrl = `${appUrl}/client-invite/${invite.token}`;
  const bookUrl = `${appUrl}/book?invite=${invite.id}`;
  
  // Generate tracking URLs
  const openTrackingUrl = `${supabaseUrl}/functions/v1/track-email-event?type=open&invite=${invite.id}`;
  const trackedInviteUrl = `${supabaseUrl}/functions/v1/track-email-event?type=click&invite=${invite.id}&redirect=${encodeURIComponent(inviteUrl)}`;
  const trackedBookUrl = `${supabaseUrl}/functions/v1/track-email-event?type=click&invite=${invite.id}&redirect=${encodeURIComponent(bookUrl)}`;
  
  // Generate unsubscribe URL
  const unsubscribeToken = await generateSecurityToken(invite.client_id, client.email);
  const unsubscribeUrl = `${supabaseUrl}/functions/v1/portal-invite-unsubscribe?client=${invite.client_id}&token=${unsubscribeToken}`;

  const subject = reminderType === 'day7'
    ? `Quick Reminder: Your BSG Client Portal is Ready`
    : `Last Chance: Activate Your BSG Client Portal`;

  const emailHtml = generateReminderEmailHtml(
    client,
    trackedInviteUrl,
    trackedBookUrl,
    unsubscribeUrl,
    openTrackingUrl,
    reminderType,
    !!invite.opened_at
  );

  const emailResponse = await resend.emails.send({
    from: "BSG Tire Recycling <onboarding@resend.dev>",
    to: [client.email],
    subject,
    html: emailHtml,
  });

  console.log(`${reminderType} reminder sent to ${client.email}:`, emailResponse);
}

async function generateSecurityToken(clientId: string, email: string): Promise<string> {
  const data = `${clientId}-${email}-portal-invite-salt`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateReminderEmailHtml(
  client: { company_name: string; contact_name: string | null },
  inviteUrl: string,
  bookUrl: string,
  unsubscribeUrl: string,
  openTrackingUrl: string,
  reminderType: 'day7' | 'day14',
  wasOpened: boolean
): string {
  const greeting = client.contact_name ? `Hi ${client.contact_name}` : 'Hi there';
  
  const isDay7 = reminderType === 'day7';
  const headerText = isDay7 ? 'Quick Reminder' : 'Last Chance';
  const subHeader = isDay7 
    ? "Your portal account is waiting for you!"
    : "Don't miss out on easy tire pickup scheduling";

  // Personalize message based on whether they opened the first email
  let introText: string;
  if (isDay7) {
    introText = wasOpened
      ? `We noticed you checked out our email about the <strong>BSG Client Portal</strong>. Setting up your account only takes a minute, and you'll get instant access to all your pickup records.`
      : `We sent you an invitation to the <strong>BSG Client Portal</strong> last week. With your free account, you can view all your tire pickup manifests, download PDFs, and schedule new pickups online.`;
  } else {
    introText = `This is a final reminder that your <strong>BSG Client Portal</strong> invitation is expiring soon. Once you sign up, you'll have 24/7 access to your complete tire pickup history and online scheduling.`;
  }

  const ctaText = isDay7 
    ? "It takes less than 60 seconds to create your account."
    : "Your invitation expires soon - don't wait!";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, ${isDay7 ? '#1A4314 0%, #2d5a1e 100%' : '#b45309 0%, #d97706 100%'}); color: white; padding: 40px 30px; text-align: center;">
          <h2 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 500; opacity: 0.9;">BSG Tire Recycling</h2>
          <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">${headerText}</h1>
          <p style="margin: 0; font-size: 16px; opacity: 0.9;">${subHeader}</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 16px; margin-bottom: 5px;">${greeting},</p>
          
          <p style="font-size: 16px;">${introText}</p>
          
          <p style="font-size: 16px; font-weight: 500;">${ctaText}</p>

          <!-- Two CTA Buttons -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${bookUrl}" style="display: inline-block; background: linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 5px; box-shadow: 0 4px 12px rgba(26, 67, 20, 0.3);">
              📦 Schedule a Pickup
            </a>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: white; color: #1A4314; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; border: 2px solid #1A4314;">
              Set Up Your Portal Account →
            </a>
          </div>

          ${isDay7 ? `
          <!-- Quick benefits reminder -->
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #1A4314;">With your portal account:</p>
            <ul style="margin: 0; padding-left: 20px; color: #475569;">
              <li>View & download all your manifests</li>
              <li>Schedule pickups online anytime</li>
              <li>Track your environmental impact</li>
            </ul>
          </div>
          ` : `
          <!-- Urgency message for day 14 -->
          <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #9a3412;">
              <strong>⏰ Your invitation expires in 16 days.</strong> After that, you'll need to request a new one to access your portal.
            </p>
          </div>
          `}
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Questions? We're here to help:</p>
          <p style="margin: 0; font-size: 14px;">
            <a href="tel:3137310817" style="color: #1A4314; text-decoration: none;">(313) 731-0817</a> • 
            <a href="mailto:bsgtires@gmail.com" style="color: #1A4314; text-decoration: none;">bsgtires@gmail.com</a>
          </p>
        </div>
      </div>

      <!-- Unsubscribe footer -->
      <div style="text-align: center; margin-top: 20px;">
        <p style="font-size: 12px; color: #94a3b8;">
          BSG Tire Recycling • 2971 Bellevue, Detroit, Michigan<br>
          <a href="${unsubscribeUrl}" style="color: #94a3b8; text-decoration: underline;">
            Stop receiving these reminders
          </a>
        </p>
      </div>

      <!-- Open tracking pixel -->
      <img src="${openTrackingUrl}" width="1" height="1" style="display:none;" alt="" />
    </body>
    </html>
  `;
}

serve(handler);
