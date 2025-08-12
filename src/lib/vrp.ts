/**
 * Vehicle Routing Problem (VRP) solver using greedy nearest-neighbor algorithm
 */

import { Coordinates, haversineDistance, calculateTravelTime } from './geo';

export interface Vehicle {
  id: string;
  name: string;
  capacity: number; // PTE capacity
}

export interface Stop {
  id: string;
  coordinates: Coordinates;
  pteCount: number;
  serviceTimeMinutes?: number;
  timeWindow?: {
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
}

export interface Assignment {
  id: string;
  vehicleId: string;
  stop: Stop;
  estimatedArrival: Date;
  sequenceOrder: number;
}

export interface RouteOption {
  vehicleId: string;
  vehicleName: string;
  eta: Date;
  windowLabel: string;
  insertionIndex: number;
  addedTravelTimeMinutes: number;
  remainingCapacity: number;
}

export interface Depot {
  coordinates: Coordinates;
  serviceStart: string; // HH:mm format (e.g., "08:00")
  serviceEnd: string;   // HH:mm format (e.g., "18:00")
}

export interface VRPInput {
  depot: Depot;
  vehicles: Vehicle[];
  existingAssignments: Assignment[];
  candidateStop: Stop;
  targetDate: Date;
}

/**
 * Main VRP solver function
 */
export function solveVRP(input: VRPInput): RouteOption[] {
  const { depot, vehicles, existingAssignments, candidateStop, targetDate } = input;
  const options: RouteOption[] = [];

  for (const vehicle of vehicles) {
    // Get existing assignments for this vehicle on the target date
    const vehicleAssignments = existingAssignments.filter(a => a.vehicleId === vehicle.id);
    
    // Check if vehicle has capacity
    const usedCapacity = vehicleAssignments.reduce((sum, a) => sum + a.stop.pteCount, 0);
    const remainingCapacity = vehicle.capacity - usedCapacity;
    
    if (remainingCapacity < candidateStop.pteCount) {
      continue; // Skip this vehicle if no capacity
    }

    // Find best insertion point for the candidate stop
    const bestInsertion = findBestInsertion(
      depot,
      vehicleAssignments,
      candidateStop,
      targetDate
    );

    if (bestInsertion) {
      const windowLabel = getTimeWindowLabel(bestInsertion.eta);
      
      options.push({
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        eta: bestInsertion.eta,
        windowLabel,
        insertionIndex: bestInsertion.insertionIndex,
        addedTravelTimeMinutes: bestInsertion.addedTravelTime,
        remainingCapacity: remainingCapacity - candidateStop.pteCount
      });
    }
  }

  // Sort by added travel time (best options first)
  options.sort((a, b) => a.addedTravelTimeMinutes - b.addedTravelTimeMinutes);
  
  // Return top 5 options
  return options.slice(0, 5);
}

/**
 * Find the best insertion point for a candidate stop in a vehicle's route
 */
function findBestInsertion(
  depot: Depot,
  existingAssignments: Assignment[],
  candidateStop: Stop,
  targetDate: Date
): { eta: Date; insertionIndex: number; addedTravelTime: number } | null {
  
  // Sort existing assignments by sequence order
  const sortedAssignments = [...existingAssignments].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  
  let bestOption: { eta: Date; insertionIndex: number; addedTravelTime: number } | null = null;
  let minAddedTime = Infinity;

  // Try inserting at each position (including start and end)
  for (let i = 0; i <= sortedAssignments.length; i++) {
    const insertion = calculateInsertion(depot, sortedAssignments, candidateStop, i, targetDate);
    
    if (insertion && insertion.addedTravelTime < minAddedTime) {
      minAddedTime = insertion.addedTravelTime;
      bestOption = insertion;
    }
  }

  return bestOption;
}

/**
 * Calculate the impact of inserting a stop at a specific position
 */
function calculateInsertion(
  depot: Depot,
  sortedAssignments: Assignment[],
  candidateStop: Stop,
  insertionIndex: number,
  targetDate: Date
): { eta: Date; insertionIndex: number; addedTravelTime: number } | null {
  
  // Calculate the route with the new stop inserted
  const route: Coordinates[] = [depot.coordinates];
  const stops: Stop[] = [];
  
  // Add existing stops before insertion point
  for (let i = 0; i < insertionIndex; i++) {
    if (sortedAssignments[i]) {
      route.push(sortedAssignments[i].stop.coordinates);
      stops.push(sortedAssignments[i].stop);
    }
  }
  
  // Add candidate stop
  route.push(candidateStop.coordinates);
  stops.push(candidateStop);
  
  // Add existing stops after insertion point
  for (let i = insertionIndex; i < sortedAssignments.length; i++) {
    route.push(sortedAssignments[i].stop.coordinates);
    stops.push(sortedAssignments[i].stop);
  }
  
  // Calculate times for the new route
  const serviceStartTime = parseTime(depot.serviceStart);
  const serviceEndTime = parseTime(depot.serviceEnd);
  const startDateTime = new Date(targetDate);
  startDateTime.setHours(serviceStartTime.hours, serviceStartTime.minutes, 0, 0);
  
  let currentTime = new Date(startDateTime);
  let candidateETA: Date | null = null;
  
  // Calculate ETA for each stop in the route
  for (let i = 0; i < route.length - 1; i++) {
    const distance = haversineDistance(route[i], route[i + 1]);
    const travelTime = calculateTravelTime(distance);
    
    currentTime = new Date(currentTime.getTime() + travelTime * 60 * 1000);
    
    // Check if this is our candidate stop
    if (i === insertionIndex) {
      candidateETA = new Date(currentTime);
      
      // Check if ETA is within service window
      if (candidateStop.timeWindow) {
        const windowStart = parseTime(candidateStop.timeWindow.start);
        const windowEnd = parseTime(candidateStop.timeWindow.end);
        
        const windowStartDateTime = new Date(targetDate);
        windowStartDateTime.setHours(windowStart.hours, windowStart.minutes, 0, 0);
        
        const windowEndDateTime = new Date(targetDate);
        windowEndDateTime.setHours(windowEnd.hours, windowEnd.minutes, 0, 0);
        
        if (candidateETA < windowStartDateTime || candidateETA > windowEndDateTime) {
          return null; // Outside time window
        }
      }
      
      // Check if ETA is within depot service hours
      if (currentTime.getHours() * 60 + currentTime.getMinutes() > serviceEndTime.hours * 60 + serviceEndTime.minutes) {
        return null; // Outside service hours
      }
    }
    
    // Add service time for the stop
    const serviceTime = stops[i]?.serviceTimeMinutes || 10;
    currentTime = new Date(currentTime.getTime() + serviceTime * 60 * 1000);
  }
  
  if (!candidateETA) return null;
  
  // Calculate added travel time (simplified - just the direct impact)
  let addedTravelTime = 0;
  
  if (insertionIndex === 0) {
    // Inserting at the beginning
    const depotToCandidate = haversineDistance(depot.coordinates, candidateStop.coordinates);
    addedTravelTime = calculateTravelTime(depotToCandidate);
    
    if (sortedAssignments.length > 0) {
      const candidateToNext = haversineDistance(candidateStop.coordinates, sortedAssignments[0].stop.coordinates);
      const depotToNext = haversineDistance(depot.coordinates, sortedAssignments[0].stop.coordinates);
      addedTravelTime += calculateTravelTime(candidateToNext) - calculateTravelTime(depotToNext);
    }
  } else if (insertionIndex === sortedAssignments.length) {
    // Inserting at the end
    if (sortedAssignments.length > 0) {
      const lastStop = sortedAssignments[sortedAssignments.length - 1].stop.coordinates;
      const lastToCandidate = haversineDistance(lastStop, candidateStop.coordinates);
      addedTravelTime = calculateTravelTime(lastToCandidate);
    }
  } else {
    // Inserting in the middle
    const prevStop = sortedAssignments[insertionIndex - 1].stop.coordinates;
    const nextStop = sortedAssignments[insertionIndex].stop.coordinates;
    
    const prevToCandidate = haversineDistance(prevStop, candidateStop.coordinates);
    const candidateToNext = haversineDistance(candidateStop.coordinates, nextStop);
    const prevToNext = haversineDistance(prevStop, nextStop);
    
    addedTravelTime = calculateTravelTime(prevToCandidate) + calculateTravelTime(candidateToNext) - calculateTravelTime(prevToNext);
  }
  
  return {
    eta: candidateETA,
    insertionIndex,
    addedTravelTime: Math.max(0, addedTravelTime) // Ensure non-negative
  };
}

/**
 * Get time window label based on ETA
 */
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

/**
 * Parse time string (HH:mm) to hours and minutes
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}