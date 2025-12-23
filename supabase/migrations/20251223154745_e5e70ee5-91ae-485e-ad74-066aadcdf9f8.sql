-- Fix the 5 users who signed up via client portal but got orphaned organizations
-- BSG Organization ID: ba2e9dc3-ecc6-4b73-963b-efe668a03d73

DO $$
DECLARE
  bsg_org_id uuid := 'ba2e9dc3-ecc6-4b73-963b-efe668a03d73';
  
  -- User and client mappings
  jefferson_user_id uuid := '5e2d5cc5-4282-4664-91fc-3438a005936f';
  jefferson_orphan_org uuid := '91f5334d-eb7b-4728-bc65-2cbf2671d5c5';
  
  avis_user_id uuid := 'e5e8d448-5a6a-4177-ba0d-19d4109aaff7';
  avis_orphan_org uuid := '6fc0e76d-fe43-436f-b937-948411eed189';
  
  gratiot_user_id uuid := '84fa4bf2-af73-4fcf-b46d-e05f32d0b847';
  gratiot_orphan_org uuid := 'e56d956a-8aab-4eb5-819c-7d34ce7f55de';
  
  crest_user_id uuid := '08eab885-fa43-4613-be82-20b40f32533b';
  crest_orphan_org uuid := '2518640b-75e3-410f-91b0-91a10e8b8fb4';
  
  life_user_id uuid := '5c25a8ed-17ae-4d1c-afe7-8238b7d93bee';
  life_orphan_org uuid := '17b7eb96-75ec-4625-87af-e2044557d859';
  
  jefferson_client_id uuid;
  avis_client_id uuid;
  gratiot_client_id uuid;
  crest_client_id uuid;
  life_client_id uuid;
BEGIN
  -- Get client IDs by matching email
  SELECT id INTO jefferson_client_id FROM clients WHERE LOWER(email) = 'ryan@jeffersonmotorservice.com' AND organization_id = bsg_org_id;
  SELECT id INTO avis_client_id FROM clients WHERE LOWER(email) = 'gene.tatro@avisford.com' AND organization_id = bsg_org_id;
  SELECT id INTO gratiot_client_id FROM clients WHERE LOWER(email) = 'gratiotwheel@earthlink.net' AND organization_id = bsg_org_id;
  SELECT id INTO crest_client_id FROM clients WHERE LOWER(email) = 'cathyt@crestag.com' AND organization_id = bsg_org_id;
  SELECT id INTO life_client_id FROM clients WHERE LOWER(email) = 'kelsey@liferemodeled.org' AND organization_id = bsg_org_id;

  -- Step 1: Delete any existing roles for these users in BSG (to avoid duplicates)
  DELETE FROM user_organization_roles WHERE user_id IN (jefferson_user_id, avis_user_id, gratiot_user_id, crest_user_id, life_user_id) AND organization_id = bsg_org_id;

  -- Step 2: Add client role to BSG organization for each user
  INSERT INTO user_organization_roles (user_id, organization_id, role)
  VALUES 
    (jefferson_user_id, bsg_org_id, 'client'),
    (avis_user_id, bsg_org_id, 'client'),
    (gratiot_user_id, bsg_org_id, 'client'),
    (crest_user_id, bsg_org_id, 'client'),
    (life_user_id, bsg_org_id, 'client');

  -- Step 3: Link clients to their users
  UPDATE clients SET user_id = jefferson_user_id, updated_at = now() WHERE id = jefferson_client_id;
  UPDATE clients SET user_id = avis_user_id, updated_at = now() WHERE id = avis_client_id;
  UPDATE clients SET user_id = gratiot_user_id, updated_at = now() WHERE id = gratiot_client_id;
  UPDATE clients SET user_id = crest_user_id, updated_at = now() WHERE id = crest_client_id;
  UPDATE clients SET user_id = life_user_id, updated_at = now() WHERE id = life_client_id;

  -- Step 4: Remove admin roles from orphan organizations
  DELETE FROM user_organization_roles WHERE user_id = jefferson_user_id AND organization_id = jefferson_orphan_org;
  DELETE FROM user_organization_roles WHERE user_id = avis_user_id AND organization_id = avis_orphan_org;
  DELETE FROM user_organization_roles WHERE user_id = gratiot_user_id AND organization_id = gratiot_orphan_org;
  DELETE FROM user_organization_roles WHERE user_id = crest_user_id AND organization_id = crest_orphan_org;
  DELETE FROM user_organization_roles WHERE user_id = life_user_id AND organization_id = life_orphan_org;

  -- Step 5: Delete orphan organizations (they have no data)
  DELETE FROM organizations WHERE id IN (
    jefferson_orphan_org,
    avis_orphan_org,
    gratiot_orphan_org,
    crest_orphan_org,
    life_orphan_org
  );

  RAISE NOTICE 'Successfully linked 5 users to BSG as clients';
END $$;