-- ============================================================================
-- PARADISE GYM - SEED DATA FOR BOSS FEEDBACK EXPANSIONS (2026-09-19)
-- ============================================================================

-- 1. Cập nhật các gói tập hiện có với 3 trường giá, thời lượng buổi và hình thức gói
UPDATE packages SET
    gym_price = 1000.00,
    pt_price = 0.00,
    combo_price = 0.00,
    session_duration_minutes = 60,
    package_mode = 'INDIVIDUAL'
WHERE package_code = 'GYM-1M';

UPDATE packages SET
    gym_price = 2000.00,
    pt_price = 0.00,
    combo_price = 0.00,
    session_duration_minutes = 60,
    package_mode = 'INDIVIDUAL'
WHERE package_code = 'GYM-3M';

UPDATE packages SET
    gym_price = 2000.00,
    pt_price = 0.00,
    combo_price = 0.00,
    session_duration_minutes = 60,
    package_mode = 'INDIVIDUAL'
WHERE package_code = 'VIP-YEAR';

UPDATE packages SET
    gym_price = 0.00,
    pt_price = 1000.00,
    combo_price = 0.00,
    session_duration_minutes = 60,
    package_mode = 'INDIVIDUAL'
WHERE package_code = 'PT-12S';

UPDATE packages SET
    gym_price = 0.00,
    pt_price = 2000.00,
    combo_price = 0.00,
    session_duration_minutes = 60,
    package_mode = 'INDIVIDUAL'
WHERE package_code = 'PT-20S';

UPDATE packages SET
    gym_price = 0.00,
    pt_price = 2000.00,
    combo_price = 0.00,
    session_duration_minutes = 90,
    package_mode = 'INDIVIDUAL'
WHERE package_code = 'PT-36S';

UPDATE packages SET
    gym_price = 800.00,
    pt_price = 1500.00,
    combo_price = 2000.00,
    session_duration_minutes = 60,
    package_mode = 'INDIVIDUAL'
WHERE package_code = 'COMBO-VIP';

-- Thêm gói PT 1-Nhiều (Small Group PT) mẫu
INSERT INTO packages (id, package_code, package_name, package_type, price, gym_price, pt_price, combo_price, duration_days, total_pt_sessions, session_duration_minutes, package_mode, max_group_members, status, description)
VALUES
    ('30000000-0000-0000-0000-000000000007', 'PT-GROUP-10S', 'Gói PT Nhóm 1-Nhiều (10 buổi)', 'PT_SESSION', 3000.00, 0.00, 3000.00, 0.00, NULL, 10, 75, 'GROUP_PT', 4, 'ACTIVE', 'Gói huấn luyện nhóm tối đa 4 học viên, thời lượng 75 phút/buổi cùng HLV riêng')
ON CONFLICT (package_code) DO NOTHING;

