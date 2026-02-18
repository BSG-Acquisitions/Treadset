

# Fix Printed Names/Timestamps + Add "Void & Redo" Manifest Workflow

## Part 1: Fix Printed Names & Timestamps (Always Correct Going Forward)

### Problem
When the wizard generates the PDF, it passes correct names and timestamps as overrides, but `useManifestIntegration` re-fetches from the database and the `convertManifestToAcroForm` function can overwrite those overrides during the merge/sanitization step.

### Fix
In `src/hooks/useManifestIntegration.ts`, after the sanitization step, **re-apply** the override values for all signature-related fields. This ensures the wizard's explicit values (e.g., "Ethan - 1:33:44 PM", "Brenner Whitt - 1:34:02 PM") always win over whatever the database re-fetch returns.

**File:** `src/hooks/useManifestIntegration.ts`
- After `sanitizeAcroFormData(mergedData)` runs, loop through overrides and forcibly restore any `generator_print_name`, `hauler_print_name`, `receiver_print_name`, `generator_signature`, `hauler_signature`, `receiver_signature`, and their date/time fields back onto `sanitizedData`

---

## Part 2: Void & Redo a Bad Manifest

When a manifest PDF comes out wrong (missing names, wrong data), dispatchers need a way to void it and redo the signing. Currently there is a "Regenerate" button that re-creates the PDF from existing database data, but there is no way to **void** a bad manifest and start fresh.

### New Feature: "Void Manifest" Button

Add a "Void Manifest" action to the Receiver Signatures page (on both Pending and Completed tabs) that:

1. **Marks the manifest as VOIDED** -- sets `status = 'VOIDED'` in the database
2. **Resets signature fields** -- clears `customer_signature_png_path`, `driver_signature_png_path`, `receiver_sig_path`, `signed_by_name`, `signed_by_title`, and all `_signed_at` timestamps so the manifest can be re-signed
3. **Moves the pickup back to "needs manifest"** -- the pickup will reappear in the driver's manifest creation wizard so signatures can be collected fresh
4. **Sends a corrected notification** (optional) -- if an email was already sent, notifies the client that the previous manifest was voided

### When to use what:
- **Regenerate** -- the signatures in the database are correct but the PDF came out wrong. Just re-creates the PDF from existing data.
- **Void & Redo** -- the signatures or data were captured incorrectly. Clears everything so the signing process starts over from scratch.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useManifestIntegration.ts` | After sanitization, forcibly re-apply override values for print name, signature, and timestamp fields |
| `src/components/ManifestReceiversView.tsx` | Add "Void Manifest" button with confirmation dialog; on void, reset manifest status and signature fields |
| `src/hooks/useVoidManifest.ts` (new) | New hook that sets manifest status to VOIDED, clears all signature data, and optionally sends a voided notification email |

## How It Works for Dispatchers

1. You notice a manifest has wrong names or missing timestamps
2. Go to the **Receiver Signatures** page
3. Find the manifest and click **"Void"** (with a confirmation dialog)
4. The manifest is marked VOIDED and the pickup becomes available again for the driver to redo
5. Driver goes through the signing process again -- names and timestamps will now always populate correctly thanks to Part 1
6. A fresh, correct manifest is generated and emailed to the client

