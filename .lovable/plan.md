
# Fix RLS Policy Error for Inventory Products

## Root Cause

The error **"new row violates row-level security policy for table inventory_products"** is caused by a **user ID mismatch** in the database:

| Table | User ID | Email |
|-------|---------|-------|
| `auth.users` | `70c2f0d6-d1db-40ad-98fa-1def1c314b0d` | zachdevon@bsgtires.com |
| `users` | `1c39d6ae-c319-47a8-96ed-a58de61d13ee` | zachdevon@bsgtires.com |
| `user_organization_roles` | `1c39d6ae-c319-47a8-96ed-a58de61d13ee` | (linked to wrong user) |

The RLS policy checks `auth.uid()` (which returns `70c2f0d6...`) against `user_organization_roles.user_id` (which has `1c39d6ae...`), resulting in **no matching roles** being found.

## Solution

Update the `user_organization_roles` records to use the correct auth user ID. This requires a database migration.

## Migration Details

**File:** New migration

```sql
-- Fix user ID mismatch for zachdevon@bsgtires.com
-- The auth.users ID (70c2f0d6-d1db-40ad-98fa-1def1c314b0d) doesn't match
-- the user_organization_roles user_id (1c39d6ae-c319-47a8-96ed-a58de61d13ee)

-- First, ensure the correct auth user exists in the users table
INSERT INTO public.users (id, email, first_name, last_name, phone)
SELECT 
  '70c2f0d6-d1db-40ad-98fa-1def1c314b0d',
  'zachdevon@bsgtires.com',
  'Zachariah',
  'Devon',
  '7344156528'
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE id = '70c2f0d6-d1db-40ad-98fa-1def1c314b0d'
);

-- Copy the organization roles from the old user ID to the new auth user ID
INSERT INTO public.user_organization_roles (user_id, organization_id, role)
SELECT 
  '70c2f0d6-d1db-40ad-98fa-1def1c314b0d',
  organization_id,
  role
FROM public.user_organization_roles
WHERE user_id = '1c39d6ae-c319-47a8-96ed-a58de61d13ee'
ON CONFLICT (user_id, organization_id, role) DO NOTHING;
```

## What This Fixes

After running this migration:
- Your auth session ID will match entries in `user_organization_roles`
- RLS policies will correctly identify you as an `admin`
- You'll be able to create, edit, and delete inventory products

## Technical Notes

- The migration adds your roles to the correct user ID without removing the old entries (safe approach)
- Uses `ON CONFLICT DO NOTHING` to prevent duplicate key errors if partially run before
- This is a one-time data fix for the existing mismatch
