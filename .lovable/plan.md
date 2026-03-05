

## Plan: Smart Context-Aware Trailer System — Dispatcher + Driver Intelligence

### Current Gaps Identified

After a full system review, here are the critical gaps:

**Dispatcher Side (Route Scheduling)**
1. **No client linkage on stops**: `trailer_route_stops` has no `client_id` — stops are just free-text location names. The system has a full clients table with addresses, contacts, emails, locations, but the wizard ignores it completely. The dispatcher types "Tire Disposal" manually instead of selecting the client.
2. **No auto-fill from client data**: Address, contact name, contact phone are all manually typed even though this data exists in the `clients` and `locations` tables.
3. **No location_id linkage**: The stop has a `location_id` column but the wizard never populates it — meaning the driver-side can't match trailers by location.

**Driver Side (Trailer Selection)**
4. **Flat trailer list**: Every Select dropdown shows all trailers regardless of status, location, or route context. Driver scrolls through the entire inventory.
5. **No route-session awareness**: If Jody picks up trailer #5 at Stop 1, the system doesn't track that #5 is "on his truck" for Stop 2's drop event.
6. **No status filtering**: `pickup_empty` shows full trailers too; `pickup_full` shows empty trailers.

**Trailer Inventory Intelligence**
7. **No "trailers at location" inference**: The `current_location` field on trailers is updated by events, but nobody uses it to filter the selection list.
8. **`current_location` is free-text**: Location matching depends on exact string match, which is fragile. Should use `current_location_id` when available.

### Changes

#### 1. Add `client_id` column to `trailer_route_stops` (Migration)
- `ALTER TABLE trailer_route_stops ADD COLUMN client_id UUID REFERENCES clients(id)`
- This links each stop to a client record, enabling auto-fill and downstream intelligence

#### 2. Upgrade `TrailerRouteWizard.tsx` — Client-Powered Stop Creation
Replace the manual text inputs with a **searchable client dropdown** (reuse existing `SearchableDropdown` pattern):
- Dispatcher searches/selects a client → locations for that client load
- If client has one location, auto-select it; if multiple, show a location picker
- Auto-fill: `location_name` from client name, `location_address` from location address, `contact_name` and `contact_phone` from client record
- Store `client_id` and `location_id` on the stop
- Keep a "Custom Location" option for non-client stops (BSG Yard, NTech, etc.) — falls back to manual entry
- Also add known fixed locations (BSG Yard, NTech) as quick-select options since these are used on nearly every route

#### 3. Smart Trailer Filtering in `GuidedStopEvents.tsx`
Add a `getFilteredTrailers()` helper that returns trailers grouped by relevance:

| Event Type | Primary Group ("Suggested") | Fallback ("All Others") |
|---|---|---|
| `pickup_empty` | Trailers where `current_status = 'empty'` AND (`current_location_id = stop.location_id` OR `current_location` matches stop name) | All other `empty` trailers |
| `pickup_full` | Trailers where `current_status = 'full'` AND location matches | All other `full` trailers |
| `drop_empty` / `drop_full` | Trailers picked up earlier in this route session (on the truck) | All trailers |
| `stage_empty` | Empty trailers at this location | All empty trailers |

The Select dropdown will show grouped options with `SelectGroup` + `SelectLabel` headers: "At this location" and "Other trailers".

#### 4. Route-Session Trailer Tracking
In `DriverTrailerAssignments.tsx`, derive an `onTruckTrailerIds` set from all completed events across all stops in the route:
- Scan completed events: pickups add to set, drops remove from set
- Pass this set down to `GuidedStopEvents` and `DriverStopEventActions`
- For drop events, auto-select the trailer if only one is on the truck

#### 5. Apply Same Filtering to `DriverStopEventActions.tsx`
The unplanned "Add Other Event" flow gets the same smart filtering:
- Accept `locationId`, `locationName`, and `onTruckTrailerIds` as props
- Filter the trailer Select by event type + location + on-truck context
- Group into "Suggested" and "All Trailers"

### Files to Edit

| File | Change |
|---|---|
| New migration SQL | Add `client_id` column to `trailer_route_stops` |
| `src/components/trailers/TrailerRouteWizard.tsx` | Replace manual stop entry with client search + location auto-fill; store `client_id` and `location_id` |
| `src/hooks/useTrailerRoutes.ts` | Add `client_id` to `TrailerRouteStop` interface and `useAddRouteStop` mutation |
| `src/pages/DriverTrailerAssignments.tsx` | Derive `onTruckTrailerIds` from route events; pass to stop components |
| `src/components/trailers/GuidedStopEvents.tsx` | Add `getFilteredTrailers()` helper; use grouped Select for "Any" trailer events |
| `src/components/trailers/DriverStopEventActions.tsx` | Accept filter props; apply smart filtering to unplanned event trailer selectors |

### What This Enables
- Dispatcher types "Tire" → selects "Tire Disposal Inc" → address, phone, contact auto-fill → `client_id` and `location_id` stored on stop
- Driver at BSG Yard sees only empty trailers located at BSG Yard
- Driver at Tire Disposal dropping empty sees the trailer he just picked up from BSG
- Driver at Tire Disposal picking up full sees only full trailers at Tire Disposal
- Driver at NTech dropping full sees the trailer he picked up from Tire Disposal
- If only one trailer matches, it's auto-selected

