const express = require('express');
const { pool, route, fail, role, scope } = require('./http');
const { canMember } = require('./catalog');
const { registrationState } = require('./registrationState');
const router = express.Router();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateId(value, field) {
  if (typeof value !== 'string' || !uuidPattern.test(value)) fail(400, `Invalid ${field}`);
}

async function overviewData(req) {
  role(req, 'QTV');
  validateId(req.params.id, 'member ID');
  for (const value of [req.headers['x-branch-id'], req.query.branch_id]) {
    if (value !== undefined && value !== 'ALL') validateId(value, 'branch ID');
  }
  const branches = scope(req);
  const memberId = req.params.id.toLowerCase();
  const db = await pool.connect();
  try {
    // One consistent, read-only snapshot; no commerce GET helpers (some perform updates).
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const member = (await db.query('SELECT id, home_branch_id FROM member_profiles WHERE id=$1', [memberId])).rows[0];
    if (!member) fail(404, 'Record not found', 'NOT_FOUND');
    await canMember(req, member, db);
    if (branches && !branches.some(id => id.toLowerCase() === member.home_branch_id)) {
      fail(403, 'Member outside current branch scope', 'FORBIDDEN');
    }
    const profile = (await db.query(`SELECT m.id, m.member_code, m.full_name, m.phone,
      m.email, m.date_of_birth, m.gender, m.avatar_url, m.status, m.home_branch_id,
      b.branch_name home_branch_name, b.timezone branch_timezone, m.created_at
      FROM member_profiles m JOIN branches b ON b.id=m.home_branch_id WHERE m.id=$1`, [memberId])).rows[0];
    const params = [memberId, branches];
    const financialColumns = req.user.permissions?.view_financial === true
      ? ', r.price_snapshot, r.gym_price_snapshot, r.pt_price_snapshot, r.combo_price_snapshot' : '';
    const registrations = (await db.query(`SELECT
      r.id, r.reg_code, r.reg_code registration_code, r.member_id, r.package_id,
      r.assigned_pt_id, r.sold_branch_id, r.package_name_snapshot, r.package_type_snapshot,
      r.duration_days_snapshot, r.total_gym_sessions_snapshot, r.total_pt_sessions_snapshot,
      r.start_date, r.end_date, r.remaining_gym_sessions, r.remaining_pt_sessions,
      r.booked_pt_sessions, r.used_pt_sessions, r.status, r.is_frozen,
      r.package_mode, r.group_leader_member_id, r.max_group_members_snapshot, r.created_at,
      r.member_id <> $1::uuid is_group_member,
      m.full_name member_name, m.member_code, b.branch_name, b.branch_name sold_branch_name,
      pt.full_name assigned_pt_name, pt.pt_code assigned_pt_code,
      pkg.session_duration_minutes,
      ARRAY(SELECT a.branch_id FROM registration_allowed_branches a
        WHERE a.registration_id=r.id ORDER BY a.branch_id) allowed_branch_ids,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ab.id, 'branch_name', ab.branch_name) ORDER BY ab.branch_name, ab.id)
        FROM registration_allowed_branches a JOIN branches ab ON ab.id=a.branch_id
        WHERE a.registration_id=r.id), '[]'::jsonb) allowed_branches,
      EXISTS(SELECT 1 FROM payments p WHERE p.registration_id=r.id AND p.confirmed_at IS NOT NULL) is_paid
      ${financialColumns}
      FROM registrations r JOIN member_profiles m ON m.id=r.member_id
      JOIN branches b ON b.id=r.sold_branch_id
      LEFT JOIN pt_profiles pt ON pt.id=r.assigned_pt_id LEFT JOIN packages pkg ON pkg.id=r.package_id
      WHERE ($2::uuid[] IS NULL OR r.sold_branch_id=ANY($2))
        AND (r.member_id=$1 OR EXISTS(SELECT 1 FROM group_pt_members gm
          WHERE gm.registration_id=r.id AND gm.member_id=$1 AND gm.invitation_status='ACCEPTED'))
      ORDER BY r.created_at DESC, r.id`, params)).rows.map(r => registrationState(r));

    const invitations = (await db.query(`SELECT
      gm.id, gm.registration_id, gm.member_id, gm.member_id recipient_member_id,
      gm.inviter_member_id, gm.invitation_status, gm.joined_at, gm.created_at,
      inviter.full_name inviter_name, inviter.member_code inviter_code,
      recipient.full_name recipient_name, recipient.member_code recipient_code,
      r.reg_code, r.package_id, r.package_name_snapshot, r.package_type_snapshot, r.package_mode,
      r.total_pt_sessions_snapshot, r.start_date, r.end_date, r.status registration_status,
      r.sold_branch_id, b.branch_name, pt.full_name assigned_pt_name
      FROM group_pt_members gm JOIN registrations r ON r.id=gm.registration_id
      JOIN member_profiles inviter ON inviter.id=gm.inviter_member_id
      JOIN member_profiles recipient ON recipient.id=gm.member_id
      JOIN branches b ON b.id=r.sold_branch_id LEFT JOIN pt_profiles pt ON pt.id=r.assigned_pt_id
      WHERE (gm.member_id=$1 OR gm.inviter_member_id=$1)
        AND ($2::uuid[] IS NULL OR r.sold_branch_id=ANY($2))
      ORDER BY gm.created_at DESC, gm.id`, params)).rows;

    const participantsAvailable = (await db.query("SELECT to_regclass('public.pt_booking_participants') IS NOT NULL available")).rows[0].available;
    // Membership today cannot establish participation in an older booking.
    const participantPredicate = participantsAvailable
      ? 'OR EXISTS(SELECT 1 FROM public.pt_booking_participants bp WHERE bp.booking_id=bk.id AND bp.member_id=$1)' : '';
    const bookings = (await db.query(`SELECT
      bk.id, bk.registration_id, bk.member_id, bk.pt_id, bk.branch_id, bk.session_number,
      bk.booking_date, bk.start_time, bk.end_time, bk.status, bk.workout_notes, bk.fitness_assessment,
      bk.cancelled_by, bk.cancel_reason, bk.cancelled_at, bk.pt_confirmed_at, bk.member_confirmed_at,
      bk.is_deducted, bk.member_id <> $1::uuid is_group_participant,
      m.full_name member_name, m.member_code, pt.full_name pt_name, pt.pt_code,
      b.branch_name, b.timezone branch_timezone, r.reg_code, r.package_name_snapshot
      FROM pt_bookings bk JOIN registrations r ON r.id=bk.registration_id
      JOIN member_profiles m ON m.id=bk.member_id JOIN pt_profiles pt ON pt.id=bk.pt_id
      JOIN branches b ON b.id=bk.branch_id
      WHERE (bk.member_id=$1 ${participantPredicate}) AND ($2::uuid[] IS NULL OR bk.branch_id=ANY($2))
      ORDER BY bk.booking_date DESC, bk.start_time DESC, bk.id`, params)).rows;

    const communityRegistrations = (await db.query(`SELECT
      cr.id, cr.class_id, cr.member_id, cr.registration_date, cr.status,
      c.title, c.class_date, c.start_time, c.end_time, c.branch_id, b.branch_name,
      c.instructor_name, c.status class_status, b.timezone branch_timezone, d.name discipline_name
      FROM community_class_registrations cr JOIN community_classes c ON c.id=cr.class_id
      JOIN branches b ON b.id=c.branch_id
      LEFT JOIN class_disciplines d ON d.id=c.discipline_id
      WHERE cr.member_id=$1 AND ($2::uuid[] IS NULL OR c.branch_id=ANY($2))
      ORDER BY c.class_date DESC, c.start_time DESC, cr.id`, params)).rows;
    await db.query('COMMIT');
    return {
      member_id: memberId, profile, registrations,
      group_invitations: {
        received: invitations.filter(i => i.member_id === memberId),
        sent: invitations.filter(i => i.inviter_member_id === memberId)
      },
      bookings, community_registrations: communityRegistrations,
      booking_participants_available: participantsAvailable
    };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}

router.get('/members/:id/overview-data', route(overviewData));
module.exports = { router, overviewData };
