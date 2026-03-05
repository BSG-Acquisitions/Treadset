import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Days between reminder emails
const DRIP_INTERVAL_DAYS = 14;

interface DripResult {
  client_id: string;
  company_name: string;
  status: 'sent' | 'skipped_recent' | 'skipped_signed_up' | 'skipped_opted_out' | 'error';
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("Starting portal invitation drip campaign...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const appUrl = "https://bsgtires.com";

    // Parse optional parameters
    let body: { organization_id?: string; dry_run?: boolean; limit?: number } = {};
    try {
      body = await req.json();
    } catch {
      // No body provided, use defaults
    }

    const dryRun = body.dry_run || false;
    const limit = body.limit || 500; // Safety limit

    console.log(`Parameters: dry_run=${dryRun}, limit=${limit}`);

    // Get all eligible clients:
    // - Has email
    // - Is active
    // - No user_id (hasn't signed up yet)
    // - Not opted out
    let query = supabase
      .from("clients")
      .select("id, company_name, email, contact_name, organization_id, user_id, portal_invite_opted_out")
      .eq("is_active", true)
      .not("email", "is", null)
      .is("user_id", null)
      .eq("portal_invite_opted_out", false)
      .limit(limit);

    if (body.organization_id) {
      query = query.eq("organization_id", body.organization_id);
    }

    const { data: eligibleClients, error: clientsError } = await query;

    if (clientsError) {
      console.error("Failed to fetch eligible clients:", clientsError);
      throw new Error("Failed to fetch eligible clients");
    }

    console.log(`Found ${eligibleClients?.length || 0} potentially eligible clients`);

    if (!eligibleClients || eligibleClients.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          summary: "No eligible clients found for drip campaign",
          stats: { total: 0, sent: 0, skipped: 0, errors: 0 }
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the most recent invite for each client
    const clientIds = eligibleClients.map(c => c.id);
    const { data: recentInvites, error: invitesError } = await supabase
      .from("client_invites")
      .select("client_id, created_at, used_at")
      .in("client_id", clientIds)
      .order("created_at", { ascending: false });

    if (invitesError) {
      console.error("Failed to fetch recent invites:", invitesError);
    }

    // Build a map of client_id -> most recent invite
    const inviteMap = new Map<string, { created_at: string; used_at: string | null }>();
    for (const invite of recentInvites || []) {
      if (!inviteMap.has(invite.client_id)) {
        inviteMap.set(invite.client_id, { created_at: invite.created_at, used_at: invite.used_at });
      }
    }

    const results: DripResult[] = [];
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - DRIP_INTERVAL_DAYS * 24 * 60 * 60 * 1000);

    for (const client of eligibleClients) {
      const lastInvite = inviteMap.get(client.id);

      // Skip if they've already signed up (used_at is set)
      if (lastInvite?.used_at) {
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'skipped_signed_up',
          message: 'Already signed up'
        });
        continue;
      }

