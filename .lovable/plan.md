

## Show Trailer Routes on Driver Dashboard

### Problem
Jody's assignment is a **trailer route** (stored in the `trailer_routes` table), but the Driver Dashboard only queries the `assignments` table via `useDriverAssignments`. Trailer routes are only visible on the separate `/driver/trailer-assignments` page. This makes Jody's dashboard appear empty even when she has work scheduled.

### Solution
Add trailer route data to the Driver Dashboard so drivers with `semi_hauler` capability see their trailer assignments alongside (or instead of) regular pickup assignments.

### Changes

**1. `src/pages/DriverDashboard.tsx`**
- Import `useDriverTrailerRoutes` hook and check `hasSemiHauler`
- In the "Today's Assignments" card, also fetch and display today's trailer routes for semi_hauler drivers
- Show trailer route entries with destination name, trailer number, and status
- Include trailer routes in the stats counts (Today's Routes, Completed)
- Link each trailer route entry to the trailer assignments detail view

**2. No backend changes needed** — the `useDriverTrailerRoutes` hook and `driver_capabilities` table already exist and work correctly. Jody already has the `semi_hauler` capability.

### Result
When Jody opens her Driver Dashboard, she'll see her "Entech" trailer route for today in the "Today's Assignments" section, with the trailer number and a link to manage it.

