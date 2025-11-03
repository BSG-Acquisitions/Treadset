-- Add receptionist role to app_role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid  
        WHERE t.typname = 'app_role' 
        AND e.enumlabel = 'receptionist'
    ) THEN
        ALTER TYPE app_role ADD VALUE 'receptionist';
    END IF;
END$$;

COMMENT ON TYPE app_role IS 'Application roles: admin, ops_manager, dispatcher, driver, sales, client, receptionist';