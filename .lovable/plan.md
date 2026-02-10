

# SaaS Readiness: Remaining Items to Ship

Here's everything still needed, organized by priority.

---

## CRITICAL: Multi-Tenant Data Isolation (Organization Filtering)

This is the single most important item. Several core data hooks **do not filter by `organization_id`**, meaning if a second customer signs up, they would see your data and you would see theirs.

### Hooks missing `organization_id` filter:

| Hook | Table | Impact |
|------|-------|--------|
| `useClients.ts` (useClients) | `clients` | Customer A sees Customer B's clients |
| `useClientsWithTable.ts` | `clients` | Same -- the table view of clients |
| `useManifests.ts` (useManifests) | `manifests` | Customer A sees Customer B's manifests |
| `useContextualNotifications.ts` | `clients` | Notifications created for wrong org's clients |
| `useMichiganReporting.ts` | `clients` | Compliance report includes all orgs' data |

**Fix:** Each of these hooks needs to get the current user's `organization_id` from the auth context and add `.eq('organization_id', orgId)` to their queries. Many other hooks already do this correctly (e.g., `useDashboardData`, `useMapDataCompleteness`, `useServiceZones`), so we follow that established pattern.

---

## HIGH: Hardcoded BSG Contact Info Throughout App

Several customer-facing pages still have BSG-specific contact details hardcoded. When a new customer's client or driver sees these, they'll be confused by someone else's email and phone number.

| File | Hardcoded Value |
|------|----------------|
| `ClientPortal.tsx` | "Contact BSG Tire Recycling", `bsgtires@gmail.com`, `313-731-0817` |
| `BookingConfirmation.tsx` | `bsgtires@gmail.com`, `313-731-0817` |
| `PublicBookingConfirmation.tsx` | `bsgtires@gmail.com`, `313-731-0817` |
| `PublicBook.tsx` | `313-731-0817` as placeholder |
| `ClientInvite.tsx` | `bsg-logo.jpeg` import |
| `ClientTeamInvite.tsx` | `bsg-logo.jpeg` import |
| `PortalUnsubscribe.tsx` | `bsg-logo.jpeg` import |

**Fix:** Replace hardcoded contact info with organization data from the database (the `organizations` table already has fields for this). For the logo, use the org's `logo_url` field. For pages where the org context isn't available (public pages), use TreadSet branding instead of BSG.

---

## HIGH: Public Pages Still Have BSG/Michigan References

These are pages served on the TreadSet app domain that still reference BSG:

| File | Issue |
|------|-------|
| `PublicServices.tsx` | `bsg-building.jpeg` image, "BSG technician" alt text, "BSG Tire Recycling facility" alt text |
| `HeroSection.tsx` | `bsg-truck.jpeg`, `bsg-logo.png`, "BSG Tire Recycling" alt texts, "Southeast Michigan" text, "Detroit's trusted tire recycling experts" |
| `PublicNavbar.tsx` | `bsg-logo.png`, "BSG Tire Recycling" alt text |
| `PublicFooter.tsx` | `bsg-logo.png`, "BSG Tire Recycling" alt text |

**Fix:** Since these public pages live on the TreadSet app domain, they should use TreadSet branding -- the TreadSet logo and generic language. The BSG-specific images and copy belong on the separate BSG marketing site only.

---

## HIGH: Assign `super_admin` to Your Account

The `super_admin` role was added to the database enum but no user has been assigned it yet. You need a row inserted into `user_organization_roles` for your user with `role = 'super_admin'`. Without this, you yourself will be locked out of the debug/test routes we just gated.

**Fix:** Single SQL insert once we confirm your user ID.

---

## MEDIUM: Enhanced Onboarding Flow

The current onboarding collects only company name, phone, city, and state. For a real SaaS customer self-service signup, it should also collect:
- Business street address (needed for manifest "generator" fields)
- Company logo upload (for branded manifests)
- Create their first employee/driver account

**Fix:** Add 2-3 more steps to the onboarding wizard.

---

## MEDIUM: Remaining Michigan Text in Internal Components

| File | Text |
|------|------|
| `StateTemplateManager.tsx` | "Michigan uses 89. Check your state's rules." |
| `PublicAbout.tsx` | 15+ BSG/Michigan references -- but this may be intentional for BSG's domain |

---

## LOWER: Other Polish Items from Original Audit

- Error tracking setup (Sentry or similar) -- `ErrorBoundary.tsx` has a TODO
- Activity/audit log for multi-user accountability
- In-app help or documentation links
- PWA support for driver mobile experience

---

## Implementation Order

1. **Organization filtering on data hooks** -- prevents cross-customer data leaks (most critical)
2. **Assign super_admin to your account** -- ensures you keep access to debug tools
3. **Replace hardcoded BSG contact info** -- use org data from database
4. **Update public page branding** -- TreadSet logo/copy instead of BSG on app domain
5. **Enhanced onboarding** -- better first-run experience for new customers
6. **Remaining Michigan text cleanup** -- final polish

### Technical Approach for Org Filtering

Each hook that's missing the filter will:
1. Accept `organizationId` as a parameter (or get it from the auth context via `useAuth()`)
2. Add `.eq('organization_id', organizationId)` to the Supabase query
3. Include `organizationId` in the React Query cache key to prevent stale cross-org data
4. Follow the same pattern already used in `useDashboardData`, `useServiceZones`, etc.

This is the same pattern used in 36+ hooks that already filter correctly -- we're just catching the ones that were missed.
