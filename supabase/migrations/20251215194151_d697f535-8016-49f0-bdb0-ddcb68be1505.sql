-- Clean up existing duplicate notifications using row_number approach
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY user_id, title, type, DATE(created_at)
           ORDER BY created_at ASC
         ) as rn
  FROM notifications
  WHERE type IN ('missing_pickup', 'incomplete_manifest', 'trailer_alert')
)
DELETE FROM notifications 
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);