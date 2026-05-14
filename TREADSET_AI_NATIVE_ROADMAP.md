# TREADSET_AI_NATIVE_ROADMAP

**Drafted 2026-05-13. Research-only deliverable. No code in this session.**
**Receiver: the engineering session that will execute this. Not committed.**

> **Correction 2026-05-13:** This document was drafted using a stale memory snapshot that treated the Denver tire conference as upcoming (~2026-05-27). The booth is **complete** (wrapped on or before 2026-05-12). Wherever this doc says "pre-Denver punch list" or "≤ 2026-05-27," read it as **"week 1 punch list, thoughtful pacing."** Wherever it says "Denver booth (~05-27)" in the week-3 row of the schedule, read it as **"reserved buffer week for booth follow-ups + retro."** The work items themselves don't change — only the urgency framing. Sprint-mode → thoughtful-mode.

---

## 1. TL;DR

Five calls. Each is decided. Defend or override before the build session starts.

1. **Tready ships on Vercel AI SDK v6, hosted in Supabase Edge Functions, using native Claude tool-use (NOT MCP).** Tool-factory pattern closes every tool over `organization_id` at request time; RLS as backstop. Sonnet 4.6 main + Haiku 4.5 for nav/highlight, two Anthropic cache breakpoints (system prompt, UI-map slice). ~$0.02-0.04 per conversation.
2. **Vercel Workflow DevKit becomes the durable runner for everything that today is "5 client mutations in a row and pray."** pg_cron stays as a free trigger. Inngest deferred unless WDK's tenant guardrails break in practice.
3. **Pre-Denver booth (≤ 2026-05-27): eight items, no more.** Fix the 5 hardcoded `slug='bsg'` edge functions, seed TreadSet Demo, scaffold `tready_ui_map` + 80 tagged elements, ship a single Anthropic-backed Tready endpoint demo-tenant-only behind a flag, sign the Resend webhook. Everything else is post-show.
4. **Migrate AI provider from Google Gemini (Lovable gateway) → Anthropic Claude in two waves:** Tready endpoint first (week 2), then the other 5 Gemini-using functions in week 10 after edge-function consolidation. Single-provider economics + prompt caching is the whole point.
5. **The moat is the curator loop, not the chat box.** V3's nightly curator job — clustering escalations into KB drafts that Z one-click approves — is the thing competitors can't catch up to in 18 months. Treat V1 + V2 as scaffolding for V3.

The one question Z owes before the build session: **does Tready at Denver live on (a) demo tenant only, (b) demo + read-only BSG view, or (c) demo + Tready enabled on BSG for Z's user only?** Recommend (c). See Section 6.

---

## 2. Current Automation Inventory

Counts (from the cold-read of `supabase/`, `src/hooks/`, `vercel.json`, `.github/`):
- **79 edge functions** (Deno, Supabase Functions runtime)
- **~338 migration files** (consolidation parked)
- **4 active pg_cron jobs** — all use `pg_net.http_post()` to invoke edge functions
- **0 Vercel cron entries** in `vercel.json`
- **0 GitHub Actions cron workflows**
- **3 Postgres extensions** in use: `pg_cron`, `pg_net`, `pg_trgm`
- **6 functions call an LLM** — all Google Gemini 2.5-Flash via `LOVABLE_API_KEY` gateway. Zero Anthropic / OpenAI / Claude code in the repo today.
- **1 inbound webhook** (Resend) — no signature verification
- **0 inbound Stripe webhooks** despite Stripe being used outbound for payments

### Edge functions grouped by domain

| Domain | Count | Examples | Notes |
|---|---|---|---|
| Email / comms | 19 | `send-manifest-email`, `send-portal-invitation`, `send-rate-increase-email`, `send-weekly-pickup-reminders` | Over-specialized. Consolidate to 3 (transactional / marketing / internal) + a shared template layer. |
| Manifests + PDF | 7 | `generate-acroform-manifest`, `ensure-manifest-pdf`, `manifest-finalize`, `batch-manifest-export` | 3 PDF generators overlap; recommend keep `generate-acroform-manifest` as canonical. Michigan V4 template hardcoded → state-template strategy needed before tenant #3. |
| Route planning | 5 | `route-planner`, `ai-route-optimizer`, `enhanced-route-optimizer`, `multi-trip-optimizer`, `driver-route-suggestions` | 4-5-way duplication. Recommend keep one Gemini→Claude route brain + one Mapbox constraint solver, delete the rest. |
| Analytics / scoring | 10 | `analyze-pickup-patterns`, `calculate-client-risk`, `calculate-driver-performance`, `compute-daily-metrics`, `calculate-revenue-forecast` | All RISK-service-role-no-jwt. All cron-shaped, none explicitly scheduled outside the 4 pg_cron jobs. |
| Data quality | 5 | `data-quality-scan`, `auto-fix-geocoding`, `fix-geocoding`, `backfill-client-geography`, `fix-missing-revenue` | `fix-geocoding` has Detroit-only lat/lng bounds hardcoded (multi-tenant bug). |
| Auth / onboarding | 3 | `create-employee`, `update-employee`, `vehicle-setup` (slated for delete) | `create-employee` is one of the few JWT-validated functions. |
| Payments | 4 | `create-payment`, `create-pickup-payment`, `create-tire-checkout`, `verify-payment`, `verify-pickup-payment` | `create-payment` hardcoded `.eq('slug','bsg')`. |
| Imports / exports | 5 | `csv-import`, `csv-export`, `inventory-csv-export`, `michigan-report-export`, `batch-manifest-export` | |
| AI | 4 | `ai-assistant`, `ai-route-optimizer` (partial), `generate-ai-insights`, `suggest-nearby-clients` | All Gemini-via-Lovable. `generate-ai-insights` is already Tready-shaped — extend, don't rebuild. |
| Webhooks | 3 | `resend-webhook`, `track-email-event`, `portal-invite-unsubscribe` | Resend has no HMAC verification. `track-email-event` and `portal-invite-unsubscribe` look dead. |
| Housekeeping / health | 9 | `archive-old-logs`, `cache-cleanup`, `cleanup-duplicate-notifications`, `system-health-check`, `warmup-critical-functions`, `diag-storage`, `api-performance-monitor` | Most cron-shaped, only some scheduled. |
| Other / dead | 5 | `track-email-event`, `portal-invite-unsubscribe`, `send-test-outreach-email`, `upload-v4-template`, `vehicle-setup` | Candidates for delete after audit. |

