process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5435/paradise_gym';
const { pool } = require('../../backend/src/db/postgres');
(async () => {
  try {
    await pool.query(`
      UPDATE pt_bookings 
      SET start_time = '14:00:00', end_time = '15:00:00' 
      WHERE id = '54bc1e42-3912-4dc4-aa2f-6f5bd2d90ab8'
    `);
    console.log('Updated booking 54bc1e42 to 14:00 - 15:00');
  } finally {
    await pool.end();
  }
})();
