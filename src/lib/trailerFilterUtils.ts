import { Trailer } from "@/hooks/useTrailers";

export interface FilteredTrailerGroups {
  suggested: Trailer[];
  other: Trailer[];
}

/**
 * Filters trailers based on event type, location, and route-session context.
 * Returns two groups: "suggested" (best matches) and "other" (fallback).
 */
export function getFilteredTrailers(
  eventType: string,
  locationName: string | undefined,
  locationId: string | undefined,
  trailers: Trailer[],
  onTruckTrailerIds: Set<string>
): FilteredTrailerGroups {
  const isPickup = eventType.includes('pickup');
  const isDrop = eventType.includes('drop') || eventType === 'stage_empty';

  // Determine required status for pickups
  const requiredStatus = eventType.includes('empty') || eventType === 'stage_empty'
    ? 'empty'
    : eventType.includes('full')
      ? 'full'
      : null;

  if (isPickup) {
    // For pickups: show trailers at this location with correct status
    const atLocation = trailers.filter(t => {
      const statusMatch = !requiredStatus || t.current_status === requiredStatus;
      const locationMatch = matchesLocation(t, locationName, locationId);
      return statusMatch && locationMatch;
    });

    const others = trailers.filter(t => {
      const statusMatch = !requiredStatus || t.current_status === requiredStatus;
      return statusMatch && !atLocation.includes(t);
    });

    return { suggested: atLocation, other: others };
  }

  if (isDrop) {
    // For drops: show trailers currently "on the truck"
    const onTruck = trailers.filter(t => onTruckTrailerIds.has(t.id));
    const others = trailers.filter(t => !onTruckTrailerIds.has(t.id));
    return { suggested: onTruck, other: others };
  }

  // Fallback
  return { suggested: [], other: trailers };
}

function matchesLocation(
  trailer: Trailer,
  locationName: string | undefined,
  locationId: string | undefined
): boolean {
  // Match by location_id first (most reliable)
  if (locationId && trailer.current_location_id === locationId) return true;

  // Fall back to fuzzy name matching
  if (locationName && trailer.current_location) {
    const a = trailer.current_location.toLowerCase().trim();
    const b = locationName.toLowerCase().trim();
    return a === b || a.includes(b) || b.includes(a);
  }

  return false;
}

/**
 * Derives which trailer IDs are currently "on the truck" based on
 * completed events across all stops in a route.
 * Pickups add to the set, drops remove from it.
 */
export function deriveOnTruckTrailerIds(
  allRouteEvents: { event_type: string; trailer_id: string }[]
): Set<string> {
  const onTruck = new Set<string>();

  for (const event of allRouteEvents) {
    if (!event.trailer_id) continue;
    if (event.event_type.includes('pickup')) {
      onTruck.add(event.trailer_id);
    } else if (event.event_type.includes('drop') || event.event_type === 'stage_empty') {
      onTruck.delete(event.trailer_id);
    }
  }

  return onTruck;
}