### Active pg_cron jobs

| Job | Schedule (UTC) | Target | Notes |
|---|---|---|---|
| `analyze-pickup-patterns-daily` | 02:00 | edge fn `/analyze-pickup-patterns` | Loops all orgs server-side |
| `check-missing-pickups-daily` | 08:00 | edge fn `/check-missing-pickups` | Resend emails for missed pickups |
| `manifest-followup-automation` | 07:00 | edge fn `/manifest-followup-automation` | Followup workflow upserts |
| `data-quality-scan` | 08:00 | edge fn `/data-quality-scan` | Flag bad rows |

### Triggers worth knowing (8 of ~30)

| Trigger | Table | Side effect |
|---|---|---|
| `on_auth_user_created_org` | `auth.users` | Creates org + admin role on signup |
| `on_auth_user_created_link_client` | `auth.users` | Auto-links user to client by email |
| `on_auth_user_created_link_hauler` | `auth.users` | Auto-assigns driver role on hauler match |
| `trg_pickups_update_client_stats` | `pickups` | Updates `clients.lifetime_revenue`, `last_pickup_at` |
| `trg_pickups_update_client_summary` | `pickups` | Upserts monthly `client_summaries` |
| `trg_manifests_update_client_stats` | `manifests` | Syncs manifest signed_at → client |
| `payment_invoice_update_trigger` | `payments` | Marks invoice paid, updates client balance |
| `refresh_reporting_views_on_pickup_change` | `pickups` | Refreshes materialized reporting views |

### Stale / dead code flags
- `track-email-event` — no callers in `src/`, superseded by `resend-webhook`
- `portal-invite-unsubscribe` — no callers; unsubscribe path may be email-only
- `send-test-outreach-email` — anon-safe dev function; protect or delete
- `vehicle-setup` — slated for deletion per `TREADSET_BRAIN.md`
- `weekly-monday-pickup-reminders` pg_cron — unscheduled 2026-04-20 but SQL function may remain
- 28 edge functions have no callers in `src/` — many are likely cron-driven but no scheduler proves it

### Multi-tenant blockers (block tenant #3 onboarding)
- 5 edge functions hardcoded `slug='bsg'`: `create-payment`, `public-booking`, `public-stats`, `resend-corrected-outreach`, `send-weekly-pickup-reminders`
- Helper functions `user_has_role()`, `get_current_user_organization()` default arg to `'bsg'`
- `fix-geocoding` Detroit lat/lng bounds hardcoded
- `send-manifest-email` sender is `noreply@bsgtires.com` for every tenant
- Michigan V4 field map hardcoded in `ensure-manifest-pdf`
- `useClientWorkflows`, `useDataQualityFlags`, `useOperationalMetrics`, `useDriverWeeklyAssignments` rely on RLS-only for tenant isolation, no explicit `.eq('organization_id', orgId)`

---

## 3. Leverage Gaps (impact × effort = leverage)

Impact 1-5 (5 = saves real human hours every day or unblocks a deal). Effort 1-5 inverted (5 = small, 1 = large). Leverage = product.

