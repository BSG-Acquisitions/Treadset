-- Michigan Tire Reporting Schema Migration
-- Create comprehensive reporting system for Michigan scrap tire annual reports

-- 1. Create ENUM types for reporting
CREATE TYPE entity_kind AS ENUM (
  'generator',
  'hauler', 
  'collection_site',
  'processor',
  'end_user'
);

CREATE TYPE site_type AS ENUM (
  'yard',
  'facility', 
  'temporary',
  'portable_shred_site'
);

CREATE TYPE event_type AS ENUM (
  'portable_shredding',
  'on_site_processing',
  'sorting',
  'baling',
  'granulation',
  'tdf',
  'devulc'
);

CREATE TYPE material_form AS ENUM (
  'whole_off_rim',
  'on_rim',
  'semi',
  'otr',
  'shreds',
  'crumb',
  'baled',
  'tdf'
);

CREATE TYPE end_use AS ENUM (
  'reuse',
  'tdf',
  'crumb_rubberized',
  'civil_construction',
  'agriculture',
  'landfill',
  'export',
  'other'
);

CREATE TYPE direction AS ENUM (
  'inbound',
  'outbound',  
  'internal'
);

CREATE TYPE unit_basis AS ENUM (
  'pte',
  'tons',
  'cubic_yards',
  'semi',
  'otr',
  'sidewalls_pass',
  'sidewalls_semi',
  'shredded_pte',
  'crumbed_pte'
);

CREATE TYPE rounding_type AS ENUM (
  'none',
  'up',
  'down',
  'bankers'
);

CREATE TYPE report_status AS ENUM (
  'in_progress',
  'submitted',
  'locked'
);

-- 2. Create entities table (enhanced from existing clients)
CREATE TABLE public.entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  kind entity_kind NOT NULL,
  legal_name TEXT NOT NULL,
  dba TEXT,
  eg_number TEXT, -- Michigan Environmental Generator number
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  street_address TEXT,
  city TEXT,
  county TEXT,
  state TEXT DEFAULT 'MI',
  zip TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on entities
CREATE INDEX idx_entities_org_kind ON public.entities(organization_id, kind);
CREATE INDEX idx_entities_eg_number ON public.entities(eg_number) WHERE eg_number IS NOT NULL;

-- 3. Create locations table (enhanced from existing)
CREATE TABLE public.reporting_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  name TEXT NOT NULL,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  county TEXT NOT NULL,
  state TEXT DEFAULT 'MI',
  zip TEXT NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  site_type site_type NOT NULL DEFAULT 'facility',
  eg_site_id TEXT, -- Michigan site ID
  storage_capacity_cy NUMERIC, -- cubic yards
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_reporting_locations_entity ON public.reporting_locations(entity_id);
CREATE INDEX idx_reporting_locations_county ON public.reporting_locations(county);

-- 4. Create processing events table
CREATE TABLE public.processing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  facility_entity_id UUID NOT NULL REFERENCES public.entities(id),
  location_id UUID REFERENCES public.reporting_locations(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  event_type event_type NOT NULL,
  input_pte NUMERIC(12,2) NOT NULL DEFAULT 0,
  output_pte NUMERIC(12,2) NOT NULL DEFAULT 0,
  output_breakdown JSONB, -- {whole: 100, shreds: 200, crumb: 50, tdf: 150, steel: 25, fluff: 10}
  yield_loss_pte NUMERIC(12,2) DEFAULT 0,
  destination_entity_id UUID REFERENCES public.entities(id),
  destination_location_id UUID REFERENCES public.reporting_locations(id),
  end_use end_use,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_processing_events_org_date ON public.processing_events(organization_id, started_at);
CREATE INDEX idx_processing_events_facility ON public.processing_events(facility_entity_id);

-- 5. Create shipments table for tracking movements
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  manifest_id UUID, -- Reference to existing manifests table if applicable
  origin_entity_id UUID NOT NULL REFERENCES public.entities(id),
  destination_entity_id UUID NOT NULL REFERENCES public.entities(id),
  origin_location_id UUID REFERENCES public.reporting_locations(id),
  destination_location_id UUID REFERENCES public.reporting_locations(id),
  departed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  arrived_at TIMESTAMP WITH TIME ZONE,
  unit_basis unit_basis NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  quantity_pte NUMERIC(12,2) NOT NULL, -- Normalized to PTE
  material_form material_form NOT NULL,
  end_use end_use,
  direction direction NOT NULL,
  carrier TEXT,
  bol_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(manifest_id, origin_entity_id, destination_entity_id, departed_at) -- Prevent duplicates
);

