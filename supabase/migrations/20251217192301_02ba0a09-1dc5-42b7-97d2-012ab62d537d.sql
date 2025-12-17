-- Clean up whitespace in city fields across clients table
UPDATE clients SET physical_city = TRIM(physical_city) WHERE physical_city IS NOT NULL AND physical_city != TRIM(physical_city);
UPDATE clients SET city = TRIM(city) WHERE city IS NOT NULL AND city != TRIM(city);
UPDATE clients SET physical_state = TRIM(physical_state) WHERE physical_state IS NOT NULL AND physical_state != TRIM(physical_state);
UPDATE clients SET physical_zip = TRIM(physical_zip) WHERE physical_zip IS NOT NULL AND physical_zip != TRIM(physical_zip);
UPDATE clients SET physical_address = TRIM(physical_address) WHERE physical_address IS NOT NULL AND physical_address != TRIM(physical_address);

-- Clean up locations table address field
UPDATE locations SET address = TRIM(address) WHERE address IS NOT NULL AND address != TRIM(address);