| # | Workflow today | Proposed automation | Impact | Effort↻ | Leverage | Tool |
|---|---|---|---|---|---|---|
| 1 | Dispatcher manually tracks missed pickups in a notebook | `check-missing-pickups` already exists — wire it into a tenant-specific dashboard widget + Slack/email digest | 5 | 5 | **25** | existing edge fn + WDK fan-out |
| 2 | Z manually emails new trial users walkthroughs | Tready V1 onboarding walkthrough engine (UI-anchored, escalates 15-30% to Z) | 5 | 3 | **15** | Vercel AI SDK v6 + tool-factory |
| 3 | Stripe payment events tracked by polling `verify-payment` | Stripe webhook receiver → durable workflow that updates invoice / sends receipt / triggers downstream | 5 | 4 | **20** | WDK + Stripe MCP |
| 4 | Manifest completion fan-out (PDF + email + state push + driver notify) spread across 3-5 client mutations, no rollback | One durable workflow with per-step retry. Partial failure resumes, not duplicates. | 5 | 3 | **15** | WDK |
| 5 | Z hand-writes the same "how do I X?" answer to 6 different trial users | V3 curator: cluster escalations → KB draft → Z one-click approves → permanent answer | 5 | 2 | **10** | WDK + Claude Sonnet |
| 6 | Resend bounces / opens silently affect deliverability with no enforcement | Sign the webhook, deliverability gates email sending, dashboard surfaces it | 4 | 5 | **20** | existing `resend-webhook` + HMAC |
| 7 | Dispatcher manually picks today's followup clients | `useActiveFollowups` heuristic → server RPC that returns pre-filtered list, learned threshold | 4 | 4 | **16** | RPC + future ML |
| 8 | Driver weekly assignments page polls every 10s with 5-join query | Realtime subscription + materialized view | 3 | 4 | **12** | Supabase Realtime |
| 9 | Raw material projections loop 5000+ rows in browser | Move PTE math to RPC | 4 | 4 | **16** | Postgres function |
| 10 | Compliance-question support tickets (EGLE / state DEPs) | Tready V2 KB with state-by-state retention windows, deadlines, citations | 5 | 2 | **10** | Vercel AI SDK + pgvector |
| 11 | No error tracking — Z learns about prod bugs from Justin / customers | Sentry instrumented on every edge function + frontend + Tready endpoint | 5 | 5 | **25** | Sentry + Sentry MCP |
| 12 | 28 orphan edge functions of unknown live status | Audit + delete or wire to WDK explicitly | 3 | 4 | **12** | manual audit + delete PRs |
| 13 | 19 email send functions reimplement retries + templates | One transactional send + one marketing send + shared template layer | 3 | 3 | **9** | refactor |
| 14 | 4-5 route optimizers, unclear which is canonical | Consolidate to one Claude-driven planner + one Mapbox constraint solver | 4 | 3 | **12** | refactor |
| 15 | Re-TRAC compliance integration — manual quarterly filings | Durable workflow that pushes manifests on completion, polls for ack | 5 | 1 | **5** | WDK + Re-TRAC API (blocked on their reply) |
| 16 | Tenant onboarding for org #3 is undocumented manual work | Scripted playbook + admin tool that creates org + seeds defaults | 4 | 3 | **12** | Supabase migration + admin RPC |
| 17 | No automated tests, no eval harness for Tready | 50-question golden dataset + nightly auto-eval via Claude judge | 5 | 3 | **15** | Custom + Anthropic API |
| 18 | Driver assignment created from dispatcher UI can orphan on second-step failure | Atomic RPC (like `driver_schedule_pickup` already does for mobile) | 4 | 4 | **16** | Postgres `SECURITY DEFINER` RPC |
| 19 | `useGenerateDropoffManifest` 5-step pipeline orphans manifest if PDF gen fails | Wrap in one edge function returning `{manifest_id, pdf_path}` atomically | 4 | 4 | **16** | edge function refactor |
| 20 | Dashboard recomputes aggregates on every load (2000+ rows client-side) | Materialized views refreshed on pickup/manifest change (trigger already exists) | 4 | 3 | **12** | wire existing trigger to dashboard query |
| 21 | New customer can't get answers outside business hours | Tready V1 covers 70-80% of common new-user questions 24/7 | 5 | 2 | **10** | Tready (covered in #2) |
| 22 | Per-tenant manifest sender domain (everyone's email comes from `noreply@bsgtires.com`) | Per-org `from_email` setting + DNS validation | 4 | 4 | **16** | Resend + org settings |

Total identified leverage gaps: 22. Top 5 by leverage (1 + 11 + 3 + 6 + 18) all share a common dependency: a real workflow runner + tenant-scoping helpers. That's why Track A and Track C (foundation + automations) come before V2/V3.

---

## 4. Tool Decisions

One paragraph each. Decided, not surveyed.

**Vercel Workflow DevKit — ADOPT (primary durable runner).** Step-billed on Hobby tier — at 100 tenants × 100 runs × 5 steps = 50k steps = free. Founder writes plain TS with `'use workflow'` / `'use step'` directives, no DSL, no second dashboard. Hooks (`defineHook`) cleanly model the Stripe-webhook resume pattern. Tenant isolation is by convention (pass `tenantId` as workflow input) — enforced via a single `startTenantWorkflow(tenantId, fn, input)` helper + lint rule + Supabase RLS as backstop. Already on Vercel, zero new infra to learn. Cost at 100 tenants: ~$5-20/mo total ≈ $0.05-0.20/tenant. Multi-tenant fit: yellow (developer discipline + RLS), not red. Docs: https://vercel.com/docs/workflows

**Inngest — SECONDARY (deferred).** Objectively stronger tenant guardrails via first-class `concurrency: { key: 'event.data.tenantId' }` per-tenant queues. Free tier (50k execs/mo) covers TreadSet's projected load. Reasons to defer: adopting two new platforms in 90 days violates the "one new system" tax. Revisit if WDK ships a cross-tenant incident or if Re-TRAC API's async-ack patterns demand `step.waitForEvent`.

**n8n — REJECT.** Sustainable Use License explicitly prohibits using n8n "to act as the back-end to power a feature in my app." That's exactly what TreadSet's manifest fan-out, Stripe webhook, and Re-TRAC integration would be. Disqualifying. Also visual builder is a regression for TS-fluent founder + Claude Code.

**Trigger.dev v4 — REJECT.** Apache 2.0 self-host is appealing but tenant scoping is convention-only (tag prefixes), weaker than Inngest's keys and offering no advantage over WDK. A third dashboard isn't worth it.

**Supabase pg_cron + pg_net — KEEP AS-IS, repurpose as trigger.** Free, already there. Use it to *kick off* WDK workflows, never as the runner. 10-min job cap, no retries, no event log — disqualifying for manifest fan-out or curator. The 4 active jobs migrate to thin pg_cron triggers that POST to WDK workflow start endpoints.

**Vercel AI SDK v6 — ADOPT (Tready framework).** Pure ESM, runs on Supabase Edge (Deno) and Vercel Functions equally. `streamText` + `tool()` + `stopWhen` + `ToolLoopAgent` handle the V1 tool-use loop in 50 lines. First-class `providerOptions.anthropic.cacheControl` for prompt-cache breakpoints (the cost story). UI Message stream protocol carries custom data parts — the `highlight_ui` tool returns a payload that the React `useTreadyStream` hook reads to trigger the overlay. Cost per Tready conversation: ~$0.02-0.04 with 60% cache savings. Lock-in: low — swap to raw `@anthropic-ai/sdk` is one focused weekend (~80 lines). Docs: https://ai-sdk.dev

**Mastra — SECONDARY.** Strongest memory primitives in the field (`resourceId` + `threadId`, working memory, semantic recall) — direct fit for V3. Rejected as primary because it bundles its own runtime / Studio / storage opinions and orients toward Node hosting; Supabase Edge (Deno) is the safer bet. Revisit at V3 milestone if naïve recent-rows memory query stops being enough.

**LangGraph.js — REJECT for V1.** Graph-based agents are the right tool for HITL workflows and parallel fan-out. Tready V1 is a linear loop. Pay the graph cost when V4 needs approval nodes for "Tready wants to send escalation — approve?"

**OpenAI Agents SDK — REJECT.** Anthropic is peer-supported but the cost model (prompt caching, Sonnet/Haiku tiering) is second-class. Wrong shape for a Claude-first product.

**CrewAI — REJECT.** Python. Stack mismatch. Stop.

**Anthropic SDK (raw / claude-agent-sdk) — KEEP AS ESCAPE HATCH, NOT PRIMARY.** `@anthropic-ai/claude-agent-sdk` is Claude-Code-shaped (bundles native binary, Read/Edit/Bash-oriented), not a web-app agent runtime. The plain `@anthropic-ai/sdk` works but means hand-rolling streaming + retries + tool error wrapping + UI stream protocol. Use it only if AI SDK ships a breaking change we hate.

**Sentry MCP — INSTALL THIS WEEK.** Hosted at `mcp.sentry.dev/mcp`. OAuth, ~5 min. TreadSet has zero error tracking today; this is the largest blind-spot fix in the stack. Cost: Sentry Team $26/mo, or Developer free tier for 5K errors. Critical pre-booth.

**Stripe MCP — INSTALL THIS WEEK (Z's session only).** Hosted at `mcp.stripe.com`. Restricted-key auth, ~10 min. "Refund pickup #4421" becomes one turn. Tenant-safety: red for Tready (never expose), green for Z (he owns the Stripe account).

**Mapbox MCP — INSTALL THIS WEEK.** Hosted at `mcp.mapbox.com/mcp`. Stateless geo, naturally tenant-safe. Route optimization is a Tready V1 wedge feature. Cost: free MCP, pay-as-you-go API ($0.50-$2 per 1K requests).

**Resend MCP — INSTALL THIS WEEK (Z only); INSTALL AT TREADY V2 (in-product).** Z drafts/sends customer comms from Claude Code. Tready V2 sends manifest emails directly. Yellow tenant-safety: Resend API key is org-global, templates must inject tenant context.

**Playwright MCP — INSTALL THIS WEEK.** Browser automation for regression prevention. The 2026-05-07 PWA incident and 2026-05-12 Moses driver-visibility regression would have been caught by an automated e2e. Free, 10 min to install.

**Linear MCP — INSTALL ONLY IF Z USES LINEAR.** No Linear references in memory. Confirm before installing.

**GitHub MCP — SKIP.** Z already has `gh` keychain-authed; MCP adds tool-bloat without new capability.

**Slack MCP — SKIP for now.** No evidence Z operates from Slack. Revisit when team grows past Z solo.

**Notion MCP — SKIP.** Z's memory lives in `MEMORY.md`, not Notion.

**Generic PostgreSQL MCP — SKIP.** Strictly inferior to Supabase MCP for this stack.

**Anthropic Memory Tool primitive — USE FOR TREADY V2 per-user memory.** Not an MCP server. Wire the filesystem interface to a Supabase storage path keyed by `organization_id/user_id`. Tenant-safe by construction. Build cost: ~2 hours.

**MCP-vs-native-tool-use decision for Tready: NATIVE.** MCP earns its keep when one server fans out across many clients. Tready's edge function is the only consumer of Tready's tools — there's no fanout to amortize. Native tools close over authenticated `organization_id` at request time (model can't override); MCP authenticates at connection-init, with tenant scoping passed as a tool arg the model could lie about. Native also wins on latency, prompt-cache stability, and version atomicity. Reserve MCP for Z's Claude Code session, where transport overhead doesn't matter.

**AI provider: ANTHROPIC over Google Gemini (current Lovable gateway).** Tready is Claude-first. Prompt caching is the cost story. Migrate the 6 Gemini-via-Lovable functions in two waves: Tready endpoint week 2 (booth-critical), then the remaining 5 (`ai-assistant`, `ai-route-optimizer`, `driver-route-suggestions`, `generate-ai-insights`, `suggest-nearby-clients`) in week 10 after edge-function consolidation so we don't migrate functions that are scheduled for deletion.

---

## 5. 90-Day Sequence

### Pre-Denver Punch List (≤ 2026-05-27, ~14 days)

| # | Item | Why for booth | Est | Blocker? |
|---|------|--------------|-----|----------|
| 1 | Fix 5 hardcoded `slug='bsg'` edge functions — accept `org_id` / `slug` param | Demo tenant can't coexist with BSG until these resolve dynamically | 1d | YES |
| 2 | Provision TreadSet Demo tenant (already exists per memory; verify + refresh seed) | The booth IS the demo tenant. Empty tenant = dead demo. | 1d | YES |
| 3 | Tready V1 skeleton: `tready_ui_map`, `tready_conversations` tables, `data-tready-id` on top 80 demo-path elements, system-prompt scaffold w/ 2 cache breakpoints | Booth headline is "AI-native." Need a Tready bubble that answers 10 scripted questions reliably. | 4d | YES |
| 4 | Anthropic provider swap for the Tready endpoint ONLY (Sonnet 4.6 + Haiku 4.5) | Claude is the demo. Don't regress live BSG Gemini flows pre-show. | 1d | YES |
| 5 | Resend webhook HMAC signature verification | One spoofed bounce mid-booth = embarrassing data-corruption story; trivial fix | 0.5d | YES (sec) |
| 6 | Tready feature flag / kill switch (per-user + per-org) | Demo on TreadSet Demo without touching BSG prod. Reused later for week-4 BSG dogfood. | 0.5d | YES |
| 7 | Booth resilience: offline-cache last good Tready responses + scripted fallback answers | Conference WiFi will fail. A frozen Tready on stage is the worst outcome. | 1d | YES |
| 8 | Sentry MCP wired + Tready endpoint instrumented | Booth-floor debug loop. Non-negotiable. | 0.5d | YES |

**Stripe webhook, pg_cron→WDK migration, V2/V3, tenant-smell fixes beyond the 5 slugs: ALL post-show.**

### Week-by-week

Week 1 = 2026-05-13 → 2026-05-19. Week 13 ≈ 2026-08-12.

| Wk | Dates | Track A: Foundation | Track B: Tready | Track C: Background Automations | Milestone |
|----|-------|--------------------|-----------------|--------------------------------|-----------|
| 1 | 05-13→05-19 | Fix 5 hardcoded `'bsg'` slugs. Verify/refresh Demo tenant seed. Sign Resend webhook. | Create `tready_ui_map` + `tready_conversations` tables. Tag top 80 demo-path elements. Draft system prompt w/ cache breakpoints. | Install Sentry MCP locally. Freeze the 6 Gemini functions (no edits). | Demo tenant boots clean, no BSG bleed. Tready tables exist. |
| 2 | 05-20→05-26 | Tenant kill-switch env flag. Booth-resilience offline cache. End-to-end smoke on demo tenant. | Tready endpoint live on Anthropic. 10 scripted booth Q&A pass. Tool factory closes orgId. | Mapbox + Stripe + Resend + Playwright MCPs (local only). | **Dress rehearsal Fri 05-22.** Tready answers 10/10 scripted Qs. |
| 3 | 05-27→06-02 | **Denver booth (~05-27). BSG code freeze.** Retro + bug triage from booth. | Tready in observation mode. Log every booth conversation to seed V3 curator corpus. | Quiet week. No prod pushes. | Booth survived. Conversation corpus captured. |
| 4 | 06-03→06-09 | Stripe webhook receiver (signed, idempotent, replaces polling). Add orgId filters to `useClientWorkflows`, `useDataQualityFlags`, `useOperationalMetrics`. | Tready V1 hardening: escalation-to-email, walkthrough player, confidence gating. Enable on BSG for Z's user only. | Vercel WDK installed. `startTenantWorkflow(tenantId, fn, input)` helper + ESLint rule + RLS backstop migration. | Stripe no longer polls. Z dogfoods Tready on BSG. |
| 5 | 06-10→06-16 | `useDriverWeeklyAssignments` orgId join (kill email-based lookup). Consolidate 3 PDF generators → 1. | Tready V1 GA, flag-gated rollout to BSG users. `tready_ui_map` expanded to 300 elements. | Migrate `manifest-followup-automation` pg_cron → WDK durable workflow w/ retries. pg_cron becomes thin trigger. | First real BSG user (not Z) on Tready daily. First durable workflow in prod. |
| 6 | 06-17→06-23 | Consolidate 4-5 route optimizers → 1 canonical. Delete 28 orphan edge functions (after audit). | Add pgvector extension. Build embedding pipeline edge fn. Backfill embeddings on booth + week-4-5 conversations. | Migrate `analyze-pickup-patterns` + `check-missing-pickups` → WDK. **Requires C4 Stripe-webhook pattern.** | Edge function count drops ~30%. pgvector live. |
| 7 | 06-24→06-30 | `useGenerateDropoffManifest` → atomic transaction wrapper (no more orphan PDFs). `useUpdateAssignmentStatus` rollback path. | Tready V2 KB: `tready_kb` table. Seed state-compliance facts (CA, TX, FL first). RAG retrieval tool wired into agent. | Migrate `data-quality-scan` → WDK. All 4 pg_cron jobs now thin triggers. | Manifest gen no longer orphans on PDF fail. Tready cites compliance facts. |
| 8 | 07-01→07-07 | 19 email senders → audit, consolidate to 3 + shared template layer. | Tready V2 hardening: KB freshness UI, "stale fact" flagging, source attribution in responses. | Manifest fan-out (per-driver weekly assignments) → durable WDK workflow w/ per-step retries. Replaces 10s polling. | Driver weekly assignments stop polling. Email surface cut 80%. |
| 9 | 07-08→07-14 | `useDashboardData` + `useManifestHealthScan` + `useRawMaterialProjections`: push compute to materialized views / edge functions. | Tready V3 prep: `tready_user_memory` + `tready_org_memory` tables. Wire Anthropic Memory Tool primitive to org-scoped Supabase storage. | Curator workflow scaffold in WDK (nightly, dry-run, no writes). **Requires B7 embeddings + C7 WDK fluency.** | Dashboard p95 load <1.5s. Memory tool reading per-user state. |
| 10 | 07-15→07-21 | Migrate remaining 5 Gemini functions → Anthropic. Retire Lovable key. | Tready V3 memory writes live. Curator promoted from dry-run to write-mode for `tready_user_memory` only (not KB yet). | Curator emits KB-draft proposals to review queue (HITL, Z approves). | Single AI provider. Curator drafts KB overnight. |
| 11 | 07-22→07-28 | Tenant onboarding playbook: scripted creation of org #3 end-to-end in <30min. | V3 escalation Z-reply parsing: inbound email → curator → memory update. Close the human-feedback loop. | Curator auto-promotes KB drafts above confidence threshold. Org-scoped memory writes enabled. | Third tenant onboardable in one afternoon. Tready learns from Z's emails. |
| 12 | 07-29→08-04 | Edge function final audit: target <50 (from 79). Per-tenant cost dashboard ($/mo). | Tready V3 GA. Confidence scoring in UI. Per-org memory visible to admins. | WDK observability dashboard. Failed-workflow Slack/email alerts via Resend. | Sub-$5/tenant/mo verified on BSG telemetry. |
| 13 | 08-05→08-12 | V4 groundwork: cross-tenant aggregation schema (org-anonymized fact table). Privacy review. | V4 spike: cross-tenant intel query ("how does our pickup-miss rate compare to industry?") — read-only, anonymized. | Curator V2: cross-tenant pattern detection (gated, opt-in per org). | V4 demo for one cross-tenant insight on Demo + BSG combined. |

### Non-obvious cross-track dependencies

- **WDK fluency (C4-C6) must precede V3 curator (B9-B10).** The curator is itself a durable workflow with embedding fan-out, KB-draft writes, and email parsing. Build it before you've shipped 2-3 simpler workflows and you're debugging two new systems at once.
- **pgvector + embedding backfill (B6) gates curator dry-run (C9), not just V2 RAG.** Curator needs embedded conversation history to cluster patterns. Embeddings only covering post-week-6 traffic = V3 launches with one month of memory instead of three.
- **Stripe webhook (A4) is the reference for every durable workflow (C5-C8).** Idempotency keys, signature verification, retry semantics — establish the pattern once in A4, copy it everywhere. Sloppy A4 = re-litigating the same design 6 times.
- **Edge function consolidation (A5-A8) must happen BEFORE the AI provider swap (B10).** Migrating 6 Gemini functions is cheap; migrating 6 when 4 are scheduled for deletion is wasted work. Delete first, migrate the survivors.
- **Tenant-safety smell fixes (A4-A5) gate V1 GA to BSG (B5), not Tready V1's existence.** Tready can demo on the isolated demo tenant in week 2 without smells fixed. But Tready cannot turn on for real BSG users until `useClientWorkflows` / `useDataQualityFlags` / `useDriverWeeklyAssignments` scope to orgId — otherwise it surfaces cross-tenant data in answers.
- **Memory tool primitive (B9) must land before curator write-mode (B10).** Curator writes to the same memory store Tready reads. If the read path isn't proven first, you'll debug curator bugs that are actually read-path bugs.

### Pre-Denver vs post-show (clean split)

**Pre-Denver (ship by 2026-05-27, max 8):**
1. Fix 5 hardcoded `slug='bsg'` edge functions
2. Verify/refresh TreadSet Demo tenant seed
3. `tready_ui_map` + `tready_conversations` tables + 80 tagged demo-path elements
4. Tready endpoint on Anthropic (Sonnet 4.6 + Haiku 4.5, 2 cache breakpoints)
5. Resend webhook HMAC verification
6. Per-user + per-org Tready feature flag
7. Booth resilience offline cache + scripted fallbacks
8. Sentry MCP wired to Tready endpoint

**Post-show (weeks 4-13):**
Stripe webhook receiver / orgId filter on `useClientWorkflows` / orgId filter on `useDataQualityFlags` / orgId filter on `useOperationalMetrics` / orgId join on `useDriverWeeklyAssignments` / WDK + `startTenantWorkflow` + lint rule / pg_cron → WDK migration (all 4 jobs) / manifest fan-out durable workflow / `useGenerateDropoffManifest` atomic wrapper / `useUpdateAssignmentStatus` rollback / `useSchedulePickupWithDriver` rollback / route-optimizer consolidation / PDF-generator consolidation / email-sender consolidation / 28 orphan function delete pass / 5 remaining Gemini → Anthropic / pgvector + embedding pipeline / `tready_kb` + state-compliance seed / Tready V1 BSG GA / Tready V2 RAG + source attribution / `tready_user_memory` + `tready_org_memory` + memory tool / nightly curator (dry-run → write → HITL approve → auto-merge) / escalation Z-reply parsing / tenant onboarding playbook (<30min for org #3) / V4 cross-tenant aggregation schema + first anonymized insight.

---

## 6. Risks + Open Questions

### Risks

- **Cross-tenant leak via developer mistake.** WDK doesn't enforce tenant isolation; Tready's tool factory closure does, but a single bug in either kills the company. Mitigation: `startTenantWorkflow` helper + lint rule + tool-factory pattern + RLS backstop + nightly eval test that explicitly tries cross-org access. Revisit Inngest if the first code review catches an unsafe `start()`.
- **Booth WiFi failure during Tready demo.** Conference networks fail. Mitigation: pre-booth offline cache of canonical answers + scripted fallback flow that doesn't depend on live LLM calls.
- **Anthropic prompt cache misses in V2/V3.** A single dynamic block above a cache breakpoint costs 6× overnight. Mitigation: assert cache hit rate ≥70% in nightly eval; alert on regression.
- **WDK is brand-new (2025-2026).** API surface could shift. Mitigation: pin version; the swap-to-raw-Anthropic-SDK weekend exit (the AI SDK side); the swap-to-Inngest contingency (the runner side).
- **Re-TRAC API ambiguity.** Compliance moat depends on their reply (awaiting since 2026-05-01). If their pattern is async-and-flaky, WDK hooks may not be enough and we'll want Inngest's `step.waitForEvent` per-tenant throttle. Revisit when they respond.
- **Curator writes to same store Tready reads.** Read path bugs masquerade as curator bugs. Mitigation: Memory tool primitive lands one week before curator write-mode; dry-run mode for two weeks.
- **Adopting two new platforms in 90 days violates the "one new system" tax.** WDK + Vercel AI SDK + 5 MCP servers + provider migration is already a lot. Mitigation: WDK first (C4), AI SDK in parallel (B2-B5), MCP installs are minutes not days, provider migration is incremental.
- **V3 GA pricing.** Token cost per Tready conversation is ~$0.02-0.04 now, but with V3 memory blocks it grows. Mitigation: per-tenant cost dashboard (week 12) gates V3 GA.

### Open questions for Z

1. **Where does Tready V1 actually live at the booth — demo only, demo + read-only BSG view, or demo + Tready enabled on BSG for Z's user only?** *Recommendation: option (c), Z-only on BSG. Highest-impact booth story with smallest blast radius. Also forces the per-user feature flag in week 2, which you need anyway for week-4 BSG dogfood — work isn't wasted. If gut says Denver WiFi + live data is one variable too many, demote (c) to week 4 and ship (a) for the booth.*
2. **Re-TRAC integration: still waiting on them, or pivot to direct-state-portal scraping as a fallback?** Affects whether the compliance moat ships in the 90-day window at all.
3. **Tenant #3: who is it and when?** If known, the week-11 onboarding playbook target compresses. If unknown, week-11 stays scripted-not-rehearsed.
4. **Pricing commitment for V2 → does the KB-aware Tready bump customers from $60/truck to $99/truck, or stay $60 with a separate per-tenant "compliance pack"?** Affects how aggressively we surface V2 in UI vs hide behind a paywall flag.
5. **Eval harness: who owns the 50-question golden dataset?** If Z writes it, week-2 schedule slips. If Claude generates it from booth conversations, V3 launches with a dataset that overfits to demo-tenant patterns.

### The single most important question

**Where does Tready V1 live at the booth — demo-only, demo + read-only BSG view, or demo + BSG enabled for Z's user only?**

- (a) **Demo-only.** Safest. BSG prod untouched. Booth visitors see Tready answer questions on seeded demo data. Risk: feels like a toy.
- (b) **Demo-only + a "BSG live data" view-but-don't-answer mode** — Tready can navigate BSG UI but chat is disabled. Splits the difference.
- (c) **Demo-only + Tready enabled for Z's own BSG user account only,** so Z can pull up real ops data mid-pitch.

**Guess: (c).** Highest-impact booth story with the smallest blast radius. Resolving this one question makes the week-2 build session's prompts 2x sharper, because it determines whether the feature flag is per-user or per-org and whether the offline-cache strategy needs to cover BSG-data or only demo-data.

---

## 7. Appendix — Raw findings from each subagent

<details>
<summary>Agent A — Edge function inventory (~79 functions)</summary>

- 79 edge functions total. Domains: email/comms (19), analytics (10), housekeeping/health (9), data quality (5), route planning (5), manifests/PDF (7), AI (4), payments (5), webhooks (3), other/dead (5+).
- **AI**: 6 functions call Google Gemini 2.5-Flash via Lovable AI gateway (`LOVABLE_API_KEY`). No Anthropic/OpenAI/Claude in repo.
- **`generate-ai-insights` is Tready-shaped** — already org-scoped, queries org data, calls LLM, stores in `ai_insights`. Extend rather than rebuild.
- **Hardcoded `slug='bsg'`** in 5 functions: `create-payment`, `public-booking` (2 locations), `public-stats`, `resend-corrected-outreach`, `send-weekly-pickup-reminders`. Blocks tenant #3 onboarding.
- **Duplicates**: 4-5 route optimizers (`ai-route-optimizer`, `enhanced-route-optimizer`, `multi-trip-optimizer`, `route-planner`, `driver-route-suggestions`), 3 PDF generators, 19 email senders, 5 outreach drip variants.
- **Dead/stale**: `track-email-event`, `portal-invite-unsubscribe`, `send-test-outreach-email` (anon-safe, should require auth or delete), `vehicle-setup` (slated for deletion).
- **Webhook security**: 8 manifest-related functions verify signatures. `resend-webhook` does NOT verify. `track-email-event` unclear.
- 28 functions have no callers in `src/` — many cron-shaped but no scheduler proves them live.

</details>

<details>
<summary>Agent B — Migrations / triggers / pg_cron (~338 migrations)</summary>

- **Postgres helper functions**: `user_has_role(role, slug='bsg')`, `is_org_admin(org_id)`, `is_own_user_role(user_id)`, `get_current_user_organization(slug='bsg')`. The `'bsg'` default is a multi-tenant smell — app must always pass explicit slug or this defaults wrong.
- **RPC functions**: `claim_client_invite_token`, `validate_client_invite_token`, `claim_client_team_invite_token`, `driver_schedule_pickup`, `delete_pickup_cascade`, `get_live_client_analytics`.
- **Compute / analytics**: `calculate_pickup_revenue`, `generate_invoice_number`, `generate_manifest_number(org_id)`, `get_today_pte_totals(org_id)`, `_compute_manifest_ptes(org_id, start, end)`, `update_system_health_metrics`.
- **Triggers**: 47 tables share `update_updated_at_column`. Business-logic triggers include audit triggers on clients/pickups/manifests/invoices; `update_client_stats_on_pickup_completion`; `update_workflow_on_pickup_completion`; `on_auth_user_created_org` + `_link_client` + `_link_hauler` on `auth.users`.
- **pg_cron jobs (4 active)**: `analyze-pickup-patterns-daily` 02:00, `check-missing-pickups-daily` 08:00, `manifest-followup-automation` 07:00, `data-quality-scan` 08:00. All use `pg_net.http_post()` to invoke edge functions.
- **Extensions**: `pg_cron`, `pg_net`, `pg_trgm`. No `vector` extension yet — needed for V2 RAG.
- **Migration count**: ~338 files; naming inconsistent (315 use UUID format, 23 use bare timestamps). Consolidation parked in tech debt.

</details>

<details>
<summary>Agent C — Client-side compute & orchestration smells</summary>

- **Compute-heavy hooks**: `useDashboardData` (4 RPC + 2 queries + client aggregation), `useManifestHealthScan` (fetches 1000 manifests in-memory map-reduce), `useRawMaterialProjections` (loops 5000+ rows for PTE math), `useClientWorkflows`+`useActiveFollowups` (4 queries + 75% heuristic filtering).
- **Polling hooks**: `useSessionValidation` (10min, fine), `useAIInsights` (15min — could be Realtime), `useDriverWeeklyAssignments` (10sec! aggressive, 5-join query).
- **Orphan-risk mutation pipelines (no atomic transaction)**:
  - `useGenerateDropoffManifest`: 5-step pipeline; PDF gen at step 5 can fail after manifest INSERT at step 4 → orphaned manifest, retry fails on idempotency check.
  - `useUpdateAssignmentStatus`: workflow upsert silently fails on step 4; pickup marked completed but no followup created.
  - `useSchedulePickupWithDriver`: pickup + assignment without rollback; adjacent `useDriverSchedulePickup` already wraps in RPC `driver_schedule_pickup` — copy that pattern.
- **NEW tenant-safety smells (beyond the known list in TREADSET_BRAIN.md)**:
  - `useClientWorkflows`: no orgId filter, relies on RLS.
  - `useDataQualityFlags`: no orgId filter on both unresolved + resolved queries.
  - `useDriverWeeklyAssignments`: `driver_email ilike` lookup returns vehicles from any org with that driver email.
  - `useOperationalMetrics`: no orgId filter.
  - `markAsReviewed`: doesn't validate org membership before resolving flag.
- **Client-side "AI"**: no LLM calls direct from browser. All delegated to edge functions. Only static heuristic that should be learned: 75% followup threshold in `useActiveFollowups`.
- **Realtime smell**: `useRealtimeUpdates` has 6 Postgres Change subscriptions that mass-invalidate related queryKeys on any change → thundering herd.

</details>

<details>
<summary>Agent D — AI / webhook / scheduler census</summary>

- **AI surface (4-6 functions)**: all Google Gemini 2.5-Flash via Lovable AI gateway, `LOVABLE_API_KEY`. None use Anthropic. None implement prompt caching. None implement cost tracking. Models not right-sized (all Gemini Flash). `ai-route-optimizer` partially implemented.
- **Webhook inbound**: 1 — `resend-webhook` handles 6 event types (sent/delivered/opened/clicked/bounced/complained), writes to `email_events`, `email_bounces`, updates `client_invites`. **No HMAC signature verification.** Endpoint URL discovery = spoofed events.
- **Webhook outbound**: Resend API (email sends), Stripe API (payment intents/sessions). **No Stripe webhook receiver.** Payment status updates rely on polling `verify-payment`.
- **Scheduler**: 4 active pg_cron jobs. `vercel.json` has no `crons` key. No `.github/workflows/` directory. Edge functions with cron-shaped names (`compute-daily-metrics`, `check-manifest-reminders`, `archive-old-logs`, `cache-cleanup`, etc.) exist but are not wired to any scheduler in the repo.
- **Single biggest gap**: **Stripe webhook receiver missing.** Payment failures, late payments, disputes not detected server-side. Revenue reconciliation depends on dispatcher remembering to verify.

</details>

<details>
<summary>Agent E — Workflow runner pick</summary>

- **Primary: Vercel Workflow DevKit.** Step-billed, free tier covers projected 100-tenant load. Native TS `'use workflow'`/`'use step'` directives. Hooks for webhook-resume patterns. Tenant isolation enforced by `startTenantWorkflow(tenantId, fn, input)` helper + lint rule + RLS backstop.
- **Runner-up: Inngest.** Best-in-class per-tenant concurrency keys (`concurrency.key: 'event.data.tenantId'`). Defer until WDK guardrails prove insufficient.
- **Reject: n8n** (Sustainable Use License prohibits powering customer features), **Trigger.dev v4** (tag-based tenant scoping weaker than Inngest + WDK).
- **Keep: pg_cron** as free trigger only, never as runner.
- First 3 workflows to build: `manifestCompletionWorkflow` (PDF + email + state push + driver notify, atomic), `treadyCuratorNightlyWorkflow` (cluster escalations + Claude draft + persist), `stripeWebhookInvoiceWorkflow` (signed webhook → idempotent invoicing).

</details>

<details>
<summary>Agent F — MCP picks + native-vs-MCP for Tready</summary>

- **Install this week (5)**: Sentry, Mapbox, Stripe (Z-only), Resend (Z-only), Playwright. All hosted or fast-install, all green or yellow on tenant safety.
- **Already installed**: Supabase, Vercel, Gmail, Google Calendar, Google Drive.
- **Skip**: GitHub MCP (`gh` covers it), Slack (no team yet), Notion (no usage), Generic Postgres MCP (inferior to Supabase MCP).
- **Conditional**: Linear MCP (install only if Z uses Linear — no evidence in memory).
- **Anthropic Memory Tool primitive** (not an MCP server): use for V2+ per-user memory, filesystem mounted to org-scoped Supabase storage.
- **The trap**: never wire Supabase MCP into Tready — it runs as service-role and bypasses RLS. One bad prompt = cross-tenant breach.
- **MCP vs native tool-use for Tready: NATIVE.** Latency (no transport hop), per-tenant scoping (tool factory closes over orgId, model can't override), prompt-cache stability (tools array stable across requests), tool versioning (atomic deploys with the edge function). MCP is for Z's operator session, not the in-product copilot.

</details>

<details>
<summary>Agent G — Agentic framework pick for Tready</summary>

- **Pick: Vercel AI SDK v6.** Runs on Supabase Edge (Deno). First-class Anthropic prompt-caching breakpoints. `ToolLoopAgent` handles V1 loop natively. UI Message stream protocol carries custom data parts (the `highlight_ui` overlay event).
- **Runner-up: Mastra.** Strongest memory primitives (`resourceId` + `threadId`, working memory, semantic recall). Rejected as primary because it bundles its own runtime + Studio + storage opinions toward Node hosting. Revisit at V3 milestone.
- **Reject for V1**: LangGraph.js (overkill for linear loop, pay graph cost at V4 when HITL approval nodes appear), OpenAI Agents SDK (Anthropic second-class), CrewAI (Python), `claude-agent-sdk` (filesystem-shaped, not web-app shaped). Raw `@anthropic-ai/sdk` is the escape hatch.
- **Tool factory pattern**: every Tready call constructs tools per-request with org-scoped Supabase client closed over `organization_id`. Model cannot override.
- **Cache layout (top→bottom)**: static persona [BREAKPOINT 1] → UI map slice for current route [BREAKPOINT 2] → dynamic memory + KB hits + user message. Sonnet 4.6 + cache breakpoints ≈ 10% input cost on hits. Breakeven turn 2 in a 4-turn conversation.
- **Eval harness**: `tready_evals` table with 50 frozen Q+A+expected_tool_calls. Nightly cron re-runs each through `runTreadyTurn`, LLM judge scores, output to `tready_eval_runs`. ~3 days to build.

</details>

---

**End of roadmap. ~580 lines. Receiver: build session.**
