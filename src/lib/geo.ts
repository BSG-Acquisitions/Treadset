/**
 * Haversine distance calculation and geo utilities
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate the great-circle distance between two points using the Haversine formula
 * @param point1 First coordinate point
 * @param point2 Second coordinate point
 * @returns Distance in kilometers
 */
export function haversineDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate travel time based on distance
 * @param distanceKm Distance in kilometers
 * @returns Travel time in minutes
 */
export function calculateTravelTime(distanceKm: number): number {
  const averageSpeedKmh = 40; // 40 km/h average speed
  const serviceTimeMinutes = 10; // 10 minutes service time per stop
  
  const travelTimeHours = distanceKm / averageSpeedKmh;
  const travelTimeMinutes = travelTimeHours * 60;
  
  return Math.round(travelTimeMinutes + serviceTimeMinutes);
}

/**
 * Calculate the total distance for a route (array of coordinates)
 * @param route Array of coordinates representing the route
 * @returns Total distance in kilometers
 */
export function calculateRouteDistance(route: Coordinates[]): number {
  if (route.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += haversineDistance(route[i], route[i + 1]);
  }
  
  return totalDistance;
}

/**
 * Find the nearest point to a given location
 * @param target Target coordinates
 * @param points Array of coordinate points to search
 * @returns Index of the nearest point
 */
export function findNearestPoint(target: Coordinates, points: Coordinates[]): number {
  if (points.length === 0) return -1;
  
  let nearestIndex = 0;
  let minDistance = haversineDistance(target, points[0]);
  
  for (let i = 1; i < points.length; i++) {
    const distance = haversineDistance(target, points[i]);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = i;
    }
  }
  
  return nearestIndex;
}