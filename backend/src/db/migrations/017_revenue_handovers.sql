CREATE TABLE IF NOT EXISTS revenue_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  bank_bin VARCHAR(6) NOT NULL CHECK (bank_bin ~ '^[0-9]{6}$'),
  account_no VARCHAR(30) NOT NULL CHECK (account_no ~ '^[0-9]{1,30}$'),
  account_name VARCHAR(150) NOT NULL CHECK (length(btrim(account_name)) > 0),
  created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id,bank_bin,account_no)
);

CREATE TABLE IF NOT EXISTS revenue_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_code VARCHAR(40) NOT NULL UNIQUE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL CHECK (date_to >= date_from),
  timezone VARCHAR(100) NOT NULL,
  total_amount NUMERIC(16,2) NOT NULL CHECK (total_amount >= 0),
  payment_count INTEGER NOT NULL CHECK (payment_count > 0),
  confirmed_by UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  confirmed_by_name VARCHAR(255) NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note VARCHAR(1000),
  preview_token VARCHAR(64) NOT NULL CHECK (preview_token ~ '^[0-9a-f]{64}$'),
  UNIQUE(branch_id,preview_token)
);

CREATE TABLE IF NOT EXISTS revenue_handover_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_id UUID NOT NULL REFERENCES revenue_handovers(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
  receipt_id UUID NOT NULL UNIQUE REFERENCES receipts(id) ON DELETE RESTRICT,
  bank_account_id UUID REFERENCES revenue_bank_accounts(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('CASH','BANK_TRANSFER')),
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
  CHECK ((payment_method='CASH' AND bank_account_id IS NULL) OR
         (payment_method='BANK_TRANSFER' AND bank_account_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS revenue_handovers_branch_confirmed ON revenue_handovers(branch_id,confirmed_at DESC);
CREATE INDEX IF NOT EXISTS revenue_handover_items_batch ON revenue_handover_items(handover_id);

CREATE OR REPLACE FUNCTION protect_revenue_handover() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Revenue handover records are immutable' USING ERRCODE='23514';
END $$;

DROP TRIGGER IF EXISTS revenue_bank_accounts_immutable ON revenue_bank_accounts;
CREATE TRIGGER revenue_bank_accounts_immutable BEFORE UPDATE OR DELETE ON revenue_bank_accounts
FOR EACH ROW EXECUTE FUNCTION protect_revenue_handover();
DROP TRIGGER IF EXISTS revenue_handovers_immutable ON revenue_handovers;
CREATE TRIGGER revenue_handovers_immutable BEFORE UPDATE OR DELETE ON revenue_handovers
FOR EACH ROW EXECUTE FUNCTION protect_revenue_handover();
DROP TRIGGER IF EXISTS revenue_handover_items_immutable ON revenue_handover_items;
CREATE TRIGGER revenue_handover_items_immutable BEFORE UPDATE OR DELETE ON revenue_handover_items
FOR EACH ROW EXECUTE FUNCTION protect_revenue_handover();
DROP TRIGGER IF EXISTS revenue_handovers_no_truncate ON revenue_handovers;
CREATE TRIGGER revenue_handovers_no_truncate BEFORE TRUNCATE ON revenue_handovers
FOR EACH STATEMENT EXECUTE FUNCTION protect_revenue_handover();
DROP TRIGGER IF EXISTS revenue_handover_items_no_truncate ON revenue_handover_items;
CREATE TRIGGER revenue_handover_items_no_truncate BEFORE TRUNCATE ON revenue_handover_items
FOR EACH STATEMENT EXECUTE FUNCTION protect_revenue_handover();

CREATE OR REPLACE FUNCTION validate_revenue_handover_item() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p RECORD; h RECORD; a RECORD;
BEGIN
  SELECT pay.*,rc.id receipt_id,rc.amount receipt_amount INTO p
  FROM payments pay JOIN receipts rc ON rc.payment_id=pay.id WHERE pay.id=NEW.payment_id;
  SELECT * INTO h FROM revenue_handovers WHERE id=NEW.handover_id;
  IF p.id IS NULL OR p.confirmed_at IS NULL OR p.receipt_id IS DISTINCT FROM NEW.receipt_id
    OR p.amount IS DISTINCT FROM NEW.amount OR p.receipt_amount IS DISTINCT FROM NEW.amount
    OR p.branch_id IS DISTINCT FROM h.branch_id
    OR replace(p.payment_method,'BANK_TRANSFER_VIETQR','BANK_TRANSFER') IS DISTINCT FROM NEW.payment_method
    OR (p.confirmed_at AT TIME ZONE h.timezone)::date NOT BETWEEN h.date_from AND h.date_to THEN
    RAISE EXCEPTION 'Handover item must match a successful receipt in its branch and period' USING ERRCODE='23514';
  END IF;
  IF NEW.bank_account_id IS NOT NULL THEN
    SELECT * INTO a FROM revenue_bank_accounts WHERE id=NEW.bank_account_id;
    IF a.branch_id IS DISTINCT FROM h.branch_id THEN
      RAISE EXCEPTION 'Receiving bank account outside handover branch' USING ERRCODE='23514';
    END IF;
  END IF;
  IF NEW.snapshot->>'payment_id' IS DISTINCT FROM NEW.payment_id::text
    OR (NEW.snapshot->>'amount')::numeric IS DISTINCT FROM NEW.amount
    OR NEW.snapshot->>'payment_method' IS DISTINCT FROM NEW.payment_method THEN
    RAISE EXCEPTION 'Handover snapshot does not match payment' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS revenue_handover_item_guard ON revenue_handover_items;
CREATE TRIGGER revenue_handover_item_guard BEFORE INSERT ON revenue_handover_items
FOR EACH ROW EXECUTE FUNCTION validate_revenue_handover_item();

-- Deferred checks allow inserting a header and all immutable items in one transaction.
CREATE OR REPLACE FUNCTION validate_revenue_handover_totals() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target UUID; expected RECORD; actual RECORD;
BEGIN
  IF TG_TABLE_NAME='revenue_handovers' THEN target:=NEW.id; ELSE target:=NEW.handover_id; END IF;
  SELECT payment_count,total_amount INTO expected FROM revenue_handovers WHERE id=target;
  SELECT COUNT(*)::integer n,COALESCE(SUM(amount),0) amount INTO actual FROM revenue_handover_items WHERE handover_id=target;
  IF actual.n IS DISTINCT FROM expected.payment_count OR actual.amount IS DISTINCT FROM expected.total_amount THEN
    RAISE EXCEPTION 'Handover totals must match immutable details' USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS revenue_handover_totals ON revenue_handovers;
CREATE CONSTRAINT TRIGGER revenue_handover_totals AFTER INSERT ON revenue_handovers
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_revenue_handover_totals();
DROP TRIGGER IF EXISTS revenue_handover_item_totals ON revenue_handover_items;
CREATE CONSTRAINT TRIGGER revenue_handover_item_totals AFTER INSERT ON revenue_handover_items
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_revenue_handover_totals();

CREATE OR REPLACE FUNCTION protect_handed_over_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS(SELECT 1 FROM revenue_handover_items WHERE receipt_id=OLD.id) THEN
    RAISE EXCEPTION 'Handed-over receipts are immutable' USING ERRCODE='23514';
  END IF;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS handed_over_receipt_immutable ON receipts;
CREATE TRIGGER handed_over_receipt_immutable BEFORE UPDATE OR DELETE ON receipts
FOR EACH ROW EXECUTE FUNCTION protect_handed_over_receipt();
