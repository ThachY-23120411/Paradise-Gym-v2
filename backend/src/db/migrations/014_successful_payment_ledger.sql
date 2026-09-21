-- Run transactionally. Legacy settled payment and receipt IDs are never rewritten.
LOCK TABLE payments, receipts IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE RESTRICT,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  payment_code VARCHAR(40) NOT NULL UNIQUE,
  payment_method VARCHAR(30) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  state VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (state IN ('PENDING','EXPIRED','CANCELLED','FAILED','COMPLETED')),
  transaction_ref VARCHAR(100),
  collected_by UUID REFERENCES accounts(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note VARCHAR(255),
  expires_at TIMESTAMPTZ,
  discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_id UUID UNIQUE REFERENCES payments(id) ON DELETE RESTRICT
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='status') THEN
    IF EXISTS (SELECT 1 FROM payments p LEFT JOIN receipts rc ON rc.payment_id=p.id
      WHERE (p.status='COMPLETED' AND (p.confirmed_at IS NULL OR rc.id IS NULL OR rc.amount IS DISTINCT FROM p.amount))
         OR (p.status<>'COMPLETED' AND rc.id IS NOT NULL)) THEN
      RAISE EXCEPTION 'Ledger migration requires valid settled payments/receipts; no records changed';
    END IF;
    INSERT INTO payment_intents(id,registration_id,member_id,branch_id,payment_code,payment_method,amount,state,
      transaction_ref,collected_by,confirmed_at,created_at,updated_at,note,expires_at,discount_id,discount_amount,payment_id)
    SELECT p.id,p.registration_id,p.member_id,p.branch_id,p.payment_code,p.payment_method,p.amount,
      CASE WHEN p.status='PENDING' AND r.status='CANCELLED' THEN 'CANCELLED'
           WHEN p.status='PENDING' AND p.payment_method IN ('BANK_TRANSFER','BANK_TRANSFER_VIETQR')
             AND LEAST(COALESCE(p.expires_at,p.created_at+interval '15 minutes'),p.created_at+interval '15 minutes')<=NOW() THEN 'EXPIRED'
           ELSE p.status END,
      p.transaction_ref,p.collected_by,p.confirmed_at,p.created_at,p.updated_at,p.note,
      CASE WHEN p.payment_method IN ('BANK_TRANSFER','BANK_TRANSFER_VIETQR') THEN LEAST(COALESCE(p.expires_at,p.created_at+interval '15 minutes'),p.created_at+interval '15 minutes') ELSE p.expires_at END,
      p.discount_id,p.discount_amount,CASE WHEN p.status='COMPLETED' THEN p.id END
    FROM payments p JOIN registrations r ON r.id=p.registration_id;
    -- More than one legacy open invoice may exist. Retain all attempts, only newest remains open.
    UPDATE payment_intents SET state='CANCELLED' WHERE id IN (
      SELECT id FROM (SELECT id,row_number() OVER (PARTITION BY registration_id ORDER BY created_at DESC,id) n
        FROM payment_intents WHERE state='PENDING') ranked WHERE n>1);
    UPDATE discounts d SET used_count=GREATEST(0,d.used_count-released.n)
    FROM (SELECT i.discount_id,COUNT(*)::int n FROM payment_intents i JOIN payments p ON p.id=i.id
      WHERE p.status='PENDING' AND i.state IN ('EXPIRED','CANCELLED') AND i.discount_id IS NOT NULL
      GROUP BY i.discount_id) released WHERE d.id=released.discount_id;
    DELETE FROM payments WHERE status<>'COMPLETED';
    ALTER TABLE payments DROP COLUMN status;
  END IF;
END $$;

ALTER TABLE payments ALTER COLUMN confirmed_at SET NOT NULL;
DROP INDEX IF EXISTS idx_payments_report_lookup;
CREATE INDEX idx_payments_report_lookup ON payments(branch_id,confirmed_at);
CREATE UNIQUE INDEX IF NOT EXISTS payments_registration_unique ON payments(registration_id);
CREATE UNIQUE INDEX IF NOT EXISTS payments_transaction_ref_unique ON payments(transaction_ref) WHERE transaction_ref IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_one_open ON payment_intents(registration_id) WHERE state='PENDING';
CREATE INDEX IF NOT EXISTS payment_intents_registration_created ON payment_intents(registration_id,created_at DESC);

CREATE OR REPLACE FUNCTION protect_completed_payment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Settled payments are immutable' USING ERRCODE='23514';
END $$;
DROP TRIGGER IF EXISTS completed_payment_immutable ON payments;
CREATE TRIGGER completed_payment_immutable BEFORE UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION protect_completed_payment();

CREATE OR REPLACE FUNCTION validate_full_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected NUMERIC; owner_id UUID; sale_branch UUID;
BEGIN
  SELECT price_snapshot,member_id,sold_branch_id INTO expected,owner_id,sale_branch
    FROM registrations WHERE id=NEW.registration_id FOR UPDATE;
  IF NEW.amount<0 OR NEW.discount_amount<0 OR NEW.amount+NEW.discount_amount IS DISTINCT FROM expected
    OR NEW.member_id IS DISTINCT FROM owner_id OR NEW.branch_id IS DISTINCT FROM sale_branch THEN
    RAISE EXCEPTION 'Payment must match the entire registration snapshot' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payment_snapshot_guard ON payments;
CREATE TRIGGER payment_snapshot_guard BEFORE INSERT OR UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION validate_full_payment();
