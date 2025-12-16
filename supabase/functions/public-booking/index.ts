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
}

interface Coordinates {
  lat: number;
  lng: number;
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
          'User-Agent': 'BSG Route Planner/1.0 (support@bsglogistics.com)'
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
  
  // Fallback to Nominatim if Google fails or isn't configured
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
    
    // Parse state and zip from last part (e.g., "MI 48000" or "Michigan 48000")
    const lastPart = parts[parts.length - 2] || parts[parts.length - 1];
    const stateZipMatch = lastPart.match(/([A-Za-z]+)\s*(\d{5})?/);
    if (stateZipMatch) {
      result.state = stateZipMatch[1];
      result.zip = stateZipMatch[2];
    }
    
    // Try to extract zip from end of address
    const zipMatch = fullAddress.match(/\b(\d{5})(?:-\d{4})?\b/);
    if (zipMatch) {
      result.zip = zipMatch[1];
    }
  }
  
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const bookingData: BookingRequest = await req.json();
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

    // Geocode the address
    const coordinates = await geocodeAddress(bookingData.address);
    console.log('[PUBLIC_BOOKING] Geocoded coordinates:', coordinates);

    // Parse address components
    const addressParts = parseAddress(bookingData.address);
    console.log('[PUBLIC_BOOKING] Parsed address:', addressParts);

    // Check for matching service zone by ZIP code
    let matchedZone = null;
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
        console.log('[PUBLIC_BOOKING] Matched service zone:', matchedZone.name);
        
        // Generate suggested dates based on zone service days
        if (matchedZone.service_days && matchedZone.service_days.length > 0) {
          const today = new Date();
          const suggestedDates = [];
          
          for (let i = 0; i < 14 && suggestedDates.length < 3; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() + i);
            const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });
            
            if (matchedZone.service_days.includes(dayName)) {
              suggestedDates.push(checkDate.toISOString().split('T')[0]);
            }
          }
          
          zoneSuggestedDates = suggestedDates;
        }
      }
    }

    // Calculate estimated PTE value for prioritization
    const estimatedPteValue = 
      (bookingData.pteCount * 1) + 
      (bookingData.otrCount * 15) + 
      (bookingData.tractorCount * 5);

    // Create booking request (goes to approval queue)
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
        status: 'pending',
        zone_id: matchedZone?.id || null,
        zone_matched: !!matchedZone,
        estimated_value: estimatedPteValue
      })
      .select()
      .single();

    if (bookingError) {
      console.error('[PUBLIC_BOOKING] Error creating booking request:', bookingError);
      throw bookingError;
    }

    console.log('[PUBLIC_BOOKING] Created booking request:', bookingRequest.id);

    // Return confirmation data
    const confirmation = {
      success: true,
      bookingRequestId: bookingRequest.id,
      status: 'pending',
      message: 'Your pickup request has been submitted and is pending review.',
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
        tractor: bookingData.tractorCount
      },
      zoneMatched: !!matchedZone,
      zoneName: matchedZone?.name || null,
      suggestedDates: zoneSuggestedDates
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
