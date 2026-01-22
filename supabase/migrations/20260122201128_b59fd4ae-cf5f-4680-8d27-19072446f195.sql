-- Fix Tasmanian Tire duplicate records (CORRECTED UUIDs)
-- Primary client: 80157a05-9f95-4e50-ae13-a1fdd8d08011 (Tazmanian Tire - the one user is viewing)
-- Duplicate client: 5b550c55-d9ca-42db-8e8f-e4c000c7c86b (Tasmanian Tire Co.)

-- Step 1: Reassign the manifest to the primary client
UPDATE public.manifests
SET client_id = '80157a05-9f95-4e50-ae13-a1fdd8d08011',
    updated_at = NOW()
WHERE id = '27255cdd-bdb3-41e7-8ef5-fd5266dcc673';

-- Step 2: Reassign any dropoffs from the duplicate to the primary client
UPDATE public.dropoffs
SET client_id = '80157a05-9f95-4e50-ae13-a1fdd8d08011',
    updated_at = NOW()
WHERE client_id = '5b550c55-d9ca-42db-8e8f-e4c000c7c86b';

-- Step 3: Update the primary client's lifetime_revenue
UPDATE public.clients
SET lifetime_revenue = 1200.00,
    updated_at = NOW()
WHERE id = '80157a05-9f95-4e50-ae13-a1fdd8d08011';

-- Step 4: Deactivate the duplicate client with a note
UPDATE public.clients
SET is_active = false,
    notes = COALESCE(notes, '') || ' [MERGED: Duplicate record - data migrated to Tazmanian Tire on 2026-01-22]',
    updated_at = NOW()
WHERE id = '5b550c55-d9ca-42db-8e8f-e4c000c7c86b';