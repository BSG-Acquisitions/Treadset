-- Add RLS policies for generators, haulers, and receivers tables

-- Generators policies
CREATE POLICY "Allow authenticated users to read generators" 
ON generators 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Haulers policies  
CREATE POLICY "Allow authenticated users to read haulers" 
ON haulers 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Receivers policies
CREATE POLICY "Allow authenticated users to read receivers" 
ON receivers 
FOR SELECT 
USING (auth.uid() IS NOT NULL);