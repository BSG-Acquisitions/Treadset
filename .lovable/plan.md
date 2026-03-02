

## The Problem

The employee update flow in `useUpdateEmployee` (line ~143 in `src/hooks/useEmployees.ts`) updates the `public.users` table but does **not** update the email in `auth.users`. Supabase Auth is what controls login credentials, so the login email is still the old typo.

## Fix

We need to update the `create-employee` edge function (or create a new `update-employee` edge function) to use `supabaseAdmin.auth.admin.updateUserById()` when the email changes. Since this requires the service role key, it must be done server-side.

### Option A — Quick fix for right now
Update the auth email directly via the Supabase dashboard: go to Authentication > Users, find the user with `dispatch@bsgtire.com`, and manually change it to `dispatch@bsgtires.com`.

### Option B — Permanent code fix (recommended)
Create an `update-employee` edge function that:
1. Accepts the employee ID and updated fields
2. Verifies the caller is an admin in the organization
3. Updates `public.users` (name, phone, etc.)
4. If email changed: calls `supabaseAdmin.auth.admin.updateUserById(authUserId, { email: newEmail })` to update the auth email
5. Updates roles if changed

Then update `useUpdateEmployee` in `src/hooks/useEmployees.ts` to call this edge function instead of directly updating the database.

### Changes

**New file: `supabase/functions/update-employee/index.ts`**
- Edge function that uses service role to update both `public.users` and `auth.users`
- Verifies caller has admin role in the target organization
- Handles email, name, phone, active status, and role updates

**Modified: `src/hooks/useEmployees.ts`**
- Change `useUpdateEmployee` mutation to call the new edge function via `supabase.functions.invoke('update-employee', ...)` instead of direct DB updates

### Immediate workaround
For right now, you can fix this user's login by going to the Supabase dashboard > Authentication > Users and changing the email from `dispatch@bsgtire.com` to `dispatch@bsgtires.com`.

