

# Assign Trailers to Driver Routes

## Overview

Add the ability for dispatchers to assign a specific trailer to a driver's route for a given day, so drivers know which trailer to hook up and move before leaving. This works just like the existing driver assignment dropdown but for trailers.

## What Changes

### 1. Database: Add `trailer_id` to `assignments` table

Add a new nullable `trailer_id` column to the `assignments` table with a foreign key to the `trailers` table. This links a specific trailer to a driver's assignment for the day.

### 2. New Component: `TrailerAssignmentDropdown`

Build a dropdown component (modeled after the existing `DriverAssignmentDropdown`) that:
- Shows the currently assigned trailer (or "No Trailer")
- Lists all active trailers from the organization with their trailer number, current status (empty/full/staged), and current location
- Allows dispatchers to assign or unassign a trailer for a vehicle's assignments on a specific date
- Updates all assignments for that vehicle + date combo (same pattern as driver assignment)

### 3. Admin Route Planning Page (EnhancedRoutesToday)

Add the `TrailerAssignmentDropdown` alongside the existing driver assignment area on each route card, so dispatchers can assign both a driver and a trailer when planning routes.

### 4. Driver Dashboard + Driver Assignments

Update the driver-facing queries (`useDriverAssignments`, `useDriverWeeklyAssignments`) to include the trailer relation so drivers can see which trailer is assigned to them. Display the trailer number prominently on the driver's assignment cards.

### 5. Driver Dashboard Display

Show a trailer badge/indicator on the driver dashboard assignment cards so drivers immediately see "Hook to Trailer #93511-MJ" or similar when viewing their day's stops.

---

## Technical Details

### Database Migration

```text
ALTER TABLE assignments 
  ADD COLUMN trailer_id UUID REFERENCES trailers(id) ON DELETE SET NULL;

CREATE INDEX idx_assignments_trailer_id ON assignments(trailer_id);
```

### New Component: `TrailerAssignmentDropdown`

- **Location:** `src/components/TrailerAssignmentDropdown.tsx`
- **Props:** `vehicleId`, `routeDate`, `currentTrailerId`, `onTrailerAssigned`
- **Behavior:** Uses `useTrailers()` hook to list available trailers, mutation updates `assignments.trailer_id` for matching vehicle + date

### Modified Files

| File | Change |
|------|--------|
| `src/hooks/useDriverAssignments.ts` | Add `trailer:trailers(id, trailer_number, current_status, current_location)` to select query |
| `src/hooks/useDriverWeeklyAssignments.ts` | Same trailer join added |
| `src/pages/EnhancedRoutesToday.tsx` | Import and render `TrailerAssignmentDropdown` on route cards |
| `src/pages/DriverDashboard.tsx` | Display assigned trailer info on assignment cards |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

### Query Updates

The driver assignment hooks will include the trailer relation:

```text
trailer:trailers(id, trailer_number, current_status, current_location)
```

This lets the driver see "Trailer: 93511-MJ (empty, BSG Yard)" on their assignment.
