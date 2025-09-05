-- Enable password strength and leaked password protection
UPDATE auth.config 
SET password_min_length = 8;

-- Enable leaked password protection
UPDATE auth.config 
SET password_leaked_password_protection_enabled = true;