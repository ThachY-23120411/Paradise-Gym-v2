-- 007_commission_configs_uniqueness_and_history.sql
-- Tái cấu trúc module hoa hồng PT: Bảo đảm tính duy nhất của cấu hình hiện hành, lịch sử phiên bản đầy đủ, và bảo toàn dữ liệu (Zero Hard Delete)

-- 1. Mở rộng bảng pt_commission_configs hiện tại
ALTER TABLE pt_commission_configs 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS note TEXT NULL,
  ADD COLUMN IF NOT EXISTS updated_by_account_id UUID NULL REFERENCES accounts(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE pt_commission_configs 
  ALTER COLUMN effective_from TYPE TIMESTAMPTZ USING effective_from::TIMESTAMPTZ;

-- 2. Tạo bảng pt_commission_config_history lưu vết lịch sử phiên bản toàn diện với ON DELETE RESTRICT
CREATE TABLE IF NOT EXISTS pt_commission_config_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES pt_commission_configs(id) ON DELETE RESTRICT,
    version INT NOT NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    pt_id UUID NULL REFERENCES pt_profiles(id) ON DELETE RESTRICT,
    commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ NULL,
    action VARCHAR(30) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'REMOVE_OVERRIDE', 'REACTIVATE')),
    note TEXT NULL,
    changed_by_account_id UUID NULL REFERENCES accounts(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_commission_history_config_version UNIQUE(config_id, version)
);

