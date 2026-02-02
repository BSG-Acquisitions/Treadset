
# Increase Route Suggestions Radius to 10 Miles

## Current Configuration

The `driver-route-suggestions` edge function currently uses a **5-mile radius** for finding clients near scheduled stops.

## Changes Required

### File: `supabase/functions/driver-route-suggestions/index.ts`

| Line | Change | Before | After |
|------|--------|--------|-------|
| 137 | Initial search radius | `if (minDistance <= 5)` | `if (minDistance <= 10)` |
| 151 | User message | `"within 5 miles"` | `"within 10 miles"` |

### Code Changes

**Line 137** - Expand the initial search filter:
```typescript
// Before:
if (minDistance <= 5) {

// After:
if (minDistance <= 10) {
```

**Lines 147-154** - Update the "no clients found" message:
```typescript
// Before:
message: 'No additional clients found within 5 miles of your route'

// After:
message: 'No additional clients found within 10 miles of your route'
```

## What Stays the Same

- **"Along Route" grouping threshold**: Still 2 miles (line 365) - clients within 2 miles are marked as "along route"
- **"Overdue" threshold**: Still 30+ days since last pickup
- **Priority logic**: High priority for < 1 mile, medium for 1-2 miles

## Result

After this change:
- Drivers will see clients up to **10 miles** from any scheduled stop
- "Along Your Route" section: Clients within **2 miles** (minimal detour)
- All other nearby clients (2-10 miles): Still shown in suggestions
- "Overdue Clients" section: Clients 30+ days overdue within the 10-mile radius

## Deployment

After modifying the edge function, it will need to be redeployed for the changes to take effect.
