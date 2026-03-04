-- One-time notification cleanup: deduplicate and cap per-user volume

-- 1) Remove duplicates (keep newest per same user/org/type/title/related_id)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, organization_id, type, title, COALESCE(related_id::text, '')
      ORDER BY created_at DESC
    ) AS rn
  FROM public.notifications
)
DELETE FROM public.notifications n
USING ranked r
WHERE n.id = r.id
  AND r.rn > 1;

-- 2) Keep only the most recent 500 notifications per user
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC
    ) AS rn
  FROM public.notifications
)
DELETE FROM public.notifications n
USING ranked r
WHERE n.id = r.id
  AND r.rn > 500;