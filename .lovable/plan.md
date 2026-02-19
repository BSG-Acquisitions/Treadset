
# Complete Performance Audit — 4 Remaining Issues Causing Slowness

## The Good News First

The SQL rewrite worked. Running `get_monthly_pte_totals` directly against the database returns instantly — the queries are now using `BitmapOr` with `idx_manifests_org_status_signed` and `idx_manifests_org_status_date`. The function-level fix is correct.

The statement timeouts still appearing in the logs are coming from **other sources** — not the PTE functions.

---

## Issue 1 — `useDropoffs` Has `staleTime: 0` and Refetches Everything on Every Window Focus

In `src/hooks/useDropoffs.ts`, the base `useDropoffs` hook (not just `useTodaysDropoffs`) is configured with:

```ts
refetchOnWindowFocus: true,
staleTime: 0   // ← forces a fresh fetch every time, on every tab switch
```

This hook fetches **ALL dropoffs ever** for an organization — no date filter, no limit. It selects all columns with client joins. Every time you switch browser tabs or come back to the window, it fires a full table dump of all dropoffs.

**Fix:** Add `staleTime: 5 * 60 * 1000` and change `refetchOnWindowFocus: false` on the base `useDropoffs` hook.

---

## Issue 2 — `useContextualNotifications` Makes N+1 Notification Queries Every Hour

In `src/hooks/useContextualNotifications.ts`, there are 3 separate `useQuery` calls that each:

1. First query `users` table to get org ID (duplicate, should use `user.currentOrganization.id` from AuthContext directly)
2. Then query `manifests` or `clients` for the check
3. Then loop through every result and fire an **individual notification existence check** for each one

For a company with 50 draft manifests, this is 50 sequential round trips to check `notifications` before creating each one. This runs every hour and can cascade.

**Fix:** Remove the per-item notification duplication check loop and replace with a single bulk query: `SELECT related_id FROM notifications WHERE user_id = X AND related_type = 'manifest' AND created_at > yesterday`. Use `user.currentOrganization.id` directly instead of re-querying the users table each time.

---

## Issue 3 — `useTodaysDropoffs` Has No `staleTime` or `organization_id` Filter

In `src/hooks/useDropoffs.ts` at line 145:

```ts
export const useTodaysDropoffs = () => {
  return useQuery({
    queryKey: ['todays-dropoffs'],
    queryFn: async () => {
      // No organization_id filter!
      const { data, error } = await supabase
        .from('dropoffs')
        .select(`*, clients(...)`)
        .eq('dropoff_date', today)
```

There is **no `organization_id` filter** on this query. It fetches every dropoff across all organizations for today. Combined with no staleTime, it refetches on every mount. On the dashboard, this is called by `Index.tsx` on every render.

**Fix:** Add `organization_id` filter using `user.currentOrganization.id` from auth context, add `staleTime: 5 * 60 * 1000`, and add `enabled: !!orgId`.

---

## Issue 4 — `useRealtimeUpdates` Subscribes to 6 Postgres Change Channels, Invalidates Entire Query Caches

In `src/hooks/useRealtimeUpdates.ts`, 6 Supabase Realtime channels are opened simultaneously. When any manifest, pickup, vehicle, client, assignment, or client summary changes anywhere:

- `queryClient.invalidateQueries({ queryKey: ['manifests'] })` — invalidates ALL manifest queries
- `queryClient.invalidateQueries({ queryKey: ['pickups'] })` — invalidates ALL pickup queries

Each invalidation triggers **all matching queries to refetch immediately**, including cached PTE calculations. This means when a manifest is signed, it instantly cancels the `staleTime` on all manifests-related queries and fires fresh requests — including the now-fixed but still non-trivial PTE functions.

**Fix:** Add `refetchType: 'none'` to the invalidateQueries calls so they mark cache as stale but don't trigger immediate refetches. React Query will then use the cached data until the component naturally refetches at its next interval.

```ts
queryClient.invalidateQueries({ queryKey: ['manifests'], refetchType: 'none' });
```

---

## Files To Change

| File | Change |
|---|---|
| `src/hooks/useDropoffs.ts` | Add `staleTime: 5 * 60 * 1000`, remove `staleTime: 0` from base hook; add `organization_id` filter + `staleTime` + `enabled` to `useTodaysDropoffs` |
| `src/hooks/useRealtimeUpdates.ts` | Add `refetchType: 'none'` to all 6 `invalidateQueries` calls |
| `src/hooks/useContextualNotifications.ts` | Replace per-item notification checks with single bulk query; use `user.currentOrganization.id` instead of re-querying users table |

---

## What You'll See After This Fix

- Switching between browser tabs no longer hammers the database
- Real-time manifest updates mark caches stale but don't immediately fire 6+ queries
- Today's dropoffs only fetches your org's data, not all orgs
- The contextual notification checker stops making N+1 round trips
- Statement timeouts should drop to near zero
