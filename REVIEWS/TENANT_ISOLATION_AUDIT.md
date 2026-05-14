# Treadset — Tenant Isolation Audit

**Date:** 2026-05-14
**Mode:** Read-only diagnosis. No code changes, no migrations, no external calls.
**Purpose:** Verify multi-tenant isolation holds before Tready's flexible query surface ships.
**Context:** 2026-04-20 prod outage was caused by a self-referential RLS policy. This codebase has shipped broken RLS before.

---

## TL;DR

| Layer | State | Worst-case |
|---|---|---|
| RLS coverage (DB layer) | **Mostly OK.** 66/89 public tables compliant. **5 critical gaps + 2 design issues.** | Tables without policies expose every tenant's data to any authenticated user. |
| RLS correctness (recursion) | **Clean.** Zero active self-referential policies. April-20 policies rolled back. **No CI guard exists.** | A new self-referential policy ships → recurrence of the April-20 outage. |
| Edge functions | **Bad.** 11 functions LEAK tenant data; 56 hold service-role without JWT validation. | Cross-tenant manifest read, PDF gen, email send, CSV export, hauler-delete are all callable without org check. |
| App-code auth | **Bad.** Hardcoded super-admin email + 3 hardcoded `'bsg'` slug fallbacks. | A non-BSG user with no cookie silently lands in the BSG org. Tenant #2 owner can never be super-admin. |

**Conclusion:** **Do NOT ship Tready's flexible-query feature yet.** Tready edge fn itself is well-isolated (good news), but the database layer it queries has gaps where a single org-scope miss will leak across tenants. Fix the 11 leak functions, the 5 RLS gaps, and the app-code anti-patterns first.

---

## 1. RLS Coverage Table

89 tables surveyed in the `public` schema. **Status code:** ✅ scoped / ⚠️ design issue / ❌ no policy / ❌❌ RLS disabled.

### Core tenant data (22 tables)
| Table | RLS | Tenant policy | Scoping | Notes |
|---|---|---|---|---|
| `assignments` | ✅ | ✅ | org JOIN via uo+u | `20251111183208` |
| `audit_events` | ✅ | ✅ | org direct | `20250915153010` |
| `booking_requests` | ✅ | ✅ | org direct | `20251216195348` |
| `client_email_preferences` | ✅ | ✅ | org direct | |
| `client_invites` | ✅ | ✅ | org direct | `20251218205629` |
| `client_pricing_overrides` | ✅ | ✅ | org direct | `20250918183515` |
| `client_summaries` | ✅ | ✅ | org direct | `20250918182329` |
| `clients` | ✅ | ✅ | org JOIN | role-based: members read, admin/ops/sales manage |
| `contact_submissions` | ⚠️ | ❌ | NO POLICY | **GAP — RLS on, zero policies.** `20251230181342` |
| `dropoff_customers` | ✅ | ✅ | org direct | `20250918183600` |
| `dropoffs` | ✅ | ✅ | org JOIN + hauler match | `20251002174740` |
| `invoices` | ✅ | ✅ | org direct | `20250915153010` |
| `invoice_items` | ⚠️ | ❌ | NO POLICY | **GAP — RLS on, zero policies, no org_id column.** `20250812150025` |
| `locations` | ✅ | ✅ | org direct + via client | |
| `manifests` | ✅ | ✅ | org JOIN | driver match + role-based |
| `payments` | ✅ | ✅ | org direct | |
| `pickups` | ✅ | ✅ | org JOIN | client/driver/role gating |
| `pricing_tiers` | ✅ | ✅ | org direct | |
| `service_zones` | ✅ | ✅ | org direct | `20251216195348` |
| `surcharge_rules` | ✅ | ✅ | org direct | `20250918184410` |
| `vehicles` | ✅ | ✅ | org direct | |
| `client_workflows` | ⚠️ | ❌ | NO POLICY | **GAP — RLS on, zero policies, has org_id.** `20250929165021` |

### Auth / identity (3 tables)
| Table | RLS | Tenant policy | Scoping | Notes |
|---|---|---|---|---|
| `users` | ✅ | n/a | global by design | Org membership via `user_organization_roles` |
| `user_organization_roles` | ✅ | ✅ | auth.uid() | Any authed user reads their own rows — intentional |
| `organization_invites` | ✅ | ✅ | org direct | |

