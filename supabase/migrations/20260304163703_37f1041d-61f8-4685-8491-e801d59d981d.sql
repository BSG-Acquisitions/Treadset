-- Purge old and read notifications to fix performance bloat
DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '14 days';
DELETE FROM notifications WHERE is_read = true;