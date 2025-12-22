-- Add weekly reminder tracking columns to client_email_preferences
ALTER TABLE public.client_email_preferences 
ADD COLUMN IF NOT EXISTS last_weekly_reminder_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS weekly_reminder_enabled boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.client_email_preferences.last_weekly_reminder_at IS 'Timestamp of the last weekly Monday pickup reminder sent';
COMMENT ON COLUMN public.client_email_preferences.weekly_reminder_enabled IS 'Whether client receives weekly Monday pickup reminders';