-- Update RLS policies for haulers and receivers to allow full CRUD operations

-- Drop existing restrictive policies for haulers
DROP POLICY IF EXISTS "Allow authenticated users to read haulers" ON haulers;
DROP POLICY IF EXISTS "read haulers" ON haulers;

-- Drop existing restrictive policies for receivers  
DROP POLICY IF EXISTS "Allow authenticated users to read receivers" ON receivers;
DROP POLICY IF EXISTS "read receivers" ON receivers;

-- Create comprehensive policies for haulers
CREATE POLICY "Authenticated users can manage haulers" 
ON haulers 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Create comprehensive policies for receivers
CREATE POLICY "Authenticated users can manage receivers" 
ON receivers 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);