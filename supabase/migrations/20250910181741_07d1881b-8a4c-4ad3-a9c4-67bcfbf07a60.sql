-- Update PDF calibrations with correct coordinates for STATE_Manifest_v1.pdf
-- Based on manifestLayout.json configuration

-- Clear existing calibrations for this template
DELETE FROM pdf_calibrations WHERE template_name = 'STATE_Manifest_v1.pdf' AND version = 'v1';

-- Insert updated calibrations with correct coordinates
INSERT INTO pdf_calibrations (template_name, version, field_name, page, x, y, font_size) VALUES

-- Generator fields
('STATE_Manifest_v1.pdf', 'v1', 'generator_name', 1, 45, 227, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_mailing_address', 1, 90, 677, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_city', 1, 90, 662, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_state', 1, 280, 662, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_zip', 1, 340, 662, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_physical_address', 1, 90, 632, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_city_2', 1, 90, 617, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_state_2', 1, 280, 617, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_zip_2', 1, 340, 617, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_phone', 1, 90, 587, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_print_name', 1, 320, 572, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_date', 1, 480, 572, 10),
('STATE_Manifest_v1.pdf', 'v1', 'generator_signature', 1, 90, 568, 10),

-- Hauler fields  
('STATE_Manifest_v1.pdf', 'v1', 'hauler_mi_reg', 1, 160, 520, 10),
('STATE_Manifest_v1.pdf', 'v1', 'hauler_phone', 1, 160, 475, 10),
('STATE_Manifest_v1.pdf', 'v1', 'hauler_print_name', 1, 320, 460, 10),
('STATE_Manifest_v1.pdf', 'v1', 'hauler_signature', 1, 90, 456, 10),

-- Receiver fields
('STATE_Manifest_v1.pdf', 'v1', 'receiver_name', 1, 160, 408, 10),
('STATE_Manifest_v1.pdf', 'v1', 'receiver_mailing_address', 1, 160, 393, 10),
('STATE_Manifest_v1.pdf', 'v1', 'receiver_city', 1, 160, 378, 10),
('STATE_Manifest_v1.pdf', 'v1', 'receiver_state', 1, 320, 378, 10),
('STATE_Manifest_v1.pdf', 'v1', 'receiver_zip', 1, 380, 378, 10),
('STATE_Manifest_v1.pdf', 'v1', 'receiver_phone', 1, 160, 363, 10),
('STATE_Manifest_v1.pdf', 'v1', 'receiver_print_name', 1, 320, 318, 10),
('STATE_Manifest_v1.pdf', 'v1', 'receiver_date', 1, 480, 318, 10),
('STATE_Manifest_v1.pdf', 'v1', 'receiver_signature', 1, 90, 314, 10),

-- Weight and count fields
('STATE_Manifest_v1.pdf', 'v1', 'gross_weight', 1, 160, 288, 10),
('STATE_Manifest_v1.pdf', 'v1', 'tare_weight', 1, 320, 288, 10),
('STATE_Manifest_v1.pdf', 'v1', 'net_weight', 1, 480, 288, 10),
('STATE_Manifest_v1.pdf', 'v1', 'count_pte', 1, 480, 273, 10),

-- Manifest number (top right)
('STATE_Manifest_v1.pdf', 'v1', 'manifest_number', 1, 515, 760, 10),

-- Additional count fields for tire types
('STATE_Manifest_v1.pdf', 'v1', 'count_passenger_car', 1, 480, 250, 10),
('STATE_Manifest_v1.pdf', 'v1', 'count_truck', 1, 480, 235, 10),
('STATE_Manifest_v1.pdf', 'v1', 'count_oversized', 1, 480, 220, 10);