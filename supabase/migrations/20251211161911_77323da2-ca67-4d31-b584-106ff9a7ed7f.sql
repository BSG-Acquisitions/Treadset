-- Add metadata column to notifications table for storing additional context
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

COMMENT ON COLUMN public.notifications.metadata IS 
'Additional context data for the notification (client_id, manifest_number, etc.)';