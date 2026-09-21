const env = require('../backend/src/config/env');
const { pool } = require('../backend/src/modules/core/http');

(async () => {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%transfer%'");
    console.log('Transfer tables:', tables.rows);

    for (const t of tables.rows) {
      const cols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position", [t.table_name]);
      console.log(`\nColumns for ${t.table_name}:`, cols.rows);
    }

    // Check if there are any rows in package_transfers
    const rows = await pool.query("SELECT * FROM package_transfers LIMIT 5");
    console.log('\nSample rows in package_transfers:', rows.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
