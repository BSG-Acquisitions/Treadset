-- Create test hauler account and customers for demo
DO $$
DECLARE
  test_user_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  test_hauler_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Insert or update test user
  INSERT INTO public.users (id, email, first_name, last_name, phone)
  VALUES (
    test_user_id,
    'demo-hauler@test.com',
    'Demo',
    'Hauler',
    '555-0123'
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
  -- Insert or update test hauler
  INSERT INTO public.haulers (
    id,
    user_id,
    company_name,
    hauler_name,
    email,
    phone,
    hauler_phone,
    mailing_address,
    hauler_mailing_address,
    city,
    hauler_city,
    state,
    hauler_state,
    zip,
    hauler_zip,
    hauler_mi_reg,
    is_active,
    is_approved
  ) VALUES (
    test_hauler_id,
    test_user_id,
    'Demo Hauling Company',
    'Demo Hauling Company',
    'demo-hauler@test.com',
    '555-0123',
    '555-0123',
    '123 Hauler Street',
    '123 Hauler Street',
    'Detroit',
    'Detroit',
    'MI',
    'MI',
    '48201',
    '48201',
    'MI-DEMO-12345',
    true,
    true
  ) ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    email = EXCLUDED.email;
    
  -- Create test hauler customers
  DELETE FROM public.hauler_customers WHERE hauler_id = test_hauler_id;
  
  INSERT INTO public.hauler_customers (
    hauler_id,
    company_name,
    contact_name,
    email,
    phone,
    address,
    city,
    state,
    zip
  ) VALUES 
  (
    test_hauler_id,
    'ABC Tire Shop',
    'John Smith',
    'john@abctires.com',
    '555-1111',
    '456 Main St',
    'Ann Arbor',
    'MI',
    '48103'
  ),
  (
    test_hauler_id,
    'Quick Tire Center',
    'Jane Doe',
    'jane@quicktire.com',
    '555-2222',
    '789 Oak Ave',
    'Lansing',
    'MI',
    '48912'
  );
  
END $$;
