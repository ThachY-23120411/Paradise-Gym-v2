const { Pool } = require('../backend/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/paradise_gym'
});

async function run() {
  console.log('=== CHUẨN HÓA VÀ LÀM SẠCH DATABASE: CHỈ DUY NHẤT ĐÚNG 2 HLV TRONG TOÀN HỆ THỐNG ===');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const PT1_ID = '50000000-0000-0000-0000-000000000001'; // Nguyễn Văn Thể (Quận 1)
    const PT2_ID = '50000000-0000-0000-0000-000000000002'; // Lê Văn Hùng (Bình Thạnh)
    const B_Q1 = '11111111-1111-1111-1111-111111111111';   // Paradise Gym Quận 1
    const B_BT = '22222222-2222-2222-2222-222222222222';   // Paradise Gym Bình Thạnh

    // 1. Reassign registrations from ghost PTs (PT003, PT004, PT005)
    console.log('1. Tái phân công hợp đồng học viên về đúng 2 HLV hợp lệ...');
    // PT003, PT004 thuộc BT -> chuyển về PT002 (Lê Văn Hùng)
    await client.query(`
      UPDATE registrations
      SET assigned_pt_id = $1
      WHERE assigned_pt_id IN ('50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004')
    `, [PT2_ID]);

    // PT005 thuộc Q1 -> chuyển về PT001 (Nguyễn Văn Thể)
    await client.query(`
      UPDATE registrations
      SET assigned_pt_id = $1
      WHERE assigned_pt_id = 'bf969011-aecb-438d-9683-6f7ee9384eb7'
    `, [PT1_ID]);

    // 2. Reassign pt_bookings from ghost PTs
    console.log('2. Tái phân công lịch dạy PT 1:1 về đúng 2 HLV hợp lệ...');
    await client.query(`
      UPDATE pt_bookings
      SET pt_id = $1
      WHERE pt_id IN ('50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004')
    `, [PT2_ID]);

    await client.query(`
      UPDATE pt_bookings
      SET pt_id = $1
      WHERE pt_id = 'bf969011-aecb-438d-9683-6f7ee9384eb7'
    `, [PT1_ID]);

    // 2.5 Reassign substitute_pt_id in pt_bookings & clean pt_assignment_requests
    console.log('2.5. Xử lý substitute_pt_id và yêu cầu phân công của HLV dư thừa...');
    await client.query(`
      UPDATE pt_bookings
      SET substitute_pt_id = NULL
      WHERE substitute_pt_id NOT IN ($1, $2)
    `, [PT1_ID, PT2_ID]);

    await client.query(`
      DELETE FROM pt_assignment_requests
      WHERE pt_id NOT IN ($1, $2)
    `, [PT1_ID, PT2_ID]);

    // 3. Delete commissions & config histories of extra PTs
    console.log('3. Dọn dẹp bảng kê hoa hồng và lịch sử cấu hình của các HLV dư thừa...');
    await client.query(`
      DELETE FROM pt_commissions
      WHERE pt_id NOT IN ($1, $2)
    `, [PT1_ID, PT2_ID]);

    await client.query(`
      DELETE FROM pt_commission_config_history
      WHERE pt_id NOT IN ($1, $2)
    `, [PT1_ID, PT2_ID]);

    await client.query(`
      DELETE FROM pt_commission_configs
      WHERE pt_id NOT IN ($1, $2)
    `, [PT1_ID, PT2_ID]);

    // 4. Delete gate logs of extra PTs
    console.log('3.5. Dọn dẹp nhật ký ra vào của các HLV dư thừa...');
    await client.query(`
      DELETE FROM access_logs
      WHERE pt_id NOT IN ($1, $2)
    `, [PT1_ID, PT2_ID]);

    // 5. Delete extra PT profiles
    console.log('4. Xóa các hồ sơ HLV dư thừa (PT003, PT004, PT005)...');
    const extraAccounts = (await client.query(`
      SELECT account_id FROM pt_profiles WHERE id NOT IN ($1, $2)
    `, [PT1_ID, PT2_ID])).rows.map(r => r.account_id);

    await client.query(`
      DELETE FROM pt_profiles WHERE id NOT IN ($1, $2)
    `, [PT1_ID, PT2_ID]);

    if (extraAccounts.length > 0) {
      await client.query(`DELETE FROM account_branch_scopes WHERE account_id = ANY($1)`, [extraAccounts]);
      await client.query(`DELETE FROM account_roles WHERE account_id = ANY($1)`, [extraAccounts]);
      await client.query(`DELETE FROM accounts WHERE id = ANY($1)`, [extraAccounts]);
    }

    // 6. Fix community_classes: XÓA SẠCH 100% CÁC TÊN HLV BỊA ĐẶT / GHOST
    console.log('5. Tái cấu trúc lớp cộng đồng: Xóa sạch toàn bộ tên HLV ảo...');
    // Delete all existing community classes to re-seed clean
    await client.query('DELETE FROM community_class_registrations');
    await client.query('DELETE FROM community_classes');

    // Get disciplines
    const discRes = await client.query('SELECT id, name, base_price FROM class_disciplines');
    const discMap = {};
    discRes.rows.forEach(r => {
      const lower = r.name.toLowerCase();
      discMap[lower] = r;
      if (lower.includes('yoga')) discMap['yoga'] = r;
      if (lower.includes('aerobic')) discMap['aerobic'] = r;
      if (lower.includes('zumba')) discMap['zumba'] = r;
      if (lower.includes('bodypump') || lower.includes('pump')) discMap['pump'] = r;
      if (lower.includes('pilates')) discMap['pilates'] = r;
      if (lower.includes('cardio') || lower.includes('hiit') || lower.includes('tabata')) discMap['cardio'] = r;
      if (lower.includes('cycling') || lower.includes('rpm')) discMap['cycling'] = r;
    });

    const defaultDisc = discRes.rows[0];
    const getDisc = key => discMap[key] || defaultDisc;

    // Get active members for class registrations
    const membersRes = await client.query('SELECT id FROM member_profiles LIMIT 15');
    const memberIds = membersRes.rows.map(m => m.id);

    // Seed schedule for week 2026-09-21 to 2026-09-27
    // CHI NHÁNH BÌNH THẠNH (B_BT): DUY NHẤT HLV LÊ VĂN HÙNG (PT002)
    // Các khung giờ hoàn toàn cách biệt, không trùng nhau:
    const btClasses = [
      // Thứ 2 (21/09/2026)
      { date: '2026-09-21', start: '06:30:00', end: '07:30:00', title: 'Yoga Trị Liệu Cơ Bản', disc: 'yoga', bonus: 45000, slots: 30, enrolled: 15 },
      { date: '2026-09-21', start: '08:00:00', end: '09:00:00', title: 'Cardio HIIT Đốt Mỡ', disc: 'cardio', bonus: 50000, slots: 35, enrolled: 20 },
      { date: '2026-09-21', start: '09:30:00', end: '10:30:00', title: 'Zumba Gold Sôi Động', disc: 'zumba', bonus: 35000, slots: 30, enrolled: 15 },

      // Thứ 3 (22/09/2026)
      { date: '2026-09-22', start: '06:30:00', end: '07:30:00', title: 'Aerobic Năng Lượng Buổi Sáng', disc: 'aerobic', bonus: 40000, slots: 35, enrolled: 15 },
      { date: '2026-09-22', start: '08:00:00', end: '09:00:00', title: 'Pilates Dáng Chuẩn Thon Gọn', disc: 'pilates', bonus: 55000, slots: 25, enrolled: 15 },

      // Thứ 4 (23/09/2026)
      { date: '2026-09-23', start: '06:30:00', end: '07:30:00', title: 'Yoga Vinyasa Nâng Cao', disc: 'yoga', bonus: 45000, slots: 30, enrolled: 15 },
      { date: '2026-09-23', start: '08:00:00', end: '09:00:00', title: 'Cardio Tabata Siết Cơ', disc: 'cardio', bonus: 50000, slots: 35, enrolled: 20 },

      // Thứ 5 (24/09/2026)
      { date: '2026-09-24', start: '06:30:00', end: '07:30:00', title: 'Pilates Dáng Chuẩn Thon Gọn', disc: 'pilates', bonus: 50000, slots: 25, enrolled: 15 },
      { date: '2026-09-24', start: '08:00:00', end: '09:00:00', title: 'Aerobic Dance Sôi Động', disc: 'aerobic', bonus: 45000, slots: 35, enrolled: 15 },

      // Thứ 6 (25/09/2026)
      { date: '2026-09-25', start: '06:30:00', end: '07:30:00', title: 'Yoga Trị Liệu Thư Giãn', disc: 'yoga', bonus: 45000, slots: 30, enrolled: 15 },
      { date: '2026-09-25', start: '08:00:00', end: '09:00:00', title: 'Zumba Party Cuối Tuần', disc: 'zumba', bonus: 40000, slots: 40, enrolled: 15 },

      // Thứ 7 (26/09/2026)
      { date: '2026-09-26', start: '07:00:00', end: '08:00:00', title: 'BodyPump Tăng Cơ', disc: 'pump', bonus: 50000, slots: 35, enrolled: 20 },
      { date: '2026-09-26', start: '08:30:00', end: '09:30:00', title: 'Yoga Cân Bằng Năng Lượng', disc: 'yoga', bonus: 45000, slots: 30, enrolled: 15 }
    ];

    // CHI NHÁNH QUẬN 1 (B_Q1): DUY NHẤT HLV NGUYỄN VĂN THỂ (PT001)
    const q1Classes = [
      // Thứ 2 (21/09/2026) - Tránh lịch PT (06:00-08:00, 09:30-11:00, 14:00-18:00, 19:00-21:00)
      { date: '2026-09-21', start: '08:15:00', end: '09:15:00', title: 'BodyPump Chuyên Sâu', disc: 'pump', bonus: 60000, slots: 40, enrolled: 25 },
      { date: '2026-09-21', start: '11:30:00', end: '12:30:00', title: 'Kickfit Đốt Mỡ Nhanh', disc: 'cardio', bonus: 50000, slots: 30, enrolled: 20 },

      // Thứ 3 (22/09/2026) - Tránh lịch PT (09:00-10:00, 14:00-15:30)
      { date: '2026-09-22', start: '07:30:00', end: '08:30:00', title: 'Cardio HIIT Toàn Thân', disc: 'cardio', bonus: 50000, slots: 35, enrolled: 22 },
      { date: '2026-09-22', start: '18:40:00', end: '19:40:00', title: 'BodyPump Sức Mạnh', disc: 'pump', bonus: 60000, slots: 40, enrolled: 30 },

      // Thứ 4 (23/09/2026)
      { date: '2026-09-23', start: '08:30:00', end: '09:30:00', title: 'Cycling RPM Đạp Xe Trong Nhà', disc: 'cycling', bonus: 45000, slots: 30, enrolled: 25 },
      { date: '2026-09-23', start: '18:40:00', end: '19:40:00', title: 'Yoga Thể Lực & Sức Bền', disc: 'yoga', bonus: 50000, slots: 30, enrolled: 20 },

      // Thứ 5 (24/09/2026)
      { date: '2026-09-24', start: '08:30:00', end: '09:30:00', title: 'BodyPump Cường Độ Cao', disc: 'pump', bonus: 60000, slots: 40, enrolled: 28 },
      { date: '2026-09-24', start: '18:40:00', end: '19:40:00', title: 'Kickfit & Boxing Group', disc: 'cardio', bonus: 50000, slots: 30, enrolled: 25 },

      // Thứ 6 (25/09/2026)
      { date: '2026-09-25', start: '08:30:00', end: '09:30:00', title: 'Cardio Tabata Đốt Mỡ Cấp Tốc', disc: 'cardio', bonus: 55000, slots: 35, enrolled: 26 },
      { date: '2026-09-25', start: '18:40:00', end: '19:40:00', title: 'BodyPump Thứ Sáu Bùng Nổ', disc: 'pump', bonus: 60000, slots: 40, enrolled: 32 },

      // Thứ 7 (26/09/2026)
      { date: '2026-09-26', start: '08:30:00', end: '09:30:00', title: 'Cycling RPM Cuối Tuần', disc: 'cycling', bonus: 50000, slots: 30, enrolled: 25 }
    ];

    // Chèn lớp Bình Thạnh -> 100% HLV Lê Văn Hùng
    for (const c of btClasses) {
      const disc = getDisc(c.disc);
      const res = await client.query(`
        INSERT INTO community_classes (
          branch_id, discipline_id, title, instructor_id, instructor_name,
          base_price, bonus_amount, class_date, start_time, end_time,
          max_slots, enrolled_slots, status, description, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, 'OPEN', $13, NOW()
        ) RETURNING id
      `, [
        B_BT, disc.id, c.title, PT2_ID, 'Lê Văn Hùng',
        disc.base_price, c.bonus, c.date, c.start, c.end,
        c.slots, c.enrolled, `${c.title} cùng HLV Lê Văn Hùng tại Paradise Gym Bình Thạnh`
      ]);

      const classId = res.rows[0].id;
      // Chèn học viên đăng ký
      for (let i = 0; i < Math.min(c.enrolled, memberIds.length); i++) {
        await client.query(`
          INSERT INTO community_class_registrations (class_id, member_id, status)
          VALUES ($1, $2, 'CONFIRMED')
          ON CONFLICT DO NOTHING
        `, [classId, memberIds[i]]);
      }
    }

    // Chèn lớp Quận 1 -> 100% HLV Nguyễn Văn Thể
    for (const c of q1Classes) {
      const disc = getDisc(c.disc);
      const res = await client.query(`
        INSERT INTO community_classes (
          branch_id, discipline_id, title, instructor_id, instructor_name,
          base_price, bonus_amount, class_date, start_time, end_time,
          max_slots, enrolled_slots, status, description, created_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, 'OPEN', $13, NOW()
        ) RETURNING id
      `, [
        B_Q1, disc.id, c.title, PT1_ID, 'Nguyễn Văn Thể',
        disc.base_price, c.bonus, c.date, c.start, c.end,
        c.slots, c.enrolled, `${c.title} cùng HLV Nguyễn Văn Thể tại Paradise Gym Quận 1`
      ]);

      const classId = res.rows[0].id;
      // Chèn học viên đăng ký
      for (let i = 0; i < Math.min(c.enrolled, memberIds.length); i++) {
        await client.query(`
          INSERT INTO community_class_registrations (class_id, member_id, status)
          VALUES ($1, $2, 'CONFIRMED')
          ON CONFLICT DO NOTHING
        `, [classId, memberIds[i]]);
      }
    }

    // 6. Chuẩn hóa số dư buổi tập trong registrations
      console.log('6. Chuẩn hóa số dư buổi tập toán học trong registrations...');
      await client.query(`
        UPDATE registrations
        SET remaining_pt_sessions = total_pt_sessions_snapshot - used_pt_sessions - booked_pt_sessions
        WHERE package_type_snapshot IN ('PT_SESSION', 'COMBO')
          AND (total_pt_sessions_snapshot != used_pt_sessions + remaining_pt_sessions + booked_pt_sessions)
      `);

    await client.query('COMMIT');
    console.log('✅ ĐÃ HOÀN TẤT CHUẨN HÓA DỮ LIỆU SEED 100%!');

    // Verification check
    const pts = await client.query('SELECT pt_code, full_name, phone FROM pt_profiles ORDER BY pt_code');
    console.log('\n--- DANH SÁCH HUẤN LUYỆN VIÊN TRONG HỆ THỐNG (BẮT BUỘC ĐÚNG 2 HLV) ---');
    pts.rows.forEach(p => console.log(`✓ ${p.pt_code} - ${p.full_name} (${p.phone})`));

    const distinctInstructors = await client.query('SELECT DISTINCT instructor_name, instructor_id, b.branch_name FROM community_classes cc JOIN branches b ON b.id = cc.branch_id');
    console.log('\n--- CÁC GIÁO VIÊN ĐỨNG LỚP CỘNG ĐỒNG (KHÔNG ĐƯỢC CÓ TÊN ẢO) ---');
    distinctInstructors.rows.forEach(r => console.log(`✓ ${r.instructor_name} (${r.branch_name}) - ID: ${r.instructor_id}`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('LỖI KHI LÀM SẠCH VÀ SEED:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
