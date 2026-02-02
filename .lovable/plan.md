

# Driver Route Building Assistant

## Summary

Your driver wants the app to help him build smarter routes by suggesting nearby clients when he schedules pickups. You already have excellent building blocks in place - now we need to enhance them specifically for the driver's workflow.

## What Already Exists

| Component | Status | Location |
|-----------|--------|----------|
| Nearby suggestions hook | Built | `useNearbySuggestions.ts` |
| Nearby suggestions UI | Built | `NearbyClientSuggestions.tsx` |
| Suggest nearby clients edge function | Built | `suggest-nearby-clients/index.ts` |
| Route optimization edge function | Built | `enhanced-route-optimizer/index.ts` |
| Driver schedule pickup dialog | Built | `DriverSchedulePickupDialog.tsx` |
| Driver routes page | Built | `DriverRoutes.tsx` |

**The issue**: The nearby suggestions feature is only integrated into the dispatcher/admin scheduling dialogs (`SchedulePickupDialog`, `SchedulePickupWithDriverDialog`), but NOT into the driver's `DriverSchedulePickupDialog`.

---

## Implementation Plan

### Phase 1: Add Nearby Suggestions to Driver Pickup Scheduling

**What happens**: After the driver schedules a pickup, show them a popup with nearby clients they could also call/schedule.

**Files to modify**:
- `src/components/driver/DriverSchedulePickupDialog.tsx`
  - Import `useNearbySuggestions` hook
  - Import `NearbyClientSuggestions` component
  - After successful pickup creation, call `suggestNearby()` with the scheduled client
  - Show the suggestions dialog with nearby shops

**Changes**:
1. Add state for tracking the scheduled client and suggestions dialog
2. On pickup success, trigger the nearby suggestions lookup
3. Display the `NearbyClientSuggestions` modal with action buttons

---

### Phase 2: Add "Find Nearby Clients" Button on Driver Routes Page

**What happens**: Add a prominent button on the driver's route view that lets them proactively find clients near their current scheduled stops.

**Files to modify**:
- `src/pages/DriverRoutes.tsx`
  - Add a "Find Nearby Shops" button in the header area
  - When clicked, show clients near any of the driver's scheduled stops for the day
  - Allow the driver to quickly add them to their route

**UI Addition**:
```text
┌─────────────────────────────────────────────────┐
│  My Assignments                                 │
│  Monday, February 3, 2026 • 3 stops scheduled   │
│                                                 │
│  [Add Pickup]  [🗺️ Find Nearby Shops]           │
└─────────────────────────────────────────────────┘
```

---

### Phase 3: Create Enhanced "Route Builder Suggestions" Edge Function

**What happens**: Create a smarter suggestion system that considers the driver's entire route, not just one client.

**New file**: `supabase/functions/driver-route-suggestions/index.ts`

**Logic**:
1. Accept the driver's current scheduled stops for the day
2. Find all clients within a radius of ANY stop on the route
3. Calculate which clients are "on the way" between stops (minimal detour)
4. Use AI to prioritize based on:
   - Distance from route (prefer <2 miles from existing path)
   - Time since last pickup (prioritize overdue clients)
   - Historical pickup frequency
   - Estimated tire count (value vs time tradeoff)
5. Return suggestions grouped by:
   - "Along your route" (minimal detour)
   - "Nearby clusters" (multiple clients in same area)
   - "Overdue for pickup"

**Response structure**:
```json
{
  "along_route": [
    {
      "client_id": "...",
      "company_name": "Metro Tires",
      "distance_from_route_miles": 0.8,
      "best_insert_after": "stop_2",
      "added_time_minutes": 12,
      "priority": "high",
      "reasoning": "Only 0.8 miles off route, hasn't had pickup in 45 days"
    }
  ],
  "nearby_clusters": [
    {
      "center": { "lat": 42.33, "lng": -83.04 },
      "clients": [...],
      "total_estimated_ptes": 150
    }
  ],
  "overdue": [...]
}
```

