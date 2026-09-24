const path = require('path');

// Resolve the backend environment from this module's location so the API,
// simulator and tests behave consistently when launched from repo root.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5435/paradise_gym',
  JWT_SECRET: process.env.JWT_SECRET || 'paradise-gym-super-secret-jwt-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  OTP_TTL_SECONDS: 60,
  LOCKOUT_THRESHOLD: 5,
  LOCKOUT_DURATION_MINUTES: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '2', 10),
  BANK_BIN: process.env.BANK_BIN || '970415',
  BANK_ACCOUNT_NO: process.env.BANK_ACCOUNT_NO || '108875382652',
  BANK_ACCOUNT_NAME: process.env.BANK_ACCOUNT_NAME || 'THACH NHU',
  // Keep the webhook credential in backend/.env; never ship a real key in source.
  SEPAY_API_KEY: process.env.SEPAY_API_KEY || '',
  TRANSFER_PREFIX: process.env.TRANSFER_PREFIX || 'PG'
};
