
# Fix: Wire the Notification System So It Actually Shows Notifications

## The Root Cause — The Notification Inbox is Always Empty

There are **545 notifications** in the database (247 unread warnings, 124 unread missing_pickups, etc.) — but the app shows zero for every user including you (Zach). Here is exactly why:

### The ID Mismatch Bug

The edge functions (like `check-missing-pickups` and `check-manifest-reminders`) store notifications using the **internal `users.id`** (e.g., `1c39d6ae-...` for Zach). They get this from `user_organization_roles.user_id`.

But `useEnhancedNotifications` fetches notifications with:
```text
.eq('user_id', authUserId)
```
where `authUserId = session.user.id` — which is the **Supabase Auth UUID** (e.g., `70c2f0d6-...` for Zach).

These are two completely different UUIDs. The query never finds anything. This is confirmed by the database: zero notifications exist for Zach's auth UUID, even though 545 notifications exist using internal IDs.

**Fix:** Change the notification query to use `users.id` (the internal ID), not `session.user.id`. The hook already has access to `user` from `useAuth()` which contains the internal user record — specifically `user.id` which is the internal ID.

### The Manifest Health Scan Is a Separate Page (User Doesn't Want That)

The `/manifest-health` page was added as a standalone page. The user wants these issues to flow through the notification bell instead. So:
- Remove the `/manifest-health` route from the sidebar nav
- Add a new `check-manifest-health` edge function that scans for the same compliance issues the health scan page detects and creates real notifications for them
- Wire it into the auto-trigger in `useEnhancedNotifications`

## What Gets Fixed

### Fix 1 — `useEnhancedNotifications.ts`: Use Internal User ID

Change `authUserId` from `session.user.id` to `user.id` (the internal users table ID):

```text
BEFORE: const authUserId = session?.user?.id ?? null;  // auth UUID
AFTER:  the query needs to use user?.id (internal DB UUID)
```

The query in `markAllAsRead` and `deleteAllRead` also uses `authUserId` — those all need the same fix.

### Fix 2 — New Edge Function: `check-manifest-health`

A new edge function that runs the same compliance checks as `useManifestHealthScan` but on the server side and inserts real notifications. It checks every manifest in `COMPLETED` or `AWAITING_RECEIVER_SIGNATURE` status and creates a `warning` or `error` notification when any of these are detected:

| Check | Notification Title |
|---|---|
| `customer_signature_png_path IS NULL` | "Manifest missing generator signature" |
| `driver_signature_png_path IS NULL` | "Manifest missing hauler signature" |
| `signed_by_name IS NULL` | "Manifest missing printed name" |
| `generator_signed_at IS NULL` | "Manifest missing generator timestamp" |
| `status = COMPLETED AND receiver_signed_at IS NULL` | "Completed manifest missing receiver timestamp" |

The function deduplicates: only creates a notification if one doesn't already exist for that specific manifest + issue combo in the last 7 days.

### Fix 3 — Wire `check-manifest-health` into Auto-Trigger

In `useEnhancedNotifications`, the `useEffect` already auto-calls `check-missing-pickups`, `check-manifest-reminders`, and `check-trailer-alerts` on login. Add `check-manifest-health` to that list.

### Fix 4 — Remove `/manifest-health` from Sidebar

Since the user wants everything in the notification bell, remove the "Manifest Health" nav item from `AppSidebar.tsx`. The page and hook can stay as internal code (used by other parts), but it should not be a top-level nav item.

### Fix 5 — Notification Panel: Show "Manifest" as Actionable Link

In `EnhancedNotificationCenter.tsx`, notifications of `type: 'warning'` that have `related_type: 'manifest'` should show a "View Manifest" action button that navigates to `/manifests/{related_id}`. Currently all notifications render the same way regardless of type.

## Files Changed

| File | Change |
|---|---|
| `src/hooks/useEnhancedNotifications.ts` | Fix `authUserId` to use internal `user.id` from `useAuth()`, not `session.user.id`. Update all mutations (markAllAsRead, deleteAllRead) to use the same corrected ID. Add `check-manifest-health` to the auto-trigger. |
| `supabase/functions/check-manifest-health/index.ts` | New edge function — scans all manifests for compliance issues and creates notifications for admin/ops_manager users |
| `src/components/AppSidebar.tsx` | Remove the "Manifest Health" nav item |
| `src/components/notifications/EnhancedNotificationCenter.tsx` | Add "View Manifest" action link for manifest-related notifications |

## What You'll See After This Fix

- The notification bell will immediately start showing the existing 545 notifications that are already in the database (they were always there — just never being fetched)
- Every time someone logs in, the system auto-checks for manifest compliance issues and creates new notifications if manifests are missing signatures, names, or timestamps
- Clicking a manifest notification will offer a direct link to that manifest
- The sidebar will not have a separate "Manifest Health" page — everything flows through the bell

## Note on the 35 Recent Manifests With Issues

The scan confirmed that right now (last 30 days): **35 manifests are missing generator signatures, hauler signatures, and printed names**. Two of these are from today (manifests 20260218-00004 and 20260218-00002, both COMPLETED). These will immediately generate notifications once the fix is deployed.
