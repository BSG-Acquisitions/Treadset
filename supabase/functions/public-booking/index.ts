import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BookingRequest {
  name: string;
  email: string;
  phone?: string;
  company: string;
  address: string;
  pteCount: number;
  otrCount: number;
  tractorCount: number;
  preferredDate: string;
  preferredWindow: 'AM' | 'PM' | 'Any';
  notes?: string;
  source?: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface OrgSettings {
  min_tire_threshold: number;
  auto_approve_existing_clients: boolean;
  auto_approve_in_zone: boolean;
  outreach_frequency_days: number;
}

// Geocoding functions
async function geocodeWithGoogle(address: string): Promise<Coordinates | null> {
  try {
    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.log('Google Maps API key not found, falling back to Nominatim');
      return null;
    }

    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    
    console.log('Google geocoding failed:', data.status);
    return null;
  } catch (error) {
    console.error('Google geocoding error:', error);
    return null;
  }
}

async function geocodeWithNominatim(address: string): Promise<Coordinates | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'TreadSet Route Planner/1.0'
        }
      }
    );
    
    const data = await response.json();
    
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    
    return null;
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return null;
  }
}

async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const geocoder = Deno.env.get('GEOCODER') || 'nominatim';
  
  let coords: Coordinates | null = null;
  
  if (geocoder === 'google') {
    coords = await geocodeWithGoogle(address);
  }
  
  if (!coords) {
    coords = await geocodeWithNominatim(address);
  }
  
  return coords;
}

// Parse address components
function parseAddress(fullAddress: string): { city?: string; state?: string; zip?: string } {
  const parts = fullAddress.split(',').map(p => p.trim());
  const result: { city?: string; state?: string; zip?: string } = {};
  
  if (parts.length >= 2) {
    result.city = parts[parts.length - 3] || parts[0];
    
    const lastPart = parts[parts.length - 2] || parts[parts.length - 1];
    const stateZipMatch = lastPart.match(/([A-Za-z]+)\s*(\d{5})?/);
    if (stateZipMatch) {
      result.state = stateZipMatch[1];
      result.zip = stateZipMatch[2];
    }
    
    const zipMatch = fullAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (zipMatch) {
      result.zip = zipMatch[1];
    }
  }
  
  return result;
}

// Day name to number conversion
const DAY_NAME_TO_NUMBER: Record<string, number> = {
  'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
  'thursday': 4, 'friday': 5, 'saturday': 6
};

