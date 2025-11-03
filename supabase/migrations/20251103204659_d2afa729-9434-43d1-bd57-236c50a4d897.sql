-- Extend notifications table with nullable fields for enhanced functionality
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS action_link TEXT,
ADD COLUMN IF NOT EXISTS role_visibility TEXT[];

-- Create index for priority-based queries
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority, created_at DESC);

-- Create index for role visibility
CREATE INDEX IF NOT EXISTS idx_notifications_role_visibility ON public.notifications USING GIN(role_visibility);

COMMENT ON COLUMN public.notifications.priority IS 'Urgency level: low, medium, high';
COMMENT ON COLUMN public.notifications.action_link IS 'Route path for quick action (e.g., /clients/123)';
COMMENT ON COLUMN public.notifications.role_visibility IS 'Array of roles that should see this notification';