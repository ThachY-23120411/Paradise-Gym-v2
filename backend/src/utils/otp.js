const { store } = require('../config/db');
const env = require('../config/env');

function generateOtp(phone) {
  // Generate 6 digit string
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);

  // Remove existing pending OTP for this phone
  store.otp_codes = store.otp_codes.filter(o => o.phone !== phone);

  store.otp_codes.push({
    phone,
    code,
    expiresAt,
    attempts: 0
  });

  return { code, expiresAt, ttl: env.OTP_TTL_SECONDS };
}

function verifyOtp(phone, inputCode) {
  const recordIndex = store.otp_codes.findIndex(o => o.phone === phone);
  if (recordIndex === -1) {
    return { valid: false, reason: 'OTP_NOT_FOUND' };
  }

  const record = store.otp_codes[recordIndex];
  if (new Date() > record.expiresAt) {
    store.otp_codes.splice(recordIndex, 1);
    return { valid: false, reason: 'OTP_EXPIRED' };
  }

  if (record.code !== inputCode) {
    record.attempts += 1;
    if (record.attempts >= 3) {
      store.otp_codes.splice(recordIndex, 1);
      return { valid: false, reason: 'OTP_MAX_ATTEMPTS_EXCEEDED' };
    }
    return { valid: false, reason: 'OTP_INVALID' };
  }

  // Valid -> remove used OTP
  store.otp_codes.splice(recordIndex, 1);
  return { valid: true };
}

module.exports = { generateOtp, verifyOtp };
