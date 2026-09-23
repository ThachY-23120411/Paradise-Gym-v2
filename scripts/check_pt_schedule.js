const { Pool } = require('../backend/node_modules/pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/paradise_gym'
});

async function check() {
  const client = await pool.connect();
  try {
    const pt1 = await client.query(`
      SELECT booking_date, start_time, end_time, session_number, status
      FROM pt_bookings
      WHERE pt_id = '50000000-0000-0000-0000-000000000001'
        AND booking_date BETWEEN '2026-09-21' AND '2026-09-27'
      ORDER BY booking_date, start_time
    `);
    console.log('=== LỊCH DẠY PT 1:1 CỦA PT001 (NGUYỄN VĂN THỂ - QUẬN 1) ===');
    console.table(pt1.rows);

    const pt2 = await client.query(`
      SELECT booking_date, start_time, end_time, session_number, status
      FROM pt_bookings
      WHERE pt_id = '50000000-0000-0000-0000-000000000002'
        AND booking_date BETWEEN '2026-09-21' AND '2026-09-27'
      ORDER BY booking_date, start_time
    `);
    console.log('=== LỊCH DẠY PT 1:1 CỦA PT002 (LÊ VĂN HÙNG - BÌNH THẠNH) ===');
    console.table(pt2.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

check();
