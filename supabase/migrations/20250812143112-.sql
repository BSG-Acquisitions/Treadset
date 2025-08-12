-- Create pickups table
CREATE TABLE public.pickups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    pickup_date DATE NOT NULL,
    pte_count INTEGER DEFAULT 0,
    otr_count INTEGER DEFAULT 0,
    tractor_count INTEGER DEFAULT 0,
    preferred_window TEXT CHECK (preferred_window IN ('AM', 'PM', 'Any')),
    notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignments table
CREATE TABLE public.assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pickup_id UUID NOT NULL REFERENCES public.pickups(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    estimated_arrival TIMESTAMP WITH TIME ZONE,
    actual_arrival TIMESTAMP WITH TIME ZONE,
    sequence_order INTEGER,
    status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'en_route', 'arrived', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on pickups" ON public.pickups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_pickups_updated_at
    BEFORE UPDATE ON public.pickups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_pickups_client_id ON public.pickups(client_id);
CREATE INDEX idx_pickups_date ON public.pickups(pickup_date);
CREATE INDEX idx_assignments_vehicle_date ON public.assignments(vehicle_id, scheduled_date);
CREATE INDEX idx_assignments_pickup_id ON public.assignments(pickup_id);

-- Add depot coordinates to organizations (for now, hardcode Austin depot)
ALTER TABLE public.clients ADD COLUMN depot_lat DECIMAL(10,8) DEFAULT 30.2672;
ALTER TABLE public.clients ADD COLUMN depot_lng DECIMAL(11,8) DEFAULT -97.7431;