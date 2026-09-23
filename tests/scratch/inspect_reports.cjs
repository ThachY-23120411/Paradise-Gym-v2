const { Pool } = require('../../backend/node_modules/pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5435/paradise_gym' });

(async () => {
  const res = await pool.query(`
    SELECT r.id, r.status, r.package_name_snapshot, r.price_snapshot, p.amount as payment_amount, p.discount_amount
    FROM registrations r
    LEFT JOIN payments p ON p.registration_id = r.id
    WHERE (r.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date BETWEEN '2026-09-01' AND '2026-09-30'
  `);
  console.table(res.rows);
  await pool.end();
})();
