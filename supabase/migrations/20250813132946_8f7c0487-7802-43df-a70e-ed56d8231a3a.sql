-- Create manifest-related tables for digital manifests and signatures

-- Create manifests table
CREATE TABLE public.manifests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  manifest_number TEXT NOT NULL,
  client_id UUID NOT NULL,
  location_id UUID,
  pickup_id UUID,
  driver_id UUID,
  vehicle_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_by_name TEXT,
  signed_by_title TEXT,
  signed_by_email TEXT,
  sign_ip INET,
  
  -- Tire counts
  pte_off_rim INTEGER DEFAULT 0,
  pte_on_rim INTEGER DEFAULT 0,
  commercial_17_5_19_5_off INTEGER DEFAULT 0,
  commercial_17_5_19_5_on INTEGER DEFAULT 0,
  commercial_22_5_off INTEGER DEFAULT 0,
  commercial_22_5_on INTEGER DEFAULT 0,
  otr_count INTEGER DEFAULT 0,
  tractor_count INTEGER DEFAULT 0,
  
  -- Additional measurements
  weight_tons NUMERIC(10,2),
  volume_yards NUMERIC(10,2),
  
  -- File paths
  photos TEXT[], -- Array of storage paths
  customer_signature_png_path TEXT,
  driver_signature_png_path TEXT,
  pdf_path TEXT,
  pdf_bytes_hash TEXT,
  
  -- Payment information
  payment_method TEXT CHECK (payment_method IN ('CARD', 'INVOICE', 'CASH', 'CHECK')) DEFAULT 'CARD',
  payment_status TEXT CHECK (payment_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'NOT_APPLICABLE')) DEFAULT 'PENDING',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  paid_amount NUMERIC(10,2) DEFAULT 0,
  receipt_url TEXT,
  
  -- Pricing information
  resolved_unit_prices JSONB,
  subtotal NUMERIC(10,2) DEFAULT 0,
  surcharges NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  
  -- Status
  status TEXT CHECK (status IN ('DRAFT', 'IN_PROGRESS', 'AWAITING_SIGNATURE', 'AWAITING_PAYMENT', 'COMPLETED')) DEFAULT 'DRAFT'
);

-- Enable RLS
ALTER TABLE public.manifests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can access manifests in their organizations" 
ON public.manifests 
FOR ALL 
USING (
  (auth.uid() IS NULL) OR 
  (organization_id IN (
    SELECT uo.organization_id
    FROM user_organization_roles uo
    JOIN users u ON uo.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
  ))
);

-- Create unique index for manifest numbers per organization
CREATE UNIQUE INDEX idx_manifests_org_number ON public.manifests (organization_id, manifest_number);

-- Create indexes for performance
CREATE INDEX idx_manifests_client_created ON public.manifests (organization_id, client_id, created_at DESC);
CREATE INDEX idx_manifests_pickup ON public.manifests (organization_id, pickup_id);
CREATE INDEX idx_manifests_driver_date ON public.manifests (organization_id, driver_id, created_at DESC);
CREATE INDEX idx_manifests_status ON public.manifests (organization_id, status);

-- Add manifest-related fields to existing tables
ALTER TABLE public.clients 
ADD COLUMN last_manifest_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_payment_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.pickups 
ADD COLUMN manifest_id UUID REFERENCES public.manifests(id),
ADD COLUMN manifest_pdf_path TEXT,
ADD COLUMN manifest_payment_status TEXT;

-- Create function to generate manifest numbers
CREATE OR REPLACE FUNCTION public.generate_manifest_number(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  next_number INTEGER;
  date_prefix TEXT;
  manifest_number TEXT;
BEGIN
  date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(manifest_number FROM '^' || date_prefix || '-(\d+)$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.manifests
  WHERE organization_id = org_id 
  AND manifest_number ~ ('^' || date_prefix || '-\d+$');
  
  manifest_number := date_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN manifest_number;
END;
$$;

-- Create function to update client stats when manifest is completed
CREATE OR REPLACE FUNCTION public.update_client_stats_on_manifest_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only update when status changes to 'COMPLETED'
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
    -- Update client stats
    UPDATE public.clients
    SET 
      last_manifest_at = NEW.signed_at,
      last_payment_at = CASE 
        WHEN NEW.payment_status = 'SUCCEEDED' THEN NEW.signed_at
        ELSE last_payment_at
      END,
      updated_at = NOW()
    WHERE id = NEW.client_id;
    
    -- Update linked pickup if exists
    IF NEW.pickup_id IS NOT NULL THEN
      UPDATE public.pickups
      SET 
        manifest_id = NEW.id,
        manifest_pdf_path = NEW.pdf_path,
        manifest_payment_status = NEW.payment_status,
        updated_at = NOW()
      WHERE id = NEW.pickup_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for manifest completion
CREATE TRIGGER update_client_stats_on_manifest_completion
  BEFORE UPDATE ON public.manifests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_stats_on_manifest_completion();

-- Create storage bucket for manifests
INSERT INTO storage.buckets (id, name, public) 
VALUES ('manifests', 'manifests', false);

-- Create storage policies for manifests bucket
CREATE POLICY "Authenticated users can view manifests" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'manifests' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload manifests" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'manifests' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update manifests" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'manifests' AND auth.uid() IS NOT NULL);

-- Add update trigger for manifests
CREATE TRIGGER update_manifests_updated_at
  BEFORE UPDATE ON public.manifests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();