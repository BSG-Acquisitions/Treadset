
-- Reassign notifications to the correct internal user ID
UPDATE notifications 
SET user_id = '1c39d6ae-c319-47a8-96ed-a58de61d13ee' 
WHERE user_id = '70c2f0d6-d1db-40ad-98fa-1def1c314b0d';
