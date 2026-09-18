const { error } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error('[API Error]', err);
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return error(res, message, status, process.env.NODE_ENV === 'development' ? err.stack : null);
}

module.exports = { errorHandler };
