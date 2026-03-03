

## Plan: Guided Trailer Stop Workflow for Drivers

### Problem
When the dispatcher creates a trailer route with stops and events (step 3 of the wizard), those events fire immediately as completed `trailer_events` — they're not stored as *planned* actions for the driver. So when Jody opens a stop, he sees a generic grid of 6 event-type buttons with no guidance on what he's supposed to do at each location.

The desired workflow (example):
1. **BSG** → Pick up empty trailer #123
2. **Tire Disposal** → Drop empty #123, Pick up full #456
3. **NTech** → Drop full #456, Pick up empty #789
4. **BSG** → Drop empty #789

### Changes

**1. Database: Add `planned_events` column to `trailer_route_stops`**

Add a JSONB column to store the dispatcher's planned events per stop:
```sql
ALTER TABLE trailer_route_stops 
ADD COLUMN planned_events jsonb DEFAULT '[]';
```

Format: `[{ "event_type": "pickup_empty", "trailer_id": "uuid", "trailer_number": "123" }]`

**2. Fix `TrailerRouteWizard.tsx` — Store planned events instead of firing them**

In `handleSubmit` (line 182-189), instead of calling `createEvent.mutateAsync` (which creates a real completed event), save the events as `planned_events` on the stop record. Remove the immediate event creation entirely.

**3. Update `DriverTrailerAssignments.tsx` — Show guided stop actions**

Replace the generic `DriverStopEventActions` grid with a guided view per stop:
- Show each planned event as a card: "Drop Empty — Trailer #123" with a "Complete" button
- Driver taps "Complete" → fires the real `trailer_event`, which updates trailer status/location via the existing `update_trailer_from_event` trigger
- Track completion by comparing planned events against actual `trailer_events` for that stop
- Once all planned events at a stop are done, show "Mark Stop Complete"
- Driver can still add unplanned events if needed (collapsible "Add Other Event" section)

**4. No changes to `useStopTrailerEvents.ts` or the event completion logic** — the existing `useCompleteTrailerEvent` hook already handles creating events, updating trailer status, and generating manifests for signed events. We just change how it's invoked (from guided cards instead of a generic picker).

### Result
Jody sees exactly what to do at each stop — which trailer to pick up or drop, whether it's empty or full — and completes each action with a single tap. The trailer inventory board updates in real-time as each event fires.

