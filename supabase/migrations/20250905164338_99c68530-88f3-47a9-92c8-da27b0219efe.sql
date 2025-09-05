-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  organization_id_val UUID;
  user_id_val UUID;
  changed_fields TEXT[] := '{}';
  col_name TEXT;
BEGIN
  -- Get organization_id from the record
  IF TG_OP = 'DELETE' then
    organization_id_val := OLD.organization_id;
  ELSE
    organization_id_val := NEW.organization_id;
  END IF;

  -- Get current user_id
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO user_id_val FROM users WHERE auth_user_id = auth.uid();
  END IF;

  -- For UPDATE, determine changed fields
  IF TG_OP = 'UPDATE' THEN
    FOR col_name IN 
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = TG_TABLE_NAME 
      AND table_schema = 'public'
    LOOP
      IF to_jsonb(OLD) ->> col_name IS DISTINCT FROM to_jsonb(NEW) ->> col_name THEN
        changed_fields := array_append(changed_fields, col_name);
      END IF;
    END LOOP;
  END IF;

  -- Insert audit record
  INSERT INTO public.audit_events (
    organization_id,
    user_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    ip_address
  ) VALUES (
    organization_id_val,
    user_id_val,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::UUID
      ELSE NEW.id::UUID
    END,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    changed_fields,
    inet_client_addr()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;