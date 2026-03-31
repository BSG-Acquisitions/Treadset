

# GPS Route Tracking + PWA Support — Implementation Plan

## Overview
Add real-time GPS tracking for drivers on active routes, an edge function to calculate route efficiency metrics, and PWA installability so drivers can add the app to their home screen.

---

## 1. Database: New `route_location_pings` Table

Create a migration with:

```sql
create table public.route_location_pings (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete cascade not null,
  user_id uuid not null,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  event_type text not null default 'ping',  -- 'ping', 'start', 'stop_completed', 'end'
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_pings_assignment on route_location_pings(assignment_id, recorded_at);
create index idx_pings_user_date on route_location_pings(user_id, recorded_at);

alter table route_location_pings enable row level security;

-- Drivers can insert their own pings
create policy "Users can insert own pings"
  on route_location_pings for insert to authenticated
  with check (auth.uid() = user_id);

-- Users can read pings for their org
create policy "Org members can read pings"
  on route_location_pings for select to authenticated
  using (organization_id in (
    select organization_id from users where id = auth.uid()
  ));
```

---

## 2. Hook: `useGPSTracking`

New file: `src/hooks/useGPSTracking.ts`

- **State**: `isTracking`, `currentPosition`, `error`
- **`startTracking(assignmentId)`**: Logs a `start` event, begins `watchPosition()` with high accuracy, inserts pings every ~15 seconds via Supabase client, requests Wake Lock if available
- **`stopTracking()`**: Logs an `end` event, clears watch, releases Wake Lock
- **`logStopCompleted(lat, lng)`**: Inserts a `stop_completed` event with current coordinates
- Uses the existing `supabase` client and `useAuth` hook for `user_id` / `organization_id`

---

## 3. Edge Function: `calculate-route-efficiency`

New file: `supabase/functions/calculate-route-efficiency/index.ts`

- Accepts `{ assignment_id }` in POST body
- Queries all `route_location_pings` for that assignment ordered by `recorded_at`
- Calculates:
  - **total_distance_miles**: Haversine sum between sequential pings, converted km to miles
  - **total_duration_minutes**: time between first and last ping
  - **stops_completed**: count of `stop_completed` events
  - **average_time_per_stop_minutes**: duration / stops
  - **efficiency_score**: `(stops_completed / total_duration_minutes) * 100`, capped at 100
- Returns JSON with all metrics
- Uses CORS headers, validates JWT in code

---

## 4. Driver Routes Page — Start/Stop Tracking

Modify `src/pages/DriverRoutes.tsx`:

- Import `useGPSTracking`
- Add a **"Start Route" / "Stop Route"** toggle button at top of the day view header
- When started, calls `startTracking(assignmentId)` for the first active assignment
- Show a small **green pulsing dot** indicator while tracking is active (CSS animation)
- When the driver marks a stop complete (existing flow), call `logStopCompleted()` with current lat/lng

---

## 5. Driver Dashboard — "Today's Efficiency" Card

Modify `src/pages/DriverDashboard.tsx`:

- After existing stats grid, add a new row with a `StatsCard` showing today's efficiency
- On mount, call `calculate-route-efficiency` for each completed assignment today
- Display aggregate `efficiency_score` as a percentage
- Color: green (>80%), amber (50-80%), red (<50%)
- Uses existing `StatsCard` component with appropriate variant

---

## 6. Manager Route View — "Route Efficiency" Tab

Modify `src/pages/EnhancedRoutesToday.tsx`:

- Add a new **"Efficiency"** tab alongside existing day/week tabs
- Shows a table of today's drivers with columns: **Driver, Stops Completed, Miles Driven, Avg Time/Stop, Efficiency Score**
- Calls `calculate-route-efficiency` for each of today's assignments
- Groups results by driver (vehicle driver_email)

---

## 7. PWA Setup

- Install `vite-plugin-pwa` 
- Configure in `vite.config.ts` with manifest (name: "TreadSet", theme color, icons) and workbox settings
- Add `navigateFallbackDenylist: [/^\/~oauth/]` to workbox config
- Add PWA meta tags to `index.html` (apple-mobile-web-app-capable, theme-color, apple-touch-icon)
- Create PWA icon files in `public/` (192x192, 512x512)
- Basic service worker for caching static assets (no offline data sync)

---

## What Won't Be Touched

- Manifest system, payment flow, auth logic — all unchanged
- Existing Supabase client, `useAuth`, role checking patterns — reused as-is
- No changes to feature flags (GPS tracking is always-on for drivers)

---

## Technical Notes

- GPS `watchPosition` uses `enableHighAccuracy: true` with a 15-second throttle to balance accuracy vs battery
- Wake Lock API (`navigator.wakeLock`) prevents screen sleep during active tracking — gracefully degrades if unsupported
- Haversine distance reuses the pattern from `src/lib/geo.ts`
- The edge function uses a service-role Supabase client to read pings across users
- Pings table is append-only with no update/delete policies for integrity

