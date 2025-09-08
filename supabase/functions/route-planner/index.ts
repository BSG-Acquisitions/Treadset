import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Coordinates {
  lat: number;
  lng: number;
}

interface Vehicle {
  id: string;
  name: string;
  capacity: number;
}

interface Stop {
  id: string;
  coordinates: Coordinates;
  pteCount: number;
}

interface Assignment {
  id: string;
  vehicleId: string;
  stop: Stop;
  estimatedArrival: Date;
  sequenceOrder: number;
}

interface RouteOption {
  vehicleId: string;
  vehicleName: string;
  eta: string;
  windowLabel: string;
  insertionIndex: number;
  addedTravelTimeMinutes: number;
  remainingCapacity: number;
}

// Haversine distance calculation
function haversineDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function calculateTravelTime(distanceKm: number): number {
  const averageSpeedKmh = 40; // 40 km/h average speed
  const serviceTimeMinutes = 10; // 10 minutes service time per stop
  
  const travelTimeHours = distanceKm / averageSpeedKmh;
  const travelTimeMinutes = travelTimeHours * 60;
  
  return Math.round(travelTimeMinutes + serviceTimeMinutes);
}

function getTimeWindowLabel(eta: Date): string {
  const hour = eta.getHours();
  
  if (hour < 12) {
    return 'AM';
  } else if (hour < 17) {
    return 'PM';
  } else {
    return 'Evening';
  }
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { clientId, locationId, pickupDate, pteCount, preferredWindow } = await req.json()

    console.log('Route planner request:', { clientId, locationId, pickupDate, pteCount, preferredWindow });

    // Get client/location coordinates
    let candidateCoordinates: Coordinates;
    
    if (locationId) {
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id, address, latitude, longitude')
        .eq('id', locationId)
        .single();
      
      if (locationError) throw locationError;

      let lat = location?.latitude as number | null;
      let lng = location?.longitude as number | null;

      // If coordinates missing, try to geocode and update
      if ((!lat || !lng) && location?.id) {
        try {
          const { data: geoData, error: geoError } = await supabase.functions.invoke('geocode-locations', {
            body: { locationId: location.id }
          });
          if (geoError) console.error('Geocode function error:', geoError);
          if (geoData?.location) {
            lat = geoData.location.latitude;
            lng = geoData.location.longitude;
          } else {
            // Re-fetch to see if updated
            const { data: loc2 } = await supabase
              .from('locations')
              .select('latitude, longitude')
              .eq('id', location.id)
              .single();
            if (loc2) {
              lat = loc2.latitude as number | null;
              lng = loc2.longitude as number | null;
            }
          }
        } catch (e) {
          console.error('Geocoding attempt failed:', e);
        }
      }

      if (!lat || !lng) {
        throw new Error('Location coordinates not found');
      }

      candidateCoordinates = { lat, lng };
    } else {
      // Use Austin default if no specific location
      candidateCoordinates = { lat: 30.2672, lng: -97.7431 };
    }

    // Get all active vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .eq('is_active', true);

    if (vehiclesError) throw vehiclesError;

    // Get existing assignments for the target date
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        *,
        pickups!inner(pte_count),
        vehicles!inner(*)
      `)
      .eq('scheduled_date', pickupDate);

    if (assignmentsError) throw assignmentsError;

    // Austin depot coordinates (hardcoded for now)
    const depot: Coordinates = { lat: 30.2672, lng: -97.7431 };
    const serviceStart = "08:00";
    const serviceEnd = "18:00";

    const candidateStop: Stop = {
      id: 'candidate',
      coordinates: candidateCoordinates,
      pteCount: pteCount || 0
    };

    const options: RouteOption[] = [];

    // Process each vehicle
    for (const vehicle of vehicles || []) {
      // Get existing assignments for this vehicle
      const vehicleAssignments = assignments?.filter(a => a.vehicle_id === vehicle.id) || [];
      
      // Calculate used capacity
      const usedCapacity = vehicleAssignments.reduce((sum, a) => sum + (a.pickups?.pte_count || 0), 0);
      const remainingCapacity = vehicle.capacity - usedCapacity;
      
      if (remainingCapacity < pteCount) {
        console.log(`Vehicle ${vehicle.name} has insufficient capacity: ${remainingCapacity} < ${pteCount}`);
        continue;
      }

      // Try different insertion points
      const numExistingStops = vehicleAssignments.length;
      
      for (let insertionIndex = 0; insertionIndex <= numExistingStops; insertionIndex++) {
        // Calculate ETA for this insertion point
        const serviceStartTime = parseTime(serviceStart);
        const targetDate = new Date(pickupDate + 'T00:00:00Z');
        const startDateTime = new Date(targetDate);
        startDateTime.setUTCHours(serviceStartTime.hours, serviceStartTime.minutes, 0, 0);
        
        let currentTime = new Date(startDateTime);
        let candidateETA: Date | null = null;
        
        // Simulate the route with the new stop inserted
        const route: Coordinates[] = [depot];
        
        // Add existing stops before insertion point
        for (let i = 0; i < insertionIndex; i++) {
          if (vehicleAssignments[i]) {
            // For now, use depot coordinates for existing stops (would need location data)
            route.push(depot); // Simplified - would use actual stop coordinates
          }
        }
        
        // Add candidate stop
        route.push(candidateCoordinates);
        
        // Calculate travel to candidate stop
        if (route.length >= 2) {
          const lastIndex = route.length - 2;
          const distance = haversineDistance(route[lastIndex], route[route.length - 1]);
          const travelTime = calculateTravelTime(distance);
          
          currentTime = new Date(currentTime.getTime() + travelTime * 60 * 1000);
          candidateETA = new Date(currentTime);
          
          // Check if within service hours
          const serviceEndTime = parseTime(serviceEnd);
          if (currentTime.getUTCHours() * 60 + currentTime.getUTCMinutes() > serviceEndTime.hours * 60 + serviceEndTime.minutes) {
            continue; // Skip this option
          }
          
          // Filter by preferred window if specified
          if (preferredWindow && preferredWindow !== 'Any') {
            const windowLabel = getTimeWindowLabel(candidateETA);
            if (windowLabel !== preferredWindow) {
              continue;
            }
          }
        }
        
        if (candidateETA) {
          // Calculate added travel time (simplified)
          let addedTravelTime = 10; // Base service time
          
          if (insertionIndex === 0) {
            const depotToCandidate = haversineDistance(depot, candidateCoordinates);
            addedTravelTime += calculateTravelTime(depotToCandidate);
          }
          
          options.push({
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            eta: candidateETA.toISOString(),
            windowLabel: getTimeWindowLabel(candidateETA),
            insertionIndex,
            addedTravelTimeMinutes: addedTravelTime,
            remainingCapacity: remainingCapacity - pteCount
          });
        }
      }
    }

    // Sort by added travel time and return top 5
    options.sort((a, b) => a.addedTravelTimeMinutes - b.addedTravelTimeMinutes);
    const topOptions = options.slice(0, 5);

    console.log(`Found ${topOptions.length} route options`);

    return new Response(
      JSON.stringify({ options: topOptions }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Route planner error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})