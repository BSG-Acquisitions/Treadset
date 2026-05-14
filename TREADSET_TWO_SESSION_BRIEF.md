# TREADSET TWO-SESSION COLLABORATION BRIEF

**Drafted by Session A (Architect), 2026-05-13. For Session B (Builder) to read first.**

> **Correction 2026-05-13:** This brief inherited a stale "Denver booth ≈ 2026-05-27" framing from `TREADSET_AI_NATIVE_ROADMAP.md`. The booth is **complete** (wrapped on or before 2026-05-12). Read every "pre-Denver" reference as "week 1." Read the week-3 "Denver booth + freeze" row as "buffer week for booth retro + follow-ups." §10 (the Tready demo onboarding script) is now framed as a **post-booth sales-call demo + customer onboarding tour**, not a booth piece. Pacing is thoughtful, not sprint.

---

## 0. The deal in one paragraph

Z (founder of TreadSet) wants two Claude Code sessions working in parallel to take TreadSet from "static SaaS" to "AI-native SaaS with Tready, Stripe, and QuickBooks built in" — without breaking BSG's live production, without crashing into each other, and with a demoable result he can stand behind at the Denver tire conference (~2026-05-27) and onboard tenant #3 cleanly afterward. The mission is complete only when both sessions have delivered working features that have been (1) unit-tested, (2) ghost-tested in the TreadSet Demo tenant, (3) accepted by Z in real testing, and (4) shipped to production behind a feature flag. Fix dead code as you go. Improve security as needed. Don't ask permission to do the boring right thing.

---

## 1. Who I am (Session A — Architect)

I am the same model class as you — Claude Opus 4.7 (1M context), running in a Claude Code CLI session, with the same memory store at `/Users/zachariahdevon/.claude/projects/-Users-zachariahdevon/memory/`. Read `MEMORY.md` there first; it auto-loads in your context too.

**My role going forward = Architect / Backend.**

I own the things that wire the system together but are mostly invisible to a demo: data integrity, multi-tenant safety, payments + accounting integrations, durable workflows, edge-function plumbing, cron/scheduler, security, and the dead-code purges.

**Your role = Builder / Tready.**

You own the visible product: Tready V1 (the AI ops copilot), the data-tready-id pass across the app, the highlight overlay component, the demo onboarding walkthrough, the chat UI, the eval harness, the demo tenant polish. The thing Z stands in front of at the booth — that's yours.

Neither of us touches BSG production directly. Everything ships behind feature flags. Demo tenant (`organization_id = de300000-0000-4000-8000-000000000001`, slug `demo`, login `demo@treadset.com` / `DenverBooth-May13-9k2x`) is the proving ground.

---

## 2. What I have already done in this chat

This session ran the discovery phase. Concretely:

1. Read `CLAUDE.md`, `TREADSET_BRAIN.md`, the Tready V1→V4 architecture memory, the data model at `/tmp/treadset-tready-data-model.sql`, the global-tables-seeding feedback, and the demo-org memory.
2. Spawned **4 parallel Explore agents** to inventory the existing automation surface:
   - Agent A — every edge function (~79 of them)
   - Agent B — every migration / Postgres function / trigger / pg_cron job
   - Agent C — client-side hooks for compute hotspots + orchestration risks
   - Agent D — every AI / webhook / scheduler reference in the repo
3. Spawned **3 parallel general-purpose research agents**:
   - Agent E — durable workflow runner pick (n8n / WDK / Inngest / Trigger.dev / pg_cron)
   - Agent F — MCP server ROI ranking
   - Agent G — agentic framework pick (Vercel AI SDK / Mastra / LangGraph / OpenAI Agents / etc.)
4. Synthesized via a Plan agent into a 90-day week-by-week build sequence.
5. Wrote `TREADSET_AI_NATIVE_ROADMAP.md` (~580 lines) to the repo root. **Read it before this brief.** It is the master plan.
6. Z then added two new mandatory requirements:
   - **Stripe Connect integration out of the box** (every tenant connects their own Stripe to bill their own clients)
   - **QuickBooks Online integration out of the box** (every tenant syncs invoices/payments to their own QBO)

Both are now non-negotiable scope items.

---

## 3. The decided architecture (don't redesign — defend or override)

