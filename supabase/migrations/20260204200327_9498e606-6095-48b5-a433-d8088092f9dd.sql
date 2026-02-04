-- Create outbound_assignments table
CREATE TABLE public.outbound_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  destination_entity_id uuid NOT NULL REFERENCES entities(id),
  driver_id uuid REFERENCES users(id),
  vehicle_id uuid REFERENCES vehicles(id),
  scheduled_date date NOT NULL,
  material_form material_form,
  estimated_quantity numeric,
  estimated_unit unit_basis,
  notes text,
  status text NOT NULL DEFAULT 'scheduled' 
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  manifest_id uuid REFERENCES manifests(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for fast queries
CREATE INDEX idx_outbound_assignments_driver_date ON public.outbound_assignments(driver_id, scheduled_date);
CREATE INDEX idx_outbound_assignments_org_date ON public.outbound_assignments(organization_id, scheduled_date);
CREATE INDEX idx_outbound_assignments_status ON public.outbound_assignments(status);

-- Enable Row Level Security
ALTER TABLE public.outbound_assignments ENABLE ROW LEVEL SECURITY;

-- Drivers see their own assignments
CREATE POLICY "Drivers see own outbound assignments"
  ON public.outbound_assignments FOR SELECT
  USING (driver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Drivers can update their own assignments (status, manifest_id)
CREATE POLICY "Drivers update own outbound assignments"
  ON public.outbound_assignments FOR UPDATE
  USING (driver_id = (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- Admins/dispatchers can manage all
CREATE POLICY "Admins manage outbound assignments"
  ON public.outbound_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_organization_roles uor
      WHERE uor.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
        AND uor.organization_id = outbound_assignments.organization_id
        AND uor.role IN ('admin', 'ops_manager', 'dispatcher')
    )
  );

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_outbound_assignments_updated_at
  BEFORE UPDATE ON public.outbound_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();