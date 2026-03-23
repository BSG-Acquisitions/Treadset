

## Fix Michigan Manifest Compliance Issues (Ann Vogen Requirements)

Three problems identified on Hood's Tire manifests that violate state compliance requirements.

### Problem 1: Part 3 (Receiver) is blank at time of pickup

**Root cause**: Receiver information (BSG's name, address, phone, site registration) is only populated during Stage 2 (receiver signature at the office). The initial PDF generated at pickup time (Stage 1) has all Part 3 fields empty.

**Ann's requirement**: At time of removal, Part 3 left side (Name, address, phone, site number) must already be filled in. Only the signature, printed name, date, and tire count get added later when tires reach BSG.

**Fix**: In `src/components/driver/DriverManifestCreationWizard.tsx` (around line 1096, the overrides block), add receiver info from the organization's default receiver. Query the `receivers` table for the org's active receiver and include `receiver_name`, `receiver_physical_address`, `receiver_city`, `receiver_state`, `receiver_zip`, `receiver_phone`, and `receiver_mi_reg` in the Stage 1 PDF overrides — even though there's no receiver signature yet.

Also update `src/hooks/useManifestIntegration.ts` `convertManifestToAcroForm` (around line 129-136) to populate receiver fields from the organization's default receiver when no explicit receiver data is provided.

### Problem 2: Part 1 Generator Print Name has company name or is blank

**Root cause**: The driver wizard clears `generator_print_name` on the signature step (line 388) and requires the driver to type it. If the driver types the company name (e.g., "Hood Tire Service") instead of the person's name, or skips it, it goes through as-is.

**Fix**: Add a validation hint/label in the signature step UI making it clear this must be the **person's name who is signing**, not the company name. In `DriverManifestCreationWizard.tsx`, update the `generator_print_name` form field label and placeholder (around line 2630) to say "Name of Person Signing (not company name)" with helper text.

### Problem 3: Part 2 Hauler Print Name missing on some manifests

**Root cause**: Same issue — the `hauler_print_name` field is required by the form schema but if somehow bypassed or if the driver doesn't fill it, it can end up blank.

**Fix**: The existing validation (`form.trigger(['generator_print_name', 'hauler_print_name']`) at line 652 should catch this. Add an additional server-side check in the manifest completion flow — if `hauler_print_name` is empty, block submission. Also improve the label clarity on the hauler print name field.

### Files to modify

| File | Change |
|------|--------|
| `src/components/driver/DriverManifestCreationWizard.tsx` | 1) Fetch default receiver for org and include receiver info fields in Stage 1 PDF overrides. 2) Update generator/hauler print name field labels to clarify "person's name, not company" |
| `src/hooks/useManifestIntegration.ts` | Fetch org's default receiver to populate Part 3 left-side fields when no receiver data exists yet |

### What this achieves

After this fix, the initial manifest PDF generated at pickup will have:
- **Part 3 left side**: BSG's (or the org's receiver's) name, address, phone, and site registration pre-filled
- **Part 3 right side**: Still blank (signature, print name, date added at Stage 2)
- **Part 1 & 2 print names**: Clearer UI guidance ensuring drivers enter the actual person's name

