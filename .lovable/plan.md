

## Plan: Fix React Hooks Violation Crash on Dashboard

### Root Cause

In `src/pages/Index.tsx`, there is a **conditional early return on lines 62-70** (for pure drivers), followed by **React hooks on lines 73-93+** (`useRealtimeUpdates`, `usePickups`, `useClients`, `useTodaysDropoffs`, `useDashboardData`, `useQuery`). This violates React's Rules of Hooks — hooks must always be called in the same order on every render. When the early return triggers, React detects the hook count mismatch on subsequent renders and throws an error, which the ErrorBoundary catches and displays as "Something went wrong."

### Fix

Move **all hook calls** above the conditional early return (line 62). The hooks will still execute but their results simply won't be used when the driver redirect happens. This is the standard React pattern for conditional rendering.

### File to Edit

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Move `useRealtimeUpdates()`, `usePickups()`, `useClients()`, `useTodaysDropoffs()`, `useDashboardData()`, and the `useQuery` for `pickupsThisMonth` to **before** the conditional return block on line 62 |

### What This Fixes
The dashboard will load without crashing for all users. Pure drivers will still be redirected to `/driver/dashboard` as before, but the hooks will execute safely before the redirect logic runs.

