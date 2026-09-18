const { store, uuid } = require('../../config/db');

function listPackages({ branch_id, package_type, status = 'ACTIVE' }) {
  let list = store.packages;
  if (status) list = list.filter(p => p.status === status);
  if (package_type) list = list.filter(p => p.package_type === package_type);

  if (branch_id) {
    const validPkgIds = store.package_branches.filter(pb => pb.branch_id === branch_id).map(pb => pb.package_id);
    list = list.filter(p => validPkgIds.includes(p.id));
  }

  return list.map(p => {
    const branchIds = store.package_branches.filter(pb => pb.package_id === p.id).map(pb => pb.branch_id);
    const branchNames = store.branches.filter(b => branchIds.includes(b.id)).map(b => b.branch_name);
    return {
      ...p,
      allowed_branch_ids: branchIds,
      allowed_branch_names: branchNames
    };
  });
}

function getPackageDetail(id) {
  const pkg = store.packages.find(p => p.id === id);
  if (!pkg) return null;

  const branchIds = store.package_branches.filter(pb => pb.package_id === pkg.id).map(pb => pb.branch_id);
  const branches = store.branches.filter(b => branchIds.includes(b.id));

  return {
    ...pkg,
    allowed_branches: branches
  };
}

function createPackage({ package_code, package_name, package_type, price, duration_days, total_gym_sessions, total_pt_sessions, description, branch_ids = [] }) {
  const existing = store.packages.find(p => p.package_code === package_code);
  if (existing) {
    return { error: 'Mã gói tập đã tồn tại', status: 409 };
  }

  const newPkg = {
    id: uuid(),
    package_code,
    package_name,
    package_type,
    price: parseFloat(price),
    duration_days: parseInt(duration_days, 10),
    total_gym_sessions: total_gym_sessions ? parseInt(total_gym_sessions, 10) : null,
    total_pt_sessions: total_pt_sessions ? parseInt(total_pt_sessions, 10) : null,
    status: 'ACTIVE',
    description: description || null,
    created_at: new Date(),
    updated_at: new Date()
  };

  store.packages.push(newPkg);

  branch_ids.forEach(bid => {
    store.package_branches.push({ package_id: newPkg.id, branch_id: bid });
  });

  return { package: newPkg };
}

module.exports = { listPackages, getPackageDetail, createPackage };
