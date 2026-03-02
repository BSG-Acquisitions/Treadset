

## Investigation Results

### Two problems found:

**Problem 1: Check numbers are NOT being saved — ever.**

The database proves it. I queried all completed pickups with `payment_method = 'CHECK'` and **every single one** has `check_number: null` — both in the `pickups` table and the `manifests` table. Brenner IS selecting "Check" as the payment method, but the check numbers are not persisting.

**Root cause:** The save logic uses a conditional spread:
```
...(paymentMethod === 'CHECK' && checkNumber.trim() ? { check_number: checkNumber.trim() } : {})
```
This saves the check number to the **manifest** record (line 967) and the **pickup** record (line 1087). However, the check number field is optional — the driver can select CHECK, leave the check number blank, and still complete via the "Collect Payment" button path OR the "Skip Payment" button. The "Skip Payment" button has **zero validation** — it just calls `onComplete()` and closes the dialog, bypassing the check number requirement entirely.

So even though the "Collect Payment" button is correctly disabled when check number is empty, the driver can just hit "Skip Payment" and the pickup completes with `payment_method: CHECK` but `check_number: null`.

**Problem 2: "Skip Payment" bypasses all payment validation.**

The "Skip Payment" button (line 2730-2742) does not save ANY payment data — it just closes the wizard. But the manifest was already created in previous steps with `payment_method` and `check_number` written at line 965-968 (during the signatures step, before the payment step even runs). So the payment method gets set to whatever was selected, but the check number only gets written if the driver goes through "Collect Payment."

### Plan — Two fixes:

**Fix 1: Make check number mandatory when CHECK is selected (block completion)**

In `DriverManifestCreationWizard.tsx`:
- On the payment step, if `paymentMethod === 'CHECK'` and `checkNumber` is empty, disable BOTH buttons ("Collect Payment" AND "Skip Payment")
- Add visual indicator (red border / helper text) on the check number input when it's empty and CHECK is selected
- The "Collect Payment" button already has this validation — extend it to "Skip Payment" as well

**Fix 2: Ensure check number persists to both tables on all paths**

- When the manifest is saved during the signatures step (line 965-968), the check number is conditionally included — this is fine
- But the payment step's "Collect Payment" handler also writes to both tables — ensure it includes `check_number`
- The "Skip Payment" path needs to also save `check_number` to the pickup record before closing, since the manifest already has it from the signatures step

**Fix 3: Backfill — show check numbers on admin side (EnhancedRoutesToday.tsx)**

The admin route view at line 464-467 already shows check number badges. The issue is purely that the data is null in the database because it was never saved. Once Fix 1 & 2 are in place, new pickups will show check numbers correctly. No admin-side code change needed.

### Technical details

**File: `src/components/driver/DriverManifestCreationWizard.tsx`**
- Line ~2730: "Skip Payment" button — add `disabled` condition: `paymentMethod === 'CHECK' && !checkNumber.trim()`
- Line ~2232-2250: Check number input — add required indicator and error state styling
- Line ~965-968: Manifest save during signatures — already includes check_number conditionally (OK)
- Line ~1085-1088: Pickup save during payment — already includes check_number conditionally (OK)

