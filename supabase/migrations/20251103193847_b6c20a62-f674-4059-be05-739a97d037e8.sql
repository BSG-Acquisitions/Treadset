-- Update default rates to reflect actual averages
UPDATE organization_settings 
SET 
  default_pte_rate = 2.75,
  default_otr_rate = 150.00,
  default_tractor_rate = 35.00
WHERE id = '68c17f48-13ea-4d10-9fec-5d4b36cdfd24';