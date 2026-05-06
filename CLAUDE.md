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
- **Migrations:** SQL files in `supabase/migrations/`, applied manually to Supabase via SQL Editor or migration tooling. They do not auto-apply from git.

---

## Operating Rules

### 1. Multi-tenancy is sacred

Every table that stores tenant data must have RLS enforcing tenant isolation. Before merging any schema change, confirm the table has RLS enabled AND a tenant-isolation policy, new queries respect tenant boundaries, and new edge functions validate the caller's tenant before returning data. One cross-tenant data leak and the product is dead. Non-negotiable.

### 2. RLS rules must never be self-referential

Lovable previously shipped policies where a table's USING clause queried the same table the policy was defined on. Postgres raises `infinite recursion detected in policy for relation ...` and the whole table becomes unreadable. This took TreadSet down in production on 2026-04-20.

The fix pattern: use `SECURITY DEFINER` helper functions (like `public.user_has_role`) to resolve role/org membership without re-entering RLS. Before writing a new policy with EXISTS or JOIN to another table, check: does the policy reference the same table it's defined on, directly or transitively? If yes, rewrite as a helper function.

### 3. Migration discipline

Name files `YYYYMMDDHHMMSS_description.sql`. Make migrations idempotent (`DROP POLICY IF EXISTS` before `CREATE POLICY`, `CREATE TABLE IF NOT EXISTS`, etc.). Include a comment header explaining what it does, why, and what it reverses. For RLS / auth / multi-tenant migrations: write the SQL, do not run it, hand to Z for manual Supabase paste.

### 4. Branching and main

Move fast — push to main if tests pass. BUT: anything touching RLS, auth, migrations, or multi-tenant boundaries — branch, open a PR, explain the diff, wait for Z. UI / copy / styling — push freely. If this change could lock a user out or leak another tenant's data, it doesn't go to main without review.

### 5. Tests run before commit

Run existing tests before every commit. If tests don't exist for the area being touched, write a basic one before shipping. For RLS changes: run the recursion-guard script (see tech debt) before committing any migration.

### 6. Never mix tenants in a single query

Scope every query by `organization_id` / `tenant_id` / `owner_id`. Never assume the logged-in user implies the tenant — explicitly filter. Cross-tenant aggregate views must run with `service_role` credentials and be clearly marked.

### 7. Don't rebuild what exists

Grep the repo first. Lovable shipped duplicate hooks, duplicate components, dead pages. If `useClients` exists, don't make `useClientsV2`. Extend the existing one.

### 8. Respect production

`app.treadset.co` and `treadset.vercel.app` are live production used by real dispatchers and drivers at BSG during business hours (Monday–Friday, ~7am–6pm ET). Ship risky changes after 6pm ET or on weekends, and tell Z before pushing.

---

## Session Protocol

### Every session STARTS with:

1. Read this file (CLAUDE.md) in full
2. Read **TREADSET_BRAIN.md** in full — that is the system map (routes, auth, edge functions, schema, manifest workflow, known issues). Loaded at session start so you don't have to discover the codebase from scratch.
3. Read SESSION_LOG.md and find the most recent entry
4. Use the most recent entry's "Next session first move" as your starting point unless Z overrides it
5. If TREADSET_BRAIN.md has a "Known Issues" item that is now relevant to Z's first prompt, surface it before answering.

### Every session ENDS with a Ship Report appended to SESSION_LOG.md.

Before declaring a session complete, Claude Code must:

1. Write a new dated entry at the TOP of SESSION_LOG.md (newest first) containing:
   - **Date** (YYYY-MM-DD) + one-line session title
   - **Shipped:** what actually got done
   - **Blocked:** what's waiting on Z, external parties, or information
   - **Parked:** ideas or scope that came up but intentionally didn't get built
   - **Next session first move:** one sentence, imperative
2. `git add CLAUDE.md SESSION_LOG.md` plus any other session changes
3. `git commit` with a clear message
4. `git push origin main` if the work belongs on main

If Z tries to end a session without a Ship Report, stop him. Say: "Before we close — Ship Report first." Vibes don't compound. Entries do.

If the session was exploration only, the entry is still required — it just says "No code changes. Exploration only: [what was explored]" and always closes with a "Next session first move."

---

## Known Tech Debt

1. Jody Green feature not shipped. Rebuild dispatcher-sees-drivers with a `SECURITY DEFINER` helper like `public.is_staff_in_org(org_id)`.
2. No RLS recursion guard in CI. Add a script that scans migrations for self-referential policies and fails the build.
3. 329+ migration files. Consolidate into a clean baseline before the next tenant onboards.
4. No automated RLS tests. Need test users per role with positive/negative access assertions.
5. `package-lock.json` was heavily rewritten by Lovable — verify it matches a clean `npm install`.

---

## Incident Log

- **2026-04-20** — Lovable migration `20260420150803_*.sql` introduced two self-referential RLS policies causing infinite recursion. Super admin, dispatcher, and driver all locked out. Rolled back via `20260420163000_rollback_broken_rls.sql`. Repo migrated same day from Lovable to Vercel under `BSG-Acquisitions`. Lovable write access severed.

---

## What You Don't Do

- Do not suggest Lovable
- Do not suggest hobbyist Claude Code plugin marketplaces
- Do not rebuild what already exists — grep first
- Do not write custom multi-tenant logic when Supabase RLS covers it
- Do not run migrations against production yourself — hand the SQL to Z
- Do not push migration files to main without Z reviewing the SQL
- Do not assume Z wrote something just because he shipped it — most of this code was Lovable-generated; be skeptical
