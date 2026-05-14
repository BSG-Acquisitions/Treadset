---
name: treadset-stack
description: The actual wiring of Treadset — hosting, backend, integrations, domains, known landmines, and which assets break if disturbed. Load this whenever a Treadset task involves touching infrastructure, integrations, the database, edge functions, or deployment. Prevents fresh sessions from rebuilding what exists or clobbering what ships. Use this skill whenever a Treadset task touches code, data, edge functions, DNS, env vars, or any third-party service.
---

# Treadset Stack — Ground Truth

This file is the map. Update it when infrastructure changes. Any session that touches code or data reads this first. Never read around it.

> Status note: parts of this map are confirmed from prior diagnosis sessions; parts are pending verification by Claude Code in the repo. Items marked **(verify)** should be confirmed against the actual repo before being relied on. When a session confirms or corrects something here, update this file.

## What Treadset Is

Tire recycling manifest software for BSG Acquisitions / BSG Tire Recycling. Generates state-regulated EGLE hauling manifests. The product is `app.treadset.co`. Co-owned by Zachariah and Ethan Dunn.

## Hosting & Core Services

- **Vercel** — hosts the Treadset app. Custom domain `app.treadset.co`.
- **Supabase** — backend: database, auth, storage, and **edge functions**. The primary backend for the product.
- **GitHub** — the repo. Lovable's write-access to the repo was severed after the 2026-04-20 incident — Lovable can no longer push code.
- **GCP** — Google Maps / geocoding. **Billing ownership unverified (verify)** — geocoding calls may currently be billed to a personal card. High-priority unknown.
- **Mapbox** — mapping dependency (verify scope of use).
- **Resend** — transactional email.
- **Stripe** — payments.

## Lovable — Special Status

Lovable is no longer a code-push vendor (removed after the 2026-04-20 incident). But it is **not fully gone**:

- **Runtime dependency:** `LOVABLE_API_KEY` is wired into ~5 edge functions — `ai-assistant`, `generate-ai-insights`, `ai-route-optimizer`, `enhanced-route-optimizer`, `multi-trip-optimizer` (verify exact list against repo). Every AI feature calls Lovable AI at runtime.
- **`lovable-tagger`** may still be in `devDependencies` (verify).
- **Two marketing sites** — `bsgtires.com` and `treadset.co` — are hosted on Lovable as separate projects.

Whether to replace Lovable AI as a runtime LLM dependency (Anthropic direct, OpenAI, Vercel AI Gateway) is an open **Captain decision**, not an engineering call to make unilaterally.

## Domains & DNS

- **`treadset.co`** — registered at GoDaddy. DNS points at Vercel. Apex `treadset.co` (marketing/landing) is hosted on Lovable; `app.treadset.co` (the product) is on Vercel.
- **`bsgtires.com`** — registered at Bluehost. DNS points at Vercel.
- Both apex domains use the correct Vercel A record: **`216.198.79.1`**. The old IPs `76.76.21.21` and `185.158.133.1` are outdated — if they reappear in DNS, delete them.
- `www` CNAME records point to `cname.vercel-dns.com` — leave in place.
- Ethan owns both domains at GoDaddy and Bluehost.

## Critical Live Assets — Do Not Clobber

- **`bsgtires.com` is a production dependency, not just a marketing site.** Edge functions hardcode `bsgtires.com` URLs (e.g. `bsgtires.com/public-book`) in real customer-facing emails. If that site goes down or the URL changes, customer onboarding emails point at broken links. Treat changes to `bsgtires.com` as infrastructure changes.
- **Manifest data is state-regulated.** Any operation that touches the manifests table, PTE calculations, or tire categorization is compliance-adjacent. See `treadset-core`.
- **`delete-all-manifests` edge function** — was a live un-scoped destructive endpoint (the 2026-04-20 incident). Verify its current state before assuming it's safe; it should be deleted or super-admin + tenant-scoped.
- **70+ public edge functions** flagged as a security issue in the ownership audit — parked, not yet scoped. Don't expand the surface.

## Known Landmines

Documented in `REVIEWS/OWNERSHIP_TRANSFER.md`. Each is live until verified fixed:

- **Hardcoded super-admin email check** — a specific email string gates super-admin access.
- **Personal Gmail rendered to a production page** — a personal email address is visible in production UI.
- **`.env` tracked in git** — secrets may be in version control history.
- **`bsgtires.com` hardcoded in edge functions** — see above.
- **GCP billing ownership** — see above.

## The PTE Bug

Diagnosed, documented in `REVIEWS/MANIFEST_PTE_BUG.md`, **not yet fixed**. Semi tires (`tractor_count`) were miscategorized as OTR in manifest PDFs — labeled OTR at a 15× PTE multiplier instead of semi/commercial at 5×. Bug lives in the manifest generator (`useManifestIntegration.ts`, `ManifestDomain.ts`). Scope: 18 manifests, 13 clients, Dec 2025–Apr 2026, ~7,310 PTE overstated on regulated paperwork. The dropoff flow is the primary manifest creation path; commercial columns are never populated; `tractor_count` is effectively BSG's operational semi-tire column.

The code fix is understood. **Historical manifest remediation is a joint leadership decision pending Ethan's input** — not an engineering call.

## Email Addresses — Correct Usage

- `zachdevon@bsgtires.com` — Zachariah's BSG work email. Mailbox situation still being resolved.
- Personal Gmail addresses must never appear in Treadset-facing copy, data, or production UI. One currently does (see landmines) — that's a bug to fix, not a pattern to copy.

## On the Horizon

- Decide whether to replace Lovable AI as a runtime dependency
- Resolve the `zachdevon@bsgtires.com` mailbox situation
- Verify GCP billing ownership
- Three-audience training package (`TRAINING/developer/`, `TRAINING/ops/`, `TRAINING/leadership/`) — scoped, may need reframing given joint ownership rather than handoff
- Joint roadmap planning with Ethan

## Stale Context — Do Not Trust

- `REVIEWS/OWNERSHIP_TRANSFER.md` is framed as a handoff. Zachariah is staying on as co-owner — read it as an **architectural audit**, not a departure plan.
- Any prior session notes implying Lovable is fully removed are wrong — it's out of the build pipeline but still a runtime and hosting dependency.

Update this skill when infrastructure changes. When a **(verify)** item gets confirmed, replace the marker with the confirmed fact.