### Receivers / cross-tenant (2 tables)
| Table | RLS | Tenant policy | Scoping | Notes |
|---|---|---|---|---|
| `outbound_assignments` | ⚠️ | ❌ | NO POLICY | **GAP — RLS on, zero policies, has org_id.** `20260204200327` |
| `entities` | ✅ | ✅ | org direct | `20251111182730` |

### Organization config (3 tables)
| Table | RLS | Tenant policy | Scoping | Notes |
|---|---|---|---|---|
| `organizations` | ✅ | ✅ | members-only | Users see only orgs they belong to |
| `organization_settings` | ⚠️ | ⚠️ | NO ORG FILTER | **DESIGN ISSUE — policies don't filter `organization_id`. Any org admin can read/write any org's settings.** `20250918183600` |
| `state_compliance_configs` | ✅ | n/a | global lookup | Acceptable — state rules are uniform |

### Trailers (5 tables, all `20251205154742`)
| Table | RLS | Tenant policy | Scoping |
|---|---|---|---|
| `trailers` | ✅ | ✅ | org direct |
| `trailer_events` | ✅ | ✅ | org direct |
| `trailer_routes` | ✅ | ✅ | org direct |
| `trailer_route_stops` | ✅ | ✅ | org direct |
| `trailer_vehicles` | ✅ | ✅ | org direct |
| `driver_capabilities` | ✅ | ✅ | org direct | `20251205154742` |

### Reporting / analytics (10 tables)
| Table | RLS | Tenant policy | Scoping | Notes |
|---|---|---|---|---|
| `client_health_scores` | ✅ | ✅ | org direct | `20251103211114` |
| `client_risk_scores_beta` | ❌❌ | ❌ | RLS DISABLED | **CRITICAL — RLS not enabled on a table that holds risk scores. Anyone with DB access reads every tenant's risk data.** |
| `conversions` | ✅ | ⚠️ | `USING (true)` | **DESIGN ISSUE — fully open read policy.** `20251111184137` |
| `data_quality_flags` | ✅ | ✅ | org direct | |
| `email_events` | ⚠️ | ❌ | NO POLICY | RLS on, no policies, has org_id |
| `inventory_products` | ⚠️ | ❌ | NO POLICY | RLS on, no policies, has org_id |
| `inventory_transactions` | ⚠️ | ❌ | NO POLICY | RLS on, no policies, has org_id |
| `performance_alerts` | ✅ | ✅ | org direct | `20251104145841` |
| `performance_logs` | ⚠️ | ❌ | NO POLICY | RLS on, no policies, has org_id |
| `processing_events` | ✅ | ✅ | org direct | `20251111182730` |
| `report_monthly_snapshots` | ✅ | ✅ | org direct | |
| `reporting_locations` | ✅ | ✅ | org direct | |
| `reports_annual` | ✅ | ✅ | org direct | |
| `shipments` | ✅ | ✅ | org direct | |
| `stripe_payments` | ✅ | ✅ | org direct | |

### Critical gaps summary
| # | Table | Issue | Severity |
|---|---|---|---|
| 1 | `client_risk_scores_beta` | RLS not enabled | **CRITICAL** |
| 2 | `contact_submissions` | RLS on, no policies | **CRITICAL** |
| 3 | `invoice_items` | RLS on, no policies, no `organization_id` column | **CRITICAL** |
| 4 | `client_workflows` | RLS on, no policies (has org_id) | **HIGH** |
| 5 | `outbound_assignments` | RLS on, no policies (has org_id) | **HIGH** |
| 6 | `organization_settings` | Policies don't filter org_id | **HIGH** |
| 7 | `conversions` | `USING (true)` — fully open | **HIGH** |
| 8 | `email_events`, `inventory_products`, `inventory_transactions`, `performance_logs` | RLS on, no policies | **MEDIUM** (data sensitivity dependent) |

---

## 2. RLS Correctness — Self-Referential Policies

**Result: ZERO active self-referential policies.** The April-20 incident is closed.

