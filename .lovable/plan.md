
# Fix: Notifications Are Still Empty — Two Remaining Root Causes

## What the Database Actually Shows Right Now

The hook code was corrected to use `user.id` (internal ID). But the database proves notifications are still unreachable:

- **545 notifications** exist in the database
- They are stored against 3 user IDs: `0bb957cc`, `4799a680`, `c23a9f4d`
- **None of these match any row in the `users` table** — they are orphaned records written by the edge functions using IDs from a different source (likely `user_organization_roles.user_id` references that pointed to a stale users table state)
- Every real user (Zach, Justin, Ethan, Liz, etc.) has zero notifications linked to them

This means: even though the hook is now querying the right column, it still returns zero because the notifications were never written with matching IDs.

---

## Root Cause 1 — The `AuthContext` Fallback Uses the Wrong ID

In `AuthContext.tsx`, when the `users` table query fails or returns nothing, the fallback is:

```
id: authUser.id  // This is the Supabase Auth UUID, NOT the internal users.id
```

So if Ethan or anyone hits a load error, `user.id` in the app becomes the Auth UUID — and the notification query will never find anything, even if the edge functions write correctly.

**Fix:** Change all three fallback `setUserIfChanged` calls in `AuthContext` to fetch and use the real `users.id` where possible, or at minimum ensure the fallback makes clear it is an auth ID mismatch. Since the users table always has a row created by the `handle_new_user_organization` trigger, the correct fix is to look up `users.id` from `users WHERE auth_user_id = authUser.id` before falling back.

---

## Root Cause 2 — The Edge Functions Were Writing to Orphaned User IDs

The 3 user IDs in the notifications table (`0bb957cc`, `4799a680`, `c23a9f4d`) do not exist in the `users` table. This means the edge functions looked up users via `user_organization_roles` and found IDs that were deleted or from a previous state of the database.

Those 545 old notifications are permanently orphaned — they can never be seen. The clean fix is:

1. **Delete all orphaned notifications** (those whose `user_id` doesn't match any real `users.id`) via a migration
2. **Re-run the edge functions** after login so fresh notifications get written against the correct, current user IDs

---

## Root Cause 3 — `useEnhancedNotifications` Auto-Trigger Uses `user.id` Which May Be Auth UUID

In `useEnhancedNotifications.ts`, the auto-trigger uses:
```ts
.eq('auth_user_id', user.id)
```
to look up the organization. If `user.id` is the auth UUID (from the fallback), this works. But then the notification query uses `internalUserId = user?.id` which is the same potentially-wrong value.

The auto-trigger correctly queries `.eq('auth_user_id', user.id)` to get the org — that part is fine. The problem is the query `queryKey: ['enhanced-notifications', internalUserId]` then uses `user.id` directly as the `user_id` filter. If the fallback path is active, `user.id` is the auth UUID and the query returns nothing.

---

## The Fix Plan

### Fix 1 — Clean Up Orphaned Notifications (Database Migration)

Delete all notifications where `user_id` does not match any row in `users`:

```sql
DELETE FROM notifications 
WHERE user_id NOT IN (SELECT id FROM users)
AND user_id IS NOT NULL;
```

This clears the 538 orphaned notifications (the old bad data). The 7 null user_id ones (contact form submissions) stay since those are a different type.

### Fix 2 — Fix AuthContext Fallback to Not Use Auth UUID as `user.id`

In `AuthContext.tsx`, there are three `setUserIfChanged` fallback calls that do `id: authUser.id`. Each of these needs to look up the real internal ID first:

```ts
// Before falling back, try to get the real internal ID
const { data: basicUser } = await supabase
  .from('users')
  .select('id')
  .eq('auth_user_id', authUser.id)
  .maybeSingle();

setUserIfChanged({
  id: basicUser?.id || authUser.id,  // prefer internal ID
  ...
});
```

This ensures that even when the full user data load fails, `user.id` is the real internal UUID that edge functions use for notifications.

### Fix 3 — Re-run Notification Checks on Next Login

Once the auth context fix is in place, the next login will:
1. Get the correct internal `user.id`
2. The auto-trigger in `useEnhancedNotifications` will fire after 5 seconds
3. Edge functions will write fresh notifications using the correct user ID
4. The query will find them

No manual intervention needed — just log out and back in after the deploy.

---

## Files Changed

| File | Change |
|---|---|
| Database migration | Delete 538 orphaned notifications that can never be seen |
| `src/contexts/AuthContext.tsx` | Fix all 3 fallback `setUserIfChanged` calls to look up real `users.id` before falling back to `authUser.id` |

## What You'll See After This Fix

- On next login, the edge functions fire and write fresh notifications against your real internal user ID
- The notification bell will show the new notifications (missing pickups, manifest compliance issues, etc.)
- The orphaned historical notifications are cleared — they were invisible anyway and cannot be retroactively fixed
- Ethan, Justin, and you will all see notifications correctly because the auth context fallback no longer corrupts the user ID
