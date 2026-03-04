
Root cause confirmed: “Start Route” sends a PATCH successfully (204), but the route stays `scheduled` in DB due RLS, so stop cards never become interactive (`canInteract` requires `in_progress`). That is why Jody sees steps but no actionable buttons. A second issue is stop toggle wiring can double-toggle and block manual expansion.

Implementation plan:

1) Fix RLS so assigned drivers can run their own trailer routes
- Add a new Supabase migration with two driver UPDATE policies:
  - `trailer_routes`: assigned driver can update their own route row (needed for `scheduled -> in_progress -> completed`)
  - `trailer_route_stops`: assigned driver can update stops on their own route (needed for `completed_at`)
- Keep existing admin/ops/dispatcher policies unchanged.

2) Make route/stop updates fail loudly instead of silently
- `src/hooks/useTrailerRoutes.ts` (`useUpdateTrailerRoute`):
  - switch to `.update(...).eq('id', id).select('id,status').single()`
  - if no row returned, throw explicit permission/workflow error (so driver sees a real error toast).
- `src/pages/DriverTrailerAssignments.tsx` (`markStopComplete`):
  - capture and handle update errors; toast on failure and avoid false “progressed” UI state.

3) Fix stop expansion behavior so actions are always reachable
- `src/pages/DriverTrailerAssignments.tsx`:
  - remove double-toggle behavior in stop `Collapsible` (currently both trigger click and `onOpenChange` can toggle).
  - use a single source of truth for open state (set-open by stop id), so tapping a stop reliably opens `GuidedStopEvents` / `DriverStopEventActions`.

4) Preserve guided operational flow for driver
- After Start Route succeeds and DB returns `in_progress`, first incomplete stop auto-opens.
- Driver completes each planned event inside `GuidedStopEvents` (buttons: Complete or Sign & Complete).
- Event inserts continue to produce timestamps and manifests for signed events.
- “Mark Stop Complete” updates `completed_at` and auto-advances to next stop.

Technical details (concise):
- New migration file in `supabase/migrations/`:
  - `CREATE POLICY ... FOR UPDATE USING (...) WITH CHECK (...)` on `trailer_routes` where `driver_id = current user internal id`.
  - `CREATE POLICY ... FOR UPDATE` on `trailer_route_stops` where `route_id` belongs to a route assigned to current user.
- Files to edit:
  - `supabase/migrations/<new_timestamp>_driver_trailer_route_updates.sql`
  - `src/hooks/useTrailerRoutes.ts`
  - `src/pages/DriverTrailerAssignments.tsx`

Validation after implementation:
1. Login as Jody, press Start Route -> route status visibly changes to In Progress.
2. First stop opens with actionable event buttons.
3. Complete one event -> trailer_event row created with timestamp.
4. Mark stop complete -> next stop auto-opens.
5. Complete all stops -> Finish Route button appears and works.
