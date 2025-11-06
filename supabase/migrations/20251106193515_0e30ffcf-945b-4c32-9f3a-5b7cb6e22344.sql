-- Remove legacy trigger referencing dropped dropoff_customers table
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_dropoff_customer_stats_trigger'
  ) THEN
    EXECUTE 'DROP TRIGGER update_dropoff_customer_stats_trigger ON public.dropoffs';
  END IF;
EXCEPTION WHEN others THEN
  -- ignore if table or trigger not present
  NULL;
END $$;

-- Drop the old function that updated dropoff_customers
DROP FUNCTION IF EXISTS public.update_dropoff_customer_stats_on_completion();
