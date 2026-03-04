

## Remove Trailer Assignment from Route Pickup Cards

The pickup cards on `/routes/today` (`EnhancedRoutesToday.tsx`) show a `TrailerAssignmentDropdown` on each card (lines 396-403). This is unnecessary for these tire pickup routes — trailers are managed separately through the trailer routing system.

### Change

**`src/pages/EnhancedRoutesToday.tsx`**
- Remove the `TrailerAssignmentDropdown` import (line 10)
- Remove the trailer assignment block (lines 396-403) from the pickup card rendering

That's it — two deletions, no other files affected.

