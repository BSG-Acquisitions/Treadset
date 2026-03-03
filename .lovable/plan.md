

## Root Cause

Jody's `users` table record has a **mismatched `auth_user_id`**:
- Record has: `00ddb4a3-da9e-4c39-a8bf-0b585abbb39f`
- Actual auth user (from login): `6090e705-2081-4b11-b00c-36125cad4341`

Every API call querying `users WHERE auth_user_id = '6090e705...'` returns 0 rows. The app cannot find his roles, organization, or capabilities, so it falls through to the default admin-style dashboard.

## Fix

### 1. Update Jody's auth_user_id (SQL migration)
```sql
UPDATE users 
SET auth_user_id = '6090e705-2081-4b11-b00c-36125cad4341'
WHERE id = '55967bd4-e590-4760-8224-2a6cfd58ae59';
```

This single fix will make the entire chain work:
- `loadUserData` will find Jody's user record
- His `driver` role in BSG will be loaded
- The redirect logic will send him to `/driver/dashboard`
- His `semi_hauler` capability will be found
- The "Trailer Assignments" button will appear

No code changes needed -- the code changes from the previous edit (redirect to `/driver/dashboard`, Trailer Assignments button) are already in place. This is purely a data fix.

