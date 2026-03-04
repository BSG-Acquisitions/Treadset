

## Improve Driver Trailer Stop Workflow — Timestamps, Manifest Visibility, and Event Timeline

### Problem
The system already has the mechanics working (planned events, signature collection, manifest generation via edge function), but the driver can't see:
- **Timestamps** on completed events (when each action happened)
- **Manifest numbers/links** after a manifest is generated for pickup_full/drop_full events
- A clear **timeline** of what's been done vs. what's next
- The stop doesn't **auto-advance** to the next one after all events are completed

### Changes

#### 1. Enhanced completed event display in `StopCard` (`src/pages/DriverTrailerAssignments.tsx`)
Replace the simple badge list of completed events with a proper timeline showing:
- Event type + trailer number
- Timestamp formatted with seconds (using `formatManifestTimestamp`)
- Manifest number badge (clickable) when one was generated
- Green checkmark styling

The `stopEvents` data from `useRouteStopEvents` already includes `timestamp`, `manifest_number`, `manifest_pdf_path`, and `trailer.trailer_number` — we just need to render them.

#### 2. Auto-advance to next stop (`src/pages/DriverTrailerAssignments.tsx`)
After marking a stop complete, automatically expand the next incomplete stop so the driver flows through the route without hunting for the next task.

#### 3. Show manifest confirmation in `GuidedStopEvents` (`src/components/trailers/GuidedStopEvents.tsx`)
After a signed event completes (pickup_full/drop_full), show a confirmation badge with the manifest number. The `onEventCompleted` callback triggers a refetch — the completed event data from `useRouteStopEvents` will contain `manifest_number`, so we need to pass `stopEvents` into `GuidedStopEvents` and display it on completed event cards.

#### 4. Update `GuidedStopEvents` props
Pass `stopEvents` (the full event records with timestamps and manifest info) alongside `completedEvents` (the simple type+id pairs). Use the full records to show timestamps and manifest numbers on completed event cards.

#### 5. Timestamp formatting
Use the existing `formatManifestTimestamp` from `src/lib/manifestTimestamps.ts` for consistency with second-level precision.

### Files to edit
- `src/pages/DriverTrailerAssignments.tsx` — Enhanced event timeline, auto-advance logic
- `src/components/trailers/GuidedStopEvents.tsx` — Accept full event records, show timestamps + manifest numbers on completed cards

### No database or edge function changes needed
All the data is already captured and available.

