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
        const { error: assignmentError } = await supabase
          .from('assignments')
          .insert({
            organization_id: booking.organization_id,
            pickup_id: pickupId,
            vehicle_id: vehicleId,
            driver_id: driverId,
            scheduled_date: pickupDate,
            status: 'assigned',
          });

        if (assignmentError) {
          console.error('Error creating assignment:', assignmentError);
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

    // Send confirmation email
    const emailPayload: any = {
      bookingRequestId,
      emailType: action === 'approve' ? 'approved' : action === 'modify' ? 'modified' : 'declined',
    };

    if (action === 'approve') {
      emailPayload.scheduledDate = scheduledDate || booking.requested_date;
      emailPayload.scheduledTimeWindow = scheduledTimeWindow;
    } else if (action === 'modify') {
      emailPayload.suggestedDate = suggestedDate;
      emailPayload.modificationReason = modificationReason;
    } else {
      emailPayload.declineReason = declineReason;
    }

    // Call send-booking-confirmation function
    const { error: emailError } = await supabase.functions.invoke('send-booking-confirmation', {
      body: emailPayload,
    });

    if (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the whole operation if email fails
    }

    console.log(`Booking request ${bookingRequestId} processed successfully with action: ${action}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        pickupId,
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
