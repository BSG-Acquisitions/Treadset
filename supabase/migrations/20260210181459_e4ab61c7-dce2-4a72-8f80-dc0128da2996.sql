INSERT INTO user_organization_roles (user_id, organization_id, role)
SELECT '1c39d6ae-c319-47a8-96ed-a58de61d13ee', organization_id, 'super_admin'
FROM user_organization_roles
WHERE user_id = '1c39d6ae-c319-47a8-96ed-a58de61d13ee' AND role = 'admin'
LIMIT 1;