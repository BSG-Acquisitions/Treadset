import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Day name helpers
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function generateSuggestedDates(typicalDay: number | null): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  // Generate next 3 suitable pickup dates
  for (let i = 1; i <= 14 && dates.length < 3; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() + i);
    const dayOfWeek = checkDate.getDay();
    
    // Skip weekends for non-pattern based
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    // Prioritize typical pickup day if known
    if (typicalDay !== null && dayOfWeek === typicalDay) {
      dates.unshift(checkDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
    } else if (dates.length < 3) {
      dates.push(checkDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }));
    }
  }
  
  return dates.slice(0, 3);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    if (!resendApiKey) {
      console.error('[RESEND_OUTREACH] RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);
    
    const body = await req.json();
    const dryRun = body.dryRun ?? true; // Default to dry run for safety
    const targetDate = body.targetDate ?? '2025-12-18'; // Date when broken emails were sent
    const excludeClientIds: string[] = body.excludeClientIds ?? []; // Clients to skip (e.g., already handled by phone)
    
    console.log(`[RESEND_OUTREACH] Starting ${dryRun ? 'DRY RUN' : 'LIVE'} resend for emails sent on ${targetDate}`);
    console.log(`[RESEND_OUTREACH] Excluding ${excludeClientIds.length} client(s): ${excludeClientIds.join(', ')}`);

    // Get organization info
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, logo_url')
      .eq('slug', 'bsg')
      .single();

    if (!org) {
      throw new Error('Organization not found');
    }

    // Find clients who were sent outreach emails on the target date with broken links
    // We identify them by looking at client_email_preferences where last_outreach_sent_at is on that date
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const { data: affectedClients, error: queryError } = await supabase
      .from('client_email_preferences')
      .select(`
        client_id,
        last_outreach_sent_at,
        outreach_count,
        clients (
          id,
          company_name,
          contact_name,
          email,
          organization_id
        )
      `)
      .eq('organization_id', org.id)
      .gte('last_outreach_sent_at', startOfDay)
      .lte('last_outreach_sent_at', endOfDay)
      .not('clients.email', 'is', null);

    if (queryError) {
      console.error('[RESEND_OUTREACH] Query error:', queryError);
      throw queryError;
    }

    console.log(`[RESEND_OUTREACH] Found ${affectedClients?.length || 0} clients who received emails on ${targetDate}`);

    const results = {
      totalFound: affectedClients?.length || 0,
      emailsSent: 0,
      emailsFailed: 0,
      skipped: 0,
      details: [] as any[]
    };

    if (!affectedClients || affectedClients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No affected clients found', results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each affected client
    for (const pref of affectedClients) {
      const client = pref.clients as any;
      
      if (!client || !client.email) {
        results.skipped++;
        results.details.push({
          clientId: pref.client_id,
          status: 'skipped',
          reason: 'No email address'
        });
        continue;
      }

      // Skip excluded clients (e.g., already handled by phone)
      if (excludeClientIds.includes(client.id)) {
        results.skipped++;
        results.details.push({
          clientId: client.id,
          email: client.email,
          company: client.company_name,
          status: 'skipped',
          reason: 'Excluded by request'
        });
        console.log(`[RESEND_OUTREACH] Skipping excluded client: ${client.company_name}`);
        continue;
      }

      // Check if this is a dropoff-only client (skip them - they shouldn't have received pickup emails)
      const { count: pickupCount } = await supabase
        .from('pickups')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id);
      
      const { count: dropoffCount } = await supabase
        .from('dropoffs')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', client.id);
      
      if ((dropoffCount || 0) > 0 && (pickupCount || 0) === 0) {
        results.skipped++;
        results.details.push({
          clientId: client.id,
          email: client.email,
          company: client.company_name,
          status: 'skipped',
          reason: 'Dropoff-only client'
        });
        console.log(`[RESEND_OUTREACH] Skipping dropoff-only client: ${client.company_name}`);
        continue;
      }

      const bookingUrl = `https://bsgtires.com/public-book?client=${client.id}`;
      const suggestedDates = generateSuggestedDates(null);
      const contactName = client.contact_name || 'there';

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
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
                <img src="${org.logo_url || 'https://bsgtires.com/treadset-logo.png'}" alt="${org.name}" style="height: 50px; margin-bottom: 15px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">CORRECTED: Schedule Your Pickup</h1>
              </div>
              
              <!-- Body -->
              <div style="padding: 30px;">
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Hi ${contactName},
                </p>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0;">
                  <p style="color: #92400e; margin: 0; font-size: 14px;">
                    <strong>⚠️ Our apologies:</strong> We sent you an email earlier today with a broken booking link. This corrected email contains the working link.
                  </p>
                </div>
                
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                  Ready to schedule your next tire pickup? Click below to book in just a few clicks:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${bookingUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 18px;">
                    📅 Schedule Pickup Now
                  </a>
                </div>
                
                ${suggestedDates.length > 0 ? `
                <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin-top: 25px;">
                  <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">📆 Suggested Pickup Dates:</h3>
                  <ul style="color: #15803d; margin: 0; padding-left: 20px;">
                    ${suggestedDates.map(date => `<li style="margin: 5px 0;">${date}</li>`).join('')}
                  </ul>
                </div>
                ` : ''}
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 25px;">
                  Your information is already saved - just confirm your tire counts and pick a date!
                </p>
              </div>
              
              <!-- Footer -->
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  ${org.name} • Professional Tire Recycling Services
                </p>
                <p style="color: #9ca3af; font-size: 11px; margin: 10px 0 0 0;">
                  Questions? Reply to this email or call us directly.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      if (dryRun) {
        console.log(`[RESEND_OUTREACH] DRY RUN: Would send to ${client.email} (${client.company_name})`);
        results.emailsSent++;
        results.details.push({
          clientId: client.id,
          email: client.email,
          company: client.company_name,
          status: 'dry_run',
          bookingUrl
        });
      } else {
        try {
          const emailResult = await resend.emails.send({
            from: `${org.name} <onboarding@resend.dev>`,
            to: [client.email],
            subject: `CORRECTED: ${client.company_name} - Schedule Your Tire Pickup`,
            html: emailHtml,
          });

          console.log(`[RESEND_OUTREACH] Sent corrected email to ${client.email}:`, emailResult);
          results.emailsSent++;
          results.details.push({
            clientId: client.id,
            email: client.email,
            company: client.company_name,
            status: 'sent',
            emailId: emailResult.data?.id
          });

          // Note: We don't increment outreach_count since this is a correction, not a new outreach
          // We also don't update last_outreach_sent_at to avoid affecting frequency limits

        } catch (emailError: any) {
          console.error(`[RESEND_OUTREACH] Failed to send to ${client.email}:`, emailError);
          results.emailsFailed++;
          results.details.push({
            clientId: client.id,
            email: client.email,
            company: client.company_name,
            status: 'failed',
            error: emailError.message
          });
        }
      }
    }

    console.log(`[RESEND_OUTREACH] Complete. Sent: ${results.emailsSent}, Failed: ${results.emailsFailed}, Skipped: ${results.skipped}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        dryRun,
        message: dryRun 
          ? `Dry run complete. Would send ${results.emailsSent} corrected emails.`
          : `Sent ${results.emailsSent} corrected emails, ${results.emailsFailed} failed.`,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[RESEND_OUTREACH] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
