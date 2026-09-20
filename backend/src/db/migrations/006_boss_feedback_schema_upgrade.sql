-- ==============================================================================
-- Migration 006: Boss Feedback Additive Schema Upgrade
-- Paradise Gym - Support boss feedback & management requirements (2026-09-19)
-- ==============================================================================

-- 1. Bổ sung trường cho các bảng hiện có
ALTER TABLE packages
    ADD COLUMN IF NOT EXISTS gym_price DECIMAL(12,2) NULL,
    ADD COLUMN IF NOT EXISTS pt_price DECIMAL(12,2) NULL,
    ADD COLUMN IF NOT EXISTS combo_price DECIMAL(12,2) NULL,
    ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN IF NOT EXISTS package_mode VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    ADD COLUMN IF NOT EXISTS max_group_members INTEGER NULL DEFAULT NULL;

ALTER TABLE registrations
    ADD COLUMN IF NOT EXISTS gym_price_snapshot DECIMAL(12,2) NULL,
    ADD COLUMN IF NOT EXISTS pt_price_snapshot DECIMAL(12,2) NULL,
    ADD COLUMN IF NOT EXISTS combo_price_snapshot DECIMAL(12,2) NULL,
    ADD COLUMN IF NOT EXISTS package_mode VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    ADD COLUMN IF NOT EXISTS max_group_members_snapshot INTEGER NULL DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS freeze_days_total INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS group_leader_member_id UUID NULL REFERENCES member_profiles(id);

ALTER TABLE member_profiles
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS qr_code VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS face_enrolled BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'member_profiles_qr_code_key'
    ) THEN
        ALTER TABLE member_profiles ADD CONSTRAINT member_profiles_qr_code_key UNIQUE (qr_code);
    END IF;
END $$;

ALTER TABLE pt_profiles
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS face_enrolled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE accounts
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) NULL;

ALTER TABLE access_logs
    ADD COLUMN IF NOT EXISTS checkin_method VARCHAR(20) NOT NULL DEFAULT 'MANUAL';

ALTER TABLE pt_bookings
    ADD COLUMN IF NOT EXISTS session_duration_minutes INTEGER NOT NULL DEFAULT 60,
    ADD COLUMN IF NOT EXISTS substitute_pt_id UUID NULL REFERENCES pt_profiles(id);

-- 2. Tạo 9 bảng mới phục vụ các tính năng mở rộng theo feedback sếp

-- 2.1. discounts: Mã khuyến mãi & voucher giảm giá
CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NULL REFERENCES branches(id) ON DELETE CASCADE,
    branch_ids UUID[] NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED_AMOUNT')),
    discount_value DECIMAL(12,2) NOT NULL,
    min_order_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_discount_amount DECIMAL(12,2) NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    usage_limit INTEGER NULL,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bổ sung FK discount_id vào payments
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS discount_id UUID NULL REFERENCES discounts(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Cập nhật trigger validate_full_payment để tính cả discount_amount khi kiểm tra snapshot thanh toán 100%
CREATE OR REPLACE FUNCTION validate_full_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected NUMERIC; owner_id UUID; sale_branch UUID;
BEGIN
  SELECT price_snapshot,member_id,sold_branch_id INTO expected,owner_id,sale_branch
  FROM registrations WHERE id=NEW.registration_id FOR UPDATE;
  IF (NEW.amount + COALESCE(NEW.discount_amount, 0)) IS DISTINCT FROM expected OR NEW.member_id IS DISTINCT FROM owner_id OR NEW.branch_id IS DISTINCT FROM sale_branch THEN
    RAISE EXCEPTION 'Payment must match the entire registration snapshot' USING ERRCODE='23514';
  END IF;
  IF NEW.status='COMPLETED' AND EXISTS(SELECT 1 FROM payments WHERE registration_id=NEW.registration_id AND status='COMPLETED' AND id<>NEW.id) THEN
    RAISE EXCEPTION 'Registration already paid' USING ERRCODE='23505';
  END IF;
  RETURN NEW;
END $$;

-- 2.2. pt_commission_configs: Cấu hình tỷ lệ hoa hồng PT
CREATE TABLE IF NOT EXISTS pt_commission_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    pt_id UUID NULL REFERENCES pt_profiles(id) ON DELETE CASCADE,
    commission_percentage DECIMAL(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3. pt_commissions: Bảng kê tính hoa hồng PT hàng tháng
CREATE TABLE IF NOT EXISTS pt_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pt_id UUID NOT NULL REFERENCES pt_profiles(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2026),
    total_pt_sessions_taught INTEGER NOT NULL DEFAULT 0,
    pt_revenue_share DECIMAL(12,2) NOT NULL DEFAULT 0,
    commission_percentage DECIMAL(5,2) NOT NULL,
    total_commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID')),
    paid_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT pt_commissions_pt_month_year_key UNIQUE (pt_id, month, year)
);

-- 2.4. community_classes: Lớp tập cộng đồng (Aerobic, Yoga, Cardio)
CREATE TABLE IF NOT EXISTS community_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    instructor_name VARCHAR(150) NOT NULL,
    class_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_slots INTEGER NOT NULL DEFAULT 40,
    enrolled_slots INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'OPEN', 'COMPLETED', 'CANCELLED')),
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5. community_class_registrations: Hội viên đăng ký lớp cộng đồng
CREATE TABLE IF NOT EXISTS community_class_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES community_classes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
    registration_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED', 'ATTENDED')),
    CONSTRAINT community_class_reg_class_member_key UNIQUE (class_id, member_id)
);

-- 2.6. group_pt_members: Thành viên nhóm gói PT 1-Nhiều
CREATE TABLE IF NOT EXISTS group_pt_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
    inviter_member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
    invitation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (invitation_status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    joined_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT group_pt_members_reg_member_key UNIQUE (registration_id, member_id)
);

-- 2.7. package_freezes: Lịch sử đóng băng gói tập
CREATE TABLE IF NOT EXISTS package_freezes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    freeze_days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    approved_by_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8. package_transfers: Lịch sử chuyển nhượng gói tập
CREATE TABLE IF NOT EXISTS package_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    from_member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE RESTRICT,
    to_member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE RESTRICT,
    transfer_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
    reason TEXT NULL,
    approved_by_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9. holidays: Lịch ngày lễ
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NULL REFERENCES branches(id) ON DELETE CASCADE,
    holiday_date DATE NOT NULL,
    title VARCHAR(200) NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tạo Index tăng tốc truy vấn cho các bảng mới
CREATE INDEX IF NOT EXISTS idx_pt_commissions_pt_month ON pt_commissions (pt_id, year, month);
CREATE INDEX IF NOT EXISTS idx_community_classes_date ON community_classes (branch_id, class_date);
CREATE INDEX IF NOT EXISTS idx_package_freezes_reg ON package_freezes (registration_id, status);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts (code, is_active);
