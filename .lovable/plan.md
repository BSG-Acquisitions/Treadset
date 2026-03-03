

## Create and Deploy Rate Increase Email Function

### Step 1: Create edge function `send-rate-increase-email`

New file: `supabase/functions/send-rate-increase-email/index.ts`

- Accepts `{ organizationId, dryRun }` via POST
- Queries all active clients with emails from the BSG org (`ba2e9dc3...`)
- Filters out clients where `portal_invite_opted_out = true` or `client_email_preferences.can_receive_outreach = false`
- If `dryRun: true` — returns the recipient list (names + emails) without sending
- If `dryRun: false` — sends the branded HTML email via Resend with 200ms delay between sends, returns summary

Email details:
- **From:** `BSG Tire Recycling <noreply@bsgtires.com>`
- **Subject:** Important Pricing Update from BSG Tire Recycling
- **Body:** Professional notice about rate increase from $2.75 to $3.25 per tire, effective immediately
- **Branding:** Same green BSG style (`#1A4314`) as existing outreach emails
- **Footer:** Unsubscribe link + "Powered by TreadSet"

### Step 2: Register in config.toml

Add `[functions.send-rate-increase-email]` with `verify_jwt = false`.

### Step 3: Deploy and dry-run

After deployment, I'll invoke the function with `dryRun: true` so you can review the full recipient list before any emails go out.

