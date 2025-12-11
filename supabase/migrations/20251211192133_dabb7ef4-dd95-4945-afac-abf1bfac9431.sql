-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);