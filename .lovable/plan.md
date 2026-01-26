

# Fix and Populate Demo Trailers Page

## Current State

**Trailers exist but have issues:**
- 4 trailers in demo org: `DEMO-T01`, `DEMO-T02`, `DEMO-T03`, `DEMO-T04`
- One trailer (`DEMO-T03`) has status `waiting_unload` which isn't displayed in the UI (only `empty`, `full`, `staged` are shown as columns)
- No `trailer_events` records exist, so "last event" info is blank on trailer cards

**Missing demo data:**
- No trailer events to show activity history
- No driver with a name associated for trailer events
- Demo user has no `first_name`/`last_name` set

---

## Solution

Run SQL to:
1. Update the demo user to have a driver name
2. Create a dedicated demo driver user
3. Fix trailer statuses to only use UI-supported values (`empty`, `full`, `staged`)
4. Add realistic trailer events with timestamps spread across recent days

---

## SQL to Run in Supabase SQL Editor

```sql
-- STEP 1: Update demo user with a name (for audit purposes)
UPDATE users 
SET first_name = 'Demo', last_name = 'User'
WHERE id = '1fd28e38-9a86-4b04-aff3-51fe28e795bc';

-- STEP 2: Create a demo driver user for trailer events
INSERT INTO users (id, email, first_name, last_name, auth_user_id)
VALUES ('de30e000-0000-4000-8000-000000000001', 'driver@treadset-demo.com', 'Marcus', 'Johnson', NULL)
ON CONFLICT (id) DO UPDATE SET first_name = 'Marcus', last_name = 'Johnson';

-- Add driver to demo org
INSERT INTO user_organization_roles (user_id, organization_id, role)
VALUES ('de30e000-0000-4000-8000-000000000001', 'de300000-0000-4000-8000-000000000001', 'driver')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- STEP 3: Fix trailer statuses (use only empty, full, staged)
UPDATE trailers SET current_status = 'staged' 
WHERE id = 'de30d000-0000-4000-8000-000000000003' 
AND organization_id = 'de300000-0000-4000-8000-000000000001';

-- STEP 4: Create trailer events for activity history
-- Event 1: T01 was dropped empty at yard 2 days ago
INSERT INTO trailer_events (id, organization_id, trailer_id, event_type, location_name, driver_id, timestamp, notes)
VALUES (
  'de30c000-0000-4000-8000-000000000001',
  'de300000-0000-4000-8000-000000000001',
  'de30d000-0000-4000-8000-000000000001',
  'drop_empty',
  'TreadSet Yard',
  'de30e000-0000-4000-8000-000000000001',
  CURRENT_TIMESTAMP - interval '2 days',
  'Returned empty from Great Lakes Rubber'
);

-- Event 2: T02 picked up full at Great Lakes yesterday
INSERT INTO trailer_events (id, organization_id, trailer_id, event_type, location_name, driver_id, timestamp, notes)
VALUES (
  'de30c000-0000-4000-8000-000000000002',
  'de300000-0000-4000-8000-000000000001',
  'de30d000-0000-4000-8000-000000000002',
  'pickup_full',
  'Great Lakes Rubber Co',
  'de30e000-0000-4000-8000-000000000001',
  CURRENT_TIMESTAMP - interval '1 day',
  'Full load - 450 PTEs'
);

-- Event 3: T03 staged for unload today
INSERT INTO trailer_events (id, organization_id, trailer_id, event_type, location_name, driver_id, timestamp, notes)
VALUES (
  'de30c000-0000-4000-8000-000000000003',
  'de300000-0000-4000-8000-000000000001',
  'de30d000-0000-4000-8000-000000000003',
  'stage_empty',
  'Processing Facility',
  'de30e000-0000-4000-8000-000000000001',
  CURRENT_TIMESTAMP - interval '4 hours',
  'Staged for unload - processing queue'
);

-- Event 4: T04 dropped empty at Motor City today
INSERT INTO trailer_events (id, organization_id, trailer_id, event_type, location_name, driver_id, timestamp, notes)
VALUES (
  'de30c000-0000-4000-8000-000000000004',
  'de300000-0000-4000-8000-000000000001',
  'de30d000-0000-4000-8000-000000000004',
  'drop_empty',
  'Motor City Tire',
  'de30e000-0000-4000-8000-000000000001',
  CURRENT_TIMESTAMP - interval '6 hours',
  'Swapped for pickup tomorrow'
);

-- STEP 5: Update trailers with last_event_id references
UPDATE trailers SET last_event_id = 'de30c000-0000-4000-8000-000000000001' WHERE id = 'de30d000-0000-4000-8000-000000000001';
UPDATE trailers SET last_event_id = 'de30c000-0000-4000-8000-000000000002' WHERE id = 'de30d000-0000-4000-8000-000000000002';
UPDATE trailers SET last_event_id = 'de30c000-0000-4000-8000-000000000003' WHERE id = 'de30d000-0000-4000-8000-000000000003';
UPDATE trailers SET last_event_id = 'de30c000-0000-4000-8000-000000000004' WHERE id = 'de30d000-0000-4000-8000-000000000004';

-- STEP 6: Update vehicles with driver assignment
UPDATE vehicles SET assigned_driver_id = 'de30e000-0000-4000-8000-000000000001' 
WHERE id = 'de30a000-0000-4000-8000-000000000001';
```

---

## Expected Results After Running SQL

| Column | Trailers |
|--------|----------|
| Empty | 2 trailers (T01 at Yard, T04 at Motor City) |
| Full | 1 trailer (T02 at Great Lakes) |
| Staged | 1 trailer (T03 at Processing Facility) |

Each trailer card will show:
- Last event type (e.g., "Drop Empty")
- Location name
- Timestamp (relative, e.g., "2 days ago")
- Driver name: "Marcus Johnson"

---

## Steps to Execute

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/wvjehbozyxhmgdljwsiz/sql/new)
2. Paste and run the SQL above
3. Refresh the Trailer Inventory page (`/trailers/inventory`)
4. The board should now show 4 trailers across 3 status columns with activity history