INSERT INTO package_branches (package_id, branch_id)
VALUES
    ('30000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111'),
    ('30000000-0000-0000-0000-000000000007', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- 2. Cập nhật Avatar, QR Code và Face Enrollment cho PTs và Members
UPDATE pt_profiles SET
    avatar_url = 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=300&auto=format&fit=crop&q=80',
    face_enrolled = TRUE
WHERE pt_code = 'PT001';

UPDATE pt_profiles SET
    avatar_url = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&auto=format&fit=crop&q=80',
    face_enrolled = TRUE
WHERE pt_code = 'PT002';

UPDATE member_profiles SET
    avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    qr_code = 'QR-HV001-0987654321',
    face_enrolled = TRUE
WHERE member_code = 'HV001';

UPDATE member_profiles SET
    avatar_url = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
    qr_code = 'QR-HV002-0902345678',
    face_enrolled = TRUE
WHERE member_code = 'HV002';

UPDATE member_profiles SET
    avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    qr_code = 'QR-HV003-0934567890',
    face_enrolled = TRUE
WHERE member_code = 'HV003';

UPDATE member_profiles SET
    avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
    qr_code = 'QR-HV004-0978123456',
    face_enrolled = FALSE
WHERE member_code = 'HV004';

UPDATE member_profiles SET
    avatar_url = 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    qr_code = 'QR-HV005-0905678901',
    face_enrolled = TRUE
WHERE member_code = 'HV005';

UPDATE member_profiles SET
    avatar_url = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    qr_code = 'QR-HV008-0912345679',
    face_enrolled = TRUE
WHERE member_code = 'HV008';

UPDATE member_profiles SET
    avatar_url = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&auto=format&fit=crop&q=80',
    qr_code = 'QR-HV006-0912345678',
    face_enrolled = FALSE
WHERE member_code = 'HV006';

-- Đồng bộ avatar_url sang bảng accounts
UPDATE accounts a
SET avatar_url = m.avatar_url
FROM member_profiles m
WHERE a.id = m.account_id AND m.avatar_url IS NOT NULL;

UPDATE accounts a
SET avatar_url = p.avatar_url
FROM pt_profiles p
WHERE a.id = p.account_id AND p.avatar_url IS NOT NULL;

-- 3. Khuyến mãi & Mã giảm giá (Discounts)
INSERT INTO discounts (id, branch_id, code, title, discount_type, discount_value, min_order_value, max_discount_amount, start_date, end_date, usage_limit, used_count, is_active)
VALUES
    ('80000000-0000-0000-0000-000000000001', NULL, 'SUMMER2026', 'Khuyến Mãi Chào Hè Rực Rỡ 2026', 'PERCENT', 15.00, 1000.00, 500.00, '2026-05-01', '2026-09-30', 100, 12, TRUE),
    ('80000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'CHAOHE20', 'Ưu Đãi Khai Trương Chi Nhánh Q1', 'PERCENT', 20.00, 2000.00, 1000.00, '2026-01-01', '2026-12-31', 50, 5, TRUE),
    ('80000000-0000-0000-0000-000000000003', NULL, 'VIPFIT', 'Voucher Tri Ân Khách Hàng VIP', 'FIXED_AMOUNT', 200.00, 1000.00, NULL, '2026-01-01', '2026-12-31', 200, 34, TRUE)
ON CONFLICT (code) DO NOTHING;

-- 4. Cấu hình tỷ lệ hoa hồng PT (pt_commission_configs)
INSERT INTO pt_commission_configs (id, branch_id, pt_id, commission_percentage, effective_from)
VALUES
    ('81000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', NULL, 20.00, '2026-01-01'),
    ('81000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', NULL, 20.00, '2026-01-01'),
    ('81000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', NULL, 20.00, '2026-01-01'),
    ('81000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', '50000000-0000-0000-0000-000000000001', 25.00, '2026-01-01')
ON CONFLICT DO NOTHING;

-- 5. Lớp tập cộng đồng (Community Classes)
INSERT INTO community_classes (id, branch_id, title, instructor_name, class_date, start_time, end_time, max_slots, enrolled_slots, status, description)
VALUES
    ('82000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cardio Đốt Mỡ Buổi Sáng', 'HLV Tuấn Anh', CURRENT_DATE, '07:00:00', '08:00:00', 40, 2, 'OPEN', 'Bài tập chuỗi Cardio cường độ cao giúp kích hoạt trao đổi chất và tiêu hao năng lượng tối đa'),
    ('82000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Yoga Hatha Khỏe Đẹp', 'Cô Mai Phương', CURRENT_DATE, '18:30:00', '19:30:00', 30, 0, 'OPEN', 'Cân bằng thân tâm trí, tăng cường độ dẻo dai cơ gân và giải tỏa căng thẳng sau giờ làm việc'),
    ('82000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Aerobic Năng Lượng Chiều', 'Thầy Alex', CURRENT_DATE + 1, '17:30:00', '18:30:00', 35, 0, 'OPEN', 'Vũ điệu Aerobic sôi động trên nền nhạc remix hiện đại, tăng sức bền tim mạch')
ON CONFLICT DO NOTHING;

-- Ghi danh mẫu vào lớp cộng đồng
INSERT INTO community_class_registrations (id, class_id, member_id, status)
VALUES
    ('83000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'CONFIRMED'),
    ('83000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'CONFIRMED')
ON CONFLICT DO NOTHING;

-- 6. Lịch ngày lễ (Holidays)
INSERT INTO holidays (id, branch_id, holiday_date, title, is_closed)
VALUES
    ('84000000-0000-0000-0000-000000000001', NULL, '2026-04-30', 'Kỷ Niệm Giải Phóng Miền Nam', TRUE),
    ('84000000-0000-0000-0000-000000000002', NULL, '2026-05-01', 'Quốc Tế Lao Động', TRUE),
    ('84000000-0000-0000-0000-000000000003', NULL, '2026-09-02', 'Quốc Khánh Nước CHXHCN Việt Nam', TRUE)
ON CONFLICT DO NOTHING;

-- 7. Đồng bộ & Backfill Snapshot Giá Gói cho Registrations & PT Bookings
UPDATE packages SET
    gym_price = 2000000.00,
    pt_price = 4500000.00,
    combo_price = 6500000.00,
    price = 6500000.00
WHERE package_code = 'COMBO-VIP';

UPDATE packages SET
    gym_price = 1800000.00,
    pt_price = 4200000.00,
    combo_price = 6000000.00,
    price = 6000000.00
WHERE package_type = 'COMBO' AND (pt_price IS NULL OR pt_price = 0);

UPDATE packages SET
    pt_price = price,
    gym_price = 0.00
WHERE package_type = 'PT_SESSION' AND (pt_price IS NULL OR pt_price = 0);

UPDATE registrations SET
    price_snapshot = 6500000.00,
    pt_price_snapshot = 4500000.00,
    gym_price_snapshot = 2000000.00,
    combo_price_snapshot = 6500000.00
WHERE id = 'aaa0f898-4816-478a-b316-1cc027e33a98';

UPDATE registrations r
SET 
    pt_price_snapshot = COALESCE(
        NULLIF(r.pt_price_snapshot, 0),
        NULLIF(p.pt_price, 0),
        CASE 
            WHEN r.package_type_snapshot = 'PT_SESSION' THEN r.price_snapshot 
            WHEN r.package_type_snapshot = 'COMBO' THEN ROUND(r.price_snapshot * 0.7, 2)
            ELSE 0 
        END
    ),
    gym_price_snapshot = COALESCE(
        NULLIF(r.gym_price_snapshot, 0),
        NULLIF(p.gym_price, 0),
        CASE 
            WHEN r.package_type_snapshot LIKE 'GYM%' THEN r.price_snapshot 
            WHEN r.package_type_snapshot = 'COMBO' THEN ROUND(r.price_snapshot * 0.3, 2)
            ELSE 0 
        END
    ),
    combo_price_snapshot = COALESCE(
        NULLIF(r.combo_price_snapshot, 0),
        NULLIF(p.combo_price, 0),
        CASE WHEN r.package_type_snapshot = 'COMBO' THEN r.price_snapshot ELSE 0 END
    )
FROM packages p
WHERE p.id = r.package_id
  AND (r.pt_price_snapshot IS NULL OR r.pt_price_snapshot = 0);

-- Fresh seed has no completed bookings, so there are no earned commissions to seed.
