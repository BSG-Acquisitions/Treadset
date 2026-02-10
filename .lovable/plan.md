

# Next SaaS Readiness Batch: State-Aware Reports, Map Rename, and Integrations Cleanup

## 1. Rename MichiganHeatMap to ServiceAreaHeatMap

The heat map component is already state-agnostic -- it queries locations by `organization_id` and auto-centers on the data. Only the file/component name says "Michigan."

**Changes:**
- Rename `src/components/zones/MichiganHeatMap.tsx` to `ServiceAreaHeatMap.tsx`
- Update the export name from `MichiganHeatMap` to `ServiceAreaHeatMap`
- Update the import in `ServiceZones.tsx` (line 13)
- Remove the hardcoded Michigan default center (`[-84.5, 44.0]` on line 433) and replace with a US-center fallback (`[-98.5, 39.8]`) so it works for any state

## 2. Generalize MichiganReports into State Compliance Reports

The `MichiganReports.tsx` page has Michigan-specific text in 15+ places (titles, breadcrumbs, tab labels, conversion rule descriptions, EGLE references). This needs to become a generic "State Compliance Reports" page that can serve any state.

**Changes to `MichiganReports.tsx`:**
- Rename file to `StateComplianceReports.tsx`
- Change page title from "Michigan Tire Reports" to "State Compliance Reports"
- Change breadcrumb from "Michigan Tire Reports" to "Compliance Reports"
- Change subtitle from "Annual scrap tire reporting for Michigan EGLE compliance" to "Annual scrap tire reporting for state regulatory compliance"
- Change "MI Rule: 89 PTE = 1 ton" caption to dynamically show the conversion (keep 89 as default since that's the current org's rate)
- Change "Michigan EGLE Totals" tab label to "State Totals"
- Change "Michigan Conversion Rules" heading to "Conversion Rules"
- Change "Submit to Michigan EGLE" to "Submit for Compliance"
- Update `MichiganSystemStatus` component reference (rename to `ComplianceSystemStatus`)
- Update the route in `App.tsx` from `/reports/michigan` to `/reports/compliance`
- Update any navigation links pointing to `/reports/michigan`

**Note:** The underlying data hooks (`useMichiganReporting.ts`) and conversion library (`michigan-conversions.ts`) will remain functional -- those are internal names that don't face the customer. The conversion rates are already configurable via `state_compliance_configs`. We rename only what the user sees.

## 3. Clean Up Integrations Page

The Integrations page currently stores nothing to the database -- all state is lost on refresh. Rather than building full persistence right now (which is a larger project), we'll make it honest:

**Changes to `Integrations.tsx`:**
- Remove the Stripe key input fields (users should not paste secret keys into a web form -- Stripe is already connected via Supabase secrets/edge functions)
- Replace Stripe section with a status display showing whether the Stripe edge function is configured
- Keep QuickBooks as "Coming Soon" (unchanged)
- For Zapier, save the webhook URL to the `organizations` table or a new `organization_settings` JSONB column so it persists

## 4. Gate Test/Debug Routes Behind super_admin

The debug routes (`/backfill-manifest-pdfs`, `/deployment-dashboard`, `/notification-test`, `/manifest-reminders-test`, `/data-quality`, `/system-health`) are currently gated to `admin` role. This means any customer admin would see them. They should be gated to `super_admin` so only your team sees them.

**Changes to `App.tsx`:**
- Change `ProtectedRoute roles={['admin']}` to `roles={['super_admin']}` for these 6 routes

---

## Files to Change

| File | Change |
|------|--------|
| `src/components/zones/MichiganHeatMap.tsx` | Rename to `ServiceAreaHeatMap.tsx`, update component name and default center |
| `src/pages/ServiceZones.tsx` | Update import from `MichiganHeatMap` to `ServiceAreaHeatMap` |
| `src/pages/MichiganReports.tsx` | Rename to `StateComplianceReports.tsx`, replace all Michigan-specific text |
| `src/components/diagnostics/MichiganSystemStatus.tsx` | Rename to `ComplianceSystemStatus.tsx` |
| `src/hooks/useMichiganReporting.ts` | No changes (internal name, not customer-facing) |
| `src/App.tsx` | Update route path, lazy import name, and gate debug routes to `super_admin` |
| `src/pages/Integrations.tsx` | Replace Stripe key inputs with connection status; simplify |
| Navigation links referencing `/reports/michigan` | Update to `/reports/compliance` |

## What This Accomplishes

- A customer in Chicago or New Jersey will never see "Michigan" anywhere in their app
- The heat map works for any state (it already did, but the name was confusing)
- Debug/dev tools are invisible to customer admins
- The Integrations page no longer pretends to save data that it doesn't

