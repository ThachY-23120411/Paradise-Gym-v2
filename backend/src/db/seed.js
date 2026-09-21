const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const env = require('../config/env');
const bcrypt = require('bcryptjs');

async function repairPlaceholderPasswords(client) {
  const sql = fs.readFileSync(path.join(__dirname, 'seeds', '001_seed_data.sql'), 'utf8');
  const block = sql.slice(sql.indexOf('INSERT INTO accounts ('), sql.indexOf('ON CONFLICT (login_phone)'));
  const entries = [...block.matchAll(/\('([0-9a-f-]{36})',\s*'(\d+)',\s*'([^']+)'/g)];
  const validHash = await bcrypt.hash('Paradise@123', 12);
  let affected = 0;
  for (const [, id, phone, placeholder] of entries) {
    if (await bcrypt.compare('Paradise@123', placeholder)) continue;
    const changed = await client.query('UPDATE accounts SET password_hash=$4,session_version=session_version+1,updated_at=NOW() WHERE id=$1 AND login_phone=$2 AND password_hash=$3 RETURNING id', [id, phone, placeholder, validHash]);
    if (!changed.rowCount) continue;
    affected += changed.rowCount;
    await client.query(`INSERT INTO audit_logs(actor_account_id,action_name,target_table,target_id,old_values,new_values,reason)
      VALUES($1,'SEED_PASSWORD_HASH_REPAIRED','accounts',$1,$2,$3,'Authorized repair of exact invalid documented seed hash; all other fields preserved')`, [id, { known_seed_placeholder: true }, { password_hash_repaired: true }]);
  }
  return affected;
}

async function runPasswordRepair() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const affected = await repairPlaceholderPasswords(client);
    await client.query('COMMIT');
    console.log(`Repaired ${affected} exact seed-placeholder password hashes. Business data and other hashes preserved.`);
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); await pool.end(); }
}

