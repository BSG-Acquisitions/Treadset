-- Step 1: Add missing columns to haulers table
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS dot_number TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS mailing_address TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS zip TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS dot_document_path TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS license_document_path TEXT;
ALTER TABLE public.haulers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Step 2: Add 'hauler' role to app_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'hauler') THEN
    ALTER TYPE app_role ADD VALUE 'hauler';
  END IF;
END $$;

-- Step 3: Create hauler_customers table
CREATE TABLE IF NOT EXISTS public.hauler_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hauler_id UUID NOT NULL REFERENCES public.haulers(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 4: Create facility_hauler_rates table
CREATE TABLE IF NOT EXISTS public.facility_hauler_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  hauler_id UUID NOT NULL REFERENCES public.haulers(id) ON DELETE CASCADE,
  pte_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  otr_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  tractor_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, hauler_id, effective_from)
);

-- Step 5: Add hauler_id to dropoffs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dropoffs' AND column_name = 'hauler_id') THEN
    ALTER TABLE public.dropoffs ADD COLUMN hauler_id UUID REFERENCES public.haulers(id);
  END IF;
END $$;

-- Step 6: Enable RLS
ALTER TABLE public.hauler_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_hauler_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haulers ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies
DROP POLICY IF EXISTS "Haulers view own customers" ON public.hauler_customers;
CREATE POLICY "Haulers view own customers" ON public.hauler_customers FOR SELECT
USING (hauler_id IN (SELECT id FROM public.haulers WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())));

DROP POLICY IF EXISTS "Haulers manage own customers" ON public.hauler_customers;
CREATE POLICY "Haulers manage own customers" ON public.hauler_customers FOR ALL
USING (hauler_id IN (SELECT id FROM public.haulers WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())));

DROP POLICY IF EXISTS "Admins view all hauler customers" ON public.hauler_customers;
CREATE POLICY "Admins view all hauler customers" ON public.hauler_customers FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_organization_roles uo JOIN public.users u ON uo.user_id = u.id WHERE u.auth_user_id = auth.uid() AND uo.role IN ('admin', 'ops_manager')));

DROP POLICY IF EXISTS "Org view rates" ON public.facility_hauler_rates;
CREATE POLICY "Org view rates" ON public.facility_hauler_rates FOR SELECT
USING (organization_id IN (SELECT uo.organization_id FROM public.user_organization_roles uo JOIN public.users u ON uo.user_id = u.id WHERE u.auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage rates" ON public.facility_hauler_rates;
CREATE POLICY "Admins manage rates" ON public.facility_hauler_rates FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_organization_roles uo JOIN public.users u ON uo.user_id = u.id WHERE u.auth_user_id = auth.uid() AND uo.organization_id = facility_hauler_rates.organization_id AND uo.role IN ('admin', 'ops_manager')));

DROP POLICY IF EXISTS "Haulers view own profile" ON public.haulers;
CREATE POLICY "Haulers view own profile" ON public.haulers FOR SELECT
USING (user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Org view haulers" ON public.haulers;
CREATE POLICY "Org view haulers" ON public.haulers FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_organization_roles uo JOIN public.users u ON uo.user_id = u.id WHERE u.auth_user_id = auth.uid() AND uo.role IN ('admin', 'ops_manager', 'dispatcher')));

DROP POLICY IF EXISTS "Admins manage haulers" ON public.haulers;
CREATE POLICY "Admins manage haulers" ON public.haulers FOR ALL
USING (EXISTS (SELECT 1 FROM public.user_organization_roles uo JOIN public.users u ON uo.user_id = u.id WHERE u.auth_user_id = auth.uid() AND uo.role IN ('admin', 'ops_manager')));

DROP POLICY IF EXISTS "Haulers manage dropoffs" ON public.dropoffs;
CREATE POLICY "Haulers manage dropoffs" ON public.dropoffs FOR ALL
USING (hauler_id IN (SELECT id FROM public.haulers WHERE user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())));

-- Step 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_hauler_customers_hauler_id ON public.hauler_customers(hauler_id);
CREATE INDEX IF NOT EXISTS idx_facility_hauler_rates_hauler_id ON public.facility_hauler_rates(hauler_id);
CREATE INDEX IF NOT EXISTS idx_dropoffs_hauler_id ON public.dropoffs(hauler_id);
CREATE INDEX IF NOT EXISTS idx_haulers_user_id ON public.haulers(user_id);