

## Plan: Allow "Any Trailer" Planned Events with Driver-Side Trailer Selection

### Problem
When dispatching, sometimes you don't know which specific trailer the driver will pick up at a location (e.g., multiple trailers at Ntech). The dispatcher should be able to say "Pick Up Empty" without specifying a trailer number, and the driver fills in the actual trailer when they complete the event.

### Changes

#### 1. Make trailer optional in the wizard (Step 3)
**File**: `src/components/trailers/TrailerRouteWizard.tsx`
- In `StopEventEditor`, add an "Any Available" option to the trailer dropdown (or allow submitting without a trailer selected)
- When "Any Available" is chosen, store `trailer_id: null` and `trailer_number: "Any"` in the event data
- Update `addEventToStop` to accept `trailerId` as optional
- Update the `EventData` interface to allow `trailer_id: string | null`
- On submit, store planned events with `trailer_id: null` and `trailer_number: "Any"` in the JSONB

#### 2. Update PlannedEvent type
**File**: `src/hooks/useTrailerRoutes.ts`
- Change `PlannedEvent.trailer_id` to `string | null`
- Keep `trailer_number` as string (will be "Any" when unassigned)

#### 3. Driver-side: show trailer selector for "Any" events
**File**: `src/components/trailers/GuidedStopEvents.tsx`
- When a driver taps a planned event where `trailer_id` is null, show a trailer selection dropdown before proceeding (or before signature)
- The driver picks the actual trailer, then completes the event with that real trailer ID
- Update `handleComplete` to accept an overridden `trailer_id`
- Update `isCompleted` matching logic — for null-trailer planned events, match by `event_type` only (since the trailer wasn't known at plan time)

#### 4. Update completion matching logic
**File**: `src/components/trailers/GuidedStopEvents.tsx`
- `isCompleted()` currently matches on both `event_type` AND `trailer_id` — for null-trailer events, match on `event_type` alone (with index deduplication)
- `getEventRecord()` same adjustment

### Files to edit
| File | Change |
|------|--------|
| `src/hooks/useTrailerRoutes.ts` | Make `PlannedEvent.trailer_id` nullable |
| `src/components/trailers/TrailerRouteWizard.tsx` | Add "Any Available" trailer option in Step 3, allow null trailer_id |
| `src/components/trailers/GuidedStopEvents.tsx` | Show trailer picker on driver side for null-trailer events, update completion matching |

### No database changes needed
The `planned_events` JSONB column accepts any shape. The `trailer_events` table already requires a real `trailer_id`, which the driver provides at completion time.

