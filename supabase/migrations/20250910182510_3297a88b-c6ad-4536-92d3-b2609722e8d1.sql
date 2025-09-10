-- Apply user's exact coordinates for STATE_Manifest_v1.pdf v1
BEGIN;

-- Delete only the fields we are about to replace
DELETE FROM pdf_calibrations 
WHERE template_name = 'STATE_Manifest_v1.pdf' 
  AND version = 'v1'
  AND field_name IN (
    'generator_name','generator_mailing_address','generator_city','generator_state','generator_zip',
    'generator_physical_address','generator_city_2','generator_state_2','generator_zip_2','generator_county','generator_phone',
    'hauler_mi_reg','hauler_name','hauler_mailing_address','hauler_city','hauler_state','hauler_zip','hauler_phone',
    'receiver_name','receiver_mailing_address','receiver_city','receiver_state','receiver_zip','receiver_phone',
    'count_passenger_car','count_truck','count_oversized','count_pte','gross_weight','tare_weight','net_weight',
    'generator_signature','generator_print_name','generator_date','hauler_signature','hauler_print_name',
    'receiver_signature','receiver_print_name','receiver_date'
  );

-- Insert updated calibrations (page 1, font_size 10)
INSERT INTO pdf_calibrations (template_name, version, field_name, page, x, y, font_size) VALUES
-- Generator (Client) Block
('STATE_Manifest_v1.pdf','v1','generator_name',1,45.920,237.520,10),
('STATE_Manifest_v1.pdf','v1','generator_mailing_address',1,45.920,265.710,10),
('STATE_Manifest_v1.pdf','v1','generator_city',1,45.920,304.480,10),
('STATE_Manifest_v1.pdf','v1','generator_state',1,174.450,301.940,10),
('STATE_Manifest_v1.pdf','v1','generator_zip',1,230.810,296.570,10),
('STATE_Manifest_v1.pdf','v1','generator_physical_address',1,45.920,338.000,10),
('STATE_Manifest_v1.pdf','v1','generator_city_2',1,45.000,374.000,10),
('STATE_Manifest_v1.pdf','v1','generator_state_2',1,175.000,374.000,10),
('STATE_Manifest_v1.pdf','v1','generator_zip_2',1,230.000,374.000,10),
('STATE_Manifest_v1.pdf','v1','generator_county',1,45.000,406.000,10),
('STATE_Manifest_v1.pdf','v1','generator_phone',1,45.000,446.000,10),
-- Hauler Block
('STATE_Manifest_v1.pdf','v1','hauler_mi_reg',1,61.000,499.000,10),
('STATE_Manifest_v1.pdf','v1','hauler_name',1,45.000,535.000,10),
('STATE_Manifest_v1.pdf','v1','hauler_mailing_address',1,45.000,569.000,10),
('STATE_Manifest_v1.pdf','v1','hauler_city',1,45.000,610.000,10),
('STATE_Manifest_v1.pdf','v1','hauler_state',1,176.000,613.000,10),
('STATE_Manifest_v1.pdf','v1','hauler_zip',1,231.000,613.000,10),
('STATE_Manifest_v1.pdf','v1','hauler_phone',1,45.000,646.000,10),
-- Receiver Block
('STATE_Manifest_v1.pdf','v1','receiver_name',1,45.000,716.000,10),
('STATE_Manifest_v1.pdf','v1','receiver_mailing_address',1,45.000,752.000,10),
('STATE_Manifest_v1.pdf','v1','receiver_city',1,45.000,788.000,10),
('STATE_Manifest_v1.pdf','v1','receiver_state',1,173.000,789.000,10),
('STATE_Manifest_v1.pdf','v1','receiver_zip',1,230.000,789.000,10),
('STATE_Manifest_v1.pdf','v1','receiver_phone',1,46.000,825.000,10),
-- Tire Counts & Weights (Right Panel)
('STATE_Manifest_v1.pdf','v1','count_passenger_car',1,456.000,210.000,10),
('STATE_Manifest_v1.pdf','v1','count_truck',1,521.000,210.000,10),
('STATE_Manifest_v1.pdf','v1','count_oversized',1,608.000,210.000,10),
('STATE_Manifest_v1.pdf','v1','count_pte',1,771.000,210.000,10),
('STATE_Manifest_v1.pdf','v1','gross_weight',1,456.000,229.000,10),
('STATE_Manifest_v1.pdf','v1','tare_weight',1,533.000,229.000,10),
('STATE_Manifest_v1.pdf','v1','net_weight',1,603.000,229.000,10),
-- Signatures & Dates
('STATE_Manifest_v1.pdf','v1','generator_signature',1,538.000,398.000,10),
('STATE_Manifest_v1.pdf','v1','generator_print_name',1,558.000,430.000,10),
('STATE_Manifest_v1.pdf','v1','generator_date',1,529.000,452.000,10),
('STATE_Manifest_v1.pdf','v1','hauler_signature',1,522.000,578.000,10),
('STATE_Manifest_v1.pdf','v1','hauler_print_name',1,547.000,602.000,10),
('STATE_Manifest_v1.pdf','v1','receiver_signature',1,539.000,825.000,10),
('STATE_Manifest_v1.pdf','v1','receiver_print_name',1,556.000,852.000,10),
('STATE_Manifest_v1.pdf','v1','receiver_date',1,586.000,870.000,10);

COMMIT;