CREATE INDEX idx_shipments_org_date ON public.shipments(organization_id, departed_at);
CREATE INDEX idx_shipments_direction ON public.shipments(direction);
CREATE INDEX idx_shipments_end_use ON public.shipments(end_use);

-- 6. Create conversion rules table
CREATE TABLE public.conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_from unit_basis NOT NULL,
  unit_to unit_basis NOT NULL,
  factor NUMERIC(18,8) NOT NULL,
  rounding rounding_type DEFAULT 'none',
  precedence SMALLINT DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(unit_from, unit_to)
);

-- 7. Create annual reports table
CREATE TABLE public.reports_annual (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  year INTEGER NOT NULL,
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  status report_status DEFAULT 'in_progress',
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID REFERENCES public.users(id),
  totals JSONB, -- Store computed totals
  exports JSONB, -- {csv_url, pdf_url}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, year, entity_id)
);

CREATE INDEX idx_reports_annual_org_year ON public.reports_annual(organization_id, year);

-- 8. Create monthly snapshots for audit trail
CREATE TABLE public.report_monthly_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  yyyymm INTEGER NOT NULL, -- 202501 format
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  rollups JSONB NOT NULL, -- Monthly aggregated data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, yyyymm, entity_id)
);

CREATE INDEX idx_monthly_snapshots_yyyymm ON public.report_monthly_snapshots(yyyymm);

-- 9. Create materialized views for performance
CREATE MATERIALIZED VIEW public.mv_monthly_entity_rollup AS
SELECT 
  EXTRACT(YEAR FROM p.pickup_date)::integer as year,
  EXTRACT(MONTH FROM p.pickup_date)::integer as month,
  c.id as entity_id,
  p.organization_id,
  SUM(COALESCE(p.pte_count, 0) + COALESCE(p.otr_count, 0) * 15 + COALESCE(p.tractor_count, 0) * 5) as inbound_pte,
  0 as outbound_pte, -- Will be updated when we track outbound
  jsonb_build_object(
    'whole_off_rim', SUM(COALESCE(p.pte_count, 0)),
    'semi', SUM(COALESCE(p.tractor_count, 0)),
    'otr', SUM(COALESCE(p.otr_count, 0))
  ) as by_form,
  jsonb_build_object() as by_end_use, -- To be enhanced
  jsonb_build_object() as by_destination, -- To be enhanced
  SUM(COALESCE(p.pte_count, 0) + COALESCE(p.otr_count, 0) * 15 + COALESCE(p.tractor_count, 0) * 5) / 89.0 as tons_any,
  SUM(COALESCE(p.pte_count, 0) + COALESCE(p.otr_count, 0) * 15 + COALESCE(p.tractor_count, 0) * 5) / 10.0 as cubic_yards_any
FROM public.pickups p
JOIN public.clients c ON p.client_id = c.id
WHERE p.status = 'completed'
GROUP BY 
  EXTRACT(YEAR FROM p.pickup_date),
  EXTRACT(MONTH FROM p.pickup_date),
  c.id,
  p.organization_id;

-- Create index on materialized view
CREATE INDEX idx_mv_monthly_rollup_year_entity ON public.mv_monthly_entity_rollup(year, entity_id);

-- Create processing summary materialized view
CREATE MATERIALIZED VIEW public.mv_processing_summary AS
SELECT 
  EXTRACT(YEAR FROM pe.started_at)::integer as year,
  pe.facility_entity_id as entity_id,
  pe.organization_id,
  SUM(CASE WHEN pe.event_type = 'portable_shredding' THEN pe.input_pte ELSE 0 END) as portable_shred_pte,
  SUM(CASE WHEN pe.event_type = 'on_site_processing' THEN pe.input_pte ELSE 0 END) as on_site_proc_pte,
  SUM(COALESCE(pe.yield_loss_pte, 0)) as yield_loss_pte
FROM public.processing_events pe
GROUP BY 
  EXTRACT(YEAR FROM pe.started_at),
  pe.facility_entity_id,
  pe.organization_id;

