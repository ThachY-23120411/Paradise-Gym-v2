const { store, uuid, getPool, isPgConnected } = require('../../config/db');

async function createRegistration({ member_id, package_id, sold_branch_id, start_date, previous_registration_id, created_by }) {
  const member = store.member_profiles.find(m => m.id === member_id);
  if (!member) return { error: 'Không tìm thấy hồ sơ hội viên', status: 404 };

  const pkg = store.packages.find(p => p.id === package_id);
  if (!pkg) return { error: 'Không tìm thấy gói tập trong danh mục', status: 404 };

  // Calculate start and end date
  let sDate = start_date ? new Date(start_date) : new Date();
  
  // If this is a renewal (gia hạn), check previous registration end date
  if (previous_registration_id) {
    const prev = store.registrations.find(r => r.id === previous_registration_id);
    if (prev && new Date(prev.end_date) >= sDate) {
      // Start the day after previous registration ends
      sDate = new Date(new Date(prev.end_date).getTime() + 24 * 60 * 60 * 1000);
    }
  }

  const eDate = new Date(sDate.getTime() + pkg.duration_days * 24 * 60 * 60 * 1000);

  const regId = uuid();
  const registration = {
    id: regId,
    member_id,
    package_id,
    assigned_pt_id: null, // PT is NULL initially, assigned later via request
    sold_branch_id,
    previous_registration_id: previous_registration_id || null,
    // Immutable 6-attribute snapshot
    package_name_snapshot: pkg.package_name,
    package_type_snapshot: pkg.package_type,
    price_snapshot: pkg.price,
    duration_days_snapshot: pkg.duration_days,
    total_gym_sessions_snapshot: pkg.total_gym_sessions,
    total_pt_sessions_snapshot: pkg.total_pt_sessions,
    start_date: sDate.toISOString().split('T')[0],
    end_date: eDate.toISOString().split('T')[0],
    remaining_gym_sessions: pkg.total_gym_sessions,
    remaining_pt_sessions: pkg.total_pt_sessions,
    booked_pt_sessions: 0,
    used_pt_sessions: 0,
    status: 'PENDING_PAYMENT',
    created_by: created_by || null,
    created_at: new Date(),
    updated_at: new Date()
  };

  store.registrations.push(registration);

  // Snapshot allowed branches
  const allowedBranches = store.package_branches.filter(pb => pb.package_id === pkg.id);
  if (allowedBranches.length > 0) {
    allowedBranches.forEach(ab => {
      store.registration_allowed_branches.push({ registration_id: regId, branch_id: ab.branch_id });
    });
  } else {
    // Default to sold branch if none configured
    store.registration_allowed_branches.push({ registration_id: regId, branch_id: sold_branch_id });
  }

  // Persist to PostgreSQL if connected
  if (isPgConnected && isPgConnected()) {
    try {
      await getPool().query(
        `INSERT INTO registrations (
          id, member_id, package_id, assigned_pt_id, sold_branch_id, previous_registration_id,
          package_name_snapshot, package_type_snapshot, price_snapshot, duration_days_snapshot,
          total_gym_sessions_snapshot, total_pt_sessions_snapshot, start_date, end_date,
          remaining_gym_sessions, remaining_pt_sessions, booked_pt_sessions, used_pt_sessions,
          status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
        [
          registration.id, registration.member_id, registration.package_id, registration.assigned_pt_id,
          registration.sold_branch_id, registration.previous_registration_id, registration.package_name_snapshot,
          registration.package_type_snapshot, registration.price_snapshot, registration.duration_days_snapshot,
          registration.total_gym_sessions_snapshot, registration.total_pt_sessions_snapshot,
          registration.start_date, registration.end_date, registration.remaining_gym_sessions,
          registration.remaining_pt_sessions, registration.booked_pt_sessions, registration.used_pt_sessions,
          registration.status, registration.created_by, registration.created_at, registration.updated_at
        ]
      );
    } catch (e) {
      console.warn('Could not persist registration to PG:', e.message);
    }
  }

  return { registration };
}

function listRegistrations({ member_id, status, branch_id }) {
  let list = store.registrations;
  if (member_id && member_id !== 'undefined' && member_id !== 'null' && member_id.trim() !== '') {
    list = list.filter(r => r.member_id === member_id);
  }
  if (status && status !== 'undefined' && status !== 'null' && status.trim() !== '') {
    list = list.filter(r => r.status === status);
  }
  if (branch_id && branch_id !== 'undefined' && branch_id !== 'null' && branch_id.trim() !== '') {
    list = list.filter(r => r.sold_branch_id === branch_id);
  }

  return list.map(r => {
    const member = store.member_profiles.find(m => m.id === r.member_id);
    const branch = store.branches.find(b => b.id === r.sold_branch_id);
    const pt = r.assigned_pt_id ? store.pt_profiles.find(p => p.id === r.assigned_pt_id) : null;
    return {
      ...r,
      member_name: member?.full_name || '',
      member_phone: member?.phone || '',
      sold_branch_name: branch?.branch_name || '',
      assigned_pt_name: pt?.full_name || null,
      package_name: r.package_name_snapshot || '',
      package_type: r.package_type_snapshot || '',
      total_pt_sessions: r.total_pt_sessions_snapshot || 0,
      total_gym_sessions: r.total_gym_sessions_snapshot || 0,
      price: r.price_snapshot || 0
    };
  });
}

function getRegistrationDetail(id) {
  const reg = store.registrations.find(r => r.id === id);
  if (!reg) return null;

  const member = store.member_profiles.find(m => m.id === reg.member_id);
  const branch = store.branches.find(b => b.id === reg.sold_branch_id);
  const pt = reg.assigned_pt_id ? store.pt_profiles.find(p => p.id === reg.assigned_pt_id) : null;
  const allowedBranchIds = store.registration_allowed_branches.filter(rab => rab.registration_id === reg.id).map(rab => rab.branch_id);
  const allowedBranches = store.branches.filter(b => allowedBranchIds.includes(b.id));
  const payments = store.payments.filter(p => p.registration_id === reg.id);
  const ptBookings = store.pt_bookings.filter(b => b.registration_id === reg.id);

  return {
    ...reg,
    member,
    sold_branch: branch,
    assigned_pt: pt,
    allowed_branches: allowedBranches,
    payments,
    pt_bookings: ptBookings
  };
}

module.exports = {
  createRegistration,
  listRegistrations,
  getRegistrationDetail
};
