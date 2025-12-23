import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TeamInviteRequest {
  invite_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invite_id }: TeamInviteRequest = await req.json();

    if (!invite_id) {
      return new Response(
        JSON.stringify({ error: "No invite_id provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the invite with related data
    const { data: invite, error: inviteError } = await supabase
      .from("client_user_invites")
      .select(`
        id,
        token,
        invited_email,
        role,
        client_id,
        organization_id,
        invited_by
      `)
      .eq("id", invite_id)
      .single();

    if (inviteError || !invite) {
      console.error("Invite not found:", inviteError);
      return new Response(
        JSON.stringify({ error: "Invite not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get client details
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("company_name")
      .eq("id", invite.client_id)
      .single();

    if (clientError || !client) {
      console.error("Client not found:", clientError);
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get inviter details
    const { data: inviter } = await supabase
      .from("users")
      .select("first_name, last_name, email")
      .eq("id", invite.invited_by)
      .single();

    const inviterName = inviter 
      ? `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.email
      : 'A team member';

    // Build the invite URL
    const appUrl = "https://treadset.lovable.app";
    const inviteUrl = `${appUrl}/client-team-invite/${invite.token}`;

    // Role display name
    const roleLabel = invite.role === 'billing' ? 'Billing Contact' : 
                      invite.role === 'viewer' ? 'Viewer' : 
                      invite.role === 'primary' ? 'Primary Contact' : invite.role;

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "BSG Tire Recycling <noreply@bsgtires.com>",
      to: [invite.invited_email],
      subject: `You've been invited to ${client.company_name}'s Client Portal`,
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
              <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">BSG Tire Recycling</h2>
              <h1 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700;">You're Invited to Join</h1>
              <p style="margin: 0; opacity: 0.9; font-size: 18px;">${client.company_name}</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">
              <p style="font-size: 16px;"><strong>${inviterName}</strong> has invited you to access ${client.company_name}'s client portal at BSG Tire Recycling.</p>
              
              <div style="background: #f0f7f0; padding: 15px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1A4314;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>Your Access Level:</strong> ${roleLabel}
                </p>
              </div>
              
              <!-- Features -->
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1A4314; font-size: 16px;">What You Can Do:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #475569;">
                  <li style="margin-bottom: 10px;"><strong>View All Manifests</strong> - Access pickup history</li>
                  <li style="margin-bottom: 10px;"><strong>Download PDFs</strong> - Get copies for your records</li>
                  <li style="margin-bottom: 0;"><strong>Print Documents</strong> - Print directly from browser</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #1A4314 0%, #2d5a1e 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(26, 67, 20, 0.3);">
                  Accept Invitation
                </a>
              </div>

              <!-- Security Note -->
              <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>🔒 Security Note:</strong> This invitation is for <strong>${invite.invited_email}</strong> only. You must sign up with this exact email address.
                </p>
              </div>

              <p style="font-size: 14px; color: #64748b;">This invitation link is valid for 7 days.</p>
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

          <!-- Footer note -->
          <div style="text-align: center; margin-top: 20px;">
            <p style="font-size: 12px; color: #94a3b8;">
              BSG Tire Recycling • 2971 Bellevue, Detroit, Michigan
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Team invite email sent to ${invite.invited_email}:`, emailResponse);

    return new Response(
      JSON.stringify({ success: true, email_sent_to: invite.invited_email }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in send-client-team-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
