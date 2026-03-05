import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PortalInviteRequest {
  client_id?: string;
  client_ids?: string[];
  test_email?: string; // Send to this email instead (for testing)
}

// Generate security token for unsubscribe links
async function generateSecurityToken(clientId: string, email: string): Promise<string> {
  const data = `${clientId}-${email}-portal-invite-salt`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Generate unsubscribe URL
async function generateUnsubscribeUrl(supabaseUrl: string, clientId: string, email: string): Promise<string> {
  const token = await generateSecurityToken(clientId, email);
  return `${supabaseUrl}/functions/v1/portal-invite-unsubscribe?client=${clientId}&token=${token}`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { client_id, client_ids, test_email }: PortalInviteRequest = await req.json();

    // Build list of client IDs to process
    const idsToProcess = client_ids || (client_id ? [client_id] : []);
    
    if (idsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ error: "No client_id or client_ids provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing portal invitations for ${idsToProcess.length} client(s)`);

    const results: Array<{ client_id: string; success: boolean; error?: string }> = [];

    for (const clientId of idsToProcess) {
      try {
        // Get client details including opt-out status
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("id, company_name, email, contact_name, organization_id, is_active, portal_invite_opted_out")
          .eq("id", clientId)
          .single();

        if (clientError || !client) {
          results.push({ client_id: clientId, success: false, error: "Client not found" });
          continue;
        }

        // Skip inactive clients
        if (client.is_active === false) {
          console.log(`[PORTAL-INVITE] Skipping inactive client: ${client.company_name}`);
          results.push({ client_id: clientId, success: false, error: "Client is inactive" });
          continue;
        }

        // Skip clients who have opted out
        if (client.portal_invite_opted_out === true) {
          console.log(`[PORTAL-INVITE] Skipping opted-out client: ${client.company_name}`);
          results.push({ client_id: clientId, success: false, error: "Client has opted out of communications" });
          continue;
        }

        // Check email preferences for full unsubscribe
        const { data: emailPrefs } = await supabase
          .from("client_email_preferences")
          .select("unsubscribed_at")
          .eq("client_id", clientId)
          .maybeSingle();

        if (emailPrefs?.unsubscribed_at) {
          console.log(`[PORTAL-INVITE] Skipping unsubscribed client: ${client.company_name}`);
          results.push({ client_id: clientId, success: false, error: "Client has unsubscribed from all emails" });
          continue;
        }

        const recipientEmail = test_email || client.email;
        if (!recipientEmail) {
          results.push({ client_id: clientId, success: false, error: "No email address" });
          continue;
        }

        // Get organization details
        const { data: org, error: orgError } = await supabase
          .from("organizations")
          .select("id, name, logo_url")
          .eq("id", client.organization_id)
          .single();

        if (orgError || !org) {
          results.push({ client_id: clientId, success: false, error: "Organization not found" });
          continue;
        }

        // Create invitation token
        const { data: invite, error: inviteError } = await supabase
          .from("client_invites")
          .insert({
            client_id: client.id,
            organization_id: org.id,
            sent_to_email: recipientEmail,
          })
          .select("id, token")
          .single();

        if (inviteError) {
          console.error(`Failed to create invite for ${clientId}:`, inviteError);
          results.push({ client_id: clientId, success: false, error: "Failed to create invite" });
          continue;
        }

        // Build tracking and invite URLs
        const appUrl = "https://app.treadset.co";
        const trackingBaseUrl = `${supabaseUrl}/functions/v1/track-email-event`;
        
        // Open tracking pixel URL
        const openTrackingUrl = `${trackingBaseUrl}?invite=${invite.id}&type=open`;
        
        // Click tracking URL (wraps the actual invite link)
        const inviteUrl = `${appUrl}/client-invite/${invite.token}`;
        const trackedInviteUrl = `${trackingBaseUrl}?invite=${invite.id}&type=click&redirect=${encodeURIComponent(inviteUrl)}`;
        
        // Book page with client pre-fill
        const bookUrl = `${appUrl}/book?client=${client.id}`;
        const trackedBookUrl = `${trackingBaseUrl}?invite=${invite.id}&type=click&redirect=${encodeURIComponent(bookUrl)}`;

        // Send the email with tracking
        const emailResponse = await resend.emails.send({
          from: "BSG Tire Recycling <noreply@bsgtires.com>",
          to: [recipientEmail],
          subject: `Welcome to Your BSG Tire Recycling Client Portal`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
              <!-- Open tracking pixel (invisible) -->
              <img src="${openTrackingUrl}" width="1" height="1" style="display:none !important;" alt="" />
              
              <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header with BSG green gradient -->
                <div style="background: linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%); color: white; padding: 40px 30px; text-align: center;">
                  <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">BSG Tire Recycling</h2>
                  <h1 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">Welcome to Your Client Portal</h1>
                  <p style="margin: 0; opacity: 0.9; font-size: 16px;">${client.company_name}</p>
                </div>

                <!-- Content -->
                <div style="padding: 30px;">
                  <p style="font-size: 16px;">Hi${client.contact_name ? ` ${client.contact_name}` : ''},</p>
                  
                  <p style="font-size: 16px;">We're excited to introduce you to the <strong>BSG Tire Recycling Client Portal</strong> - a new way to access all your tire pickup records and manage your account online.</p>
                  
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

                  <!-- Dual CTA Buttons -->
                  <div style="text-align: center; margin: 30px 0;">
                    <p style="font-size: 14px; color: #64748b; margin-bottom: 15px;">Choose how you'd like to get started:</p>
                    
                    <!-- Primary: Schedule a Pickup -->
                    <a href="${trackedBookUrl}" style="display: inline-block; background: linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(26, 67, 20, 0.3); margin-bottom: 12px;">
                      📅 Schedule a Pickup
                    </a>
                    
                    <div style="margin: 10px 0; color: #94a3b8; font-size: 14px;">or</div>
                    
                    <!-- Secondary: Access Portal -->
                    <a href="${trackedInviteUrl}" style="display: inline-block; background: white; color: #1A4314; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; border: 2px solid #1A4314;">
                      🔐 Set Up Your Portal Account
                    </a>
                    
                    <div style="margin: 15px 0 0 0;">
                      <p style="font-size: 13px; color: #94a3b8;">Already have an account? <a href="https://app.treadset.co/client-login" style="color: #1A4314; text-decoration: underline;">Sign in here</a></p>
                    </div>
                  </div>

                  <!-- Important note about email -->
                  <div style="background: #fff3cd; border: 1px solid #856404; padding: 15px; border-radius: 8px; margin: 25px 0;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                      <strong>⚠️ Important:</strong> This invitation was sent to <strong>${recipientEmail}</strong>. You must sign up using this exact email address to claim access to your portal.
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
                  <a href="${await generateUnsubscribeUrl(supabaseUrl, client.id, client.email || '')}" style="color: #94a3b8; text-decoration: underline;">
                    Unsubscribe from portal invitations
                  </a>
                </p>
              </div>
            </body>
            </html>
          `,
        });

        console.log(`Email sent to ${recipientEmail} for client ${client.company_name}:`, emailResponse);
        results.push({ client_id: clientId, success: true });

      } catch (clientError: any) {
        console.error(`Error processing client ${clientId}:`, clientError);
        results.push({ client_id: clientId, success: false, error: clientError.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: `Sent ${successCount} invitation(s), ${failCount} failed`,
        results 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-portal-invitation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
