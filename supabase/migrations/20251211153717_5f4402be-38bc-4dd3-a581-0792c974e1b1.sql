-- Remove Manifest Follow-Up Alerts Beta System
-- Drop tables in correct order (followups references tasks)

DROP TABLE IF EXISTS manifest_followups CASCADE;
DROP TABLE IF EXISTS manifest_tasks CASCADE;
DROP TABLE IF EXISTS manifest_alerts CASCADE;