-- Create revenue summary materialized view
CREATE MATERIALIZED VIEW public.mv_revenue_summary AS
SELECT 
  EXTRACT(YEAR FROM p.pickup_date)::integer as year,
  c.id as entity_id,
  p.organization_id,
  SUM(COALESCE(p.computed_revenue, 0)) as total_revenue,
  jsonb_build_object(
    'pte', SUM(CASE WHEN p.pte_count > 0 THEN COALESCE(p.computed_revenue, 0) * (p.pte_count::numeric / NULLIF(COALESCE(p.pte_count, 0) + COALESCE(p.otr_count, 0) + COALESCE(p.tractor_count, 0), 0)) ELSE 0 END),
    'otr', SUM(CASE WHEN p.otr_count > 0 THEN COALESCE(p.computed_revenue, 0) * (p.otr_count::numeric / NULLIF(COALESCE(p.pte_count, 0) + COALESCE(p.otr_count, 0) + COALESCE(p.tractor_count, 0), 0)) ELSE 0 END),
    'tractor', SUM(CASE WHEN p.tractor_count > 0 THEN COALESCE(p.computed_revenue, 0) * (p.tractor_count::numeric / NULLIF(COALESCE(p.pte_count, 0) + COALESCE(p.otr_count, 0) + COALESCE(p.tractor_count, 0), 0)) ELSE 0 END)
  ) as revenue_by_material,
  AVG(COALESCE(p.computed_revenue, 0) / NULLIF(COALESCE(p.pte_count, 0) + COALESCE(p.otr_count, 0) * 15 + COALESCE(p.tractor_count, 0) * 5, 0)) as avg_rate_per_pte
FROM public.pickups p
JOIN public.clients c ON p.client_id = c.id
WHERE p.status = 'completed'
GROUP BY 
  EXTRACT(YEAR FROM p.pickup_date),
  c.id,
  p.organization_id;

-- 10. Insert Michigan conversion rules
INSERT INTO public.conversions (unit_from, unit_to, factor, precedence, notes) VALUES
  ('pte', 'pte', 1.0, 1, 'Base unit - Passenger Tire Equivalent'),
  ('semi', 'pte', 5.0, 10, '1 semi tire = 5 PTE'),
  ('otr', 'pte', 15.0, 10, '1 OTR tire = 15 PTE'),
  ('sidewalls_pass', 'pte', 0.25, 10, '4 passenger sidewalls = 1 PTE'),
  ('sidewalls_semi', 'pte', 1.25, 10, '4 semi sidewalls = 5 PTE (1.25 per sidewall)'),
  ('cubic_yards', 'pte', 10.0, 20, '1 cubic yard = 10 PTE'),
  ('tons', 'pte', 89.0, 5, 'Michigan: 1 ton = 89 PTE (PRECEDENCE RULE)'),
  ('pte', 'tons', 0.01123595505617977, 5, 'Michigan: 1 PTE = 1/89 tons'),
  ('shredded_pte', 'cubic_yards', 4.0, 30, '40 shredded PTE = 10 cubic yards'),
  ('crumbed_pte', 'cubic_yards', 6.3, 30, '63 crumbed PTE = 10 cubic yards')
ON CONFLICT (unit_from, unit_to) DO NOTHING;

-- 11. Create RLS policies
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports_annual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_monthly_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS for entities
CREATE POLICY "Org members can access entities" ON public.entities
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id IN (
      SELECT uo.organization_id 
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- RLS for reporting_locations
CREATE POLICY "Org members can access reporting locations" ON public.reporting_locations
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id IN (
      SELECT uo.organization_id 
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- RLS for processing_events
CREATE POLICY "Org members can access processing events" ON public.processing_events
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id IN (
      SELECT uo.organization_id 
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- RLS for shipments
CREATE POLICY "Org members can access shipments" ON public.shipments
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id IN (
      SELECT uo.organization_id 
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- RLS for reports_annual
CREATE POLICY "Org members can access annual reports" ON public.reports_annual
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id IN (
      SELECT uo.organization_id 
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- RLS for report_monthly_snapshots
CREATE POLICY "Org members can access monthly snapshots" ON public.report_monthly_snapshots
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id IN (
      SELECT uo.organization_id 
      FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- 12. Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_reporting_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_entity_rollup;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_processing_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_revenue_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create triggers to refresh views on data changes
CREATE OR REPLACE FUNCTION trigger_refresh_reporting_views()
RETURNS trigger AS $$
BEGIN
  -- Use pg_notify to trigger async refresh
  PERFORM pg_notify('refresh_reporting_views', '');
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add triggers for pickups changes
CREATE TRIGGER refresh_reporting_views_on_pickup_change
  AFTER INSERT OR UPDATE OR DELETE ON public.pickups
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_reporting_views();

-- Add triggers for processing events changes  
CREATE TRIGGER refresh_reporting_views_on_processing_change
  AFTER INSERT OR UPDATE OR DELETE ON public.processing_events
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_reporting_views();

-- 14. Create initial BSG entity from existing organization
INSERT INTO public.entities (organization_id, kind, legal_name, dba, contact_name, street_address, city, state, zip)
SELECT 
  id,
  'hauler'::entity_kind,
  name,
  name,
  'BSG Operations',
  '123 Main St', -- Default address
  'Austin',
  'TX', 
  '78701'
FROM public.organizations
WHERE slug = 'bsg'
ON CONFLICT DO NOTHING;