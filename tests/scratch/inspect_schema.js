const { pool } = require('../../backend/src/db/postgres');

(async () => {
  try {
    const cols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'pt_commissions' ORDER BY ordinal_position");
    console.log('Columns:', cols.rows);
    const cons = await pool.query("SELECT conname, pg_get_constraintdef(c.oid) as def FROM pg_constraint c JOIN pg_class cl ON cl.oid = c.conrelid WHERE cl.relname = 'pt_commissions'");
    console.log('Constraints:', cons.rows);
    const trigs = await pool.query("SELECT tgname FROM pg_trigger t JOIN pg_class cl ON cl.oid = t.tgrelid WHERE cl.relname = 'pt_commissions' AND NOT tgisinternal");
    console.log('Triggers:', trigs.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
})();
