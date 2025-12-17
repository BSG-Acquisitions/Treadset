-- Function to link client accounts when users sign up with matching email
CREATE OR REPLACE FUNCTION public.link_client_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_client_id uuid;
BEGIN
  -- Get the user id from our users table
  SELECT id INTO v_user_id 
  FROM public.users 
  WHERE auth_user_id = NEW.id 
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Find client with matching email that doesn't have a user yet
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE LOWER(email) = LOWER(NEW.email)
    AND user_id IS NULL
  LIMIT 1;
  
  -- If we found a matching client, link them
  IF v_client_id IS NOT NULL THEN
    UPDATE public.clients
    SET user_id = v_user_id
    WHERE id = v_client_id;
    
    -- Also add the client role if not already present
    INSERT INTO public.user_organization_roles (user_id, organization_id, role)
    SELECT v_user_id, c.organization_id, 'client'::app_role
    FROM public.clients c
    WHERE c.id = v_client_id
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (after insert)
DROP TRIGGER IF EXISTS on_auth_user_created_link_client ON auth.users;
CREATE TRIGGER on_auth_user_created_link_client
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_client_on_signup();