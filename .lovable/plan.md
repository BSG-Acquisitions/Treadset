

## Remove the Notification System

The notification system has been more trouble than value — causing performance issues, data bloat, and visibility problems. Here's the plan to cleanly remove it.

### Files to delete
- `src/components/notifications/EnhancedNotificationCenter.tsx`
- `src/components/notifications/MissingPickupActions.tsx`
- `src/components/notifications/ManifestReminderActions.tsx`
- `src/hooks/useEnhancedNotifications.ts`
- `src/hooks/useNotifications.ts`
- `src/hooks/useContextualNotifications.ts`
- `src/hooks/useManifestReminders.ts`
- `src/utils/seedNotifications.ts`
- `src/pages/NotificationTest.tsx`
- `src/pages/ManifestRemindersTest.tsx`

### Files to edit

1. **`src/components/TopNav.tsx`** — Remove the bell icon, popover, notification imports, `useEnhancedNotifications`, `useContextualNotifications`, `useManifestReminders` calls. Just delete the entire notification popover block (lines 110-125) and related imports.

2. **`src/hooks/useStripePayment.ts`** — Remove `useEnhancedNotifications` import and `createNotification` calls. Keep the toast notifications for payment success/failure (those are useful UI feedback).

3. **`src/App.tsx`** — Remove the lazy imports for `NotificationTest` and `ManifestRemindersTest`, and their route definitions.

4. **`src/pages/Settings.tsx`** — Remove the "Notifications" sidebar button (line 249-255) and the entire "Notification Preferences" card (lines 466-534).

### Database cleanup (SQL via insert tool)
- Truncate the `notifications` table to free up space
- The table and edge functions can stay in the database for now without causing issues since nothing will trigger them

### Edge functions (no changes needed)
The edge functions (`check-missing-pickups`, `check-manifest-reminders`, `check-trailer-alerts`, `check-manifest-health`) will no longer be triggered from the client. They can remain deployed harmlessly — removing them is optional and can be done later.

### What stays
- Toast notifications (`sonner`) for immediate user feedback on actions — these are separate from the notification system and remain useful.

