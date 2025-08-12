-- Pricing Engine Database Schema

-- Create enums
CREATE TYPE tire_category AS ENUM ('passenger', 'commercial_17_5_19_5', 'commercial_22_5', 'otr', 'other');
CREATE TYPE service_mode AS ENUM ('pickup', 'dropoff');
CREATE TYPE rim_status AS ENUM ('off', 'on', 'any');
CREATE TYPE price_source AS ENUM ('org_default', 'admin_manual', 'smart_suggested', 'client_override', 'location_override');
CREATE TYPE surcharge_type AS ENUM ('rim_on', 'after_hours', 'fuel', 'distance_band');
CREATE TYPE value_type AS ENUM ('flat', 'percent');

-- Pricing Tiers table
CREATE TABLE public.pricing_tiers_v2 (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  price_per_pte_pickup NUMERIC(10,2),
  price_per_pte_dropoff NUMERIC(10,2),
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Price Matrix table
CREATE TABLE public.price_matrix (
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
CREATE TABLE public.surcharge_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL,
  type surcharge_type NOT NULL,
  value_type value_type NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  when_expr JSONB, -- JSON logic expression
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  priority INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Client Pricing Overrides table
CREATE TABLE public.client_pricing_overrides (
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
CREATE TABLE public.location_pricing_overrides (
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
CREATE TABLE public.price_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  version_tag TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  changelog TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Enable RLS
ALTER TABLE public.pricing_tiers_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surcharge_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_pricing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_pricing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can access data in their organizations" ON public.pricing_tiers_v2
FOR ALL USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

CREATE POLICY "Users can access data in their organizations" ON public.price_matrix
FOR ALL USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

CREATE POLICY "Users can access data in their organizations" ON public.surcharge_rules
FOR ALL USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

CREATE POLICY "Users can access data in their organizations" ON public.client_pricing_overrides
FOR ALL USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

CREATE POLICY "Users can access data in their organizations" ON public.location_pricing_overrides
FOR ALL USING ((auth.uid() IS NULL) OR (organization_id IN (
  SELECT uo.organization_id FROM user_organization_roles uo
  JOIN users u ON uo.user_id = u.id
  WHERE u.auth_user_id = auth.uid()
)));

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

-- Create triggers for updated_at
CREATE TRIGGER update_pricing_tiers_v2_updated_at
  BEFORE UPDATE ON public.pricing_tiers_v2
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_price_matrix_updated_at
  BEFORE UPDATE ON public.price_matrix
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_surcharge_rules_updated_at
  BEFORE UPDATE ON public.surcharge_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_pricing_overrides_updated_at
  BEFORE UPDATE ON public.client_pricing_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_location_pricing_overrides_updated_at
  BEFORE UPDATE ON public.location_pricing_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_price_matrix_lookup ON public.price_matrix (organization_id, tire_category, service_mode, rim, effective_from, effective_to);
CREATE INDEX idx_client_overrides_lookup ON public.client_pricing_overrides (organization_id, client_id, tire_category, service_mode, rim);
CREATE INDEX idx_location_overrides_lookup ON public.location_pricing_overrides (organization_id, location_id, tire_category, service_mode, rim);
CREATE INDEX idx_surcharge_rules_active ON public.surcharge_rules (organization_id, is_active, effective_from, effective_to);

-- Seed BSG default pricing data
INSERT INTO public.price_matrix (organization_id, tire_category, service_mode, rim, unit_price, source, notes) VALUES
-- Get the BSG organization ID
((SELECT id FROM public.organizations WHERE slug = 'bsg'), 'passenger', 'pickup', 'off', 2.75, 'org_default', 'BSG Default - Passenger Pickup'),
((SELECT id FROM public.organizations WHERE slug = 'bsg'), 'passenger', 'dropoff', 'off', 2.50, 'org_default', 'BSG Default - Passenger Drop-off'),
((SELECT id FROM public.organizations WHERE slug = 'bsg'), 'commercial_22_5', 'pickup', 'off', 16.00, 'org_default', 'BSG Default - Commercial 22.5 Pickup'),
((SELECT id FROM public.organizations WHERE slug = 'bsg'), 'commercial_22_5', 'dropoff', 'off', 10.00, 'org_default', 'BSG Default - Commercial 22.5 Drop-off'),
((SELECT id FROM public.organizations WHERE slug = 'bsg'), 'commercial_17_5_19_5', 'pickup', 'off', 12.00, 'org_default', 'BSG Default - Commercial 17.5-19.5 Pickup (NEEDS CONFIRMATION)'),
((SELECT id FROM public.organizations WHERE slug = 'bsg'), 'commercial_17_5_19_5', 'dropoff', 'off', 8.00, 'org_default', 'BSG Default - Commercial 17.5-19.5 Drop-off (NEEDS CONFIRMATION)');

-- Update the records that need confirmation
UPDATE public.price_matrix SET needs_confirmation = TRUE 
WHERE tire_category = 'commercial_17_5_19_5' AND organization_id = (SELECT id FROM public.organizations WHERE slug = 'bsg');

-- Seed surcharge rules
INSERT INTO public.surcharge_rules (organization_id, name, type, value_type, value, when_expr, notes) VALUES
((SELECT id FROM public.organizations WHERE slug = 'bsg'), 'Passenger Rim Surcharge - Pickup', 'rim_on', 'flat', 5.00, '{"and": [{"==": [{"var": "service_mode"}, "pickup"]}, {"==": [{"var": "tire_category"}, "passenger"]}, {"==": [{"var": "rim"}, "on"]}]}', 'BSG Default - Rim surcharge for passenger pickup'),
((SELECT id FROM public.organizations WHERE slug = 'bsg'), 'Passenger Rim Surcharge - Drop-off', 'rim_on', 'flat', 4.00, '{"and": [{"==": [{"var": "service_mode"}, "dropoff"]}, {"==": [{"var": "tire_category"}, "passenger"]}, {"==": [{"var": "rim"}, "on"]}]}', 'BSG Default - Rim surcharge for passenger drop-off'),
((SELECT id FROM public.organizations WHERE slug = 'bsg'), 'Commercial Rim Surcharge - Pickup', 'rim_on', 'flat', 8.00, '{"and": [{"==": [{"var": "service_mode"}, "pickup"]}, {"in": [{"var": "tire_category"}, ["commercial_17_5_19_5", "commercial_22_5", "otr"]]}, {"==": [{"var": "rim"}, "on"]}]}', 'BSG Default - Rim surcharge for commercial pickup'),
((SELECT id FROM public.organizations WHERE slug = 'bsg'), 'Commercial Rim Surcharge - Drop-off', 'rim_on', 'flat', 6.00, '{"and": [{"==": [{"var": "service_mode"}, "dropoff"]}, {"in": [{"var": "tire_category"}, ["commercial_17_5_19_5", "commercial_22_5", "otr"]]}, {"==": [{"var": "rim"}, "on"]}]}', 'BSG Default - Rim surcharge for commercial drop-off');