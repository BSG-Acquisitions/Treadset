-- Add user_id to clients table to link client accounts to their login
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id);

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Add RLS policy for clients to see their own client record
CREATE POLICY "clients_self_select"
ON public.clients
FOR SELECT
USING (
  user_id IN (
    SELECT u.id FROM users u WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

-- Add RLS policy for manifests so clients can view their own manifests
CREATE POLICY "manifests_client_select"
ON public.manifests
FOR SELECT
USING (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN users u ON c.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

-- Add RLS policy for pickups so clients can view their own pickups
CREATE POLICY "pickups_client_select"
ON public.pickups
FOR SELECT
USING (
  client_id IN (
    SELECT c.id FROM clients c
    JOIN users u ON c.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);