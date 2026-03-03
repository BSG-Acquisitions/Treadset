

## Getting Jody Green Squared Away

### The Core Bug

The AuthContext correctly resolves Jody's `user.id` to her **`users` table PK** (`55967bd4...`). However, several hooks then incorrectly query `users` with `auth_user_id = user.id` — treating the users table PK as if it were the auth UUID. This causes repeated **406 errors** (0 rows returned with `.single()`).

Her auth UUID is `6090e705...`, her users table id is `55967bd4...`. The hooks are passing the wrong one.

### Affected Hooks

These hooks use `user.id` (from AuthContext) as `auth_user_id` when they should use it directly as the users table `id`:

1. **`useDriverCapabilities.ts`** — `useCurrentUserCapabilities` (line 44) and `useGrantCapability` (line 134)
2. **`useStopTrailerEvents.ts`** — `completeTrailerEvent` mutation (line 87)
3. **`useOutboundManifests.ts`** — multiple places (lines 60, 171, 346)
4. **`useEnhancedNotifications.ts`** — line 60
5. **`useStripePayment.ts`** — line 78
6. **`useIndependentHaulers.ts`** — line 78
7. **`useHaulerRelationships.ts`** — line 96

### The Fix

In each of these hooks, replace the pattern:
```typescript
// WRONG: user.id is already the users table PK
const { data: userData } = await supabase
  .from('users')
  .select('id')
  .eq('auth_user_id', user.id)  
  .single();
```

With simply using `user.id` directly, since it's already the internal users table ID. No extra lookup needed.

### Scope

- Fix all ~7 hooks that have this redundant (and broken) lookup pattern
- No database changes needed
- No edge function changes needed
- This will fix the 406 errors Jody is experiencing and ensure capabilities, trailer events, manifests, notifications, etc. all work correctly for her

