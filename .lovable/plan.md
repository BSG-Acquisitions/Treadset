

# Hauler Registration Number Compliance Fix

## Audit Findings

### AcroForm Field Source (Item 2)
The `ensure-manifest-pdf` edge function at line 83 maps:
```
hauler_mi_reg: m.hauler?.hauler_mi_reg || ''
```
This **already pulls from the hauler record** via `manifests.hauler_id → haulers.hauler_mi_reg`. It does NOT fall back to the organization's registration number. So if a manifest has a `hauler_id` pointing to a hauler with `hauler_mi_reg` populated, it will use that value correctly.

**The root problem is likely that Solo Richards' hauler record has no `hauler_mi_reg` value set**, so the field renders as empty on the PDF. There is also **no fallback to the organization's registration** — it just maps to empty string.

### EditHaulerDialog Bug Found
`EditHaulerDialog.handleSubmit` maps `data.company_name`, `data.michigan_registration`, etc. — but `HaulerForm` submits fields named `hauler_name`, `hauler_mi_reg`, etc. This means **edits to hauler_mi_reg via the Edit dialog are silently lost** because it reads `data.michigan_registration` (undefined) instead of `data.hauler_mi_reg`.

---

## Plan

### 1. Data Update — Solo Richards → JNJ Tire Recycling
Use the Supabase insert/update tool to find the hauler record matching "Solo Richards" and update it:
- `hauler_name`: "JNJ Tire Recycling"
- `hauler_mailing_address`: "4514 French Road"
- `hauler_city`: "Detroit"
- `hauler_state`: "MI"
- `hauler_zip`: "48214"
- `hauler_phone`: "313-790-6207"
- `hauler_mi_reg`: "50-22-0002"

No new record created. Query first to find the ID, then update.

### 2. Fix EditHaulerDialog Field Mapping Bug
In `src/components/hauler/EditHaulerDialog.tsx`, the `handleSubmit` function incorrectly maps field names. The form submits `hauler_name`, `hauler_mi_reg`, etc., but the handler reads `data.company_name`, `data.michigan_registration`. Fix:

```typescript
// Before (broken)
hauler_name: data.company_name,
hauler_mi_reg: data.michigan_registration,

// After (correct)
hauler_name: data.hauler_name,
hauler_mi_reg: data.hauler_mi_reg,
```

Same fix for all other fields (`hauler_mailing_address`, `hauler_city`, etc.).

### 3. Add Organization Fallback to ensure-manifest-pdf
Update `buildDomainData` in the edge function to accept an org registration fallback:

```typescript
hauler_mi_reg: m.hauler?.hauler_mi_reg || org?.state_registration || '',
```

This requires passing the org data into `buildDomainData`. Minor change — add an `org` parameter and fetch `state_registration` alongside `state_code` in the existing org query.

**File**: `supabase/functions/ensure-manifest-pdf/index.ts`

### 4. Hauler Registration Visible on Manifest Detail View
In `src/pages/ManifestViewer.tsx`, add a "Hauler Information" card showing:
- Hauler name
- State Hauler Registration Number (`hauler_mi_reg`)

This requires the manifest query to already join `hauler:haulers(*)` — checking `useManifest` hook to confirm.

### 5. Label Update on HaulerForm
In `src/components/forms/HaulerForm.tsx`, rename the `hauler_mi_reg` field label from "State Registration" to **"State Hauler Registration Number"** for clarity.

---

## What Will NOT Be Touched
- RLS policies, `has_role()`, auth logic
- Other AcroForm field mappings
- Manifest status workflow
- Driver interface
- CreateHaulerDialog (already uses correct field names)

## Files Modified
| File | Change |
|------|--------|
| `src/components/hauler/EditHaulerDialog.tsx` | Fix field name mapping bug |
| `src/components/forms/HaulerForm.tsx` | Update label to "State Hauler Registration Number" |
| `supabase/functions/ensure-manifest-pdf/index.ts` | Add org fallback for `hauler_mi_reg` |
| `src/pages/ManifestViewer.tsx` | Add hauler info card with registration number |
| Database (data update only) | Update Solo Richards → JNJ Tire Recycling with reg number |

## Post-Build Verification Guide

**New external hauler workflow**:
1. Admin goes to /haulers → "Add Hauler"
2. Fills in company name, address, phone, and **State Hauler Registration Number**
3. Hauler appears in list with registration visible

**Driver manifest creation**:
1. Driver creates manifest, selects hauler (e.g., JNJ Tire Recycling)
2. Manifest record gets `hauler_id` pointing to JNJ
3. PDF generation pulls `hauler_mi_reg` = "50-22-0002" from the hauler record

**Verification**:
1. Open any manifest tied to JNJ at `/manifests/:id`
2. Hauler card shows "State Hauler Registration Number: 50-22-0002"
3. Download the AcroForm PDF → check `MI_SCRAP_TIRE_HAULER_REG_` field = "50-22-0002"

