-- Add sample generators
INSERT INTO generators (generator_name, generator_mailing_address, generator_city, generator_state, generator_zip, generator_phone, generator_county, generator_physical_address, generator_city_2, generator_state_2, generator_zip_2, is_active) VALUES
('BSG Tire Collection - Detroit', '123 Main St', 'Detroit', 'MI', '48201', '(313) 555-0100', 'Wayne', '123 Main St', 'Detroit', 'MI', '48201', true),
('Auto Parts Plus', '456 Oak Ave', 'Royal Oak', 'MI', '48073', '(248) 555-0200', 'Oakland', '456 Oak Ave', 'Royal Oak', 'MI', '48073', true),
('Metro Tire Services', '789 Commerce Dr', 'Southfield', 'MI', '48075', '(248) 555-0300', 'Oakland', '789 Commerce Dr', 'Southfield', 'MI', '48075', true);

-- Add sample haulers  
INSERT INTO haulers (hauler_name, hauler_mailing_address, hauler_city, hauler_state, hauler_zip, hauler_phone, hauler_mi_reg, is_active) VALUES
('BSG Logistics', '100 Industrial Blvd', 'Detroit', 'MI', '48210', '(313) 555-1000', 'H123456', true),
('Great Lakes Hauling', '200 Transport Way', 'Warren', 'MI', '48089', '(586) 555-2000', 'H234567', true),
('Michigan Waste Transport', '300 Logistics Lane', 'Sterling Heights', 'MI', '48312', '(586) 555-3000', 'H345678', true);

-- Add sample receivers
INSERT INTO receivers (receiver_name, receiver_mailing_address, receiver_city, receiver_state, receiver_zip, receiver_phone, is_active) VALUES
('Liberty Tire Recycling', '500 Recycling Rd', 'Detroit', 'MI', '48228', '(313) 555-5000', true),
('EcoTire Processing Center', '600 Green Ave', 'Pontiac', 'MI', '48341', '(248) 555-6000', true),
('Midwest Tire Recovery', '700 Recovery St', 'Flint', 'MI', '48503', '(810) 555-7000', true);