function convertServiceDays(days: (string | number)[]): number[] {
  return days.map(d => {
    if (typeof d === 'number') return d;
    return DAY_NAME_TO_NUMBER[d.toLowerCase()] ?? -1;
  }).filter(d => d >= 0);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    
    // Handle different actions
    if (body.action === 'check-client') {
      // Secure client lookup for pre-fill - returns ONLY safe public data
      console.log('[PUBLIC_BOOKING] Client lookup request for:', body.clientId);
      
      if (!body.clientId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Client ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get client with their primary location for address fallback
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, email, phone, physical_address, physical_city, physical_state, physical_zip, mailing_address, city, state, zip')
        .eq('id', body.clientId)
        .single();

      if (clientError || !client) {
        console.log('[PUBLIC_BOOKING] Client not found:', body.clientId);
        return new Response(
          JSON.stringify({ success: false, error: 'Client not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Also check for location address as fallback
      const { data: location } = await supabase
        .from('locations')
        .select('address')
        .eq('client_id', body.clientId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      // Build address with multiple fallbacks
      let fullAddress = '';
      if (client.physical_address) {
        fullAddress = `${client.physical_address}${client.physical_city ? ', ' + client.physical_city : ''}${client.physical_state ? ', ' + client.physical_state : ''}${client.physical_zip ? ' ' + client.physical_zip : ''}`;
      } else if (client.mailing_address) {
        fullAddress = `${client.mailing_address}${client.city ? ', ' + client.city : ''}${client.state ? ', ' + client.state : ''}${client.zip ? ' ' + client.zip : ''}`;
      } else if (location?.address) {
        fullAddress = location.address;
      }

      // Return safe pre-fill data with proper fallbacks
      const safeClientData = {
        name: client.contact_name || client.company_name || '',
        company: client.company_name || '',
        email: client.email || '',
        phone: client.phone || '',
        address: fullAddress,
        isReturningClient: true,
      };

      console.log('[PUBLIC_BOOKING] Returning safe client data for pre-fill:', safeClientData);
      return new Response(
        JSON.stringify({ success: true, client: safeClientData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle zone check action
    if (body.action === 'check-zone') {
      console.log('[PUBLIC_BOOKING] Zone check request for ZIP:', body.zipCode);
      
      // Get the default BSG organization
      const { data: organization } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'bsg')
        .single();

      if (organization && body.zipCode) {
        const { data: zones } = await supabase
          .from('service_zones')
          .select('id, zone_name, primary_service_days, zip_codes')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
          .contains('zip_codes', [body.zipCode]);

        if (zones && zones.length > 0) {
          return new Response(
            JSON.stringify({ success: true, zone: zones[0] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, zone: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: process booking request
    const bookingData: BookingRequest = body;
    console.log('[PUBLIC_BOOKING] Processing booking request:', bookingData);

    // Get the default BSG organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'bsg')
      .single();

    if (orgError || !organization) {
      console.error('[PUBLIC_BOOKING] Error finding organization:', orgError);
      throw new Error('Organization not found');
    }

    const organizationId = organization.id;

    // Get organization settings for minimum tire threshold and auto-approval
    const { data: orgSettings } = await supabase
      .from('organization_settings')
      .select('min_tire_threshold, auto_approve_existing_clients, auto_approve_in_zone, outreach_frequency_days')
      .eq('organization_id', organizationId)
      .single();

    const settings: OrgSettings = {
      min_tire_threshold: orgSettings?.min_tire_threshold ?? 50,
      auto_approve_existing_clients: orgSettings?.auto_approve_existing_clients ?? false,
      auto_approve_in_zone: orgSettings?.auto_approve_in_zone ?? false,
      outreach_frequency_days: orgSettings?.outreach_frequency_days ?? 14,
    };

    // Calculate total PTE value
    const estimatedPteValue = 
      (bookingData.pteCount * 1) + 
      (bookingData.otrCount * 15) + 
      (bookingData.tractorCount * 5);

    // Validate minimum tire threshold
    if (estimatedPteValue < settings.min_tire_threshold) {
      console.log(`[PUBLIC_BOOKING] Below minimum threshold: ${estimatedPteValue} < ${settings.min_tire_threshold}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Minimum ${settings.min_tire_threshold} PTE required for pickup. You have ${estimatedPteValue} PTE.`,
          code: 'BELOW_MINIMUM'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Geocode the address
    const coordinates = await geocodeAddress(bookingData.address);
    console.log('[PUBLIC_BOOKING] Geocoded coordinates:', coordinates);

    // Parse address components
    const addressParts = parseAddress(bookingData.address);
    console.log('[PUBLIC_BOOKING] Parsed address:', addressParts);

    // Check for matching service zone by ZIP code
    let matchedZone: any = null;
    let zoneSuggestedDates: string[] = [];
    
    if (addressParts.zip) {
      const { data: zones } = await supabase
        .from('service_zones')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .contains('zip_codes', [addressParts.zip]);

      if (zones && zones.length > 0) {
        matchedZone = zones[0];
        console.log('[PUBLIC_BOOKING] Matched service zone:', matchedZone.zone_name);
        
        // Generate suggested dates based on zone service days
        const serviceDays = convertServiceDays(matchedZone.primary_service_days || []);
        if (serviceDays.length > 0) {
          const today = new Date();
          for (let i = 1; i < 21 && zoneSuggestedDates.length < 3; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            if (serviceDays.includes(checkDate.getDay())) {
              zoneSuggestedDates.push(checkDate.toISOString().split('T')[0]);
            }
          }
        }
      }
    }

    // Check if this is an existing client (for auto-approval)
    let existingClient: any = null;
    if (bookingData.email) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, company_name')
        .eq('organization_id', organizationId)
        .ilike('email', bookingData.email)
        .limit(1);
      
      if (clients && clients.length > 0) {
        existingClient = clients[0];
        console.log('[PUBLIC_BOOKING] Matched existing client:', existingClient.company_name);
      }
    }

    // Determine if we should auto-approve
    const shouldAutoApprove = 
      (settings.auto_approve_existing_clients && existingClient) ||
      (settings.auto_approve_in_zone && matchedZone);
    
    const bookingStatus = shouldAutoApprove ? 'approved' : 'pending';
    console.log('[PUBLIC_BOOKING] Auto-approve decision:', { shouldAutoApprove, bookingStatus, existingClient: !!existingClient, matchedZone: !!matchedZone });

    // Create booking request
    const { data: bookingRequest, error: bookingError } = await supabase
      .from('booking_requests')
      .insert({
        organization_id: organizationId,
        contact_name: bookingData.name,
        contact_email: bookingData.email,
        contact_phone: bookingData.phone || null,
        company_name: bookingData.company,
        pickup_address: bookingData.address,
        pickup_city: addressParts.city || null,
        pickup_state: addressParts.state || null,
        pickup_zip: addressParts.zip || null,
        pickup_lat: coordinates?.lat || null,
        pickup_lng: coordinates?.lng || null,
        requested_date: bookingData.preferredDate,
        preferred_time_window: bookingData.preferredWindow,
        tire_estimate_pte: bookingData.pteCount,
        tire_estimate_otr: bookingData.otrCount,
        tire_estimate_tractor: bookingData.tractorCount,
        notes: bookingData.notes || null,
        status: bookingStatus,
        zone_id: matchedZone?.id || null,
        zone_matched: !!matchedZone,
        estimated_value: estimatedPteValue,
        client_id: existingClient?.id || null,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('[PUBLIC_BOOKING] Error creating booking request:', bookingError);
      throw bookingError;
    }

    console.log('[PUBLIC_BOOKING] Created booking request:', bookingRequest.id);

    // Log analytics event
    await supabase.from('booking_analytics').insert({
      organization_id: organizationId,
      event_type: 'booking_completed',
      booking_request_id: bookingRequest.id,
      client_id: existingClient?.id || null,
      source: bookingData.source || 'direct',
      metadata: {
        estimated_pte: estimatedPteValue,
        zone_matched: !!matchedZone,
        auto_approved: shouldAutoApprove,
        existing_client: !!existingClient,
      }
    });

    // If auto-approved, create the pickup and client if needed
    if (shouldAutoApprove) {
      let clientId = existingClient?.id;
      
      // Create client if doesn't exist
      if (!clientId) {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({
            organization_id: organizationId,
            company_name: bookingData.company,
            contact_name: bookingData.name,
            email: bookingData.email,
            phone: bookingData.phone,
            physical_address: bookingData.address,
            physical_city: addressParts.city,
            physical_state: addressParts.state,
            physical_zip: addressParts.zip,
            depot_lat: coordinates?.lat,
            depot_lng: coordinates?.lng,
          })
          .select()
          .single();
        
        if (newClient) {
          clientId = newClient.id;
        }
      }

      // Create pickup
      if (clientId) {
        const { data: pickup } = await supabase
          .from('pickups')
          .insert({
            organization_id: organizationId,
            client_id: clientId,
            pickup_date: bookingData.preferredDate,
            status: 'scheduled',
            pte_count: bookingData.pteCount,
            otr_count: bookingData.otrCount,
            tractor_count: bookingData.tractorCount,
            notes: `Self-scheduled via booking form. ${bookingData.notes || ''}`.trim(),
          })
          .select()
          .single();

        if (pickup) {
          // Link pickup to booking request
          await supabase
            .from('booking_requests')
            .update({ pickup_id: pickup.id })
            .eq('id', bookingRequest.id);

          // Log approval analytics
          await supabase.from('booking_analytics').insert({
            organization_id: organizationId,
            event_type: 'booking_approved',
            booking_request_id: bookingRequest.id,
            client_id: clientId,
            source: bookingData.source || 'direct',
            metadata: { auto_approved: true }
          });
        }
      }
    }

    // Return confirmation data
    const confirmation = {
      success: true,
      bookingRequestId: bookingRequest.id,
      status: bookingStatus,
      autoApproved: shouldAutoApprove,
      message: shouldAutoApprove 
        ? 'Your pickup has been automatically approved and scheduled!'
        : 'Your pickup request has been submitted and is pending review.',
      contact: {
        name: bookingData.name,
        company: bookingData.company,
        email: bookingData.email
      },
      location: {
        address: bookingData.address,
        city: addressParts.city,
        state: addressParts.state,
        zip: addressParts.zip
      },
      requestedDate: bookingData.preferredDate,
      preferredWindow: bookingData.preferredWindow,
      tireEstimates: {
        pte: bookingData.pteCount,
        otr: bookingData.otrCount,
        tractor: bookingData.tractorCount,
        totalPte: estimatedPteValue
      },
      zoneMatched: !!matchedZone,
      zoneName: matchedZone?.zone_name || null,
      suggestedDates: zoneSuggestedDates,
      existingClient: !!existingClient
    };

    return new Response(
      JSON.stringify(confirmation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[PUBLIC_BOOKING] Booking error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error?.message || 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
