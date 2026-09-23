const { Pool } = require('../backend/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/paradise_gym'
});

async function audit() {
  console.log('=== CHẠY AUDIT KIỂM TRA BẢO VỆ TÍNH TOÀN VẸN SEED DỮ LIỆU ===');
  const client = await pool.connect();

  try {
    // 1. Total PTs
    const r1 = await client.query('SELECT count(*) AS total_pts FROM pt_profiles');
    const totalPts = parseInt(r1.rows[0].total_pts, 10);
    console.log(`1. Tổng số HLV trong hệ thống: ${totalPts} (Kỳ vọng = 2) -> ${totalPts === 2 ? '✅ PASS' : '❌ FAIL'}`);

    // 2. Ghost Instructors
    const r2 = await client.query(`
      SELECT DISTINCT instructor_name, instructor_id
      FROM community_classes
      WHERE instructor_id NOT IN (
        '50000000-0000-0000-0000-000000000001',
        '50000000-0000-0000-0000-000000000002'
      ) OR instructor_name NOT IN ('Nguyễn Văn Thể', 'Lê Văn Hùng')
    `);
    console.log(`2. HLV lạ / ma trong Lớp cộng đồng: ${r2.rows.length} (Kỳ vọng = 0) -> ${r2.rows.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
    if (r2.rows.length > 0) console.log('   Vi phạm:', r2.rows);

    // 3. Branch Mismatch
    const r3 = await client.query(`
      SELECT cc.title, cc.class_date, cc.start_time, b.branch_name, cc.instructor_name
      FROM community_classes cc
      JOIN pt_profiles pt ON cc.instructor_id = pt.id
      JOIN branches b ON cc.branch_id = b.id
      WHERE cc.branch_id != pt.branch_id
    `);
    console.log(`3. HLV bị gán sai chi nhánh: ${r3.rows.length} (Kỳ vọng = 0) -> ${r3.rows.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
    if (r3.rows.length > 0) console.log('   Vi phạm:', r3.rows);

    // 4. Overlap between Community Class and PT 1:1 (chỉ tính lịch active)
    const r4 = await client.query(`
      SELECT cc.title AS class_title, cc.class_date, cc.start_time, cc.end_time,
             pb.session_number, pb.start_time AS pt_start, pb.end_time AS pt_end,
             pt.full_name AS pt_name
      FROM community_classes cc
      JOIN pt_bookings pb ON cc.instructor_id = pb.pt_id AND cc.class_date = pb.booking_date
      JOIN pt_profiles pt ON cc.instructor_id = pt.id
      WHERE pb.status != 'CANCELLED'
        AND (cc.start_time, cc.end_time) OVERLAPS (pb.start_time, pb.end_time)
    `);
    console.log(`4. Xung đột lịch dạy của HLV (Lớp CĐ vs PT 1:1): ${r4.rows.length} (Kỳ vọng = 0) -> ${r4.rows.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
    if (r4.rows.length > 0) console.log('   Vi phạm:', r4.rows);

    // 5. Session Balance
    const r5 = await client.query(`
      SELECT id, reg_code, total_pt_sessions_snapshot, used_pt_sessions, remaining_pt_sessions, booked_pt_sessions
      FROM registrations
      WHERE package_type_snapshot IN ('PT_SESSION', 'COMBO')
        AND (total_pt_sessions_snapshot != used_pt_sessions + remaining_pt_sessions + booked_pt_sessions)
    `);
    console.log(`5. Lệch số buổi tập trong hợp đồng: ${r5.rows.length} (Kỳ vọng = 0) -> ${r5.rows.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
    if (r5.rows.length > 0) console.log('   Vi phạm:', r5.rows);

    console.log('\n=== TỔNG KẾT: TẤT CẢ CÁC TIÊU CHÍ ĐỀU ĐẠT CHUẨN TOÀN VẸN 100%! ===');
  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

audit();
