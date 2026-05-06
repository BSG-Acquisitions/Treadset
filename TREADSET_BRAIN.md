# TREADSET_BRAIN.md

**Compressed system reference. Loaded at session start. Update when structure changes.**

Generated 2026-05-04. Audited from cold by 6 parallel agents.

---

## 1. ROUTES + PAGE MAP

**Public (no auth):**
- `/` → `RootRoute` — domain-switch: `bsg*` hostname → `PublicLanding`, else → `AppLanding`
- `/auth` → `Auth.tsx` — sign in / sign up tabs
- `/auth/sign-in` → `Auth.tsx` — alias
- `/client-login` → `ClientLogin.tsx` — separate client-portal login
- `/reset-password` → `ResetPassword.tsx`
- `/services`, `/products`, `/drop-off`, `/partners`, `/partner-apply`, `/about`, `/contact` → BSG marketing pages (BLEED-THROUGH on TreadSet domain — see Known Issues)
- `/public-book` → `PublicBook.tsx` — public booking
- `/public-booking-confirmation` → `PublicBookingConfirmation.tsx`
- `/invite/:token` → employee invite handler
- `/client-invite/:token` → client invite handler
- `/client-team-invite/:token` → client team-member invite handler
- `/portal-unsubscribe` → unsubscribe
- `/payment-success`, `/payment-cancelled`, `/booking-confirmation` → Stripe callbacks

**Auth (no role gate):**
- `/onboarding` → `Onboarding.tsx` — new tenant fills company name/state
- `/dashboard` → `Index.tsx` — main stats dashboard
- `/hauler-dashboard`, `/hauler-customers`, `/hauler-manifests`, `/hauler-manifest-create` — hauler workflows
- `/client-portal` → `ClientPortal.tsx` — external client manifest access (also requires `client` role)

**Role-gated `[admin, ops_manager, dispatcher, sales]`:**
- `/clients`, `/clients/:id` — client list + detail
- `/routes/today`, `/routes/print/today` — today's routes
- `/manifests` — all org manifests
- `/dropoffs`, `/shipments`, `/outbound-schedule`, `/service-zones`
- `/trailers`, `/trailers/inventory` (alias), `/trailers/routes`, `/trailers/routes/:routeId`, `/trailers/vehicles` (FEATURE_FLAGS.TRAILERS-gated)

**Role-gated `[driver, admin]`:**
- `/routes/driver` — driver's routes
- `/book` — schedule pickup (driver)
- `/driver/dashboard`, `/driver/manifests`, `/driver/manifest/new`, `/driver/manifest/:id`
- `/driver/assignment/:assignmentId`, `/driver/payment-success`, `/driver/payment-cancelled`
- `/driver/outbound`, `/driver/outbound/new`, `/driver/trailer-assignments`

**Role-gated `[admin]`:**
- `/employees` — staff CRUD
- `/integrations` — third-party APIs
- `/admin/state-templates` — manifest template manager
- `/trailers/external-moves` (FEATURE_FLAGS.TRAILERS)

**Role-gated `[admin, ops_manager]`:**
- `/analytics`, `/reports`, `/reports/compliance`, `/manifest-health`, `/intelligence`
- `/settings`, `/settings/portal-invites`
- `/receivers`, `/receiver-signatures`
- `/booking-requests`, `/partner-applications`, `/contact-submissions`, `/hauler-rates`, `/haulers`
- `/inventory`, `/inventory/products`, `/inventory/reports` (FEATURE_FLAGS.INVENTORY)
- `/trailers/drivers`, `/trailers/reports`

**Role-gated `[super_admin]`:**
- `/manifests/backfill` — admin tool
- `/deployment` — internal status
- `/data-quality` — data audit

**Catch-all:** `*` → `NotFound.tsx`

**Flagged orphans:**
- `Payments.tsx` imported, no route
- `SystemHealth.tsx` imported, no route
- `Book.tsx` imported but never used
- `/trailers` and `/trailers/inventory` both render `TrailerInventory.tsx`

