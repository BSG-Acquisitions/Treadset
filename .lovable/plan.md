
Issue confirmed: the delete request is now failing one step earlier on `trailer_events` with  
`violates foreign key constraint "trailers_last_event_fkey" on table "trailers"`.

Do I know what the issue is? Yes.

### Root cause
- `trailers.last_event_id` references `trailer_events.id`.
- The FK `trailers_last_event_fkey` is currently `NO ACTION` (not `SET NULL`/`CASCADE`).
- When route deletion tries to remove route events, any trailer whose `last_event_id` points to one of those events blocks the delete.

### Implementation plan

1. **Make FK behavior safe at the database level**
   - **File:** new migration in `supabase/migrations/`
   - Drop and recreate `trailers_last_event_fkey` with `ON DELETE SET NULL`.
   - This ensures deleting an event automatically clears `trailers.last_event_id` instead of throwing 23503.

2. **Add app-level defensive cleanup in route delete flow**
   - **File:** `src/hooks/useTrailerRouteActions.ts`
   - In `useDeleteTrailerRoute` mutation, before deleting `trailer_events`:
     - Select event IDs for the route.
     - Set `trailers.last_event_id = null` where `last_event_id` is in those IDs.
   - Then keep deletion order:
     1) delete `trailer_events` by `route_id`,  
     2) delete `trailer_route_stops` by `route_id`,  
     3) delete `trailer_routes` by `id`.

3. **Keep user-facing behavior unchanged**
   - No UI changes required.
   - Existing delete confirmation modal/button flow remains as-is.

### Technical details (for reliability)
- DB-level `ON DELETE SET NULL` is the long-term integrity fix.
- Hook-level pre-nulling is an immediate safeguard so deletes work even before/while constraint changes roll out and to reduce risk of transient failures.
- This directly addresses the exact failing request seen in network logs (`DELETE /trailer_events?route_id=...` returning 409 with `trailers_last_event_fkey`).

### Verification plan
1. Try deleting one of yesterday’s test routes that currently fails.
2. Confirm no FK error toast appears.
3. Confirm route card disappears after success and list refetches.
4. Spot-check affected trailers: `last_event_id` is cleared (or auto-cleared by FK) and app remains stable.
5. Re-test end-to-end from `/trailers/routes` and from route detail page delete action.
