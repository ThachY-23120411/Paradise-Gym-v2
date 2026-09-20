const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const pt = (await pool.query("SELECT id, full_name, pt_code FROM pt_profiles WHERE pt_code = 'PT001'")).rows[0];
  console.log('PT:', pt);

  const member = (await pool.query("SELECT id, full_name, member_code FROM member_profiles WHERE member_code = 'HV001'")).rows[0];
  console.log('MEMBER:', member);

  const regs = (await pool.query("SELECT id, package_name_snapshot, pt_price_snapshot, total_pt_sessions_snapshot, used_pt_sessions, member_id, assigned_pt_id, start_date, end_date FROM registrations WHERE member_id = $1", [member.id])).rows;
  console.log('REGS:', regs);

  const bookings = (await pool.query("SELECT id, booking_date, start_time, end_time, session_number, status, pt_id, registration_id FROM pt_bookings WHERE pt_id = $1 ORDER BY booking_date ASC", [pt.id])).rows;
  console.log('BOOKINGS for PT001:', bookings);

  await pool.end();
}

run().catch(console.error);
