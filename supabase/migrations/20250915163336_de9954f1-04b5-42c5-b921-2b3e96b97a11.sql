-- Add AcroForm PDF path column to manifests table
ALTER TABLE public.manifests ADD COLUMN acroform_pdf_path TEXT;