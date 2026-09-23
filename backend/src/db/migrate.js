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
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/011_pt_bookings_no_overlap_indexes.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/012_pt_commission_session_snapshot.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/013_pt_booking_participants.sql'), 'utf8'));
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/014_successful_payment_ledger.sql'), 'utf8'));
    if (fs.existsSync(path.join(__dirname, 'migrations/015_package_transfer_requests.sql'))) {
      await db.query(fs.readFileSync(path.join(__dirname, 'migrations/015_package_transfer_requests.sql'), 'utf8'));
    }
    if (fs.existsSync(path.join(__dirname, 'migrations/016_community_class_disciplines_and_bonus.sql'))) {
      await db.query(fs.readFileSync(path.join(__dirname, 'migrations/016_community_class_disciplines_and_bonus.sql'), 'utf8'));
    }
    await db.query(fs.readFileSync(path.join(__dirname, 'migrations/017_revenue_handovers.sql'), 'utf8'));
    if (fs.existsSync(path.join(__dirname, 'migrations/018_pt_commission_two_way_confirmation.sql'))) {
      await db.query(fs.readFileSync(path.join(__dirname, 'migrations/018_pt_commission_two_way_confirmation.sql'), 'utf8'));
    }
    if (fs.existsSync(path.join(__dirname, 'migrations/019_voucher_package_and_bonus_entitlements.sql'))) {
      await db.query(fs.readFileSync(path.join(__dirname, 'migrations/019_voucher_package_and_bonus_entitlements.sql'), 'utf8'));
    }
    if (fs.existsSync(path.join(__dirname, 'migrations/020_pt_access_logs.sql'))) {
      await db.query(fs.readFileSync(path.join(__dirname, 'migrations/020_pt_access_logs.sql'), 'utf8'));
    }
  });
}
if (require.main === module) migrate().then(() => console.log('Additive web migration applied; existing records preserved.')).catch(err => {
  console.error(err.message); process.exitCode = 1;
}).finally(() => pool.end());
module.exports = { migrate };
