-- Add trigger to link hauler accounts when they sign up with invitation email

CREATE OR REPLACE FUNCTION public.link_hauler_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if a hauler exists with this email but no auth_user_id yet
  UPDATE public.haulers
  SET user_id = (
    SELECT id FROM public.users WHERE auth_user_id = NEW.id LIMIT 1
  )
  WHERE email = NEW.email 
    AND user_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.users WHERE id = haulers.user_id AND auth_user_id IS NOT NULL
    );
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_link_hauler ON auth.users;

-- Create trigger to run after user signup
CREATE TRIGGER on_auth_user_created_link_hauler
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.link_hauler_on_signup();
