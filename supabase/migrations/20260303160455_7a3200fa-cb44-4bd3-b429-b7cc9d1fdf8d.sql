-- Create vehicle for Jody
INSERT INTO vehicles (name, capacity, license_plate, is_active, driver_email, assigned_driver_id, organization_id)
VALUES ('Truck 003 - Jody Green', 500, 'BSG-003', true, 
  'albanylogisticsllc@gmail.com', '55967bd4-e590-4760-8224-2a6cfd58ae59', 
  'ba2e9dc3-ecc6-4b73-963b-efe668a03d73');

-- Clean up orphan duplicate user
DELETE FROM user_organization_roles WHERE user_id = '8e948bf3-5ab1-4637-9d29-620b51306bb8';
DELETE FROM users WHERE id = '8e948bf3-5ab1-4637-9d29-620b51306bb8';