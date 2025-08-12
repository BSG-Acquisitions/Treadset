-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  brand_primary_color TEXT DEFAULT '#3b82f6',
  brand_secondary_color TEXT DEFAULT '#64748b',
  depot_lat NUMERIC DEFAULT 30.2672,
  depot_lng NUMERIC DEFAULT -97.7431,
  service_hours_start TIME DEFAULT '08:00:00',
  service_hours_end TIME DEFAULT '17:00:00',
  default_pte_rate NUMERIC(10,2) DEFAULT 25.00,
  default_otr_rate NUMERIC(10,2) DEFAULT 45.00,
  default_tractor_rate NUMERIC(10,2) DEFAULT 35.00,
  tax_rate NUMERIC(5,4) DEFAULT 0.0825,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'ops_manager', 'dispatcher', 'driver', 'sales');

-- Create users table (separate from auth.users for custom fields)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE, -- References auth.users but nullable for demo mode
  email TEXT NOT NULL,
  password_hash TEXT, -- For demo mode when DISABLE_AUTH=true
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_organization_roles junction table
CREATE TABLE public.user_organization_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Add organization_id to existing tables
ALTER TABLE public.clients ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.locations ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.pickups ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.vehicles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.assignments ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.invoices ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.payments ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.pricing_tiers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_organization_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organizations
CREATE POLICY "Users can view their own organizations" 
ON public.organizations 
FOR SELECT 
USING (
  id IN (
    SELECT uo.organization_id 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid() OR auth.uid() IS NULL
  )
);

CREATE POLICY "Admins can manage organizations" 
ON public.organizations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE uo.organization_id = organizations.id 
    AND uo.role = 'admin'
    AND (u.auth_user_id = auth.uid() OR auth.uid() IS NULL)
  )
);

