const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedJuly() {
  const ptId = '50000000-0000-0000-0000-000000000001'; // Nguyễn Văn Thể (PT001)
  const memberId = '40000000-0000-0000-0000-000000000001'; // Lê Hoàng Nam (HV001)
  const branchId = '11111111-1111-1111-1111-111111111111'; // Chi nhánh Quận 1
  const regId = 'aaa0f898-4816-478a-b316-1cc027e33a96'; // Hợp đồng tháng 7/2026

  // 1. Tạo hoặc cập nhật registration tháng 7
  await pool.query(`
    INSERT INTO registrations (
      id, reg_code, member_id, package_id, assigned_pt_id, sold_branch_id,
      package_name_snapshot, package_type_snapshot, price_snapshot, pt_price_snapshot,
      duration_days_snapshot, total_pt_sessions_snapshot, remaining_pt_sessions, used_pt_sessions,
      start_date, end_date, status
    ) VALUES (
      $1, 'DK-2026-07-01', $2, '30000000-0000-0000-0000-000000000004', $3, $4,
      'Gói PT Giảm Mỡ 12 buổi (Tháng 7/2026)', 'PT_SESSION', 4800000.00, 4800000.00,
      90, 12, 6, 6,
      '2026-07-01', '2026-09-30', 'ACTIVE'
    )
    ON CONFLICT (id) DO UPDATE SET
      total_pt_sessions_snapshot = 12,
      used_pt_sessions = 6,
      remaining_pt_sessions = 6,
      pt_price_snapshot = 4800000.00,
      price_snapshot = 4800000.00,
      assigned_pt_id = $3;
  `, [regId, memberId, ptId, branchId]);

  // Insert Payment and Receipt for July registration (Rule 5)
  const payJulyId = 'aaa0f898-4816-478a-b316-1cc027e33b96';
  const recJulyId = 'aaa0f898-4816-478a-b316-1cc027e33c96';
  const staffId = '99999999-9999-9999-9999-999999999991';
  await pool.query(`
    INSERT INTO payments (
      id, registration_id, member_id, branch_id, payment_code,
      payment_method, amount, status, collected_by, confirmed_at, created_at
    ) VALUES (
      $1, $2, $3, $4, 'PAY-2026-07-01',
      'CASH', 4800000.00, 'COMPLETED', $5, '2026-07-01 08:30:00+07', '2026-07-01 08:30:00+07'
    ) ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      status = 'COMPLETED',
      confirmed_at = EXCLUDED.confirmed_at;
  `, [payJulyId, regId, memberId, branchId, staffId]);

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
  `, [recJulyId, payJulyId, staffId]);

  // 2. Tạo 6 buổi tập COMPLETED trong tháng 7/2026 (Mỗi buổi 400.000đ, hoa hồng 25% = 100.000đ/buổi -> tổng 600.000đ)
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
        branch_id, pt_id, member_id, registration_id,
        booking_date, start_time, end_time, session_number,
        status, pt_confirmed_at, member_confirmed_at, is_deducted,
        workout_notes, fitness_assessment
      ) VALUES (
        $1, $2, $3, $4,
        $5::date, $6::time, $7::time, $8::int,
        'COMPLETED', ($5::text || ' ' || $7::text)::timestamptz, ($5::text || ' ' || $7::text)::timestamptz, TRUE,
        'Buổi tập ' || $8::text || ' tháng 7 hoàn thành xuất sắc', 'Học viên tiếp thu tốt kỹ thuật'
      )
      ON CONFLICT DO NOTHING;
    `, [branchId, ptId, memberId, regId, item.date, item.start, item.end, item.num]);
  }

  // 3. Đảm bảo pt_commissions tháng 7/2026 có total_pt_sessions_taught = 6
  await pool.query(`
    UPDATE pt_commissions
    SET total_pt_sessions_taught = 6,
        pt_revenue_share = 2400000.00,
        commission_percentage = 25.00,
        total_commission_amount = 600000.00,
        status = 'PAID',
        payout_method = 'CASH',
        payout_ref = 'PC-2026-08-012',
        paid_at = '2026-08-05 15:45:00',
        payout_note = 'Chi tiền mặt tại quầy lễ tân chi nhánh'
    WHERE pt_id = $1 AND month = 7 AND year = 2026;
  `, [ptId]);

  console.log('Seeded July 2026 bookings and commissions successfully!');
  await pool.end();
}

seedJuly().catch(console.error);
