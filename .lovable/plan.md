

## The Problem: No Dedicated Client Login

Right now, when a client goes to `app.treadset.co`, they see the **AppLanding** page — the TreadSet marketing splash with "Sign In" and "Request a Demo" buttons. If they click "Sign In", they land on `/auth`, which is the **internal staff login page**. After signing in there, they get redirected to `/dashboard` (the admin dashboard), not to `/client-portal`.

There is no client-specific login flow. A client with the `client` role who signs in at `/auth` gets sent to the dashboard, which they don't have access to — they'd hit an access denied wall and have no way to reach `/client-portal` without manually typing the URL.

## Fix Plan

### 1. Add post-login role-based redirect in `Auth.tsx`

After successful sign-in, check the user's roles. If the user has the `client` role (and not `admin`/`ops_manager`), redirect them to `/client-portal` instead of `/dashboard`. Same logic for the `useEffect` that auto-redirects already-authenticated users.

### 2. Add a client-facing login route at `/client-login`

Create a new page `src/pages/ClientLogin.tsx` — a streamlined login page branded for clients (TreadSet logo, "Client Portal" heading, no "Sign Up" tab since clients are invite-only). On successful auth, always redirects to `/client-portal`.

### 3. Register the route in `App.tsx`

Add `/client-login` as a public route pointing to the new `ClientLogin` page.

### 4. Update edge function invite emails

In `send-portal-invitation/index.ts` and `send-portal-invitation-drip/index.ts`, update the email template so the "Sign in to your portal" / return login link points to `https://app.treadset.co/client-login` instead of just `/auth`. This gives clients a clean, dedicated URL to bookmark.

### Summary

| Change | File(s) | Purpose |
|--------|---------|---------|
| Role-based redirect after login | `src/pages/Auth.tsx` | Clients who use `/auth` still land in the right place |
| New client login page | `src/pages/ClientLogin.tsx` (new) | Clean, dedicated login for clients at `/client-login` |
| Register route | `src/App.tsx` | Make `/client-login` accessible |
| Update invite emails | Edge functions for portal invitations | Give clients the correct login URL to bookmark |

After this, you can tell clients: **"Go to app.treadset.co/client-login to access your portal."**

