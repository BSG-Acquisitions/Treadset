# CLAUDE.md — TreadSet Standing Orders

**Read this first every session. No exceptions.**

---

## What TreadSet Is

TreadSet is a multi-tenant SaaS for tire recycling operations. **BSG Tire Recycling is the owner and the first tenant.** Additional companies are being onboarded. Every decision in this repo affects all tenants — not just BSG.

Live production URL: `app.treadset.co` (DNS cutover in progress; currently also on `treadset.vercel.app`).

**Who it serves, per tenant:**
- **Super admins** — company owners (Z for BSG). See everything, configure everything.
- **Dispatchers** — schedule pickups, assign drivers, route trucks, manage clients. (Justin at BSG.)
- **Drivers** — execute pickups from mobile, sign manifests, log tire counts.
- **Clients** — tire-generating businesses; usually don't log in, but their data is stored.

If you're making a change, ask yourself: *which of these four roles experiences this change, and does this change break any of them?* If you can't answer that, you haven't thought about it hard enough yet.

---

## Owner / Operator

Z (Zachariah Devon) is Chief of Sales at BSG and the product operator on this repo. He is not a career software engineer — he is a sales and ops mind who built real software. Communicate with that in mind:

- Explain what you did in plain English after technical work
- Call out trade-offs, not just decisions
- If you're about to do something destructive, irreversible, or cross-tenant, stop and confirm
- Don't dump questions — decide, explain, move

---

## Stack

- **Frontend:** Vite + React + TypeScript
- **Backend:** Supabase (Postgres + Auth + RLS + Edge Functions)
- **Hosting:** Vercel (deploys on push to `main`, auto-detected from GitHub)
- **Repo:** `github.com/BSG-Acquisitions/Treadset`
- **Domain registrar:** GoDaddy
- **Migrations:** SQL files in `supabase/migrations/`, applied manually to Supabase via SQL Editor or migration tooling. **They do not auto-apply from git.**

---

## Operating Rules

### 1. Multi-tenancy is sacred

Every table that stores tenant data must have RLS enforcing tenant isolation. Before merging any schema change, confirm:

- New table? It has RLS enabled AND a tenant-isolation policy.
- New query? It respects tenant boundaries (no cross-tenant leakage).
- New edge function? It validates the caller's tenant before returning data.

One cross-tenant data leak and the product is dead. Treat this as non-negotiable.

### 2. RLS rules must never be self-referential

Lovable previously shipped policies where a table's USING clause queried the same table the policy was defined on. Postgres raises `infinite recursion detected in policy for relation ...` and the whole table becomes unreadable for every role whose evaluation touches that branch. **This took TreadSet down in production on 2026-04-20.**

**The fix pattern:** use `SECURITY DEFINER` helper functions (like the existing `public.user_has_role`) to resolve role/org membership without re-entering RLS. See `supabase/migrations/20260420163000_rollback_broken_rls.sql` for the incident and `public.user_has_role` for the correct pattern.

Before you write a new policy with an EXISTS or JOIN to another table, check: does the policy reference the same table it's defined on, directly or transitively? If yes, rewrite it as a helper function.

### 3. Migration discipline

- Every migration file is named `YYYYMMDDHHMMSS_description.sql` (timestamp + snake_case description)
- Every migration must be **idempotent where possible** (`DROP POLICY IF EXISTS` before `CREATE POLICY`, `CREATE TABLE IF NOT EXISTS`, etc.)
- Every migration must include a comment header explaining: *what it does, why, and what it reverses or supersedes*
- For anything involving RLS, auth, or multi-tenant data: write the SQL, **do not run it**, hand it to Z to paste into Supabase SQL Editor. Running migrations is Z's manual step.

### 4. Branching and main

Move fast — push to `main` if tests pass. But:

- **Anything touching RLS, auth, migrations, or multi-tenant boundaries** — branch, open a PR, explain the diff, wait for Z.
- **UI / copy / styling changes** — push to main freely.
- **New features that affect dispatcher or driver workflows** — branch, show Z the plan before building.

The rule of thumb: *if this change could lock a user out or leak another tenant's data, it doesn't go to main without review.*

### 5. Tests run before commit

Run the existing test suite before every commit. If tests don't exist for the area you're touching, write a basic one before shipping the change. "No tests here yet" is not an excuse to skip — it's a prompt to add the first one.

For RLS changes specifically: there's a script (or should be — see tech debt below) that scans migrations for self-referential policies. Run it before committing any migration.

### 6. Never mix tenants in a single query

When writing queries, edge functions, or reports:

- Scope by `organization_id` / `tenant_id` / `owner_id` in every query
- Never assume the logged-in user implies the tenant — explicitly filter
- Cross-tenant aggregate views (e.g., platform-wide stats) must be marked clearly and run with `service_role` credentials, never with user credentials

### 7. Don't rebuild what exists

Before writing anything new, grep the repo. Z has been burned by Lovable shipping duplicate hooks, duplicate components, and dead pages. If there's already a `useClients` hook, don't make `useClientsV2`. Extend the existing one.

### 8. Respect production

- `app.treadset.co` and `treadset.vercel.app` are live production used by real dispatchers and drivers at BSG during business hours (Monday–Friday, ~7am–6pm ET)
- Pushing a broken build at 10am on a Tuesday stops real tire pickups from happening
- If a change is risky, ship it after 6pm ET or on weekends, and tell Z before pushing

---

## Known Tech Debt (Tackle Deliberately, Not All at Once)

1. **Jody Green feature not shipped.** Dispatchers currently cannot see all drivers in their org. Lovable tried to build this with self-referential RLS and broke production. Rebuild with a `SECURITY DEFINER` helper function like `public.is_staff_in_org(org_id)`. See rollback migration for context.
2. **No RLS recursion guard in CI.** Should add a script that scans `supabase/migrations/*.sql` for self-referential policies and fails the build if found. Prevents re-occurrence of the 2026-04-20 incident.
3. **329+ migration files.** Many are incremental Lovable "Changes" commits with no description. Consolidating into a clean baseline should happen before the next tenant onboards.
4. **No automated tests against RLS.** There should be test users per role (super_admin, dispatcher, driver, client) and a test suite that confirms each can/cannot access expected rows.
5. **`package-lock.json` was heavily rewritten by Lovable.** Verify it matches a clean `npm install` and doesn't carry ghost dependencies.

---

## Incident Log

- **2026-04-20** — Lovable-pushed migration `20260420150803_*.sql` introduced two self-referential RLS policies causing infinite recursion. Super admin, dispatcher, and driver all locked out of multiple pages. Rolled back via `20260420163000_rollback_broken_rls.sql` applied directly to Supabase. Repo migrated same day from Lovable to Vercel under `BSG-Acquisitions` GitHub org. Lovable write access severed.

---

## What You Don't Do

- Do not suggest Lovable
- Do not suggest hobbyist Claude Code plugin marketplaces
- Do not rebuild what already exists — grep first
- Do not write custom multi-tenant logic when Supabase RLS covers it
- Do not run migrations against production yourself — hand the SQL to Z
- Do not push migration files to main without Z reviewing the SQL
- Do not assume Z wrote something just because he shipped it — most of this code was Lovable-generated; be skeptical of patterns you see
