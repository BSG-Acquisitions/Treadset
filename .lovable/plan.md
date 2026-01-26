
# Demo Mode Implementation Plan

## Overview
Create a **marketing demo mode** that displays realistic but anonymized sample data for trade shows, investor presentations, and sales demos. This will be **completely isolated** from production data and will not affect normal business operations.

## Architecture Design

### Activation Methods
1. **Dedicated URL path**: `/demo/dashboard`, `/demo/clients`, etc.
2. **Query parameter**: `?demo=true` on any protected route
3. Both methods activate identical demo mode behavior

### Core Principle: Complete Isolation
```text
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   /dashboard (Normal)              /demo/dashboard (Demo)        │
│   ├─ AuthProvider                  ├─ DemoModeProvider           │
│   ├─ ProtectedRoute                │   (no auth required)        │
│   ├─ Real Supabase queries         ├─ Static fixture data        │
│   └─ Full write access             └─ Read-only mode             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Components

### 1. Demo Mode Context (`src/contexts/DemoModeContext.tsx`)

Creates a React context that:
- Detects demo mode from URL path (`/demo/*`) or query param (`?demo=true`)
- Provides `isDemoMode` flag to all components
- Provides static demo data getters
- Exposes a fake "user" object for UI display

### 2. Demo Data Fixtures (`src/lib/demo/`)

Static TypeScript files containing realistic Michigan tire recycling data:

**Clients (10 fictional Michigan tire shops):**
- Motor City Tire & Auto - Detroit, MI
- Great Lakes Rubber Co - Grand Rapids, MI
- Wolverine Tire Shop - Ann Arbor, MI
- Mackinac Auto Service - Traverse City, MI
- Upper Peninsula Recycling - Marquette, MI
- Lansing Tire Center - Lansing, MI
- Flint Auto & Tire - Flint, MI
- Kalamazoo Wheel Works - Kalamazoo, MI
- Saginaw Tire Depot - Saginaw, MI
- Monroe Auto Care - Monroe, MI

**Dashboard Metrics:**
- Today's PTEs: 218
- Yesterday's PTEs: 195
- This Week: 1,847 PTEs
- This Month: 11,234 PTEs
- Active Clients: 83
- Monthly Revenue: $24,750

**Today's Routes (5 pickups):**
- 2 completed with signatures
- 1 in progress
- 2 scheduled

**Trailers (4 units):**
- 2 empty, 1 full, 1 waiting unload

**Employees (5 team members):**
- 2 drivers, 1 dispatcher, 1 ops manager, 1 admin

**Service Zones (3 regions):**
- Metro Detroit Zone
- West Michigan Zone
- Northern Michigan Zone

### 3. Demo Layout Wrapper (`src/components/demo/DemoLayout.tsx`)

A layout wrapper that:
- Wraps the standard `AppLayout`
- Adds prominent "DEMO MODE - Sample Data" banner at top
- Includes "Exit Demo" button returning to landing page
- Uses demo-specific styling (subtle gradient background)

### 4. Demo-Aware Hooks (`src/hooks/demo/`)

Wrapper hooks that intercept data fetching:

```text
useDemoPickups()     → Returns DEMO_PICKUPS if isDemoMode
useDemoClients()     → Returns DEMO_CLIENTS if isDemoMode
useDemoDashboard()   → Returns DEMO_METRICS if isDemoMode
useDemoTrailers()    → Returns DEMO_TRAILERS if isDemoMode
useDemoEmployees()   → Returns DEMO_EMPLOYEES if isDemoMode
useDemoAnalytics()   → Returns DEMO_ANALYTICS if isDemoMode
```

### 5. Demo Routes (`src/App.tsx`)

New public routes that don't require authentication:

```text
/demo                → Redirect to /demo/dashboard
/demo/dashboard      → Demo dashboard with sample metrics
/demo/clients        → Demo client list
/demo/routes/today   → Demo route planning view
/demo/analytics      → Demo analytics charts
/demo/trailers       → Demo trailer inventory
/demo/employees      → Demo employee directory
/demo/service-zones  → Demo service zones map
```

### 6. Write Operation Blocking

Enhance `useCanWrite.ts` and mutation hooks:
- Check `isDemoMode` from context
- Block all create/update/delete operations
- Show toast: "This is a demo - actions are disabled"

---

## File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/DemoModeContext.tsx` | Demo state management and detection |
| `src/lib/demo/fixtures.ts` | All static demo data |
| `src/lib/demo/types.ts` | Type definitions for demo data |
| `src/lib/demo/index.ts` | Export barrel file |
| `src/hooks/demo/useDemoData.ts` | Demo-aware data hooks |
| `src/components/demo/DemoLayout.tsx` | Layout with demo banner |
| `src/components/demo/DemoModeBanner.tsx` | Prominent demo indicator |
| `src/pages/demo/DemoDashboard.tsx` | Demo dashboard entry page |
| `src/pages/demo/DemoClients.tsx` | Demo clients page |
| `src/pages/demo/DemoRoutes.tsx` | Demo routes page |
| `src/pages/demo/DemoAnalytics.tsx` | Demo analytics page |
| `src/pages/demo/DemoTrailers.tsx` | Demo trailer inventory |
| `src/pages/demo/DemoEmployees.tsx` | Demo employee directory |
| `src/pages/demo/DemoServiceZones.tsx` | Demo service zones |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add DemoModeProvider wrapper, demo routes |
| `src/hooks/useCanWrite.ts` | Check demo mode for write blocking |
| `src/lib/featureFlags.ts` | Add DEMO_MODE flag (optional) |

---

## Demo Data Preview

### Sample Manifest View
```text
Michigan Scrap Tire Transportation Record
Manifest #: DEMO-20260126-0001

GENERATOR:
Motor City Tire & Auto
1234 Woodward Ave
Detroit, MI 48201

HAULER:
BSG Tire Recycling (Demo)
MI Reg: DEMO-12345

DESTINATION:
Michigan Tire Processing (Demo)

TIRE COUNT: 145 PTEs
Signed: [Demo Signature]
```

### Sample Analytics Chart Data
```text
Month    | Revenue   | Pickups | PTEs
---------|-----------|---------|-------
Jan      | $18,500   | 52      | 9,450
Feb      | $21,200   | 58      | 10,200
Mar      | $19,800   | 55      | 9,800
...      | ...       | ...     | ...
```

---

## Security & Isolation Guarantees

1. **No Database Access**: Demo mode uses only static TypeScript fixtures
2. **No Authentication Required**: Demo routes are public
3. **All Writes Blocked**: Mutations throw errors in demo mode
4. **Clear Visual Indicator**: Unmissable banner prevents confusion
5. **Separate Route Tree**: `/demo/*` routes are completely independent
6. **No Cookie/Session Sharing**: Demo mode doesn't touch auth state

---

## Implementation Order

**Phase 1: Foundation**
1. Create `DemoModeContext.tsx` with URL detection
2. Create `fixtures.ts` with all demo data
3. Create `DemoLayout.tsx` and `DemoModeBanner.tsx`

**Phase 2: Demo Pages**
4. Create demo page variants for each major feature
5. Wire up static data to demo pages

**Phase 3: Routing**
6. Add demo routes to `App.tsx`
7. Update `useCanWrite.ts` to check demo mode

**Phase 4: Polish**
8. Add "Try Demo" button to landing page
9. Test all demo routes work without auth
10. Verify normal operations unaffected

---

## Testing Checklist

- [ ] Demo routes load without authentication
- [ ] All demo data displays correctly
- [ ] Write operations blocked with friendly message
- [ ] Demo banner always visible
- [ ] "Exit Demo" returns to landing page
- [ ] Normal authenticated routes work as before
- [ ] No real data visible in demo mode
- [ ] Mobile viewport renders correctly
