
# Dashboard Performance Optimization Plan

## The Problem

The dashboard is slow to load because it's making **too many database queries**. Here's what's happening:

| Issue | Impact |
|-------|--------|
| Dashboard has 17+ separate queries | Each query = round trip to database |
| Many queries fetch overlapping data | Same manifests/dropoffs fetched multiple times |
| Clients page has N+1 problem | 10+ extra location queries per page load |
| 30-second refresh intervals | Queries multiply over time |

## Identified Issues

### Issue 1: Clients Page - N+1 Location Queries

The Edit button for each client row triggers a location query **even when the dialog is closed**:

```text
Row 1: EditClientDialog mounts → useLocations(client1.id) → API call
Row 2: EditClientDialog mounts → useLocations(client2.id) → API call
Row 3: EditClientDialog mounts → useLocations(client3.id) → API call
... (10 rows = 10 extra queries!)
```

**Fix**: Only fetch locations when the dialog opens.

### Issue 2: Dashboard - Redundant PTE Queries

The dashboard fetches the same data multiple times for different displays:

| Query | What It Fetches |
|-------|-----------------|
| `todaysManifests` | Today's manifests |
| `thisMonthRevenue` | This month's manifests + dropoffs |
| `currentMonthDailyData` | This month's manifests + dropoffs (again!) |
| `weeklyData` | This week's manifests + dropoffs |
| `dayBeforeYesterdayPTEs` | Manifests + dropoffs for 2 days ago |
| `lastWeekPTEs` | Last week's manifests + dropoffs |
| `lastMonthPTEs` | Last month's manifests + dropoffs |

**Fix**: Consolidate into a single "dashboard data" query that fetches once and derives all stats.

### Issue 3: Duplicate RPC Calls

Multiple queries call similar RPCs:
- `weeklyTireStats` calls `get_weekly_pte_totals`
- `weeklyPTEStats` also calls `get_weekly_pte_totals` (duplicate!)
- `yesterdayTireStats` calls `get_yesterday_pte_totals`
- `yesterdayPTEStats` also calls `get_yesterday_pte_totals` (duplicate!)

---

## Implementation Plan

### Phase 1: Fix N+1 on Clients Page (Quick Win)

**File: `src/components/EditClientDialog.tsx`**

Change the useLocations hook to only run when dialog is open:

```tsx
// Before (always fetches):
const { data: locations = [] } = useLocations(client.id);

// After (only fetches when open):
const { data: locations = [] } = useLocations(isOpen ? client.id : undefined);
```

This single change eliminates 10+ queries per page load on the Clients page.

---

### Phase 2: Consolidate Dashboard Queries

**File: `src/pages/Index.tsx`**

Replace 17+ separate queries with 3-4 consolidated queries:

1. **Single Dashboard Data Hook**: Create `useDashboardData()` that fetches:
   - This month's manifests (once)
   - This month's dropoffs (once)
   - This month's pickups (once)
   
2. **Derive All Stats Client-Side**: Calculate today/yesterday/week/month stats from the single dataset

3. **Use RPC for Time-Sensitive Stats**: Keep the optimized RPC calls for today/yesterday (they're timezone-aware)

**New structure:**

```text
Before: 17+ queries → 17+ round trips
After:  4 queries → 4 round trips

Query 1: get_today_pte_totals (RPC - timezone aligned)
Query 2: get_yesterday_pte_totals (RPC - timezone aligned)  
Query 3: get_dashboard_summary (new RPC - week/month stats)
Query 4: This month's manifests for charts (single query)
```

---

### Phase 3: Create Consolidated Dashboard RPC (Optional)

**New Database Function: `get_dashboard_summary`**

Create a single RPC that returns all dashboard stats in one call:

```sql
CREATE OR REPLACE FUNCTION get_dashboard_summary(org_id uuid)
RETURNS TABLE(
  today_ptes integer,
  yesterday_ptes integer,
  week_ptes integer,
  month_ptes integer,
  today_revenue numeric,
  month_revenue numeric,
  active_clients integer,
  completed_pickups integer
) AS $$
  -- Single query with date-based aggregation
$$
```

This reduces ~12 queries to 1.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/EditClientDialog.tsx` | Lazy-load locations (only when dialog opens) |
| `src/pages/Index.tsx` | Consolidate redundant queries |
| `src/hooks/useDashboardData.ts` | New: consolidated dashboard data hook |
| Supabase functions (optional) | New: `get_dashboard_summary` RPC |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Clients page queries | ~15 per load | ~5 per load |
| Dashboard queries | ~17 per load | ~4 per load |
| Total API calls on login | ~35+ | ~10 |
| Page load time | Slow | 3x faster |

---

## Implementation Priority

1. **Phase 1 first** - EditClientDialog fix is a 1-line change with big impact
2. **Phase 2 next** - Dashboard consolidation requires refactoring but no database changes
3. **Phase 3 optional** - RPC consolidation is most impactful but requires database migration

---

## Technical Notes

### Why the N+1 happens

React Query's `useQuery` executes immediately when the component mounts. The EditClientDialog mounts for every table row (inside the Actions cell), so even though the dialogs are all closed, each one triggers its `useLocations` call.

### Why consolidation helps

Each database query has overhead:
- Network round trip (~50-200ms)
- Connection pooling
- RLS policy evaluation
- Query parsing

By fetching once and computing client-side, we eliminate this overhead for redundant data.

### Cache strategy

The existing React Query cache already helps - queries with the same key reuse cached data. But the dashboard queries have slightly different date ranges in their keys, preventing cache hits.
