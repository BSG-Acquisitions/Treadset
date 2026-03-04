## Plan: Manual Manifest Creation for Trailer Driver (Jody)

### Status: ✅ IMPLEMENTED

### Changes Made

1. **Removed auto-manifest generation** from `useStopTrailerEvents.ts` — the `generate-trailer-manifest` edge function call was deleted from the event completion flow
2. **Added "Create Manifest" button** to `GuidedStopEvents.tsx` — appears on completed signed events (pickup_full/drop_full) that don't yet have a manifest, navigates to `/driver/manifest/new` with location and trailer context
3. **Enabled standalone manifest wizard** in `DriverManifestCreationWizard.tsx` — works without a pickupId, lets driver manually enter generator name, select hauler, enter tire counts, collect signatures, generate PDF
4. **Updated DriverManifestCreate page** to handle no-pickup mode gracefully — hides sidebar, passes location/trailer params from URL
