
# Auto-Save Driver Notes and Require Check Number

## Two Changes

### 1. Remove the "Save to Client Profile" Toggle -- Auto-Save Notes Always
Currently, when the driver types notes during manifest completion, there's a toggle switch they have to turn on to save notes to the client profile. This adds unnecessary friction -- Brenner shouldn't have to think about it.

**What changes:**
- Remove the Switch/toggle component and its label from the review step (lines 2491-2500)
- Remove the `saveNotesToClient` state variable (line 128) since it will always be true
- Change the save logic (line 1071) from `if (saveNotesToClient && driverNotes.trim()...)` to just `if (driverNotes.trim()...)` -- notes always save automatically when the driver enters them

### 2. Require Check Number When Payment Method is CHECK
Currently, the check number field appears when CHECK is selected, but it's optional -- Brenner can skip it and still proceed. This means the office may never see the check number.

**What changes:**
- In the `handleCollectPayment` function (line 2526), add a validation check: if `paymentMethod === 'CHECK'` and `checkNumber.trim()` is empty, show an error toast saying "Check number is required" and block progression
- Also disable the "Collect Payment" button when CHECK is selected and no check number has been entered

This ensures the driver must enter a check number before completing the manifest when they select CHECK as the payment method. The check number then flows through to the pickup record and is visible on the admin route tiles and the driver's own route cards via the inline edit feature we already built.

## Technical Details

**File:** `src/components/driver/DriverManifestCreationWizard.tsx`

- **Remove state:** Delete `saveNotesToClient` state and `setSaveNotesToClient` setter
- **Remove UI:** Delete the Switch + Label block (lines 2491-2500)
- **Update save logic:** Line 1071 -- remove `saveNotesToClient &&` from the condition
- **Add validation:** In `handleCollectPayment` (line 2526), before the existing `calculatedTotal <= 0` check, add a check for empty check number when payment method is CHECK
- **Disable button:** Update the "Collect Payment" button's `disabled` prop to also check `paymentMethod === 'CHECK' && !checkNumber.trim()`
