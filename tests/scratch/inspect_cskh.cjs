const { Pool } = require('../../backend/node_modules/pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5435/paradise_gym' });

(async () => {
  try {
    const res = await pool.query(`
      SELECT id, reg_code, package_name_snapshot, price_snapshot, start_date, end_date, status, remaining_pt_sessions, remaining_gym_sessions 
      FROM registrations 
      ORDER BY end_date ASC NULLS LAST
      LIMIT 10
    `);
    console.log('Sample registrations:', res.rows);
  } finally {
    await pool.end();
  }
})();
