-- Add PDF-related columns to manifests table if they don't exist
DO $$ 
BEGIN
  -- Add pdf_path column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manifests' AND column_name = 'pdf_path') THEN
    ALTER TABLE public.manifests ADD COLUMN pdf_path text;
  END IF;
  
  -- Add pdf_bytes_hash column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manifests' AND column_name = 'pdf_bytes_hash') THEN
    ALTER TABLE public.manifests ADD COLUMN pdf_bytes_hash text;
  END IF;
  
  -- Add driver_sig_path column if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manifests' AND column_name = 'driver_sig_path') THEN
    ALTER TABLE public.manifests ADD COLUMN driver_sig_path text;
  END IF;
  
  -- Add customer_sig_path column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manifests' AND column_name = 'customer_sig_path') THEN
    ALTER TABLE public.manifests ADD COLUMN customer_sig_path text;
  END IF;
  
  -- Add finalized_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manifests' AND column_name = 'finalized_by') THEN
    ALTER TABLE public.manifests ADD COLUMN finalized_by uuid REFERENCES public.users(id);
  END IF;
  
  -- Add emailed_to column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'manifests' AND column_name = 'emailed_to') THEN
    ALTER TABLE public.manifests ADD COLUMN emailed_to text[];
  END IF;
END $$;