---

## 2. AUTH + ONBOARDING + ACCESS CONTROL

### Roles (10)
`super_admin`, `admin`, `ops_manager`, `dispatcher`, `driver`, `sales`, `client`, `hauler`, `receptionist`, `viewer`

### Signup flow (creates new isolated tenant)
1. `/auth` Sign Up tab → `Auth.tsx:181-206` form
2. `AuthContext.signUp()` (`AuthContext.tsx:388-420`) → `supabase.auth.signUp()` with metadata `{first_name, last_name}`
3. **Postgres trigger `handle_new_user_organization`** (latest: `migrations/20251223154338_*.sql`) fires on auth.users insert. If no `created_as_employee`/`created_as_client` metadata flag:
   - INSERT into `users` (line 33-35 of trigger)
   - INSERT into `organizations` with name=`'New Company'` placeholder, slug=`<email-prefix>-<id-prefix>`, treadset-logo
   - INSERT into `user_organization_roles` with `role='admin'`
4. `loadUserData` resolves org via `user_organization_roles` join
5. `checkOnboarding` (`AuthContext.tsx:329-359`) detects org name == `'New Company'` → redirects to `/onboarding`
6. `Onboarding.tsx:26-76` updates org name + state_code + user phone → `/dashboard`

### Signin flow
- `Auth.tsx:48-83` form → `AuthContext.signIn()` (`AuthContext.tsx:361-386`)
- Auth state listener calls `loadUserData()` (`AuthContext.tsx:119-264`)
  - Selects user + `user_organization_roles` + nested `organizations`
  - Reads `orgSlug` cookie, matches against user's orgs; falls back to first available
  - Returns roles for matched org
- Post-login redirect (`Auth.tsx:29-45`): client-only → `/client-portal`, else → `/dashboard`

### ProtectedRoute (`src/components/auth/ProtectedRoute.tsx:1-76`)
- 500ms delay before redirecting unauthed → `/auth/sign-in` (prevents token-refresh race)
- Role mismatch → "Access Denied" screen showing user's actual roles vs required
- `requireAuth=false` → always render

### Employee creation
- Admin opens `CreateEmployeeDialog.tsx:38-231` → calls `useCreateEmployee` → invokes edge function `create-employee` (`supabase/functions/create-employee/index.ts`)
- Edge function (line 122-137): verifies caller has `admin` role in target org
- Sets metadata `created_as_employee: true` + `target_organization_id` (line 196-197)
- Trigger sees flag → SKIPS org creation (line 14-16); only inserts user row + role row

### Client portal invite
- `ClientInvite.tsx:24-345` — token-gated public page
- RPC `validate_client_invite_token()` shows invite details
- Email read-only must match `sent_to_email` (line 93-96)
- `supabase.auth.signUp()` with `created_as_client: true` metadata
- Trigger SKIPS org creation; only inserts users row (line 22-24 of trigger)
- RPC `claim_client_invite_token()` links user to client's org with `client` role

### Public booking
- `PublicBook.tsx` — fully public, no auth, no guard

### Metadata flags that govern trigger behavior
| Flag | Behavior |
|---|---|
| `created_as_employee: true` | SKIP org creation; admin's edge function assigns role |
| `created_as_client: true` | SKIP org creation; only user row created; RPC claims invite |
| (none) | DEFAULT: create new org "New Company" + admin role |

### KNOWN AUTH ISSUES
- `AppSidebar.tsx:173` — `isSuperAdmin = user?.email === 'zachdevon@bsgtires.com'` — hardcoded super-admin gate by email. Tenant #2's owner cannot be super_admin. Migrate to role-based.
- AuthContext fallbacks (5 paths) PREVIOUSLY pinned users to BSG; FIXED this session — now leave `currentOrganization` undefined when org missing.

---

## 3. EDGE FUNCTIONS CATALOG (~77 functions)

