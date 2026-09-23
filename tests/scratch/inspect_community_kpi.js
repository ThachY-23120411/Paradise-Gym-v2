process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5435/paradise_gym';
const { pool } = require('../../backend/src/db/postgres');

async function check() {
  const res = await pool.query(`
    SELECT COUNT(*) as count,
           SUM(base_price) as total_base,
           SUM(bonus_amount) as total_bonus,
           SUM(base_price + bonus_amount) as total_comp
    FROM community_classes
    WHERE class_date >= '2026-09-01' AND class_date <= '2026-09-30'
  `);
  console.log('Stats:', res.rows[0]);

  // Kiểm tra theo chi nhánh
  const branches = await pool.query(`
    SELECT b.branch_name, c.branch_id,
           COUNT(*) as count,
           SUM(c.base_price) as total_base,
           SUM(c.bonus_amount) as total_bonus,
           SUM(c.base_price + c.bonus_amount) as total_comp
    FROM community_classes c
    JOIN branches b ON b.id = c.branch_id
    WHERE c.class_date >= '2026-09-01' AND c.class_date <= '2026-09-30'
    GROUP BY b.branch_name, c.branch_id
  `);
  console.log('Branches:', branches.rows);

  await pool.end();
}

check();
