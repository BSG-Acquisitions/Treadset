-- Trailer Asset Tracking System - Isolated from existing functionality

-- 1. Create enums for trailer system
CREATE TYPE public.trailer_status AS ENUM (
  'empty', 
  'full', 
  'staged', 
  'in_transit', 
  'waiting_unload'
);

CREATE TYPE public.trailer_event_type AS ENUM (
  'pickup_empty',
  'drop_empty', 
  'pickup_full',
  'drop_full',
  'swap',
  'stage_empty',
  'external_pickup',
  'external_drop',
  'waiting_unload'
);

CREATE TYPE public.trailer_route_status AS ENUM (
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

-- 2. Create trailer_vehicles table (separate from existing vehicles)
CREATE TABLE public.trailer_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'semi_truck',
  license_plate TEXT,
  vin TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, vehicle_number)
);

-- 3. Create trailers table
CREATE TABLE public.trailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trailer_number TEXT NOT NULL,
  current_location TEXT,
  current_location_id UUID REFERENCES public.locations(id),
  current_status trailer_status NOT NULL DEFAULT 'empty',
  last_event_id UUID,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, trailer_number)
);

-- 4. Create trailer_routes table (separate from existing routes)
CREATE TABLE public.trailer_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  driver_id UUID REFERENCES public.users(id),
  vehicle_id UUID REFERENCES public.trailer_vehicles(id),
  status trailer_route_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create trailer_route_stops table
CREATE TABLE public.trailer_route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.trailer_routes(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id),
  location_name TEXT,
  location_address TEXT,
  sequence_number INTEGER NOT NULL DEFAULT 1,
  contact_name TEXT,
  contact_phone TEXT,
  instructions TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create trailer_events table
CREATE TABLE public.trailer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trailer_id UUID NOT NULL REFERENCES public.trailers(id) ON DELETE CASCADE,
  route_id UUID REFERENCES public.trailer_routes(id),
  stop_id UUID REFERENCES public.trailer_route_stops(id),
  event_type trailer_event_type NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  location_name TEXT,
  driver_id UUID REFERENCES public.users(id),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Add last_event_id foreign key to trailers (after trailer_events exists)
ALTER TABLE public.trailers 
ADD CONSTRAINT trailers_last_event_fkey 
FOREIGN KEY (last_event_id) REFERENCES public.trailer_events(id);

-- 8. Create driver capabilities table for semi_hauler role
CREATE TABLE public.driver_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES public.users(id),
  UNIQUE(user_id, capability)
);

-- 9. Enable RLS on all new tables
ALTER TABLE public.trailer_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trailer_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trailer_route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trailer_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_capabilities ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for trailer_vehicles
CREATE POLICY "trailer_vehicles_select" ON public.trailer_vehicles
FOR SELECT USING (
  organization_id IN (
    SELECT uo.organization_id FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "trailer_vehicles_manage" ON public.trailer_vehicles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo.organization_id = trailer_vehicles.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
  )
);

-- 11. RLS Policies for trailers
CREATE POLICY "trailers_select" ON public.trailers
FOR SELECT USING (
  organization_id IN (
    SELECT uo.organization_id FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "trailers_manage" ON public.trailers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo.organization_id = trailers.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
  )
);

-- 12. RLS Policies for trailer_routes
CREATE POLICY "trailer_routes_select" ON public.trailer_routes
FOR SELECT USING (
  organization_id IN (
    SELECT uo.organization_id FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "trailer_routes_manage" ON public.trailer_routes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo.organization_id = trailer_routes.organization_id
    AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
  )
);

-- 13. RLS Policies for trailer_route_stops
CREATE POLICY "trailer_route_stops_select" ON public.trailer_route_stops
FOR SELECT USING (
  route_id IN (
    SELECT tr.id FROM trailer_routes tr
    WHERE tr.organization_id IN (
      SELECT uo.organization_id FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
    )
  )
);

