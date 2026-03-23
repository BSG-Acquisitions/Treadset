

## Fix Multi-Tenant Email Branding & Deliverability

### What's Already Right
Most outreach/booking emails already dynamically use the org name from the database. The "Powered by TreadSet" footer pattern exists in 4 functions. This is the correct model — org brands the email, TreadSet gets a subtle footer credit.

### What Needs Fixing

#### 1. Fix 5 functions using `onboarding@resend.dev` (URGENT — emails hitting spam)
These functions send from a Resend sandbox domain. They need to use the verified `bsgtires.com` domain (and later `treadset.co` when verified):
- `send-team-invite`
- `resend-corrected-outreach`
- `send-invite-reminders`
- `send-weekly-pickup-reminders`
- `send-portal-invitation-drip`

Change from `onboarding@resend.dev` → `noreply@bsgtires.com` with dynamic org name.

#### 2. Replace hardcoded "BSG Tire Recycling" with dynamic org lookup in 7 functions
These functions don't fetch the org name — they hardcode BSG. When Granulum or another company uses TreadSet, their clients would get emails saying "BSG Tire Recycling":
- `send-manifest-email` — add org lookup from `manifest.organization_id`
- `send-portal-invitation` — add org lookup
- `send-client-team-invite` — add org lookup
- `send-invite-reminders` — add org lookup
- `send-weekly-pickup-reminders` — add org lookup
- `send-portal-invitation-drip` — add org lookup
- `public-contact-form` — this one can stay generic or use a passed org name

Each will query the `organizations` table using the available `organization_id` and use `org.name` as the sender display name.

#### 3. Add "Powered by TreadSet" footer to all email templates
Standardize the footer across all 18 functions. Every email gets:
```text
{OrgName} • Professional Services
Powered by TreadSet
```

#### 4. Sending domain strategy
For now, keep `bsgtires.com` since it's verified in Resend. Once `treadset.co` is verified in your Resend dashboard, we can switch all functions to `noreply@treadset.co` — this is better for multi-tenant because every org sends from the same verified domain with their name as the display name (e.g., `Granulum <noreply@treadset.co>`).

### Implementation Order
1. Fix the 5 `resend.dev` functions first (deliverability emergency)
2. Add dynamic org name to the 7 hardcoded functions
3. Add "Powered by TreadSet" footer to all remaining functions
4. Deploy all updated functions

### Files Modified
All 18 edge functions under `supabase/functions/` — each gets the same treatment: dynamic org name in `from`, consistent "Powered by TreadSet" footer, no more sandbox domain.

