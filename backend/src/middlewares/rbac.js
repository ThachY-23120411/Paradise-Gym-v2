const { error } = require('../utils/response');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return error(res, 'User identity not found', 401);
    }

    const hasRole = req.user.roles.some(r => allowedRoles.includes(r));
    if (!hasRole) {
      return error(res, `Access denied. Requires one of roles: ${allowedRoles.join(', ')}`, 403);
    }

    next();
  };
}

module.exports = { authorize };
