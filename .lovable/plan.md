
# Populate Dashboard Tiles with Demo Data

## Problem
The dashboard tiles show zeros because:
1. The demo manifests have `signed_at` dates spread across Dec-Jan (Dec 27, Jan 1, 6, 11, 16, 21, 23)
2. The RPC functions (`get_today_pte_totals`, `get_weekly_pte_totals`, etc.) filter by `signed_at` date
3. None of the demo manifests have `signed_at = 2026-01-26` (today), so "Today's PTEs" = 0
4. The pickups for today (3 exist) are not yet completed, so they don't count toward manifests

## Solution
Update the demo data dates directly in the database to show realistic "active" numbers:
- Update 2-3 manifests to have `signed_at` = today
- Update 2-3 manifests to have `signed_at` = yesterday  
- Keep the rest spread across this week/month
- Update corresponding pickups to match

## SQL to Run in Supabase SQL Editor

```sql
-- UPDATE DEMO MANIFESTS TO SHOW REALISTIC DATES
-- This makes the dashboard tiles show active numbers

-- Manifest 7: Set to TODAY (signed today, counts in "Today" tile)
UPDATE manifests 
SET signed_at = CURRENT_DATE::timestamp + interval '10 hours',
    created_at = CURRENT_DATE::timestamp + interval '8 hours'
WHERE id = 'de30aa00-0000-4000-8000-000000000007';

-- Manifest 6: Set to TODAY (2nd pickup today)  
UPDATE manifests 
SET signed_at = CURRENT_DATE::timestamp + interval '14 hours',
    created_at = CURRENT_DATE::timestamp + interval '11 hours'
WHERE id = 'de30aa00-0000-4000-8000-000000000006';

-- Manifest 5: Set to YESTERDAY
UPDATE manifests 
SET signed_at = (CURRENT_DATE - interval '1 day')::timestamp + interval '15 hours',
    created_at = (CURRENT_DATE - interval '1 day')::timestamp + interval '9 hours'
WHERE id = 'de30aa00-0000-4000-8000-000000000005';

-- Manifest 4: Set to 2 days ago
UPDATE manifests 
SET signed_at = (CURRENT_DATE - interval '2 days')::timestamp + interval '13 hours',
    created_at = (CURRENT_DATE - interval '2 days')::timestamp + interval '10 hours'
WHERE id = 'de30aa00-0000-4000-8000-000000000004';

-- Manifest 3: Set to 3 days ago (this week)
UPDATE manifests 
SET signed_at = (CURRENT_DATE - interval '3 days')::timestamp + interval '11 hours',
    created_at = (CURRENT_DATE - interval '3 days')::timestamp + interval '8 hours'
WHERE id = 'de30aa00-0000-4000-8000-000000000003';

-- Manifest 2: Set to 5 days ago (this week)
UPDATE manifests 
SET signed_at = (CURRENT_DATE - interval '5 days')::timestamp + interval '16 hours',
    created_at = (CURRENT_DATE - interval '5 days')::timestamp + interval '12 hours'
WHERE id = 'de30aa00-0000-4000-8000-000000000002';

-- Manifest 1: Set to 10 days ago (this month, earlier)
UPDATE manifests 
SET signed_at = (CURRENT_DATE - interval '10 days')::timestamp + interval '14 hours',
    created_at = (CURRENT_DATE - interval '10 days')::timestamp + interval '9 hours'
WHERE id = 'de30aa00-0000-4000-8000-000000000001';

-- UPDATE CORRESPONDING PICKUPS TO MATCH
UPDATE pickups SET pickup_date = CURRENT_DATE, status = 'completed'
WHERE id = 'de30f000-0000-4000-8000-000000000007';

UPDATE pickups SET pickup_date = CURRENT_DATE, status = 'completed'
WHERE id = 'de30f000-0000-4000-8000-000000000006';

UPDATE pickups SET pickup_date = CURRENT_DATE - interval '1 day'
WHERE id = 'de30f000-0000-4000-8000-000000000005';

UPDATE pickups SET pickup_date = CURRENT_DATE - interval '2 days'
WHERE id = 'de30f000-0000-4000-8000-000000000004';

UPDATE pickups SET pickup_date = CURRENT_DATE - interval '3 days'
WHERE id = 'de30f000-0000-4000-8000-000000000003';

UPDATE pickups SET pickup_date = CURRENT_DATE - interval '5 days'
WHERE id = 'de30f000-0000-4000-8000-000000000002';

UPDATE pickups SET pickup_date = CURRENT_DATE - interval '10 days'
WHERE id = 'de30f000-0000-4000-8000-000000000001';
```

## Expected Dashboard Results After Running SQL

| Tile | Expected Value |
|------|---------------|
| Today's PTEs | ~120 PTEs (manifests 6+7) |
| Yesterday's PTEs | ~175 PTEs (manifest 5) |
| This Week's PTEs | ~500+ PTEs (manifests 2-7) |
| This Month's PTEs | ~535 PTEs (all manifests) |
| Today's Revenue | ~$333 (manifests 6+7 totals) |
| Month Revenue | ~$1,447 (all manifest totals) |
| Today's Pickups | Shows 2 completed + 2-3 scheduled |

## Steps to Execute
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/wvjehbozyxhmgdljwsiz/sql/new)
2. Paste and run the SQL above
3. Refresh the dashboard page
4. All tiles should now show realistic active numbers
5. Take your screenshots
