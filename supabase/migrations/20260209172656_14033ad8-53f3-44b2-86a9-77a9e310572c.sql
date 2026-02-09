
-- Add state_code to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS state_code TEXT DEFAULT 'MI';

-- Create state_compliance_configs table
CREATE TABLE public.state_compliance_configs (
  state_code TEXT PRIMARY KEY,
  state_name TEXT NOT NULL,
  pte_to_ton_ratio NUMERIC NOT NULL DEFAULT 89,
  requires_government_manifest BOOLEAN NOT NULL DEFAULT false,
  manifest_template_path TEXT,
  registration_label TEXT NOT NULL DEFAULT 'State Registration #',
  report_format TEXT NOT NULL DEFAULT 'generic',
  field_mapping JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.state_compliance_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read state configs"
ON public.state_compliance_configs FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert state configs"
ON public.state_compliance_configs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update state configs"
ON public.state_compliance_configs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete state configs"
ON public.state_compliance_configs FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_organization_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE TRIGGER update_state_compliance_configs_updated_at
BEFORE UPDATE ON public.state_compliance_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Michigan
INSERT INTO public.state_compliance_configs (state_code, state_name, pte_to_ton_ratio, requires_government_manifest, manifest_template_path, registration_label, report_format, field_mapping)
VALUES (
  'MI', 'Michigan', 89, true, 'Michigan_Manifest_Acroform_V4.pdf', 'MI Scrap Tire Hauler Reg #', 'michigan_deq',
  '{"manifest_number":"Manifest_Number","vehicle_trailer":"Vehicle_Trailer","generator_name":"Generator_Name","generator_mail_address":"Generator_Mailing_Address","generator_city":"Generator_City","generator_state":"Generator_State","generator_zip":"Generator_Zip","generator_county":"Generator_County","generator_phone":"Generator_Phone","generator_physical_address":"Physical_Mailing_Address","generator_physical_city":"Physical_City","generator_physical_state":"Physical_State","generator_physical_zip":"Physical_Zip","hauler_name":"Hauler_Name","hauler_mail_address":"Hauler_Address","hauler_city":"Hauler_City","hauler_state":"Hauler_State","hauler_zip":"Hauler_Zip","hauler_phone":"Hauler_Phone","hauler_mi_reg":"MI_SCRAP_TIRE_HAULER_REG_","hauler_other_id":"Collection_Site_Reg_#","receiver_name":"Receiver_Name","receiver_physical_address":"Receiver_Address","receiver_city":"Receiver_City","receiver_state":"Receiver_State","receiver_zip":"Receiver_Zip","receiver_phone":"Receiver_Phone","passenger_car_count":"Passenger_Car","truck_count":"Truck","oversized_count":"Oversized","hauler_gross_weight":"Gross","hauler_tare_weight":"Tare","hauler_net_weight":"Net_Weight","generator_volume_weight":"Passenger_Tire_Equivalents","hauler_total_pte":"Passenger_Tire_Equivalents","receiver_total_pte":"Passenger_Tire_Equivalents","generator_signature":"Generator_Signature _es_:signer:signature","hauler_signature":"Hauler_Signature _es_:signer:signature","receiver_signature":"Processor_Signature _es_:signer:signature","generator_print_name":"Generator_Print_Name","hauler_print_name":"Hauler_Print_Name","receiver_print_name":"Processor_Print_Name","generator_date":"Generator_Date","hauler_date":"Hauler_Date","receiver_date":"Processor_Date"}'::jsonb
);

-- Seed Idaho placeholder
INSERT INTO public.state_compliance_configs (state_code, state_name, pte_to_ton_ratio, requires_government_manifest, manifest_template_path, registration_label, report_format, field_mapping)
VALUES ('ID', 'Idaho', 89, false, NULL, 'State Registration #', 'generic', NULL);
