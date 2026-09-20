-- ============================================================================
-- PARADISE GYM - COMPREHENSIVE RELATIONAL SEED DATA (22 TABLES)
-- Fully compliant with 3NF relational model, primary keys, foreign keys & business rules
-- ============================================================================

-- 1. Branches (3 branches with realistic addresses and fixed operating hours 05:30 - 22:00)
INSERT INTO branches (id, branch_code, branch_name, phone, address, status, open_time, close_time, timezone)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'CN-Q01', 'Paradise Gym Quận 1', '02838221111', 'Số 123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM', 'ACTIVE', '05:30:00', '22:00:00', 'Asia/Ho_Chi_Minh'),
    ('22222222-2222-2222-2222-222222222222', 'CN-BT01', 'Paradise Gym Bình Thạnh', '02838992222', 'Số 456 Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM', 'ACTIVE', '05:30:00', '22:00:00', 'Asia/Ho_Chi_Minh'),
    ('33333333-3333-3333-3333-333333333333', 'CN-Q02', 'Paradise Gym Thảo Điền (Q2)', '02837443333', 'Số 88 Xuân Thủy, Phường Thảo Điền, TP. Thủ Đức, TP.HCM', 'ACTIVE', '05:30:00', '22:00:00', 'Asia/Ho_Chi_Minh')
ON CONFLICT (branch_code) DO NOTHING;

-- 2. Roles
INSERT INTO roles (id, role_code, role_name, description)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'QTV', 'Quản trị viên', 'Toàn quyền quản trị hệ thống và chuỗi chi nhánh'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'RECEPTIONIST', 'Lễ tân', 'Tiếp đón, tạo hồ sơ, bán gói, thu tiền, kiểm soát cửa'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'PT', 'Huấn luyện viên', 'Huấn luyện cá nhân 1-1, điểm danh buổi tập'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'MEMBER', 'Hội viên', 'Hội viên sử dụng dịch vụ phòng gym và app mobile')
ON CONFLICT (role_code) DO NOTHING;