- **Tready framework**: Vercel AI SDK v6, runs in a Supabase Edge Function at `supabase/functions/tready/index.ts`, Sonnet 4.6 main + Haiku 4.5 for nav/highlight, two Anthropic prompt-cache breakpoints (static persona, UI-map slice). Tool-factory pattern: every Tready call constructs tools per-request that close over `organization_id` derived from the JWT. Model cannot override.
- **Durable workflow runner**: Vercel Workflow DevKit (WDK). pg_cron stays as the free trigger. Inngest deferred.
- **Multi-tenant guard helper**: `startTenantWorkflow(tenantId, fn, input)` + ESLint rule banning raw `start()`. RLS as backstop. Same discipline for Tready tool factory.
- **AI provider migration**: Google Gemini (Lovable gateway) → Anthropic Claude in two waves. Tready endpoint first (week 2), the other 5 Gemini functions later (week 10).
- **No MCP inside Tready** — only native Claude tool-use. MCP is for Z's operator session only. Especially: **NEVER wire Supabase MCP into Tready** — it runs as service-role and bypasses RLS.
- **Memory tool**: Anthropic Memory primitive (not MCP), filesystem mounted to org-scoped Supabase storage path keyed by `organization_id/user_id`. For V2+.
- **Stripe integration model**: Stripe Connect (Standard accounts) — each TreadSet tenant connects their own Stripe account; TreadSet does not hold the funds. Webhook receiver with HMAC signature verification → WDK durable workflow → updates invoice + (if connected) pushes payment status to QuickBooks.
- **QuickBooks integration model**: Intuit OAuth 2.0 per-tenant. TreadSet stores per-tenant refresh tokens (encrypted). Sync direction: TreadSet → QBO is primary (we push invoices + payments). QBO → TreadSet is read-only mirror (customer + item lists for reference). Refresh tokens rotate via QBO API; durable workflow handles re-auth prompts to tenant admins.

---

## 4. The top findings, ranked (read these before touching code)

### Tier 1 — silent ship-stoppers
1. No Stripe webhook receiver — payment failures undetected, no reconciliation. **Building this is Session A's first big task.**
2. 5 hardcoded `slug='bsg'` edge functions block tenant #3 onboarding: `create-payment`, `public-booking`, `public-stats`, `resend-corrected-outreach`, `send-weekly-pickup-reminders`. Plus helper defaults in `user_has_role()` and `get_current_user_organization()`. **Session A fixes these in week 1.**
3. Zero error tracking. Sentry MCP install + Sentry SDK in every edge function and the frontend. **Session A wires the backend, Session B wires the frontend Tready surface.**
4. Resend webhook has no HMAC signature verification. Trivial fix, no excuse. **Session A.**

### Tier 2 — multi-tenant smells (one bad query from a leak)
5. Five hooks rely on RLS-only protection: `useClientWorkflows`, `useDataQualityFlags`, `useOperationalMetrics`, `useDriverWeeklyAssignments` (kill the `driver_email ilike` cross-org lookup), and the `markAsReviewed` mutation. **Session B fixes during the UI work, with Session A reviewing the org-filter pattern.**
6. Three orphan-risk mutation pipelines: `useGenerateDropoffManifest` (5-step, PDF gen failure orphans manifest), `useUpdateAssignmentStatus` (workflow upsert silently fails), `useSchedulePickupWithDriver` (no rollback). **Session A wraps these in atomic RPCs or edge functions.**

### Tier 3 — architecture commitments
7. Vercel AI SDK v6 + tool-factory pattern for Tready. **Session B builds.**
8. Vercel Workflow DevKit + `startTenantWorkflow` helper. **Session A installs and writes the helper; both sessions use it.**
9. AI provider migration Gemini → Anthropic. **Session A migrates non-Tready functions; Session B builds Tready on Anthropic directly.**

### Tier 4 — cleanup that compounds
10. `generate-ai-insights` is already Tready-shaped — extend, don't rebuild. **Session B reuses its harness when V2 lands.**
11. 28 orphan edge functions, no callers in `src/`. **Session A's audit + delete pass.**
12. Duplicate clusters: 4-5 route optimizers, 3 PDF generators, 19 email senders. **Session A consolidates.**
13. Client-side compute hotspots (`useRawMaterialProjections`, `useManifestHealthScan`, `useDashboardData`, `useDriverWeeklyAssignments` 10sec polling). **Session A moves to materialized views / RPCs.**
14. **The V3 curator loop is the moat.** Every email Z writes to a stuck user becomes permanent automation. **Session A builds the curator workflow; Session B builds the KB-draft review UI.**

Full details: `TREADSET_AI_NATIVE_ROADMAP.md` sections 2-4.

---

## 5. File ownership map — never crash

The rule: if a file isn't in your column, you don't edit it. If you need a change in the other session's territory, write a request to `SESSION_INBOX.md` (see §7) and keep moving on something else.

### Session A (Architect — me) owns

