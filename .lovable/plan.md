

## Problem

When you click "Client Portal" on bsgtires.com, you're already logged in as an admin on `app.treadset.co`. The `ClientLogin` page sees you're authenticated and immediately redirects you to `/client-portal`. But the `ClientPortal` page checks if you're a `client` — since you're an admin without a client account linked, it shows "No Client Account Found."

For a **new/unauthenticated visitor**, the flow actually works correctly — they'd see the login form. The issue is specifically about already-authenticated non-client users getting bounced through.

## Fix

### 1. `ClientLogin.tsx` — Only auto-redirect users with the `client` role

Currently it redirects **any** authenticated user to `/client-portal`. Change it to only auto-redirect if the user has the `client` role. Admins/staff who are already logged in should still see the login page (or get a message like "You're signed in as staff — go to the dashboard instead").

### 2. `ClientPortal.tsx` — Better fallback for non-client users

When a non-client, non-admin user hits `/client-portal`, instead of just "No Client Account Found", add a link back to `/client-login` or `/dashboard` depending on their role, so they aren't stuck.

| File | Change |
|------|--------|
| `src/pages/ClientLogin.tsx` | Only auto-redirect to `/client-portal` if user has `client` role; show dashboard link for staff |
| `src/pages/ClientPortal.tsx` | Add navigation options for non-client users (link to dashboard for staff, link to client-login for others) |