### History (resolved)
- **`20260420150803_*.sql`** — introduced two recursive policies:
  - `users` / "Users can select own or staff select org members" (lines 5–21) — DIRECT
  - `user_organization_roles` / "Staff can view org member roles" (lines 24–37) — DIRECT
  - Postgres errored: `infinite recursion detected in policy for relation "users"` (SQLSTATE 42P17)
- **`20260420163000_rollback_broken_rls.sql`** — dropped both, restored prior policies using `public.user_has_role()` helper instead of inline EXISTS. Same-day rollback (~3 hrs prod down).

### Current state — all policies safe
Every active policy resolves role/org membership via a SECURITY DEFINER helper OR a non-recursive direct comparison. No policy re-enters RLS on the same table.

### SECURITY DEFINER helpers (4 exist + are used)
| Helper | Defined | Used by |
|---|---|---|
| `get_current_user_organization(slug)` | `20250812152144_*.sql:292` | 1 callsite (internal) |
| `user_has_role(role, slug)` | `20250905170443_d6425df0-*.sql:4` | 6+ policies |
| `is_org_admin(org_id)` | `20260115154929_97da6b31-*.sql:24` | 11 policies (stripe_connect, quickbooks, integration_status_rpcs, uo) |
| `is_own_user_role(user_id)` | `20260115154929_97da6b31-*.sql:8` | 3 policies (user_organization_roles SELECT) |

### CI recursion guard: **MISSING** ❌
- No `.github/workflows/` directory exists.
- No migration-lint scripts in `package.json` (only `dev`/`build`/`lint`/`preview`).
- No `scripts/` or pre-commit hook for `pg_policies` scanning.
- TREADSET_BRAIN.md line 323 explicitly flags this as known tech debt.

**Risk:** Next self-referential policy that slips into a migration goes straight to prod. The April-20 outage will recur.

**Fix:** Add a pre-merge CI step that parses `supabase/migrations/*.sql` for `CREATE POLICY` and fails on table-name appearing inside its own USING/WITH CHECK clause.

---

## 3. Edge Functions — Tenant Validation Audit

**87 functions surveyed.** Classification:

| Class | Count | Definition |
|---|---|---|
| OK-jwt | 10 | Validates caller JWT + resolves org server-side |
| OK-public | 6 | Deliberately public (booking, public stats) |
| WEBHOOK | 4 | External webhooks with signature verification |
| **RISK-service-role-no-jwt** | **56** | Service-role key, no JWT validation |
| LEAK (subset of RISK) | **11** | Actively leaks tenant data |
| NEEDS-REVIEW | 11 | Pattern unclear |

### The 11 LEAK functions (must-fix before Tready ships)

| # | Function | File | Leak vector |
|---|---|---|---|
| 1 | `send-manifest-email` | `supabase/functions/send-manifest-email/index.ts:8-10,56-62` | Caller passes any `manifest_id`; fn fetches manifest + emails the client. No org check. |
| 2 | `generate-acroform-manifest` | `supabase/functions/generate-acroform-manifest/index.ts:83-84,30` | Caller passes any `manifestId`; fn generates PDF. No org check. |
| 3 | `manifest-finalize` | `supabase/functions/manifest-finalize/index.ts:145-150` | Caller passes any `pickup_id`; fn finalizes manifest status. No JWT. |
| 4 | `batch-manifest-export` | `supabase/functions/batch-manifest-export/index.ts:35-50` | Caller passes UUID array of `manifest_ids`; fn ZIPs them. No JWT. Enumeration-vulnerable. |
| 5 | `send-client-outreach-email` | `supabase/functions/send-client-outreach-email/index.ts:15-27` | Accepts `{clientId, organizationId}` from body; emails client with no caller-org check. |
| 6 | `send-client-team-invite` | `supabase/functions/send-client-team-invite/index.ts:23-44` | Same pattern — `organization_id` from request body. |
| 7 | `send-portal-invitation-drip` | `supabase/functions/send-portal-invitation-drip/index.ts:32-33,63,116` | Bulk-send invites; org_id from body. |
| 8 | `send-portal-invitation` | (same pattern) | Single-invite version of #7. |
| 9 | `csv-export` | `supabase/functions/csv-export/index.ts:32-61` | No JWT; exports all clients/pickups/invoices across all tenants. |
| 10 | `michigan-report-export` | `supabase/functions/michigan-report-export/index.ts:26-27` | State compliance export; no JWT, no org filter. |
| 11 | `delete-hauler-and-manifests` | `supabase/functions/delete-hauler-and-manifests/index.ts:21-47` | **DOES** validate JWT (good) but then accepts any `haulerId` from body — deletes manifests for any tenant's hauler. |

