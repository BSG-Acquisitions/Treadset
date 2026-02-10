

# Speed Up App Load Time

## Problems Found

1. **Every single page is imported upfront** -- App.tsx eagerly imports 60+ page components. The browser downloads and parses ALL of them before showing anything, even though the user only visits one page at a time.

2. **Assignments query polls every 5 seconds** -- `useAssignments` has `refetchInterval: 5000`, which hammers the database constantly and slows everything down, especially on initial load when multiple queries are already fighting for bandwidth.

3. **Duplicate organization ID lookups** -- `usePickups` calls `supabase.rpc('get_current_user_organization')` every time it fetches data, even though the org ID is already available from `AuthContext.user.currentOrganization.id`. That's an extra database round-trip on every single query.

4. **No caching configured** -- The `QueryClient` is created with zero configuration (`new QueryClient()`), so every query defaults to `staleTime: 0`. This means every time you navigate to a page you've already visited, it refetches everything from scratch instead of showing cached data instantly.

5. **Vehicles query has no caching** -- Vehicle data rarely changes but is fetched fresh every time with no stale time.

## What We'll Fix (Ordered by Impact)

### 1. Lazy-load all route pages (biggest impact)

Convert all 60+ page imports in `App.tsx` from eager imports to `React.lazy()`. This means the browser only downloads the code for the page you're actually visiting. First load will be dramatically faster.

Before: Browser loads ~2MB of JavaScript upfront
After: Browser loads ~200KB initially, then loads each page on demand

### 2. Add smart caching defaults to QueryClient

Configure the `QueryClient` with sensible defaults so data persists between page navigations:
- 5 minute stale time (show cached data immediately, refresh in background)
- 10 minute garbage collection time

### 3. Use cached org ID instead of RPC call

Update `usePickups` to get the organization ID from `AuthContext` instead of making a separate database call. Saves one round-trip per query.

### 4. Reduce assignment polling from 5s to 30s

Change `refetchInterval` from 5000ms to 30000ms. The real-time Supabase channel on the page already handles instant updates for location changes -- the polling is redundant backup.

### 5. Add stale times to vehicle and pickup queries

- Vehicles: 10 minute stale time (fleet data barely changes)
- Pickups: 2 minute stale time (show cached, refresh in background)
- Assignments: 30 second stale time (more dynamic but don't need to refetch on every render)

## Files to Change

| File | Change |
|------|--------|
| `src/App.tsx` | Convert all page imports to `React.lazy()`, wrap routes in `Suspense` |
| `src/hooks/usePickups.ts` | Use org ID from auth context instead of RPC; add stale times; reduce polling |
| `src/hooks/useVehicles.ts` | Add 10-minute stale time |

## Expected Result

- Initial page load: noticeably faster (only loads code for the current page)
- Navigating between pages you've visited: instant (cached data shown immediately)
- Less database load overall (fewer redundant queries)
- Data still stays fresh via background refetching

