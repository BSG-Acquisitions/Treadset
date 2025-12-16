import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { Resend } from 'npm:resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EMAIL_FREQUENCY_DAYS = 14; // Only email clients every 14 days
const INACTIVE_THRESHOLD_DAYS = 30; // Email clients inactive for 30+ days

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const resend = resendApiKey ? new Resend(resendApiKey) : null;

    let organization_id: string | null = null;
    let sendEmails = true; // Default to sending emails
    try {
      const body = await req.json();
      organization_id = body.organization_id;
      if (body.sendEmails === false) sendEmails = false;
    } catch {
      // No body - will check all orgs
    }

    // Get organizations to check
    let orgsQuery = supabase.from('organizations').select('id, name, logo_url');
    if (organization_id) {
      orgsQuery = orgsQuery.eq('id', organization_id);
    }
    const { data: orgs, error: orgsError } = await orgsQuery;
    if (orgsError) throw orgsError;

    console.log(`[MISSING_PICKUPS] Checking ${orgs?.length || 0} organization(s), sendEmails: ${sendEmails}`);
    
    let totalNotifications = 0;
    let totalEmailsSent = 0;
    let inactiveEmailsSent = 0;
    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const currentWeekOfMonth = Math.ceil(today.getDate() / 7);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - INACTIVE_THRESHOLD_DAYS);
    
    // Track clients already processed by pattern-based system
    const processedClientIds = new Set<string>();
    
    for (const org of orgs || []) {
      const orgId = org.id;
      const orgName = org.name || 'TreadSet';
      const orgLogo = org.logo_url || '/treadset-logo.png';
      console.log(`[MISSING_PICKUPS] Processing org: ${orgId}`);

      // Get admin users to create notifications for
      const { data: adminUsers, error: usersError } = await supabase
        .from('user_organization_roles')
        .select('user_id, users!inner(auth_user_id)')
        .eq('organization_id', orgId)
        .in('role', ['admin', 'ops_manager', 'dispatcher']);

      if (usersError) {
        console.error(`[MISSING_PICKUPS] Error getting admin users for org ${orgId}:`, usersError);
        continue;
      }

      if (!adminUsers || adminUsers.length === 0) {
        console.log(`[MISSING_PICKUPS] No admin users found for org ${orgId}`);
        continue;
      }
      
      const authUserIds = adminUsers
        .map(u => (u as any).users?.auth_user_id)
        .filter(Boolean);

      const notificationsToCreate: any[] = [];

      // ============ PASS 1: PATTERN-BASED CLIENTS ============
      const { data: patterns, error: patternsError } = await supabase
        .from('client_pickup_patterns')
        .select(`
          *,
          client:clients(id, company_name, email, contact_name, is_active)
        `)
        .eq('organization_id', orgId)
        .gte('confidence_score', 60)
        .neq('frequency', 'irregular');

      if (patternsError) {
        console.error(`[MISSING_PICKUPS] Error getting patterns for org ${orgId}:`, patternsError);
      }

      for (const pattern of patterns || []) {
        const client = pattern.client;
        if (!client || !client.is_active) continue;
        
        // Track this client as processed
        processedClientIds.add(client.id);

        // Check if client should be picked up in the next week
        let shouldBeScheduled = false;
        let scheduleReason = '';

        const daysSinceLastPickup = pattern.last_pickup_date 
          ? Math.round((today.getTime() - new Date(pattern.last_pickup_date).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (pattern.frequency === 'weekly') {
          if (pattern.typical_day_of_week !== null) {
            const daysUntilTypicalDay = (pattern.typical_day_of_week - currentDayOfWeek + 7) % 7;
            if (daysUntilTypicalDay <= 7) {
              shouldBeScheduled = true;
              scheduleReason = `usually scheduled every ${DAYS_OF_WEEK[pattern.typical_day_of_week]}`;
            }
          }
          if (daysSinceLastPickup >= 7) {
            shouldBeScheduled = true;
            scheduleReason = scheduleReason || `usually picked up weekly (last pickup was ${daysSinceLastPickup} days ago)`;
          }
        } else if (pattern.frequency === 'biweekly') {
          if (daysSinceLastPickup >= 14) {
            shouldBeScheduled = true;
            scheduleReason = `usually picked up every 2 weeks (last pickup was ${daysSinceLastPickup} days ago)`;
          }
        } else if (pattern.frequency === 'monthly') {
          if (pattern.typical_week_of_month !== null && currentWeekOfMonth === pattern.typical_week_of_month) {
            shouldBeScheduled = true;
            scheduleReason = `usually picked up in week ${pattern.typical_week_of_month} of the month`;
          }
          if (daysSinceLastPickup >= 30) {
            shouldBeScheduled = true;
            scheduleReason = scheduleReason || `usually picked up monthly (last pickup was ${daysSinceLastPickup} days ago)`;
          }
        }

        if (!shouldBeScheduled) continue;

        // Check if client is already scheduled in the next 7 days
        const { data: scheduledPickups } = await supabase
          .from('pickups')
          .select('id')
          .eq('client_id', client.id)
          .eq('organization_id', orgId)
          .gte('pickup_date', today.toISOString().split('T')[0])
          .lte('pickup_date', endDate.toISOString().split('T')[0])
          .in('status', ['scheduled', 'in_progress', 'completed']);

        if (scheduledPickups && scheduledPickups.length > 0) {
          continue;
        }

        // ============ SEND AUTOMATED OUTREACH EMAIL ============
        if (sendEmails && resend && client.email) {
          await sendOutreachEmail(
            supabase,
            resend,
            orgId,
            orgName,
            orgLogo,
            client,
            daysSinceLastPickup,
            pattern.frequency,
            pattern.typical_day_of_week,
            'pattern'
          ).then(sent => {
            if (sent) totalEmailsSent++;
          });
        }

        // ============ CREATE IN-APP NOTIFICATION ============
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 3);

        const dayName = pattern.typical_day_of_week !== null 
          ? DAYS_OF_WEEK[pattern.typical_day_of_week] 
          : 'this week';
        
        const frequencyText = pattern.frequency === 'weekly' 
          ? 'weekly' 
          : pattern.frequency === 'biweekly' 
          ? 'every 2 weeks' 
          : 'monthly';
        
        const confidenceEmoji = pattern.confidence_score >= 80 
          ? '🎯' 
          : pattern.confidence_score >= 60 
          ? '✓' 
          : '~';

        const notificationTitle = `${client.company_name} may need scheduling`;

        // Create notification for EACH admin user - with per-user deduplication
        for (const authUserId of authUserIds) {
          const { data: existingNotifs } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', authUserId)
            .eq('organization_id', orgId)
            .eq('type', 'missing_pickup')
            .ilike('title', `%${client.company_name}%`)
            .gte('created_at', threeDaysAgo.toISOString());

          if (existingNotifs && existingNotifs.length > 0) {
            console.log(`[MISSING_PICKUPS] Skipping duplicate for user ${authUserId}, client ${client.company_name}`);
            continue;
          }

          notificationsToCreate.push({
            user_id: authUserId,
            organization_id: orgId,
            type: 'missing_pickup',
            title: notificationTitle,
            message: `${client.company_name} is ${scheduleReason}. They're not currently scheduled.\n\nPattern Details:\n• Frequency: ${frequencyText}${pattern.typical_day_of_week !== null ? ` on ${dayName}s` : ''}\n• Last pickup: ${daysSinceLastPickup} days ago\n• Confidence: ${pattern.confidence_score}% ${confidenceEmoji}`,
            priority: 'medium',
            metadata: {
              client_id: client.id,
              client_name: client.company_name,
              frequency: pattern.frequency,
              typical_day: dayName,
              days_since_last_pickup: daysSinceLastPickup,
              confidence_score: pattern.confidence_score,
            },
          });
        }

        console.log(`[MISSING_PICKUPS] Processed pattern-based notifications for ${client.company_name}`);
      }

      // ============ PASS 2: 30-DAY INACTIVE CLIENTS (NO PATTERN REQUIRED) ============
      console.log(`[MISSING_PICKUPS] Starting 30-day inactive client check for org ${orgId}`);
      
      const { data: inactiveClients, error: inactiveError } = await supabase
        .from('clients')
        .select('id, company_name, email, contact_name, last_pickup_at')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .not('email', 'is', null);

      if (inactiveError) {
        console.error(`[MISSING_PICKUPS] Error getting inactive clients for org ${orgId}:`, inactiveError);
      }

      for (const client of inactiveClients || []) {
        // Skip if already processed by pattern-based system
        if (processedClientIds.has(client.id)) {
          continue;
        }

        // Check if inactive for 30+ days
        const lastPickupDate = client.last_pickup_at ? new Date(client.last_pickup_at) : null;
        const daysSinceLastPickup = lastPickupDate 
          ? Math.round((today.getTime() - lastPickupDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceLastPickup < INACTIVE_THRESHOLD_DAYS) {
          continue;
        }

        // Check if client is already scheduled in the next 7 days
        const { data: scheduledPickups } = await supabase
          .from('pickups')
          .select('id')
          .eq('client_id', client.id)
          .eq('organization_id', orgId)
          .gte('pickup_date', today.toISOString().split('T')[0])
          .lte('pickup_date', endDate.toISOString().split('T')[0])
          .in('status', ['scheduled', 'in_progress', 'completed']);

        if (scheduledPickups && scheduledPickups.length > 0) {
          continue;
        }

        console.log(`[MISSING_PICKUPS] Found 30-day inactive client: ${client.company_name} (${daysSinceLastPickup} days)`);

        // ============ SEND "WE MISS YOU" EMAIL ============
        if (sendEmails && resend && client.email) {
          const sent = await sendOutreachEmail(
            supabase,
            resend,
            orgId,
            orgName,
            orgLogo,
            client,
            daysSinceLastPickup,
            'inactive',
            null,
            'inactive'
          );
          if (sent) {
            inactiveEmailsSent++;
            totalEmailsSent++;
          }
        }

        // ============ CREATE IN-APP NOTIFICATION ============
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 3);

        const notificationTitle = `${client.company_name} hasn't been serviced in ${daysSinceLastPickup} days`;

        for (const authUserId of authUserIds) {
          const { data: existingNotifs } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', authUserId)
            .eq('organization_id', orgId)
            .eq('type', 'missing_pickup')
            .ilike('title', `%${client.company_name}%`)
            .gte('created_at', threeDaysAgo.toISOString());

          if (existingNotifs && existingNotifs.length > 0) {
            continue;
          }

          notificationsToCreate.push({
            user_id: authUserId,
            organization_id: orgId,
            type: 'missing_pickup',
            title: notificationTitle,
            message: `${client.company_name} hasn't had a pickup in ${daysSinceLastPickup} days and is not scheduled. Consider reaching out to see if they need service.`,
            priority: daysSinceLastPickup >= 60 ? 'high' : 'medium',
            metadata: {
              client_id: client.id,
              client_name: client.company_name,
              days_since_last_pickup: daysSinceLastPickup,
              inactive_alert: true,
            },
          });
        }
      }

      // Insert notifications for this org
      if (notificationsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notificationsToCreate);

        if (insertError) {
          console.error(`[MISSING_PICKUPS] Error inserting notifications for org ${orgId}:`, insertError);
        } else {
          totalNotifications += notificationsToCreate.length;
          console.log(`[MISSING_PICKUPS] Inserted ${notificationsToCreate.length} notifications for org ${orgId}`);
        }
      }
    }

    console.log(`[MISSING_PICKUPS] Complete. Notifications: ${totalNotifications}, Pattern emails: ${totalEmailsSent - inactiveEmailsSent}, Inactive emails: ${inactiveEmailsSent}`);

    return new Response(
      JSON.stringify({
        success: true,
        notifications_created: totalNotifications,
        emails_sent: totalEmailsSent,
        pattern_emails: totalEmailsSent - inactiveEmailsSent,
        inactive_emails: inactiveEmailsSent,
        organizations_checked: orgs?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[MISSING_PICKUPS] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to send outreach email
async function sendOutreachEmail(
  supabase: any,
  resend: any,
  orgId: string,
  orgName: string,
  orgLogo: string,
  client: { id: string; company_name: string; email: string; contact_name?: string },
  daysSinceLastPickup: number,
  frequency: string,
  typicalDay: number | null,
  emailType: 'pattern' | 'inactive' = 'pattern'
): Promise<boolean> {
  try {
    // Check email preferences
    const { data: prefs } = await supabase
      .from('client_email_preferences')
      .select('*')
      .eq('client_id', client.id)
      .eq('organization_id', orgId)
      .single();

    // Check if can send outreach
    if (prefs?.can_receive_outreach === false) {
      console.log(`[EMAIL] Client ${client.company_name} has opted out of outreach`);
      return false;
    }

    // Check frequency limit (14 days)
    if (prefs?.last_outreach_sent_at) {
      const lastSent = new Date(prefs.last_outreach_sent_at);
      const daysSinceLastEmail = Math.round((Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastEmail < EMAIL_FREQUENCY_DAYS) {
        console.log(`[EMAIL] Skipping ${client.company_name} - last emailed ${daysSinceLastEmail} days ago`);
        return false;
      }
    }

    // Generate suggested dates based on service pattern
    const suggestedDates = generateSuggestedDates(typicalDay);
    const bookingUrl = `${Deno.env.get('SITE_URL') || 'https://treadset.com'}/book?client=${client.id}`;
    
    const contactName = client.contact_name || 'there';
    
    // Different messaging for pattern-based vs inactive clients
    let subjectLine: string;
    let introText: string;
    
    if (emailType === 'inactive') {
      subjectLine = `We miss you, ${client.company_name}!`;
      introText = `It's been a while since we last serviced your tires – <strong>${daysSinceLastPickup} days</strong> to be exact! We wanted to reach out and see if you have any tires that need recycling.`;
    } else {
      const frequencyText = frequency === 'weekly' ? 'weekly' : frequency === 'biweekly' ? 'every two weeks' : 'monthly';
      subjectLine = `${client.company_name} - Time for a tire pickup?`;
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

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: `${orgName} <onboarding@resend.dev>`,
      to: [client.email],
      subject: subjectLine,
      html: emailHtml,
    });

    if (emailError) {
      console.error(`[EMAIL] Error sending to ${client.email}:`, emailError);
      return false;
    }

    console.log(`[EMAIL] Sent ${emailType} outreach email to ${client.email}`);

    // Update or create email preferences
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
          organization_id: orgId,
          can_receive_outreach: true,
          can_receive_reminders: true,
          can_receive_confirmations: true,
          last_outreach_sent_at: new Date().toISOString(),
          outreach_count: 1,
        });
    }

    return true;
  } catch (err) {
    console.error(`[EMAIL] Exception sending to ${client.email}:`, err);
    return false;
  }
}

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
      dates.unshift(formatted); // Add to beginning
    } else if (dates.length < 3) {
      const formatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      dates.push(formatted);
    }
  }
  
  return dates.slice(0, 3);
}