### Honorable mentions (OVERPRIVILEGED but not leaking)
56 functions use the service-role key without JWT validation. Most are cron jobs (`analyze-pickup-patterns`, `calculate-driver-performance`, `archive-old-logs`, etc.) — they don't directly leak because nothing in the application calls them with attacker input. **Risk:** if any cron URL ever becomes publicly invocable (or is invoked from a browser by mistake), they over-privilege immediately.

**Fix pattern:** for cron-only fns, gate on a private invocation URL or shared-secret header. For caller-driven fns, validate JWT + resolve org from `user_organization_roles` server-side; never accept `organization_id` as a request body param.

### Good news
- `tready` (`supabase/functions/tready/index.ts:66-179`) — **excellent isolation**. Validates JWT, resolves org_id from `user_organization_roles`, closes over `org_id` in the tool factory so the LLM cannot override it. **This is the model the other 56 RISK functions should adopt.**
- `csv-import`, `fix-geocoding`, `create-employee`, `create-payment`, `create-pickup-payment`, `update-employee` — all properly validated.
- Resend webhook (`resend-webhook/index.ts:33-110`) verifies Svix HMAC signature.

---

## 4. Auth Logic Outside the Database

### Hardcoded emails
| File:line | Code | Risk |
|---|---|---|
| `src/components/AppSidebar.tsx:174` | `const isSuperAdmin = user?.roles?.includes('super_admin') \|\| user?.email === 'zachdevon@bsgtires.com';` | Only this email gets super-admin UX. Tenant #2 owner can never be super-admin. **HIGH.** |

### Hardcoded `'bsg'` org slug
| File:line | Code | Risk |
|---|---|---|
| `src/contexts/AuthContext.tsx:106` | `const getCurrentOrgSlug = () => getCookieOrgSlug() ?? 'bsg';` | If cookie missing → silently pin to BSG. **CRITICAL.** |
| `src/contexts/AuthContext.tsx:204` | `const preferredSlug = cookieSlug ?? (userData as any).default_org_slug ?? 'bsg';` | Second silent-default to BSG in role loading. **CRITICAL.** |
| `src/lib/auth/requireRole.ts:80` | `.filter((uor) => uor.organization?.slug === 'bsg')` | Server-side role check filters to BSG-only roles. Tenant #2 employees appear roleless. **CRITICAL.** |

### Hardcoded `'demo'` org slug (safe — UX only)
| File:line | Code | Risk |
|---|---|---|
| `src/components/tready/TreadyBubble.tsx:839` | `const isDemoOrg = user.currentOrganization?.slug === 'demo';` | Triggers autopilot loop. Not a security gate; org slug comes from DB. **LOW.** |

### Frontend role gates without backend enforcement
- `src/components/auth/ProtectedRoute.tsx:58-73` — UX-blocks unauthorized routes. **Defense-in-depth only.** Real enforcement must be RLS. Status: ProtectedRoute itself is safe; risk lives in RLS coverage (Section 1) and edge fn validation (Section 3).

### Client-side org filtering with no defensive filter
Three hooks fetch tenant data without an explicit `organization_id` filter — they rely entirely on RLS holding:

| File:line | Hook | Risk |
|---|---|---|
| `src/hooks/useVehicles.ts:9-24` | `useVehicles()` — no org filter | If `vehicles` RLS ever breaks → cross-tenant vehicle list. **HIGH if RLS regresses.** |
| `src/hooks/useDropoffs.ts:48-68` | `useDropoff(id)` — fetches by ID only | UUID enumeration possible. **HIGH if RLS regresses.** |
| `src/hooks/useLocations.ts:28-40` | `useAllLocations()` — no org filter | Cross-tenant location list. **HIGH if RLS regresses.** |

