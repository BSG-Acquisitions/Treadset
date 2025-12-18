import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  to: string;
  emailType?: 'pattern' | 'inactive';
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[TEST-EMAIL] RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(resendApiKey);
    const { to, emailType = 'pattern' } = await req.json() as TestEmailRequest;

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Missing 'to' email address" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[TEST-EMAIL] Sending test outreach email to ${to}`);

    // Sample data for the test email
    const orgName = "BSG Tire Recycling";
    const contactName = "Zach";
    const companyName = "Test Company";
    const daysSinceLastPickup = 21;
    const frequency = "biweekly";
    const bookingUrl = `https://treadset.lovable.app/public-book`;

    // Generate suggested dates (next 3 typical pickup days)
    const suggestedDates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      // Assume typical pickup day is Tuesday (2)
      if (dayOfWeek === 2) {
        suggestedDates.push(date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
        if (suggestedDates.length >= 3) break;
      }
    }

    // Different messaging for pattern-based vs inactive clients
    let subjectLine: string;
    let introText: string;
    
    if (emailType === 'inactive') {
      subjectLine = `We miss you, ${companyName}! [TEST EMAIL]`;
      introText = `It's been a while since we last serviced your tires – <strong>${daysSinceLastPickup} days</strong> to be exact! We wanted to reach out and see if you have any tires that need recycling.`;
    } else {
      const frequencyText = frequency === 'weekly' ? 'weekly' : frequency === 'biweekly' ? 'every two weeks' : 'monthly';
      subjectLine = `${companyName} - Time for a tire pickup? [TEST EMAIL]`;
      introText = `We noticed it's been <strong>${daysSinceLastPickup} days</strong> since your last tire pickup. Based on your usual schedule (${frequencyText}), we wanted to check in and see if you need a pickup soon.`;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Test Email Banner -->
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px; margin-bottom: 16px; text-align: center;">
            <p style="color: #92400e; margin: 0; font-weight: 600;">⚠️ TEST EMAIL - This is a sample of what clients receive</p>
          </div>
          
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
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send the test email
    console.log(`[TEST-EMAIL] Attempting to send to ${to} from noreply@bsgtires.com`);
    const emailResult = await resend.emails.send({
      from: `${orgName} <noreply@bsgtires.com>`,
      to: [to],
      subject: subjectLine,
      html: emailHtml,
    });

    if (emailResult?.error) {
      console.error(`[TEST-EMAIL] Error:`, emailResult.error);
      return new Response(
        JSON.stringify({ error: emailResult.error.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[TEST-EMAIL] Successfully sent test email to ${to}`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Test email sent to ${to}`,
        emailId: emailResult?.data?.id 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[TEST-EMAIL] Exception:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
