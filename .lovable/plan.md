

## Plan: Full Manifest Wizard for Trailer Route Pickup Events

### Problem
When Jody completes a `pickup_full` or `drop_full` event on a trailer route, he currently gets a simple signature dialog (TrailerSignatureDialog) that just collects a name and signature — no tire counts, no AcroForm PDF, no email. He needs the exact same full manifest creation wizard that Brenner uses, with client search, auto-filled generator data, tire counts, signatures, PDF generation, and email.

### Approach
Replace the simple TrailerSignatureDialog for `pickup_full`/`drop_full` events with the full `DriverManifestCreationWizard` in a dialog. The wizard already supports standalone mode (no pickup ID required) and accepts `clientId`, `locationName`, and `trailerNumber` props.

### Changes

#### 1. Add manifest wizard dialog state to GuidedStopEvents
**File**: `src/components/trailers/GuidedStopEvents.tsx`
- Add a new state `showManifestWizard` (boolean) alongside the existing `showSignature` state
- Import `DriverManifestCreationWizard` and the `Dialog` components
- When `handleTap` is called for a `pickup_full` or `drop_full` event, open the manifest wizard dialog instead of the TrailerSignatureDialog
- When the wizard completes (`onComplete`), also call `handleComplete` to mark the trailer event as done (using the override trailer ID if "Any" was selected)
- Keep the existing TrailerSignatureDialog as a fallback for other signature-required event types if any are added later

#### 2. Pass location and trailer context to the wizard
**File**: `src/components/trailers/GuidedStopEvents.tsx`
- Pass `locationName` to the wizard so it can pre-fill the generator/location context
- Pass `trailerNumber` (from the planned event or driver-selected trailer) so it appears on the manifest
- The wizard's standalone mode already has a client search, so Jody can search for "Tire Disposal" and auto-fill their data including email

#### 3. Wire up completion flow
**File**: `src/components/trailers/GuidedStopEvents.tsx`
- On wizard `onComplete`, call `handleComplete(activeEvent, overrideTrailerId)` to record the trailer event in the database
- The wizard handles manifest creation, PDF generation, and email sending internally — no additional work needed

### Files to edit
| File | Change |
|------|--------|
| `src/components/trailers/GuidedStopEvents.tsx` | Replace TrailerSignatureDialog with DriverManifestCreationWizard dialog for pickup_full/drop_full events |

### What stays the same
- The DriverManifestCreationWizard is unchanged — it already supports everything needed
- Non-manifest events (pickup_empty, drop_empty, stage_empty) continue using the simple Complete button
- The "Create Manifest" button that appears after event completion (for retroactive creation) remains as a secondary option