```
supabase/migrations/**                          (ALL new migrations)
supabase/functions/_shared/**                   (shared utilities)
supabase/functions/stripe-webhook/**            (NEW)
supabase/functions/stripe-connect-*/**          (NEW)
supabase/functions/quickbooks-*/**              (NEW)
supabase/functions/tready-curator-*/**          (NEW — V3 only)
supabase/functions/resend-webhook/**            (HMAC fix)
supabase/functions/create-payment/**            (slug fix)
supabase/functions/public-booking/**            (slug fix)
supabase/functions/public-stats/**              (slug fix)
supabase/functions/resend-corrected-outreach/** (slug fix)
supabase/functions/send-weekly-pickup-reminders/** (slug fix)
supabase/functions/ai-assistant/**              (Gemini→Anthropic wave 2)
supabase/functions/ai-route-optimizer/**        (Gemini→Anthropic wave 2)
supabase/functions/driver-route-suggestions/**  (Gemini→Anthropic wave 2)
supabase/functions/generate-ai-insights/**      (Gemini→Anthropic wave 2)
supabase/functions/suggest-nearby-clients/**    (Gemini→Anthropic wave 2)
supabase/functions/[28 orphan functions]/**     (audit + delete)
supabase/functions/[route-optimizer-cluster]/** (consolidate)
supabase/functions/[pdf-generator-cluster]/**   (consolidate)
supabase/functions/[email-sender-cluster]/**    (consolidate)
src/lib/workflows/**                            (NEW — startTenantWorkflow helper)
src/lib/integrations/stripe/**                  (NEW — Stripe client)
src/lib/integrations/quickbooks/**              (NEW — QBO client)
src/hooks/useGenerateDropoffManifest.ts         (atomic wrapper)
src/hooks/useUpdateAssignmentStatus.ts          (rollback path)
src/hooks/useSchedulePickupWithDriver.ts        (RPC wrap)
vercel.json                                     (WDK config)
.eslintrc                                       (new tenant-safety rules)
```

### Session B (Builder — you) owns

```
supabase/functions/tready/**                    (NEW — main Tready endpoint)
supabase/functions/tready-embedding/**          (NEW — embedding pipeline)
supabase/functions/tready-walkthrough/**        (NEW — walkthrough state)
src/components/tready/**                        (NEW — all Tready UI)
src/components/tready/TreadyBubble.tsx          (NEW)
src/components/tready/TreadyChat.tsx            (NEW)
src/components/tready/HighlightOverlay.tsx      (NEW)
src/components/tready/WalkthroughPlayer.tsx     (NEW)
src/components/tready/KBDraftReview.tsx         (NEW — for V3 curator)
src/components/onboarding/**                    (NEW — demo onboarding tour)
src/hooks/useTready.ts                          (NEW)
src/hooks/useTreadyStream.ts                    (NEW)
src/hooks/useWalkthrough.ts                     (NEW)
src/lib/tready/**                               (NEW — client SDK + types)
src/lib/eval/**                                 (NEW — eval harness for Tready)
[every src/ file that needs data-tready-id="..."] (additive only — never refactor logic in these files)
src/hooks/useClientWorkflows.ts                 (add orgId filter)
src/hooks/useDataQualityFlags.ts                (add orgId filter)
src/hooks/useOperationalMetrics.ts              (add orgId filter)
src/hooks/useDriverWeeklyAssignments.ts         (orgId join, kill ilike)
```

### Shared / read-only for both

```
CLAUDE.md
TREADSET_BRAIN.md
TREADSET_AI_NATIVE_ROADMAP.md
TREADSET_TWO_SESSION_BRIEF.md  (this file — both can append to §7 inbox)
SESSION_LOG.md                  (both append, newest at top, prefix entries with [A] or [B])
SESSION_INBOX.md                (NEW — async messaging between sessions, see §7)
package.json                    (coordinate before touching — write to inbox first)
src/App.tsx                     (Session B owns Tready routes; Session A owns integration routes; coordinate before touching)
src/contexts/AuthContext.tsx    (Session A owns; Session B reads only)
```

### Hard rule

If the file isn't in your column and isn't shared, **you do not edit it**. Open `SESSION_INBOX.md` and write a request. The other session reads the inbox at the start of every work block.

---

## 6. Quality gates — same for both sessions, no exceptions

Z's rollout pipeline, in his words: **"build → tested → ghost tested in demo mode → brought back to me for actual testing → sent to production."**

For every feature either of us ships:

