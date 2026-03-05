

## Allow Deleting Routes in Any Status

Currently the delete button only appears for `draft` routes (line ~185 in TrailerRoutes.tsx). Need to make it available for all statuses so you can clean up test routes.

### Change
**File:** `src/pages/TrailerRoutes.tsx`

Remove the `{route.status === 'draft' && ...}` condition wrapping the delete AlertDialog (around lines 185-205), so the delete button and confirmation dialog show on every route card regardless of status.