CREATE POLICY "trailer_route_stops_manage" ON public.trailer_route_stops
FOR ALL USING (
  route_id IN (
    SELECT tr.id FROM trailer_routes tr
    WHERE EXISTS (
      SELECT 1 FROM user_organization_roles uo
      JOIN users u ON uo.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND uo.organization_id = tr.organization_id
      AND uo.role IN ('admin', 'ops_manager', 'dispatcher')
    )
  )
);

-- 14. RLS Policies for trailer_events
CREATE POLICY "trailer_events_select" ON public.trailer_events
FOR SELECT USING (
  organization_id IN (
    SELECT uo.organization_id FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "trailer_events_insert" ON public.trailer_events
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT uo.organization_id FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
);

-- 15. RLS Policies for driver_capabilities
CREATE POLICY "driver_capabilities_select" ON public.driver_capabilities
FOR SELECT USING (
  user_id IN (
    SELECT u.id FROM users u
    WHERE u.auth_user_id = (SELECT auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo.role IN ('admin', 'ops_manager')
  )
);

CREATE POLICY "driver_capabilities_manage" ON public.driver_capabilities
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = (SELECT auth.uid())
    AND uo.role IN ('admin', 'ops_manager')
  )
);

-- 16. Create indexes for performance
CREATE INDEX idx_trailers_org ON public.trailers(organization_id);
CREATE INDEX idx_trailers_status ON public.trailers(current_status);
CREATE INDEX idx_trailer_events_trailer ON public.trailer_events(trailer_id);
CREATE INDEX idx_trailer_events_route ON public.trailer_events(route_id);
CREATE INDEX idx_trailer_events_timestamp ON public.trailer_events(timestamp);
CREATE INDEX idx_trailer_routes_org ON public.trailer_routes(organization_id);
CREATE INDEX idx_trailer_routes_date ON public.trailer_routes(scheduled_date);
CREATE INDEX idx_trailer_routes_driver ON public.trailer_routes(driver_id);
CREATE INDEX idx_trailer_route_stops_route ON public.trailer_route_stops(route_id);
CREATE INDEX idx_trailer_vehicles_org ON public.trailer_vehicles(organization_id);
CREATE INDEX idx_driver_capabilities_user ON public.driver_capabilities(user_id);

-- 17. Create function to update trailer status from events
CREATE OR REPLACE FUNCTION public.update_trailer_from_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update trailer's last_event_id and status based on event type
  UPDATE public.trailers
  SET 
    last_event_id = NEW.id,
    current_status = CASE 
      WHEN NEW.event_type IN ('pickup_empty', 'drop_full', 'stage_empty') THEN 'empty'::trailer_status
      WHEN NEW.event_type IN ('pickup_full', 'drop_empty') THEN 'full'::trailer_status
      WHEN NEW.event_type = 'waiting_unload' THEN 'waiting_unload'::trailer_status
      WHEN NEW.event_type IN ('external_pickup', 'external_drop') THEN 'in_transit'::trailer_status
      ELSE current_status
    END,
    current_location = COALESCE(NEW.location_name, current_location),
    current_location_id = COALESCE(NEW.location_id, current_location_id),
    updated_at = now()
  WHERE id = NEW.trailer_id;
  
  RETURN NEW;
END;
$$;

-- 18. Create trigger to auto-update trailer on events
CREATE TRIGGER trailer_event_update_trigger
AFTER INSERT ON public.trailer_events
FOR EACH ROW
EXECUTE FUNCTION public.update_trailer_from_event();

-- 19. Create updated_at triggers
CREATE TRIGGER update_trailers_updated_at
BEFORE UPDATE ON public.trailers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trailer_vehicles_updated_at
BEFORE UPDATE ON public.trailer_vehicles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trailer_routes_updated_at
BEFORE UPDATE ON public.trailer_routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trailer_route_stops_updated_at
BEFORE UPDATE ON public.trailer_route_stops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();