### Gate 1 — Build complete
- Code written, types pass, no lint errors
- All new code paths have at least one happy-path test
- If the feature touches money or PII, two tests minimum (happy path + tenant isolation)
- New SQL goes in a migration file with the `YYYYMMDDHHMMSS_description.sql` convention (per `CLAUDE.md`). **Never apply migrations yourself.** Hand SQL to Z for manual paste.

### Gate 2 — Ghost test on demo tenant
- Feature flag defaults OFF in BSG, ON in TreadSet Demo
- Run the full user flow as `demo@treadset.com` end-to-end
- Verify no cross-tenant data leak: switch to a fake second demo user, confirm scoping holds
- Log everything to Sentry; zero unhandled exceptions
- Take a screenshot or recording for Z's review packet

### Gate 3 — Z's real test
- Append to `SESSION_LOG.md` with: what was built, where to test it, what to look for, expected behavior, known limitations
- Wait for Z's explicit acceptance before proceeding to Gate 4
- His acceptance pattern: a commit or comment containing the phrase `"approved for prod"` or `"ship it"`

### Gate 4 — Production rollout
- Merge to `main` (auto-deploys to Vercel)
- Flag still gated: turn on for Z's user first, observe 24h, then widen
- Append Ship Report entry to `SESSION_LOG.md` per `CLAUDE.md` rule
- Sentry alerts wired before flipping the flag

**A feature that hasn't passed all four gates is not done.** No exceptions. No "just this once."

---

## 7. Coordination protocol — how we don't crash

### `SESSION_INBOX.md` (you'll create this if it doesn't exist)

Plain markdown, newest entries at the top, format:

```markdown
## [B → A] 2026-05-14 09:32 — Need typed RPC: get_tenant_dashboard_stats
**Context**: Tready dashboard tool needs aggregated stats for the active tenant.
**Ask**: Build an RPC `get_tenant_dashboard_stats(p_org_id uuid)` returning {today_pte, week_pte, active_pickups, missed_pickups}. Org-scoped, SECURITY DEFINER, must validate `auth.uid()` membership.
**Blocking**: yes / no
**By when**: end of week 2
**Status**: open
```

Mark `Status: resolved` when delivered. Don't delete — leave the audit trail.

### Git branch convention

- Session A works on branches prefixed `arch/` (e.g., `arch/stripe-webhook`, `arch/slug-fix`)
- Session B works on branches prefixed `tready/` (e.g., `tready/v1-endpoint`, `tready/walkthrough-engine`)
- Both branch from `main`. Both rebase before merging.
- Never push to the other session's branches.
- Before merging: pull `main`, re-run tests, check `SESSION_INBOX.md` for unresolved blockers.

### Daily sync via `SESSION_LOG.md`

Each session, at the end of every work block:

```markdown
## 2026-05-14 [A] Stripe webhook receiver scaffolded
**Shipped**: New edge fn `supabase/functions/stripe-webhook/index.ts` with HMAC verification. Migration `20260514150000_stripe_events.sql` ready for Z to paste. Tests pass.
**Blocked**: Need Z to create Stripe webhook endpoint in dashboard and provide signing secret as `STRIPE_WEBHOOK_SECRET` env var.
**Parked**: QBO integration starts after Stripe webhook is accepted.
**Next session first move**: Wait on Z's Stripe secret; meanwhile start on the 5 hardcoded `bsg` slug fixes.
```

Always read the other session's most recent entry before starting work. If their "Next session first move" implies they're in a file you also planned to touch, **stop and write to the inbox** — don't gamble on the merge.

### Conflict resolution

If both sessions edited the same file unintentionally (it will happen once):
1. Whichever session merges to `main` second is responsible for the merge.
2. If the merge is non-trivial (semantic conflict, not whitespace), **stop and escalate to Z** in `SESSION_INBOX.md`. Do not guess.
3. Update the file ownership map in §5 to prevent the recurrence.

---

## 8. Phase plan — both sessions, week by week

Calendar: week 1 = 2026-05-13. Denver booth ≈ 2026-05-27. Week 13 ≈ 2026-08-12.

