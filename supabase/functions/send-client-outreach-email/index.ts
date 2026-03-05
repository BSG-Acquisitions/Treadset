import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clientId, organizationId } = await req.json();

    if (!clientId || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'clientId and organizationId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const resend = new Resend(resendApiKey);

    // Get client info including opt-out status
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, company_name, email, contact_name, last_pickup_at, portal_invite_opted_out, is_active')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError) {
      console.error('[OUTREACH] Error fetching client:', clientError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to load client' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if client is inactive
    if (client.is_active === false) {
      console.log(`[OUTREACH] Skipping inactive client: ${client.company_name} (${client.id})`);
      return new Response(
        JSON.stringify({ success: false, error: 'Client is inactive', clientName: client.company_name }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if client has opted out at client level
    if (client.portal_invite_opted_out === true) {
      console.log(`[OUTREACH] Client opted out of communications: ${client.company_name} (${client.id})`);
      return new Response(
        JSON.stringify({ success: false, error: 'Client has opted out of communications', clientName: client.company_name }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check email preferences for outreach opt-out
    const { data: emailPrefs } = await supabase
      .from('client_email_preferences')
      .select('can_receive_outreach, unsubscribed_at')
      .eq('client_id', clientId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (emailPrefs?.can_receive_outreach === false || emailPrefs?.unsubscribed_at) {
      console.log(`[OUTREACH] Client unsubscribed from outreach emails: ${client.company_name} (${client.id})`);
      return new Response(
        JSON.stringify({ success: false, error: 'Client has unsubscribed from outreach emails', clientName: client.company_name }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Missing email is a common/expected case; return 200 to avoid surfacing as an edge runtime error.
    if (!client.email) {
      console.log(`[OUTREACH] Client has no email address: ${client.company_name} (${client.id})`);
      return new Response(
        JSON.stringify({ success: false, error: 'Client has no email address', clientName: client.company_name }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization info
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, logo_url')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgError) {
      console.warn('[OUTREACH] Error fetching org:', orgError);
    }

    const orgName = org?.name || 'TreadSet';

    // Get pickup pattern for suggested dates
    const { data: pattern, error: patternError } = await supabase
      .from('client_pickup_patterns')
      .select('frequency, typical_day_of_week')
      .eq('client_id', clientId)
      .order('confidence_score', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (patternError) {
      console.warn('[OUTREACH] Error fetching pickup pattern:', patternError);
    }

    // Calculate days since last pickup
    const daysSinceLastPickup = client.last_pickup_at 
      ? Math.round((Date.now() - new Date(client.last_pickup_at).getTime()) / (1000 * 60 * 60 * 24))
      : 30;

    // Generate suggested dates
    const suggestedDates = generateSuggestedDates(pattern?.typical_day_of_week ?? null);
    const bookingUrl = `https://app.treadset.co/public-book?client=${client.id}`;
    const contactName = client.contact_name || 'there';
    
    // Create tracking pixel URL for open tracking
    const trackingPixelUrl = `https://wvjehbozyxhmgdljwsiz.supabase.co/functions/v1/track-email-event?type=open&client=${client.id}&source=outreach`;
    
    const frequencyText = pattern?.frequency === 'weekly' ? 'weekly' : 
                         pattern?.frequency === 'biweekly' ? 'every two weeks' : 'monthly';
    const subjectLine = `${client.company_name} - Time for a tire pickup?`;
    const introText = `We noticed it's been <strong>${daysSinceLastPickup} days</strong> since your last tire pickup. Based on your usual schedule (${frequencyText}), we wanted to check in and see if you need a pickup soon.`;

    const emailHtml = `
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
              <h1 style="color: white; margin: 0; font-size: 24px;">${orgName}</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Tire Recycling Services</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <h2 style="color: #1A4314; margin: 0 0 20px 0;">Hi ${contactName}!</h2>
              
              <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
                ${introText}
              </p>

              ${suggestedDates.length > 0 ? `
              <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">📅 Suggested Dates</h3>
                <p style="color: #374151; margin: 0;">
                  ${suggestedDates.join(' • ')}
                </p>
              </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${bookingUrl}" 
                   style="display: inline-block; background: #1A4314; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  Schedule Your Pickup
                </a>
              </div>

              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Need to talk to someone? Give us a call or reply to this email. We're happy to help!
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ${orgName} • Professional Tire Recycling
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0;">
                <a href="${bookingUrl}&unsubscribe=true" style="color: #9ca3af;">Unsubscribe from these emails</a>
              </p>
              <p style="color: #b0b0b0; font-size: 10px; margin: 15px 0 0 0;">
                Powered by <a href="https://treadset.com" style="color: #1A4314; text-decoration: none;">TreadSet</a>
              </p>
              <!-- Open tracking pixel -->
              <img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    console.log(`[OUTREACH] Sending scheduling email to ${client.email} for ${client.company_name}`);
    const emailResult = await resend.emails.send({
      from: `${orgName} <noreply@bsgtires.com>`,
      to: [client.email],
      subject: subjectLine,
      html: emailHtml,
    });

    if (emailResult?.error) {
      console.error(`[OUTREACH] Error sending to ${client.email}:`, emailResult.error);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: emailResult.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update email preferences
    const { data: prefs } = await supabase
      .from('client_email_preferences')
      .select('*')
      .eq('client_id', client.id)
      .eq('organization_id', organizationId)
      .single();

    if (prefs) {
      await supabase
        .from('client_email_preferences')
        .update({
          last_outreach_sent_at: new Date().toISOString(),
          outreach_count: (prefs.outreach_count || 0) + 1,
        })
        .eq('id', prefs.id);
    } else {
      await supabase
        .from('client_email_preferences')
        .insert({
          client_id: client.id,
          organization_id: organizationId,
          can_receive_outreach: true,
          can_receive_reminders: true,
          can_receive_confirmations: true,
          last_outreach_sent_at: new Date().toISOString(),
          outreach_count: 1,
        });
    }

    console.log(`[OUTREACH] Successfully sent email to ${client.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        clientName: client.company_name,
        email: client.email 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[OUTREACH] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateSuggestedDates(typicalDay: number | null): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 1; i <= 14 && dates.length < 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dayOfWeek = date.getDay();
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    // Prioritize typical day if known
    if (typicalDay !== null && dayOfWeek === typicalDay) {
      const formatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      dates.unshift(formatted);
    } else if (dates.length < 3) {
      const formatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      dates.push(formatted);
    }
  }
  
  return dates.slice(0, 3);
}
