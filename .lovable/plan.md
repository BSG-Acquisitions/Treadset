
# Fix: Drag-and-Drop Pickup Rescheduling Does Not Update the UI

## Root Cause — Three Compounding Problems

### Problem 1: Query Cache Keys Are Mismatched in `useMovePickup`

`usePickups` stores data in the React Query cache under a **3-part key**:
```ts
queryKey: ['pickups', date, orgId]
// e.g. ['pickups', '2026-02-20', 'abc-org-id']
```

But `useMovePickup`'s `onSuccess` invalidates with just:
```ts
queryClient.invalidateQueries({ queryKey: ['pickups'] });
```

This **does** match all entries starting with `['pickups']`, so the invalidation itself is technically correct. However...

### Problem 2: `staleTime: 2 * 60 * 1000` Blocks the Refetch

`usePickups` was given a 2-minute `staleTime` during the previous performance optimization. When `invalidateQueries` is called, React Query marks the cache as stale — but since the column components are already mounted and actively subscribed, React Query checks if the data is still within the `staleTime` window. If the data was fetched less than 2 minutes ago (which it almost certainly was), **the refetch is silently skipped**.

The pickup card disappears from neither the old day column nor appears in the new day column.

### Problem 3: `useRealtimeUpdates` Uses `refetchType: 'none'` on Pickups

The recent performance fix added `refetchType: 'none'` to all realtime invalidations:
```ts
queryClient.invalidateQueries({ queryKey: ['pickups'], refetchType: 'none' });
```

This means even the realtime Postgres change event (which fires when the pickup's `pickup_date` is updated in the database) will not trigger a UI refresh. The realtime channel correctly receives the change but the cache is only marked stale — never actually refetched.

## The Fix

### Fix 1 — `useMovePickup.ts`: Use Optimistic Cache Updates + Force Immediate Refetch

Instead of relying on invalidation alone, immediately update the cache for both the **source day** and **destination day** optimistically, then force an immediate refetch of both specific date keys. This makes the drag response feel instant.

```ts
onSuccess: (data) => {
  // Force immediate refetch of BOTH the source and destination day columns
  queryClient.invalidateQueries({ queryKey: ['pickups', data.oldDate] });
  queryClient.invalidateQueries({ queryKey: ['pickups', data.newDate] });
  queryClient.refetchQueries({ queryKey: ['pickups'], type: 'active' });
  ...
}
```

To make this work, `mutationFn` needs to also return `oldDate` (the source date). The `handleDrop` in `WeeklyPickupsGrid.tsx` already passes `sourceDate` via `dataTransfer` — we just need `useMovePickup` to accept and return it.

### Fix 2 — `useRealtimeUpdates.ts`: Allow Pickup Changes to Trigger Active Refetch

The realtime channel for `pickups` should NOT use `refetchType: 'none'` — this is the exact scenario realtime is designed for. The performance concern was about dashboard PTE stat functions, not pickup list queries. Pickup list queries are lightweight (just a date-filtered table select).

Change:
```ts
queryClient.invalidateQueries({ queryKey: ['pickups'], refetchType: 'none' });
```
To:
```ts
queryClient.invalidateQueries({ queryKey: ['pickups'] }); // allows active queries to refetch
```

### Fix 3 — `WeeklyPickupsGrid.tsx`: Pass `sourceDate` to `useMovePickup`

The `handleDrop` already reads `sourceDate` from `dataTransfer`. Pass it to `movePickup.mutate` so the mutation can update and refetch the correct cache keys.

```ts
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  setIsDragOver(false);
  const pickupId = e.dataTransfer.getData('pickupId');
  const sourceDate = e.dataTransfer.getData('sourceDate');
  if (pickupId && sourceDate !== dateStr) {
    movePickup.mutate({ pickupId, newDate: dateStr, oldDate: sourceDate });
  }
};
```

### Fix 4 — `usePickups` `staleTime`: Reduce for Active Weekly Grid

The 2-minute `staleTime` is appropriate for the dashboard, but the weekly pickups grid needs faster updates when mutations happen. The fix is to not rely on `staleTime` for post-mutation refreshes — instead, directly call `refetchQueries` with `type: 'active'` after each move, which bypasses `staleTime` and forces an immediate re-fetch.

---

## Files to Change

| File | Change |
|---|---|
| `src/hooks/useMovePickup.ts` | Accept `oldDate` param; after success, call `refetchQueries({ queryKey: ['pickups'], type: 'active' })` to bypass staleTime |
| `src/components/routes/WeeklyPickupsGrid.tsx` | Pass `sourceDate` as `oldDate` to `movePickup.mutate` in `handleDrop` |
| `src/hooks/useRealtimeUpdates.ts` | Remove `refetchType: 'none'` from the pickups channel so active queries refresh on DB change |

---

## What You'll See After This Fix

- Dragging a pickup card to a different day column will immediately remove it from the source column and show it in the destination column
- No page refresh needed
- The toast "Pickup Moved" will appear as confirmation
- If you drag back, it correctly moves back
