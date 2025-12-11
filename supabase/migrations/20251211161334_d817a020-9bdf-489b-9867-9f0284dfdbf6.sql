-- Delete broken notifications with NULL user_id (they're invisible anyway)
DELETE FROM public.notifications WHERE user_id IS NULL;