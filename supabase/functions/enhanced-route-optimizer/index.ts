import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
  truck_type: string;
}

interface Stop {
  id: string;
  coordinates: Coordinates;
  pteCount: number;
  clientName: string;
  address: string;
  serviceTimeMinutes: number;
  notes?: string;
}

interface OptimizedRoute {
  vehicleId: string;
  vehicleName: string;
  stops: Stop[];
  totalDistance: number;
  totalTime: number;
  startTime: string;
  endTime: string;
  efficiency: number;
}

interface TruckRoute {
  distance: number;
  duration: number;
  geometry: any;
}

// BSG Tire Recycling depot coordinates (Detroit, MI)
const DEPOT: Coordinates = { lat: 42.3314, lng: -83.0458 };

// Company operating hours
const WORK_START_HOUR = 8; // 8:30 AM
const WORK_START_MINUTE = 30;
const WORK_END_HOUR = 16; // 4:30 PM  
const WORK_END_MINUTE = 30;

// Driving parameters
const AVERAGE_SPEED_MPH = 28; // Average speed in miles per hour considering traffic and stops
const SERVICE_TIME_PER_STOP = 15; // Minutes per pickup
const BREAK_TIME = 30; // 30 minute lunch break
const SETUP_TIME = 15; // Time to load/prep at depot

