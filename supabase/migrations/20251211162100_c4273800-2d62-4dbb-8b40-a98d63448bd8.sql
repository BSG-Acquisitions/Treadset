-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow service role full access to notifications" ON public.notifications;

-- Create INSERT policy for service role (edge functions)
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT u.id FROM public.users u
    JOIN public.user_organization_roles uor ON u.id = uor.user_id
    WHERE uor.organization_id = notifications.organization_id
  )
);

-- Add DELETE policy for cleanup
CREATE POLICY "Service role can delete notifications"
ON public.notifications
FOR DELETE
TO service_role
USING (true);