      // Skip if last invite was sent less than DRIP_INTERVAL_DAYS ago
      if (lastInvite && new Date(lastInvite.created_at) > cutoffDate) {
        const daysSinceLastInvite = Math.floor((now.getTime() - new Date(lastInvite.created_at).getTime()) / (24 * 60 * 60 * 1000));
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'skipped_recent',
          message: `Last invite sent ${daysSinceLastInvite} days ago`
        });
        continue;
      }

      // This client is eligible for an invitation
      if (dryRun) {
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'sent',
          message: 'Would send (dry run)'
        });
        continue;
      }

      // Send the invitation
      try {
        // Create invitation token
        const { data: invite, error: inviteError } = await supabase
          .from("client_invites")
          .insert({
            client_id: client.id,
            organization_id: client.organization_id,
            sent_to_email: client.email,
          })
          .select("token")
          .single();

        if (inviteError) {
          console.error(`Failed to create invite for ${client.company_name}:`, inviteError);
          results.push({
            client_id: client.id,
            company_name: client.company_name,
            status: 'error',
            message: 'Failed to create invite token'
          });
          continue;
        }

        const inviteUrl = `${appUrl}/client-invite/${invite.token}`;
        
        // Generate unsubscribe token
        const unsubscribeToken = await generateSecurityToken(client.id, client.email);
        const unsubscribeUrl = `${supabaseUrl}/functions/v1/portal-invite-unsubscribe?client=${client.id}&token=${unsubscribeToken}`;

        const isReminder = !!lastInvite;
        const subject = isReminder 
          ? `Reminder: Your BSG Tire Recycling Client Portal Awaits`
          : `Welcome to Your BSG Tire Recycling Client Portal`;

        // Send the email
        const emailResponse = await resend.emails.send({
          from: "BSG Tire Recycling <onboarding@resend.dev>",
          to: [client.email],
          subject,
          html: generateEmailHtml(client, inviteUrl, unsubscribeUrl, isReminder),
        });

        console.log(`Email sent to ${client.email} (${client.company_name}):`, emailResponse);
        results.push({
          client_id: client.id,
          company_name: client.company_name,
          status: 'sent',
          message: isReminder ? 'Reminder sent' : 'Initial invite sent'
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
      skipped_recent: results.filter(r => r.status === 'skipped_recent').length,
      skipped_signed_up: results.filter(r => r.status === 'skipped_signed_up').length,
      skipped_opted_out: results.filter(r => r.status === 'skipped_opted_out').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    const duration = Date.now() - startTime;
    console.log(`Drip campaign completed in ${duration}ms:`, stats);

    return new Response(
      JSON.stringify({
        success: true,
        summary: `Sent ${stats.sent} invitations, skipped ${stats.skipped_recent + stats.skipped_signed_up} (${stats.skipped_recent} recent, ${stats.skipped_signed_up} signed up), ${stats.errors} errors`,
        stats,
        results: dryRun ? results : undefined, // Only include full results in dry run mode
        duration_ms: duration
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-portal-invitation-drip:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

// Generate security token for unsubscribe links
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
  inviteUrl: string,
  unsubscribeUrl: string,
  isReminder: boolean
): string {
  const greeting = client.contact_name ? `Hi ${client.contact_name}` : 'Hi there';
  const introText = isReminder
    ? `Just a friendly reminder that your <strong>BSG Tire Recycling Client Portal</strong> is ready and waiting for you! Sign up to access all your tire pickup records online.`
    : `We're excited to introduce you to the <strong>BSG Tire Recycling Client Portal</strong> - a new way to access all your tire pickup records and manage your account online.`;

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
        <div style="background: linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%); color: white; padding: 40px 30px; text-align: center;">
          <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">BSG Tire Recycling</h2>
          <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">${isReminder ? 'Your Portal is Ready!' : 'Welcome to Your Client Portal'}</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 16px;">${client.company_name}</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <p style="font-size: 16px;">${greeting},</p>
          
          <p style="font-size: 16px;">${introText}</p>
          
          <!-- Features -->
          <div style="background: #f0f7f0; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1A4314;">
            <h3 style="margin: 0 0 15px 0; color: #1A4314; font-size: 16px;">What You Can Do:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #475569;">
              <li style="margin-bottom: 10px;"><strong>View All Your Manifests</strong> - Access your complete pickup history</li>
              <li style="margin-bottom: 10px;"><strong>Download PDFs</strong> - Get copies of any manifest for your records</li>
              <li style="margin-bottom: 10px;"><strong>Print Documents</strong> - Print manifests directly from your browser</li>
              <li style="margin-bottom: 0;"><strong>Schedule Pickups</strong> - Request new tire pickups online</li>
            </ul>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(26, 67, 20, 0.3);">
              Access Your Portal
            </a>
          </div>

          <!-- Note about any email -->
          <div style="background: #f0f7f0; border: 1px solid #1A4314; padding: 15px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; font-size: 14px; color: #1A4314;">
              <strong>💡 Tip:</strong> You can sign up with any email address you prefer - it doesn't have to be the one we have on file. Share this invite with whoever manages your account!
            </p>
          </div>

          <p style="font-size: 14px; color: #64748b;">This invitation link is valid for 30 days. After signing up, you'll have instant access to your portal.</p>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">Questions? Contact us at:</p>
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
            Unsubscribe from portal invitations
          </a>
        </p>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
