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

interface Trip {
  tripNumber: number;
  stops: Stop[];
  currentLoad: number;
  needsDumpRun: boolean;
  estimatedDuration: number;
}

interface OptimizedRoute {
  vehicleId: string;
  vehicleName: string;
  trips: Trip[];
  totalDistance: number;
  totalTime: number;
  startTime: string;
  endTime: string;
  efficiency: number;
  totalDumpRuns: number;
}

// BSG Tire Recycling depot coordinates (Austin, TX)
const DEPOT: Coordinates = { lat: 30.2672, lng: -97.7431 };

// Company operating hours & trip parameters
const WORK_START_HOUR = 8;
const WORK_START_MINUTE = 30;
const WORK_END_HOUR = 16;
const WORK_END_MINUTE = 30;
const AVERAGE_SPEED_KMH = 45;
const SERVICE_TIME_PER_STOP = 15; // Minutes per pickup
const DUMP_TIME = 45; // Time to dump at facility
const BREAK_TIME = 30; // Lunch break
const SETUP_TIME = 15; // Daily prep time

async function getTruckRoute(from: Coordinates, to: Coordinates, mapboxToken: string) {
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${from.lng},${from.lat};${to.lng},${to.lat}?alternatives=false&geometries=geojson&steps=false&access_token=${mapboxToken}&exclude=ferry&annotations=duration,distance`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      return {
        distance: route.distance / 1000, // Convert to km
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

function calculateDriveTime(distance: number): number {
  const baseTime = (distance / AVERAGE_SPEED_KMH) * 60; // Minutes
  const truckBuffer = baseTime * 0.15; // 15% buffer for truck routing
  return Math.round(baseTime + truckBuffer);
}

function optimizeStopOrder(stops: Stop[]): Stop[] {
  if (stops.length <= 2) return stops;
  
  // Nearest neighbor algorithm starting from depot
  const optimized: Stop[] = [];
  const remaining = [...stops];
  let current = DEPOT;
  
  while (remaining.length > 0) {
    let nearest = remaining[0];
    let nearestDistance = haversineDistance(current, nearest.coordinates);
    let nearestIndex = 0;
    
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

function planMultiTripRoute(vehicle: Vehicle, allStops: Stop[]): Trip[] {
  const trips: Trip[] = [];
  const remainingStops = [...allStops];
  let tripNumber = 1;
  
  while (remainingStops.length > 0) {
    const trip: Trip = {
      tripNumber,
      stops: [],
      currentLoad: 0,
      needsDumpRun: false,
      estimatedDuration: 0
    };
    
    // Fill truck capacity for this trip
    const stopsForThisTrip: Stop[] = [];
    let currentLoad = 0;
    
    // Optimize order of remaining stops
    const optimizedStops = optimizeStopOrder(remainingStops);
    
    for (const stop of optimizedStops) {
      if (currentLoad + stop.pteCount <= vehicle.capacity) {
        stopsForThisTrip.push(stop);
        currentLoad += stop.pteCount;
        
        // Remove from remaining stops
        const index = remainingStops.findIndex(s => s.id === stop.id);
        if (index !== -1) {
          remainingStops.splice(index, 1);
        }
      }
    }
    
    trip.stops = stopsForThisTrip;
    trip.currentLoad = currentLoad;
    trip.needsDumpRun = currentLoad > 0;
    
    // Calculate trip duration
    let duration = SETUP_TIME; // Start with setup
    let currentLocation = DEPOT;
    
    // Time for each stop
    for (const stop of trip.stops) {
      const distance = haversineDistance(currentLocation, stop.coordinates);
      const driveTime = calculateDriveTime(distance);
      duration += driveTime + stop.serviceTimeMinutes;
      currentLocation = stop.coordinates;
    }
    
    // Return to depot time
    const returnDistance = haversineDistance(currentLocation, DEPOT);
    duration += calculateDriveTime(returnDistance);
    
    // Add dump time if needed
    if (trip.needsDumpRun) {
      duration += DUMP_TIME;
    }
    
    trip.estimatedDuration = duration;
    trips.push(trip);
    tripNumber++;
    
    // Check if we have time for another trip
    const totalTimeSpent = trips.reduce((sum, t) => sum + t.estimatedDuration, 0);
    const workingMinutes = (WORK_END_HOUR - WORK_START_HOUR) * 60 + (WORK_END_MINUTE - WORK_START_MINUTE);
    
    if (totalTimeSpent + BREAK_TIME > workingMinutes - 60) { // Leave 1 hour buffer
      break;
    }
  }
  
  return trips;
}

function calculateRouteEfficiency(route: OptimizedRoute): number {
  const workingMinutes = (WORK_END_HOUR - WORK_START_HOUR) * 60 + (WORK_END_MINUTE - WORK_START_MINUTE);
  const timeUtilization = Math.min(route.totalTime / workingMinutes, 1);
  
  const totalStops = route.trips.reduce((sum, trip) => sum + trip.stops.length, 0);
  const serviceTime = totalStops * SERVICE_TIME_PER_STOP;
  const driveTime = route.totalTime - serviceTime - (route.totalDumpRuns * DUMP_TIME);
  const driveEfficiency = serviceTime / (serviceTime + driveTime);
  
  // Bonus for multiple efficient trips
  const tripEfficiencyBonus = route.trips.length > 1 ? 0.1 : 0;
  
  return Math.round((timeUtilization * 0.4 + driveEfficiency * 0.5 + tripEfficiencyBonus) * 100);
}

Deno.serve(async (req) => {
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
    console.log('Multi-trip route optimization request:', { date, vehicleId, optimize });

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
          location:locations(id, name, address, latitude, longitude)
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

    // Process each vehicle's multi-trip route
    for (const [vId, vehicleAssignments] of Object.entries(vehicleGroups)) {
      const vehicle = vehicleAssignments[0].vehicles;
      
      // Convert assignments to stops
      const stops: Stop[] = [];
      for (const assignment of vehicleAssignments) {
        const loc = assignment.pickups.location;
        let lat = loc?.latitude as number | undefined;
        let lng = loc?.longitude as number | undefined;

        if ((!lat || !lng) && loc?.id && loc?.address) {
          try {
            const { data: geoData, error: geoError } = await supabase.functions.invoke('geocode-locations', {
              body: { locationId: loc.id }
            });
            if (geoError) console.error('Geocode function error:', geoError);
            if (geoData?.location) {
              lat = geoData.location.latitude;
              lng = geoData.location.longitude;
            }
          } catch (e) {
            console.warn(`Geocode failed for location ${loc?.id}:`, e);
          }
        }

        stops.push({
          id: assignment.id,
          coordinates: {
            lat: lat ?? DEPOT.lat,
            lng: lng ?? DEPOT.lng,
          },
          pteCount: assignment.pickups.pte_count || 0,
          clientName: assignment.pickups.client?.company_name || 'Unknown',
          address: assignment.pickups.location?.address || 'Address not found',
          serviceTimeMinutes: SERVICE_TIME_PER_STOP,
          notes: assignment.pickups.notes
        });
      }

      // Plan multi-trip route
      const trips = planMultiTripRoute(vehicle, stops);
      
      // Calculate total metrics
      let totalDistance = 0;
      let totalTime = 0;
      let totalDumpRuns = 0;
      
      for (const trip of trips) {
        totalTime += trip.estimatedDuration;
        if (trip.needsDumpRun) totalDumpRuns++;
        
        // Calculate distance for this trip
        let currentLocation = DEPOT;
        for (const stop of trip.stops) {
          const distance = haversineDistance(currentLocation, stop.coordinates);
          totalDistance += distance;
          currentLocation = stop.coordinates;
        }
        // Return to depot
        totalDistance += haversineDistance(currentLocation, DEPOT);
      }
      
      // Add break time if multiple trips
      if (trips.length > 1) {
        totalTime += BREAK_TIME;
      }
      
      // Calculate start and end times
      const startTime = new Date();
      startTime.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);
      
      const endTime = new Date(startTime.getTime() + totalTime * 60 * 1000);
      
      const route: OptimizedRoute = {
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        trips,
        totalDistance: Math.round(totalDistance * 100) / 100,
        totalTime,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        efficiency: 0,
        totalDumpRuns
      };
      
      route.efficiency = calculateRouteEfficiency(route);
      optimizedRoutes.push(route);
    }

    // Sort routes by efficiency
    optimizedRoutes.sort((a, b) => b.efficiency - a.efficiency);

    console.log(`Generated ${optimizedRoutes.length} multi-trip optimized routes with ${optimizedRoutes.reduce((sum, r) => sum + r.totalDumpRuns, 0)} total dump runs`);

    return new Response(
      JSON.stringify({ 
        routes: optimizedRoutes,
        depot: DEPOT,
        workingHours: {
          start: `${WORK_START_HOUR}:${WORK_START_MINUTE.toString().padStart(2, '0')}`,
          end: `${WORK_END_HOUR}:${WORK_END_MINUTE.toString().padStart(2, '0')}`
        },
        multiTripCapabilities: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Multi-trip route optimization error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});