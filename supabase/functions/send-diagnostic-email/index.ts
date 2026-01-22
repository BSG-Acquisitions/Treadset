import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiagnosticEmailRequest {
  to: string;
  organizationId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, organizationId }: DiagnosticEmailRequest = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: 'Email address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'RESEND_API_KEY not configured',
          diagnostic: {
            step: 'api_key_check',
            status: 'failed',
            message: 'The Resend API key is not set in Edge Function secrets'
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get organization name if provided
    let orgName = 'TreadSet';
    if (organizationId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', organizationId)
        .maybeSingle();
      if (org?.name) orgName = org.name;
    }

    const timestamp = new Date().toISOString();
    const diagnosticId = crypto.randomUUID().slice(0, 8);

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
              <h1 style="color: white; margin: 0; font-size: 24px;">✅ Email Diagnostic Test</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">${orgName}</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
              <h2 style="color: #1A4314; margin: 0 0 20px 0;">Email delivery is working!</h2>
              
              <p style="color: #374151; line-height: 1.6; margin: 0 0 20px 0;">
                This is a diagnostic test email sent from TreadSet to verify your email pipeline is functioning correctly.
              </p>

              <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">📊 Diagnostic Details</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="color: #6b7280; padding: 4px 0;">Test ID:</td>
                    <td style="color: #374151; font-family: monospace;">${diagnosticId}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding: 4px 0;">Sent at:</td>
                    <td style="color: #374151;">${timestamp}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding: 4px 0;">Sender:</td>
                    <td style="color: #374151;">noreply@bsgtires.com</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding: 4px 0;">Recipient:</td>
                    <td style="color: #374151;">${to}</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; padding: 4px 0;">Pipeline:</td>
                    <td style="color: #374151;">Resend API → Edge Function</td>
                  </tr>
                </table>
              </div>

              <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <p style="color: #92400e; margin: 0; font-size: 14px;">
                  <strong>What this confirms:</strong><br>
                  ✓ Edge functions can connect to Resend<br>
                  ✓ Your domain (bsgtires.com) is verified<br>
                  ✓ Email delivery is working end-to-end
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This is an automated diagnostic email from TreadSet
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`[DIAGNOSTIC-EMAIL] Sending test email to ${to}`);

    const startTime = Date.now();
    const emailResult = await resend.emails.send({
      from: `${orgName} <noreply@bsgtires.com>`,
      to: [to],
      subject: `✅ TreadSet Email Test - ${diagnosticId}`,
      html: emailHtml,
    });
    const responseTime = Date.now() - startTime;

    if (emailResult?.error) {
      console.error('[DIAGNOSTIC-EMAIL] Resend error:', emailResult.error);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: emailResult.error,
          diagnostic: {
            step: 'send_email',
            status: 'failed',
            message: emailResult.error.message || 'Failed to send email',
            responseTime: `${responseTime}ms`,
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DIAGNOSTIC-EMAIL] Successfully sent to ${to}, message ID: ${emailResult.data?.id}`);

    // Log the diagnostic event
    await supabase
      .from('email_events')
      .insert({
        type: 'diagnostic',
        metadata: {
          diagnostic_id: diagnosticId,
          recipient: to,
          resend_message_id: emailResult.data?.id,
          response_time_ms: responseTime,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        diagnostic: {
          id: diagnosticId,
          step: 'complete',
          status: 'success',
          message: 'Email sent successfully',
          messageId: emailResult.data?.id,
          responseTime: `${responseTime}ms`,
          recipient: to,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[DIAGNOSTIC-EMAIL] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        diagnostic: {
          step: 'exception',
          status: 'failed',
          message: error.message,
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
