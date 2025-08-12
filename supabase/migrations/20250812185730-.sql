-- Create user preferences table for storing user settings
CREATE TABLE public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification preferences
  email_notifications BOOLEAN DEFAULT true,
  route_updates BOOLEAN DEFAULT true,
  client_alerts BOOLEAN DEFAULT true,
  system_maintenance BOOLEAN DEFAULT false,
  
  -- Appearance preferences
  dark_mode BOOLEAN DEFAULT false,
  reduced_motion BOOLEAN DEFAULT false,
  compact_layout BOOLEAN DEFAULT false,
  
  -- Security preferences
  two_factor_enabled BOOLEAN DEFAULT false,
  session_timeout BOOLEAN DEFAULT true,
  activity_logging BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get or create user preferences
CREATE OR REPLACE FUNCTION public.get_or_create_user_preferences(target_user_id UUID)
RETURNS public.user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  prefs public.user_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO prefs FROM public.user_preferences WHERE user_id = target_user_id;
  
  -- If no preferences exist, create default ones
  IF NOT FOUND THEN
    INSERT INTO public.user_preferences (user_id) VALUES (target_user_id)
    RETURNING * INTO prefs;
  END IF;
  
  RETURN prefs;
END;
$$;