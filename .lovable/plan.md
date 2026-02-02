
# Full Route Suggestions for Each Day of the Week

## Problem Statement

Currently, the "Find Nearby Shops" feature only considers **one stop** when finding suggestions. Brenner wants to:
1. Select any day of the week (e.g., Wednesday)
2. See ALL scheduled stops for that day
3. Get suggestions that consider the **entire route** - clients near any stop or along the path between stops
4. Use this to proactively call shops and build a complete route for that day

## Current Architecture vs Required

| Current Behavior | Required Behavior |
|------------------|-------------------|
| Uses `suggest-nearby-clients` | Uses `driver-route-suggestions` |
| Single reference point (first stop) | All stops for the selected day |
| Only shows distance from one client | Shows "Along Route" + "Overdue" groupings |
| Same suggestions for day/week view | Per-day suggestions in week view |
| Hook: `useNearbySuggestions` | Hook: `useDriverRouteSuggestions` |

## Implementation Plan

### Phase 1: Wire Up the Full Route Suggestions

**File: `src/pages/DriverRoutes.tsx`**

1. **Replace the suggestion hook**: Import `useDriverRouteSuggestions` instead of `useNearbySuggestions`

2. **Update `handleFindNearbyShops` function** to:
   - Collect ALL assignments for the current view (day or specific date in week view)
   - Extract location coordinates from each stop
   - Pass the full list of stops to `driver-route-suggestions` edge function
   - Display the enhanced results (along_route + overdue groupings)

3. **Add a `selectedDayForSuggestions` state** to track which day the driver wants suggestions for in week view

### Phase 2: Add Per-Day Suggestion Buttons in Week View

**File: `src/pages/DriverRoutes.tsx`**

In the week view day cards (lines 539-614), add a "Find Nearby" button for each day that has stops:

```text
┌─────────────────────────────────────────────────┐
│  Wed                                            │
│  Feb 5, 2026                       3 stops      │
│                                                 │
│  1. Metro Tire                                  │
│  2. Quick Lube                                  │
│  3. Highway Auto                                │
│                                                 │
│  [🔍 Find Shops Along This Route]               │
└─────────────────────────────────────────────────┘
```

When clicked:
- Use all stops for that specific day
- Call `driver-route-suggestions` with those stops
- Show enhanced suggestions dialog

### Phase 3: Create Enhanced Route Suggestions Dialog

**New File: `src/components/driver/RouteOptimizationSuggestions.tsx`**

A new dialog component that displays suggestions in two categories:

```text
┌─────────────────────────────────────────────────────────┐
│  Route Building Suggestions for Wednesday, Feb 5       │
│  Analyzing 3 scheduled stops                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📍 ALONG YOUR ROUTE (4 clients)                        │
│  ───────────────────────────────────────────────────    │
│  🔴 Bob's Tire Shop - 0.8 mi from Metro Tire            │
│     "Only 0.8 miles detour, 45 days since pickup"       │
│     [Call] [Schedule] [View]                            │
│                                                         │
│  🟡 Green Loop Auto - 1.2 mi from Quick Lube            │
│     "Near existing stop, monthly customer"              │
│     [Call] [Schedule] [View]                            │
│                                                         │
│  ⏰ OVERDUE CLIENTS (3 clients)                         │
│  ───────────────────────────────────────────────────    │
│  🔴 Thompson's Garage - 2.1 mi from Highway Auto        │
│     "78 days since last pickup - overdue!"              │
│     [Call] [Schedule] [View]                            │
│                                                         │
│  [Close]  [Schedule All Selected]                       │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Two sections: "Along Your Route" and "Overdue Clients"
- Priority badges (high/medium/low)
- Distance from nearest scheduled stop
- Days since last pickup
- Quick actions: Call, Schedule, View Client

### Phase 4: Fix Edge Function ID Handling

**File: `supabase/functions/driver-route-suggestions/index.ts`**

Apply the same fix as `suggest-nearby-clients`:
- Include client IDs in the AI prompt
- Add fallback logic if AI fails to return valid IDs
- Ensure all suggestions have valid client references

Update the user prompt (lines 200-206) to include IDs:

```typescript
${clientsWithMetrics.slice(0, 15).map(c => `
- ID: ${c.id} | ${c.company_name} (${c.minDistanceFromRoute.toFixed(1)} mi from ${c.nearestStopName})
  Location: ${c.locations?.[0]?.address || buildAddress(c)}
  Last pickup: ${c.daysSincePickup !== null ? `${c.daysSincePickup} days ago` : 'Never'}
`).join('\n')}
```

### Phase 5: Update Dashboard Tips Component

**File: `src/components/driver/RouteOptimizationTips.tsx`**

Update to use the new `useDriverRouteSuggestions` hook instead of `useNearbySuggestions`:
- Pass all of today's stops to get comprehensive suggestions
- Show both "along route" and "overdue" suggestions on dashboard

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/driver/RouteOptimizationSuggestions.tsx` | Create | New dialog with grouped suggestions display |
| `src/pages/DriverRoutes.tsx` | Modify | Wire up new hook, add per-day buttons in week view |
| `src/components/driver/RouteOptimizationTips.tsx` | Modify | Use full route analysis |
| `supabase/functions/driver-route-suggestions/index.ts` | Modify | Add client IDs to AI prompt, add fallback logic |

---

## Data Flow

```text
Driver clicks "Find Shops for Wednesday"
           │
           ▼
┌──────────────────────────────┐
│ Extract Wednesday's stops:   │
│ - Stop 1: {lat, lng, name}   │
│ - Stop 2: {lat, lng, name}   │
│ - Stop 3: {lat, lng, name}   │
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Call driver-route-suggestions│
│ edge function with all stops │
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Edge function:               │
│ 1. Finds all clients within  │
│    5 miles of ANY stop       │
│ 2. Calculates min distance   │
│    from route for each       │
│ 3. Groups by "along route"   │
│    (<2 mi) and "overdue"     │
│    (30+ days)                │
│ 4. AI prioritizes results    │
└──────────────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│ Display in new dialog:       │
│ - Along Route section        │
│ - Overdue section            │
│ - Quick action buttons       │
└──────────────────────────────┘
```

---

## Benefits

1. **Smarter suggestions**: Considers entire route, not just first stop
2. **Per-day planning**: Brenner can look at Wednesday and build that day's route
3. **Prioritized outreach**: Overdue clients highlighted separately
4. **Week planning**: Can plan routes for entire week in advance
5. **Efficient route building**: See clients "along the way" to minimize detours
