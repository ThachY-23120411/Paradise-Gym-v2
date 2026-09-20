const { Pool } = require('pg');
const env = require('./env');
const { v4: uuidv4 } = require('uuid');

let pool = null;
let isPgConnected = false;

// Seed initial memory state - Synchronized 100% with PostgreSQL 001_seed_data.sql
const memoryStore = {
  branches: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      branch_code: 'CN-Q01',
      branch_name: 'Paradise Gym Quận 1',
      phone: '02838221111',
      address: 'Số 123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM',
      status: 'ACTIVE',
      open_time: '05:30:00',
      close_time: '22:00:00',
      timezone: 'Asia/Ho_Chi_Minh',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      branch_code: 'CN-BT01',
      branch_name: 'Paradise Gym Bình Thạnh',
      phone: '02838992222',
      address: 'Số 456 Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM',
      status: 'ACTIVE',
      open_time: '05:30:00',
      close_time: '22:00:00',
      timezone: 'Asia/Ho_Chi_Minh',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      branch_code: 'CN-Q02',
      branch_name: 'Paradise Gym Thảo Điền (Q2)',
      phone: '02837443333',
      address: 'Số 88 Xuân Thủy, Phường Thảo Điền, TP. Thủ Đức, TP.HCM',
      status: 'ACTIVE',
      open_time: '05:30:00',
      close_time: '22:00:00',
      timezone: 'Asia/Ho_Chi_Minh',
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  roles: [
    { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', role_code: 'QTV', role_name: 'Quản trị viên', description: 'Toàn quyền quản trị hệ thống' },
    { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role_code: 'RECEPTIONIST', role_name: 'Lễ tân', description: 'Tiếp đón, bán gói, thu tiền, kiểm soát cửa' },
    { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', role_code: 'PT', role_name: 'Huấn luyện viên', description: 'Huấn luyện 1-1, điểm danh buổi tập' },
    { id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', role_code: 'MEMBER', role_name: 'Hội viên', description: 'Sử dụng dịch vụ và app mobile' }
  ],
  accounts: [
    {
      id: '99999999-9999-9999-9999-999999999991',
      login_phone: '0900000001',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve', // Paradise@123
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: true,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999992',
      login_phone: '0900000002',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999993',
      login_phone: '0900000004',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999994',
      login_phone: '0900000003',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999995',
      login_phone: '0900000005',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999996',
      login_phone: '0987654321',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999997',
      login_phone: '0902345678',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999998',
      login_phone: '0934567890',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999999',
      login_phone: '0978123456',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999990',
      login_phone: '0905678901',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999988',
      login_phone: '0912345679',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '99999999-9999-9999-9999-999999999989',
      login_phone: '0912345678',
      password_hash: '$2a$10$w09Zk28J995BwDszmJ9u9uY7t6V3xX/rCkW6Qn85NqSg.d4fR3yve',
      status: 'ACTIVE',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  account_roles: [
    { account_id: '99999999-9999-9999-9999-999999999991', role_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    { account_id: '99999999-9999-9999-9999-999999999992', role_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
    { account_id: '99999999-9999-9999-9999-999999999993', role_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
    { account_id: '99999999-9999-9999-9999-999999999994', role_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
    { account_id: '99999999-9999-9999-9999-999999999995', role_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
    { account_id: '99999999-9999-9999-9999-999999999983', role_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
    { account_id: '99999999-9999-9999-9999-999999999984', role_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
    { account_id: '99999999-9999-9999-9999-999999999996', role_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
    { account_id: '99999999-9999-9999-9999-999999999997', role_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
    { account_id: '99999999-9999-9999-9999-999999999998', role_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
    { account_id: '99999999-9999-9999-9999-999999999999', role_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
    { account_id: '99999999-9999-9999-9999-999999999990', role_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
    { account_id: '99999999-9999-9999-9999-999999999988', role_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' },
    { account_id: '99999999-9999-9999-9999-999999999989', role_id: 'dddddddd-dddd-dddd-dddd-dddddddddddd' }
  ],
  account_branch_scopes: [
    { account_id: '99999999-9999-9999-9999-999999999991', branch_id: '11111111-1111-1111-1111-111111111111', is_all_branches: true },
    { account_id: '99999999-9999-9999-9999-999999999992', branch_id: '11111111-1111-1111-1111-111111111111', is_all_branches: false },
    { account_id: '99999999-9999-9999-9999-999999999993', branch_id: '22222222-2222-2222-2222-222222222222', is_all_branches: false },
    { account_id: '99999999-9999-9999-9999-999999999994', branch_id: '11111111-1111-1111-1111-111111111111', is_all_branches: false },
    { account_id: '99999999-9999-9999-9999-999999999995', branch_id: '11111111-1111-1111-1111-111111111111', is_all_branches: false },
    { account_id: '99999999-9999-9999-9999-999999999983', branch_id: '22222222-2222-2222-2222-222222222222', is_all_branches: false },
    { account_id: '99999999-9999-9999-9999-999999999984', branch_id: '22222222-2222-2222-2222-222222222222', is_all_branches: false }
  ],
  member_profiles: [
    {
      id: '40000000-0000-0000-0000-000000000001',
      account_id: '99999999-9999-9999-9999-999999999996',
      home_branch_id: '11111111-1111-1111-1111-111111111111',
      member_code: 'HV001',
      full_name: 'Lê Hoàng Nam',
      phone: '0987654321',
      email: 'nam.le@gmail.com',
      date_of_birth: '1992-09-24',
      gender: 'NAM',
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '40000000-0000-0000-0000-000000000002',
      account_id: '99999999-9999-9999-9999-999999999997',
      home_branch_id: '11111111-1111-1111-1111-111111111111',
      member_code: 'HV002',
      full_name: 'Trần Thị Bình',
      phone: '0902345678',
      email: 'binh.tran@gmail.com',
      date_of_birth: '1995-04-12',
      gender: 'NU',
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '40000000-0000-0000-0000-000000000003',
      account_id: '99999999-9999-9999-9999-999999999998',
      home_branch_id: '11111111-1111-1111-1111-111111111111',
      member_code: 'HV003',
      full_name: 'Phạm Quốc Bảo',
      phone: '0934567890',
      email: 'bao.pham@gmail.com',
      date_of_birth: '1998-11-05',
      gender: 'NAM',
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '40000000-0000-0000-0000-000000000004',
      account_id: '99999999-9999-9999-9999-999999999999',
      home_branch_id: '33333333-3333-3333-3333-333333333333',
      member_code: 'HV004',
      full_name: 'Vũ Thu Thảo',
      phone: '0978123456',
      email: 'thao.vu@gmail.com',
      date_of_birth: '1996-02-18',
      gender: 'NU',
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '40000000-0000-0000-0000-000000000005',
      account_id: '99999999-9999-9999-9999-999999999990',
      home_branch_id: '11111111-1111-1111-1111-111111111111',
      member_code: 'HV005',
      full_name: 'Vũ Minh Phúc',
      phone: '0905678901',
      email: 'phuc.vu@gmail.com',
      date_of_birth: '1994-08-15',
      gender: 'NAM',
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '40000000-0000-0000-0000-000000000008',
      account_id: '99999999-9999-9999-9999-999999999988',
      home_branch_id: '11111111-1111-1111-1111-111111111111',
      member_code: 'HV008',
      full_name: 'Nguyễn Thảo Ly',
      phone: '0912345679',
      email: 'ly.nguyen@gmail.com',
      date_of_birth: '1997-03-22',
      gender: 'NU',
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '40000000-0000-0000-0000-000000000006',
      account_id: '99999999-9999-9999-9999-999999999989',
      home_branch_id: '22222222-2222-2222-2222-222222222222',
      member_code: 'HV006',
      full_name: 'Trần Thị Lan',
      phone: '0912345678',
      email: 'lan.tran@paradise.gym',
      date_of_birth: '1998-11-20',
      gender: 'NU',
      status: 'ACTIVE',
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  pt_profiles: [
    {
      id: '50000000-0000-0000-0000-000000000001',
      account_id: '99999999-9999-9999-9999-999999999994',
      branch_id: '11111111-1111-1111-1111-111111111111',
      pt_code: 'PT001',
      full_name: 'Nguyễn Văn Thể',
      phone: '0900000003',
      email: 'pt.the@paradisegym.vn',
      gender: 'NAM',
      bio: 'HLV 6 năm kinh nghiệm thể hình chuyên sâu, chứng chỉ NASM quốc tế',
      specialties: 'Tăng cơ, Giảm mỡ cấp tốc, Boxing',
      status: 'ACTIVE',
      work_start_time: '08:00:00',
      work_end_time: '18:00:00',
      work_days: 'ALL_WEEK',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '50000000-0000-0000-0000-000000000002',
      account_id: '99999999-9999-9999-9999-999999999995',
      branch_id: '11111111-1111-1111-1111-111111111111',
      pt_code: 'PT002',
      full_name: 'Vũ Hoàng Minh',
      phone: '0900000004',
      email: 'pt.minh@paradisegym.vn',
      gender: 'NAM',
      bio: 'Cựu VĐV Boxing, 4 năm kinh nghiệm giảm mỡ và tăng sức bền',
      specialties: 'Giảm mỡ chuyên sâu, Boxing, Sức bền',
      status: 'ACTIVE',
      work_start_time: '08:00:00',
      work_end_time: '18:00:00',
      work_days: 'ALL_WEEK',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '50000000-0000-0000-0000-000000000003',
      account_id: '99999999-9999-9999-9999-999999999983',
      branch_id: '22222222-2222-2222-2222-222222222222',
      pt_code: 'PT003',
      full_name: 'Đặng Minh Tuấn',
      phone: '0900000005',
      email: 'pt.tuan@paradisegym.vn',
      gender: 'NAM',
      bio: 'Chuyên gia phục hồi chức năng và chỉnh tư thế cột sống, 6 năm kinh nghiệm',
      specialties: 'Thể hình thi đấu, Phục hồi chức năng',
      status: 'ACTIVE',
      work_start_time: '08:00:00',
      work_end_time: '18:00:00',
      work_days: 'ALL_WEEK',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '50000000-0000-0000-0000-000000000004',
      account_id: '99999999-9999-9999-9999-999999999984',
      branch_id: '22222222-2222-2222-2222-222222222222',
      pt_code: 'PT004',
      full_name: 'Trần Thị Mai',
      phone: '0900000006',
      email: 'pt.mai@paradisegym.vn',
      gender: 'NU',
      bio: 'HLV nữ tận tâm, chuyên siết eo thon dáng đồng hồ cát, 3 năm kinh nghiệm',
      specialties: 'Giảm cân nữ, Pilates Mat, Dẻo dai',
      status: 'ACTIVE',
      work_start_time: '08:00:00',
      work_end_time: '18:00:00',
      work_days: 'ALL_WEEK',
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  packages: [
    {
      id: '30000000-0000-0000-0000-000000000001',
      package_code: 'GYM-1M',
      package_name: 'Gói Gym Tiêu Chuẩn 1 Tháng',
      package_type: 'GYM_TIME',
      price: 1000.0,
      duration_days: 30,
      total_gym_sessions: null,
      total_pt_sessions: null,
      status: 'ACTIVE',
      description: 'Tập Gym không giới hạn số lần tại chi nhánh đăng ký trong 30 ngày (Giá test 1.000 đ)',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      package_code: 'GYM-3M',
      package_name: 'Gói Gym Năng Động 3 Tháng',
      package_type: 'GYM_TIME',
      price: 2000.0,
      duration_days: 90,
      total_gym_sessions: null,
      total_pt_sessions: null,
      status: 'ACTIVE',
      description: 'Tập Gym không giới hạn toàn hệ thống 90 ngày, tặng 1 buổi định hướng (Giá test 2.000 đ)',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '30000000-0000-0000-0000-000000000003',
      package_code: 'VIP-YEAR',
      package_name: 'Gói VIP Hoàng Gia 1 Năm Đa Chi Nhánh',
      package_type: 'GYM_TIME',
      price: 2000.0,
      duration_days: 365,
      total_gym_sessions: null,
      total_pt_sessions: null,
      status: 'ACTIVE',
      description: 'Tập Gym toàn chuỗi 365 ngày kèm tủ khóa riêng, xông hơi và nước uống miễn phí (Giá test 2.000 đ)',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '30000000-0000-0000-0000-000000000004',
      package_code: 'PT-20S',
      package_name: 'Gói PT Cao Cấp 20 buổi',
      package_type: 'PT_SESSION',
      price: 2000.0,
      duration_days: null,
      total_gym_sessions: null,
      total_pt_sessions: 20,
      status: 'ACTIVE',
      description: '20 buổi kèm 1-1 chuyên sâu cùng HLV thể hình quốc tế NASM (Giá test 2.000 đ)',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '30000000-0000-0000-0000-000000000005',
      package_code: 'PT-36S',
      package_name: 'Gói PT Tăng Cơ 36 buổi',
      package_type: 'PT_SESSION',
      price: 2000.0,
      duration_days: null,
      total_gym_sessions: null,
      total_pt_sessions: 36,
      status: 'ACTIVE',
      description: '36 buổi huấn luyện chuyên sâu tăng cơ, cải thiện vóc dáng toàn diện (Giá test 2.000 đ)',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '30000000-0000-0000-0000-000000000006',
      package_code: 'PT-12S',
      package_name: 'Gói PT Giảm Mỡ 12 buổi',
      package_type: 'PT_SESSION',
      price: 1000.0,
      duration_days: null,
      total_gym_sessions: null,
      total_pt_sessions: 12,
      status: 'ACTIVE',
      description: '12 buổi tập kèm 1-1 cùng HLV cá nhân chuyên nghiệp (Giá test 1.000 đ)',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '55555555-5555-5555-5555-555555555554',
      package_code: 'COMBO-VIP',
      package_name: 'Gói Combo VIP (Gym 30 buổi + PT 12 buổi)',
      package_type: 'COMBO',
      price: 2000.0,
      duration_days: 90,
      total_gym_sessions: 30,
      total_pt_sessions: 12,
      status: 'ACTIVE',
      description: 'Gói kết hợp Gym 30 buổi và 12 buổi tập 1-1 cùng Huấn luyện viên cá nhân (Giá test 2.000 đ)',
      created_at: new Date(),
      updated_at: new Date()
    }
  ],
  package_branches: [
    { package_id: '30000000-0000-0000-0000-000000000001', branch_id: '11111111-1111-1111-1111-111111111111' },
    { package_id: '30000000-0000-0000-0000-000000000001', branch_id: '22222222-2222-2222-2222-222222222222' },
    { package_id: '30000000-0000-0000-0000-000000000002', branch_id: '11111111-1111-1111-1111-111111111111' },
    { package_id: '30000000-0000-0000-0000-000000000002', branch_id: '22222222-2222-2222-2222-222222222222' },
    { package_id: '30000000-0000-0000-0000-000000000002', branch_id: '33333333-3333-3333-3333-333333333333' },
    { package_id: '30000000-0000-0000-0000-000000000003', branch_id: '11111111-1111-1111-1111-111111111111' },
    { package_id: '30000000-0000-0000-0000-000000000003', branch_id: '22222222-2222-2222-2222-222222222222' },
    { package_id: '30000000-0000-0000-0000-000000000003', branch_id: '33333333-3333-3333-3333-333333333333' },
    { package_id: '30000000-0000-0000-0000-000000000004', branch_id: '11111111-1111-1111-1111-111111111111' },
    { package_id: '30000000-0000-0000-0000-000000000005', branch_id: '11111111-1111-1111-1111-111111111111' },
    { package_id: '30000000-0000-0000-0000-000000000006', branch_id: '11111111-1111-1111-1111-111111111111' },
    { package_id: '55555555-5555-5555-5555-555555555554', branch_id: '11111111-1111-1111-1111-111111111111' },
    { package_id: '55555555-5555-5555-5555-555555555554', branch_id: '22222222-2222-2222-2222-222222222222' },
    { package_id: '55555555-5555-5555-5555-555555555554', branch_id: '33333333-3333-3333-3333-333333333333' }
  ],
  registrations: [],
  registration_allowed_branches: [],
  pt_assignment_requests: [],
  pt_bookings: [],
  payments: [],
  receipts: [],
  devices: [
    {
      id: '66666666-6666-6666-6666-666666666661',
      branch_id: '11111111-1111-1111-1111-111111111111',
      device_code: 'GATE-Q1-01',
      device_name: 'Cổng xoay RFID/FaceID Cửa vào Q1',
      device_type: 'CARD_READER',
      direction: 'IN',
      status: 'ONLINE',
      location_description: 'Cửa chính sảnh tầng trệt'
    },
    {
      id: '66666666-6666-6666-6666-666666666662',
      branch_id: '11111111-1111-1111-1111-111111111111',
      device_code: 'GATE-Q1-02',
      device_name: 'Cổng xoay RFID Cửa ra Q1',
      device_type: 'CARD_READER',
      direction: 'OUT',
      status: 'ONLINE',
      location_description: 'Cửa chính sảnh tầng trệt'
    },
    {
      id: '66666666-6666-6666-6666-666666666663',
      branch_id: '11111111-1111-1111-1111-111111111111',
      device_code: 'KIOSK-Q1-K01',
      device_name: 'Màn hình Kiosk chào mừng K01',
      device_type: 'KIOSK_K01',
      direction: 'IN',
      status: 'ONLINE',
      location_description: 'Sảnh lễ tân Quận 1'
    },
    {
      id: '66666666-6666-6666-6666-666666666664',
      branch_id: '22222222-2222-2222-2222-222222222222',
      device_code: 'GATE-BT-01',
      device_name: 'Cổng Flap Gate Cửa vào Bình Thạnh',
      device_type: 'CARD_READER',
      direction: 'IN',
      status: 'ONLINE',
      location_description: 'Sảnh chính Bình Thạnh'
    }
  ],
  access_logs: [],
  member_consents: [],
  biometric_face_data: [],
  notification_templates: [
    {
      id: '77777777-7777-7777-7777-777777777771',
      template_code: 'REG_SUCCESS',
      event_type: 'REGISTRATION_ACTIVATED',
      target_role: 'MEMBER',
      title_template: 'Kích hoạt gói tập thành công!',
      body_template: 'Chúc mừng {{ten_hoi_vien}} đã kích hoạt thành công gói {{ten_goi}}. Hạn dùng đến {{ngay_het_han}}.',
      is_active: true
    },
    {
      id: '77777777-7777-7777-7777-777777777772',
      template_code: 'PAY_CONFIRM',
      event_type: 'PAYMENT_COMPLETED',
      target_role: 'MEMBER',
      title_template: 'Xác nhận thanh toán 100% thành công',
      body_template: 'Paradise Gym đã nhận đủ số tiền {{so_tien}} VNĐ cho hợp đồng {{ma_hop_dong}}.',
      is_active: true
    },
    {
      id: '77777777-7777-7777-7777-777777777773',
      template_code: 'PT_DOUBLE_CONFIRM',
      event_type: 'PT_SESSION_CONFIRMED',
      target_role: 'MEMBER',
      title_template: 'Buổi tập PT đã hoàn thành',
      body_template: 'Buổi tập ngày {{gio_tap}} với HLV {{ten_pt}} đã được xác nhận kép thành công.',
      is_active: true
    }
  ],
  notifications: [],
  audit_logs: [],
  otp_codes: [] // phone -> { code, expires_at }
};

async function syncStoreFromPg(client) {
  try {
    const bRes = await client.query('SELECT * FROM branches ORDER BY branch_code ASC');
    memoryStore.branches = bRes.rows;

    const rRes = await client.query('SELECT * FROM roles ORDER BY role_code ASC');
    memoryStore.roles = rRes.rows;

    const aRes = await client.query('SELECT * FROM accounts');
    memoryStore.accounts = aRes.rows;

    const arRes = await client.query('SELECT * FROM account_roles');
    memoryStore.account_roles = arRes.rows;

    const absRes = await client.query('SELECT * FROM account_branch_scopes');
    memoryStore.account_branch_scopes = absRes.rows;

    const mpRes = await client.query('SELECT * FROM member_profiles ORDER BY member_code ASC');
    memoryStore.member_profiles = mpRes.rows;

    const ptRes = await client.query('SELECT * FROM pt_profiles ORDER BY pt_code ASC');
    memoryStore.pt_profiles = ptRes.rows;

    const pRes = await client.query('SELECT * FROM packages ORDER BY package_code ASC');
    memoryStore.packages = pRes.rows;

    const pbRes = await client.query('SELECT * FROM package_branches');
    memoryStore.package_branches = pbRes.rows;

    const regRes = await client.query("SELECT *, to_char(start_date, 'YYYY-MM-DD') as start_date, to_char(end_date, 'YYYY-MM-DD') as end_date FROM registrations ORDER BY registrations.created_at DESC");
    memoryStore.registrations = regRes.rows;

    const rabRes = await client.query('SELECT * FROM registration_allowed_branches');
    memoryStore.registration_allowed_branches = rabRes.rows;

    const arqRes = await client.query('SELECT * FROM pt_assignment_requests ORDER BY requested_at DESC');
    memoryStore.pt_assignment_requests = arqRes.rows;

    const payRes = await client.query('SELECT * FROM payments ORDER BY created_at DESC');
    memoryStore.payments = payRes.rows;

    const recRes = await client.query('SELECT * FROM receipts ORDER BY issued_at DESC');
    memoryStore.receipts = recRes.rows;

    const bkRes = await client.query("SELECT *, to_char(booking_date, 'YYYY-MM-DD') as booking_date FROM pt_bookings ORDER BY pt_bookings.booking_date DESC, pt_bookings.start_time ASC");
    memoryStore.pt_bookings = bkRes.rows;

    const devRes = await client.query('SELECT * FROM devices');
    memoryStore.devices = devRes.rows;

    const accLogsRes = await client.query('SELECT * FROM access_logs ORDER BY check_in_time DESC');
    memoryStore.access_logs = accLogsRes.rows;

    const notifRes = await client.query('SELECT * FROM notifications ORDER BY created_at DESC');
    memoryStore.notifications = notifRes.rows;

    const audRes = await client.query('SELECT * FROM audit_logs ORDER BY created_at DESC');
    memoryStore.audit_logs = audRes.rows;

    console.log('🔄 [Database] Memory store fully synchronized with PostgreSQL tables.');
  } catch (syncErr) {
    console.warn('⚠️ [Database] Could not sync store from PostgreSQL:', syncErr.message);
  }
}

// Connect pool asynchronously
function initPool() {
  if (process.env.USE_IN_MEMORY_DB === 'true') {
    console.log('⚡ [Database] Explicit IN-MEMORY mode configured.');
    return;
  }

  try {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis: 2000
    });

    pool.connect(async (err, client, release) => {
      if (err) {
        console.warn('⚠️ [Database] PostgreSQL is offline or unreachable at ' + env.DATABASE_URL);
        console.warn('💡 [Database] Please ensure Docker container paradise-postgres is running.');
        isPgConnected = false;
      } else {
        isPgConnected = true;
        console.log('✅ [Database] PostgreSQL connected successfully at ' + env.DATABASE_URL);
        await syncStoreFromPg(client);
        release();
      }
    });
  } catch (e) {
    console.warn('⚠️ [Database] Pool initialization error:', e.message);
    isPgConnected = false;
  }
}

initPool();

module.exports = {
  isPgConnected: () => isPgConnected,
  getPool: () => pool,
  store: memoryStore,
  uuid: uuidv4
};
