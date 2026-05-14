---
name: treadset-core
description: Non-negotiable operating rules for every Treadset session. Load this first in any Claude or Claude Code session working on Treadset. Covers compliance discipline, diagnose-before-fix protocol, database safety, the joint-ownership decision model, and session continuity. Applies to all code, diagnosis, copy, and product decisions for Treadset. Use this skill whenever the user mentions Treadset, BSG, manifests, PTE, EGLE paperwork, tire recycling software, or any work on the Treadset repo — even if they don't explicitly name the skill.
---

# Treadset Core — The Non-Negotiables

These rules apply to every Treadset session regardless of the task. They override speed, elegance, and completeness. Violating them is a failure of the session, not a trade-off.

## What Treadset Is

Treadset is tire recycling manifest software serving BSG Acquisitions / BSG Tire Recycling. It generates **state-regulated EGLE hauling paperwork** — manifests that document tire quantities, haulers, and generators for Michigan environmental compliance. Accuracy and auditability carry real regulatory weight. A wrong number on a manifest is not a cosmetic bug; it is incorrect regulatory output.

## Ownership: Joint, not solo

Zachariah is an **equity shareholder** in Treadset alongside **Ethan Dunn** (BSG owner). Roadmap and product decisions are **joint calls**, not unilateral ones. This is the single biggest change from how the project used to run. Documents, plans, and "what should we build next" framing must reflect co-ownership — not a solo operator and not a handoff.

## Compliance-Adjacent: Escalate, don't ship

Treadset produces regulated paperwork. Any change that affects what appears on a manifest — categorization, multipliers, quantities, hauler/generator data, PTE math — is **compliance-adjacent**. Engineering fixes for compliance-adjacent issues are **held until leadership signs off**. That sign-off is now a joint call with Ethan, the same way the historical PTE bug remediation is waiting on him.

The rule: engineering can diagnose, document, and stage a compliance-adjacent fix. Engineering does not *ship* it without the joint leadership decision.

## Diagnose Before Fix — always

Every bug, every change of consequence, gets a **diagnosis-only pass before any code is touched**. The diagnosis is a separate output — a `REVIEWS/<TOPIC>.md` document — written before the fix is written. This is not optional and it is not bureaucracy: the PTE bug proved that a hotfix shipped before full scope was understood would have been wrong. A hotfix was explicitly pulled back once the real scope (18 manifests, 13 clients, 4 months) came into view.

If asked to "just fix it," the answer is: diagnose first, then fix against the diagnosis.

## No Autonomous Database Changes

Claude Code does **not** touch the Supabase database directly. It does not run migrations autonomously, it does not have database credentials, it does not execute destructive queries. Zachariah runs all Supabase queries himself — Claude Code's job is to tell him exactly what to run and why. No secrets get echoed in output; reference them by env var name only.

## Session Continuity: Append to REVIEWS/

Context starts cold every session. Findings from every session of consequence get appended to a document in `REVIEWS/`. The next session reads `REVIEWS/` first. This is how the project remembers — the PTE bug diagnosis, the ownership/architecture audit, every landmine — all live in `REVIEWS/`. A session that discovers something and doesn't write it down has lost the work.

## Never Custom When It Exists

Before writing new code of any length, check whether the repo already does 80% of the job. Treadset was assembled on Lovable and has more existing surface area than it looks. Rebuilding what exists is how you clobber what ships.

## Known Landmines — Do Not Trip

These are documented in `REVIEWS/OWNERSHIP_TRANSFER.md` (which given joint ownership is better understood as an architectural audit than a handoff doc). Treat each as live until verified fixed:

- Hardcoded super-admin email check
- A personal Gmail rendered to a production page
- `.env` tracked in git
- `bsgtires.com` hardcoded in edge functions as a **production dependency**, not just a marketing link
- Lovable AI still a live runtime dependency via `LOVABLE_API_KEY` in five edge functions
- GCP billing ownership unverified — geocoding may be billed to a personal card

See `treadset-stack` for the full infrastructure map.

## Foreman / Captain / CEO Model

Treadset sessions run on the Foreman model. Zachariah is the **Captain**. Claude is the **CEO**. Engineering decisions (library choices, table names, component structure, file organization) are Claude's — make them, don't send them to committee. **Captain decisions** (compliance impact, business direction, what to build next, historical-manifest remediation, pricing) involve leadership — and "leadership" now means Zachariah *and* Ethan jointly. See `treadset-captain` for how to communicate and surface decisions.

## Mandatory Session Ritual

Every Treadset session opens with: load `treadset-core`, `treadset-stack`, `treadset-captain`, `treadset-ship`. Read the relevant `REVIEWS/` documents. Confirm current branch and uncommitted work. Only then begin.

Every Treadset session closes with the Ship Report (see `treadset-ship`).
