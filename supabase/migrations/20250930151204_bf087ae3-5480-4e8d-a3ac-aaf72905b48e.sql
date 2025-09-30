-- Normalize Brenner's email in public.users to match auth.users
UPDATE public.users 
SET email = 'brenner.whitt@gmail.com' 
WHERE id = 'a77a6f42-5647-46c9-8a6a-98ad5bcbd68b';

-- Attach Brenner to today's assignments so they show in his driver UI
UPDATE public.assignments 
SET driver_id = 'a77a6f42-5647-46c9-8a6a-98ad5bcbd68b' 
WHERE vehicle_id = '7dc1e5f3-a562-4631-9b72-6bdc7088534c' 
AND scheduled_date >= CURRENT_DATE
AND driver_id IS NULL;