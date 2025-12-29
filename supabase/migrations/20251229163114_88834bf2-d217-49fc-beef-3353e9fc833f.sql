-- Add tracking columns to client_invites
ALTER TABLE public.client_invites 
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Create email_events table for detailed tracking
CREATE TABLE IF NOT EXISTS public.email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id UUID REFERENCES public.client_invites(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('open', 'click', 'reminder_sent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

-- Create policy for organization access using user_organization_roles
CREATE POLICY "Users can view email events for their organization"
ON public.email_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_invites ci
    JOIN public.user_organization_roles uor ON uor.organization_id = ci.organization_id
    WHERE ci.id = email_events.invite_id
    AND uor.user_id = auth.uid()
  )
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_events_invite_id ON public.email_events(invite_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON public.email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_client_invites_reminder ON public.client_invites(created_at, opened_at, reminder_count) WHERE used_at IS NULL;