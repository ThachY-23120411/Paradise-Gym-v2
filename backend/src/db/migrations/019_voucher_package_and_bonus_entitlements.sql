-- Migration 019: Voucher Package Constraints & Bonus Entitlements (Days & PT Sessions)
-- Allows vouchers to bind to a specific package (applicable_package_id) and support bonus time/session entitlements (SESSION, DAY, BOTH)

DO $$
BEGIN
  -- 1. Thêm cột applicable_package_id nếu chưa có
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discounts' AND column_name = 'applicable_package_id'
  ) THEN
    ALTER TABLE discounts ADD COLUMN applicable_package_id UUID NULL REFERENCES packages(id) ON DELETE SET NULL;
  END IF;

  -- 2. Thêm cột bonus_pt_sessions nếu chưa có
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discounts' AND column_name = 'bonus_pt_sessions'
  ) THEN
    ALTER TABLE discounts ADD COLUMN bonus_pt_sessions INTEGER NULL DEFAULT NULL;
  END IF;

  -- 3. Thêm cột bonus_days nếu chưa có
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discounts' AND column_name = 'bonus_days'
  ) THEN
    ALTER TABLE discounts ADD COLUMN bonus_days INTEGER NULL DEFAULT NULL;
  END IF;

  -- 4. Cho phép discount_value có default 0
  ALTER TABLE discounts ALTER COLUMN discount_value SET DEFAULT 0;

  -- 5. Cập nhật ràng buộc discounts_discount_type_check
  ALTER TABLE discounts DROP CONSTRAINT IF EXISTS discounts_discount_type_check;
  ALTER TABLE discounts ADD CONSTRAINT discounts_discount_type_check
    CHECK (discount_type = ANY (ARRAY['PERCENT', 'FIXED_AMOUNT', 'SESSION', 'DAY', 'BOTH']));

  -- 6. Tạo index cho applicable_package_id để tối ưu truy vấn
  CREATE INDEX IF NOT EXISTS idx_discounts_applicable_package_id ON discounts(applicable_package_id);
END $$;
