

## Fix: Add 'VOIDED' to manifests status check constraint

### Problem
The `manifests_status_check` constraint only allows: `DRAFT`, `IN_PROGRESS`, `AWAITING_SIGNATURE`, `AWAITING_PAYMENT`, `AWAITING_RECEIVER_SIGNATURE`, `COMPLETED`. The `useVoidManifest` hook sets status to `'VOIDED'`, which violates this constraint.

### Fix
Run a migration to drop and recreate the check constraint with `'VOIDED'` included:

```sql
ALTER TABLE public.manifests DROP CONSTRAINT manifests_status_check;
ALTER TABLE public.manifests ADD CONSTRAINT manifests_status_check 
  CHECK (status = ANY (ARRAY['DRAFT','IN_PROGRESS','AWAITING_SIGNATURE','AWAITING_PAYMENT','AWAITING_RECEIVER_SIGNATURE','COMPLETED','VOIDED']));
```

No code changes needed — the front-end already handles `'VOIDED'` correctly.

