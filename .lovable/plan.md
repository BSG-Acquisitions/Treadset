

## The Issue

The dispatcher role is already allowed to access the `/clients` route (the `ProtectedRoute` in `App.tsx` at line 169 includes `'dispatcher'`). However, the **sidebar navigation** in `src/components/AppSidebar.tsx` does not include `'dispatcher'` in the roles for the Clients menu item — so the link is hidden from dispatchers even though they have permission to use the page.

The same applies to the permissions reference table in `src/components/settings/RolePermissionsCard.tsx`, which already correctly shows dispatchers can access Clients — so that's consistent with the route. Only the sidebar needs updating.

## Changes

**`src/components/AppSidebar.tsx`** — Add `'dispatcher'` to the `roles` array for the Clients nav item in **both** places it appears:

- Line 83 (scheduling section): `roles: ['admin', 'ops_manager', 'sales']` → `roles: ['admin', 'ops_manager', 'dispatcher', 'sales']`
- Line 134 (flat navigationItems): `roles: ['admin', 'ops_manager', 'sales']` → `roles: ['admin', 'ops_manager', 'dispatcher', 'sales']`

That's it — one file, two lines. The route permission and the permissions matrix already include dispatcher.

