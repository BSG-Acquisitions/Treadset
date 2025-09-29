-- Check for tables without RLS and enable it where needed
-- This addresses the RLS security warning

-- Enable RLS on any remaining tables that don't have it enabled
DO $$
BEGIN
    -- Enable RLS on tables that should have it but don't
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' 
        AND c.relname = 'client_workflows'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.client_workflows ENABLE ROW LEVEL SECURITY;
    END IF;
END
$$;