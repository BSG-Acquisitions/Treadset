
# Fix: Dashboard Loading Very Slow — Statement Timeouts on PTE Functions

## What Is Actually Happening Right Now

The database log shows **hundreds of statement timeout errors** — every single page load is hitting them. The timeouts are all on `get_monthly_pte_totals` and `get_yesterday_pte_totals`. These are the SQL functions that power the PTE stat cards at the top of the dashboard.

The root causes are two specific problems inside those functions.

---

## Root Cause 1 — `COALESCE(signed_at, created_at)::date` Breaks Index Usage

Every PTE function filters manifests like this:

```sql
WHERE COALESCE(signed_at, created_at)::date >= date_trunc('month', CURRENT_DATE)::date
```

The problem: wrapping a column in `COALESCE(...)::date` makes Postgres unable to use any index on `signed_at` or `created_at`. Postgres has to scan the entire manifests table row-by-row and compute the expression for every row to evaluate the filter. This is confirmed by the query plan:

```
Seq Scan on manifests   ← full table scan, no index used
Filter: ((COALESCE(signed_at, created_at))::date >= ...)
```

The fix is to rewrite the filter to use indexed columns directly:

```sql
-- Instead of:
COALESCE(signed_at, created_at)::date >= date_trunc('month', CURRENT_DATE)::date

-- Use:
(signed_at >= date_trunc('month', CURRENT_DATE) OR created_at >= date_trunc('month', CURRENT_DATE))
```

This lets Postgres use the existing `idx_manifests_org_status_signed` and `idx_manifests_org_status_date` indexes.

---

## Root Cause 2 — `NOT IN (subquery)` Is the Slowest Possible Anti-Join

Each function also runs:

```sql
AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL AND organization_id = org_id)
```

`NOT IN` with a subquery is known to be one of the worst SQL patterns for performance. It forces Postgres to re-evaluate the subquery for every row and cannot use indexes efficiently. The query plan confirms it runs a sequential scan on `dropoffs` for every manifest row.

The fix is to replace it with `NOT EXISTS`, which uses an anti-join that Postgres can optimize:

```sql
-- Instead of:
AND id NOT IN (SELECT manifest_id FROM dropoffs WHERE manifest_id IS NOT NULL ...)

-- Use:
AND NOT EXISTS (SELECT 1 FROM dropoffs WHERE manifest_id = manifests.id AND organization_id = org_id)
```

This allows Postgres to use the existing `idx_dropoffs_manifest_id` index and stop early on the first match.

---

## Root Cause 3 — Dashboard Polls Every 30 Seconds

In `useDashboardData.ts`, every stat query uses `refetchInterval: 30000` (30 seconds). This means the slow, timing-out functions are being called automatically every 30 seconds even while you are sitting on the dashboard. This compounds the timeout problem — while one request is timing out, the next one fires before the first finishes.

After fixing the SQL, the polling should be relaxed to 5 minutes for monthly/weekly stats (which don't change minute by minute) and 2 minutes for today/yesterday stats.

---

## The Fix Plan

### Fix 1 — Rewrite All 4 PTE SQL Functions (Database Migration)

Replace `COALESCE(signed_at, created_at)::date` with index-friendly range comparisons, and replace `NOT IN` with `NOT EXISTS` in all four functions:
- `get_today_pte_totals`
- `get_yesterday_pte_totals`
- `get_weekly_pte_totals`
- `get_monthly_pte_totals`

Each function runs the same manifests scan twice (once for pickup_ptes, once for total_ptes). The rewrite will make both subqueries use indexes.

### Fix 2 — Relax Poll Intervals in `useDashboardData.ts`

| Query | Current | After Fix |
|---|---|---|
| Today PTEs | 30 seconds | 2 minutes |
| Yesterday PTEs | 30 seconds | 5 minutes |
| Weekly PTEs | 30 seconds | 5 minutes |
| Monthly PTEs | 30 seconds | 10 minutes |
| Comparison data | 60 seconds | 15 minutes |
| Charts/Revenue | 30 seconds | 10 minutes |

This alone cuts the database load by 80%. Yesterday and monthly stats simply do not change every 30 seconds.

---

## Files Changed

| File | Change |
|---|---|
| New migration | Rewrite all 4 PTE SQL functions with index-friendly WHERE clauses and NOT EXISTS anti-joins |
| `src/hooks/useDashboardData.ts` | Relax refetchInterval for all queries (today: 2min, historical: 5-15min) |

---

## What You Will See After This Fix

- The dashboard will load immediately instead of waiting for timed-out queries
- The stat cards (Today / Yesterday / Weekly / Monthly PTEs) will populate within 1-2 seconds
- The database log will stop showing hundreds of timeout errors
- The app will feel dramatically faster on every page (since these timeouts were blocking the connection pool)
