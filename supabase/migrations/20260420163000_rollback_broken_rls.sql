-- Rollback of the broken RLS policies added today in 20260420150803.
-- The two new SELECT policies it created each reference their own table inside
-- the USING clause:
--   * "Users can select own or staff select org members" on public.users
--     JOINs public.users in its EXISTS subquery.
--   * "Staff can view org member roles" on public.user_organization_roles
--     selects from public.user_organization_roles in its EXISTS subquery.
-- Postgres flags self-referential RLS as "infinite recursion detected in policy
-- for relation ..." (SQLSTATE 42P17), which errors every read of those tables
-- for any role whose path evaluates the recursive branch (super admin via OR
-- evaluation order, dispatcher, driver, and anything that JOINs users in a
-- downstream policy).
--
-- This migration:
--   1. Drops both recursive policies.
--   2. Restores the prior SELECT policy on public.users
--      ("Users can select own or admins select all").
--   3. Leaves public.user_organization_roles with the existing pre-today
--      policies, including the 20251112190902 emergency
--      "user_organization_roles_select_all_authenticated" policy that keeps
--      downstream RLS subqueries resolvable.
--
-- The driver_capabilities change from 20260420143913 is strictly a relaxation
-- (adds 'dispatcher' to the readers list) and is not touched here.

-- 1. Remove the recursive policy on public.users, then restore the prior one.
DROP POLICY IF EXISTS "Users can select own or staff select org members" ON public.users;
DROP POLICY IF EXISTS "Users can select own or admins select all" ON public.users;

CREATE POLICY "Users can select own or admins select all"
ON public.users
FOR SELECT
TO authenticated
USING (
  ((SELECT auth.uid()) = auth_user_id)
  OR public.user_has_role('admin'::app_role)
);

-- 2. Remove the recursive policy on public.user_organization_roles.
-- The existing "user_organization_roles_select",
-- "user_organization_roles_manage", and
-- "user_organization_roles_select_all_authenticated" policies remain in place
-- and continue to allow authenticated reads plus admin-only writes.
DROP POLICY IF EXISTS "Staff can view org member roles" ON public.user_organization_roles;
