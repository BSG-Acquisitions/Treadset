

## Plan: Auto-Schedule Routes on Creation & Fix Driver Visibility

### Root Cause

Two issues are causing Jody to see nothing:

1. **Route created as `'draft'`**: The wizard inserts routes with `status: 'draft'` (line 151 of `useTrailerRoutes.ts`). The driver query (`useDriverTrailerRoutes`) only fetches routes with status `['scheduled', 'in_progress']`. So draft routes are invisible to the driver.

2. **Unnecessary manual steps**: After creation, you have to click "Schedule" and then "Start" — two extra clicks that serve no purpose since you've already gone through the full 3-step wizard.

### Fix

#### 1. Create routes as `'scheduled'` instead of `'draft'`
**File**: `src/hooks/useTrailerRoutes.ts` (line 151)
- Change `status: 'draft'` → `status: 'scheduled'` in `useCreateTrailerRoute`
- This makes the route immediately visible to the assigned driver after the wizard completes

#### 2. Remove "Schedule" and "Start" buttons from dispatcher view (if they exist for new routes)
- The wizard already collects all the information. No reason to require extra clicks.
- Routes created through the wizard go straight to `'scheduled'` status and appear on the driver's schedule immediately.

### Files to edit
| File | Change |
|------|--------|
| `src/hooks/useTrailerRoutes.ts` | Change default status from `'draft'` to `'scheduled'` on creation |

### Result
Dispatcher completes the 3-step wizard → route is immediately `'scheduled'` → driver sees it on their dashboard. One flow, no extra clicks.

