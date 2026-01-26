
# Plan: Populate Demo Organization with Rich Marketing Data

## Current State
The demo organization (`de300000-0000-4000-8000-000000000001`) already has:
- 12 clients (Michigan tire shops)
- 12 locations
- 10 pickups (mix of scheduled, in_progress, completed)
- 7 manifests (all COMPLETED with payment)
- 2 vehicles

## Gaps Identified
1. **Client city/state fields are NULL** - Dashboard address displays are empty
2. **`lifetime_revenue` is $0 for all clients** - Revenue metrics show nothing
3. **Pickup `computed_revenue` is $0** - Revenue breakdowns are empty
4. **Limited manifest history** - Charts look sparse
5. **No assignments/routes** - Route planning views are empty

## Solution: Run SQL Update Script

You'll need to run this in the [Supabase SQL Editor](https://supabase.com/dashboard/project/wvjehbozyxhmgdljwsiz/sql/new):

```sql
-- =============================================
-- DEMO DATA ENRICHMENT SCRIPT
-- Organization: TreadSet Demo (de300000-0000-4000-8000-000000000001)
-- =============================================

-- 1. UPDATE CLIENT ADDRESSES & REVENUE
UPDATE clients SET
  city = CASE company_name
    WHEN 'Motor City Tire & Auto' THEN 'Detroit'
    WHEN 'Great Lakes Rubber Co' THEN 'Grand Rapids'
    WHEN 'Wolverine Tire Shop' THEN 'Ann Arbor'
    WHEN 'Mackinac Auto Service' THEN 'Mackinaw City'
    WHEN 'Upper Peninsula Recycling' THEN 'Marquette'
    WHEN 'Lansing Tire Center' THEN 'Lansing'
    WHEN 'Flint Auto & Tire' THEN 'Flint'
    WHEN 'Kalamazoo Wheel Works' THEN 'Kalamazoo'
    WHEN 'Saginaw Tire Depot' THEN 'Saginaw'
    WHEN 'Monroe Auto Care' THEN 'Monroe'
    WHEN 'Jackson Wheel & Tire' THEN 'Jackson'
    WHEN 'Bay City Tire Service' THEN 'Bay City'
    ELSE city
  END,
  state = 'MI',
  mailing_address = CASE company_name
    WHEN 'Motor City Tire & Auto' THEN '4521 Woodward Ave'
    WHEN 'Great Lakes Rubber Co' THEN '1200 Lake Michigan Dr NW'
    WHEN 'Wolverine Tire Shop' THEN '825 S State St'
    WHEN 'Mackinac Auto Service' THEN '102 Central Ave'
    WHEN 'Upper Peninsula Recycling' THEN '450 Industrial Park Rd'
    WHEN 'Lansing Tire Center' THEN '3300 S Cedar St'
    WHEN 'Flint Auto & Tire' THEN '2100 S Dort Hwy'
    WHEN 'Kalamazoo Wheel Works' THEN '5600 W Main St'
    WHEN 'Saginaw Tire Depot' THEN '1800 Bay Rd'
    WHEN 'Monroe Auto Care' THEN '750 N Telegraph Rd'
    WHEN 'Jackson Wheel & Tire' THEN '1550 E Michigan Ave'
    WHEN 'Bay City Tire Service' THEN '905 N Euclid Ave'
    ELSE mailing_address
  END,
  zip = CASE company_name
    WHEN 'Motor City Tire & Auto' THEN '48201'
    WHEN 'Great Lakes Rubber Co' THEN '49504'
    WHEN 'Wolverine Tire Shop' THEN '48104'
    WHEN 'Mackinac Auto Service' THEN '49701'
    WHEN 'Upper Peninsula Recycling' THEN '49855'
    WHEN 'Lansing Tire Center' THEN '48910'
    WHEN 'Flint Auto & Tire' THEN '48503'
    WHEN 'Kalamazoo Wheel Works' THEN '49009'
    WHEN 'Saginaw Tire Depot' THEN '48604'
    WHEN 'Monroe Auto Care' THEN '48162'
    WHEN 'Jackson Wheel & Tire' THEN '49201'
    WHEN 'Bay City Tire Service' THEN '48706'
    ELSE zip
  END,
  lifetime_revenue = CASE company_name
    WHEN 'Motor City Tire & Auto' THEN 4250.00
    WHEN 'Great Lakes Rubber Co' THEN 6890.50
    WHEN 'Wolverine Tire Shop' THEN 2340.00
    WHEN 'Mackinac Auto Service' THEN 1875.25
    WHEN 'Upper Peninsula Recycling' THEN 8920.00
    WHEN 'Lansing Tire Center' THEN 3150.75
    WHEN 'Flint Auto & Tire' THEN 5430.00
    WHEN 'Kalamazoo Wheel Works' THEN 1290.50
    WHEN 'Saginaw Tire Depot' THEN 2780.00
    WHEN 'Monroe Auto Care' THEN 1650.25
    WHEN 'Jackson Wheel & Tire' THEN 980.00
    WHEN 'Bay City Tire Service' THEN 1540.00
    ELSE lifetime_revenue
  END
WHERE organization_id = 'de300000-0000-4000-8000-000000000001';

-- 2. UPDATE PICKUP REVENUE (realistic tire pickup prices)
UPDATE pickups SET
  computed_revenue = (pte_count * 1.25) + (COALESCE(otr_count, 0) * 18.75) + (COALESCE(tractor_count, 0) * 6.25),
  final_revenue = (pte_count * 1.25) + (COALESCE(otr_count, 0) * 18.75) + (COALESCE(tractor_count, 0) * 6.25)
WHERE organization_id = 'de300000-0000-4000-8000-000000000001';

-- 3. UPDATE MANIFEST TOTALS with realistic values
UPDATE manifests SET
  total = CASE id
    WHEN 'de30aa00-0000-4000-8000-000000000001' THEN 156.25  -- Motor City
    WHEN 'de30aa00-0000-4000-8000-000000000002' THEN 227.50  -- Great Lakes
    WHEN 'de30aa00-0000-4000-8000-000000000003' THEN 98.75   -- Wolverine
    WHEN 'de30aa00-0000-4000-8000-000000000004' THEN 224.75  -- Mackinac
    WHEN 'de30aa00-0000-4000-8000-000000000005' THEN 406.25  -- UP Recycling
    WHEN 'de30aa00-0000-4000-8000-000000000006' THEN 135.00  -- Lansing
    WHEN 'de30aa00-0000-4000-8000-000000000007' THEN 198.50  -- Flint
    ELSE total
  END
WHERE organization_id = 'de300000-0000-4000-8000-000000000001';

-- 4. ADD DRIVER/VEHICLE TO DEMO (for route views)
UPDATE vehicles SET
  driver_name = CASE unit_number
    WHEN 'DEMO-01' THEN 'Mike Johnson'
    WHEN 'DEMO-02' THEN 'Sarah Williams'
    ELSE driver_name
  END,
  driver_email = CASE unit_number
    WHEN 'DEMO-01' THEN 'mike@treadsetdemo.com'
    WHEN 'DEMO-02' THEN 'sarah@treadsetdemo.com'
    ELSE driver_email
  END
WHERE organization_id = 'de300000-0000-4000-8000-000000000001';

-- 5. CREATE ASSIGNMENTS for today's pickups (route planning)
INSERT INTO assignments (
  id, pickup_id, vehicle_id, organization_id, scheduled_date, status, sequence_order
)
SELECT 
  gen_random_uuid(),
  p.id,
  'de300d00-0000-4000-8000-000000000001', -- DEMO-01 vehicle
  p.organization_id,
  p.pickup_date,
  CASE p.status 
    WHEN 'completed' THEN 'completed'
    WHEN 'in_progress' THEN 'in_progress'
    ELSE 'assigned'
  END,
  ROW_NUMBER() OVER (ORDER BY p.pickup_date)
FROM pickups p
WHERE p.organization_id = 'de300000-0000-4000-8000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM assignments a WHERE a.pickup_id = p.id
  );

-- Verify the updates
SELECT 'Clients updated' as action, COUNT(*) as count 
FROM clients WHERE organization_id = 'de300000-0000-4000-8000-000000000001' AND city IS NOT NULL
UNION ALL
SELECT 'Pickups with revenue', COUNT(*) 
FROM pickups WHERE organization_id = 'de300000-0000-4000-8000-000000000001' AND computed_revenue > 0
UNION ALL
SELECT 'Manifests with totals', COUNT(*) 
FROM manifests WHERE organization_id = 'de300000-0000-4000-8000-000000000001' AND total > 0
UNION ALL
SELECT 'Assignments created', COUNT(*) 
FROM assignments WHERE organization_id = 'de300000-0000-4000-8000-000000000001';
```

## Expected Result After Running

| Dashboard Element | Before | After |
|-------------------|--------|-------|
| Total Revenue | $0 | ~$41,097 |
| Active Clients | 12 | 12 (with addresses) |
| Completed Pickups | 7 | 7 (with revenue) |
| Today's Routes | 0 | 3 pickups assigned |
| Client Addresses | Empty | Full MI addresses |

## How to Run

1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/wvjehbozyxhmgdljwsiz/sql/new)
2. Paste the SQL script above
3. Click **Run**
4. Log back in as `demo@treadset.com` to see the populated dashboard

## Alternative: I Can Run Individual Updates

If you prefer, I can execute smaller UPDATE statements one at a time using the insert tool, though the SQL Editor approach is faster for this bulk operation.
