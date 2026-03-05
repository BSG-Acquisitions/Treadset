

## Fix: Missing DELETE RLS Policy on `trailer_events`

The root cause is that the `trailer_events` table has RLS enabled but **no DELETE policy**. When the code tries to delete events by `stop_id`, RLS silently blocks it (returns 204 but deletes nothing). The stops still have child events, so deleting stops fails with the FK constraint error.

### Changes

1. **Database migration**: Add a DELETE RLS policy on `trailer_events` allowing org members to delete events in their organization (matching the existing INSERT/SELECT pattern).

2. **Code improvement** (`src/hooks/useTrailerRouteActions.ts`): Also delete `trailer_events` by `route_id` (not just `stop_id`) since events have a `route_id` FK to `trailer_routes` as well. Delete events by route_id first, then delete stops, then delete the route. This covers all FK paths.

