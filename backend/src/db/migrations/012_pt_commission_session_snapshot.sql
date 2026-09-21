-- NULL means no historical snapshot exists. Never backfill legacy PAID rows.
ALTER TABLE pt_commissions
    ADD COLUMN IF NOT EXISTS details_snapshot JSONB DEFAULT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_pt_commissions_details_snapshot') THEN
        ALTER TABLE pt_commissions ADD CONSTRAINT ck_pt_commissions_details_snapshot
            CHECK (details_snapshot IS NULL OR (status = 'PAID' AND jsonb_typeof(details_snapshot) = 'array'));
    END IF;
END $$;

CREATE OR REPLACE FUNCTION guard_pt_commission_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'PAID' THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Paid commission cannot be deleted' USING ERRCODE = '23514';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status
           OR NEW.details_snapshot IS DISTINCT FROM OLD.details_snapshot
           OR NEW.pt_id IS DISTINCT FROM OLD.pt_id
           OR NEW.month IS DISTINCT FROM OLD.month
           OR NEW.year IS DISTINCT FROM OLD.year
           OR NEW.total_pt_sessions_taught IS DISTINCT FROM OLD.total_pt_sessions_taught
           OR NEW.pt_revenue_share IS DISTINCT FROM OLD.pt_revenue_share
           OR NEW.commission_percentage IS DISTINCT FROM OLD.commission_percentage
           OR NEW.total_commission_amount IS DISTINCT FROM OLD.total_commission_amount
           OR NEW.payout_method IS DISTINCT FROM OLD.payout_method
           OR NEW.payout_ref IS DISTINCT FROM OLD.payout_ref
           OR NEW.payout_note IS DISTINCT FROM OLD.payout_note
           OR NEW.paid_at IS DISTINCT FROM OLD.paid_at THEN
            RAISE EXCEPTION 'Paid commission summary and session snapshot are immutable' USING ERRCODE = '23514';
        END IF;
    ELSIF TG_OP = 'UPDATE' AND NEW.status = 'PAID' AND NEW.details_snapshot IS NULL THEN
        RAISE EXCEPTION 'Payout requires a session snapshot, including an empty array' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_pt_commission_snapshot ON pt_commissions;
CREATE TRIGGER trg_guard_pt_commission_snapshot
    BEFORE UPDATE OR DELETE ON pt_commissions
    FOR EACH ROW EXECUTE FUNCTION guard_pt_commission_snapshot();
