-- User-approved mobile preferences, phone privacy and structured certificates only.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS notify_in_app BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS notify_pt_reminders BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS notify_new_bookings BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS notify_result_reminders BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE pt_profiles ADD COLUMN IF NOT EXISTS show_phone_to_members BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE pt_profiles ADD COLUMN IF NOT EXISTS certificates JSONB NOT NULL DEFAULT '[]';

CREATE OR REPLACE FUNCTION valid_pt_certificates(value JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE item JSONB; key TEXT; issued DATE; expires DATE;
BEGIN
  IF jsonb_typeof(value) <> 'array' THEN RETURN FALSE; END IF;
  IF jsonb_array_length(value)>50 THEN RETURN FALSE; END IF;
  FOR item IN SELECT jsonb_array_elements(value) LOOP
    IF jsonb_typeof(item)<>'object' THEN RETURN FALSE; END IF;
    IF NOT item ? 'name' OR jsonb_typeof(item->'name')<>'string' OR length(btrim(item->>'name')) NOT BETWEEN 1 AND 200 THEN RETURN FALSE; END IF;
    FOR key IN SELECT jsonb_object_keys(item) LOOP
      IF key NOT IN ('name','issuer','issued_on','expires_on','credential_id') OR jsonb_typeof(item->key)<>'string' THEN RETURN FALSE; END IF;
      IF length(btrim(item->>key))=0 OR length(item->>key)>200 THEN RETURN FALSE; END IF;
    END LOOP;
    IF length(item->>'credential_id')>100 THEN RETURN FALSE; END IF;
    IF (item ? 'issued_on' AND item->>'issued_on' !~ '^\d{4}-\d{2}-\d{2}$') OR (item ? 'expires_on' AND item->>'expires_on' !~ '^\d{4}-\d{2}-\d{2}$') THEN RETURN FALSE; END IF;
    issued=(item->>'issued_on')::date; expires=(item->>'expires_on')::date;
    IF expires<issued THEN RETURN FALSE; END IF;
  END LOOP;
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END $$;
ALTER TABLE pt_profiles DROP CONSTRAINT IF EXISTS pt_certificates_structure;
ALTER TABLE pt_profiles ADD CONSTRAINT pt_certificates_structure CHECK(valid_pt_certificates(certificates));
