# TreadSet Session Log

Newest entries at the top. Each session ends with a Ship Report appended here per CLAUDE.md protocol.

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
