-- Migration 009: Thông tin chi trả hoa hồng PT và tài khoản ngân hàng thụ hưởng
-- Bổ sung thông tin chi trả vào bảng pt_commissions
ALTER TABLE pt_commissions ADD COLUMN IF NOT EXISTS payout_method VARCHAR(30) DEFAULT 'BANK_TRANSFER';
ALTER TABLE pt_commissions ADD COLUMN IF NOT EXISTS payout_ref VARCHAR(100);
ALTER TABLE pt_commissions ADD COLUMN IF NOT EXISTS payout_note TEXT;
ALTER TABLE pt_commissions ADD COLUMN IF NOT EXISTS paid_by_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Bổ sung thông tin ngân hàng thụ hưởng vào hồ sơ huấn luyện viên pt_profiles
ALTER TABLE pt_profiles ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE pt_profiles ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(50);
ALTER TABLE pt_profiles ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(150);

-- Cập nhật dữ liệu ngân hàng mẫu cho các HLV hiện có
UPDATE pt_profiles 
SET bank_name = 'MB Bank (Quân Đội)', 
    bank_account_no = '0900000003', 
    bank_account_name = 'NGUYEN VAN THE'
WHERE pt_code = 'PT001' AND bank_account_no IS NULL;

UPDATE pt_profiles 
SET bank_name = 'Vietcombank', 
    bank_account_no = '0918776655', 
    bank_account_name = 'PHAM QUOC BAO'
WHERE pt_code = 'PT005' AND bank_account_no IS NULL;
