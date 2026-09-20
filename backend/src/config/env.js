require('dotenv').config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/paradise_gym',
  JWT_SECRET: process.env.JWT_SECRET || 'paradise-gym-super-secret-jwt-key-2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  OTP_TTL_SECONDS: 60,
  LOCKOUT_THRESHOLD: 5,
  LOCKOUT_DURATION_MINUTES: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '2', 10),
  BANK_BIN: process.env.BANK_BIN || '970422',
  BANK_ACCOUNT_NO: process.env.BANK_ACCOUNT_NO || '0000123456789',
  BANK_ACCOUNT_NAME: process.env.BANK_ACCOUNT_NAME || 'CONG TY TNHH PARADISE GYM'
};
