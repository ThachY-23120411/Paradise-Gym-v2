-- Migration 008: Tỷ lệ hoa hồng PT mặc định khi khởi tạo chi nhánh mới
-- Bổ sung cột default_pt_commission_percentage vào bảng branches
ALTER TABLE branches ADD COLUMN IF NOT EXISTS default_pt_commission_percentage DECIMAL(5,2) DEFAULT 20.00;

-- Cập nhật các chi nhánh hiện có nếu giá trị đang null
UPDATE branches SET default_pt_commission_percentage = 20.00 WHERE default_pt_commission_percentage IS NULL;

-- Cập nhật trigger function để sử dụng default_pt_commission_percentage từ chi nhánh mới tạo
CREATE OR REPLACE FUNCTION trg_create_branch_default_commission_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_new_config_id UUID;
    v_init_rate DECIMAL(5,2);
BEGIN
    v_init_rate := COALESCE(NEW.default_pt_commission_percentage, 20.00);
    v_new_config_id := gen_random_uuid();
    
    INSERT INTO pt_commission_configs (
        id, branch_id, pt_id, commission_percentage, is_active, version, effective_from, note, created_at, updated_at
    ) VALUES (
        v_new_config_id, NEW.id, NULL, v_init_rate, true, 1, NOW(),
        'Khởi tạo cấu hình mặc định chi nhánh (Branch Default Guarantee)', NOW(), NOW()
    );

    INSERT INTO pt_commission_config_history (
        config_id, version, branch_id, pt_id, commission_percentage, is_active,
        effective_from, effective_to, action, note, changed_at
    ) VALUES (
        v_new_config_id, 1, NEW.id, NULL, v_init_rate, true, NOW(), NULL, 'CREATE',
        'Khởi tạo cấu hình mặc định chi nhánh (Branch Default Guarantee)', NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_create_branch_default_commission ON branches;
CREATE TRIGGER trg_create_branch_default_commission
AFTER INSERT ON branches
FOR EACH ROW
EXECUTE FUNCTION trg_create_branch_default_commission_fn();
