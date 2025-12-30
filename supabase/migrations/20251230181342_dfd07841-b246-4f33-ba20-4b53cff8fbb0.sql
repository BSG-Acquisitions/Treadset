-- Create contact_submissions table for storing contact form submissions
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public insert (for the contact form)
CREATE POLICY "contact_submissions_insert_public" 
ON public.contact_submissions 
FOR INSERT 
WITH CHECK (true);

-- Allow org members to view submissions
CREATE POLICY "contact_submissions_select" 
ON public.contact_submissions 
FOR SELECT 
USING (organization_id IN (
  SELECT uo.organization_id
  FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
));

-- Allow org members to update (mark as read)
CREATE POLICY "contact_submissions_update" 
ON public.contact_submissions 
FOR UPDATE 
USING (organization_id IN (
  SELECT uo.organization_id
  FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
  AND uo.role IN ('admin', 'ops_manager', 'sales')
));

-- Allow org members to delete
CREATE POLICY "contact_submissions_delete" 
ON public.contact_submissions 
FOR DELETE 
USING (organization_id IN (
  SELECT uo.organization_id
  FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
  AND uo.role IN ('admin', 'ops_manager')
));

-- Add status column to haulers for tracking application status
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'pending';

-- Update existing haulers to have 'approved' status if they're active
UPDATE public.haulers SET application_status = 'approved' WHERE is_active = true AND application_status IS NULL;
UPDATE public.haulers SET application_status = 'pending' WHERE is_active = false AND application_status IS NULL;