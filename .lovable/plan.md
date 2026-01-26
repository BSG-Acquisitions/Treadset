
# Seed Data Approach for Marketing Demo Mode

## What This Approach Entails

Instead of building a separate fake app with static fixtures, the **Seed Data Approach** uses the **real production application** with a dedicated demo organization containing realistic sample data. This gives prospects the authentic TreadSet experience.

## How It Works

```text
┌─────────────────────────────────────────────────────────────────┐
│                    SEED DATA APPROACH                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Demo User Login                                                │
│   ├─ Email: demo@treadset.com                                   │
│   ├─ Password: [secure demo password]                           │
│   ├─ Role: viewer (read-only)                                   │
│   └─ Organization: "TreadSet Demo"                              │
│                                                                  │
│   What They See:                                                 │
│   ├─ REAL Dashboard (src/pages/Index.tsx)                       │
│   ├─ REAL Client List (src/pages/Clients.tsx)                   │
│   ├─ REAL Route Planning (src/pages/routes/...)                 │
│   ├─ REAL Analytics Charts (src/pages/Analytics.tsx)            │
│   └─ REAL Service Zones Map (src/pages/ServiceZones.tsx)        │
│                                                                  │
│   Data Source:                                                   │
│   └─ Real Supabase tables, filtered by demo organization_id     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Benefits

| Aspect | Fake App (Previous) | Seed Data (Proposed) |
|--------|---------------------|----------------------|
| User Experience | Simplified mock UI | Exact production experience |
| Features Shown | Limited subset | All features work |
| Maintenance | Two codebases | Single codebase |
| Updates | Manual sync needed | Automatic with releases |
| Credibility | Obvious it's a demo | Feels like real product |
| Interactivity | Static displays | Full navigation/filtering |

## Implementation Steps

### Step 1: Create Demo Organization in Database

Insert a new organization specifically for demos:
- Organization name: "TreadSet Demo" (or "BSG Demo")
- Organization slug: "demo"
- Organization ID: Generate new UUID

### Step 2: Create Demo User Account

Create a Supabase auth user that prospects can log into:
- Email: `demo@treadset.com` (or similar)
- Password: Secure but memorable for sales team
- Role: `viewer` (existing read-only role)
- Linked to demo organization

### Step 3: Seed Realistic Sample Data

Insert sample records into the production database, all scoped to the demo organization_id:

**Clients (10-15 fictional Michigan tire shops):**
- Motor City Tire & Auto - Detroit
- Great Lakes Rubber Co - Grand Rapids
- Wolverine Tire Shop - Ann Arbor
- (Similar to what was in fixtures.ts)

**Locations:**
- Primary location for each client with geocoded coordinates

**Pickups (30-50 historical + 5-7 today):**
- Mix of completed, in-progress, and scheduled
- Realistic PTE counts

**Manifests (20-30 completed):**
- Linked to pickups with real PDF paths (or placeholder)
- Realistic signature data

**Vehicles & Drivers:**
- 2-3 demo vehicles
- 2 demo driver accounts

**Trailers:**
- 4 trailers with varied statuses

### Step 4: Existing Security Already Handles It

The `viewer` role already:
- Has read access to all major features (via TopNav.tsx roles)
- Is blocked from write operations (via useCanWrite.ts)
- Shows "Demo Mode" badge (via ViewerModeBadge.tsx)

### Step 5: Clean Up Previous Demo Code

Remove the isolated demo implementation:
- Delete `src/pages/demo/*` (7 files)
- Delete `src/components/demo/*` (3 files)
- Delete `src/lib/demo/*` (4 files)
- Delete `src/hooks/demo/*` (1 file)
- Remove demo routes from App.tsx
- Update DemoModeContext to only detect viewer role
- Update useCanWrite to only check viewer role

## Demo Access Flow

**For Trade Shows / Sales Demos:**
1. Open app in browser
2. Log in with demo@treadset.com credentials
3. App loads with TreadSet Demo organization
4. "Demo Mode" badge appears in header
5. All navigation works, all data is real (but sample)
6. Write operations blocked with friendly message

**For Quick Preview Link:**
- Optionally create a magic link or remember-me flow
- Could also add `/demo-login` page that auto-logs into demo account

## Data Isolation Guarantee

| Your Real Data | Demo Data |
|----------------|-----------|
| organization_id: `ba2e9dc3-...` (BSG) | organization_id: `[new demo UUID]` |
| Completely separate | Completely separate |
| Not visible to demo user | Not visible to real users |

The existing RLS policies already filter all data by organization_id, so demo users CANNOT see real business data, and real users CANNOT see demo data.

## What Needs to Be Done

### Phase 1: Clean Up Previous Implementation
- Remove all `/demo` route files and components
- Simplify DemoModeContext to just check viewer role
- Update useCanWrite.ts to remove demo mode checks

### Phase 2: Database Setup (SQL Migrations)
- Create demo organization record
- Create demo user in auth.users
- Link demo user to demo org with viewer role

### Phase 3: Seed Sample Data (SQL Inserts)
- Insert 10-15 demo clients
- Insert locations with coordinates
- Insert historical pickups
- Insert completed manifests
- Insert trailers
- Insert sample employees

### Phase 4: Polish
- Ensure ViewerModeBadge shows prominently
- Test all navigation paths work for viewer
- Verify no write actions are possible
- Add demo login credentials to sales team documentation

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Cleanup demo code | 1 message |
| Database migrations | 1 message |
| Seed data inserts | 1 message |
| Testing & polish | 1 message |

**Total: ~4 messages**

## End Result

Sales team and trade show attendees log into the **real TreadSet app** with a demo account, see realistic sample data that looks just like a thriving tire recycling operation, can explore all features, but cannot modify anything. This gives the most authentic and impressive demo experience possible.
