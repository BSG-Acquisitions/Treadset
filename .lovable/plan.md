

## Problem

`useDriverTrailerRoutes` has a redundant and broken user ID lookup. The auth context already provides the **internal** `users.id` (`55967bd4...`) as `user.id`. But the hook treats `user.id` as the Supabase **auth** ID and queries `users WHERE auth_user_id = user.id`, which returns no rows — so Jody sees nothing.

## Fix

In `src/hooks/useTrailerRoutes.ts`, simplify `useDriverTrailerRoutes` to use `user.id` directly as the `driver_id` filter, removing the unnecessary `users` table lookup:

**Before (lines 93-103):**
```ts
if (!user?.id) return [];
// Get the internal user id  ← unnecessary, user.id IS the internal id
const { data: userData } = await supabase
  .from('users').select('id').eq('auth_user_id', user.id).single();
if (!userData) return [];
// ...
.eq('driver_id', userData.id)
```

**After:**
```ts
if (!user?.id) return [];
// user.id is already the internal users table id
// ...
.eq('driver_id', user.id)
```

This is a single-file, ~8-line change. No database or migration changes needed.

