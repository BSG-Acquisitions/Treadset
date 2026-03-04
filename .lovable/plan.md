

## Plan: Manual Manifest Creation for Trailer Driver (Jody)

### Problem
Currently, the trailer stop workflow auto-generates manifests when a signed event (pickup_full/drop_full) completes. The user wants Jody to **manually** create manifests using the **same wizard Brenner uses** — entering generator name, hauler name, tire counts, collecting signatures, producing a downloadable/emailable PDF. The auto-generation should be removed.

### Changes

#### 1. Remove auto-manifest generation from trailer event completion
**File**: `src/hooks/useStopTrailerEvents.ts` (lines 146-174)
- Delete the block that calls `generate-trailer-manifest` after signed events
- The event completion will still record the signature and update trailer status, but no manifest will be auto-generated

#### 2. Add "Create Manifest" button to completed stop events
**File**: `src/components/trailers/GuidedStopEvents.tsx`
- After a signed event is completed (pickup_full/drop_full), show a "Create Manifest" button on the completed event card
- This button navigates to `/driver/manifest/new` (the same page Brenner uses)
- Pass relevant context as URL params: trailer info, location, etc.

#### 3. Allow manifest wizard to work without a pickup ID
**File**: `src/components/driver/DriverManifestCreationWizard.tsx`
- Currently the wizard hard-requires a `pickupId` and shows an error without one
- Add a "standalone" mode: when no pickupId is provided, let the driver manually enter generator name, hauler name, tire counts, and collect signatures — the same core flow, just without pre-filled pickup data
- The wizard already has all the form fields, signature collection, PDF generation, and email logic. We just need to bypass the pickup data fetch and let the driver fill everything manually
- In standalone mode, still create a manifest record in the DB (with `pickup_id` null)

#### 4. Update DriverManifestCreate page to support no-pickup mode
**File**: `src/pages/DriverManifestCreate.tsx`
- When no `pickup` search param is provided, skip the pickup fetch and hide the sidebar
- Pass optional context params (location, trailer number) from the trailer workflow

#### 5. Fix "New Manifest" on driver dashboard
The existing `/driver/manifest/new` link will work once the wizard supports standalone mode (change 3).

### Files to edit
| File | Change |
|------|--------|
| `src/hooks/useStopTrailerEvents.ts` | Remove auto-manifest generation block (lines 146-174) |
| `src/components/trailers/GuidedStopEvents.tsx` | Add "Create Manifest" button on completed signed events |
| `src/components/driver/DriverManifestCreationWizard.tsx` | Support standalone mode without pickupId |
| `src/pages/DriverManifestCreate.tsx` | Handle no-pickup URL params gracefully |

### No database or edge function changes needed
The manifest table already supports `pickup_id = null`. The existing `generate_manifest_number` function works independently of pickups.

