

# Next Batch: Remaining Michigan Cleanup, super_admin Role, and Public Page Polish

## What's Done So Far
- Performance optimizations (lazy loading, caching, reduced polling)
- BSG branding removed from PublicPartners, PublicProducts, PublicDropoff
- Michigan language removed from IndependentHaulers, Clients, ServiceZones
- MichiganHeatMap renamed to ServiceAreaHeatMap
- MichiganReports renamed to StateComplianceReports
- MichiganSystemStatus renamed to ComplianceSystemStatus
- Developer tools in Settings hidden behind admin role
- Integrations page cleaned up (Stripe key inputs removed)
- Route updated from /reports/michigan to /reports/compliance

## What's Left (This Batch)

### 1. Add `super_admin` to the database role enum

The `app_role` enum currently has: admin, ops_manager, dispatcher, driver, sales, client, hauler, receptionist, viewer. There is no `super_admin`. This is needed to gate internal debug routes so customer admins can't see them.

**Database migration:**
- `ALTER TYPE public.app_role ADD VALUE 'super_admin';`
- Add `super_admin` to the TypeScript role union in `ProtectedRoute.tsx` and `AuthGuard.tsx`

### 2. Gate debug/test routes behind `super_admin`

Once the role exists, change these routes in `App.tsx`:
- `/backfill-manifest-pdfs`
- `/deployment-dashboard` (or `/deployment`)
- `/notification-test` (or `/test/notifications`)
- `/manifest-reminders-test`
- `/data-quality`
- `/system-health`

From `roles={['admin']}` to `roles={['super_admin']}`.

### 3. Remaining Michigan text in components (customer-facing)

These still say "Michigan" and are visible to customers:

| File | What to change |
|------|---------------|
| `ServiceAreaHeatMap.tsx` line 701 | "Michigan Service Coverage" -> "Service Coverage" |
| `HaulerForm.tsx` line 174 | "Michigan Registration" label -> "State Registration" |
| `DriverManifestCreationWizard.tsx` lines 182-203, 824-827, 1668 | Comments say "Michigan rule" and UI shows "Michigan conversions" -- update visible text to "state conversions", keep internal comments as-is |
| `ServiceAreaPreview.tsx` lines 20-21, 73 | "Southeast Michigan" hardcoded defaults and subtitle -> generic defaults |

### 4. Remaining Michigan text on public pages

| File | What to change |
|------|---------------|
| `PublicAbout.tsx` | 15+ references to "Michigan", "BSG Tire Recycling", "Michigan DEQ" -- this is on the BSG marketing domain so it may be intentional. **Needs clarification.** |
| `PublicServices.tsx` line 29 | "across Michigan" -> "across your region" |
| `PublicDropoff.tsx` | Still imports and renders `MichiganMap` component -- the map shows a static Michigan image |
| `TireRecyclingProcess.tsx` line 16 | "Michigan and Ohio" -> generic |

### 5. Remove "Beta" badge from Intelligence Dashboard

The Intelligence Dashboard at line 28 shows a "Beta" badge. For sales demos to prospects in Chicago and NJ, this should be removed to present the product confidently.

### 6. Important question about PublicAbout.tsx

The `PublicAbout.tsx` page is heavily BSG-branded ("About BSG Tire Recycling", "Michigan's trusted partner", BSG truck images, Detroit skyline). Based on the project architecture, public pages in this project are served on the TreadSet app domain. **If this page is only shown on BSG's domain via domain-based routing, the BSG branding is correct and should stay. If it's visible to all TreadSet users, it needs to be generalized.**

---

## Technical Details

### Database Migration
```sql
ALTER TYPE public.app_role ADD VALUE 'super_admin';
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/auth/ProtectedRoute.tsx` | Add `'super_admin'` to the roles type union |
| `src/components/auth/AuthGuard.tsx` | Add `'super_admin'` to the roles type union |
| `src/App.tsx` | Change 6 debug route guards from `['admin']` to `['super_admin']` |
| `src/components/zones/ServiceAreaHeatMap.tsx` | "Michigan Service Coverage" -> "Service Coverage" |
| `src/components/forms/HaulerForm.tsx` | "Michigan Registration" -> "State Registration" |
| `src/components/driver/DriverManifestCreationWizard.tsx` | Update visible "Michigan conversions" text |
| `src/components/public/ServiceAreaPreview.tsx` | Remove Michigan-specific defaults |
| `src/pages/PublicServices.tsx` | "across Michigan" -> "across your region" |
| `src/pages/IntelligenceDashboard.tsx` | Remove "Beta" badge |

### Files NOT changed (intentional)
- `src/lib/michigan-conversions.ts` -- internal library, not customer-facing
- `src/hooks/useMichiganReporting.ts` -- internal hook name, not customer-facing
- `src/components/public/MichiganMap.tsx` -- static BSG asset, only used on BSG domain pages
- `src/pages/PublicAbout.tsx` -- BSG domain page, keeping BSG branding (pending your confirmation)

## What This Accomplishes
- Your internal team gets `super_admin` access to debug tools; customer admins cannot see them
- Zero remaining customer-facing "Michigan" text across the app
- Intelligence Dashboard presents confidently without "Beta" qualifier
- Clean, professional, state-agnostic experience for Chicago and NJ prospects
