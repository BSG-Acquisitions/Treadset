# TreadSet Session Log

Newest entries at the top. Each session ends with a Ship Report appended here per CLAUDE.md protocol.

---

## 2026-05-05 / 06 — Multi-tenant safety + driver-UI bug audit (15 fixes), system map built, deploy queued for after-hours

**Context:** Z is licensing TreadSet to a second company on the same Supabase project. Driver Moses reported the app was "acting up." Session covered multi-tenant audit, driver-UI bug hunt, system mapping, and prep for after-hours ship.

**Two PRs open, neither merged yet:**
- **[PR #2 — fix/driver-bugs](https://github.com/BSG-Acquisitions/Treadset/pull/2)** — 15 driver-UI bug fixes
- **[PR #3 — fix/remove-hardcoded-bsg-org-id](https://github.com/BSG-Acquisitions/Treadset/pull/3)** — multi-tenant write-path hardening + haulers tenant-scope migration

**Shipped to repo (still on branches, not in main):**

PR #3 (multi-tenant safety):
- Removed every hardcoded BSG UUID `ba2e9dc3-ecc6-4b73-963b-efe668a03d73` and `org_slug: 'bsg'` from write paths
- AuthContext: dropped 5 BSG-org fallbacks; users without org no longer silently joined to BSG
- 13 hooks/dialogs now inject org from auth context: CreateClientDialog, SimplifiedVehicleManagement, useCreateClient, useCreatePayment, useCreateInvoice, useCreatePricingTier, useCreateManifest, useSchedulePickup, useHaulerManifests createManifest, RecordPaymentDialog
- Edge functions `csv-import` + `fix-geocoding` now validate caller JWT and derive org from user's roles (was: hardcoded BSG)
- AppSidebar: added role-based super_admin check alongside legacy email gate (additive; legacy gate removed in follow-up)
- New migration `supabase/migrations/20260505180000_haulers_tenant_scope.sql` — adds organization_id to haulers, backfills BSG, NOT NULL, RLS policies (NOT YET APPLIED — apply after-hours)
- Cleanup: deleted dead VehicleSetup.tsx, EnhancedVehicleManagement.tsx, DriverAssignmentHelper.tsx; removed 'bsg tire' from analytics filter
- New: `TREADSET_BRAIN.md` system map (loaded at session start per CLAUDE.md update). Covers routes, auth, edge functions, schema, manifest workflow, known issues
- gitignore `REVIEWS/` and `supabase/.temp/`

PR #2 (driver-UI bugs, 15 fixes across 4 commits):
- **Sign-in timeout removed** — `Auth.tsx` and `ClientLogin.tsx` had a 5-second `Promise.race` rejecting "Sign in timed out" while Supabase server-side accepted credentials. **THIS IS THE ACTUAL BUG MOSES REPORTED.** Audit log shows 3 ghost logins in 7 seconds at 14:37 ET 2026-05-05
- **Semi-tire pricing rollout finished** — May 1 commit `77cf8e6` fixed PTE math + PDF + state report but missed pricing/Stripe/validation. Today's voided manifest #20260505-00003 (5 semis, $344) was caused by this. Now fixed: pricing total, semi rate UI card, Stripe line item, payment breakdown, pricing validation, tire-count gates
- **Semi-tire ripple completion** — also missed by May 1: `useMichiganReporting.ts` (compliance report aggregator), `ManifestViewer.tsx`, `DriverManifestView.tsx`. Now correctly count + display + categorize semi tires for EGLE filing
- **Signature timestamps** — submit no longer overwrites locked generator/hauler/receiver `signed_at` with new Date(); added `receiverSignedAt` state; PDF print fields use locked timestamps
- **Outbound signature path tenant-scoped** — `OutboundManifestWizard.tsx` was writing signatures to `signatures/${tempId}/${type}.png` without org prefix (cross-tenant collision). Fixed
- **GPS error feedback** — `DriverRoutes.tsx` now toasts gpsError so drivers know if location permission was denied (was silent)
- **DriverRoutes check-number editor** — added visible Cancel button (was: keyboard Escape only)
- **DriverManifestView null guards** — client/location/pickup_date now show "—" instead of "undefined"
- **DriverManifests error state** — error card with Retry instead of infinite spinner
- **CollectPaymentWithCard cleanup** — useEffect now has cancellation flag (was: orphan Stripe intents on rapid re-open)
- **ReceiverSignatureDialog idempotency guard**
- **useAssignments org filter** — defense-in-depth on top of RLS
- **OutboundManifestWizard shipment soft-fail surfaced** — was silent compliance gap
- **DriverTrailerAssignments** — actual error message in markStopComplete failure toast
- **Deleted dead `src/components/driver/ManifestWizard.tsx`** (~767 lines, no callers)

**Findings logged but NOT fixed (parked):**
- 29 edge functions run as service-role with no JWT validation — security audit needed (e.g., `vehicle-setup`, `send-manifest-email`, all 4 route optimizers, all 5 email drips)
- RLS UPDATE policy on `manifests` includes `'driver'` in allowed roles — drivers could void manifests via direct SQL/API. UI hides the button. Needs tightening (driver should only update own manifest in early states)
- BSG marketing pages (`/about`, `/services`, etc.) still render on TreadSet domain — needs hostname gate or split repo
- Per-tenant Stripe sender / manifest sender domain (currently `noreply@bsgtires.com` for everyone) — needs per-org config + Resend domain verification
- Real PDF export for compliance (currently plaintext fake)
- Re-TRAC API integration — awaiting their reply since 2026-05-01
- Sentry / error tracking — not wired
- `vite:preloadError` runtime guard — not shipped (3-line fix)

**Memory + docs persisted:**
- New feedback memory: `feedback_domain_change_checklist.md` — 5-surface trace (count / money / validation / UI / exports) before declaring a domain-field fix done. Triggered by today's discovery that May 1 semi_count fix was incomplete
- Updated `reference_supabase_pat.md` to confirm PAT works on TreadSet project (`wvjehbozyxhmgdljwsiz`); added Functions endpoint usage
- New `TREADSET_BRAIN.md` in repo — auto-loaded by Claude per CLAUDE.md update

**Driver activity audit (Moses, 2026-05-05):**
- Last actual login: 2026-05-01 12:44pm ET; persistent session since (token refreshes every 1-3 hours)
- Today: 4 assignments, 2 completed, 1 voided manifest with 5 semis (the bug bite)
- 2:37pm ET: 3 successive login attempts in 7 seconds (the timeout bug)
- GPS pings empty for today — either he didn't tap Start Route, or GPS permission was silently denied
- Voided by Justin Roberts (admin/ops_manager/dispatcher/driver), not Moses

**Routine armed:** [trig_012DChxmk9kci7raKfDwhHep](https://claude.ai/code/routines/trig_012DChxmk9kci7raKfDwhHep) fires once at 2026-05-05 22:00 UTC (6pm ET). Currently configured to OUTPUT a reminder summary, not auto-deploy. Z had requested upgrade to fully autonomous; was pending decision on GitHub PAT (Path A) vs split-deploy (Path B) when session closed.

**Blocked / waiting:**
- Z's choice: provide GitHub fine-grained PAT for fully autonomous merges, OR plan to manually click Merge on both PRs after notification fires, OR ship now (mid-shift risk)
- Resend domain verification for `treadset.co` (Z-action; needed before per-tenant manifest sender)
- Re-TRAC API integrations team reply

**Next session first move:**
1. Read CLAUDE.md + TREADSET_BRAIN.md + this entry. Verify current state of PRs (`gh pr list --repo BSG-Acquisitions/Treadset`) and main (`git log origin/main -5`).
2. Check whether the 6pm reminder routine fired (`https://claude.ai/code/routines/trig_012DChxmk9kci7raKfDwhHep`) and what Z did with it.
3. If PRs unmerged: confirm with Z whether to ship now (his earlier authorization "yes ship without my review" stands per memory). Path A = need GitHub PAT; Path B = Z merges both PRs by hand, Claude does Supabase steps autonomously.
4. After both PRs merge to main:
   - Run `supabase/migrations/20260505180000_haulers_tenant_scope.sql` via Management API on project `wvjehbozyxhmgdljwsiz`
   - Deploy `csv-import` and `fix-geocoding` edge functions via Management API
   - Assign `super_admin` role to Z's user (`oaklandreds20@gmail.com`, auth_user_id `0b232649-62e5-442c-b65a-28d254e7382a`) in `user_organization_roles`
   - Verify all three by post-query
5. Tell Z to instruct Moses to hard-refresh the PWA after Vercel reports new deploy live (PWA may have stale chunks)
6. After ship, address parked items in priority order: Sentry, BSG marketing split, Stripe per-tenant config

---

## 2026-04-20 — Off Lovable, onto Vercel + production RLS incident

**Shipped:**
- Repo transferred from `ZDevo200/green-road-ui` to `BSG-Acquisitions/Treadset`
- BSG-Acquisitions GitHub org created; `dailydrivestudioco-creator` added as Owner for push access
- 23 pending Lovable commits pulled into the cleanup branch and merged cleanly (no conflicts)
- Deployed to Vercel under BSG-Acquisitions team, live at `treadset.vercel.app`
- Production incident: Lovable's migration `20260420150803_*.sql` introduced two self-referential RLS policies causing `infinite recursion detected in policy for relation ...` errors, locking out super admin, dispatcher (Justin), and driver roles across the app
- Rollback migration `20260420163000_rollback_broken_rls.sql` written and applied directly to Supabase via SQL Editor; production restored
- Rollback migration committed to git history for version control
- Lovable write access to the repo severed (no GitHub App or webhook found on the new org — clean break from the transfer)
- `CLAUDE.md` standing orders committed to repo root
- `SESSION_LOG.md` (this file) created and session protocol added to CLAUDE.md

**Blocked:**
- DNS cutover of `app.treadset.co` from Lovable to Vercel — waiting on GoDaddy credentials from BSG owner. Vercel expects a CNAME or A record (exact value to be confirmed once Vercel shows the configuration screen).

**Parked (not urgent, come back to these deliberately):**
- Rebuild the Jody Green feature (dispatcher can see all drivers in their org) using a `SECURITY DEFINER` helper function like `public.is_staff_in_org(org_id)` — this is the feature Lovable was trying to ship before it broke production. Pattern should mirror existing `public.user_has_role`.
- Add a CI guard (script or test) that scans `supabase/migrations/*.sql` for self-referential RLS policies and fails the build. Prevents re-occurrence of today's incident.
- Migrate `bsgtires.com` marketing site off Lovable (separate Lovable project, own repo, not touched today).
- Migrate the `treadset.co` landing page off Lovable (same situation).
- Consolidate 329+ migration files into a clean baseline before the next tenant onboards.
- Write RLS test suite: one test user per role (super_admin, dispatcher, driver, client) with positive/negative access assertions.
- Cancel Lovable subscription for TreadSet — do not do this until 24 hours of Vercel stability is confirmed.

**Next session first move:**
Run Exercise 1 — open Claude Code in this repo and ask it to produce a guided tour of the codebase: map of main features, key files and their roles (especially auth / RLS / routing / Supabase integration), patterns that are well-built, patterns that are sketchy, and a top-5 tech debt report. CLAUDE.md is now loaded, so the tour will be tenant-aware and incident-aware.
