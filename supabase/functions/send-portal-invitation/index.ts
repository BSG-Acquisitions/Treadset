import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PortalInviteRequest {
  client_id?: string;
  client_ids?: string[];
  test_email?: string; // Send to this email instead (for testing)
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
        // Get client details
        const { data: client, error: clientError } = await supabase
          .from("clients")
          .select("id, company_name, email, contact_name, organization_id")
          .eq("id", clientId)
          .single();

        if (clientError || !client) {
          results.push({ client_id: clientId, success: false, error: "Client not found" });
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
          .select("token")
          .single();

        if (inviteError) {
          console.error(`Failed to create invite for ${clientId}:`, inviteError);
          results.push({ client_id: clientId, success: false, error: "Failed to create invite" });
          continue;
        }

        // Build the invite URL
        const appUrl = "https://treadset.lovable.app";
        const inviteUrl = `${appUrl}/client-invite/${invite.token}`;

        // Send the email
        const emailResponse = await resend.emails.send({
          from: "BSG Tire Recycling <onboarding@resend.dev>",
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
              <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                
                <!-- Header with BSG green gradient -->
                <div style="background: linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%); color: white; padding: 40px 30px; text-align: center;">
                  <img src="https://treadset.lovable.app/bsg-logo.png" alt="BSG Tire Recycling" style="max-width: 120px; height: auto; margin-bottom: 20px;">
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
                    <a href="tel:5173945566" style="color: #1A4314; text-decoration: none;">(517) 394-5566</a> • 
                    <a href="mailto:info@bsgtires.com" style="color: #1A4314; text-decoration: none;">info@bsgtires.com</a>
                  </p>
                </div>
              </div>

              <!-- Unsubscribe footer -->
              <div style="text-align: center; margin-top: 20px;">
                <p style="font-size: 12px; color: #94a3b8;">
                  BSG Tire Recycling • 1234 Recycling Way, Lansing, MI<br>
                  <a href="${inviteUrl}" style="color: #1A4314; word-break: break-all;">${inviteUrl}</a>
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
