const { store } = require('../config/db');
const env = require('../config/env');
const { error } = require('../utils/response');

function checkAccountLockout(phone) {
  const account = store.accounts.find(a => a.login_phone === phone);
  if (!account) return { isLocked: false };

  if (account.locked_until && new Date() < new Date(account.locked_until)) {
    const remainingMs = new Date(account.locked_until).getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return {
      isLocked: true,
      remainingMinutes,
      message: `Tài khoản tạm thời bị khóa do nhập sai quá 5 lần liên tiếp. Vui lòng thử lại sau ${remainingMinutes} phút.`
    };
  }

  // If locked_until has expired, reset
  if (account.locked_until && new Date() >= new Date(account.locked_until)) {
    account.failed_login_attempts = 0;
    account.locked_until = null;
  }

  return { isLocked: false };
}

function recordFailedAttempt(phone) {
  const account = store.accounts.find(a => a.login_phone === phone);
  if (!account) return;

  account.failed_login_attempts = (account.failed_login_attempts || 0) + 1;
  if (account.failed_login_attempts >= env.LOCKOUT_THRESHOLD) {
    account.locked_until = new Date(Date.now() + env.LOCKOUT_DURATION_MINUTES * 60 * 1000);
  }
}

function resetFailedAttempts(phone) {
  const account = store.accounts.find(a => a.login_phone === phone);
  if (!account) return;
  account.failed_login_attempts = 0;
  account.locked_until = null;
}

module.exports = {
  checkAccountLockout,
  recordFailedAttempt,
  resetFailedAttempts
};
