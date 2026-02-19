-- Delete orphaned notifications where user_id doesn't match any real users.id
DELETE FROM notifications 
WHERE user_id NOT IN (SELECT id FROM users)
AND user_id IS NOT NULL;