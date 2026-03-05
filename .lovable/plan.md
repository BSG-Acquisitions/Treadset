

## Client Portal Signup Issue: Wrong Domain in Invite Links

### What's happening

When your client clicked the "Set Up Your Portal Account" link in their invitation email, they were sent to `bsgtires.com/client-invite/...`. But based on your domain architecture, `bsgtires.com` is your **marketing site**, not your app. The actual app lives at `app.treadset.co`.

So your client landed on the wrong site entirely, which would show an error or "unsupported" message because the marketing site doesn't have the `/client-invite/:token` route.

### Root cause

In `supabase/functions/send-portal-invitation/index.ts` (line 137), the app URL is hardcoded to:
```
const appUrl = "https://bsgtires.com";
```

This same issue exists in several other edge functions that send emails with links:
- `send-portal-invitation/index.ts` -- `bsgtires.com`
- `send-portal-invitation-drip/index.ts` -- likely same
- `send-client-team-invite/index.ts` -- `bsgtires.com`
- `send-weekly-pickup-reminders/index.ts` -- `bsgtires.com`
- `send-client-outreach-email/index.ts` -- `bsgtires.com`
- `check-missing-pickups/index.ts` -- `bsgtires.com`
- `resend-corrected-outreach/index.ts` -- `bsgtires.com`

Additionally, in the client-side code, `ClientInvite.tsx` line 106 has `emailRedirectTo` pointing to `treadset.lovable.app` instead of `app.treadset.co`.

### Fix plan

1. **Update all edge functions** that generate app links: change `appUrl` from `"https://bsgtires.com"` to `"https://app.treadset.co"` in every edge function that builds invite URLs, booking URLs, or redirect links.

2. **Update `ClientInvite.tsx`**: Change the `emailRedirectTo` on line 106 from `https://treadset.lovable.app/client-portal` to `https://app.treadset.co/client-portal`.

3. **Update `ClientTeamInvite.tsx`**: Same `emailRedirectTo` fix (line 107).

4. **Update CORS headers** in the edge functions to include the missing Supabase client headers (`x-supabase-client-platform`, etc.) to prevent browser blocking.

### How to test the client portal yourself

You can test the full flow right now:
1. Go to a client's detail page in your dashboard
2. Click "Send Portal Invite" for a client (use your own email as a test)
3. Open the email and click the invite link
4. Complete the signup form
5. Verify you land on `/client-portal` and can see manifests

After the fix, the invite link will correctly go to `app.treadset.co/client-invite/...` instead of `bsgtires.com/client-invite/...`.

### For the client who already tried

Their invite token should still be valid (tokens last 30 days). Once we fix the URLs and redeploy the edge functions, you can either:
- Resend them a new invite (which will have the correct URL), or
- Manually send them the correct link: `https://app.treadset.co/client-invite/{their-token}`

