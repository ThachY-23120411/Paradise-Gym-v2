const fs = require('fs');
const path = require('path');
const { pool, transaction } = require('./postgres');

async function migrate() {
  await transaction(async db => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext('paradise-web-migration'))");
    const exists = await db.query("SELECT to_regclass('public.accounts') AS name");
    if (!exists.rows[0].name) throw new Error('Initialize the base schema before applying additive migrations.');
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/002_web_rebuild.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/003_mobile_preferences.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/004_device_sessions.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/005_remove_pt_certificates.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/006_boss_feedback_schema_upgrade.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/007_commission_configs_uniqueness_and_history.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/008_branch_default_commission_rate.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/009_pt_commission_payout_details.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/010_scheduled_package_freezes.sql'), 'utf8'));
  });
}
if (require.main === module) migrate().then(() => console.log('Additive web migration applied; existing records preserved.')).catch(err => {
  console.error(err.message); process.exitCode = 1;
}).finally(() => pool.end());
module.exports = { migrate };
