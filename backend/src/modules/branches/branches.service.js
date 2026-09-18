const { store, uuid } = require('../../config/db');

function listBranches(status) {
  let list = store.branches;
  if (status) list = list.filter(b => b.status === status);
  return list;
}

function getBranchById(id) {
  return store.branches.find(b => b.id === id);
}

function createBranch({ branch_code, branch_name, phone, address, open_time, close_time }) {
  const existing = store.branches.find(b => b.branch_code === branch_code);
  if (existing) {
    return { error: 'Mã chi nhánh đã tồn tại', status: 409 };
  }

  const newBranch = {
    id: uuid(),
    branch_code,
    branch_name,
    phone,
    address,
    status: 'ACTIVE',
    open_time: open_time || '06:00:00',
    close_time: close_time || '22:00:00',
    timezone: 'Asia/Ho_Chi_Minh',
    created_at: new Date(),
    updated_at: new Date()
  };

  store.branches.push(newBranch);
  return { branch: newBranch };
}

module.exports = { listBranches, getBranchById, createBranch };
