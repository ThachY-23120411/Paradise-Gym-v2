process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5435/paradise_gym';
const { pool } = require('../../backend/src/db/postgres');

(async () => {
  try {
    const res = await pool.query(`
      SELECT b.id, b.booking_date, b.start_time, b.end_time, b.status, 
             pt.id as pt_id, acc_pt.full_name as pt_name,
             m.id as member_id, acc_m.full_name as member_name
      FROM pt_bookings b
      LEFT JOIN pt_profiles pt ON b.pt_id = pt.id
      LEFT JOIN accounts acc_pt ON pt.account_id = acc_pt.id
      LEFT JOIN member_profiles m ON b.member_id = m.id
      LEFT JOIN accounts acc_m ON m.account_id = acc_m.id
      WHERE b.booking_date = '2026-09-21'
      ORDER BY b.start_time ASC
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } finally {
    await pool.end();
  }
})();
