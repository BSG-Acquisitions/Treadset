
# SaaS Readiness – Completed Batches

## All Done
- Performance optimizations (lazy loading, caching, reduced polling)
- BSG branding removed from PublicPartners, PublicProducts, PublicDropoff
- Michigan language removed from IndependentHaulers, Clients, ServiceZones
- MichiganHeatMap renamed to ServiceAreaHeatMap (US-center default)
- MichiganReports renamed to StateComplianceReports
- MichiganSystemStatus renamed to ComplianceSystemStatus
- Developer tools in Settings hidden behind admin role
- Integrations page cleaned up (Stripe key inputs removed)
- Route updated from /reports/michigan to /reports/compliance
- `super_admin` role added to database enum and all TypeScript type unions
- Debug routes (deployment, notifications, manifest-reminders, data-quality, backfill) gated behind `super_admin`
- "Michigan Service Coverage" → "Service Coverage" in ServiceAreaHeatMap
- "Michigan Registration" → "State Registration" in HaulerForm
- "Michigan conversions" → "state conversions" in DriverManifestCreationWizard
- "Southeast Michigan" defaults removed from ServiceAreaPreview
- "across Michigan" → "across your region" in PublicServices
- "Beta" badge removed from Intelligence Dashboard

## Intentionally Unchanged
- `src/lib/michigan-conversions.ts` — internal library, not customer-facing
- `src/hooks/useMichiganReporting.ts` — internal hook name, not customer-facing
- `src/components/public/MichiganMap.tsx` — static BSG asset, only used on BSG domain pages
- `src/pages/PublicAbout.tsx` — BSG domain page, keeping BSG branding (confirmed)

## Remaining (Future Batches)
- `PublicDropoff.tsx` still imports/renders `MichiganMap` — only shown on BSG domain, may keep as-is
- `TireRecyclingProcess.tsx` line 16 "Michigan and Ohio" — BSG marketing page
- Zapier webhook URL persistence (organization_settings)
