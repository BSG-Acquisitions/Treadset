
# Multi-State Foundation Implementation

## Overview
Add `state_code` to organizations, create `state_compliance_configs` table with per-state manifest template field mappings stored as JSONB, update the onboarding page with a state dropdown, build a State Template Manager admin page, and make the `ensure-manifest-pdf` edge function state-aware.

## Phase 1: Database Migration

**Add `state_code` column to `organizations`** (defaults to `'MI'` so existing orgs are unaffected).

**Create `state_compliance_configs` table** with columns:
- `state_code` (PK, text) -- e.g. `'MI'`, `'ID'`
- `state_name` (text) -- full name
- `pte_to_ton_ratio` (numeric, default 89)
- `requires_government_manifest` (boolean, default false)
- `manifest_template_path` (text, nullable) -- filename in storage
- `registration_label` (text, default `'State Registration #'`)
- `report_format` (text, default `'generic'`)
- `field_mapping` (JSONB, nullable) -- maps domain keys to PDF field names
- `created_at`, `updated_at` timestamps

**RLS**: Enable RLS, allow all authenticated users to read (reference data). Admin-only insert/update/delete.

**Seed data**: Michigan config with full v4 field mapping JSON; Idaho placeholder row with no template yet.

## Phase 2: Update Onboarding Page

**File: `src/pages/Onboarding.tsx`**

- Replace free-text state input with a `<Select>` dropdown of all 50 US states
- Default to empty (user must choose)
- On submit, save `state_code` to the organization record alongside the company name
- Show a note if the selected state doesn't have a template configured yet

## Phase 3: State Template Manager Admin Page

**New files:**
- `src/pages/admin/StateTemplateManager.tsx` -- admin page with:
  - List of all states from `state_compliance_configs`
  - Upload PDF template for a state (stores to `manifests/templates/`)
  - "Extract Fields" button that calls `extract-acroform-fields` edge function
  - Visual field mapping builder: left column = standard domain fields, right column = extracted PDF field names as dropdowns
  - Save mapping to `field_mapping` JSONB column
  - "Test Fill" button to generate a sample PDF with dummy data
- `src/hooks/useStateCompliance.ts` -- hook to fetch/update state configs

**Route: `/admin/state-templates`** (admin-only, added to `App.tsx`)

## Phase 4: Make PDF Generation State-Aware

**File: `supabase/functions/ensure-manifest-pdf/index.ts`**

Currently hardcodes `Michigan_Manifest_Acroform_V4.pdf` and Michigan v4 field names. Update to:
1. Look up the pickup's organization -> get `state_code`
2. Query `state_compliance_configs` for that state's `manifest_template_path` and `field_mapping`
3. If `field_mapping` exists in DB, use it to translate domain fields to PDF field names dynamically
4. If no state config or no mapping, fall back to current Michigan v4 hardcoded behavior (backward compatible)

**File: `src/lib/pdf/templateConfig.ts`**

Add `getTemplateConfigForState(stateCode)` function that fetches config from the database. Keep hardcoded Michigan configs as fallback.

## Phase 5: State-Aware Conversion Kernel

**File: `supabase/functions/conversion-kernel/index.ts`**

- Accept optional `state_code` parameter
- Query `state_compliance_configs` for `pte_to_ton_ratio`
- Use that ratio instead of hardcoded 89
- Default to 89 if no state config found (backward compatible)

## Files Summary

| Action | File |
|--------|------|
| **Create** | `src/pages/admin/StateTemplateManager.tsx` |
| **Create** | `src/hooks/useStateCompliance.ts` |
| **Modify** | `src/pages/Onboarding.tsx` -- state dropdown, save state_code |
| **Modify** | `src/App.tsx` -- add `/admin/state-templates` route |
| **Modify** | `src/lib/pdf/templateConfig.ts` -- add DB-backed state config lookup |
| **Modify** | `supabase/functions/ensure-manifest-pdf/index.ts` -- state-aware template + field mapping |
| **Modify** | `supabase/functions/conversion-kernel/index.ts` -- state-aware PTE ratio |
| **DB Migration** | Add `state_code` to organizations, create `state_compliance_configs` table |

## What Does NOT Change

- All existing Michigan functionality (protected by fallback logic)
- Driver workflows, signature capture, receiver completion
- `generate-acroform-manifest` edge function (already template-agnostic)
- `extract-acroform-fields` edge function (already works with any PDF)
- RLS policies on existing tables
- Authentication flows

## Idaho Onboarding Workflow (After Build)

1. Idaho company signs up and selects "Idaho" in onboarding dropdown
2. You receive their state manifest PDF
3. Go to `/admin/state-templates`, select Idaho
4. Upload the PDF, click "Extract Fields"
5. Map domain fields to Idaho's PDF field names using the visual builder
6. Click "Test Fill" to verify, then "Save"
7. Idaho manifests now generate using their state-specific form
