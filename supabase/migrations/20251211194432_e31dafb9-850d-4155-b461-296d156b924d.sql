-- Migrate any existing trailers with removed statuses to appropriate statuses
UPDATE trailers 
SET current_status = 'full' 
WHERE current_status = 'in_transit' OR current_status = 'waiting_unload';

-- Note: PostgreSQL enum type cannot have values removed directly,
-- but the application code now only uses 'empty', 'full', 'staged'
-- Any future trailers will only use these 3 values

-- Clean up any alerts related to the old waiting_too_long alert type
UPDATE trailer_alerts 
SET is_resolved = true 
WHERE alert_type = 'waiting_too_long' AND is_resolved = false;