

## Fix password reset redirect + brand the emails

### Problem
1. Reset redirect URL is `treadset.lovable.app` but should be `app.treadset.co` per the custom domain routing strategy
2. Supabase default auth emails are unbranded — no TreadSet logo or styling, which confused Jody previously

### Plan

#### Step 1: Update redirect URL in AuthContext.tsx

Change the `productionUrl` in the `resetPassword` function from `https://treadset.lovable.app` to `https://app.treadset.co`.

**File: `src/contexts/AuthContext.tsx`** (line 454)
```typescript
const productionUrl = 'https://app.treadset.co';
```

#### Step 2: Brand the auth emails in Supabase Dashboard

This is a **manual step** — go to the Supabase Dashboard > Authentication > Email Templates and update:
- **Confirm signup** template — add TreadSet branding, green color scheme
- **Reset password** template — add TreadSet logo, branded styling
- **Magic link** template (if used)

These templates support HTML so you can match the green gradient branding from the existing `send-password-reset` edge function template.

Alternatively, if you want fully custom branded emails sent from your own domain (e.g., `noreply@treadset.co`), we can set up Lovable auth email templates with a custom sender domain. This requires DNS configuration.

#### Step 3: Verify Jody can reset and sign in

After updating the redirect URL, trigger a password reset for Jody's email to confirm:
- Email arrives (check spam)
- Link goes to `app.treadset.co/reset-password`
- He can set a new password and sign in

### Summary
One line changed in `AuthContext.tsx`. The rest is Supabase Dashboard email template branding (manual). No database changes needed.
