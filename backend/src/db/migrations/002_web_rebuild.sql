-- Additive migration. No business records are removed or re-seeded.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(64);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS otp_purpose VARCHAR(20);
ALTER TABLE packages ALTER COLUMN duration_days DROP NOT NULL;
ALTER TABLE registrations ALTER COLUMN duration_days_snapshot DROP NOT NULL;
ALTER TABLE registrations ALTER COLUMN end_date DROP NOT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS note VARCHAR(255);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE devices ALTER COLUMN status SET DEFAULT 'PENDING_SYNC';
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS device_code_snapshot VARCHAR(50);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS gate_config JSONB NOT NULL DEFAULT '{"duplicate_seconds":60,"daily_gym_deduction_limit":1}';
ALTER TABLE member_consents ADD COLUMN IF NOT EXISTS policy_version VARCHAR(50);
ALTER TABLE member_consents ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES accounts(id);
ALTER TABLE member_consents ADD COLUMN IF NOT EXISTS evidence TEXT;
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS template_name VARCHAR(100);
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES accounts(id);
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_key VARCHAR(150);
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_recipient ON notifications(account_id,event_key) WHERE event_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  event_type VARCHAR(50) NOT NULL,
  template_id UUID NOT NULL REFERENCES notification_templates(id),
  recipient_roles TEXT[] NOT NULL,
  modes TEXT[] NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID NOT NULL REFERENCES accounts(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id,event_type),
  CHECK(cardinality(recipient_roles)>0),
  CHECK(cardinality(modes)>0)
);
CREATE TABLE IF NOT EXISTS device_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES devices(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK(severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','RESOLVED')),
  reported_by UUID NOT NULL REFERENCES accounts(id),
  updated_by UUID NOT NULL REFERENCES accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS device_incidents_branch_status ON device_incidents(branch_id,status);

-- Serialize business transactions in the API; enforce receipt consistency at the database boundary too.
CREATE OR REPLACE FUNCTION protect_completed_payment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='COMPLETED' THEN
    RAISE EXCEPTION 'Completed payments are immutable' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS completed_payment_immutable ON payments;
CREATE TRIGGER completed_payment_immutable BEFORE UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION protect_completed_payment();

CREATE OR REPLACE FUNCTION validate_full_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected NUMERIC; owner_id UUID; sale_branch UUID;
BEGIN
  SELECT price_snapshot,member_id,sold_branch_id INTO expected,owner_id,sale_branch
  FROM registrations WHERE id=NEW.registration_id FOR UPDATE;
  IF NEW.amount IS DISTINCT FROM expected OR NEW.member_id IS DISTINCT FROM owner_id OR NEW.branch_id IS DISTINCT FROM sale_branch THEN
    RAISE EXCEPTION 'Payment must match the entire registration snapshot' USING ERRCODE='23514';
  END IF;
  IF NEW.status='COMPLETED' AND EXISTS(SELECT 1 FROM payments WHERE registration_id=NEW.registration_id AND status='COMPLETED' AND id<>NEW.id) THEN
    RAISE EXCEPTION 'Registration already paid' USING ERRCODE='23505';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_snapshot_guard ON payments;
CREATE TRIGGER payment_snapshot_guard BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION validate_full_payment();
