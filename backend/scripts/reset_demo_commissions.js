const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/paradise_gym'
});

async function main() {
  console.log('🔄 Đang cập nhật dữ liệu bảng kê hoa hồng PT...');

  const ptId = '50000000-0000-0000-0000-000000000001'; // Nguyễn Văn Thể (PT001)
  const memberId = '40000000-0000-0000-0000-000000000001'; // Lê Hoàng Nam
  const branchId = '11111111-1111-1111-1111-111111111111'; // Paradise Gym Quận 1
  const adminAccountId = '99999999-9999-9999-9999-999999999991'; // Admin QTV

  try {
    await pool.query('ALTER TABLE pt_commissions DISABLE TRIGGER trg_guard_pt_commission_snapshot');

    // 1. Nguyễn Văn Thể (PT001) - Tháng 9/2026: Chuyển sang PENDING (chưa chi trả) để test quy trình chi trả
    await pool.query(`
      UPDATE registrations
      SET pt_price_snapshot = 4800000.00
      WHERE id = '88880001-0000-0000-0000-000000000008';
    `);

    await pool.query(`
      UPDATE pt_bookings
      SET status = 'COMPLETED',
          pt_confirmed_at = '2026-09-19 18:00:00+07',
          member_confirmed_at = '2026-09-19 18:05:00+07',
          is_deducted = TRUE,
          workout_notes = 'Buổi 3: Luyện tập cơ lõi và lưng xô',
          fitness_assessment = 'Học viên nắm tốt kỹ thuật động tác'
      WHERE id = '85a3da5f-6d7b-481d-876b-b6155e76ce3e';
    `);

    await pool.query(`
      UPDATE registrations
      SET used_pt_sessions = 3, remaining_pt_sessions = 9
      WHERE id = '88880001-0000-0000-0000-000000000008';
    `);

    const r1 = await pool.query(`
      UPDATE pt_commissions
      SET status = 'PENDING',
          total_pt_sessions_taught = 8,
          pt_revenue_share = 3075000.00,
          commission_percentage = 25.00,
          total_commission_amount = 768750.00,
          paid_at = NULL,
          payout_method = 'BANK_TRANSFER',
          payout_ref = NULL,
          payout_note = NULL,
          paid_by_account_id = NULL,
          details_snapshot = NULL,
          pt_confirmed_at = NULL
      WHERE pt_id = $1 AND month = 9 AND year = 2026
      RETURNING id, status, total_pt_sessions_taught, pt_revenue_share, total_commission_amount;
    `, [ptId]);
    console.log('✅ Nguyễn Văn Thể (PT001) - Tháng 9/2026 -> PENDING (Chưa chi trả, hiện trực tiếp nút [ Chi trả ]):', r1.rows);

  // 2. Phạm Quốc Bảo (PT005) - Tháng 9/2026: PENDING (0 buổi dạy)
  const r2 = await pool.query(`
    UPDATE pt_commissions
    SET status = 'PENDING',
        paid_at = NULL,
        payout_method = 'BANK_TRANSFER',
        payout_ref = NULL,
        payout_note = NULL,
        paid_by_account_id = NULL
    WHERE pt_id IN (SELECT id FROM pt_profiles WHERE pt_code = 'PT005')
      AND month = 9 AND year = 2026
    RETURNING id, status, total_pt_sessions_taught, total_commission_amount;
  `, []);
  console.log('✅ Phạm Quốc Bảo (PT005) - Tháng 9/2026 -> PENDING (0đ, ẩn nút chi trả):', r2.rows);

  // 3. Đảm bảo thông tin ngân hàng của PT001 có sẵn để VietQR hiển thị ngay
  await pool.query(`
    UPDATE pt_profiles
    SET bank_name = 'MB Bank',
        bank_account_no = '0900000003',
        bank_account_name = 'NGUYEN VAN THE'
    WHERE id = $1;
  `, [ptId]);
  console.log('✅ Cập nhật ngân hàng mẫu cho PT001: MB Bank - 0900000003 - NGUYEN VAN THE');

  // 4. Khởi tạo hợp đồng và 8 buổi tập COMPLETED cho Tháng 8/2026 (Khớp 100% với lịch sử chi trả)
  const regId = 'aaa0f898-4816-478a-b316-1cc027e33a97';
  await pool.query(`
    INSERT INTO registrations (
      id, reg_code, member_id, package_id, assigned_pt_id, sold_branch_id,
      package_name_snapshot, package_type_snapshot, price_snapshot, pt_price_snapshot,
      duration_days_snapshot, total_gym_sessions_snapshot, total_pt_sessions_snapshot,
      start_date, end_date, remaining_gym_sessions, remaining_pt_sessions, booked_pt_sessions, used_pt_sessions,
      status, created_by, created_at, updated_at
    ) VALUES (
      $1, 'DK-2026-08-01', $2, '55555555-5555-5555-5555-555555555554', $3, $4,
      'Gói Combo VIP (Gym 30 buổi + PT 12 buổi)', 'COMBO', 6500000, 4800000,
      90, 30, 12,
      '2026-08-01', '2026-11-01', 30, 4, 0, 8,
      'ACTIVE', $5, '2026-08-01 08:00:00+07', NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      used_pt_sessions = 8,
      pt_price_snapshot = 4800000,
      total_pt_sessions_snapshot = 12;
  `, [regId, memberId, ptId, branchId, adminAccountId]);

  // Thêm Payment & Receipt cho hợp đồng Tháng 8 (Rule 5: Relational Consistency)
  const payAugId = 'aaa0f898-4816-478a-b316-1cc027e33b97';
  const recAugId = 'aaa0f898-4816-478a-b316-1cc027e33c97';
  await pool.query(`
    INSERT INTO payments (
      id, registration_id, member_id, branch_id, payment_code,
      payment_method, amount, collected_by, confirmed_at, created_at
    ) VALUES (
      $1, $2, $3, $4, 'PAY-2026-08-01',
      'BANK_TRANSFER', 6500000.00, $5, '2026-08-01 08:30:00+07', '2026-08-01 08:30:00+07'
    ) ON CONFLICT (id) DO NOTHING;
  `, [payAugId, regId, memberId, branchId, adminAccountId]);

  await pool.query(`
    INSERT INTO receipts (
      id, payment_id, receipt_code, amount,
      payer_name, payer_phone, issued_by, issued_at
    ) VALUES (
      $1, $2, 'PT-2026-08-01', 6500000.00,
      'Lê Hoàng Nam', '0987654321', $3, '2026-08-01 08:30:00+07'
    ) ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      issued_at = EXCLUDED.issued_at;
  `, [recAugId, payAugId, adminAccountId]);

  // Xóa các booking cũ của hợp đồng tháng 8 nếu có để tránh trùng
  await pool.query('DELETE FROM pt_bookings WHERE registration_id = $1', [regId]);

  // Seed 8 buổi tập COMPLETED trong tháng 8/2026 (mỗi buổi 400.000đ -> x 25% = 100.000đ hoa hồng/buổi)
  const augustDates = [
    '2026-08-04', '2026-08-07', '2026-08-11', '2026-08-14',
    '2026-08-18', '2026-08-21', '2026-08-25', '2026-08-28'
  ];

  for (let i = 0; i < augustDates.length; i++) {
    const bDate = augustDates[i];
    await pool.query(`
      INSERT INTO pt_bookings (
        registration_id, member_id, pt_id, branch_id, session_number,
        booking_date, start_time, end_time, session_duration_minutes,
        status, pt_confirmed_at, member_confirmed_at, is_deducted,
        workout_notes, fitness_assessment, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6::date, '08:00:00'::time, '09:30:00'::time, 90,
        'COMPLETED', ($6::text || ' 09:35:00+07')::timestamptz, ($6::text || ' 09:40:00+07')::timestamptz, TRUE,
        'Tập thân trên và phát triển nhóm cơ ngực/vai', 'Thể lực tốt, hoàn thành 100% giáo án',
        $7, ($6::text || ' 07:00:00+07')::timestamptz, NOW()
      )
    `, [regId, memberId, ptId, branchId, i + 1, bDate, adminAccountId]);
  }
  console.log('✅ Đã seed 8 buổi tập COMPLETED cho Tháng 8/2026 (Khớp chuẩn 100% doanh số 3.200.000đ & hoa hồng 800.000đ)');

  // 5. Cập nhật bản ghi pt_commissions tháng 8/2026 sang PAID
  await pool.query(`
    UPDATE pt_commissions
    SET status = 'PAID',
        total_pt_sessions_taught = 8,
        pt_revenue_share = 3200000.00,
        commission_percentage = 25.00,
        total_commission_amount = 800000.00,
        payout_method = 'BANK_TRANSFER',
        payout_ref = 'FT260805123984',
        payout_note = 'Chi trả hoa hồng tháng 8/2026 qua VietQR Napas247',
        paid_at = '2026-09-05 10:30:00+07',
        paid_by_account_id = $2
    WHERE pt_id = $1 AND month = 8 AND year = 2026
  `, [ptId, adminAccountId]);
  // 6. Khởi tạo hợp đồng và 6 buổi tập COMPLETED cho Tháng 7/2026 (Khớp 100% với lịch sử chi trả Tháng 7)
  const regJulyId = 'aaa0f898-4816-478a-b316-1cc027e33a96';
  await pool.query(`
    INSERT INTO registrations (
      id, reg_code, member_id, package_id, assigned_pt_id, sold_branch_id,
      package_name_snapshot, package_type_snapshot, price_snapshot, pt_price_snapshot,
      duration_days_snapshot, total_pt_sessions_snapshot, remaining_pt_sessions, used_pt_sessions,
      start_date, end_date, status, created_by, created_at, updated_at
    ) VALUES (
      $1, 'DK-2026-07-01', $2, '30000000-0000-0000-0000-000000000004', $3, $4,
      'Gói PT Giảm Mỡ 12 buổi (Tháng 7/2026)', 'PT_SESSION', 4800000.00, 4800000.00,
      90, 12, 6, 6,
      '2026-07-01', '2026-09-30', 'ACTIVE', $5, '2026-07-01 08:00:00+07', NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      total_pt_sessions_snapshot = 12,
      used_pt_sessions = 6,
      remaining_pt_sessions = 6,
      pt_price_snapshot = 4800000.00,
      price_snapshot = 4800000.00,
      assigned_pt_id = $3;
  `, [regJulyId, memberId, ptId, branchId, adminAccountId]);

  // Thêm Payment & Receipt cho hợp đồng Tháng 7 (Rule 5: Relational Consistency)
  const payJulyId = 'aaa0f898-4816-478a-b316-1cc027e33b96';
  const recJulyId = 'aaa0f898-4816-478a-b316-1cc027e33c96';
  await pool.query(`
    INSERT INTO payments (
      id, registration_id, member_id, branch_id, payment_code,
      payment_method, amount, collected_by, confirmed_at, created_at
    ) VALUES (
      $1, $2, $3, $4, 'PAY-2026-07-01',
      'CASH', 4800000.00, $5, '2026-07-01 08:30:00+07', '2026-07-01 08:30:00+07'
    ) ON CONFLICT (id) DO NOTHING;
  `, [payJulyId, regJulyId, memberId, branchId, adminAccountId]);

  await pool.query(`
    INSERT INTO receipts (
      id, payment_id, receipt_code, amount,
      payer_name, payer_phone, issued_by, issued_at
    ) VALUES (
      $1, $2, 'PT-2026-07-01', 4800000.00,
      'Lê Hoàng Nam', '0987654321', $3, '2026-07-01 08:30:00+07'
    ) ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      issued_at = EXCLUDED.issued_at;
  `, [recJulyId, payJulyId, adminAccountId]);

  await pool.query('DELETE FROM pt_bookings WHERE registration_id = $1', [regJulyId]);

  const julyDates = [
    { date: '2026-07-07', start: '08:00:00', end: '09:30:00', num: 1 },
    { date: '2026-07-11', start: '08:00:00', end: '09:30:00', num: 2 },
    { date: '2026-07-15', start: '08:00:00', end: '09:30:00', num: 3 },
    { date: '2026-07-19', start: '08:00:00', end: '09:30:00', num: 4 },
    { date: '2026-07-23', start: '08:00:00', end: '09:30:00', num: 5 },
    { date: '2026-07-27', start: '08:00:00', end: '09:30:00', num: 6 }
  ];

  for (const item of julyDates) {
    await pool.query(`
      INSERT INTO pt_bookings (
        registration_id, member_id, pt_id, branch_id, session_number,
        booking_date, start_time, end_time, session_duration_minutes,
        status, pt_confirmed_at, member_confirmed_at, is_deducted,
        workout_notes, fitness_assessment, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5::int,
        $6::date, $7::time, $8::time, 90,
        'COMPLETED', ($6::text || ' ' || $8::text)::timestamptz, ($6::text || ' ' || $8::text)::timestamptz, TRUE,
        'Buổi tập ' || $5::text || ' tháng 7 hoàn thành xuất sắc', 'Học viên tiếp thu tốt kỹ thuật',
        $9, ($6::text || ' 07:00:00+07')::timestamptz, NOW()
      )
    `, [regJulyId, memberId, ptId, branchId, item.num, item.date, item.start, item.end, adminAccountId]);
  }

  await pool.query(`
    UPDATE pt_commissions
    SET total_pt_sessions_taught = 6,
        pt_revenue_share = 2400000.00,
        commission_percentage = 25.00,
        total_commission_amount = 600000.00,
        status = 'PAID',
        payout_method = 'CASH',
        payout_ref = 'PC-2026-08-012',
        paid_at = '2026-08-05 15:45:00+07',
        payout_note = 'Chi tiền mặt tại quầy lễ tân chi nhánh',
        paid_by_account_id = $2
    WHERE pt_id = $1 AND month = 7 AND year = 2026;
  `, [ptId, adminAccountId]);
  console.log('✅ Đã cập nhật hợp đồng và 6 buổi tập COMPLETED cho Tháng 7/2026 (Khớp 100% doanh số 2.400.000đ & hoa hồng 600.000đ)');

    console.log('🎉 Hoàn tất cập nhật dữ liệu mẫu hoa hồng!');
  } finally {
    try {
      await pool.query('ALTER TABLE pt_commissions ENABLE TRIGGER trg_guard_pt_commission_snapshot');
    } catch (e) {
      console.error('Lỗi khi bật lại trigger:', e.message);
    }
    await pool.end();
  }
}

main().catch(err => {
  console.error('❌ Lỗi:', err);
  pool.end();
  process.exit(1);
});
