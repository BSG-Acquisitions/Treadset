
# Phase 2 & 3: Database Setup and Seed Data

## Overview

This plan covers creating the demo organization, user account, and seeding realistic sample data. All operations are **INSERT statements only** - no schema changes, no RLS policy modifications.

## What Will Be Created

### Demo Organization
| Field | Value |
|-------|-------|
| ID | New UUID (generated) |
| Name | "TreadSet Demo" |
| Slug | "demo" (unique, verified available) |
| Depot Location | Detroit, MI (42.3314, -83.0458) |
| Service Hours | 7:00 AM - 5:00 PM |
| Default Rates | PTE: $1.50, OTR: $22.50, Tractor: $7.50 |

### Demo User Account
| Field | Value |
|-------|-------|
| Email | demo@treadset.com |
| Password | TreadSet2026! (sales team only) |
| First Name | Demo |
| Last Name | Account |
| Role | viewer (read-only) |

### Sample Clients (12 fictional Michigan tire shops)
1. Motor City Tire & Auto - Detroit
2. Great Lakes Rubber Co - Grand Rapids
3. Wolverine Tire Shop - Ann Arbor
4. Mackinac Auto Service - Traverse City
5. Upper Peninsula Recycling - Marquette
6. Lansing Tire Center - Lansing
7. Flint Auto & Tire - Flint
8. Kalamazoo Wheel Works - Kalamazoo
9. Saginaw Tire Depot - Saginaw
10. Monroe Auto Care - Monroe
11. Jackson Wheel & Tire - Jackson
12. Bay City Tire Service - Bay City

### Sample Locations
- 1 primary location per client with geocoded Michigan coordinates

### Sample Trailers (4 units)
| Trailer | Status | Location |
|---------|--------|----------|
| DEMO-T01 | empty | BSG Yard |
| DEMO-T02 | full | Great Lakes Rubber Co |
| DEMO-T03 | waiting_unload | Processing Facility |
| DEMO-T04 | empty | Motor City Tire |

### Sample Vehicles (2 trucks)
| Vehicle | Driver |
|---------|--------|
| DEMO Truck 1 | Mike Driver |
| DEMO Truck 2 | Sarah Driver |

### Sample Employees (4 team members)
- 2 drivers (Mike Driver, Sarah Driver)
- 1 dispatcher (Alex Dispatcher)
- 1 ops manager (Jordan Manager)

### Sample Pickups (35 historical + 5 today)
- Mix of statuses: completed, in_progress, scheduled
- Realistic PTE counts (15-85 per pickup)
- Spanning past 90 days

### Sample Manifests (25 completed)
- Linked to completed pickups
- Realistic tire counts and revenue
- Status: COMPLETED

## Implementation Order

### Step 1: Create Demo Organization
```sql
INSERT INTO organizations (id, name, slug, depot_lat, depot_lng, ...)
VALUES (uuid, 'TreadSet Demo', 'demo', 42.3314, -83.0458, ...);
```

### Step 2: Create Demo User
This requires two parts:
1. Create auth.users entry via Supabase Dashboard (manual step)
2. Insert into public.users table
3. Insert into user_organization_roles with 'viewer' role

### Step 3: Seed Clients & Locations
12 clients with matching locations, all with demo organization_id

### Step 4: Seed Trailers
4 trailers with varied statuses

### Step 5: Seed Vehicles & Employees
2 vehicles + 4 employee records

### Step 6: Seed Pickups
40 pickups spanning 90 days, all demo organization_id

### Step 7: Seed Manifests
25 completed manifests linked to pickups

## Data Isolation Verification

After seeding, this query confirms isolation:
```sql
SELECT 
  (SELECT COUNT(*) FROM clients WHERE organization_id = '[demo_org_id]') as demo_clients,
  (SELECT COUNT(*) FROM clients WHERE organization_id = 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73') as bsg_clients
```

Demo data will be completely separate from BSG data.

## Manual Step Required

**Creating the Auth User**: The demo@treadset.com user needs to be created through Supabase Dashboard → Authentication → Users → Add User because:
- We cannot insert directly into auth.users table
- The auth_user_id from that step is needed for linking

I will provide the exact SQL for all other inserts, and guide you through the auth user creation step.

## Technical Notes

- All UUIDs will be pre-generated to ensure proper foreign key relationships
- All organization_id values will reference the demo organization
- No schema changes required
- No RLS policy changes required
- Existing viewer role security applies automatically

## Next Steps

When you approve, I will:
1. Create the demo organization via SQL insert
2. Guide you to create the auth user in Supabase Dashboard
3. Insert the public.users record and link to demo org with viewer role
4. Seed all sample data (clients, locations, trailers, vehicles, employees, pickups, manifests)
