

## Fix: Dispatcher driver dropdown is empty because of a second RLS gap

### Why "Assign Driver" is still empty for him

The `useSemiHaulerDrivers` hook does three separate Supabase reads, and **each** is filtered by RLS:

1. `driver_capabilities` where capability = `semi_hauler` — ✅ already fixed, dispatchers can read this
2. `public.users` for `id, first_name, last_name, email` of those drivers — ❌ likely blocked for dispatchers
3. `public.user_organization_roles` filtered by current org — ❌ may also be restricted

If step 2 returns zero rows for dispatchers (because RLS on `users` only lets them see themselves and admins/ops_managers see everyone), the dropdown is empty even though step 1 succeeded. That's why admins see Jody and dispatchers don't, on the same screen.

The vehicle dropdown works because `vehicles` has a more permissive RLS policy.

### What I'll do

**1. Audit the RLS policies on `public.users` and `public.user_organization_roles`**

I need to confirm exactly what dispatchers can currently SELECT on each table. Most likely findings:
- `users` SELECT policy allows admin/ops_manager to read all rows but not dispatcher
- `user_organization_roles` SELECT policy is similar

**2. Extend SELECT policies to include `dispatcher`**

Dispatchers need to read other users in their organization to assign them to routes — that's a core dispatch function. The fix is the same pattern as the previous migration: add `dispatcher` to the role list on the SELECT policy(ies), scoped to **the same organization only**.

Specifically:
- `public.users` SELECT: a dispatcher can read users that share at least one organization with them (not all users globally — keeps multi-tenant isolation intact)
- `public.user_organization_roles` SELECT: a dispatcher can read role rows for users in their own org

No changes to INSERT/UPDATE/DELETE — dispatchers still cannot create or modify users or roles.

**3. Harden the hook so this kind of failure is visible next time**

Update `src/hooks/useDriverCapabilities.ts` `useSemiHaulerDrivers` to log a clear warning when:
- Step 1 returns capability rows, but
- Step 2 returns zero matching users

That way if any future RLS regression silently empties the dropdown, we see it in the console immediately instead of debugging by phone again.

### Files touched

- New migration: extend SELECT policies on `public.users` and `public.user_organization_roles` to include `dispatcher`, scoped to same-organization rows only.
- `src/hooks/useDriverCapabilities.ts`: add a console warning when capabilities exist but user lookup returns empty (diagnostic only, no behavior change).

### What I am NOT changing

- No write permissions for dispatchers on `users` or `user_organization_roles`.
- No cross-organization access — dispatchers only see users in orgs they belong to.
- No frontend logic changes to the wizard itself.

### Verification after deploy

1. Coordinator logs out, logs back in.
2. Routes → Trailer Routes → Create Route → Assign Driver → **Jody Green appears**.
3. Same check on `EditTrailerRouteDialog`.
4. Admin view unchanged (no regression).
5. Coordinator still cannot edit users or change roles (write-side untouched).

### Out of scope

- Refactoring the 3-query hook into a single RPC. Worth doing eventually for performance and easier RLS reasoning, but not required to unblock him today.

