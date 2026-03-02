
-- Step 1: Delete 8 duplicate manifests (keeping earliest per dropoff_id)
DELETE FROM manifests WHERE id IN (
  '2acf4bc9-e033-470a-ac2b-317d81ad7367',
  'bb3dd2bd-2f3d-48f5-b97c-7533d394917d',
  'c27dcc08-518e-4610-af63-4b8da6408b8d',
  'f0ed9dd2-45f2-42b6-9e87-7bff95d3fcd8',
  'd3a9c085-53f1-42bd-9788-95ce15915545',
  '5c274e1a-ce41-41cd-9e70-e42fca862147',
  'b22ac81b-29f2-4816-91be-97c67be4c1e8',
  '5f7f1451-efd4-4e7d-9efd-2fa8d9e3122b'
);

-- Step 2: Link each dropoff to its remaining manifest
UPDATE dropoffs SET manifest_id = '7acb8803-fbed-4966-820e-bd49b3d3cc1d' WHERE id = '1dfa494d-1b9b-4dcc-9136-9045f3854a54';
UPDATE dropoffs SET manifest_id = 'd171f5d0-7fec-44c6-b7d4-26cd5725d9c2' WHERE id = 'a78dd0e6-2809-477a-ae12-5ee3ad1d0a10';
UPDATE dropoffs SET manifest_id = '47acdf75-110d-4ff8-b2ca-1c7dc66bc459' WHERE id = 'ede4e6a7-05a5-4ae4-80ac-b4951cd2c324';

-- Step 3: Add unique partial index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_manifests_unique_dropoff 
ON manifests(dropoff_id) WHERE dropoff_id IS NOT NULL;