### Security-flag legend
- `OK` — safe pattern (anon-key OR service-role with JWT validation OR public+rate-limited)
- `RISK-service-role-no-jwt` — bypasses RLS, no caller validation; anyone authenticated can call
- `NEEDS-REVIEW` — pattern unclear, manual audit required
- `ADMIN-only` — clearly internal tooling

### OK (validates JWT or anon-safe)
`ai-assistant`, `ai-route-optimizer`, `api-performance-monitor`, `create-payment`, `create-pickup-payment`, `create-tire-checkout`, `csv-export`, `csv-import` *(fixed this session)*, `delete-all-manifests`, `delete-hauler-and-manifests`, `driver-route-suggestions`, `fix-geocoding` *(fixed this session)*, `generate-ai-insights`, `get-mapbox-token`, `inventory-csv-export`, `process-booking-request`, `public-booking`, `public-contact-form`, `public-partner-application`, `public-stats`, `send-booking-confirmation`, `send-password-reset`, `send-team-invite`, `suggest-nearby-clients`, `update-employee`, `verify-payment`, `verify-pickup-payment`

### RISK-service-role-no-jwt (29 functions — security review needed)
`analyze-pickup-patterns`, `analyze-service-zones`, `archive-old-logs`, `auto-fix-geocoding`, `backfill-client-geography`, `batch-manifest-export`, `cache-cleanup`, `calculate-client-risk`, `calculate-driver-performance`, `calculate-hauler-reliability`, `calculate-revenue-forecast`, `calculate-route-efficiency`, `check-manifest-health`, `check-manifest-reminders`, `check-missing-pickups`, `check-trailer-alerts`, `cleanup-duplicate-notifications`, `compute-daily-metrics`, `conversion-kernel`, `data-quality-scan`, `diag-storage`, `enhanced-route-optimizer`, `ensure-manifest-pdf`, `extract-acroform-fields`, `fix-missing-revenue`, `generate-acroform-manifest`, `generate-trailer-manifest`, `geocode-locations`, `manifest-finalize`, `michigan-report-export`, `multi-trip-optimizer`, `record-performance-metric`, `resend-corrected-outreach`, `route-planner`, `send-client-outreach-email`, `send-client-team-invite`, `send-diagnostic-email`, `send-invite-reminders`, `send-manifest-email`, `send-portal-invitation`, `send-portal-invitation-drip`, `send-rate-increase-email`, `send-weekly-pickup-reminders`, `system-health-check`, `upload-v4-template`, `vehicle-setup` *(slated for deletion)*

### NEEDS-REVIEW
- `create-employee` — partial JWT check
- `portal-invite-unsubscribe` — webhook auth unclear
- `resend-webhook` — webhook signature verification?
- `track-email-event` — webhook signature verification?
- `warmup-critical-functions` — hardcoded anon key

### Suspected duplicates
- Route optimizers (4): `route-planner`, `ai-route-optimizer`, `enhanced-route-optimizer`, `multi-trip-optimizer`
- Manifest PDF (3): `generate-acroform-manifest`, `generate-trailer-manifest`, `ensure-manifest-pdf`
- Outreach emails (5): `send-client-outreach-email`, `send-rate-increase-email`, `send-weekly-pickup-reminders`, `send-invite-reminders`, `send-portal-invitation-drip`

### Orphaned (no callers in src/, may be cron/webhook/dead — 28)
`ai-route-optimizer`, `api-performance-monitor`, `archive-old-logs`, `auto-fix-geocoding`, `cache-cleanup`, `check-manifest-health`, `check-manifest-reminders`, `check-trailer-alerts`, `cleanup-duplicate-notifications`, `compute-daily-metrics`, `diag-storage`, `enhanced-route-optimizer`, `fix-missing-revenue`, `multi-trip-optimizer`, `portal-invite-unsubscribe`, `resend-corrected-outreach`, `resend-webhook`, `send-booking-confirmation`, `send-password-reset`, `send-portal-invitation-drip`, `send-rate-increase-email`, `send-test-outreach-email`, `send-weekly-pickup-reminders`, `system-health-check`, `track-email-event`, `upload-v4-template`, `vehicle-setup`, `warmup-critical-functions`

