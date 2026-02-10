

# Fix Auth Emails to Be Rock-Solid and Branded

## The Problems Found

1. **Password reset sends TWO emails** -- one from Supabase (working but unbranded) and one from Resend (branded but broken link with no token). This is why Jody's reset didn't work -- he likely clicked the branded email which had a dead link.

2. **Signup confirmation email is unbranded** -- Supabase sends its default template with no TreadSet branding.

3. **Signup redirect URL uses `window.location.origin`** -- in preview/dev environments, this generates a Lovable URL instead of `treadset.lovable.app`.

## The Fix

### 1. Remove the duplicate Resend email from password reset

Stop calling the `send-password-reset` edge function during password reset. Supabase's built-in `resetPasswordForEmail` already sends the email with the correct token. The branded Resend email was sending a link WITHOUT the token, which is why it broke for Jody.

**File: `src/contexts/AuthContext.tsx`**

Simplify `resetPassword` to only call `supabase.auth.resetPasswordForEmail` with the hardcoded production URL. Remove the `supabase.functions.invoke('send-password-reset', ...)` call entirely.

### 2. Brand Supabase's email templates in the dashboard

Since Supabase is sending the actual auth emails (password reset, signup confirmation), the branding needs to be configured in the Supabase Dashboard under **Authentication > Email Templates**. This is where you control the HTML that Supabase sends.

You'll need to update these templates in the Supabase Dashboard:
- **Confirm signup** -- add TreadSet logo, green branding, company name
- **Reset password** -- add TreadSet logo, green branding, company name
- **Magic link** (if used) -- same branding

This is a manual step done in the Supabase Dashboard, not in code.

### 3. Hardcode production URL for signup redirect

**File: `src/contexts/AuthContext.tsx`**

Change the `signUp` function to use the hardcoded production URL instead of `window.location.origin`:

```typescript
// Before (broken in preview):
const redirectUrl = `${window.location.origin}/`;

// After (always correct):
const redirectUrl = 'https://treadset.lovable.app/';
```

### 4. Fix client invite redirects too

**Files: `src/pages/ClientInvite.tsx` and `src/pages/ClientTeamInvite.tsx`**

Both use `window.location.origin` for `emailRedirectTo`. Change to hardcoded production URL:

```typescript
emailRedirectTo: 'https://treadset.lovable.app/client-portal'
```

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Remove Resend call from `resetPassword`; hardcode production URL in `signUp` |
| `src/pages/ClientInvite.tsx` | Hardcode production URL for `emailRedirectTo` |
| `src/pages/ClientTeamInvite.tsx` | Hardcode production URL for `emailRedirectTo` |

## Manual Step (Supabase Dashboard)

After the code changes, you'll need to go to **Supabase Dashboard > Authentication > Email Templates** and update the email templates with TreadSet branding (logo, green color scheme, company name). I'll provide the branded HTML templates for you to paste in.

## What This Fixes

- Password reset: one email, branded, working link with token -- user clicks it and lands on `treadset.lovable.app/reset-password` with their session ready
- Signup confirmation: branded email with TreadSet styling
- All redirect URLs point to production, never to Lovable preview URLs
- No more confusion from receiving two emails

## What Does NOT Change

- The `/reset-password` page itself (already fully branded with TreadSet logo)
- The `/auth` signup/login page (already working)
- Any existing user accounts or sessions
- Driver workflows, manifests, or any other functionality

