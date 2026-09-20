-- Migration 010: Hỗ trợ trạng thái SCHEDULED (Chờ đóng băng) cho package_freezes
-- Cho phép lên lịch đóng băng trong tương lai

ALTER TABLE package_freezes DROP CONSTRAINT IF EXISTS package_freezes_status_check;
ALTER TABLE package_freezes ADD CONSTRAINT package_freezes_status_check 
  CHECK (status IN ('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED'));

-- Thêm index hỗ trợ quét tự động theo start_date và status
CREATE INDEX IF NOT EXISTS idx_package_freezes_scheduled ON package_freezes (start_date, status);