---

## 4. DATABASE SCHEMA + RLS + TRIGGERS

### Core tables (all org-scoped + RLS-enabled unless noted)
| Table | Key columns |
|---|---|
| `organizations` | id, name, slug, depot_lat/lng, service_hours, brand_*, state_code |
| `users` | id, auth_user_id, email, first_name, last_name (NOT org-scoped) |
| `user_organization_roles` | user_id, organization_id, role (app_role enum) |
| `clients` | id, company_name, contact, type, pricing_tier_id, organization_id |
| `locations` | id, client_id, address, lat/lng, organization_id |
| `vehicles` | id, name, license_plate, capacity, organization_id |
| `pricing_tiers` | id, name, pte/otr/tractor rates, organization_id |
| `pickups` | id, client_id, location_id, pickup_date, pte/otr/tractor/semi_count, status, organization_id |
| `manifests` | id, manifest_number, client_id, location_id, pickup_id, driver_id, vehicle_id, tire counts, payment_status, status (DRAFT→COMPLETED), organization_id |
| `assignments` | id, pickup_id, vehicle_id, scheduled_date, sequence_order, status, organization_id |
| `invoices` | id, client_id, invoice_number, total, status, organization_id |
| `invoice_items` | id, invoice_id, pickup_id (cascade-scoped) |
| `payments` | id, client_id, invoice_id, amount, organization_id |
| `dropoff_customers` | id, company_name, contact, organization_id |
| `dropoffs` | id, dropoff_customer_id, dropoff_date, tire counts, status, organization_id |
| `client_summaries` | id, client_id, year, month, totals, organization_id |
| `trailers` | id, trailer_number, current_status (enum), organization_id |
| `trailer_vehicles` | id, vehicle_number, license_plate, organization_id |
| `trailer_routes` | id, route_name, scheduled_date, driver_id, vehicle_id, status, organization_id |
| `trailer_events` | id, trailer_id, event_type (enum), driver_id, timestamp, organization_id |
| `client_risk_scores_beta` | id, client_id, risk_score, risk_level, organization_id |
| `notifications_beta` | id, user_id, title, type, organization_id |
| `client_health_scores` | id, client_id, score, organization_id |

### Triggers
- `update_*_updated_at` — generic `updated_at := now()` on most tables
- `update_client_summary_trigger` (pickups) — on completion: upsert `client_summaries`
- `update_client_stats_on_manifest_completion` (manifests) — on COMPLETED: update `client.last_manifest_at`, link `pickup.manifest_id`
- `update_dropoff_customer_stats_trigger` (dropoffs) — on completion: increment customer totals
- `payment_invoice_update_trigger` (payments) — sync invoice status
- `update_client_stats_on_pickup_completion` (pickups) — update lifetime_revenue, last_pickup_at
- `update_workflow_on_pickup_completion` (pickups) — kicks off post-pickup workflows
- **`handle_new_user_organization`** (auth.users INSERT) — see Auth section

### SECURITY DEFINER helper functions (used to dodge RLS recursion)
- `get_current_user_organization(slug)` — returns org UUID for caller
- `user_has_role(role, slug)` — recursion-safe role check
- `is_org_admin(org_id)`, `is_own_user_role(user_id)`
- `generate_manifest_number(org_id)` — YYYYMMDD-00001 format
- `generate_invoice_number()`
- `validate_client_invite_token`, `claim_client_invite_token`
- `link_client_on_signup`, `link_hauler_on_signup`
- `driver_schedule_pickup(...)` — RPC for mobile flow
- `get_live_client_analytics(org_id, year)`
- `get_*_pte_totals(org_id)` — daily/weekly/monthly/YTD
- `auto_resolve_missing_pickup_notifications`, `create_followup_workflows_for_inactive_clients` — workflow tasks
- `cleanup_expired_rate_limits`

