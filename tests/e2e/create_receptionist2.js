const pg = require('../../backend/node_modules/pg');
const bcrypt = require('../../backend/node_modules/bcryptjs');

async function main() {
  const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@localhost:5435/paradise_gym' });
  const hash = await bcrypt.hash('Paradise@123', 10);
  const phone = '0900000004';
  const branchId = '22222222-2222-2222-2222-222222222222'; // Bình Thạnh

  const exist = await pool.query('SELECT id FROM accounts WHERE login_phone = $1', [phone]);
  let accId;
  if (exist.rows.length > 0) {
    accId = exist.rows[0].id;
    console.log('Account already exists:', accId);
  } else {
    const res = await pool.query(
      'INSERT INTO accounts (login_phone, password_hash, full_name, status, is_two_factor_enabled) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [phone, hash, 'Lễ tân Bình Thạnh', 'ACTIVE', false]
    );
    accId = res.rows[0].id;
    console.log('Created account:', accId);
  }

  const rRole = await pool.query('SELECT id FROM roles WHERE role_code = $1', ['RECEPTIONIST']);
  const roleId = rRole.rows[0]?.id;

  await pool.query('INSERT INTO account_roles (account_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [accId, roleId]);
  await pool.query('INSERT INTO account_branch_scopes (account_id, branch_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [accId, branchId]);

  console.log('Done! Configured 0900000004 for Branch 2');
  await pool.end();
}

main().catch(console.error);
