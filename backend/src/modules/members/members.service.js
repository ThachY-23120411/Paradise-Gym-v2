const { store, uuid } = require('../../config/db');

function searchPhone(phone) {
  const member = store.member_profiles.find(m => m.phone === phone);
  if (!member) {
    return { exists: false, member: null };
  }
  const branch = store.branches.find(b => b.id === member.home_branch_id);
  return {
    exists: true,
    member: {
      ...member,
      home_branch_name: branch?.branch_name || ''
    }
  };
}

function listMembers({ q, branch_id, status, page = 1, limit = 20 }) {
  let list = [...store.member_profiles];

  if (branch_id) {
    list = list.filter(m => m.home_branch_id === branch_id);
  }

  if (status) {
    list = list.filter(m => m.status === status);
  }

  if (q) {
    const query = q.toLowerCase();
    list = list.filter(m => 
      m.phone.includes(query) || 
      m.member_code.toLowerCase().includes(query) || 
      m.full_name.toLowerCase().includes(query)
    );
  }

  const total = list.length;
  const startIndex = (page - 1) * limit;
  const paginated = list.slice(startIndex, startIndex + limit).map(m => {
    const branch = store.branches.find(b => b.id === m.home_branch_id);
    const activeReg = store.registrations.find(r => r.member_id === m.id && r.status === 'ACTIVE');
    return {
      ...m,
      home_branch_name: branch?.branch_name || '',
      has_active_package: !!activeReg,
      active_package_name: activeReg?.package_name_snapshot || null
    };
  });

  return {
    total,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    items: paginated
  };
}

function getMemberDetail(id) {
  const member = store.member_profiles.find(m => m.id === id);
  if (!member) return null;

  const branch = store.branches.find(b => b.id === member.home_branch_id);
  const registrations = store.registrations.filter(r => r.member_id === member.id);
  const accessLogs = store.access_logs.filter(a => a.member_id === member.id).slice(-10);
  const consents = store.member_consents.filter(c => c.member_id === member.id);
  const biometric = store.biometric_face_data.find(b => b.member_id === member.id);

  return {
    ...member,
    home_branch_name: branch?.branch_name || '',
    registrations,
    recent_access_logs: accessLogs,
    consents,
    has_biometric_face: !!biometric && biometric.status === 'ACTIVE'
  };
}

function createMember({ full_name, phone, email, home_branch_id, date_of_birth, gender, created_by }) {
  // Check duplicate phone
  const existing = store.member_profiles.find(m => m.phone === phone);
  if (existing) {
    return { error: 'Số điện thoại này đã được đăng ký bởi hội viên khác', status: 409 };
  }

  // Generate member code
  const count = store.member_profiles.length + 1;
  const memberCode = 'HV' + count.toString().padStart(3, '0');

  // Find or create account
  let account = store.accounts.find(a => a.login_phone === phone);
  if (!account) {
    account = {
      id: uuid(),
      login_phone: phone,
      password_hash: null,
      status: 'PENDING_ACTIVATION',
      failed_login_attempts: 0,
      locked_until: null,
      is_two_factor_enabled: false,
      last_login_at: null,
      created_at: new Date(),
      updated_at: new Date()
    };
    store.accounts.push(account);

    const memberRole = store.roles.find(r => r.role_code === 'MEMBER');
    if (memberRole) {
      store.account_roles.push({ account_id: account.id, role_id: memberRole.id });
    }
  }

  const newMember = {
    id: uuid(),
    account_id: account.id,
    home_branch_id,
    member_code: memberCode,
    full_name,
    phone,
    email: email || null,
    date_of_birth: date_of_birth || null,
    gender: gender || null,
    avatar_url: null,
    status: 'ACTIVE',
    created_by: created_by || null,
    created_at: new Date(),
    updated_at: new Date()
  };

  store.member_profiles.push(newMember);

  return { member: newMember };
}

function updateMember(id, updates) {
  const member = store.member_profiles.find(m => m.id === id);
  if (!member) return null;

  if (updates.full_name) member.full_name = updates.full_name;
  if (updates.email !== undefined) member.email = updates.email;
  if (updates.date_of_birth !== undefined) member.date_of_birth = updates.date_of_birth;
  if (updates.gender !== undefined) member.gender = updates.gender;
  if (updates.avatar_url !== undefined) member.avatar_url = updates.avatar_url;
  if (updates.status) member.status = updates.status;
  member.updated_at = new Date();

  return member;
}

module.exports = {
  searchPhone,
  listMembers,
  getMemberDetail,
  createMember,
  updateMember
};
