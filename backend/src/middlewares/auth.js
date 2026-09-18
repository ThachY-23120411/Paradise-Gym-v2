const { verifyToken } = require('../utils/token');
const { error } = require('../utils/response');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Missing or invalid Authorization header (Bearer token required)', 401);
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded || decoded.is_temp_2fa) {
    return error(res, 'Token is invalid or expired', 401);
  }

  req.user = decoded;
  next();
}

module.exports = { authenticate };