---

### Phase 4: Create Driver Route Builder UI Component

**What happens**: A dedicated "Route Builder" interface where the driver can visualize their route and see suggestions.

**New file**: `src/components/driver/DriverRouteBuilder.tsx`

**Features**:
1. Map view showing current scheduled stops with numbered pins
2. Highlighted "suggested" clients near the route
3. One-tap "Add to Route" button for each suggestion
4. Real-time route preview when hovering over a suggestion
5. Total route time/distance estimate as stops are added

**UI Flow**:
```text
┌──────────────────────────────────────────────────────────────┐
│  Route Builder                           [Save Route] [Done] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📍 Your Route (3 stops)          │  Suggested Additions     │
│  ─────────────────────────────    │  ───────────────────     │
│  1. Green Loop Tire    ✓          │  🔴 Metro Tires          │
│     8:30 AM                       │     0.8 mi from route    │
│                                   │     45 days overdue      │
│  2. Riverside Auto     ○          │     [+ Add to Route]     │
│     9:45 AM                       │                          │
│                                   │  🟡 Quick Lube Plus      │
│  3. Eco Tire Co        ○          │     1.2 mi from route    │
│     11:00 AM                      │     [+ Add to Route]     │
│                                   │                          │
│  ─────────────────────────────    │  🟢 Highway Tire         │
│  Est. finish: 12:30 PM            │     2.1 mi from route    │
│  Total distance: 28 miles         │     [+ Add to Route]     │
│                                   │                          │
└──────────────────────────────────────────────────────────────┘
```

---

### Phase 5: Add Route Suggestions to Driver Dashboard

**What happens**: Show proactive suggestions on the driver's dashboard before they even start building routes.

**Files to modify**:
- `src/pages/DriverDashboard.tsx`

**Addition**:
```text
┌─────────────────────────────────────────────────┐
│  💡 Route Optimization Tips                     │
│                                                 │
│  3 clients near today's stops haven't been      │
│  picked up in 30+ days:                         │
│                                                 │
│  • Metro Tires (0.5 mi from Stop 2)             │
│  • Quick Lube (1.2 mi from Stop 3)              │
│  • Highway Tire (1.8 mi from Stop 1)            │
│                                                 │
│  [View All Suggestions]  [Open Route Builder]   │
└─────────────────────────────────────────────────┘
```

---

## Implementation Sequence

| Order | Task | Priority | Effort |
|-------|------|----------|--------|
| 1 | Integrate existing `NearbyClientSuggestions` into `DriverSchedulePickupDialog` | High | Small |
| 2 | Add "Find Nearby Shops" button to `DriverRoutes.tsx` | High | Small |
| 3 | Create `driver-route-suggestions` edge function | High | Medium |
| 4 | Create `DriverRouteBuilder.tsx` component | Medium | Large |
| 5 | Add suggestions widget to `DriverDashboard.tsx` | Medium | Small |

---

## Technical Considerations

### Database Usage
- Uses existing `locations` table with geocoded coordinates
- Uses existing `clients` table with `last_pickup_at` field
- Uses existing `assignments` and `pickups` tables

### API Keys Required
- `LOVABLE_API_KEY` - Already configured (for AI prioritization)
- `MAPBOX_ACCESS_TOKEN` - Already configured (for route visualization)

### Performance
- Suggestions are calculated on-demand when driver requests them
- Edge function limits results to top 10 suggestions
- Uses Haversine distance for fast geo calculations

---

## Benefits for Your Driver

1. **Saves Time**: No more manually checking which clients are nearby
2. **Increases Revenue**: Picks up more clients per route
3. **Reduces Driving**: Optimized routes mean less fuel and time
4. **Proactive Outreach**: Reminds about clients who haven't been serviced recently
5. **Self-Sufficient**: Driver can build efficient routes without dispatcher help

