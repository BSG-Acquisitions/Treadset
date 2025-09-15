-- Clean up mock/test haulers and receivers data
-- This allows users to start fresh with real data

-- Deactivate all existing mock haulers and receivers
UPDATE haulers SET is_active = false WHERE is_active = true;
UPDATE receivers SET is_active = false WHERE is_active = true;