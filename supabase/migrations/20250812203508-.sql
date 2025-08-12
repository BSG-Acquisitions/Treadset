-- Pricing Engine Database Schema (Corrected)

-- Create enums
DO $$ BEGIN
    CREATE TYPE tire_category AS ENUM ('passenger', 'commercial_17_5_19_5', 'commercial_22_5', 'otr', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE service_mode AS ENUM ('pickup', 'dropoff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE rim_status AS ENUM ('off', 'on', 'any');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE price_source AS ENUM ('org_default', 'admin_manual', 'smart_suggested', 'client_override', 'location_override');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE surcharge_type AS ENUM ('rim_on', 'after_hours', 'fuel', 'distance_band');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE value_type AS ENUM ('flat', 'percent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Price Matrix table
CREATE TABLE IF NOT EXISTS public.price_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  tire_category tire_category NOT NULL,
  size_min_inches INTEGER,
  size_max_inches INTEGER,
  service_mode service_mode NOT NULL,
  rim rim_status NOT NULL DEFAULT 'any',
  unit_price NUMERIC(10,2) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  source price_source NOT NULL DEFAULT 'org_default',
  notes TEXT,
  needs_confirmation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Surcharge Rules table
CREATE TABLE IF NOT EXISTS public.surcharge_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  type surcharge_type NOT NULL,
  value_type value_type NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  when_expr JSONB,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Client Pricing Overrides table
CREATE TABLE IF NOT EXISTS public.client_pricing_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  client_id UUID NOT NULL,
  tire_category tire_category NOT NULL,
  size_min_inches INTEGER,
  size_max_inches INTEGER,
  service_mode service_mode NOT NULL,
  rim rim_status NOT NULL DEFAULT 'any',
  unit_price NUMERIC(10,2) NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Location Pricing Overrides table
CREATE TABLE IF NOT EXISTS public.location_pricing_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  location_id UUID NOT NULL,
  tire_category tire_category NOT NULL,
  size_min_inches INTEGER,
  size_max_inches INTEGER,
  service_mode service_mode NOT NULL,
  rim rim_status NOT NULL DEFAULT 'any',
  unit_price NUMERIC(10,2) NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Price Versions table
CREATE TABLE IF NOT EXISTS public.price_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  version_tag TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  changelog TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS on new tables
DO $$ BEGIN
  ALTER TABLE public.price_matrix ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.surcharge_rules ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.client_pricing_overrides ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.location_pricing_overrides ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.price_versions ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- Create RLS policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.price_matrix;
CREATE POLICY "Users can access data in their organizations" ON public.price_matrix
FOR ALL USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.surcharge_rules;
CREATE POLICY "Users can access data in their organizations" ON public.surcharge_rules
FOR ALL USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.client_pricing_overrides;
CREATE POLICY "Users can access data in their organizations" ON public.client_pricing_overrides
FOR ALL USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.location_pricing_overrides;
CREATE POLICY "Users can access data in their organizations" ON public.location_pricing_overrides
FOR ALL USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

DROP POLICY IF EXISTS "Users can access data in their organizations" ON public.price_versions;
CREATE POLICY "Users can access data in their organizations" ON public.price_versions
FOR ALL USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

-- Add pricing fields to pickups table
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS unit_price_pte NUMERIC(10,2);
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS unit_price_otr NUMERIC(10,2);
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS unit_price_tractor NUMERIC(10,2);
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS rim_surcharge_applied NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS surcharges_applied_json JSONB;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS resolved_price_source price_source;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS price_version_id UUID;
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS estimated_revenue NUMERIC(10,2);
ALTER TABLE public.pickups ADD COLUMN IF NOT EXISTS final_revenue NUMERIC(10,2);

-- Create triggers for updated_at (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_price_matrix_updated_at ON public.price_matrix;
CREATE TRIGGER update_price_matrix_updated_at
  BEFORE UPDATE ON public.price_matrix
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_surcharge_rules_updated_at ON public.surcharge_rules;
CREATE TRIGGER update_surcharge_rules_updated_at
  BEFORE UPDATE ON public.surcharge_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_pricing_overrides_updated_at ON public.client_pricing_overrides;
CREATE TRIGGER update_client_pricing_overrides_updated_at
  BEFORE UPDATE ON public.client_pricing_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_location_pricing_overrides_updated_at ON public.location_pricing_overrides;
CREATE TRIGGER update_location_pricing_overrides_updated_at
  BEFORE UPDATE ON public.location_pricing_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_matrix_lookup ON public.price_matrix (organization_id, tire_category, service_mode, rim, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_client_overrides_lookup ON public.client_pricing_overrides (organization_id, client_id, tire_category, service_mode, rim);
CREATE INDEX IF NOT EXISTS idx_location_overrides_lookup ON public.location_pricing_overrides (organization_id, location_id, tire_category, service_mode, rim);
CREATE INDEX IF NOT EXISTS idx_surcharge_rules_active ON public.surcharge_rules (organization_id, is_active, effective_from, effective_to);