| Wk | Session A (Architect / Backend) | Session B (Builder / Tready) | Joint milestone |
|----|--------------------------------|------------------------------|-----------------|
| 1 (05-13→05-19) | Fix 5 hardcoded `'bsg'` slugs (one PR per function). HMAC-sign Resend webhook. Audit + verify TreadSet Demo seed. Install Sentry SDK in the Tready edge fn scaffold. | Scaffold `supabase/functions/tready/index.ts` (skeleton only — Anthropic SDK wired, no tools yet). Create `tready_ui_map` + `tready_conversations` migrations (hand SQL to Z). Tag the top 80 demo-path elements with `data-tready-id`. | Demo tenant boots, no BSG bleed. Tready edge fn responds with a static "hello, I'm Tready" message. |
| 2 (05-20→05-26) | Provision Tready feature flag (per-user + per-org). Build `TreadyBubble` mounting logic in `App.tsx` (Session B will own the component). Booth-resilience offline cache scaffold (server side). | Tready tool factory + 6 read-only tools: `get_tenant_dashboard_stats`, `list_pickups_today`, `get_manifest_status`, `highlight_ui`, `navigate_to`, `escalate_to_human`. Write the 10 scripted booth Q&A as eval cases. Build `TreadyChat` UI. Build `HighlightOverlay` component. | **Dress rehearsal Fri 05-22**. Z runs the 10 scripted Qs on demo tenant. All 10 pass. |
| 3 (05-27→06-02) | **Denver booth. BSG code freeze.** Triage any prod bug only. Log booth conversations to seed the V3 curator corpus. | **Denver booth.** Sit beside Z if he needs Tready tweaks on the floor. Otherwise: log conversations, take notes on what booth visitors actually asked. | Booth survived. Conversation corpus captured. |
| 4 (06-03→06-09) | **Stripe webhook receiver as the first WDK durable workflow** (reference pattern for everything). Install WDK + `startTenantWorkflow` helper + ESLint rule. Migration: `stripe_events` table with idempotency key + `stripe_connect_accounts` table. | Tready V1 hardening from booth lessons. Build escalation-to-email path (calls Session A's `send-escalation` edge fn). Walkthrough player MVP — 1 walkthrough end-to-end: "Add your first client." | Stripe webhook receives + acknowledges events idempotently. First Tready walkthrough plays on demo. |
| 5 (06-10→06-16) | **Stripe Connect onboarding flow** — `connect/onboard` edge fn + `connect/refresh` for re-onboarding. UI integration goes to Session B. Add orgId filters to the 5 tenant-safety hook smells (Session B does the React side; Session A reviews the pattern). | Build the `Settings → Integrations → Stripe` UI (call into Session A's connect onboarding fn). Build 2 more walkthroughs: "Schedule a pickup", "Complete your first manifest". | Demo tenant can connect a test Stripe account end-to-end. 3 walkthroughs playable. |
| 6 (06-17→06-23) | **QuickBooks Online: OAuth + token storage** — `quickbooks/connect` + `quickbooks/refresh` edge fns. Migration: `quickbooks_connections` table with encrypted refresh tokens. First sync: TreadSet client → QBO customer. | Build the `Settings → Integrations → QuickBooks` UI. Build "Tready teaches you how to connect QuickBooks" walkthrough (this is the killer onboarding demo for Denver follow-ups). | Demo tenant can connect QBO and see one client sync over. |
| 7 (06-24→06-30) | **QBO invoice + payment sync** — when a TreadSet invoice marks paid (Stripe webhook), push to QBO. When Stripe charge fails, mark invoice past_due in QBO. Migrate `manifest-followup-automation` pg_cron → WDK. | Tready V2 scaffold: `tready_kb` table + RAG `search_kb` tool. Seed 30 state-compliance facts (CA, TX, FL first). Add pgvector extension migration request. | Pay an invoice in demo → see it sync to QBO. Tready cites a compliance fact in an answer. |
| 8 (07-01→07-07) | Wrap the 3 orphan-risk mutation pipelines in atomic RPCs (`useGenerateDropoffManifest`, `useUpdateAssignmentStatus`, `useSchedulePickupWithDriver`). Migrate `analyze-pickup-patterns` + `check-missing-pickups` pg_crons → WDK. | Tready V2 hardening — KB freshness UI, source citation in responses, "stale fact" flagging. Build 2 more walkthroughs: "Sign a receiver manifest", "Pull a state compliance report". | Manifest creation no longer orphans on PDF failure. 5 walkthroughs playable. |
| 9 (07-08→07-14) | Consolidate 4-5 route optimizers → 1. Consolidate 3 PDF generators → 1. Delete the 28 orphan edge functions (one audit PR). | `tready_user_memory` + `tready_org_memory` tables. Wire Anthropic Memory Tool primitive to org-scoped Supabase storage. Build the KB Draft Review UI for the curator queue. | Edge function count drops ~30%. Tready remembers per-user preferences across sessions. |
| 10 (07-15→07-21) | Migrate remaining 5 Gemini functions → Anthropic. Retire `LOVABLE_API_KEY`. Migrate `data-quality-scan` pg_cron → WDK (last one). | Tready V3 curator workflow live in dry-run mode (Session A's `tready-curator-nightly` WDK workflow writes drafts; Session B's review UI shows them). | Single AI provider. Curator proposes ~3 KB drafts overnight on the booth corpus. |
| 11 (07-22→07-28) | Tenant onboarding playbook — scripted org #3 creation in <30 min. Per-tenant Stripe + QBO setup automated. | V3 escalation Z-reply parsing → memory update. Close the human-feedback loop. Curator goes from dry-run to write-mode for `tready_user_memory` (not KB yet). | Onboard a fake "TestCorp" tenant end-to-end in <30 min as a rehearsal for real org #3. |
| 12 (07-29→08-04) | Edge function final audit: target <50 functions (from 79). Per-tenant cost dashboard ($/mo Anthropic + Stripe + QBO + WDK + storage). | Tready V3 GA on BSG (flag-gated rollout). Confidence scoring visible in UI. Per-org memory visible to admins. | Sub-$5/tenant/mo verified. Two real BSG users (Z + Justin) on Tready daily. |
| 13 (08-05→08-12) | V4 groundwork — cross-tenant anonymized aggregation schema. Privacy review. | V4 spike — one cross-tenant insight query ("how does our pickup-miss rate compare to industry?"), read-only, opt-in per org. | Working V4 demo on Demo + BSG combined. |

---

## 9. Stripe + QuickBooks specifics — what "out of the box" means

### Stripe Connect (Standard accounts)

**Goal**: a new TreadSet tenant clicks "Connect Stripe" in Settings, OAuths into Stripe, and from that moment forward TreadSet creates Charges on behalf of the tenant's connected account. TreadSet does NOT hold funds. Tenants control their own Stripe dashboard, refunds, disputes.

**Why Standard not Express**: Express requires TreadSet to take ownership of the user's Stripe relationship (KYC liability). Standard lets the tenant own their Stripe; TreadSet just rides on top. Lower legal risk, faster to ship.

**Required schema** (Session A migration):
```sql
CREATE TABLE public.stripe_connect_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('pending','active','disabled','restricted')),
  details_submitted boolean NOT NULL DEFAULT false,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  default_currency text DEFAULT 'usd',
  connected_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  metadata jsonb
);

CREATE TABLE public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,    -- idempotency key
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now()
);
```

**Edge functions Session A builds**:
- `stripe-connect-onboard` — generates Stripe Connect OAuth URL, returns it to the client
- `stripe-connect-callback` — handles the OAuth return, stores `stripe_account_id`
- `stripe-connect-refresh` — re-onboards a restricted account
- `stripe-webhook` — receives all Stripe events with HMAC verification, starts a WDK workflow per event
- WDK workflow `stripeEventWorkflow(orgId, stripeEventId, type)` — idempotency check, mutate invoice, push payment to QBO if connected, notify user

**UI Session B builds**: `Settings → Integrations → Stripe` panel with Connect/Disconnect buttons + status pills + recent events log.

### QuickBooks Online (Intuit OAuth 2.0)

**Goal**: a new tenant clicks "Connect QuickBooks", OAuths into their QBO company, and from that moment TreadSet pushes every paid invoice to QBO and pulls customer/item lists for reference. Re-auth prompts when refresh token expires (every 100 days for QBO).

**Required schema**:
```sql
CREATE TABLE public.quickbooks_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  realm_id text NOT NULL,                              -- QBO company id
  access_token_encrypted text NOT NULL,                -- short-lived (~1 hour)
  refresh_token_encrypted text NOT NULL,               -- 100-day lifespan
  access_token_expires_at timestamptz NOT NULL,
  refresh_token_expires_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('active','expired','revoked','error')),
  last_synced_at timestamptz,
  last_error text,
  connected_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quickbooks_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,                            -- 'invoice','payment','customer','item'
  treadset_entity_id uuid NOT NULL,
  qbo_entity_id text,
  direction text NOT NULL CHECK (direction IN ('to_qbo','from_qbo')),
  status text NOT NULL CHECK (status IN ('pending','success','failed','skipped')),
  error_message text,
  payload_snapshot jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);
```

**Encryption**: use Supabase Vault (or pgsodium if Vault isn't available) for `access_token_encrypted` / `refresh_token_encrypted`. Never store plaintext. The encryption key is a Supabase secret; the edge function decrypts at use-time only.

**Edge functions Session A builds**:
- `quickbooks-connect` — generates Intuit OAuth URL
- `quickbooks-callback` — exchanges code for tokens, stores encrypted
- `quickbooks-refresh-token` — refreshes the access token (called automatically before sync)
- `quickbooks-sync-invoice` — pushes one invoice to QBO
- `quickbooks-sync-payment` — marks one payment in QBO
- WDK workflow `qboInvoiceSync(orgId, invoiceId)` — refresh token if needed → push invoice → log result
- Cron: nightly `quickbooks-token-rotation-check` — alert tenants whose refresh token expires in <14 days

**UI Session B builds**: `Settings → Integrations → QuickBooks` panel with Connect/Disconnect + sync status + recent sync log + manual "sync now" button.

**Tready demo angle (the killer)**: when a demo-tenant visitor clicks "Connect QuickBooks", Tready walks them through it with the highlight overlay: "Click this button → enter your QuickBooks company → approve → done. Your TreadSet invoices will now appear in QuickBooks automatically." That's the booth-follow-up demo Z needs after Denver.

---

## 10. The Tready demo onboarding script — what Z must be able to show

This is the contract for "done" on the demo side. The flow Z stands behind:

1. **Sign-in screen** → Z logs in as `demo@treadset.com` → lands on dashboard.
2. **First-time Tready greeting**: bubble pops up bottom-right. "Hi, I'm Tready. I'll show you around in 2 minutes. Ready?" [Yes / Not now]
3. **Tour Step 1 — Dashboard**: Tready highlights the PTE total widget. "This is your daily tire-equivalent count. It updates live as your drivers complete pickups."
4. **Tour Step 2 — Add a client**: Tready highlights the sidebar "Clients" link. "Click here to add your first client." Waits for click. On the Clients page, highlights "Add Client" button. User adds one. Tready: "Nice. Want me to walk through scheduling their first pickup?"
5. **Tour Step 3 — Schedule a pickup**: Tready highlights the calendar widget, fills in fields with hints. User confirms. Tready: "Done. Your driver will see this on their mobile app tomorrow morning."
6. **Tour Step 4 — Sign a manifest**: Tready navigates to a pre-staged in-progress manifest. Walks through the signature step. "This is the official tire-transport document. Your state requires it."
7. **Tour Step 5 — Connect Stripe**: Tready highlights "Settings → Integrations → Stripe". Walks through the Connect flow on a test account. "Now you can bill clients automatically when manifests complete."
8. **Tour Step 6 — Connect QuickBooks**: Same as Stripe but for QBO. "Every payment Stripe collects will sync to QuickBooks. No double entry."
9. **Tour Step 7 — Ask Tready anything**: Tready demos itself answering 3 scripted Qs ("What's my PTE today?" / "Am I compliant with EGLE?" / "Show me my top 5 clients by revenue"). All from booth-corpus.
10. **End**: "That's the tour. I'll be here whenever you have a question. If I can't answer, I'll loop in Z."

The whole thing should take ≤4 minutes. Every step uses real demo-tenant data. Every step is scripted (we know exactly what Tready says + which elements highlight) but the *responses to free-form questions* are real Claude calls.

**This is the demo Z stands behind. If you can't show this end-to-end in the demo tenant by week 6, we have failed.**

---

## 11. Security improvements (both sessions, as you go)

Things to fix when you see them in your scope — don't make a separate ticket:

- Any edge function using `service_role` without validating the JWT first → either add JWT validation or change to anon-key
- Any `.eq('slug', ...)` or `.eq('organization_id', ...)` with a hardcoded value → fail loud or accept as param
- Any cross-table query that joins through a non-org-scoped table → flag in `SESSION_INBOX.md`, do not silently fix without coordination
- Any new table that holds tenant data without `organization_id` → must have it, with RLS, before merging
- Any new secret committed to the repo → revert immediately, rotate the secret, leave a note in `SESSION_LOG.md`
- Any new external API key → goes in Supabase secrets / Vercel env vars, never in code
- Any new webhook endpoint → must verify signature before processing payload

---

## 12. Dead code purge rules

When you encounter clearly-dead code in your scope:

- Function/component not imported anywhere AND last commit >90 days ago → delete it
- Migration file that was rolled back (rollback file exists) AND >30 days old → leave it (audit trail)
- Edge function with no callers in `src/` AND no cron trigger AND >60 days old → propose for deletion in `SESSION_INBOX.md`, delete after the other session acknowledges
- Commented-out code blocks → delete
- Console.logs in production paths → delete unless they're behind a debug flag

When in doubt, keep it and flag in inbox. The cost of accidentally deleting working code >> cost of carrying a dead file for another week.

---

## 13. When to ask Z

- **Schema decisions that touch billing or compliance**: ask. Wrong schema = expensive backfill.
- **Anything that could lock a user out** (auth changes, RLS changes, role changes): ask.
- **Anything that touches cross-tenant aggregation**: ask. Privacy.
- **Stripe Connect mode (Standard vs Express)**: this brief picks Standard. If you have a strong reason to swap, ask before building.
- **Hosting decision for Tready (Supabase Edge vs Vercel Function)**: this brief picks Supabase Edge. If you hit a hard limit, ask before moving.
- **Cost decisions >$50/mo**: ask. He's running lean.
- **Anything that smells like "should I be cautious here?"**: ask. He'd rather a quick check than a quick mess.

When you ask, do it in `SESSION_INBOX.md` with the prefix `[? Z]` so he can grep for them.

---

## 14. Definition of done — the whole mission

Mission complete when ALL of these are true:

- [ ] **Tready demo onboarding tour (§10) plays end-to-end on demo tenant**, all 10 steps, no manual intervention
- [ ] **Z can demonstrate it live without code-side support** (he's solo on a sales call)
- [ ] **Stripe Connect**: a fresh demo-tenant can OAuth into Stripe and see test charges flow through invoices → QBO
- [ ] **QuickBooks**: a fresh demo-tenant can OAuth into QBO and see one invoice sync over
- [ ] **Zero hardcoded `slug='bsg'`** anywhere in `supabase/functions/**`
- [ ] **Zero unsigned webhooks** (Resend + Stripe both HMAC-verified)
- [ ] **Zero cross-tenant smells** in the 5 hooks identified in §4 tier 2
- [ ] **All 28 orphan edge functions** either deleted or wired to a known caller
- [ ] **Sentry catching errors** in both backend (edge functions) and frontend (Tready surface)
- [ ] **Per-tenant cost dashboard** shows BSG and Demo separately, with $/mo
- [ ] **Eval harness** running nightly, 50 golden questions, >85% pass rate
- [ ] **Tenant #3 onboarded** in <30min using the playbook (real or rehearsal counts)
- [ ] **`SESSION_LOG.md`** has a "Mission Complete" entry signed off by Z

Anything short of this is not done. Push back if pressure mounts to ship at <100%.

---

## 15. First moves — read this then go

### Session A (me — Architect) next:
1. Write this brief (done).
2. Wait for Z's go-ahead on the brief itself.
3. On go-ahead: spawn agents to draft the migration + edge function for fixing the 5 hardcoded `'bsg'` slugs (week 1 task). Hand SQL to Z for manual paste.
4. Then HMAC-sign the Resend webhook (week 1).
5. Then start the Stripe webhook receiver as the first WDK reference workflow (week 4 per the roadmap; can scaffold earlier in dry-run mode).

### Session B (you — Builder) first moves when you start:
1. Read this brief (you just did).
2. Read `TREADSET_AI_NATIVE_ROADMAP.md` cover to cover.
3. Read `CLAUDE.md` and `TREADSET_BRAIN.md`.
4. Read `/tmp/treadset-tready-data-model.sql` and the Tready architecture memory file at `~/.claude/projects/-Users-zachariahdevon/memory/project_treadset_tready_architecture.md`.
5. Check `SESSION_INBOX.md` and `SESSION_LOG.md` for any new entries from me since this brief was written.
6. Spawn an Explore agent (the meta-agent type) to identify the exact 80 elements to tag with `data-tready-id` for the demo flow. Have it produce a list: `{element selector, page, label, what it does, role-required}`. Do NOT modify files in that pass — read only.
7. Write the migration for `tready_ui_map` and `tready_conversations` from `/tmp/treadset-tready-data-model.sql`. Hand the SQL to Z for manual paste.
8. Scaffold `supabase/functions/tready/index.ts` with the Vercel AI SDK v6, two cache breakpoints, and ONE static tool (`get_current_time`) just to prove the loop works. Test it from the Supabase Functions invoke UI as the demo user.
9. Append your first entry to `SESSION_LOG.md` with the `[B]` prefix.

### The handshake

When Session B is up and running, post the following to `SESSION_INBOX.md`:

```markdown
## [B → A] 2026-MM-DD HH:MM — Session B online, starting Tready scaffold
**Context**: Read the brief, read the roadmap, read CLAUDE.md + BRAIN.
**First task**: Scaffold tready edge fn + tag 80 elements for the demo walkthrough.
**Need from A**: Nothing yet. Will flag when I need the first typed RPC.
**Blocking**: no
**Status**: open (will flip to resolved when scaffold is in main)
```

Session A will respond within one work block.

---

**End of brief. Both sessions, read this every time you start a new work block until you have it memorized.**
