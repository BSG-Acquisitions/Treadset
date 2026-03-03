

## Current State of Jody's Account

Here's what exists right now:

| Item | Status |
|------|--------|
| Auth user in Supabase | `00ddb4a3` — exists, can log in |
| `public.users` record (BSG) | `55967bd4` — linked to auth, has `first_name: Jody`, role: `driver` in BSG |
| `public.users` record (duplicate) | `8e948bf3` — NO auth link, role: `admin` in "New Company" (orphan from signup) |
| `semi_hauler` capability | Granted on `55967bd4` |
| Vehicle assigned | **NONE** — no vehicle has `driver_email = albanylogisticsllc@gmail.com` |

**Jody IS an authorized Supabase auth user AND an employee in BSG.** The auth-to-user link is correct. The problem is:

1. **No vehicle assigned** — the driver assignment system can't find him
2. **Redirect goes to `/routes/driver`** (empty pickup routes page) instead of `/driver/dashboard`
3. **No "Trailer Assignments" button** on the Driver Dashboard for `semi_hauler` drivers
4. **Orphan duplicate** user record (`8e948bf3`) should be cleaned up

## Plan

### 1. Create a vehicle for Jody (SQL in Supabase)
```sql
INSERT INTO vehicles (name, capacity, license_plate, is_active, driver_email, 
  assigned_driver_id, organization_id)
VALUES ('Truck 003 - Jody Green', 500, 'BSG-003', true, 
  'albanylogisticsllc@gmail.com', '55967bd4-e590-4760-8224-2a6cfd58ae59', 
  'ba2e9dc3-ecc6-4b73-963b-efe668a03d73');
```

### 2. Fix driver redirect — `src/pages/Index.tsx`
Change line 57: redirect pure drivers to `/driver/dashboard` instead of `/routes/driver`. This ensures Jody (and all pure drivers) land on the proper driver dashboard.

### 3. Add "Trailer Assignments" button — `src/pages/DriverDashboard.tsx`
- Import `useHasSemiHaulerCapability`
- Add a conditional "Trailer Assignments" quick action button linking to `/driver/trailer-assignments` (same pattern as the existing Outbound button for `outbound_hauler`)

### 4. Clean up orphan duplicate user
Delete the orphan user record and its role to prevent confusion:
```sql
DELETE FROM user_organization_roles WHERE user_id = '8e948bf3-5ab1-4637-9d29-620b51306bb8';
DELETE FROM users WHERE id = '8e948bf3-5ab1-4637-9d29-620b51306bb8';
```

### Result
After these changes, when Jody logs in he will:
1. Land on the Driver Dashboard (not an empty routes page)
2. See a "Trailer Assignments" button linking to `/driver/trailer-assignments`
3. Be able to pick trailers, record events (pickup empty, drop full, swap), and track locations
4. Have the same manifest workflow as Brenner

