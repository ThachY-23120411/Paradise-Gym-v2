const { Pool, types } = require('pg');
const env = require('../config/env');

types.setTypeParser(1082, value => value);
types.setTypeParser(1700, Number);
const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 3000 });
pool.on('error', err => console.error('[PostgreSQL]', err.code || 'CONNECTION_ERROR'));

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, transaction };