### Cookie-based org switching
- `src/contexts/AuthContext.tsx:99-113` — `getCookieOrgSlug()` + `switchOrganization()` write/read `orgSlug` cookie. **No server-side validation that the cookie value belongs to the user.** A user setting `document.cookie = 'orgSlug=rival-org'` triggers a fetch attempt against `rival-org`; if they aren't a member, the silent `'bsg'` fallback (Section 4 above) lands them in BSG instead — compounding risk.

**Fix:** validate cookie value against the user's actual `user_organization_roles` list before honoring it; if invalid, redirect to org-picker, **never** silently default.

---

## 5. Prioritized Risk List

### Must fix BEFORE Tready ships its flexible-query feature

1. **Patch the 11 LEAK edge functions** (Section 3). Each one is a direct cross-tenant data leak callable today by any authenticated user. The pattern is identical: validate JWT, resolve `organization_id` from `user_organization_roles`, never accept org_id from request body. Use `tready/index.ts` as the reference implementation.
2. **Add tenant-isolation policies to the 5 critical RLS gaps** (Section 1):
   - Enable RLS on `client_risk_scores_beta` + add policy
   - Add policies to `contact_submissions`, `client_workflows`, `outbound_assignments`
   - Add `organization_id` column + policies to `invoice_items` (or rewrite to inherit from parent `invoices`)
3. **Fix the 4 critical app-code anti-patterns** (Section 4):
   - Remove the `'bsg'` slug fallback in `AuthContext.tsx:106` and `:204`
   - Parameterize `requireRole.ts:80` so it doesn't only check BSG
   - Replace the hardcoded super-admin email in `AppSidebar.tsx:174` with a role-only check
4. **Fix the 2 design-issue policies**:
   - `organization_settings` — add WITH CHECK that filters `organization_id`
   - `conversions` — replace `USING (true)` with org-scoped clause (verify whether table even needs `organization_id`)

### Can follow Tready ship (still important)

5. Add policies to `email_events`, `inventory_products`, `inventory_transactions`, `performance_logs` — data is less sensitive but should not be open across tenants.
6. Add JWT validation to the 56 RISK-service-role-no-jwt functions, or gate cron-only ones on a private URL / shared-secret header.
7. Validate the org-switch cookie against the user's actual org membership (Section 4 / `AuthContext.tsx:99-113`).
8. Add explicit `organization_id` filters to `useVehicles`, `useDropoff`, `useAllLocations` for defense-in-depth.
9. **Ship the RLS recursion CI guard** (Section 2). A pre-merge script that scans migrations for self-referential policies. Without this, April-20 recurs.

---

## 6. Ship Report

**Date:** 2026-05-14
**Session title:** Tenant-isolation audit (read-only)

**Shipped:**
- `REVIEWS/TENANT_ISOLATION_AUDIT.md` — this document. Four-agent parallel sweep covering RLS coverage, RLS correctness, edge-fn validation, app-code auth. Concrete file:line citations on every finding.

**Blocked:**
- Tready flexible-query / agentic-DB-write feature should NOT ship until at least the 11 LEAK edge fns + 5 critical RLS gaps are patched. The audit's TL;DR is the gating doc.

**Parked (no code changes per audit mode):**
- All actual fixes — by design, this session was diagnosis only. Each priority-1 item becomes its own PR.
- The RLS recursion CI guard — should be one of the first PRs after this audit, since it prevents the next April-20.
- App-code anti-patterns (`'bsg'` fallback, super-admin email, untrusted cookie) — separate PRs from RLS/edge fn fixes since they're different code paths.

**Next session first move:**
Open `fix/critical-rls-gaps` branch. Add an explicit-policy SQL migration for the 5 critical tables (`client_risk_scores_beta`, `contact_submissions`, `client_workflows`, `outbound_assignments`, `invoice_items`). Hand to Z for paste-flow review before applying. **Do not auto-apply** — this is RLS work, exactly the category CLAUDE.md says hands-off until reviewed.

---

*Compiled from four parallel Explore subagents (RLS coverage / RLS correctness / edge functions / app-code auth). Source migrations: 352 SQL files in `supabase/migrations/`. Source edge fns: 87 functions in `supabase/functions/`. Read-only; no schema or code modified.*
