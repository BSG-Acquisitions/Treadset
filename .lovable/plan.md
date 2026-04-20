

## Fix: Dispatchers can't see semi-hauler drivers in trailer route wizard

### Root cause

The RLS policy on `driver_capabilities` (`driver_capabilities_select`) only grants read access to:
- The user's own capability rows
- Users with role `admin` or `ops_manager`

Your dispatch coordinator has the `dispatcher` role only, so when the **Create Trailer Route** wizard calls `useSemiHaulerDrivers()`, Supabase RLS returns an empty array — Jody Green (and any other semi-hauler driver) is invisible to them. You see Jody because you're an admin.

This is the same pattern dispatchers need to do their job: assign drivers to routes. They must be able to read driver capabilities.

### What to change

**1. Database migration — extend the SELECT policy on `driver_capabilities`**

Drop and recreate `driver_capabilities_select` to include `dispatcher` alongside `admin` and `ops_manager`. Dispatchers get read-only — they still can't grant or revoke capabilities (the `driver_capabilities_manage` ALL policy stays admin/ops_manager only, which is correct).

New SELECT policy logic:
- A user can see their own capability rows, OR
- A user can see all rows if they hold role `admin`, `ops_manager`, **or `dispatcher`** in any org

**2. No frontend code changes needed**

`useSemiHaulerDrivers`, `TrailerRouteWizard`, and `EditTrailerRouteDialog` already work correctly — they just need the RLS policy to return rows.

### Why dispatcher and not also driver

Drivers don't create or assign trailer routes, so they don't need to see the full org's capability list. Dispatchers do — that's literally their job. Admin/ops_manager already have it.

### Files touched

- New migration: drop and recreate `driver_capabilities_select` policy with dispatcher added.

### Verification after deploy

- Dispatch coordinator logs out and back in (to refresh RLS context), opens **Routes → Trailer Routes → Create Route**, clicks **Assign Driver** — Jody Green appears.
- Same check on `EditTrailerRouteDialog` (edit an existing route's driver).
- Admins continue to see the same list (no regression).

### Out of scope (call out if needed later)

- The `useDrivers` and `useEmployees` hooks aren't affected — this is strictly the trailer/semi-hauler list.
- If you want dispatchers to *grant* the semi-hauler capability (Trailer Driver Management page), that's a separate change to the `driver_capabilities_manage` policy. Not included unless you want it.

