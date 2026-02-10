

# TreadSet Platform Audit: SaaS Readiness for Multi-State, Multi-Customer Deployment

---

## Executive Summary

The platform is impressively built for a one-person operation -- 80+ pages, 100+ hooks, 80+ edge functions, full manifest workflow, client portal, driver app, inventory system, intelligence dashboard, and more. However, there are concrete gaps that will surface the moment a second customer signs up in a different state. Below is everything organized by priority.

---

## CRITICAL: Must Fix Before Onboarding New Customers

### 1. Michigan Is Still Hardcoded in Multiple Places

The state compliance engine exists, but several pages and components still reference Michigan directly:

| Location | Issue |
|----------|-------|
| `ServiceZones.tsx` | Imports and renders `MichiganHeatMap` -- a Michigan-specific map component. A Chicago or New Jersey customer will see a Michigan map on their Service Zones page. |
| `MichiganReports.tsx` | Entire page is titled "Michigan Reports" with Michigan-specific DEQ compliance language. Other states need their own equivalent or a generic "State Compliance Reports" page. |
| `IndependentHaulers.tsx` | Column header says "Michigan Registration" -- should read the `registration_label` from `state_compliance_configs`. |
| `PublicPartners.tsx` | References "Michigan's premier tire recycling network," "Michigan DEQ regulations," "Michigan Registration," "Michigan Tire Hauler License" throughout. |
| `PublicProducts.tsx` | Says "Michigan & Ohio operations" in the pricing section. |
| `PublicDropoff.tsx` | Renders a `MichiganMap` component. |
| `Clients.tsx` | Warning banner says "Michigan manifests cannot be generated correctly..." |
| `Index.tsx` and `EnhancedRoutesToday.tsx` | Import `calculateManifestPTE` from `lib/michigan-conversions` -- should use the state-aware calculation from `ManifestDomain.ts`. |

**Recommendation:** Abstract all Michigan references behind the organization's `state_code`. The heat map should be a generic `ServiceAreaHeatMap` that centers on the org's state. The Michigan Reports page should become "State Compliance Reports" with state-specific sections driven by `state_compliance_configs`.

### 2. Public-Facing Pages Are TreadSet-Branded But Mention "BSG"

The `PublicPartners.tsx` page references "Partner With BSG" and "BSG" in the title. If this is your company's old name or a different entity, it needs to be updated to TreadSet or made dynamic per organization. New customers in Chicago or NJ should not see another company's name.

### 3. Integrations Page Is a Placeholder

The Integrations page (`Integrations.tsx`) uses local React state for everything -- nothing actually persists to the database. The Stripe "connection" just logs to console. The QuickBooks integration says "coming soon." The Zapier webhook URL is stored in component state and lost on refresh. For a marketable product, integrations either need to work or be removed from the navigation.

---

## HIGH PRIORITY: Polish Before Sales Demos

### 4. Onboarding Flow Is Minimal

The `Onboarding.tsx` page collects only: company name, phone, city, state. For a new customer signing up, this should also:
- Collect business address (needed for manifest generator fields)
- Set up their first receiver/hauler
- Upload their logo for branded manifests
- Optionally configure their Stripe keys for payment collection
- Guide them through creating their first employee/driver

### 5. No Multi-Organization Data Isolation Verification

The `OrganizationSwitcher` exists and org-scoped queries are used, but with `user_organization_roles` having RLS disabled (per the architectural decision), you should verify that every single data query properly filters by `organization_id`. One missed filter means Customer A sees Customer B's data. This is a legal and business-critical issue for multi-tenant SaaS.

### 6. Settings Page Has Internal/Developer Tools Exposed

The Settings page exposes:
- "Generate Calibration PDF" button
- "Generate Test Overlay" button  
- Template upload utility
- Email diagnostics

These are developer/admin tools that should be hidden behind a super-admin role or moved to a separate admin panel. A customer's ops manager should not see PDF calibration tools.

### 7. Intelligence Dashboard Says "Beta"

The Intelligence Dashboard has a "Beta" badge. For sales demos, either remove the badge or lean into it as a premium feature. It is functional and should be presented confidently.

---

## MEDIUM PRIORITY: Professional Polish

### 8. Error Boundary Has a TODO

`ErrorBoundary.tsx` line 36 has `// TODO: Send to error tracking service like Sentry`. For a production SaaS with multiple customers, you need error tracking. When the Chicago customer's driver hits an error in the field, you need to know about it before they call you.

### 9. Public Pages Need Generalization for White-Label Potential

If different customers will share the same app URL (app.treadset.com), the public pages at `/services`, `/products`, `/partners`, `/dropoff` are fine. But they contain location-specific content (Michigan maps, Michigan & Ohio references). If you plan to show these to prospects in other states, they should be generalized or made state-aware.

### 10. Reports Page Is Generic But Michigan Reports Is Separate

You have two report pages: `/reports` (generic recycling reports) and `/reports/michigan` (state compliance). The Michigan Reports page should become a state-agnostic "Compliance Reports" page that dynamically loads the correct compliance rules from `state_compliance_configs`.

### 11. No Audit Trail / Activity Log

For a multi-user, multi-organization SaaS, there is no visible activity log showing who did what and when. When multiple employees are making changes (completing manifests, editing clients, scheduling pickups), admins need to see an audit trail. This is especially important for compliance.

### 12. No In-App Help or Documentation

There is no help center, tooltips explaining features, or onboarding tours. When a new customer's team starts using the app, they will need guidance. Even a simple "?" icon linking to documentation would help reduce support burden as you scale.

---

## LOWER PRIORITY: Nice-to-Have for Growth

### 13. Test/Debug Pages Still Accessible

Pages like `ManifestRemindersTest`, `NotificationTest`, `BackfillManifestPdfs`, `SystemHealth`, `DeploymentDashboard`, and `DataQuality` are development/internal tools that should be hidden or role-gated so customers never stumble onto them.

### 14. Client Portal Could Be Richer

The Client Portal (`ClientPortal.tsx` at 686 lines) is functional but could be enhanced with:
- A dashboard showing their pickup history and upcoming schedule at a glance
- Self-service booking (partially done via the booking system)
- Invoice/payment history view
- Direct messaging or support ticket creation

### 15. No Mobile PWA / App Install Prompt

Drivers use this in the field on phones. Adding a PWA manifest and install prompt would make it feel like a native app and improve the driver experience significantly.

---

## Summary Action Items (Prioritized)

| Priority | Item | Effort |
|----------|------|--------|
| CRITICAL | Replace all Michigan-hardcoded references with state-aware logic | Medium |
| CRITICAL | Fix "BSG" branding on public partner page | Small |
| CRITICAL | Make Integrations page functional or remove it | Medium |
| HIGH | Enhance onboarding flow for new customers | Medium |
| HIGH | Audit all queries for proper org_id filtering | Medium |
| HIGH | Hide developer tools from customer-facing Settings | Small |
| MEDIUM | Set up error tracking (Sentry or similar) | Small |
| MEDIUM | Generalize Michigan Reports into State Compliance Reports | Medium |
| MEDIUM | Add activity/audit log | Large |
| MEDIUM | Add in-app help or documentation links | Medium |
| LOW | Gate test/debug pages behind super-admin role | Small |
| LOW | Enhance Client Portal with dashboard | Medium |
| LOW | Add PWA support for driver app | Small |

Would you like to start tackling these in order of priority? The Michigan hardcoding is the most urgent since your next customers are in Chicago (Illinois) and New Jersey -- they cannot see Michigan maps and Michigan-specific language throughout the app.

