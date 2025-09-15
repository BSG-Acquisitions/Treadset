-- Add receiver signature fields to manifests table
ALTER TABLE manifests 
ADD COLUMN receiver_signed_at timestamp with time zone,
ADD COLUMN receiver_signed_by text;