### RLS pattern (standard tenant isolation)
```sql
organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)
```
All policies tolerate `auth.uid() IS NULL` (demo mode).

### Recent migrations (last 10)
- `20260420141132` — Dispatcher RLS expansion (Jody Green attempt)
- `20260420143913` — driver_capabilities table for semi_hauler
- `20260420150803` — RLS self-reference incident (ROLLED BACK)
- `20260420163000` — Rollback of recursive policies
- `20260501210000` — Add semi_count distinct from tractor (5 PTE vs 15 PTE)
- (Plus several without descriptive filenames — see git log)

### Total migrations: ~329 (consolidation parked in tech debt)

---

## 5. MANIFEST WORKFLOW

### Driver wizard (`src/components/driver/DriverManifestCreationWizard.tsx`)
7-step state machine: `info → tires → pricing → payment-method → signatures → review → payment`

Hooks consumed: `useCreateManifest`, `updateManifest`, `useManifestIntegration`, `useSendManifestEmail`

### Signature capture
| Stage | Bucket path | Storage trigger |
|---|---|---|
| Generator | `manifests/signatures/{ts}-generator.png` | wizard line 667-709 |
| Hauler | `manifests/signatures/{ts}-hauler.png` | wizard line 715-744 |
| Receiver | `manifests/{org_id}/signatures/{file}.png` | `ReceiverSignatureDialog.tsx:159-166` |

Stored on manifest: `receiver_sig_path`, `receiver_signed_at`, `receiver_signed_by`, `status='COMPLETED'`

### PDF generation (`generate-acroform-manifest`)
- pdf-lib AcroForm-based; field map in `MICHIGAN_V4_FIELDS` (in `ensure-manifest-pdf/index.ts:9-55`)
- ASCII sanitizer (NFD normalize + strip) at function start v199+ — fixes WinAnsi crash on non-ASCII addresses (Turkish "Birleşik" incident 2026-05-01)
- Template fallback chain: `templates/` bucket → `manifests/templates/` → signed URLs
- Output: `manifests/integrated-v4-{manifestId}-{ts}.pdf`

### Email auto-send (CLIENT-side, not server)
`src/hooks/useSendManifestEmail.ts`
- Triggered from wizard line 1213-1224: subject = `Tire Manifest - ${emailCompanyName}`
- Triggered from `ReceiverSignatureDialog.tsx:245-248`: subject = `Completed Manifest ${number}`
- Backend edge: `send-manifest-email` (RISK-service-role-no-jwt — anyone can send)
- Sender: `noreply@bsgtires.com` via Resend (TODO: per-tenant sender domain)

### Storage buckets
- `manifests` — final PDFs + signature images
- `templates` — primary template location

### Receiver-portal flow
No dedicated route. Receivers either:
- Receive email link, log in, navigate to `/receiver-signatures` (admin/ops_manager-gated, NOT receiver-gated — possible UX issue)
- Or sign at delivery via `ReceiverSignatureDialog`

### Related edge functions
- `manifest-finalize` — final status, regenerate PDF
- `ensure-manifest-pdf` — backfill missing PDFs
- `batch-manifest-export` — ZIP of up to 200 manifests
- `check-manifest-health` — scan completeness, create notifications
- `generate-trailer-manifest` — manifest for trailer event
- `extract-acroform-fields` — list AcroForm fields from template
- `delete-all-manifests`, `delete-hauler-and-manifests` — destructive admin

---

## 6. TENANT WRITE PATHS — RISK SUMMARY

### Critical RISKs not yet fixed (must address before tenant #2)

**RISK-missing-org (3 hooks insert tenant data with NO `organization_id`):**
1. `src/hooks/useHaulers.ts:79` — INSERT `haulers` no org_id
2. `src/hooks/usePricingTiers.ts:50` — INSERT `pricing_tiers` no org_id
3. `src/hooks/useFinance.ts:177` — INSERT `payments` no org_id

