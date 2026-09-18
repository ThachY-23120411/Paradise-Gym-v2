const authService = require('./auth.service');
const { success, error } = require('../../utils/response');
const { verifyToken, signAccessToken } = require('../../utils/token');

async function loginPassword(req, res, next) {
  try {
    const { login_phone, password } = req.body;
    if (!login_phone || !password) {
      return error(res, 'Số điện thoại và mật khẩu là bắt buộc', 400);
    }

    const result = await authService.loginWithPassword(login_phone, password);
    if (result.error) {
      return error(res, result.error, result.status);
    }

    return success(res, result, result.requires_2fa ? 'Yêu cầu xác thực 2FA' : 'Đăng nhập thành công');
  } catch (err) {
    next(err);
  }
}

async function requestOtp(req, res, next) {
  try {
    const { login_phone } = req.body;
    if (!login_phone) {
      return error(res, 'Số điện thoại là bắt buộc', 400);
    }

    const result = authService.requestOtp(login_phone);
    if (result.error) {
      return error(res, result.error, result.status);
    }

    return success(res, result, result.message);
  } catch (err) {
    next(err);
  }
}

async function loginOtp(req, res, next) {
  try {
    const { login_phone, otp_code } = req.body;
    if (!login_phone || !otp_code) {
      return error(res, 'Số điện thoại và mã OTP là bắt buộc', 400);
    }

    const result = await authService.loginWithOtp(login_phone, otp_code);
    if (result.error) {
      return error(res, result.error, result.status);
    }

    return success(res, result, 'Đăng nhập bằng OTP thành công');
  } catch (err) {
    next(err);
  }
}

async function verify2fa(req, res, next) {
  try {
    const { temp_token, otp_code } = req.body;
    if (!temp_token || !otp_code) {
      return error(res, 'temp_token và mã OTP là bắt buộc', 400);
    }

    const result = await authService.verify2fa(temp_token, otp_code);
    if (result.error) {
      return error(res, result.error, result.status);
    }

    return success(res, result, 'Xác thực 2 bước thành công');
  } catch (err) {
    next(err);
  }
}

async function socialLogin(req, res, next) {
  try {
    const { provider, email, full_name } = req.body;
    if (!provider) {
      return error(res, 'Thiếu thông tin nhà cung cấp OAuth2 (GOOGLE / MICROSOFT)', 400);
    }

    const result = await authService.socialLogin(provider, email, full_name);
    return success(res, result, `Đăng nhập liên kết ${provider} thành công`);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    return success(res, req.user, 'Lấy thông tin tài khoản thành công');
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return error(res, 'refresh_token là bắt buộc', 400);
    }

    const decoded = verifyToken(refresh_token);
    if (!decoded) {
      return error(res, 'Refresh token không hợp lệ hoặc đã hết hạn', 401);
    }

    const newAccessToken = signAccessToken({
      account_id: decoded.account_id,
      phone: decoded.phone,
      roles: decoded.roles,
      is_all_branches: decoded.is_all_branches,
      branch_ids: decoded.branch_ids,
      member_profile_id: decoded.member_profile_id,
      pt_profile_id: decoded.pt_profile_id,
      full_name: decoded.full_name
    });

    return success(res, { access_token: newAccessToken }, 'Làm mới token thành công');
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  return success(res, null, 'Đăng xuất thành công');
}

module.exports = {
  loginPassword,
  requestOtp,
  loginOtp,
  verify2fa,
  socialLogin,
  getMe,
  refreshToken,
  logout
};
