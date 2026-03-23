

## Standardize All Emails to treadset.co with Multi-Tenant Branding

### The Current State (Messy)

There are **18 edge functions** sending emails through Resend, using **4 different sender domains**:
- `noreply@bsgtires.com` — most functions (manifests, bookings, outreach, etc.)
- `onboarding@resend.dev` — team invites, weekly reminders, portal drip (Resend sandbox — likely hitting spam)
- `noreply@treadset.com` — password reset only
- `noreply@bsgtirerecycling.com` — public contact form

All emails are hardcoded with "BSG Tire Recycling" branding. No multi-tenant support — when Kyle at Granulum starts using TreadSet, his clients would get emails saying "BSG Tire Recycling."

No email domain is configured in Lovable's email system yet.

### What Needs to Happen

#### Phase 1: Set Up treadset.co Email Domain
- Configure `treadset.co` as the sending domain through Lovable's email settings
- This handles DNS (SPF, DKIM) verification for deliverability
- All emails will send from `noreply@treadset.co` (or a subdomain like `notify.treadset.co`)

#### Phase 2: Create a Shared Email Utility
Create a shared helper in `supabase/functions/_shared/email-sender.ts` that:
- Centralizes the sender address (`noreply@treadset.co`)
- Accepts org name for the "From" display name (e.g. `Granulum via TreadSet <noreply@treadset.co>`)
- Wraps every email in a consistent, professional template with:
  - Organization's name/branding at the top
  - "Powered by TreadSet" footer on every email
  - Consistent styling, responsive design
- Logs every send attempt for monitoring

#### Phase 3: Update All 18 Edge Functions
Replace every hardcoded `from:` and inline HTML template across all functions to use the shared utility:

| Functions (13 using bsgtires.com) | Change |
|---|---|
| send-manifest-email, send-client-outreach-email, send-booking-confirmation, process-booking-request, send-diagnostic-email, check-missing-pickups, send-rate-increase-email, send-test-outreach-email, generate-trailer-manifest, send-client-team-invite, send-portal-invitation | `from` → org name via TreadSet `<noreply@treadset.co>` |

| Functions (5 using resend.dev) | Change |
|---|---|
| send-invite-reminders, send-weekly-pickup-reminders, resend-corrected-outreach, send-team-invite, send-portal-invitation-drip | Same — plus fixes the sandbox domain issue |

| Other | Change |
|---|---|
| send-password-reset (treadset.com) | → treadset.co |
| public-contact-form (bsgtirerecycling.com) | → treadset.co |

#### Phase 4: Multi-Tenant Branding
Each email will dynamically brand based on the organization sending it:
- **From name**: `{Org Name} via TreadSet` (e.g. "Granulum via TreadSet")
- **Header**: Shows the org's name prominently
- **Footer**: "Powered by TreadSet" with TreadSet logo/link
- The sending domain stays `treadset.co` for all orgs (shared infrastructure)

#### Phase 5: Delivery Monitoring
- Leverage the existing `email_events` table and Resend webhook (`resend-webhook` function) to track delivered/bounced/complained
- Ensure every send logs to a central email log for audit
- The existing Email Health Dashboard shows success/bounce/complaint rates

### Technical Summary

| Item | Detail |
|---|---|
| Domain setup | Configure treadset.co via Lovable email settings dialog |
| Shared utility | `_shared/email-sender.ts` — centralized from address, template wrapper, logging |
| Functions to update | 18 edge functions |
| Branding model | `{OrgName} via TreadSet <noreply@treadset.co>` + "Powered by TreadSet" footer |
| Monitoring | Existing resend-webhook + email_events table + health dashboard |

This is a large but systematic change — each function gets the same treatment: swap the from address, wrap content in the branded template, use the shared utility. The result is every email from every org on TreadSet looks professional, sends from a verified domain, and is tracked for delivery.