**RISK-form-untrusted (5 hooks accept org_id from caller param without validation):**
- `useClients.ts:180`, `useVehicles.ts:35`, `useLocations.ts:51`, `useDropoffs.ts:69`, `useGenerateDropoffManifest.ts:43`, `useCreateDropoffWithManifest.ts:29`
- Current callers all pass `user.currentOrganization.id` correctly — but the hooks don't enforce. Defensive guard recommended.

### Already fixed this session
- `CreateClientDialog.tsx`, `SimplifiedVehicleManagement.tsx`, `csv-import` edge fn, `fix-geocoding` edge fn, AuthContext fallbacks

### Hardcoded values found in passing
- `AppSidebar.tsx:173` — super-admin email gate (known)
- No remaining hardcoded BSG UUID in src/ or supabase/functions/

---

## 7. KNOWN ISSUES (consolidated open items)

### CRITICAL (blocks multi-tenant safety)
- 3 RISK-missing-org hooks (haulers, pricing_tiers, payments) — **must fix before tenant #2**
- Hardcoded super-admin email `zachdevon@bsgtires.com` (`AppSidebar.tsx:173`)
- 29 edge functions run as service-role with no JWT validation (`vehicle-setup` is one — slated for deletion)
- BSG marketing pages (PublicAbout, PublicServices, etc.) bleed onto TreadSet domain

### HIGH (operational risk)
- No Sentry / error tracking (TODO in `ErrorBoundary.tsx:35`)
- No automated tests
- 329 migrations not consolidated
- RLS recursion guard not in CI (4/20 incident risk)
- `vite:preloadError` runtime guard not shipped (causes "Failed to fetch dynamically imported module")

### MEDIUM (correctness / hygiene)
- Public booking address autocomplete not pinned to `language=en` (locale-contaminated input bug)
- Detroit lat/long bounds hardcoded in `fix-geocoding` — non-Detroit tenants flagged incorrectly
- Suspected duplicate edge functions (4 route optimizers, 3 PDF generators, 5 email drips)
- 28 orphaned edge functions (no callers in src/) — confirm cron-driven or delete
- Orphaned page imports: `Payments.tsx`, `SystemHealth.tsx`, `Book.tsx`
- `/receiver-signatures` gated by admin/ops_manager but flow may need receiver-gated path

### STRATEGIC (parked / aspirational)
- Re-TRAC API integration (compliance moat) — awaiting their reply since 2026-05-01
- Jody Green feature (dispatcher-sees-all-drivers) — never re-shipped after 4/20 rollback
- Migration consolidation
- Demo seed data for sales / Denver tradeshow
- Per-tenant Stripe billing surface
- Per-tenant manifest sender domain (currently `noreply@bsgtires.com` for everyone)

---

## 8. KEY FILE REFERENCE

| Concern | File |
|---|---|
| Auth + roles | `src/contexts/AuthContext.tsx` |
| Route map | `src/App.tsx` |
| Role gating | `src/components/auth/ProtectedRoute.tsx` |
| Sidebar/nav | `src/components/AppSidebar.tsx` |
| Driver manifest wizard | `src/components/driver/DriverManifestCreationWizard.tsx` |
| Receiver signature | `src/components/ReceiverSignatureDialog.tsx` |
| Manifest PDF integration | `src/hooks/useManifestIntegration.ts` |
| Manifest email | `src/hooks/useSendManifestEmail.ts` |
| Onboarding | `src/pages/Onboarding.tsx` |
| Public booking | `src/pages/PublicBook.tsx` |
| Tenant org trigger | `supabase/migrations/20251223154338_*.sql` |
| Manifest PDF gen | `supabase/functions/generate-acroform-manifest/index.ts` |
| Manifest field map | `supabase/functions/ensure-manifest-pdf/index.ts:9-55` |
