-- Create enums
CREATE TYPE public.client_type AS ENUM ('commercial', 'residential', 'industrial');

-- Create pricing_tiers table
CREATE TABLE public.pricing_tiers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    rate DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    notes TEXT,
    type client_type,
    tags TEXT[],
    sla_weeks INTEGER,
    pricing_tier_id UUID REFERENCES public.pricing_tiers(id),
    last_pickup_at TIMESTAMP WITH TIME ZONE,
    lifetime_revenue DECIMAL(10,2) DEFAULT 0,
    open_balance DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create locations table
CREATE TABLE public.locations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT,
    address TEXT NOT NULL,
    access_notes TEXT,
    pricing_tier_id UUID REFERENCES public.pricing_tiers(id),
    is_active BOOLEAN DEFAULT true,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicles table
CREATE TABLE public.vehicles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    license_plate TEXT,
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now - authentication needed later)
CREATE POLICY "Allow all operations on pricing_tiers" ON public.pricing_tiers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on locations" ON public.locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_pricing_tiers_updated_at
    BEFORE UPDATE ON public.pricing_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add validation constraint for notes length
ALTER TABLE public.clients ADD CONSTRAINT check_notes_length CHECK (length(notes) <= 2000);

-- Add indexes for performance
CREATE INDEX idx_clients_company_name ON public.clients(company_name);
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_type ON public.clients(type);
CREATE INDEX idx_clients_updated_at ON public.clients(updated_at DESC);
CREATE INDEX idx_locations_client_id ON public.locations(client_id);
CREATE INDEX idx_locations_active ON public.locations(is_active);

-- Insert sample data for testing
INSERT INTO public.pricing_tiers (name, description, rate) VALUES 
('Standard', 'Standard pricing tier', 50.00),
('Premium', 'Premium pricing tier', 75.00),
('Enterprise', 'Enterprise pricing tier', 100.00);

INSERT INTO public.clients (company_name, contact_name, email, phone, type, tags, sla_weeks, pricing_tier_id, last_pickup_at, lifetime_revenue, open_balance) VALUES 
('BSG Industries', 'John Smith', 'john@bsg.com', '+1-512-555-0123', 'commercial', '{"industrial", "priority"}', 2, (SELECT id FROM public.pricing_tiers WHERE name = 'Premium'), '2025-08-01'::timestamp, 15000.00, 2500.00),
('Eco Tire Co.', 'Jane Doe', 'jane@ecotire.com', '+1-214-555-0456', 'commercial', '{"retail", "eco-friendly"}', 3, (SELECT id FROM public.pricing_tiers WHERE name = 'Standard'), '2025-08-09'::timestamp, 8000.00, 0.00),
('Green Loop Recycling', 'Mike Johnson', 'mike@greenloop.com', '+1-254-555-0789', 'industrial', '{"recycling", "critical"}', 1, (SELECT id FROM public.pricing_tiers WHERE name = 'Enterprise'), '2025-08-03'::timestamp, 25000.00, 5000.00);