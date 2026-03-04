
-- Clean up orphan org roles
DELETE FROM user_organization_roles 
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email = 'zachdevon@bsgtires.com' AND auth_user_id IS NULL
);

-- Clean up orphan user records
DELETE FROM users 
WHERE email = 'zachdevon@bsgtires.com' 
AND auth_user_id IS NULL;
