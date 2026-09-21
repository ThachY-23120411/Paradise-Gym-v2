-- Migration 015: Package Transfer Requests (Yêu cầu chuyển nhượng gói tập giữa các hội viên)
CREATE TABLE IF NOT EXISTS package_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  to_member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  reason TEXT,
  transfer_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_from ON package_transfer_requests(from_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_to ON package_transfer_requests(to_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_reg ON package_transfer_requests(registration_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_transfer_per_reg ON package_transfer_requests(registration_id) WHERE status = 'PENDING';