async function getTruckRoute(from: Coordinates, to: Coordinates, mapboxToken: string): Promise<TruckRoute | null> {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?alternatives=false&geometries=geojson&steps=false&access_token=${mapboxToken}&exclude=ferry&annotations=duration,distance`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: (route.distance / 1000) * 0.621371, // Convert meters to miles
        duration: route.duration / 60, // Convert to minutes
        geometry: route.geometry
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching truck route:', error);
    return null;
  }
}

function haversineDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 3959; // Earth's radius in miles (changed from 6371 km)
  
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Returns distance in miles
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function calculateDriveTime(distance: number): number {
  // More realistic drive time calculation considering:
  // - City driving vs highway
  // - Traffic patterns
  // - Truck limitations
  const baseTime = (distance / AVERAGE_SPEED_MPH) * 60; // Minutes (distance is now in miles)
  
  // Add buffer for truck-specific delays
  const truckBuffer = baseTime * 0.15; // 15% buffer for truck routing
  
  return Math.round(baseTime + truckBuffer);
}

function optimizeRouteOrder(stops: Stop[], mapboxToken?: string): Stop[] {
  if (stops.length <= 2) return stops;
  
  // Implement nearest neighbor with improvements
  const optimized: Stop[] = [];
  const remaining = [...stops];
  let current = DEPOT;
  
  while (remaining.length > 0) {
    let nearest = remaining[0];
    let nearestDistance = haversineDistance(current, nearest.coordinates);
    let nearestIndex = 0;
    
    // Find nearest unvisited stop
    for (let i = 1; i < remaining.length; i++) {
      const distance = haversineDistance(current, remaining[i].coordinates);
      if (distance < nearestDistance) {
        nearest = remaining[i];
        nearestDistance = distance;
        nearestIndex = i;
      }
    }
    
    optimized.push(nearest);
    remaining.splice(nearestIndex, 1);
    current = nearest.coordinates;
  }
  
  return optimized;
}

function validateWorkingHours(routeTime: number): boolean {
  const workingMinutes = (WORK_END_HOUR - WORK_START_HOUR) * 60 + (WORK_END_MINUTE - WORK_START_MINUTE);
  const totalRequiredTime = routeTime + BREAK_TIME + SETUP_TIME;
  
  return totalRequiredTime <= workingMinutes;
}

function calculateRouteEfficiency(route: OptimizedRoute): number {
  // Efficiency score based on:
  // 1. Time utilization (how well we use the work day)
  // 2. Distance efficiency (minimize driving vs service time)
  // 3. Capacity utilization
  
  const workingMinutes = (WORK_END_HOUR - WORK_START_HOUR) * 60 + (WORK_END_MINUTE - WORK_START_MINUTE);
  const timeUtilization = Math.min(route.totalTime / workingMinutes, 1);
  
  const serviceTime = route.stops.length * SERVICE_TIME_PER_STOP;
  const driveTime = route.totalTime - serviceTime;
  const driveEfficiency = serviceTime / (serviceTime + driveTime);
  
  // Combined efficiency score (0-100)
  return Math.round((timeUtilization * 0.4 + driveEfficiency * 0.6) * 100);
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
    );

    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    
    const { date, vehicleId, optimize = true } = await req.json();
    console.log('Enhanced route optimization request:', { date, vehicleId, optimize });

    // Get assignments for the specified date
    let assignmentsQuery = supabase
      .from('assignments')
      .select(`
        *,
        pickups!inner(
          id,
          pte_count,
          otr_count,
          tractor_count,
          notes,
          client:clients(company_name),
          location:locations(name, address, latitude, longitude)
        ),
        vehicles!inner(id, name, capacity)
      `)
      .eq('scheduled_date', date);

    if (vehicleId) {
      assignmentsQuery = assignmentsQuery.eq('vehicle_id', vehicleId);
    }

    const { data: assignments, error: assignmentsError } = await assignmentsQuery;
    if (assignmentsError) throw assignmentsError;

    if (!assignments || assignments.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No assignments found for the specified date',
          routes: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Group assignments by vehicle
    const vehicleGroups: Record<string, any[]> = {};
    assignments.forEach(assignment => {
      const vId = assignment.vehicle_id;
      if (!vehicleGroups[vId]) {
        vehicleGroups[vId] = [];
      }
      vehicleGroups[vId].push(assignment);
    });

    const optimizedRoutes: OptimizedRoute[] = [];

    // Process each vehicle's route
    for (const [vId, vehicleAssignments] of Object.entries(vehicleGroups)) {
      const vehicle = vehicleAssignments[0].vehicles;
      
      // Convert assignments to stops
      const stops: Stop[] = vehicleAssignments.map(assignment => ({
        id: assignment.id,
        coordinates: {
          lat: assignment.pickups.location?.latitude || DEPOT.lat,
          lng: assignment.pickups.location?.longitude || DEPOT.lng,
        },
        pteCount: assignment.pickups.pte_count || 0,
        clientName: assignment.pickups.client?.company_name || 'Unknown',
        address: assignment.pickups.location?.address || 'Address not found',
        serviceTimeMinutes: SERVICE_TIME_PER_STOP,
        notes: assignment.pickups.notes
      }));

      // Optimize stop order if requested
      const orderedStops = optimize ? optimizeRouteOrder(stops, mapboxToken) : stops;
      
      // Calculate route metrics
      let totalDistance = 0;
      let totalTime = SETUP_TIME; // Start with setup time
      let currentLocation = DEPOT;
      
      // Calculate distance and time for each leg
      for (const stop of orderedStops) {
        const distance = haversineDistance(currentLocation, stop.coordinates);
        const driveTime = calculateDriveTime(distance);
        
        console.log(`Distance from ${JSON.stringify(currentLocation)} to ${JSON.stringify(stop.coordinates)}: ${distance.toFixed(2)} miles`);
        
        totalDistance += distance;
        totalTime += driveTime + stop.serviceTimeMinutes;
        currentLocation = stop.coordinates;
      }
      
      // Add return to depot
      const returnDistance = haversineDistance(currentLocation, DEPOT);
      const returnTime = calculateDriveTime(returnDistance);
      totalDistance += returnDistance;
      totalTime += returnTime;
      
      // Add lunch break if route is long enough
      if (totalTime > 4 * 60) { // If more than 4 hours
        totalTime += BREAK_TIME;
      }
      
      // Calculate start and end times for the selected date
      const routeDate = new Date(date);
      const startTime = new Date(routeDate);
      startTime.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);
      
      const endTime = new Date(startTime.getTime() + totalTime * 60 * 1000);
      
      // Check if route fits within working hours
      const fitsWorkingHours = validateWorkingHours(totalTime);
      
      if (!fitsWorkingHours) {
        console.warn(`Route for vehicle ${vehicle.name} exceeds working hours: ${totalTime} minutes`);
      }
      
      const route: OptimizedRoute = {
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        stops: orderedStops,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalTime,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        efficiency: 0 // Will calculate below
      };
      
      route.efficiency = calculateRouteEfficiency(route);
      optimizedRoutes.push(route);
    }

    // Sort routes by efficiency (highest first)
    optimizedRoutes.sort((a, b) => b.efficiency - a.efficiency);

    console.log(`Generated ${optimizedRoutes.length} optimized routes`);

    return new Response(
      JSON.stringify({ 
        routes: optimizedRoutes,
        depot: DEPOT,
        workingHours: {
          start: `${WORK_START_HOUR}:${WORK_START_MINUTE.toString().padStart(2, '0')}`,
          end: `${WORK_END_HOUR}:${WORK_END_MINUTE.toString().padStart(2, '0')}`
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Enhanced route optimization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});