CREATE INDEX IF NOT EXISTS idx_commission_history_config_ver ON pt_commission_config_history(config_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_commission_history_pt_resolve ON pt_commission_config_history(branch_id, pt_id, effective_from, effective_to) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_commission_history_default_resolve ON pt_commission_config_history(branch_id, effective_from, effective_to) WHERE pt_id IS NULL AND is_active = true;

-- 3. Xử lý Deduplicate: Remap toàn bộ history cũ về SURVIVOR config_id trước khi dọn dẹp các dòng thừa
DO $$
DECLARE
    r RECORD;
    v_survivor_id UUID;
    v_total_versions INT;
    v_current_rn INT;
    v_prev_eff_from TIMESTAMPTZ;
    rec_dup RECORD;
BEGIN
    -- Lặp qua từng nhóm đối tượng (branch_id, pt_id)
    FOR r IN (
        SELECT branch_id, pt_id, COUNT(*) as cnt
        FROM pt_commission_configs
        GROUP BY branch_id, pt_id
    ) LOOP
        -- Xác định survivor_id là bản ghi mới nhất theo effective_from DESC, created_at DESC, id DESC
        SELECT id INTO v_survivor_id
        FROM pt_commission_configs
        WHERE branch_id = r.branch_id AND ((r.pt_id IS NULL AND pt_id IS NULL) OR (r.pt_id IS NOT NULL AND pt_id = r.pt_id))
        ORDER BY effective_from DESC, created_at DESC, id DESC
        LIMIT 1;

        SELECT COUNT(*) INTO v_total_versions
        FROM pt_commission_configs
        WHERE branch_id = r.branch_id AND ((r.pt_id IS NULL AND pt_id IS NULL) OR (r.pt_id IS NOT NULL AND pt_id = r.pt_id));

        v_current_rn := 0;
        v_prev_eff_from := NULL;

        -- Duyệt từ bản ghi cũ nhất (v1) đến mới nhất (vN)
        FOR rec_dup IN (
            SELECT id, commission_percentage, effective_from, created_at
            FROM pt_commission_configs
            WHERE branch_id = r.branch_id AND ((r.pt_id IS NULL AND pt_id IS NULL) OR (r.pt_id IS NOT NULL AND pt_id = r.pt_id))
            ORDER BY effective_from ASC, created_at ASC, id ASC
        ) LOOP
            v_current_rn := v_current_rn + 1;

            -- Cập nhật effective_to của version trước đó nếu có
            IF v_current_rn > 1 THEN
                UPDATE pt_commission_config_history
                SET effective_to = rec_dup.effective_from
                WHERE config_id = v_survivor_id AND version = v_current_rn - 1;
            END IF;

            -- Ghi history luôn trỏ về survivor_id
            INSERT INTO pt_commission_config_history (
                config_id, version, branch_id, pt_id, commission_percentage, is_active,
                effective_from, effective_to, action, note, changed_at
            ) VALUES (
                v_survivor_id,
                v_current_rn,
                r.branch_id,
                r.pt_id,
                rec_dup.commission_percentage,
                true,
                rec_dup.effective_from,
                NULL,
                CASE WHEN v_current_rn = 1 THEN 'CREATE' ELSE 'UPDATE' END,
                'Dữ liệu lịch sử ban đầu (chuyển đổi hệ thống)',
                rec_dup.created_at
            )
            ON CONFLICT (config_id, version) DO NOTHING;
        END LOOP;

        -- Cập nhật version của survivor row
        UPDATE pt_commission_configs
        SET version = v_total_versions,
            is_active = true,
            updated_at = NOW()
        WHERE id = v_survivor_id;

        -- Xóa các bản ghi thừa (không phải survivor)
        DELETE FROM pt_commission_configs
        WHERE branch_id = r.branch_id 
          AND ((r.pt_id IS NULL AND pt_id IS NULL) OR (r.pt_id IS NOT NULL AND pt_id = r.pt_id))
          AND id != v_survivor_id;
    END LOOP;
END $$;

-- 4. Branch Default Guarantee: Đảm bảo 100% chi nhánh đều có cấu hình mặc định (20.00%)
CREATE OR REPLACE FUNCTION trg_create_branch_default_commission_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_new_config_id UUID;
BEGIN
    v_new_config_id := gen_random_uuid();
    INSERT INTO pt_commission_configs (
        id, branch_id, pt_id, commission_percentage, is_active, version, effective_from, note, created_at, updated_at
    ) VALUES (
        v_new_config_id, NEW.id, NULL, 20.00, true, 1, NOW(),
        'Khởi tạo cấu hình mặc định chi nhánh (Branch Default Guarantee)', NOW(), NOW()
    );

    INSERT INTO pt_commission_config_history (
        config_id, version, branch_id, pt_id, commission_percentage, is_active,
        effective_from, effective_to, action, note, changed_at
    ) VALUES (
        v_new_config_id, 1, NEW.id, NULL, 20.00, true, NOW(), NULL, 'CREATE',
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

-- Backfill cho các chi nhánh đã tồn tại trước đó
DO $$
DECLARE
    b RECORD;
    v_new_config_id UUID;
BEGIN
    FOR b IN (
        SELECT id FROM branches 
        WHERE NOT EXISTS (
            SELECT 1 FROM pt_commission_configs c 
            WHERE c.branch_id = branches.id AND c.pt_id IS NULL
        )
    ) LOOP
        v_new_config_id := gen_random_uuid();
        INSERT INTO pt_commission_configs (
            id, branch_id, pt_id, commission_percentage, is_active, version, effective_from, note, created_at, updated_at
        ) VALUES (
            v_new_config_id, b.id, NULL, 20.00, true, 1, NOW(),
            'Khởi tạo cấu hình mặc định chi nhánh (Branch Default Guarantee)', NOW(), NOW()
        );

        INSERT INTO pt_commission_config_history (
            config_id, version, branch_id, pt_id, commission_percentage, is_active,
            effective_from, effective_to, action, note, changed_at
        ) VALUES (
            v_new_config_id, 1, b.id, NULL, 20.00, true, NOW(), NULL, 'CREATE',
            'Khởi tạo cấu hình mặc định chi nhánh (Branch Default Guarantee)', NOW()
        );
    END LOOP;
END $$;

-- 5. Thiết lập 2 Partial Unique Indexes bảo đảm tính duy nhất vĩnh viễn
CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_config_branch_default 
  ON pt_commission_configs(branch_id) WHERE pt_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_commission_config_branch_pt 
  ON pt_commission_configs(branch_id, pt_id) WHERE pt_id IS NOT NULL;
