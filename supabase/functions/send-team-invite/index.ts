import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  role: string;
  organization_id: string;
  personal_message?: string;
  inviter_name?: string;
  inviter_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, role, organization_id, personal_message, inviter_name, inviter_email }: InviteRequest = await req.json();

    console.log(`Creating invite for ${email} as ${role} in org ${organization_id}`);

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, logo_url")
      .eq("id", organization_id)
      .single();

    if (orgError || !org) {
      console.error("Failed to fetch organization:", orgError);
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the user_id of the inviter from auth header
    const authHeader = req.headers.get("Authorization");
    let created_by = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();
        created_by = userData?.id;
      }
    }

    // Create the invite record
    const { data: invite, error: inviteError } = await supabase
      .from("organization_invites")
      .insert({
        organization_id,
        email,
        role,
        invite_type: "email",
        personal_message,
        created_by,
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (inviteError) {
      console.error("Failed to create invite:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invite", details: inviteError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build the invite URL - use the app's URL
    const appUrl = Deno.env.get("APP_URL") || "https://wvjehbozyxhmgdljwsiz.lovableproject.com";
    const inviteUrl = `${appUrl}/invite/${invite.token}`;

    // Format role for display
    const roleDisplay = role.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());

    // Send the email
    const emailResponse = await resend.emails.send({
      from: "TreadSet <onboarding@resend.dev>",
      to: [email],
      subject: `You've been invited to join ${org.name} on TreadSet`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="${org.logo_url || 'https://wvjehbozyxhmgdljwsiz.lovableproject.com/treadset-logo.png'}" alt="${org.name}" style="max-width: 150px; height: auto;">
          </div>
          
          <div style="background: linear-gradient(135deg, #1A4314 0%, #2d5a24 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0 0 10px 0; font-size: 24px;">You're Invited!</h1>
            <p style="margin: 0; opacity: 0.9;">Join ${org.name} on TreadSet</p>
          </div>

          <p>Hi there!</p>
          
          <p>${inviter_name ? `<strong>${inviter_name}</strong> has` : "You've been"} invited you to join <strong>${org.name}</strong> as a <strong>${roleDisplay}</strong> on TreadSet.</p>
          
          ${personal_message ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1A4314;"><p style="margin: 0; font-style: italic;">"${personal_message}"</p></div>` : ""}
          
          <p>TreadSet is a tire recycling management platform that helps track pickups, manifests, and compliance documentation.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: #1A4314; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
          
          ${inviter_email ? `<p style="color: #666; font-size: 14px;">Questions? Contact ${inviter_email}</p>` : ""}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            If you weren't expecting this invitation, you can safely ignore this email.<br>
            <a href="${inviteUrl}" style="color: #1A4314; word-break: break-all;">${inviteUrl}</a>
          </p>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, invite_id: invite.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-team-invite:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
