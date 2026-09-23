process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5435/paradise_gym';
const { pool } = require('../../backend/src/modules/core/http');

(async () => {
  const acc = await pool.query("SELECT id, login_phone, full_name FROM accounts WHERE login_phone = '0987654321' OR full_name ILIKE '%Nam%'");
  console.log('Accounts:', acc.rows);

  const mem = await pool.query("SELECT id, member_code, full_name, phone, account_id FROM member_profiles WHERE member_code = 'HV001' OR phone = '0987654321' OR full_name ILIKE '%Nam%'");
  console.log('Members:', mem.rows);

  const memId = '40000000-0000-0000-0000-000000000001';
  const regs = await pool.query("SELECT id, package_name_snapshot, package_type_snapshot, status, start_date, end_date, price_snapshot, remaining_pt_sessions, used_pt_sessions FROM registrations WHERE member_id = $1", [memId]);
  console.log('Registrations of HV001:', regs.rows);

  const bookings = await pool.query("SELECT id, pt_id, booking_date, start_time, end_time, status, session_number FROM pt_bookings WHERE member_id = $1", [memId]);
  console.log('Bookings of HV001:', bookings.rows);

  const enrollments = await pool.query("SELECT * FROM community_class_members WHERE member_id = $1", [memId]).catch(e => ({ rows: e.message }));
  console.log('Community class enrollments:', enrollments.rows);

  process.exit(0);
})();
