-- Step 1: Create atomic driver scheduling function
-- This handles both pickup and assignment in one transaction, bypassing RLS issues
CREATE OR REPLACE FUNCTION public.driver_schedule_pickup(
  p_client_id uuid,
  p_location_id uuid,
  p_organization_id uuid,
  p_pickup_date date,
  p_pte_count integer,
  p_otr_count integer,
  p_tractor_count integer,
  p_preferred_window text,
  p_notes text,
  p_vehicle_id uuid,
  p_driver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pickup_id uuid;
  v_assignment_id uuid;
  v_auth_user_id uuid;
  v_user_id uuid;
  v_has_role boolean;
BEGIN
  -- Get the auth user id
  v_auth_user_id := auth.uid();
  
  IF v_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get the user's internal id
  SELECT id INTO v_user_id
  FROM public.users
  WHERE auth_user_id = v_auth_user_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Verify user has an appropriate role in this organization
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_organization_roles uo
    WHERE uo.user_id = v_user_id
      AND uo.organization_id = p_organization_id
      AND uo.role = ANY(ARRAY['admin', 'ops_manager', 'dispatcher', 'driver']::app_role[])
  ) INTO v_has_role;
  
  IF NOT v_has_role THEN
    RAISE EXCEPTION 'User does not have permission to schedule pickups in this organization';
  END IF;
  
  -- Insert the pickup
  INSERT INTO public.pickups (
    client_id,
    location_id,
    organization_id,
    pickup_date,
    pte_count,
    otr_count,
    tractor_count,
    preferred_window,
    notes
  ) VALUES (
    p_client_id,
    p_location_id,
    p_organization_id,
    p_pickup_date,
    p_pte_count,
    p_otr_count,
    p_tractor_count,
    p_preferred_window,
    NULLIF(TRIM(p_notes), '')
  )
  RETURNING id INTO v_pickup_id;
  
  -- Insert the assignment
  INSERT INTO public.assignments (
    pickup_id,
    vehicle_id,
    driver_id,
    organization_id,
    scheduled_date,
    status
  ) VALUES (
    v_pickup_id,
    p_vehicle_id,
    p_driver_id,
    p_organization_id,
    p_pickup_date,
    'assigned'
  )
  RETURNING id INTO v_assignment_id;
  
  -- Return both IDs
  RETURN jsonb_build_object(
    'pickup_id', v_pickup_id,
    'assignment_id', v_assignment_id
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.driver_schedule_pickup TO authenticated;