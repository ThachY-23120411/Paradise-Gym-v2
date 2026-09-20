const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedSeptemberData() {
  console.log('🌱 Starting September 2026 relational data seeding...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fixed entity IDs
    const branches = {
      q1: '11111111-1111-1111-1111-111111111111',
      thaoDien: '33333333-3333-3333-3333-333333333333'
    };

    const pts = {
      pt001: '50000000-0000-0000-0000-000000000001', // Nguyễn Văn Thể
      pt002: '50000000-0000-0000-0000-000000000002', // Lê Văn Hùng
      pt003: '50000000-0000-0000-0000-000000000003', // Đặng Minh Tuấn
      pt004: '50000000-0000-0000-0000-000000000004', // Trần Thị Mai
      pt005: 'bf969011-aecb-438d-9683-6f7ee9384eb7'  // Phạm Quốc Bảo
    };

    const members = {
      hv001: { id: '40000000-0000-0000-0000-000000000001', name: 'Lê Hoàng Nam', phone: '0987654321' },
      hv002: { id: '40000000-0000-0000-0000-000000000002', name: 'Trần Thị Bình', phone: '0902345678' },
      hv003: { id: '40000000-0000-0000-0000-000000000003', name: 'Phạm Quốc Bảo', phone: '0934567890' },
      hv004: { id: '40000000-0000-0000-0000-000000000004', name: 'Vũ Thu Thảo', phone: '0978123456' },
      hv005: { id: '40000000-0000-0000-0000-000000000005', name: 'Vũ Minh Phúc', phone: '0905678901' },
      hv006: { id: '40000000-0000-0000-0000-000000000006', name: 'Trần Thị Lan', phone: '0912345678' },
      hv008: { id: '40000000-0000-0000-0000-000000000008', name: 'Nguyễn Thảo Ly', phone: '0912345679' }
    };

    const staffId = '99999999-9999-9999-9999-999999999992'; // Lễ tân

    // Package definitions
    const pkgs = {
      gym1m: { id: '30000000-0000-0000-0000-000000000001', name: 'Gói Gym Tiêu Chuẩn 1 Tháng', type: 'GYM_TIME', price: 1200000, days: 30, sessions: null },
      gym3m: { id: '30000000-0000-0000-0000-000000000002', name: 'Gói Gym Năng Động 3 Tháng', type: 'GYM_TIME', price: 3200000, days: 90, sessions: null },
      vipYear: { id: '30000000-0000-0000-0000-000000000003', name: 'Gói VIP Hoàng Gia 1 Năm Đa Chi Nhánh', type: 'GYM_TIME', price: 9600000, days: 365, sessions: null },
      pt12: { id: '30000000-0000-0000-0000-000000000006', name: 'Gói PT Giảm Mỡ 12 buổi', type: 'PT_SESSION', price: 4800000, days: null, sessions: 12, ptPrice: 4800000 },
      pt20: { id: '30000000-0000-0000-0000-000000000004', name: 'Gói PT Cao Cấp 20 buổi', type: 'PT_SESSION', price: 8000000, days: null, sessions: 20, ptPrice: 8000000 },
      combo: { id: 'ebb07e8e-888e-42b6-94e0-4b909cf69db8', name: 'Gói Combo VIP Paradise', type: 'COMBO', price: 6000000, days: 90, sessions: 12, comboPrice: 6000000 }
    };

    // 2. Realistic September orders
    const orders = [
      {
        regId: '88880001-0000-0000-0000-000000000001',
        regCode: 'DK-2026-09-001',
        payId: '88880002-0000-0000-0000-000000000001',
        payCode: 'PAY-2026-09-001',
        recId: '88880003-0000-0000-0000-000000000001',
        recCode: 'REC-2026-09-001',
        member: members.hv002,
        pkg: pkgs.gym3m,
        branchId: branches.q1,
        ptId: null,
        method: 'BANK_TRANSFER',
        dateStr: '2026-09-02 09:15:00',
        usedSessions: 0,
        bookings: []
      },
      {
        regId: '88880001-0000-0000-0000-000000000002',
        regCode: 'DK-2026-09-002',
        payId: '88880002-0000-0000-0000-000000000002',
        payCode: 'PAY-2026-09-002',
        recId: '88880003-0000-0000-0000-000000000002',
        recCode: 'REC-2026-09-002',
        member: members.hv003,
        pkg: pkgs.pt12,
        branchId: branches.q1,
        ptId: pts.pt002, // Lê Văn Hùng
        method: 'CASH',
        dateStr: '2026-09-04 14:30:00',
        usedSessions: 4,
        bookings: [
          { date: '2026-09-05', start: '09:00', end: '10:30', num: 1, ptId: pts.pt002 },
          { date: '2026-09-08', start: '09:00', end: '10:30', num: 2, ptId: pts.pt002 },
          { date: '2026-09-12', start: '09:00', end: '10:30', num: 3, ptId: pts.pt002 },
          { date: '2026-09-16', start: '09:00', end: '10:30', num: 4, ptId: pts.pt002 }
        ]
      },
      {
        regId: '88880001-0000-0000-0000-000000000003',
        regCode: 'DK-2026-09-003',
        payId: '88880002-0000-0000-0000-000000000003',
        payCode: 'PAY-2026-09-003',
        recId: '88880003-0000-0000-0000-000000000003',
        recCode: 'REC-2026-09-003',
        member: members.hv004,
        pkg: pkgs.vipYear,
        branchId: branches.q1,
        ptId: null,
        method: 'BANK_TRANSFER',
        dateStr: '2026-09-06 10:00:00',
        usedSessions: 0,
        bookings: []
      },
      {
        regId: '88880001-0000-0000-0000-000000000004',
        regCode: 'DK-2026-09-004',
        payId: '88880002-0000-0000-0000-000000000004',
        payCode: 'PAY-2026-09-004',
        recId: '88880003-0000-0000-0000-000000000004',
        recCode: 'REC-2026-09-004',
        member: members.hv005,
        pkg: pkgs.combo,
        branchId: branches.q1,
        ptId: pts.pt003, // Đặng Minh Tuấn
        method: 'BANK_TRANSFER',
        dateStr: '2026-09-08 16:45:00',
        usedSessions: 3,
        bookings: [
          { date: '2026-09-09', start: '17:00', end: '18:30', num: 1, ptId: pts.pt003 },
          { date: '2026-09-13', start: '17:00', end: '18:30', num: 2, ptId: pts.pt003 },
          { date: '2026-09-17', start: '17:00', end: '18:30', num: 3, ptId: pts.pt003 }
        ]
      },
      {
        regId: '88880001-0000-0000-0000-000000000005',
        regCode: 'DK-2026-09-005',
        payId: '88880002-0000-0000-0000-000000000005',
        payCode: 'PAY-2026-09-005',
        recId: '88880003-0000-0000-0000-000000000005',
        recCode: 'REC-2026-09-005',
        member: members.hv006,
        pkg: pkgs.gym1m,
        branchId: branches.thaoDien,
        ptId: null,
        method: 'CASH',
        dateStr: '2026-09-10 08:30:00',
        usedSessions: 0,
        bookings: []
      },
      {
        regId: '88880001-0000-0000-0000-000000000006',
        regCode: 'DK-2026-09-006',
        payId: '88880002-0000-0000-0000-000000000006',
        payCode: 'PAY-2026-09-006',
        recId: '88880003-0000-0000-0000-000000000006',
        recCode: 'REC-2026-09-006',
        member: members.hv008,
        pkg: pkgs.pt20,
        branchId: branches.thaoDien,
        ptId: pts.pt004, // Trần Thị Mai
        method: 'BANK_TRANSFER',
        dateStr: '2026-09-12 15:20:00',
        usedSessions: 2,
        bookings: [
          { date: '2026-09-14', start: '14:00', end: '15:30', num: 1, ptId: pts.pt004 },
          { date: '2026-09-18', start: '14:00', end: '15:30', num: 2, ptId: pts.pt004 }
        ]
      },
      {
        regId: '88880001-0000-0000-0000-000000000007',
        regCode: 'DK-2026-09-007',
        payId: '88880002-0000-0000-0000-000000000007',
        payCode: 'PAY-2026-09-007',
        recId: '88880003-0000-0000-0000-000000000007',
        recCode: 'REC-2026-09-007',
        member: members.hv001,
        pkg: pkgs.gym3m,
        branchId: branches.q1,
        ptId: null,
        method: 'BANK_TRANSFER',
        dateStr: '2026-09-14 11:15:00',
        usedSessions: 0,
        bookings: []
      },
      {
        regId: '88880001-0000-0000-0000-000000000008',
        regCode: 'DK-2026-09-008',
        payId: '88880002-0000-0000-0000-000000000008',
        payCode: 'PAY-2026-09-008',
        recId: '88880003-0000-0000-0000-000000000008',
        recCode: 'REC-2026-09-008',
        member: members.hv002,
        pkg: pkgs.pt12,
        branchId: branches.q1,
        ptId: pts.pt001, // Nguyễn Văn Thể
        method: 'CASH',
        dateStr: '2026-09-16 17:00:00',
        usedSessions: 1,
        bookings: [
          { date: '2026-09-18', start: '10:00', end: '11:30', num: 1, ptId: pts.pt001 }
        ]
      },
      {
        regId: '88880001-0000-0000-0000-000000000009',
        regCode: 'DK-2026-09-009',
        payId: '88880002-0000-0000-0000-000000000009',
        payCode: 'PAY-2026-09-009',
        recId: '88880003-0000-0000-0000-000000000009',
        recCode: 'REC-2026-09-009',
        member: members.hv003,
        pkg: pkgs.combo,
        branchId: branches.q1,
        ptId: pts.pt005, // Phạm Quốc Bảo
        method: 'BANK_TRANSFER',
        dateStr: '2026-09-18 10:30:00',
        usedSessions: 0,
        bookings: []
      },
      {
        regId: '88880001-0000-0000-0000-000000000010',
        regCode: 'DK-2026-09-010',
        payId: '88880002-0000-0000-0000-000000000010',
        payCode: 'PAY-2026-09-010',
        recId: '88880003-0000-0000-0000-000000000010',
        recCode: 'REC-2026-09-010',
        member: members.hv004,
        pkg: pkgs.pt20,
        branchId: branches.q1,
        ptId: pts.pt002, // Lê Văn Hùng
        method: 'BANK_TRANSFER',
        dateStr: '2026-09-19 14:00:00',
        usedSessions: 0,
        bookings: []
      },
      {
        regId: '88880001-0000-0000-0000-000000000011',
        regCode: 'DK-2026-09-011',
        payId: '88880002-0000-0000-0000-000000000011',
        payCode: 'PAY-2026-09-011',
        recId: '88880003-0000-0000-0000-000000000011',
        recCode: 'REC-2026-09-011',
        member: members.hv005,
        pkg: pkgs.gym1m,
        branchId: branches.q1,
        ptId: null,
        method: 'CASH',
        dateStr: '2026-09-20 09:00:00',
        usedSessions: 0,
        bookings: []
      }
    ];

    for (const ord of orders) {
      const remaining = ord.pkg.sessions ? Math.max(0, ord.pkg.sessions - ord.usedSessions) : null;
      const startDate = ord.dateStr.slice(0, 10);
      const endDate = ord.pkg.days ? new Date(new Date(startDate).getTime() + ord.pkg.days * 86400000).toISOString().slice(0, 10) : '2026-12-31';

      // 1. Insert Registration
      await client.query(`
        INSERT INTO registrations (
          id, reg_code, member_id, package_id, assigned_pt_id, sold_branch_id,
          package_name_snapshot, package_type_snapshot, price_snapshot,
          duration_days_snapshot, total_pt_sessions_snapshot, remaining_pt_sessions, used_pt_sessions,
          start_date, end_date, status, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9,
          $10, $11, $12, $13,
          $14, $15, 'ACTIVE', $16::timestamptz
        )
        ON CONFLICT (id) DO UPDATE SET
          used_pt_sessions = EXCLUDED.used_pt_sessions,
          remaining_pt_sessions = EXCLUDED.remaining_pt_sessions,
          created_at = EXCLUDED.created_at;
      `, [
        ord.regId, ord.regCode, ord.member.id, ord.pkg.id, ord.ptId, ord.branchId,
        ord.pkg.name, ord.pkg.type, ord.pkg.price,
        ord.pkg.days, ord.pkg.sessions, remaining, ord.usedSessions,
        startDate, endDate, ord.dateStr
      ]);

      // 1.1. Insert Allowed Branches
      const pkgBranchesRes = await client.query('SELECT branch_id FROM package_branches WHERE package_id = $1', [ord.pkg.id]);
      const allowedBIds = pkgBranchesRes.rows.map(b => b.branch_id);
      if (allowedBIds.length === 0 && ord.branchId) allowedBIds.push(ord.branchId);
      for (const bId of allowedBIds) {
        await client.query(`
          INSERT INTO registration_allowed_branches (registration_id, branch_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [ord.regId, bId]);
      }

      // 2. Insert Payment
      await client.query(`
        INSERT INTO payments (
          id, registration_id, member_id, branch_id, payment_code,
          payment_method, amount, status, collected_by, confirmed_at, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, 'COMPLETED', $8, $9::timestamptz, $9::timestamptz
        )
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          status = 'COMPLETED',
          confirmed_at = EXCLUDED.confirmed_at;
      `, [
        ord.payId, ord.regId, ord.member.id, ord.branchId, ord.payCode,
        ord.method, ord.pkg.price, staffId, ord.dateStr
      ]);

      // 3. Insert Receipt
      await client.query(`
        INSERT INTO receipts (
          id, payment_id, receipt_code, amount,
          payer_name, payer_phone, issued_by, issued_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8::timestamptz
        )
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          issued_at = EXCLUDED.issued_at;
      `, [
        ord.recId, ord.payId, ord.recCode, ord.pkg.price,
        ord.member.name, ord.member.phone, staffId, ord.dateStr
      ]);

      // 4. Insert Completed PT Bookings
      for (const bk of ord.bookings) {
        await client.query(`
          INSERT INTO pt_bookings (
            branch_id, pt_id, member_id, registration_id,
            booking_date, start_time, end_time, session_number,
            status, pt_confirmed_at, member_confirmed_at, is_deducted,
            workout_notes, fitness_assessment, created_at
          ) VALUES (
            $1, $2, $3, $4,
            $5::date, $6::time, $7::time, $8::int,
            'COMPLETED', ($5::text || ' ' || $7::text)::timestamptz, ($5::text || ' ' || $7::text)::timestamptz, TRUE,
            'Hoàn thành buổi tập đầy đủ bài tập và giáo án', 'Thể lực tiến bộ rõ rệt', ($5::text || ' ' || $6::text)::timestamptz
          )
          ON CONFLICT DO NOTHING;
        `, [
          ord.branchId, bk.ptId, ord.member.id, ord.regId,
          bk.date, bk.start, bk.end, bk.num
        ]);
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully seeded ${orders.length} realistic registrations, payments, receipts, and PT sessions across September 2026!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding September data:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seedSeptemberData().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seedSeptemberData };
