CREATE POLICY "Org members can delete trailer_events"
ON public.trailer_events
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT uo.organization_id
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (select auth.uid())
  )
);