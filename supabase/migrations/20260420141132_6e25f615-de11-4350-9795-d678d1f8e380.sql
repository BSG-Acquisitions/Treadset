-- Unschedule the automated Monday bulk outreach email job
-- Staff will now send outreach emails manually per-client via the FollowupWorkflows dashboard widget
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-monday-pickup-reminders') THEN
    PERFORM cron.unschedule('weekly-monday-pickup-reminders');
  END IF;
END $$;