-- Enable RLS on the conversions table and create proper policies
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow read access to conversions (conversion rates are typically public data)
CREATE POLICY "Allow read access to conversions" 
ON public.conversions 
FOR SELECT 
USING (true);

-- Only allow admin users to modify conversions
CREATE POLICY "Only admins can modify conversions" 
ON public.conversions 
FOR ALL 
USING (user_has_role('admin'::app_role))
WITH CHECK (user_has_role('admin'::app_role));