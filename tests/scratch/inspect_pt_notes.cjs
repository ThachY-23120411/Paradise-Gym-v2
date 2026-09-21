const { Client } = require('../../backend/node_modules/pg');

(async () => {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5435/paradise_gym'
  });
  await client.connect();
  const res = await client.query(`
    SELECT r.reg_code, r.package_name_snapshot, COUNT(b.id) as completed_count
    FROM pt_bookings b
    JOIN registrations r ON b.registration_id = r.id
    WHERE b.booking_date >= '2026-07-01' AND b.booking_date <= '2026-07-31'
    GROUP BY r.reg_code, r.package_name_snapshot;
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
})();
