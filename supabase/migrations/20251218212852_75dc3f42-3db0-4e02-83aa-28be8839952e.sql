-- Add opt-out tracking for portal invitation emails
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS portal_invite_opted_out BOOLEAN DEFAULT FALSE;

-- Add index for efficient querying of eligible clients for drip campaign
CREATE INDEX IF NOT EXISTS idx_clients_portal_drip_eligible 
ON public.clients (organization_id, is_active, email, user_id, portal_invite_opted_out) 
WHERE is_active = true AND email IS NOT NULL AND user_id IS NULL AND portal_invite_opted_out = false;