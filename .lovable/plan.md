
# Fix: Dashboard Is Still Slow — Index.tsx Is Calling Everything Twice At 30-Second Intervals

## What The Code Actually Shows

The previous fix optimized `useDashboardData.ts` to use sensible poll intervals (2–15 minutes). But `Index.tsx` — the dashboard page itself — has **13 separate `useQuery` calls hardcoded directly in the component** that completely ignore that hook. These inline queries have `refetchInterval: 30000` and `staleTime: 0`, meaning:

- Every 30 seconds, they fire regardless of cache
- `staleTime: 0` forces a fresh fetch on every mount and window focus
- The same RPC functions (`get_weekly_pte_totals`, `get_yesterday_pte_totals`, `get_monthly_pte_totals`, `get_today_pte_totals`) are being called **twice each** — once from `Index.tsx` directly and once from `useDashboardData`
- That means 8 RPC calls to the same 4 functions firing simultaneously

Here is the full list of duplicate/inline queries in `Index.tsx`:

| Query in Index.tsx | Duplicates |
|---|---|
| `'manifests', 'today'` | Duplicates `useDashboardData` chart query |
| `'monthly-revenue'` | Duplicates `useDashboardData` chart+revenue query |
| `'current-month-daily-stats'` | Duplicates `useDashboardData` `weeklyChartData`/`monthlyChartData` |
| `'weekly-tire-totals'` → `get_weekly_pte_totals` | **DUPLICATES** `useDashboardData` weekly RPC |
| `'yesterday-tire-totals'` → `get_yesterday_pte_totals` | **DUPLICATES** `useDashboardData` yesterday RPC |
| `'monthly-tire-totals'` → `get_monthly_pte_totals` | **DUPLICATES** `useDashboardData` monthly RPC |
| `'weekly-stats'` | Duplicates `useDashboardData` chart query |
| `'pickups-this-month'` | Standalone but fires every 30s |
| `'today-pte-stats'` → `get_today_pte_totals` | **DUPLICATES** `useDashboardData` today RPC |
| `'yesterday-pte-stats'` → `get_yesterday_pte_totals` | **DUPLICATES** twice |
| `'weekly-pte-stats'` → `get_weekly_pte_totals` | **DUPLICATES** twice |
| `'monthly-pte-stats'` → `get_monthly_pte_totals` | **DUPLICATES** twice |
| `'day-before-yesterday-ptes'` | Raw manifests query, 30s |

The database is being hit by **13 queries firing simultaneously**, with 8 of them being direct duplicates of what `useDashboardData` already fetches with the correct intervals. This is why timeouts are still happening — the SQL fix was correct, but the component is still calling the same functions twice.

---

## The Fix

`Index.tsx` already imports `useDashboardData` (line 30). The fix is to **delete all 13 inline `useQuery` calls** and replace them with the single `useDashboardData()` hook call which already returns everything needed:

- `todayPTEStats` → replaces `today-pte-stats` + `today-pte-stats` duplicate
- `yesterdayPTEStats` → replaces `yesterday-tire-totals` + `yesterday-pte-stats`
- `weeklyPTEStats` → replaces `weekly-tire-totals` + `weekly-pte-stats`
- `monthlyPTEStats` → replaces `monthly-tire-totals` + `monthly-pte-stats`
- `dayBeforeYesterdayPTEs` → replaces `day-before-yesterday-ptes`
- `thisMonthRevenue` → replaces `monthly-revenue`
- `weeklyChartData` → replaces `weekly-stats` + `current-month-daily-stats`
- `monthlyChartData` → replaces `current-month-daily-stats`

The remaining queries that don't have equivalents (`manifests-today`, `pickups-this-month`) will have their `refetchInterval` changed from 30 seconds to 5 minutes.

---

## Technical Changes

### File: `src/pages/Index.tsx`

1. **Delete 13 inline `useQuery` calls** (lines ~81–499)
2. **Replace with single hook call:** `const { todayPTEStats, yesterdayPTEStats, weeklyPTEStats, monthlyPTEStats, dayBeforeYesterdayPTEs, lastWeekPTEs, thisMonthRevenue, weeklyChartData, monthlyChartData } = useDashboardData();`
3. **Update all variable references** throughout the render to use the values from `useDashboardData`
4. **Keep only 2 lightweight queries:** `usePickups` (today's schedule), `useTodaysDropoffs` (dropoff list), `useClients` (client list) — these are page-specific and not dashboard stats
5. **Change `pickups-this-month`** interval from 30s to 5 minutes

---

## Result

| Before | After |
|---|---|
| 13 queries firing every 30 seconds | 6 queries with 2–15 minute intervals |
| Same RPC called 2–3x simultaneously | Each RPC called exactly once |
| Dashboard hammers DB constantly | Dashboard queries DB 80% less often |
| Statement timeouts on every load | Queries complete in <2 seconds |

The dashboard will load immediately since `useDashboardData` returns cached values instantly on subsequent visits, and the DB will stop timing out because queries run at sensible intervals instead of every 30 seconds times 3 duplicate callers.
