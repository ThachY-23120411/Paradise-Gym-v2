const { betterAuth } = require('better-auth');
const { bearer, phoneNumber, twoFactor } = require('better-auth/plugins');
const env = require('./env');
const { store } = require('./db');

/**
 * Better-Auth Instance for Paradise Gym
 * Equipped with bearer, phoneNumber (SMS OTP 60s), and twoFactor plugins
 */
const auth = betterAuth({
  secret: env.JWT_SECRET,
  baseURL: `http://localhost:${env.PORT}/api/auth`,
  rateLimit: {
    window: env.LOCKOUT_DURATION_MINUTES * 60, // 15 minutes window
    max: env.LOCKOUT_THRESHOLD // 5 failed attempts
  },
  plugins: [
    bearer(),
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        console.log(`[Better-Auth SMS Gateway] Gửi mã OTP ${code} đến ${phoneNumber} (Hiệu lực 60s)`);
        // Store in OTP memory store for verification bridge
        store.otp_codes = store.otp_codes.filter(o => o.phone !== phoneNumber);
        store.otp_codes.push({
          phone: phoneNumber,
          code,
          expiresAt: new Date(Date.now() + 60 * 1000),
          attempts: 0
        });
      },
      expiresIn: env.OTP_TTL_SECONDS
    }),
    twoFactor({
      issuer: 'Paradise Gym',
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          console.log(`[Better-Auth 2FA SMS] Gửi mã 2FA ${otp} đến tài khoản ${user.phoneNumber || user.id}`);
        }
      }
    })
  ]
});

module.exports = { auth };
