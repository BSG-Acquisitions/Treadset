

## Plan: Add time tracking details to trailer tiles

The trailer event data (who moved it, when, what action) already exists in the database via `trailer_events`. The `TrailerCard` component currently shows only a relative "2 hours ago" timestamp. The fix is purely UI — surface more detail on each tile.

### Changes to `src/components/trailers/TrailerCard.tsx`

**Compact view** (the tiles used in inventory/board views):
- Replace the generic relative time with a two-line time display:
  - Line 1: Event type label + driver name (e.g., "Staged Empty — Jody")
  - Line 2: Exact date/time + relative time (e.g., "Mar 3 at 2:45 PM · 2h ago")

**Full card view**:
- Add the event type label next to the driver name in the last_event section
- Show the exact timestamp formatted as `MMM d 'at' h:mm a` alongside the relative time

### Changes to `src/hooks/useTrailerInventory.ts`

The `last_event` object already includes `event_type` and `driver` info. No data model or query changes needed — the `TrailerWithLastEvent` interface already has everything required.

### No database changes needed

All the timestamp and driver data is already captured in `trailer_events.timestamp` and `trailer_events.driver_id`. This is a display-only change.

### Summary

One file changed: `TrailerCard.tsx` — add formatted date/time, event type label, and driver name to both compact and full card views so operators can see exactly when and by whom a trailer was last moved.

