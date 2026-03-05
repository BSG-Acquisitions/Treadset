

## Critical Fix: Client Portal Showing Admin View to All Users

### The Problem

When a client signs up via the portal invite, they land on `/client-portal`. The page checks `hasRole('admin')` to decide which view to show. There are two scenarios that cause clients to see the admin view:

1. **Your case**: Your work email already has an `admin` role in the BSG org. When you signed up as a client test, the `claim_client_invite_token` function added the `client` role but your existing `admin` role persists. So `hasRole('admin')` returns true → admin view.

2. **Fallback bug**: If the user data query fails for any reason, `AuthContext` defaults to `roles: ['admin']`, which means ANY user who hits a load error gets admin access to the portal (and potentially the whole app).

### Fix Plan

**1. Fix `ClientPortal.tsx` — Check client role FIRST** (primary fix)

Instead of `isAdmin = hasRole('admin')`, the portal should check if the user came here as a client. The logic should be:
- If the user has the `client` role → always show client view (never admin view)
- Only show admin preview mode if user has admin/ops_manager role AND does NOT have the client role

```typescript
// Line 22 - Change from:
const isAdmin = hasRole('admin') || hasRole('ops_manager');
// To:
const isClient = hasRole('client');
const isAdmin = !isClient && (hasRole('admin') || hasRole('ops_manager'));
```

This single change ensures that any user with the `client` role always sees the client portal, even if they also happen to have admin (like your test).

**2. Fix `AuthContext.tsx` — Remove dangerous admin fallback** (security fix)

The fallback `roles: ['admin']` on lines ~148, ~162, ~189 is a major security risk. If the DB query fails, a user gets full admin access. Change all fallback instances from `roles: ['admin']` to `roles: []` (empty array). This means if role loading fails, the user sees nothing rather than everything.

There are 5 places in `AuthContext.tsx` where `roles: ['admin']` appears as a fallback — all need to change to `roles: []`.

**3. Fix the route protection** in `App.tsx`

The `/client-portal` route currently requires `roles={['admin', 'ops_manager', 'client']}`. With the empty-roles fallback fix, a client whose roles somehow fail to load would be locked out (which is correct and safe — they'd see "Access Denied" instead of admin data).

No change needed here — the current route protection is correct.

### Summary of Changes

| File | Change | Why |
|------|--------|-----|
| `src/pages/ClientPortal.tsx` | Check `hasRole('client')` first; if true, never show admin view | Prevents clients from seeing admin UI |
| `src/contexts/AuthContext.tsx` | Change all `roles: ['admin']` fallbacks to `roles: []` | Prevents accidental admin access on load failure |

### What happens after the fix
- **Your test client**: Will see the client portal view (manifests, PDFs) — not the admin picker
- **Real clients**: Same — always see client view
- **Admins visiting `/client-portal`**: Still see the preview mode (select a client to preview)
- **Load failures**: User sees "Access Denied" instead of getting admin access