async function runSeed() {
  console.log('🌱 ========================================================');
  console.log('🌱 PARADISE GYM - DATABASE SEEDING PROCESS');
  console.log('🌱 ========================================================');
  console.log('Connecting to configured PostgreSQL database.');

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 5000
  });

  let client;
  try {
    client = await pool.connect();
    console.log('✅ PostgreSQL connection established successfully.');
    const existing=(await client.query("SELECT to_regclass('public.accounts') AS accounts")).rows[0].accounts;
    if(existing&&(await client.query('SELECT 1 FROM accounts LIMIT 1')).rowCount&&!(process.argv.includes('--reset-and-seed')&&process.env.ALLOW_DESTRUCTIVE_SEED==='true')) {
      throw new Error('Refusing to reset a populated database. Use db:migrate for additive changes or db:repair-seed-passwords for the scoped repair. A disposable reset requires both --reset-and-seed and ALLOW_DESTRUCTIVE_SEED=true.');
    }
    await client.query('BEGIN');

    // 1. Reset public schema to guarantee fresh 3NF structure
    console.log('⏳ Resetting schema public (CASCADE)...');
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);
    console.log('✅ Fresh public schema created with uuid-ossp & pgcrypto.');

    // 2. Execute 22-table DDL migration script
    const ddlPath = path.join(__dirname, 'migrations', '001_create_tables.sql');
    console.log(`⏳ Executing DDL: ${ddlPath}`);
    const ddlSql = fs.readFileSync(ddlPath, 'utf8');
    await client.query(ddlSql);
    // Bootstrap nullable package durations before the base catalog seed uses them.
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '002_web_rebuild.sql'), 'utf8'));
    console.log('✅ 22 Tables and Indexes created successfully.');

    // 3. Execute comprehensive relational seed data
    const seedPath = path.join(__dirname, 'seeds', '001_seed_data.sql');
    console.log(`⏳ Executing Seed Data: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '003_mobile_preferences.sql'), 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '004_device_sessions.sql'), 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '005_remove_pt_certificates.sql'), 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '006_boss_feedback_schema_upgrade.sql'), 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '007_commission_configs_uniqueness_and_history.sql'), 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '008_branch_default_commission_rate.sql'), 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '009_pt_commission_payout_details.sql'), 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '010_scheduled_package_freezes.sql'), 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '011_pt_bookings_no_overlap_indexes.sql'), 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '012_pt_commission_session_snapshot.sql'), 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '013_pt_booking_participants.sql'), 'utf8'));
    
    // 3.1. Execute Boss Feedback Extensions Seed Data
    const bossSeedPath = path.join(__dirname, 'seeds', '002_boss_feedback_seed.sql');
    console.log(`⏳ Executing Boss Feedback Seed Data: ${bossSeedPath}`);
    await client.query(fs.readFileSync(bossSeedPath, 'utf8'));
    await client.query(fs.readFileSync(path.join(__dirname, 'migrations', '014_successful_payment_ledger.sql'), 'utf8'));

    await repairPlaceholderPasswords(client);
    console.log('✅ Seed SQL executed successfully.');

    // 4. Verify insertion counts
    const tables = [
      'branches', 'roles', 'accounts', 'account_roles', 'account_branch_scopes',
      'member_profiles', 'pt_profiles', 'packages', 'package_branches',
      'registrations', 'registration_allowed_branches', 'pt_assignment_requests',
      'payments', 'payment_intents', 'receipts', 'pt_bookings', 'devices', 'access_logs',
      'notification_templates', 'notifications', 'audit_logs',
      'discounts', 'pt_commission_configs', 'community_classes', 'holidays'
    ];

    console.log('\n📊 SEED DATA VERIFICATION SUMMARY:');
    console.log('------------------------------------------------------------');
    for (const tbl of tables) {
      const res = await client.query(`SELECT COUNT(*) AS count FROM ${tbl}`);
      console.log(`  🔹 ${tbl.padEnd(30)} : ${res.rows[0].count} records`);
    }
    console.log('------------------------------------------------------------');

    // 5. Special validation for accounts and clean state
    const adminAcc = await client.query(`SELECT login_phone, status FROM accounts WHERE login_phone = '0900000001'`);
    const ptThe = await client.query(`SELECT full_name, pt_code, phone FROM pt_profiles WHERE pt_code = 'PT001'`);
    const memberNam = await client.query(`SELECT full_name, member_code, phone FROM member_profiles WHERE member_code = 'HV001'`);
    const pkgCount = await client.query(`SELECT COUNT(*) AS count FROM packages WHERE status = 'ACTIVE'`);
    const regCount = await client.query(`SELECT COUNT(*) AS count FROM registrations`);
    const bookingCount = await client.query(`SELECT COUNT(*) AS count FROM pt_bookings`);

    console.log('\n🎯 KEY ACCOUNTS & CLEAN STATE READY FOR CRUD:');
    console.log(`  ⭐ Quản trị viên (QTV): ${adminAcc.rows[0]?.login_phone} - Status: ${adminAcc.rows[0]?.status}`);
    console.log(`  ⭐ Huấn luyện viên (PT001): ${ptThe.rows[0]?.full_name} (${ptThe.rows[0]?.phone})`);
    console.log(`  ⭐ Hội viên (HV001): ${memberNam.rows[0]?.full_name} (${memberNam.rows[0]?.phone})`);
    console.log(`  ⭐ Danh mục Gói tập: ${pkgCount.rows[0]?.count} gói ACTIVE sẵn sàng sử dụng`);
    console.log(`  ⭐ Hợp đồng đăng ký: ${regCount.rows[0]?.count} records (Trống hoàn toàn)`);
    console.log(`  ⭐ Lịch tập PT: ${bookingCount.rows[0]?.count} records (Trống hoàn toàn)`);

    console.log('\n🎉 [Database Seed] CLEAN SLATE COMPLETE! ALL OPERATIONAL DATA CLEARED FOR USER CRUD TESTING!\n');

    await client.query('COMMIT');
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ [Database Seed] Error during seeding:', err.message || err);
    if (client) await client.query('ROLLBACK');
    if (client) client.release();
    await pool.end();
    process.exit(1);
  }
}

if (require.main === module) {
  if (process.argv.includes('--repair-placeholder-passwords')) {
    runPasswordRepair().catch(err => { console.error(err.message); process.exitCode = 1; });
  } else {
    runSeed();
  }
}

module.exports = { runSeed, repairPlaceholderPasswords };
