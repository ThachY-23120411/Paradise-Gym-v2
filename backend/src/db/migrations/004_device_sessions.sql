-- ============================================================================
-- 004_device_sessions.sql
-- Migration: Add account_sessions table for multi-device management & logout
-- ============================================================================

CREATE TABLE IF NOT EXISTS account_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    device_name VARCHAR(150) NULL,
    user_agent VARCHAR(500) NULL,
    ip_address VARCHAR(50) NULL,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + interval '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_sessions_account_id ON account_sessions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_sessions_is_revoked ON account_sessions(is_revoked);
