-- Migration 018: Quy trình Xác nhận Chi trả Hoa hồng PT 2 chiều trên App (Chống chối nhận tiền, Lưu vết pháp lý)
-- 1. Bổ sung cột pt_confirmed_at ghi nhận thời điểm PT bấm xác nhận đã nhận tiền
ALTER TABLE pt_commissions
    ADD COLUMN IF NOT EXISTS pt_confirmed_at TIMESTAMPTZ NULL;

-- 2. Cập nhật CHECK constraint trên status của pt_commissions
ALTER TABLE pt_commissions
    DROP CONSTRAINT IF EXISTS pt_commissions_status_check;

ALTER TABLE pt_commissions
    ADD CONSTRAINT pt_commissions_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'PENDING_CONFIRMATION', 'PAID'));

-- 3. Cập nhật CHECK constraint trên details_snapshot cho phép lưu trữ khi PENDING_CONFIRMATION hoặc PAID
ALTER TABLE pt_commissions
    DROP CONSTRAINT IF EXISTS ck_pt_commissions_details_snapshot;

ALTER TABLE pt_commissions
    ADD CONSTRAINT ck_pt_commissions_details_snapshot
    CHECK (details_snapshot IS NULL OR (status IN ('PENDING_CONFIRMATION', 'PAID') AND jsonb_typeof(details_snapshot) = 'array'));

-- 4. Cập nhật trigger function guard_pt_commission_snapshot để bảo vệ tính bất biến khi đã PAID
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
           OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
           OR NEW.pt_confirmed_at IS DISTINCT FROM OLD.pt_confirmed_at THEN
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
