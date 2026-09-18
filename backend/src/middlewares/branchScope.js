const { error } = require('../utils/response');

function checkBranchScope(req, res, next) {
  if (!req.user) return next();

  // If user has global branch access (like top admin), proceed
  if (req.user.is_all_branches) return next();

  const requestedBranchId = req.headers['x-branch-id'] || req.params.branchId || req.body.branch_id || req.query.branch_id;
  if (!requestedBranchId) return next();

  const userBranches = req.user.branch_ids || [];
  if (!userBranches.includes(requestedBranchId)) {
    return error(res, 'Access denied: You do not have permission to manage this branch', 403);
  }

  next();
}

module.exports = { checkBranchScope };
