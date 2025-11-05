-- Secure cascade delete for pickups
-- Creates an RPC to safely delete a pickup and its related records
-- while validating the current user belongs to the pickup's organization.

CREATE OR REPLACE FUNCTION public.delete_pickup_cascade(p_pickup_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_user_in_org boolean := false;
BEGIN
  -- Ensure the pickup exists and get its organization
  SELECT organization_id INTO v_org_id
  FROM public.pickups
  WHERE id = p_pickup_id
  LIMIT 1;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Pickup not found';
  END IF;

  -- If authenticated, validate the user belongs to the org
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_organization_roles uo
      JOIN public.users u ON uo.user_id = u.id
      WHERE uo.organization_id = v_org_id
        AND u.auth_user_id = auth.uid()
    ) INTO v_user_in_org;

    IF NOT v_user_in_org THEN
      RAISE EXCEPTION 'Not authorized to delete this pickup';
    END IF;
  END IF;

  -- Unlink manifests instead of deleting
  UPDATE public.manifests
  SET pickup_id = NULL
  WHERE pickup_id = p_pickup_id;

  -- Delete related assignments
  DELETE FROM public.assignments
  WHERE pickup_id = p_pickup_id;

  -- Delete the pickup
  DELETE FROM public.pickups
  WHERE id = p_pickup_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_pickup_cascade(uuid) TO authenticated;