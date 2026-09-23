-- 020_pt_access_logs.sql
-- Bổ sung hỗ trợ ghi nhận lịch sử ra vào check-in/out của Huấn luyện viên (PT) tại các cổng chi nhánh

ALTER TABLE access_logs ALTER COLUMN member_id DROP NOT NULL;

ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS pt_id UUID NULL REFERENCES pt_profiles(id) ON DELETE CASCADE;

ALTER TABLE access_logs DROP CONSTRAINT IF EXISTS chk_access_logs_target;
ALTER TABLE access_logs ADD CONSTRAINT chk_access_logs_target CHECK (member_id IS NOT NULL OR pt_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_access_logs_pt ON access_logs(pt_id, check_in_time DESC);
