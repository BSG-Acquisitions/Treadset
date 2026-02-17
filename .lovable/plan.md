

# Add Trailer Assignment to Trailer Route Wizard

## Overview

Add a trailer selection dropdown to Step 1 of the "Create Trailer Route" wizard so dispatchers can assign a specific trailer when creating a trailer route. This way drivers will know which trailer to hook up.

## What Changes

### 1. Database: Add `trailer_id` to `trailer_routes` table

Add a nullable `trailer_id` column to the `trailer_routes` table with a foreign key to the `trailers` table. This links a specific trailer to the trailer route.

```text
ALTER TABLE trailer_routes
  ADD COLUMN trailer_id UUID REFERENCES trailers(id) ON DELETE SET NULL;
```

### 2. Update TrailerRouteWizard (Step 1)

Add a "Assign Trailer" dropdown in Step 1 (Route Details) below the vehicle selection. It will list all active trailers showing their trailer number, current status, and location -- same pattern as the driver/vehicle dropdowns already there.

### 3. Update `useCreateTrailerRoute` hook

Pass the new `trailer_id` field through the create mutation so it gets saved to the database.

### 4. Update `useTrailerRoutes` hook

Join the `trailers` table in the query so trailer info is available when viewing routes:

```text
trailer:trailers(id, trailer_number, current_status, current_location)
```

### 5. Update TrailerRoute interface

Add the optional `trailer` relation to the `TrailerRoute` TypeScript interface.

### 6. Display trailer on route cards (TrailerRoutes page)

Show the assigned trailer number on each route card in the trailer routes list so it's visible at a glance.

---

## Files Changed

| File | Change |
|------|--------|
| New migration | Add `trailer_id` column to `trailer_routes` |
| `src/components/trailers/TrailerRouteWizard.tsx` | Add trailer dropdown to Step 1 |
| `src/hooks/useTrailerRoutes.ts` | Add `trailer_id` to create mutation, join trailers in queries, update interface |
| `src/pages/TrailerRoutes.tsx` | Display assigned trailer on route cards |

