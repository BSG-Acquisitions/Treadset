import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, dryRun = true } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all active clients with emails
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('id, company_name, contact_name, email')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .not('email', 'is', null)
      .or('portal_invite_opted_out.is.null,portal_invite_opted_out.eq.false');

    if (clientsError) {
      console.error('[RATE-INCREASE] Error fetching clients:', clientsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch clients', details: clientsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter out clients who have unsubscribed via email preferences
    const { data: optedOut } = await supabase
      .from('client_email_preferences')
      .select('client_id')
      .eq('organization_id', organizationId)
      .or('can_receive_outreach.eq.false,unsubscribed_at.not.is.null');

    const optedOutIds = new Set((optedOut || []).map((r: any) => r.client_id));

    const recipients = (clients || []).filter(
      (c: any) => c.email && !optedOutIds.has(c.id)
    );

    // DRY RUN — return list only
    if (dryRun) {
      return new Response(
        JSON.stringify({
          dryRun: true,
          totalRecipients: recipients.length,
          recipients: recipients.map((c: any) => ({
            id: c.id,
            company_name: c.company_name,
            contact_name: c.contact_name,
            email: c.email,
          })),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // LIVE SEND
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const resend = new Resend(resendApiKey);

    const fromName = 'BSG Tire Recycling';
    const fromEmail = `${fromName} <noreply@bsgtires.com>`;
    const subject = 'Important Pricing Update from BSG Tire Recycling';

    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const client of recipients) {
      const contactName = client.contact_name || 'Valued Customer';
      const unsubscribeUrl = `https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/portal-invite-unsubscribe?client=${client.id}`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1A4314 0%, #2d5a24 100%); padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">BSG Tire Recycling</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Tire Recycling Services</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 30px;">
        <h2 style="color: #1A4314; margin: 0 0 20px 0;">Important Pricing Update</h2>
        
        <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
          Dear ${contactName},
        </p>

        <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
          We hope this message finds you well. We're writing to inform you of an upcoming adjustment to our tire recycling service rates.
        </p>

        <div style="background: #f0fdf4; border-left: 4px solid #1A4314; border-radius: 0 8px 8px 0; padding: 20px; margin: 24px 0;">
          <h3 style="color: #166534; margin: 0 0 8px 0; font-size: 16px;">📋 Rate Adjustment</h3>
          <p style="color: #374151; margin: 0; line-height: 1.6;">
            Our per-tire recycling fee will be adjusted from <strong>$2.75</strong> to <strong>$3.25</strong> per tire, effective immediately.
          </p>
        </div>

        <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
          This change reflects increased operational costs including transportation, processing, and regulatory compliance. We remain committed to providing reliable, professional tire recycling services and appreciate your continued partnership.
        </p>

        <p style="color: #374151; line-height: 1.6; margin: 0 0 16px 0;">
          If you have any questions about this update, please don't hesitate to reach out to us directly. We value your business and are happy to discuss.
        </p>

        <p style="color: #374151; line-height: 1.6; margin: 20px 0 0 0;">
          Thank you for your continued trust in BSG Tire Recycling.
        </p>

        <p style="color: #374151; line-height: 1.6; margin: 16px 0 0 0;">
          Warm regards,<br>
          <strong>The BSG Tire Recycling Team</strong>
        </p>
      </div>
      
      <!-- Footer -->
      <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          BSG Tire Recycling • Professional Tire Recycling Services
        </p>
        <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0;">
          <a href="${unsubscribeUrl}" style="color: #9ca3af;">Unsubscribe from these emails</a>
        </p>
        <p style="color: #b0b0b0; font-size: 10px; margin: 15px 0 0 0;">
          Powered by <a href="https://treadset.com" style="color: #1A4314; text-decoration: none;">TreadSet</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

      try {
        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: [client.email],
          subject,
          html,
        });

        if (emailResult?.error) {
          console.error(`[RATE-INCREASE] Failed for ${client.email}:`, emailResult.error);
          results.push({ email: client.email, success: false, error: emailResult.error.message });
        } else {
          console.log(`[RATE-INCREASE] Sent to ${client.email}`);
          results.push({ email: client.email, success: true });
        }
      } catch (err: any) {
        console.error(`[RATE-INCREASE] Exception for ${client.email}:`, err);
        results.push({ email: client.email, success: false, error: err.message });
      }

      // 200ms delay between sends
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        dryRun: false,
        totalRecipients: recipients.length,
        sent,
        failed,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[RATE-INCREASE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