-- 3. Accounts (Password for all: 'Paradise@123')
-- Bcrypt hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve'
INSERT INTO accounts (id, login_phone, password_hash, status, is_two_factor_enabled)
VALUES
    ('99999999-9999-9999-9999-999999999991', '0900000001', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', TRUE),  -- Admin QTV
    ('99999999-9999-9999-9999-999999999992', '0900000002', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- Lễ tân Q1
    ('99999999-9999-9999-9999-999999999993', '0900000004', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- PT 2 (Vũ Hoàng Minh)
    ('99999999-9999-9999-9999-999999999994', '0900000003', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- PT 1 (Nguyễn Văn Thể)
    ('99999999-9999-9999-9999-999999999995', '0900000005', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- PT 3 (Đặng Minh Tuấn)
    ('99999999-9999-9999-9999-999999999984', '0900000006', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- PT 4 (Trần Thị Mai)
    ('99999999-9999-9999-9999-999999999996', '0987654321', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- Member 1 (Lê Hoàng Nam)
    ('99999999-9999-9999-9999-999999999997', '0902345678', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- Member 2 (Trần Thị Bình)
    ('99999999-9999-9999-9999-999999999998', '0934567890', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- Member 3 (Phạm Quốc Bảo)
    ('99999999-9999-9999-9999-999999999999', '0978123456', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- Member 4 (Vũ Thu Thảo)
    ('99999999-9999-9999-9999-999999999990', '0905678901', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- Member 5 (Vũ Minh Phúc)
    ('99999999-9999-9999-9999-999999999988', '0912345679', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE), -- Member 8 (Nguyễn Thảo Ly)
    ('99999999-9999-9999-9999-999999999989', '0912345678', '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', 'ACTIVE', FALSE)  -- Member 6 (Trần Thị Lan)
ON CONFLICT (login_phone) DO NOTHING;

-- 4. Account Roles
INSERT INTO account_roles (account_id, role_id)
VALUES
    ('99999999-9999-9999-9999-999999999991', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), -- QTV
    ('99999999-9999-9999-9999-999999999992', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), -- Lễ tân Q1
    ('99999999-9999-9999-9999-999999999993', 'cccccccc-cccc-cccc-cccc-cccccccccccc'), -- PT 2
    ('99999999-9999-9999-9999-999999999994', 'cccccccc-cccc-cccc-cccc-cccccccccccc'), -- PT 1
    ('99999999-9999-9999-9999-999999999995', 'cccccccc-cccc-cccc-cccc-cccccccccccc'), -- PT 3
    ('99999999-9999-9999-9999-999999999984', 'cccccccc-cccc-cccc-cccc-cccccccccccc'), -- PT 4
    ('99999999-9999-9999-9999-999999999996', 'dddddddd-dddd-dddd-dddd-dddddddddddd'), -- Member 1
    ('99999999-9999-9999-9999-999999999997', 'dddddddd-dddd-dddd-dddd-dddddddddddd'), -- Member 2
    ('99999999-9999-9999-9999-999999999998', 'dddddddd-dddd-dddd-dddd-dddddddddddd'), -- Member 3
    ('99999999-9999-9999-9999-999999999999', 'dddddddd-dddd-dddd-dddd-dddddddddddd'), -- Member 4
    ('99999999-9999-9999-9999-999999999990', 'dddddddd-dddd-dddd-dddd-dddddddddddd'), -- Member 5
    ('99999999-9999-9999-9999-999999999988', 'dddddddd-dddd-dddd-dddd-dddddddddddd'), -- Member 8
    ('99999999-9999-9999-9999-999999999989', 'dddddddd-dddd-dddd-dddd-dddddddddddd')  -- Member 6
ON CONFLICT DO NOTHING;

-- 5. Account Branch Scopes
INSERT INTO account_branch_scopes (account_id, branch_id, is_all_branches)
VALUES
    ('99999999-9999-9999-9999-999999999991', '11111111-1111-1111-1111-111111111111', TRUE),  -- QTV xem tất cả chi nhánh
    ('99999999-9999-9999-9999-999999999992', '11111111-1111-1111-1111-111111111111', FALSE), -- Lễ tân Q1
    ('99999999-9999-9999-9999-999999999993', '22222222-2222-2222-2222-222222222222', FALSE), -- PT 2 Lê Văn Hùng (Bình Thạnh)
    ('99999999-9999-9999-9999-999999999994', '11111111-1111-1111-1111-111111111111', FALSE), -- PT 1 Nguyễn Văn Thể (Q1)
    ('99999999-9999-9999-9999-999999999995', '22222222-2222-2222-2222-222222222222', FALSE), -- PT 3 Đặng Minh Tuấn (BT)
    ('99999999-9999-9999-9999-999999999984', '22222222-2222-2222-2222-222222222222', FALSE)  -- PT 4 Trần Thị Mai (BT)
ON CONFLICT DO NOTHING;

-- 6. PT Profiles (Huấn luyện viên cá nhân)
INSERT INTO pt_profiles (id, account_id, branch_id, pt_code, full_name, phone, email, gender, bio, specialties, status, work_start_time, work_end_time, work_days)
VALUES
    ('50000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999994', '11111111-1111-1111-1111-111111111111', 'PT001', 'Nguyễn Văn Thể', '0900000003', 'pt.the@paradisegym.vn', 'NAM', 'HLV 6 năm kinh nghiệm thể hình chuyên sâu, chứng chỉ NASM quốc tế', 'Tăng cơ, Giảm mỡ cấp tốc, Boxing', 'ACTIVE', '08:00:00', '18:00:00', 'ALL_WEEK'),
    ('50000000-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999993', '22222222-2222-2222-2222-222222222222', 'PT002', 'Lê Văn Hùng', '0900000004', 'pt.hung@paradisegym.vn', 'NAM', 'Cựu VĐV Thể hình, 5 năm kinh nghiệm huấn luyện Combo Gym & PT', 'Tăng cơ chuyên sâu, Siết mỡ, Thể hình', 'ACTIVE', '08:00:00', '18:00:00', 'ALL_WEEK'),
    ('50000000-0000-0000-0000-000000000003', '99999999-9999-9999-9999-999999999995', '22222222-2222-2222-2222-222222222222', 'PT003', 'Đặng Minh Tuấn', '0900000005', 'pt.tuan@paradisegym.vn', 'NAM', 'Chuyên gia phục hồi chức năng và chỉnh tư thế cột sống, 6 năm kinh nghiệm', 'Thể hình thi đấu, Phục hồi chức năng', 'ACTIVE', '08:00:00', '18:00:00', 'ALL_WEEK'),
    ('50000000-0000-0000-0000-000000000004', '99999999-9999-9999-9999-999999999984', '22222222-2222-2222-2222-222222222222', 'PT004', 'Trần Thị Mai', '0900000006', 'pt.mai@paradisegym.vn', 'NU', 'HLV nữ tận tâm, chuyên siết eo thon dáng đồng hồ cát, 3 năm kinh nghiệm', 'Giảm cân nữ, Pilates Mat, Dẻo dai', 'ACTIVE', '08:00:00', '18:00:00', 'ALL_WEEK')
ON CONFLICT (phone) DO NOTHING;

-- 7. Member Profiles (Hồ sơ hội viên)
INSERT INTO member_profiles (id, account_id, home_branch_id, member_code, full_name, phone, email, date_of_birth, gender, status)
VALUES
    ('40000000-0000-0000-0000-000000000001', '99999999-9999-9999-9999-999999999996', '11111111-1111-1111-1111-111111111111', 'HV001', 'Lê Hoàng Nam', '0987654321', 'nam.le@gmail.com', '1992-09-24', 'NAM', 'ACTIVE'),
    ('40000000-0000-0000-0000-000000000002', '99999999-9999-9999-9999-999999999997', '11111111-1111-1111-1111-111111111111', 'HV002', 'Trần Thị Bình', '0902345678', 'binh.tran@gmail.com', '1995-04-12', 'NU', 'ACTIVE'),
    ('40000000-0000-0000-0000-000000000003', '99999999-9999-9999-9999-999999999998', '11111111-1111-1111-1111-111111111111', 'HV003', 'Phạm Quốc Bảo', '0934567890', 'bao.pham@gmail.com', '1998-11-05', 'NAM', 'ACTIVE'),
    ('40000000-0000-0000-0000-000000000004', '99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', 'HV004', 'Vũ Thu Thảo', '0978123456', 'thao.vu@gmail.com', '1996-02-18', 'NU', 'ACTIVE'),
    ('40000000-0000-0000-0000-000000000005', '99999999-9999-9999-9999-999999999990', '11111111-1111-1111-1111-111111111111', 'HV005', 'Vũ Minh Phúc', '0905678901', 'phuc.vu@gmail.com', '1994-08-15', 'NAM', 'ACTIVE'),
    ('40000000-0000-0000-0000-000000000008', '99999999-9999-9999-9999-999999999988', '11111111-1111-1111-1111-111111111111', 'HV008', 'Nguyễn Thảo Ly', '0912345679', 'ly.nguyen@gmail.com', '1997-03-22', 'NU', 'ACTIVE'),
    ('40000000-0000-0000-0000-000000000006', '99999999-9999-9999-9999-999999999989', '22222222-2222-2222-2222-222222222222', 'HV006', 'Trần Thị Lan', '0912345678', 'lan.tran@paradise.gym', '1998-11-20', 'NU', 'ACTIVE')
ON CONFLICT (phone) DO NOTHING;

-- 8. Packages (Danh mục gói tập chuẩn nghiệp vụ - Giá test 1.000 - 2.000 VNĐ)
INSERT INTO packages (id, package_code, package_name, package_type, price, duration_days, total_gym_sessions, total_pt_sessions, status, description)
VALUES
    ('30000000-0000-0000-0000-000000000001', 'GYM-1M', 'Gói Gym Tiêu Chuẩn 1 Tháng', 'GYM_TIME', 1000.00, 30, NULL, NULL, 'ACTIVE', 'Tập Gym không giới hạn số lần tại chi nhánh đăng ký trong 30 ngày (Giá test 1.000 đ)'),
    ('30000000-0000-0000-0000-000000000002', 'GYM-3M', 'Gói Gym Năng Động 3 Tháng', 'GYM_TIME', 2000.00, 90, NULL, NULL, 'ACTIVE', 'Tập Gym không giới hạn toàn hệ thống 90 ngày, tặng 1 buổi định hướng (Giá test 2.000 đ)'),
    ('30000000-0000-0000-0000-000000000003', 'VIP-YEAR', 'Gói VIP Hoàng Gia 1 Năm Đa Chi Nhánh', 'GYM_TIME', 2000.00, 365, NULL, NULL, 'ACTIVE', 'Tập Gym toàn chuỗi 365 ngày kèm tủ khóa riêng, xông hơi và nước uống miễn phí (Giá test 2.000 đ)'),
    ('30000000-0000-0000-0000-000000000004', 'PT-20S', 'Gói PT Cao Cấp 20 buổi', 'PT_SESSION', 2000.00, NULL, NULL, 20, 'ACTIVE', '20 buổi kèm 1-1 chuyên sâu cùng HLV thể hình quốc tế NASM (Giá test 2.000 đ)'),
    ('30000000-0000-0000-0000-000000000005', 'PT-36S', 'Gói PT Tăng Cơ 36 buổi', 'PT_SESSION', 2000.00, NULL, NULL, 36, 'ACTIVE', '36 buổi huấn luyện chuyên sâu tăng cơ, cải thiện vóc dáng toàn diện (Giá test 2.000 đ)'),
    ('30000000-0000-0000-0000-000000000006', 'PT-12S', 'Gói PT Giảm Mỡ 12 buổi', 'PT_SESSION', 1000.00, NULL, NULL, 12, 'ACTIVE', '12 buổi tập kèm 1-1 cùng HLV cá nhân chuyên nghiệp (Giá test 1.000 đ)'),
    ('55555555-5555-5555-5555-555555555554', 'COMBO-VIP', 'Gói Combo VIP (Gym 30 buổi + PT 12 buổi)', 'COMBO', 2000.00, 90, 30, 12, 'ACTIVE', 'Gói kết hợp Gym 30 buổi và 12 buổi tập 1-1 cùng Huấn luyện viên cá nhân (Giá test 2.000 đ)')
ON CONFLICT (package_code) DO UPDATE SET price = EXCLUDED.price, description = EXCLUDED.description;

-- 9. Package Branches (Gán gói tập vào các chi nhánh được phép)
INSERT INTO package_branches (package_id, branch_id)
VALUES
    ('30000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111'),
    ('30000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222'),
    ('30000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111'),
    ('30000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222'),
    ('30000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333'),
    ('30000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111'),
    ('30000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222'),
    ('30000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333'),
    ('30000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111'),
    ('30000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111'),
    ('30000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111'),
    ('55555555-5555-5555-5555-555555555554', '11111111-1111-1111-1111-111111111111'),
    ('55555555-5555-5555-5555-555555555554', '22222222-2222-2222-2222-222222222222'),
    ('55555555-5555-5555-5555-555555555554', '33333333-3333-3333-3333-333333333333')
ON CONFLICT DO NOTHING;

-- -- 10. Devices (Thiết bị cổng và Kiosk)
INSERT INTO devices (id, branch_id, device_code, device_name, device_type, direction, status, location_description)
VALUES
    ('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', 'GATE-Q1-01', 'Cổng xoay RFID/FaceID Cửa vào Q1', 'CARD_READER', 'IN', 'ONLINE', 'Cửa chính sảnh tầng trệt'),
    ('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', 'GATE-Q1-02', 'Cổng xoay RFID Cửa ra Q1', 'CARD_READER', 'OUT', 'ONLINE', 'Cửa chính sảnh tầng trệt'),
    ('66666666-6666-6666-6666-666666666663', '11111111-1111-1111-1111-111111111111', 'KIOSK-Q1-K01', 'Màn hình Kiosk chào mừng K01', 'KIOSK_K01', 'IN', 'ONLINE', 'Sảnh lễ tân Quận 1'),
    ('66666666-6666-6666-6666-666666666664', '22222222-2222-2222-2222-222222222222', 'GATE-BT-01', 'Cổng Flap Gate Cửa vào Bình Thạnh', 'CARD_READER', 'IN', 'ONLINE', 'Sảnh chính Bình Thạnh')
ON CONFLICT (device_code) DO NOTHING;

-- 11. Notification Templates (Mẫu thông báo hệ thống)
INSERT INTO notification_templates (id, template_code, event_type, target_role, title_template, body_template, is_active)
VALUES
    ('77777777-7777-7777-7777-777777777771', 'REG_SUCCESS', 'REGISTRATION_ACTIVATED', 'MEMBER', 'Kích hoạt gói tập thành công!', 'Chúc mừng {{member_name}} đã kích hoạt thành công gói {{package_name}}. Hạn dùng đến {{expiry_date}}.', TRUE),
    ('77777777-7777-7777-7777-777777777772', 'PAY_CONFIRM', 'PAYMENT_CONFIRMED', 'MEMBER', 'Xác nhận thanh toán thành công', 'Paradise Gym đã nhận đủ số tiền {{amount}} VNĐ cho gói {{package_name}}.', TRUE),
    ('77777777-7777-7777-7777-777777777773', 'PT_DOUBLE_CONFIRM', 'PT_SESSION_CONFIRMED', 'MEMBER', 'Buổi tập PT đã hoàn thành', 'Buổi tập ngày {{booking_date}} ({{time_slot}}) với HLV {{pt_name}} đã được xác nhận kép thành công. Đã trừ 1 buổi tập.', TRUE),
    ('77777777-7777-7777-7777-777777777774', 'REG_CANCEL', 'REGISTRATION_CANCELLED', 'MEMBER', 'Gói tập đã bị hủy', 'Gói tập {{package_name}} ({{registration_code}}) của bạn đã được hủy thành công.', TRUE),
    ('77777777-7777-7777-7777-777777777775', 'PT_ASSIGN', 'PT_ASSIGNMENT_REQUEST', 'MEMBER', 'Yêu cầu phân công HLV', 'Yêu cầu phân công HLV {{pt_name}} cho gói {{package_name}} đã được ghi nhận.', TRUE),
    ('77777777-7777-7777-7777-777777777776', 'PT_ACCEPT', 'PT_REQUEST_ACCEPTED', 'MEMBER', 'HLV đã tiếp nhận yêu cầu', 'HLV {{pt_name}} đã đồng ý tiếp nhận bạn làm học viên cho gói {{package_name}}.', TRUE),
    ('77777777-7777-7777-7777-777777777777', 'PT_REJECT', 'PT_REQUEST_REJECTED', 'MEMBER', 'Yêu cầu ghép HLV không thành công', 'HLV {{pt_name}} không thể tiếp nhận gói {{package_name}}. Lý do: {{cancel_reason}}.', TRUE),
    ('77777777-7777-7777-7777-777777777778', 'PT_AWAIT_CONFIRM', 'PT_SESSION_AWAITING_CONFIRMATION', 'MEMBER', 'Xác nhận kết quả buổi tập PT', 'HLV {{pt_name}} đã ghi nhận hoàn thành buổi tập ngày {{booking_date}} ({{time_slot}}). Vui lòng vào app kiểm tra và xác nhận kết quả.', TRUE),
    ('77777777-7777-7777-7777-777777777779', 'BOOKING_NEW', 'BOOKING_CREATED', 'MEMBER', 'Đặt lịch tập PT thành công', 'Lịch tập với HLV {{pt_name}} vào ngày {{booking_date}} ({{time_slot}}) đã được tạo thành công.', TRUE),
    ('77777777-7777-7777-7777-777777777780', 'BOOKING_CANCEL', 'BOOKING_CANCELLED', 'MEMBER', 'Lịch tập PT đã bị hủy', 'Lịch tập ngày {{booking_date}} ({{time_slot}}) đã bị hủy. {{cancel_reason}}', TRUE)
ON CONFLICT (template_code) DO NOTHING;

-- ============================================================================
-- LƯU Ý QUAN TRỌNG:
-- Toàn bộ các bảng nghiệp vụ (registrations, registration_allowed_branches,
-- pt_assignment_requests, payments, receipts, pt_bookings, access_logs,
-- notifications, audit_logs) được giữ TRỐNG HOÀN TOÀN (0 records).
-- Người dùng sẽ trực tiếp tương tác và kiểm thử các tính năng CRUD trên Web & Mobile!
-- ============================================================================
