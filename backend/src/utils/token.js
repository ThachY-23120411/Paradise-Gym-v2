const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccessToken(payload) {
  return jwt.sign({ ...payload, token_type: 'access' }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: env.JWT_EXPIRES_IN });
}

function signRefreshToken(payload) {
  return jwt.sign({ ...payload, token_type: 'refresh' }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: env.JWT_REFRESH_EXPIRES_IN });
}

function signTemp2faToken(payload) {
  return jwt.sign({ ...payload, is_temp_2fa: true }, env.JWT_SECRET, { expiresIn: '5m' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return null;
  }
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  signTemp2faToken,
  verifyToken
};
