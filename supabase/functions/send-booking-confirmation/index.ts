import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingEmailRequest {
  bookingRequestId: string;
  emailType: 'approved' | 'modified' | 'declined';
  scheduledDate?: string;
  scheduledTimeWindow?: string;
  suggestedDate?: string;
  modificationReason?: string;
  declineReason?: string;
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

    const request: BookingEmailRequest = await req.json();
    const { bookingRequestId, emailType, scheduledDate, scheduledTimeWindow, suggestedDate, modificationReason, declineReason } = request;

    if (!bookingRequestId || !emailType) {
      return new Response(
        JSON.stringify({ error: 'bookingRequestId and emailType are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the booking request details
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select(`
        *,
        clients (
          company_name,
          contact_name,
          email
        )
      `)
      .eq('id', bookingRequestId)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking request:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipient email (from booking or linked client)
    const recipientEmail = booking.contact_email || booking.clients?.email;
    const recipientName = booking.contact_name || booking.clients?.contact_name || 'Valued Customer';
    const companyName = booking.company_name || booking.clients?.company_name || '';

    if (!recipientEmail) {
      console.log('No email address available for booking confirmation');
      return new Response(
        JSON.stringify({ success: true, message: 'No email address available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization details for branding
    const { data: org } = await supabase
      .from('organizations')
      .select('name, logo_url')
      .eq('id', booking.organization_id)
      .single();

    const orgName = org?.name || 'BSG Tire Recycling';

    // Format dates nicely
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Build email content based on type
    let subject = '';
    let htmlContent = '';

    const baseStyles = `
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1A4314; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .highlight { background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #1A4314; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        .details { margin: 15px 0; }
        .details dt { font-weight: bold; margin-top: 10px; }
        .details dd { margin-left: 0; color: #555; }
      </style>
    `;

    if (emailType === 'approved') {
      subject = `✅ Pickup Confirmed - ${formatDate(scheduledDate || booking.requested_date)}`;
      htmlContent = `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>🚛 Pickup Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>Great news! Your tire pickup request has been approved and scheduled.</p>
            
            <div class="highlight">
              <h3 style="margin-top: 0;">📅 Scheduled Pickup Details</h3>
              <dl class="details">
                <dt>Date</dt>
                <dd>${formatDate(scheduledDate || booking.requested_date)}</dd>
                ${scheduledTimeWindow ? `<dt>Time Window</dt><dd>${scheduledTimeWindow}</dd>` : ''}
                <dt>Location</dt>
                <dd>${booking.pickup_address}${booking.pickup_city ? `, ${booking.pickup_city}` : ''}${booking.pickup_state ? `, ${booking.pickup_state}` : ''} ${booking.pickup_zip || ''}</dd>
                ${companyName ? `<dt>Company</dt><dd>${companyName}</dd>` : ''}
              </dl>
            </div>

            <h3>📋 What to Expect</h3>
            <ul>
              <li>Our driver will arrive during your scheduled time window</li>
              <li>Please have tires accessible and ready for pickup</li>
              <li>The driver will complete a manifest for your records</li>
              <li>You'll receive a signed copy via email after pickup</li>
            </ul>

            <p>If you need to reschedule or have any questions, please contact us.</p>
            
            <p>Thank you for choosing ${orgName}!</p>
          </div>
          <div class="footer">
            <p>${orgName} • Professional Tire Recycling Services</p>
            <p>This email was sent regarding your pickup request.</p>
          </div>
        </div>
      `;
    } else if (emailType === 'modified') {
      const confirmUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/booking/confirm/${bookingRequestId}`;
      subject = `📅 Alternative Date Suggested for Your Pickup`;
      htmlContent = `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h1>📅 Alternative Date Available</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>We reviewed your pickup request and would like to suggest an alternative date that works better with our service routes in your area.</p>
            
            <div class="highlight">
              <h3 style="margin-top: 0;">Suggested Pickup Date</h3>
              <p style="font-size: 18px; font-weight: bold; color: #1A4314;">${formatDate(suggestedDate!)}</p>
              ${modificationReason ? `<p style="color: #666;"><em>${modificationReason}</em></p>` : ''}
            </div>

            <p style="text-align: center;">
              <a href="${confirmUrl}" class="button">✅ Confirm This Date</a>
            </p>

            <p>If this date doesn't work for you, please contact us and we'll find another option.</p>
            
            <p>Thank you for your flexibility!</p>
          </div>
          <div class="footer">
            <p>${orgName} • Professional Tire Recycling Services</p>
          </div>
        </div>
      `;
    } else if (emailType === 'declined') {
      subject = `Pickup Request Update`;
      htmlContent = `
        ${baseStyles}
        <div class="container">
          <div class="header" style="background: #666;">
            <h1>Pickup Request Update</h1>
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>Unfortunately, we're unable to fulfill your pickup request at this time.</p>
            
            ${declineReason ? `
            <div class="highlight" style="background: #fff3e0;">
              <p><strong>Reason:</strong> ${declineReason}</p>
            </div>
            ` : ''}

            <p>We'd still love to help you with your tire recycling needs. Please contact us directly to discuss alternative arrangements:</p>
            
            <ul>
              <li>Phone: (your phone number)</li>
              <li>Email: (your email)</li>
            </ul>

            <p>We apologize for any inconvenience and appreciate your understanding.</p>
          </div>
          <div class="footer">
            <p>${orgName} • Professional Tire Recycling Services</p>
          </div>
        </div>
      `;
    }

    // Send email via Resend if API key is available
    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${orgName} <noreply@bsgtires.com>`,
          to: [recipientEmail],
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text();
        console.error('Resend API error:', errorText);
        throw new Error(`Failed to send email: ${errorText}`);
      }

      console.log(`Booking confirmation email sent to ${recipientEmail}`);
    } else {
      console.log('RESEND_API_KEY not configured, skipping email send');
    }

    // Update booking request with email sent timestamp
    await supabase
      .from('booking_requests')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', bookingRequestId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${emailType} email sent to ${recipientEmail}`,
        emailSent: !!resendApiKey
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
