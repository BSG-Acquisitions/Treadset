import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessBookingRequest {
  bookingRequestId: string;
  action: 'approve' | 'modify' | 'decline';
  scheduledDate?: string;
  scheduledTimeWindow?: string;
  suggestedDate?: string;
  modificationReason?: string;
  declineReason?: string;
  adminNotes?: string;
  vehicleId?: string;
  driverId?: string;
}

// Inline email sending to avoid function-to-function invocation issues
async function sendBookingConfirmationEmail(
  supabase: any,
  bookingRequestId: string,
  emailType: 'approved' | 'modified' | 'declined',
  options: {
    scheduledDate?: string;
    scheduledTimeWindow?: string;
    suggestedDate?: string;
    modificationReason?: string;
    declineReason?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  if (!resendApiKey) {
    console.log('RESEND_API_KEY not configured, skipping email send');
    return { success: true, error: 'No API key configured' };
  }

  try {
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
      console.error('Error fetching booking for email:', bookingError);
      return { success: false, error: 'Booking not found' };
    }

    // Get recipient email
    const recipientEmail = booking.contact_email || booking.clients?.email;
    const recipientName = booking.contact_name || booking.clients?.contact_name || 'Valued Customer';
    const companyName = booking.company_name || booking.clients?.company_name || '';

    if (!recipientEmail) {
      console.log('No email address available for booking confirmation');
      return { success: true, error: 'No email address' };
    }

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name, logo_url')
      .eq('id', booking.organization_id)
      .single();

    const orgName = org?.name || 'BSG Tire Recycling';

    // Format dates
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Build email content
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

    const { scheduledDate, scheduledTimeWindow, suggestedDate, modificationReason, declineReason } = options;

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

            <p>We'd still love to help you with your tire recycling needs. Please contact us directly to discuss alternative arrangements.</p>

            <p>We apologize for any inconvenience and appreciate your understanding.</p>
          </div>
          <div class="footer">
            <p>${orgName} • Professional Tire Recycling Services</p>
          </div>
        </div>
      `;
    }

    // Send email via Resend
    console.log(`Sending ${emailType} email to ${recipientEmail}...`);
    
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
      return { success: false, error: `Resend API error: ${errorText}` };
    }

    const emailResult = await emailResponse.json();
    console.log(`Email sent successfully to ${recipientEmail}:`, emailResult);

    // Update booking request with email sent timestamp
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update({ confirmation_email_sent_at: new Date().toISOString() })
      .eq('id', bookingRequestId);

    if (updateError) {
      console.error('Error updating confirmation_email_sent_at:', updateError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error in sendBookingConfirmationEmail:', error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: ProcessBookingRequest = await req.json();
    const { bookingRequestId, action, scheduledDate, scheduledTimeWindow, suggestedDate, modificationReason, declineReason, adminNotes, vehicleId, driverId } = request;

    if (!bookingRequestId || !action) {
      return new Response(
        JSON.stringify({ error: 'bookingRequestId and action are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing booking request ${bookingRequestId} with action: ${action}`);

    // Fetch the booking request
    const { data: booking, error: bookingError } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('id', bookingRequestId)
      .single();

    if (bookingError || !booking) {
      console.error('Error fetching booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking request not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updatedBooking: any = {
      admin_notes: adminNotes,
      reviewed_at: new Date().toISOString(),
    };

    let pickupId: string | null = null;

    if (action === 'approve') {
      // Create a pickup record
      const pickupDate = scheduledDate || booking.requested_date;

      // First, check if client exists or create one
      let clientId = booking.client_id;

      if (!clientId && booking.company_name) {
        // Check for existing client
        const { data: existingClient } = await supabase
          .from('clients')
          .select('id')
          .eq('organization_id', booking.organization_id)
          .ilike('company_name', booking.company_name)
          .single();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          // Create new client
          const { data: newClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              organization_id: booking.organization_id,
              company_name: booking.company_name,
              contact_name: booking.contact_name,
              email: booking.contact_email,
              phone: booking.contact_phone,
              physical_address: booking.pickup_address,
              physical_city: booking.pickup_city,
              physical_state: booking.pickup_state,
              physical_zip: booking.pickup_zip,
            })
            .select('id')
            .single();

          if (clientError) {
            console.error('Error creating client:', clientError);
            throw clientError;
          }
          clientId = newClient.id;
          console.log(`Created new client: ${clientId}`);
        }
      }

      if (!clientId) {
        return new Response(
          JSON.stringify({ error: 'Cannot approve booking without client information' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find or create location
      let locationId: string | null = null;
      
      // Extract street address for matching (first part before comma)
      const streetAddress = booking.pickup_address?.split(',')[0]?.trim();
      console.log(`Looking for location with street address: ${streetAddress}`);
      
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('client_id', clientId)
        .eq('organization_id', booking.organization_id)
        .ilike('address', `${streetAddress}%`)
        .single();

      if (existingLocation) {
        locationId = existingLocation.id;
        console.log(`Found existing location: ${locationId}`);
      } else {
        const { data: newLocation, error: locationError } = await supabase
          .from('locations')
          .insert({
            organization_id: booking.organization_id,
            client_id: clientId,
            name: booking.company_name || 'Primary Location',
            address: booking.pickup_address,
            latitude: booking.pickup_lat,
            longitude: booking.pickup_lng,
          })
          .select('id')
          .single();

        if (locationError) {
          console.error('Error creating location:', locationError);
        } else {
          locationId = newLocation.id;
          console.log(`Created new location: ${locationId}`);
        }
      }

      // Create pickup
      const { data: pickup, error: pickupError } = await supabase
        .from('pickups')
        .insert({
          organization_id: booking.organization_id,
          client_id: clientId,
          location_id: locationId,
          pickup_date: pickupDate,
          status: 'scheduled',
          pte_count: booking.tire_estimate_pte || 0,
          otr_count: booking.tire_estimate_otr || 0,
          tractor_count: booking.tire_estimate_tractor || 0,
          notes: booking.notes ? `Self-scheduled: ${booking.notes}` : 'Self-scheduled pickup',
        })
        .select('id')
        .single();

      if (pickupError) {
        console.error('Error creating pickup:', pickupError);
        throw pickupError;
      }

      pickupId = pickup.id;
      console.log(`Created pickup: ${pickupId}`);

      // Create assignment if vehicle/driver provided
      if (vehicleId) {
        // Resolve driver_id from vehicle if not explicitly provided
        let resolvedDriverId = driverId;
        
        if (!resolvedDriverId) {
          console.log(`No driverId provided, resolving from vehicle ${vehicleId}...`);
          
          // Fetch the vehicle to get driver_email
          const { data: vehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .select('driver_email, assigned_driver_id')
            .eq('id', vehicleId)
            .single();
          
          if (vehicleError) {
            console.error('Error fetching vehicle:', vehicleError);
          } else if (vehicle) {
            // First try assigned_driver_id if available
            if (vehicle.assigned_driver_id) {
              resolvedDriverId = vehicle.assigned_driver_id;
              console.log(`Resolved driver from assigned_driver_id: ${resolvedDriverId}`);
            } 
            // Otherwise look up user by driver_email
            else if (vehicle.driver_email) {
              const { data: driverUser, error: userError } = await supabase
                .from('users')
                .select('id')
                .ilike('email', vehicle.driver_email)
                .single();
              
              if (userError) {
                console.error('Error finding driver by email:', userError);
              } else if (driverUser) {
                resolvedDriverId = driverUser.id;
                console.log(`Resolved driver from driver_email (${vehicle.driver_email}): ${resolvedDriverId}`);
              }
            }
          }
          
          if (!resolvedDriverId) {
            console.warn(`Could not resolve driver_id for vehicle ${vehicleId} - assignment will have null driver_id`);
          }
        }

        const { error: assignmentError } = await supabase
          .from('assignments')
          .insert({
            organization_id: booking.organization_id,
            pickup_id: pickupId,
            vehicle_id: vehicleId,
            driver_id: resolvedDriverId,
            scheduled_date: pickupDate,
            status: 'assigned',
          });

        if (assignmentError) {
          console.error('Error creating assignment:', assignmentError);
        } else {
          console.log(`Created assignment with driver_id: ${resolvedDriverId}`);
        }
      }

      updatedBooking = {
        ...updatedBooking,
        status: 'approved',
        pickup_id: pickupId,
        client_id: clientId,
      };

    } else if (action === 'modify') {
      if (!suggestedDate) {
        return new Response(
          JSON.stringify({ error: 'suggestedDate is required for modify action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      updatedBooking = {
        ...updatedBooking,
        status: 'modified',
        suggested_date: suggestedDate,
        modification_reason: modificationReason,
      };

    } else if (action === 'decline') {
      updatedBooking = {
        ...updatedBooking,
        status: 'declined',
        decline_reason: declineReason,
      };
    }

    // Update the booking request
    const { error: updateError } = await supabase
      .from('booking_requests')
      .update(updatedBooking)
      .eq('id', bookingRequestId);

    if (updateError) {
      console.error('Error updating booking request:', updateError);
      throw updateError;
    }

    // Send confirmation email directly (inlined to avoid function-to-function issues)
    const emailResult = await sendBookingConfirmationEmail(
      supabase,
      bookingRequestId,
      action === 'approve' ? 'approved' : action === 'modify' ? 'modified' : 'declined',
      {
        scheduledDate: scheduledDate || booking.requested_date,
        scheduledTimeWindow,
        suggestedDate,
        modificationReason,
        declineReason,
      }
    );

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      // Don't fail the whole operation, but log it clearly
    } else {
      console.log('Confirmation email sent successfully');
    }

    console.log(`Booking request ${bookingRequestId} processed successfully with action: ${action}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        pickupId,
        emailSent: emailResult.success,
        emailError: emailResult.error,
        message: `Booking request ${action}d successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing booking request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
