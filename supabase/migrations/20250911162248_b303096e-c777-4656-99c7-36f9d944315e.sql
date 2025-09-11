-- Update PDF calibrations with precise coordinates for v1-adjusted
DELETE FROM pdf_calibrations WHERE template_name = 'STATE_Manifest_v1.pdf' AND version = 'v1-adjusted';

INSERT INTO pdf_calibrations (template_name, version, field_name, page, x, y, font_size) VALUES
-- Generator fields
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_name', 1, 46, 262, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_mailing_address', 1, 46, 291, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_city', 1, 46, 325, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_state', 1, 174, 322, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_zip', 1, 231, 317, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_county', 1, 46, 332, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_physical_address', 1, 46, 363, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_city_2', 1, 46, 394, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_state_2', 1, 175, 394, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_zip_2', 1, 231, 394, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_phone', 1, 46, 446, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_signature', 1, 538, 398, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_print_name', 1, 558, 445, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'generator_date', 1, 529, 467, 10),

-- Hauler fields  
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'hauler_mi_reg', 1, 61, 484, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'hauler_name', 1, 45, 520, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'hauler_mailing_address', 1, 45, 554, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'hauler_city', 1, 45, 595, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'hauler_state', 1, 176, 598, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'hauler_zip', 1, 231, 598, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'hauler_phone', 1, 45, 631, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'hauler_signature', 1, 522, 578, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'hauler_print_name', 1, 547, 614, 10),

-- Receiver fields
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'receiver_name', 1, 45, 736, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'receiver_mailing_address', 1, 45, 772, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'receiver_city', 1, 45, 808, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'receiver_state', 1, 173, 809, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'receiver_zip', 1, 230, 809, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'receiver_phone', 1, 46, 845, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'receiver_signature', 1, 539, 825, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'receiver_print_name', 1, 556, 837, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'receiver_date', 1, 586, 855, 10),

-- Counts and weights
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'count_passenger_car', 1, 456, 200, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'count_truck', 1, 521, 200, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'count_oversized', 1, 608, 200, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'count_pte', 1, 771, 200, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'gross_weight', 1, 456, 219, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'tare_weight', 1, 533, 219, 10),
('STATE_Manifest_v1.pdf', 'v1-adjusted', 'net_weight', 1, 603, 219, 10);