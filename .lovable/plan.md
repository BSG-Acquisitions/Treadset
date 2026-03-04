

## Fix Notification Bloat and Performance Impact

### Problem
There are **44,807 unread notifications** in the database, all accumulated since January. This is caused by:

1. **Every page load triggers 4 edge functions** — `triggeredRef` only prevents re-firing within a single React mount. Refreshing the page or opening a new tab fires all four again.
2. **Short dedup windows** — `check-manifest-reminders` deduplicates over 1 day, `check-missing-pickups` over 3 days, meaning the same notifications get recreated repeatedly.
3. **No notification cap** — nothing prevents unbounded growth.

This absolutely slows the app down: 44K+ rows in a table that's queried every 60 seconds, plus 4 edge function invocations on every page load.

### Plan

#### 1. Purge old notifications (SQL migration)
Delete all notifications older than 14 days and all read notifications to bring the count to a manageable level:
```sql
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '14 days';
DELETE FROM notifications WHERE is_read = true;
```

#### 2. Throttle edge function triggers to once per 6 hours
**File: `src/hooks/useEnhancedNotifications.ts`**
- Replace `triggeredRef` (which resets on page reload) with a `localStorage` timestamp check
- Only invoke the 4 edge functions if 6+ hours have passed since the last trigger
- This reduces edge function calls from ~dozens/day to ~2-3/day per user

#### 3. Increase dedup windows in edge functions
- **`supabase/functions/check-manifest-reminders/index.ts`**: Change dedup from 1 day to 7 days
- **`supabase/functions/check-missing-pickups/index.ts`**: Change dedup from 3 days to 7 days
- **`supabase/functions/check-manifest-health/index.ts`**: Already 7 days, no change needed

#### 4. Add per-user notification cap in edge functions
In all three edge functions, before inserting new notifications, check if the user already has 100+ unread notifications. If so, skip insertion. This prevents runaway growth even if dedup fails.

#### 5. Disable `useContextualNotifications` duplicate checks
**File: `src/hooks/useContextualNotifications.ts`**
- This hook creates *additional* client-side notifications on top of what the edge functions already produce, compounding the duplication problem
- Disable the incomplete-manifests and unassigned-pickups checks since the edge functions already handle these

### Expected Result
- Notification count drops from 44K to a few hundred
- Page loads no longer fire 4 edge functions every time
- Notification query (every 60s) scans a small table instead of 44K rows
- App performance improves noticeably

