const { pool } = require('../../backend/src/db/postgres');

async function main() {
  const r = await pool.query(`
    SELECT c.branch_id, b.branch_name, c.title, c.instructor_name, c.class_date, c.start_time, c.end_time
    FROM community_classes c
    JOIN branches b ON b.id = c.branch_id
    WHERE c.class_date BETWEEN '2026-09-21' AND '2026-09-27'
    ORDER BY c.class_date, c.start_time
  `);
  console.log('Total classes this week:', r.rows.length);
  const byBranch = {};
  r.rows.forEach(row => {
    byBranch[row.branch_name] = (byBranch[row.branch_name] || 0) + 1;
  });
  console.log('Classes by branch:', byBranch);
  const sampleQ1 = r.rows.filter(x => x.branch_name.includes('Quận 1')).slice(0, 5);
  const sampleBT = r.rows.filter(x => x.branch_name.includes('Bình Thạnh')).slice(0, 5);
  console.log('Sample Q1:', sampleQ1);
  console.log('Sample BT:', sampleBT);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
