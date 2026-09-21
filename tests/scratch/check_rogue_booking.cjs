process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5435/paradise_gym';
const { pool } = require('../../backend/src/db/postgres');
(async () => {
  try {
    const res = await pool.query(`SELECT * FROM pt_bookings WHERE id = '54bc1e42-3912-4dc4-aa2f-6f5bd2d90ab8'`);
    console.log(res.rows[0]);
  } finally {
    await pool.end();
  }
})();
