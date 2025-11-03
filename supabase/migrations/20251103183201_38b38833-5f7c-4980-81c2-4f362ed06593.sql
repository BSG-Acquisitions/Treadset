-- Add initial_pdf_path column to manifests table to store generator+hauler signed PDF
-- This preserves the initial manifest before receiver signature is added

ALTER TABLE manifests 
ADD COLUMN initial_pdf_path TEXT;

COMMENT ON COLUMN manifests.initial_pdf_path IS 'Path to initial PDF with generator and hauler signatures only (before receiver signs)';