-- Create RLS policies for users
CREATE POLICY "Users can view themselves and org members" 
ON public.users 
FOR SELECT 
USING (
  auth_user_id = auth.uid() OR auth.uid() IS NULL OR
  id IN (
    SELECT DISTINCT u2.id
    FROM public.users u2
    JOIN public.user_organization_roles uo2 ON u2.id = uo2.user_id
    WHERE uo2.organization_id IN (
      SELECT uo.organization_id 
      FROM public.user_organization_roles uo
      JOIN public.users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage users in their org" 
ON public.users 
FOR ALL 
USING (
  auth.uid() IS NULL OR
  EXISTS (
    SELECT 1 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE uo.role = 'admin'
    AND u.auth_user_id = auth.uid()
  )
);

-- Create RLS policies for user_organization_roles
CREATE POLICY "Users can view roles in their orgs" 
ON public.user_organization_roles 
FOR SELECT 
USING (
  auth.uid() IS NULL OR
  organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage roles in their org" 
ON public.user_organization_roles 
FOR ALL 
USING (
  auth.uid() IS NULL OR
  EXISTS (
    SELECT 1 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE uo.organization_id = user_organization_roles.organization_id
    AND uo.role = 'admin'
    AND u.auth_user_id = auth.uid()
  )
);

-- Update existing table RLS policies to include organization scoping
-- First drop existing policies
DROP POLICY IF EXISTS "Allow all operations on clients" ON public.clients;
DROP POLICY IF EXISTS "Allow all operations on locations" ON public.locations;
DROP POLICY IF EXISTS "Allow all operations on pickups" ON public.pickups;
DROP POLICY IF EXISTS "Allow all operations on vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Allow all operations on assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow all operations on invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow all operations on payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all operations on pricing_tiers" ON public.pricing_tiers;

-- Create new organization-scoped policies
CREATE POLICY "Users can access data in their organizations" 
ON public.clients 
FOR ALL 
USING (
  auth.uid() IS NULL OR organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can access data in their organizations" 
ON public.locations 
FOR ALL 
USING (
  auth.uid() IS NULL OR organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can access data in their organizations" 
ON public.pickups 
FOR ALL 
USING (
  auth.uid() IS NULL OR organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can access data in their organizations" 
ON public.vehicles 
FOR ALL 
USING (
  auth.uid() IS NULL OR organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can access data in their organizations" 
ON public.assignments 
FOR ALL 
USING (
  auth.uid() IS NULL OR organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can access data in their organizations" 
ON public.invoices 
FOR ALL 
USING (
  auth.uid() IS NULL OR organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can access data in their organizations" 
ON public.payments 
FOR ALL 
USING (
  auth.uid() IS NULL OR organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

CREATE POLICY "Users can access data in their organizations" 
ON public.pricing_tiers 
FOR ALL 
USING (
  auth.uid() IS NULL OR organization_id IN (
    SELECT uo.organization_id 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  )
);

-- Create default BSG organization and migrate existing data
INSERT INTO public.organizations (name, slug) VALUES ('BSG Logistics', 'bsg');

-- Get the BSG organization ID
DO $$
DECLARE
  bsg_org_id UUID;
BEGIN
  SELECT id INTO bsg_org_id FROM public.organizations WHERE slug = 'bsg';
  
  -- Update all existing records to belong to BSG
  UPDATE public.clients SET organization_id = bsg_org_id WHERE organization_id IS NULL;
  UPDATE public.locations SET organization_id = bsg_org_id WHERE organization_id IS NULL;
  UPDATE public.pickups SET organization_id = bsg_org_id WHERE organization_id IS NULL;
  UPDATE public.vehicles SET organization_id = bsg_org_id WHERE organization_id IS NULL;
  UPDATE public.assignments SET organization_id = bsg_org_id WHERE organization_id IS NULL;
  UPDATE public.invoices SET organization_id = bsg_org_id WHERE organization_id IS NULL;
  UPDATE public.payments SET organization_id = bsg_org_id WHERE organization_id IS NULL;
  UPDATE public.pricing_tiers SET organization_id = bsg_org_id WHERE organization_id IS NULL;
END $$;

-- Make organization_id NOT NULL after migration
ALTER TABLE public.clients ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.locations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.pickups ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.vehicles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.assignments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.payments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.pricing_tiers ALTER COLUMN organization_id SET NOT NULL;

-- Create function to get user's current organization
CREATE OR REPLACE FUNCTION public.get_current_user_organization(org_slug TEXT DEFAULT 'bsg')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  org_id UUID;
  user_in_org BOOLEAN := false;
BEGIN
  -- If auth is disabled, return the org by slug
  IF auth.uid() IS NULL THEN
    SELECT id INTO org_id FROM public.organizations WHERE slug = org_slug;
    RETURN org_id;
  END IF;
  
  -- Get the organization ID
  SELECT id INTO org_id FROM public.organizations WHERE slug = org_slug;
  
  -- Check if user belongs to this organization
  SELECT EXISTS(
    SELECT 1 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE uo.organization_id = org_id 
    AND u.auth_user_id = auth.uid()
  ) INTO user_in_org;
  
  -- If user is not in the org, return their first organization
  IF NOT user_in_org THEN
    SELECT uo.organization_id INTO org_id
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
    LIMIT 1;
  END IF;
  
  RETURN org_id;
END;
$$;

-- Create function to check user roles
CREATE OR REPLACE FUNCTION public.user_has_role(user_role app_role, org_slug TEXT DEFAULT 'bsg')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- If auth is disabled, return true
  IF auth.uid() IS NULL THEN
    RETURN true;
  END IF;
  
  SELECT id INTO org_id FROM public.organizations WHERE slug = org_slug;
  
  RETURN EXISTS(
    SELECT 1 
    FROM public.user_organization_roles uo
    JOIN public.users u ON uo.user_id = u.id
    WHERE uo.organization_id = org_id 
    AND uo.role = user_role
    AND u.auth_user_id = auth.uid()
  );
END;
$$;

-- Create trigger to update timestamps
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();