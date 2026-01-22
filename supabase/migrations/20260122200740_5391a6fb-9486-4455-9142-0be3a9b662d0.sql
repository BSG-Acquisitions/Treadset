-- Fix Tasmanian Tire duplicate records
-- Primary client: 80157a05-ec59-4be7-b7df-a5e67411dc4e (Tazmanian Tire)
-- Duplicate client: 5b550c55-4f18-4406-b0b9-b9ee6bf88bb8 (Tasmanian Tire Co.)

-- Step 1: Reassign the manifest to the primary client
UPDATE public.manifests
SET client_id = '80157a05-ec59-4be7-b7df-a5e67411dc4e',
    updated_at = NOW()
WHERE id = '27255cdd-4b7a-4e39-8ab4-03eab81f5cc8';

-- Step 2: Reassign the dropoff to the primary client
UPDATE public.dropoffs
SET client_id = '80157a05-ec59-4be7-b7df-a5e67411dc4e',
    updated_at = NOW()
WHERE id = '3808f394-a85a-4dc5-a5f7-04ac0dbaa9b9';

-- Step 3: Update the primary client's lifetime_revenue
UPDATE public.clients
SET lifetime_revenue = 1200.00,
    updated_at = NOW()
WHERE id = '80157a05-ec59-4be7-b7df-a5e67411dc4e';

-- Step 4: Deactivate the duplicate client with a note
UPDATE public.clients
SET is_active = false,
    notes = COALESCE(notes, '') || ' [MERGED: Duplicate record - data migrated to Tazmanian Tire (80157a05) on ' || CURRENT_DATE || ']',
    updated_at = NOW()
WHERE id = '5b550c55-4f18-4406-b0b9-b9ee6bf88bb8';