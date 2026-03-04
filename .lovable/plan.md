

## Plan: Add Manifest Creation to Unplanned "Add Other Event" Flow

### Problem
The manifest wizard was only wired up for **planned** events in `GuidedStopEvents`. When the driver uses "Add Other Event" (`DriverStopEventActions`) and selects "Confirm Full Pickup", it still uses the simple signature dialog — no tire counts, no PDF, no email.

### Changes

**File**: `src/components/trailers/DriverStopEventActions.tsx`

1. **Give the driver a choice after selecting trailer**: When `pickup_full` or `drop_full` is selected and the driver clicks proceed, show two options instead of going straight to signature:
   - **"Complete with Manifest"** → opens the full `DriverManifestCreationWizard` in a dialog (same as planned events)
   - **"Complete without Manifest"** → goes to the existing simple signature dialog (bypass)

2. **Add manifest wizard dialog**: Import `DriverManifestCreationWizard` and add a new `showManifestWizard` state. When the driver chooses "Complete with Manifest", open it in a full-screen dialog passing `locationName` and the selected trailer number. On wizard completion, call `handleCompleteEvent` to record the trailer event.

3. **Update the proceed dialog UI**: For `pickup_full`/`drop_full`, replace the single "Continue to Signature" button with two buttons:
   - "Create Manifest & Complete" (primary)
   - "Complete without Manifest" (outline/secondary)

### Result
Driver taps "Confirm Full Pickup" → picks trailer → sees two clear options: create a full manifest or just complete the event. The manifest path uses the exact same wizard Brenner uses.

