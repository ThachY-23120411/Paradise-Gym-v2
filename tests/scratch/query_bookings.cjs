process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5435/paradise_gym';
const { pool } = require('../../backend/src/db/postgres');
(async () => {
  try {
    const res = await pool.query(`
      SELECT b.id, b.booking_date, b.start_time, b.end_time, b.status, 
             b.pt_confirmed_at, b.member_confirmed_at
      FROM pt_bookings b
      WHERE b.member_id = '40000000-0000-0000-0000-000000000001'
      ORDER BY b.booking_date DESC, b.start_time ASC
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
