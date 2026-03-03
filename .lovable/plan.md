
You hit this because the constraint you tried to add is the wrong one for your data model.

Root cause:
- `user_organization_roles` in your project is designed to allow multiple roles per user in the same org.
- You already have `UNIQUE (user_id, organization_id, role)`.
- Adding `UNIQUE (user_id, organization_id)` fails because users in BSG already have multiple roles (that duplicate pair is expected).

Plan to fix Jody onboarding (without breaking roles):

1) Stop trying to add `UNIQUE (user_id, organization_id)`.
2) Merge Jody’s new auth account into the existing BSG employee row.
3) Ensure `driver` role exists for that merged row.
4) Verify Jody now resolves to BSG in-app.

Run this SQL in Supabase SQL Editor:

```sql
BEGIN;

-- 1) Find IDs we need
WITH ids AS (
  SELECT
    (SELECT id
     FROM auth.users
     WHERE lower(email) = lower('albanylogisticsllc@gmail.com')
     ORDER BY created_at DESC
     LIMIT 1) AS live_auth_id,

    (SELECT u.id
     FROM public.users u
     JOIN public.user_organization_roles r ON r.user_id = u.id
     JOIN public.organizations o ON o.id = r.organization_id
     WHERE lower(u.email) = lower('albanylogisticsllc@gmail.com')
       AND o.name ILIKE '%BSG%'
     ORDER BY u.created_at ASC
     LIMIT 1) AS bsg_user_id
),
-- 2) Detach live auth id from any duplicate non-BSG user row(s)
detach_duplicates AS (
  UPDATE public.users u
  SET auth_user_id = NULL
  FROM ids
  WHERE u.auth_user_id = ids.live_auth_id
    AND u.id <> ids.bsg_user_id
  RETURNING u.id
)
-- 3) Attach live auth id to the BSG user row
UPDATE public.users u
SET
  auth_user_id = ids.live_auth_id,
  first_name = COALESCE(u.first_name, 'Jody'),
  last_name  = COALESCE(u.last_name, 'Green'),
  is_active  = TRUE
FROM ids
WHERE u.id = ids.bsg_user_id;

-- 4) Ensure driver role exists for BSG
INSERT INTO public.user_organization_roles (user_id, organization_id, role)
SELECT u.id, o.id, 'driver'::app_role
FROM public.users u
JOIN public.organizations o ON o.name ILIKE '%BSG%'
WHERE lower(u.email) = lower('albanylogisticsllc@gmail.com')
  AND u.auth_user_id IS NOT NULL
ON CONFLICT (user_id, organization_id, role) DO NOTHING;

COMMIT;
```

Verification query:

```sql
SELECT
  u.id,
  u.auth_user_id,
  u.email,
  u.first_name,
  u.last_name,
  o.name AS organization,
  r.role
FROM public.users u
LEFT JOIN public.user_organization_roles r ON r.user_id = u.id
LEFT JOIN public.organizations o ON o.id = r.organization_id
WHERE lower(u.email) = lower('albanylogisticsllc@gmail.com')
ORDER BY u.created_at DESC, o.name, r.role;
```

Expected result:
- One auth-linked Jody row (`auth_user_id` not null) with BSG + `driver`.
- No need for the `(user_id, organization_id)` unique constraint.

Technical note:
- Keep the existing unique key: `(user_id, organization_id, role)`.
- Your edge function/UI inserts role arrays, so one-role-per-org uniqueness would break employee role assignment.

<lov-actions>
<lov-link url="https://supabase.com/dashboard/project/wvjehbozyxhmgdljwsiz/sql/new">Open Supabase SQL Editor</lov-link>
<lov-suggestion message="Test this end-to-end: log in as Jody on app.treadset.co, confirm he can see BSG data, and record a trailer hook/take event.">Verify onboarding end-to-end</lov-suggestion>
<lov-suggestion message="Clean up duplicate employee rows for any other emails that have multiple public.users records so auth mapping stays reliable.">Clean duplicate employee records</lov-suggestion>
<lov-suggestion message="Add an admin-only 'Fix employee auth link' action in the app that safely re-links auth.users to the correct public.users row by email.">Add employee auth-link repair tool</lov-suggestion>
</lov-actions>
