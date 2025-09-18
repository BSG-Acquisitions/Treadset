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

// Haversine distance calculation
function haversineDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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
    console.log('Processing booking request:', bookingData);

    // Get the default BSG organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', 'bsg')
      .single();

    if (orgError || !organization) {
      console.error('Error finding organization:', orgError);
      throw new Error('Organization not found');
    }

    const organizationId = organization.id;

    // Step 1: Find or create client
    let client;
    const { data: existingClients } = await supabase
      .from('clients')
      .select('*')
      .eq('email', bookingData.email)
      .eq('organization_id', organizationId)
      .limit(1);

    if (existingClients && existingClients.length > 0) {
      client = existingClients[0];
      console.log('Found existing client:', client.id);
    } else {
      // Create new client
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          company_name: bookingData.company,
          contact_name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone || null,
          type: 'commercial',
          organization_id: organizationId
        })
        .select()
        .single();

      if (clientError) {
        console.error('Error creating client:', clientError);
        throw clientError;
      }

      client = newClient;
      console.log('Created new client:', client.id);
    }

    // Step 2: Geocode address
    const coordinates = await geocodeAddress(bookingData.address);
    if (!coordinates) {
      throw new Error('Unable to geocode the provided address');
    }

    console.log('Geocoded coordinates:', coordinates);

    // Step 3: Find or create location
    let location;
    const { data: existingLocations } = await supabase
      .from('locations')
      .select('*')
      .eq('client_id', client.id)
      .eq('address', bookingData.address)
      .limit(1);

    if (existingLocations && existingLocations.length > 0) {
      location = existingLocations[0];
      console.log('Found existing location:', location.id);
    } else {
      // Create new location
      const { data: newLocation, error: locationError } = await supabase
        .from('locations')
        .insert({
          client_id: client.id,
          address: bookingData.address,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          organization_id: organizationId
        })
        .select()
        .single();

      if (locationError) {
        console.error('Error creating location:', locationError);
        throw locationError;
      }

      location = newLocation;
      console.log('Created new location:', location.id);
    }

    // Step 4: Generate route options for multiple days
    const dates = [];
    const baseDate = new Date(bookingData.preferredDate);
    
    // Include preferred date + next 4-7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }

    let allOptions: any[] = [];

    for (const date of dates) {
      try {
        const { data: routeData, error: routeError } = await supabase.functions.invoke('route-planner', {
          body: {
            clientId: client.id,
            locationId: location.id,
            pickupDate: date,
            pteCount: bookingData.pteCount,
            otrCount: bookingData.otrCount,
            tractorCount: bookingData.tractorCount,
            preferredWindow: bookingData.preferredWindow
          }
        });

        if (!routeError && routeData?.options) {
          allOptions.push(...routeData.options.map((opt: any) => ({
            ...opt,
            pickupDate: date
          })));
        }
      } catch (error) {
        console.error(`Error getting routes for ${date}:`, error);
      }
    }

    if (allOptions.length === 0) {
      throw new Error('No available slots found for the requested dates');
    }

    // Sort all options by added travel time and pick the best one
    allOptions.sort((a, b) => a.addedTravelTimeMinutes - b.addedTravelTimeMinutes);
    const bestOption = allOptions[0];

    console.log('Best route option:', bestOption);

    // Step 5: Create pickup and assignment
    const { data: pickup, error: pickupError } = await supabase
      .from('pickups')
      .insert({
        client_id: client.id,
        location_id: location.id,
        pickup_date: bestOption.pickupDate,
        pte_count: bookingData.pteCount,
        otr_count: bookingData.otrCount,
        tractor_count: bookingData.tractorCount,
        preferred_window: bookingData.preferredWindow,
        notes: bookingData.notes || null,
        status: 'scheduled',
        organization_id: organizationId
      })
      .select()
      .single();

    if (pickupError) {
      console.error('Error creating pickup:', pickupError);
      throw pickupError;
    }

    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert({
        pickup_id: pickup.id,
        vehicle_id: bestOption.vehicleId,
        scheduled_date: bestOption.pickupDate,
        estimated_arrival: bestOption.eta,
        sequence_order: bestOption.insertionIndex || 0,
        status: 'assigned',
        organization_id: organizationId
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError);
      throw assignmentError;
    }

    // Return confirmation data
    const confirmation = {
      success: true,
      bookingId: pickup.id,
      client: {
        name: client.contact_name,
        company: client.company_name,
        email: client.email
      },
      location: {
        address: location.address
      },
      pickup: {
        date: pickup.pickup_date,
        pteCount: pickup.pte_count,
        otrCount: pickup.otr_count,
        tractorCount: pickup.tractor_count
      },
      assignment: {
        vehicleName: bestOption.vehicleName,
        eta: bestOption.eta,
        windowLabel: bestOption.windowLabel
      },
      allOptions: allOptions.slice(0, 5) // Return top 5 options for display
    };

    return new Response(
      JSON.stringify(confirmation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Booking error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});