-- ============================================================================
-- PARADISE GYM DATABASE SCHEMA (22 TABLES - 3NF SPECIFICATION)
-- Based on docs/database/erd.md
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. branches
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_code VARCHAR(30) UNIQUE NOT NULL,
    branch_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    open_time TIME NOT NULL DEFAULT '06:00:00',
    close_time TIME NOT NULL DEFAULT '22:00:00',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login_phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_ACTIVATION',
    avatar_url VARCHAR(500) NULL,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ NULL,
    is_two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. roles
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(30) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL
);

-- 4. account_roles
CREATE TABLE IF NOT EXISTS account_roles (
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (account_id, role_id)
);

-- 5. account_branch_scopes
CREATE TABLE IF NOT EXISTS account_branch_scopes (
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    is_all_branches BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (account_id, branch_id)
);

-- 6. member_profiles
CREATE TABLE IF NOT EXISTS member_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NULL REFERENCES accounts(id) ON DELETE SET NULL,
    home_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    member_code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150) NULL,
    date_of_birth DATE NULL,
    gender VARCHAR(10) NULL,
    avatar_url VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by UUID NULL REFERENCES accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. pt_profiles
CREATE TABLE IF NOT EXISTS pt_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NULL REFERENCES accounts(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    pt_code VARCHAR(30) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150) NULL,
    gender VARCHAR(10) NULL,
    bio TEXT NULL,
    specialties TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    work_start_time TIME NOT NULL DEFAULT '08:00:00',
    work_end_time TIME NOT NULL DEFAULT '18:00:00',
    work_days VARCHAR(50) NOT NULL DEFAULT 'MON_TO_FRI',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. packages
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_code VARCHAR(30) UNIQUE NOT NULL,
    package_name VARCHAR(150) NOT NULL,
    package_type VARCHAR(30) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    duration_days INT NOT NULL,
    total_gym_sessions INT NULL,
    total_pt_sessions INT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. package_branches
CREATE TABLE IF NOT EXISTS package_branches (
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    PRIMARY KEY (package_id, branch_id)
);

-- 10. registrations
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reg_code VARCHAR(30) UNIQUE NULL,
    member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE RESTRICT,
    package_id UUID NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
    assigned_pt_id UUID NULL REFERENCES pt_profiles(id) ON DELETE RESTRICT,
    sold_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    previous_registration_id UUID NULL REFERENCES registrations(id) ON DELETE SET NULL,
    package_name_snapshot VARCHAR(150) NOT NULL,
    package_type_snapshot VARCHAR(30) NOT NULL,
    price_snapshot DECIMAL(12,2) NOT NULL,
    duration_days_snapshot INT NOT NULL,
    total_gym_sessions_snapshot INT NULL,
    total_pt_sessions_snapshot INT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    remaining_gym_sessions INT NULL,
    remaining_pt_sessions INT NULL,
    booked_pt_sessions INT NOT NULL DEFAULT 0,
    used_pt_sessions INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
    created_by UUID NULL REFERENCES accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. registration_allowed_branches
CREATE TABLE IF NOT EXISTS registration_allowed_branches (
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    PRIMARY KEY (registration_id, branch_id)
);

-- 12. pt_assignment_requests
CREATE TABLE IF NOT EXISTS pt_assignment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE RESTRICT,
    pt_id UUID NOT NULL REFERENCES pt_profiles(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    request_note TEXT NULL,
    response_note TEXT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ NULL
);

-- 13. pt_bookings
CREATE TABLE IF NOT EXISTS pt_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE RESTRICT,
    pt_id UUID NOT NULL REFERENCES pt_profiles(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    session_number INT NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'BOOKED',
    workout_notes TEXT NULL,
    fitness_assessment TEXT NULL,
    cancelled_by VARCHAR(20) NULL,
    cancel_reason TEXT NULL,
    cancelled_at TIMESTAMPTZ NULL,
    pt_confirmed_at TIMESTAMPTZ NULL,
    member_confirmed_at TIMESTAMPTZ NULL,
    is_deducted BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NULL REFERENCES accounts(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    payment_code VARCHAR(40) UNIQUE NOT NULL,
    payment_method VARCHAR(30) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    transaction_ref VARCHAR(100) NULL,
    collected_by UUID NULL REFERENCES accounts(id),
    confirmed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. receipts
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID UNIQUE NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    receipt_code VARCHAR(40) UNIQUE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payer_name VARCHAR(150) NOT NULL,
    payer_phone VARCHAR(20) NOT NULL,
    issued_by UUID NOT NULL REFERENCES accounts(id),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT NULL
);

-- 16. devices
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    device_code VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(150) NOT NULL,
    device_type VARCHAR(30) NOT NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'IN',
    status VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
    ip_address VARCHAR(45) NULL,
    location_description VARCHAR(255) NULL,
    last_synced_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. access_logs
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE RESTRICT,
    registration_id UUID NULL REFERENCES registrations(id) ON DELETE SET NULL,
    device_id UUID NULL REFERENCES devices(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    direction VARCHAR(10) NOT NULL DEFAULT 'IN',
    access_method VARCHAR(30) NOT NULL DEFAULT 'FACE_ID',
    status VARCHAR(20) NOT NULL DEFAULT 'ALLOWED',
    denial_reason VARCHAR(255) NULL,
    is_duplicate_warning BOOLEAN NOT NULL DEFAULT FALSE,
    is_gym_session_deducted BOOLEAN NOT NULL DEFAULT FALSE,
    manual_recorded_by UUID NULL REFERENCES accounts(id),
    manual_reason TEXT NULL,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. member_consents
CREATE TABLE IF NOT EXISTS member_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    is_granted BOOLEAN NOT NULL DEFAULT FALSE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. biometric_face_data
CREATE TABLE IF NOT EXISTS biometric_face_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID UNIQUE NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
    face_template_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    enrolled_by UUID NOT NULL REFERENCES accounts(id),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delete_scheduled_at TIMESTAMPTZ NULL
);

-- 20. notification_templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(50) UNIQUE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    target_role VARCHAR(20) NOT NULL,
    title_template VARCHAR(200) NOT NULL,
    body_template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    template_id UUID NULL REFERENCES notification_templates(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    reference_type VARCHAR(30) NULL,
    reference_id UUID NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
    action_name VARCHAR(100) NOT NULL,
    target_table VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    old_values JSONB NULL,
    new_values JSONB NULL,
    reason TEXT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_profiles_phone ON member_profiles(phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_login_phone ON accounts(login_phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_pt_profiles_phone ON pt_profiles(phone);

CREATE INDEX IF NOT EXISTS idx_access_logs_checkin_perf 
ON access_logs(member_id, direction, check_in_time DESC);

CREATE INDEX IF NOT EXISTS idx_pt_bookings_slot_lookup 
ON pt_bookings(pt_id, booking_date, status) 
WHERE status IN ('BOOKED', 'PENDING_COMPLETION');

CREATE INDEX IF NOT EXISTS idx_registrations_active_lookup 
ON registrations(member_id, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_payments_report_lookup 
ON payments(branch_id, confirmed_at);
