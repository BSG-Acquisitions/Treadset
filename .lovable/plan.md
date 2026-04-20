

## Fix the Monday Resend blast (BSG)

### What's actually happening

Every Monday at 8:00 AM ET, a database cron job named `weekly-monday-pickup-reminders` automatically fires the `send-weekly-pickup-reminders` Edge Function. That function loops through all 197 active BSG clients with email addresses and sends each one a "🗓️ Ready to schedule your tire pickup this week?" email via Resend (the "We Miss You" style email).

That single Monday burst exhausts the Resend daily/monthly send quota, which is why **manifest emails to clients silently fail for the rest of the week** — Resend rejects them as over-limit. This matches exactly what you're seeing.

### What I'll change

**1. Disable the Monday cron job (stops the blast immediately)**
- Run `cron.unschedule('weekly-monday-pickup-reminders')` in a migration so no automated bulk send ever fires again.
- The Edge Function `send-weekly-pickup-reminders` itself stays in place — we just stop it from being triggered automatically. Staff can still trigger individual outreach manually.

**2. Make the existing per-client "Send Email" the only path**
- The dashboard already has a `FollowupWorkflows` widget that lists clients due for follow-up with a one-click **Send Email** button per row (`src/components/workflows/FollowupWorkflows.tsx` → `useSendOutreachEmail` → `send-client-outreach-email`). This already exists and is exactly the "manual by staff" workflow you're asking for.
- No changes needed there — it's already manual, one client at a time, opt-in by staff click.

**3. Protect manifest emails from ever being throttled by outreach again**
- Add a hard guardrail in `send-weekly-pickup-reminders` and `send-client-outreach-email`: refuse to send if Resend's last response indicated rate limiting in the past hour, OR if more than N outreach emails have been sent in the current calendar day (configurable cap, default 25/day per org).
- This means even if someone re-enables a bulk job later, or staff click "Send Email" 200 times in a row, manifest sending stays protected.

**4. Add a clear UI banner if outreach is paused**
- In the `FollowupWorkflows` card, show a small notice: *"Automated weekly emails are off — staff sends manually."* So nobody wonders why Monday is quiet.

### Files touched

- **New migration**: unschedule the `weekly-monday-pickup-reminders` cron job.
- **`supabase/functions/send-weekly-pickup-reminders/index.ts`**: add a daily send cap + abort-if-recently-rate-limited check (defense-in-depth in case the function is invoked manually by mistake).
- **`supabase/functions/send-client-outreach-email/index.ts`**: same daily cap so manual clicks can't accidentally drain quota.
- **`src/components/workflows/FollowupWorkflows.tsx`**: small notice that automated sends are off + manual-only.

### What this does NOT change

- Manifest emails (`send-manifest-email`) — untouched, will start working reliably again on Tuesday-Sunday once Monday's blast is gone.
- The per-client manual outreach button — still works exactly as today.
- Client follow-up tracking, suppression lists, unsubscribe handling — all unchanged.
- Other cron jobs (`check-missing-pickups`, `manifest-followup-automation`, `analyze-pickup-patterns`, `data-quality-scan`) — unchanged; none of them blast bulk client emails.

### Why not just lower the limit / spread sends across the week

Two reasons:
1. You asked for manual-only, which is the right call — it gives BSG full control over outreach cadence and protects manifest deliverability absolutely.
2. Spreading bulk sends across the week still risks consuming the manifest quota on busy days. A hard cap + manual trigger eliminates that risk entirely.

### Optional follow-up (not in this plan unless you say yes)

- Move outreach to a dedicated Resend audience/domain so it can't ever share quota with manifests.
- Or: switch transactional manifest emails to Lovable Emails (built-in, separate quota from Resend) and leave Resend exclusively for outreach. Happy to scope this if you want long-term separation.

