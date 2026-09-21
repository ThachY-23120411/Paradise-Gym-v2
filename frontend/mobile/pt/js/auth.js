/**
 * PARADISE GYM - MOBILE PT APP (TAB 3: anti-3-PT)
 * MODULE: PT05 - ĐĂNG NHẬP & XÁC THỰC HLV (AUTH CONTROLLER)
 * Includes:
 *   - PT05-US01: Đăng nhập đa phương thức (Mật khẩu & OTP) & Xác thực 2 bước (2FA), Account Lockout 15 phút
 *   - PT05-US02: Kích hoạt tài khoản PT bằng OTP (HLV lần đầu), Tra cứu hồ sơ nhân sự, Kiểm tra trạng thái
 *   - PT05-US03: Đăng xuất an toàn, điều hướng và quản lý phiên làm việc HLV
 */

(function (window, $) {
  'use strict';

  class PtAuthController {
    constructor() {
      this.currentLoginMode = 'password'; // 'password' | 'otp'
      this.failedAttempts = 0;
      this.lockoutUntil = 0;
      this.lockoutInterval = null;
      
      // 2FA state (PT05-US01)
      this.temp2faToken = null;
      this.twoFaPhone = null;
      this.twoFaCountdownTimer = null;
      this.twoFaResendRemaining = 3;

      // Activation state (PT05-US02)
      this.activationCoachData = null;
      this.actOtpCountdownTimer = null;
      this.actResendRemaining = 3;

      // Login OTP countdown & resend limits (PT05-US01 Case 2)
      this.loginOtpCountdownTimer = null;
      this.loginOtpResendRemaining = 3;
    }

    init() {
      this.bindEvents();
      this.checkLockoutState();
      this.updateFormControls();
    }

    bindEvents() {
      const self = this;
      $('#loginPhoneOrCode, #loginPassword, #actOtpCode, #actNewPassword, #actConfirmPassword').on('input', () => this.updateFormControls());
      $('#actPhoneOrCode').on('input', () => {
        this.activationCoachData = null;
        $('#actProfilePreviewCard, #actStepTwoContainer, #actAlreadyActiveCard, #actGroupOtp').hide();
        $('#actOtpCode').val('');
        this.updateFormControls();
      });
      $('#loginOtpPhone').on('input', () => { $('#groupOtpInput').hide(); $('#loginOtpCode').val(''); });
      // Toggle Login Methods (Segmented Tabs: Bằng Mật khẩu / Bằng mã OTP)
      $('#loginMethodNav .segmented-tab').on('click', function () {
        const mode = $(this).data('login-mode');
        self.switchLoginMode(mode);
      });

      // Password Eye Visibility Toggle (Form Login Password)
      $('#togglePasswordEye').on('click', function () {
        self.toggleEyeField($('#loginPassword'), $(this).find('i'));
      });

      // Activation Form Password Eye Toggles (PT05-US02)
      $('#toggleActNewPasswordEye').on('click', function () {
        self.toggleEyeField($('#actNewPassword'), $(this).find('i'));
      });

      $('#toggleActConfirmPasswordEye').on('click', function () {
        self.toggleEyeField($('#actConfirmPassword'), $(this).find('i'));
      });

      // Form Submit: Login with Password (PT05-US01 Case 1)
      $('#formLoginPassword').on('submit', function (e) {
        e.preventDefault();
        self.handleLoginPassword();
      });

      // Button: Request OTP for Login (PT05-US01 Case 2)
      $('#btnRequestLoginOtp').on('click', function () {
        self.handleRequestLoginOtp();
      });

      // Input: Auto-enable Login OTP Submit button when 6 digits entered
      $('#loginOtpCode').on('input', function () {
        const val = $(this).val().trim();
        $('#btnLoginOtpSubmit').prop('disabled', val.length !== 6);
      });

      // Form Submit: Login with OTP (PT05-US01 Case 2)
      $('#formLoginOtp').on('submit', function (e) {
        e.preventDefault();
        self.handleLoginOtp();
      });

      // Open Activation Screen (PT05-US02)
      $('#linkOpenActivation').on('click', function () {
        self.openActivationScreen();
      });

      // Back from Activation to Login
      $('#btnBackToLoginFromAct, #btnActBackToLoginNotice').on('click', function () {
        self.closeActivationScreen();
      });

      // Activation Step 1: Lookup Coach (PT05-US02)
      $('#btnActLookup').on('click', function () {
        self.handleActivationLookup();
      });

      // Activation Step 2: Request OTP (PT05-US02)
      $('#btnActRequestOtp').on('click', function () {
        self.handleActivationRequestOtp();
      });

      // Activation Step 3: Submit Activation (PT05-US02)
      $('#btnActSubmit').on('click', function () {
        self.handleActivationSubmit();
      });

      // 2FA: OTP 6-Box Inputs Auto Jumping, Backspace & Paste
      this.bindTwoFaOtpInputs();

      // 2FA: Submit button
      $('#btnVerify2FaSubmit').on('click', function () {
        self.handleVerify2Fa();
      });

      // 2FA: Resend OTP
      $('#btnResend2FaOtp').on('click', function () {
        self.handleResend2FaOtp();
      });

      // 2FA: Back to Login
      $('#btnBackToLoginFrom2Fa').on('click', function () {
        self.closeTwoFaScreen();
      });
    }

    // Helper: Toggle password input type & eye icon
    updateFormControls() {
      const passwordReady = $('#loginPhoneOrCode').val().trim() && $('#loginPassword').val();
      $('#btnLoginPasswordSubmit').prop('disabled', !passwordReady || this.lockoutUntil > Date.now());
      const password = $('#actNewPassword').val();
      const activationReady = this.activationCoachData && /^\d{6}$/.test($('#actOtpCode').val()) && /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/.test(password) && password === $('#actConfirmPassword').val();
      $('#btnActSubmit').prop('disabled', !activationReady);
    }

    toggleEyeField($input, $icon) {
      if ($input.attr('type') === 'password') {
        $input.attr('type', 'text');
        $icon.removeClass('fa-eye').addClass('fa-eye-slash');
      } else {
        $input.attr('type', 'password');
        $icon.removeClass('fa-eye-slash').addClass('fa-eye');
      }
    }

    // Helper: Normalize PT Code or Phone
    normalizePhoneOrCode(rawInput) {
      if (!rawInput) return '';
      return rawInput.trim();
    }

    // Switch between Password and OTP login tabs
    switchLoginMode(mode) {
      this.currentLoginMode = mode;
      $('#loginMethodNav .segmented-tab').removeClass('active');
      $(`#loginMethodNav .segmented-tab[data-login-mode="${mode}"]`).addClass('active');

      if (mode === 'password') {
        $('#formLoginPassword').show();
        $('#formLoginOtp').hide();
      } else {
        $('#formLoginPassword').hide();
        $('#formLoginOtp').show();
      }
    }

    // ================================================================
    // ACCOUNT LOCKOUT CONTROLLER (AF-01: Sai quá 5 lần khóa 15 phút)
    // ================================================================
    checkLockoutState() {
      const now = Date.now();
      if (this.lockoutUntil > now) {
        this.triggerLockout(this.lockoutUntil);
        return true;
      }
      if (this.lockoutUntil) this.clearLockout();
      return false;
    }

    triggerLockout(expiryTime) {
      this.lockoutUntil = expiryTime;
      
      $('#lockoutBanner').addClass('active');
      $('#btnLoginPasswordSubmit, #btnLoginOtpSubmit, #btnRequestLoginOtp').prop('disabled', true);
      $('#authScreen input').prop('disabled', true);

      if (this.lockoutInterval) clearInterval(this.lockoutInterval);

      const updateTimer = () => {
        const remainingSeconds = Math.max(0, Math.ceil((this.lockoutUntil - Date.now()) / 1000));
        const mins = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
        const secs = (remainingSeconds % 60).toString().padStart(2, '0');
        $('#lockoutTimer').text(`${mins}:${secs}`);

        if (remainingSeconds <= 0) {
          this.clearLockout();
          ptApp.showToast('Khóa tạm thời 15 phút đã kết thúc. Bạn có thể đăng nhập lại.', 'success');
        }
      };

      updateTimer();
      this.lockoutInterval = setInterval(updateTimer, 1000);
    }

    recordFailedAttempt(errorMessage) {
      ptApp.showToast(errorMessage || 'Đăng nhập không thành công. Vui lòng thử lại.', 'error');
    }

    clearLockout() {
      this.failedAttempts = 0;
      this.lockoutUntil = 0;
      localStorage.removeItem('pt_failed_attempts');
      localStorage.removeItem('pt_lockout_until');
      if (this.lockoutInterval) clearInterval(this.lockoutInterval);

      $('#lockoutBanner').removeClass('active');
      $('#btnLoginPasswordSubmit').prop('disabled', false);
      $('#btnLoginOtpSubmit').prop('disabled', $('#loginOtpCode').val().length !== 6);
      $('#btnRequestLoginOtp').prop('disabled', false);
      $('input').prop('disabled', false);
    }

    // ================================================================
    // PT05-US01: TRƯỜNG HỢP 1 - ĐĂNG NHẬP BẰNG MẬT KHẨU (+ 2FA)
    // ================================================================
    async handleLoginPassword() {
      if (this.checkLockoutState()) return;

      if ($('#btnLoginPasswordSubmit').prop('disabled')) return;
      const rawIdentifier = $('#loginPhoneOrCode').val().trim();
      const password = $('#loginPassword').val();

      if (!rawIdentifier || !password) {
        ptApp.showToast('Vui lòng nhập đầy đủ Số điện thoại / Mã PT và Mật khẩu', 'warning');
        return;
      }

      const phone = this.normalizePhoneOrCode(rawIdentifier);

      const submitBtn = $('#btnLoginPasswordSubmit');
      submitBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...');

      try {
        const res = await apiClient.auth.loginWithPassword(phone, password, 'PT');
        submitBtn.prop('disabled', false).html('<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP');

        if (res.data && res.data.requires_2fa) {
          // Requires 2FA Step
          this.openTwoFaScreen(res.data.temp_token, phone, res.data.dev_otp, res.data.masked_phone);
        } else {
          // Open the overview only after the server has issued a full session.
          this.clearLockout();
          ptApp.showToast('Đăng nhập thành công! Chào mừng HLV trở lại.', 'success');
          ptApp.initSession(res.data.user, 'overview');
        }
      } catch (err) {
        submitBtn.prop('disabled', false).html('<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP');
        
        if (err.status === 423) {
          this.triggerLockout(Date.now() + 15 * 60 * 1000);
        } else {
          this.recordFailedAttempt(err.data?.message || err.message);
        }
      }
    }

    // ================================================================
    // PT05-US01: TRƯỜNG HỢP 2 - ĐĂNG NHẬP BẰNG MÃ OTP (PASSWORDLESS)
    // ================================================================
    async handleRequestLoginOtp() {
      if (this.checkLockoutState()) return;

      if (this.loginOtpResendRemaining <= 0) {
        ptApp.showToast('Bạn đã sử dụng hết 3 lần yêu cầu gửi mã OTP trong phiên này', 'warning');
        return;
      }

      const rawPhone = $('#loginOtpPhone').val().trim();
      const phone = this.normalizePhoneOrCode(rawPhone);

      if (!/^0\d{9}$/.test(phone)) {
        ptApp.showToast('Vui lòng nhập số điện thoại hợp lệ (10 số)', 'warning');
        return;
      }

      const reqBtn = $('#btnRequestLoginOtp');
      reqBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...');

      try {
        const res = await apiClient.auth.requestOtp(phone, null, 'PT');
        this.loginOtpResendRemaining = res.data.resends_remaining ?? this.loginOtpResendRemaining - 1;

        reqBtn.hide();
        $('#otpCountdownText').css('display', 'flex');
        $('#groupOtpInput').slideDown(200);

        let countdown = 60;
        $('#otpCountdownText').text(`${countdown}s`);
        
        if (this.loginOtpCountdownTimer) clearInterval(this.loginOtpCountdownTimer);
        this.loginOtpCountdownTimer = setInterval(() => {
          countdown--;
          $('#otpCountdownText').text(`${countdown}s`);
          if (countdown <= 0) {
            clearInterval(this.loginOtpCountdownTimer);
            $('#otpCountdownText').hide();
            if (this.loginOtpResendRemaining > 0) {
              reqBtn.show().prop('disabled', false).html(`<i class="fa-solid fa-paper-plane"></i> Gửi lại OTP (${this.loginOtpResendRemaining} lần)`);
            } else {
              reqBtn.show().prop('disabled', true).html('<i class="fa-solid fa-ban"></i> Hết lượt gửi OTP');
            }
          }
        }, 1000);

        const devOtpHint = res.data?.dev_otp ? ` (Mã thử nghiệm: ${res.data.dev_otp})` : '';
        ptApp.showToast(res.data?.dev_otp ? `OTP phát triển (không gửi SMS): ${res.data.dev_otp}` : `Đã gửi mã OTP tới ${phone}`, 'success');
        $('#loginOtpCode').focus();
      } catch (err) {
        reqBtn.prop('disabled', false).html('<i class="fa-solid fa-paper-plane"></i> Nhận mã OTP SMS');
        ptApp.showToast(err.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.', 'error');
      }
    }

    async handleLoginOtp() {
      if (this.checkLockoutState()) return;

      const rawPhone = $('#loginOtpPhone').val().trim();
      const phone = this.normalizePhoneOrCode(rawPhone);
      const otpCode = $('#loginOtpCode').val().trim();

      if (!phone || !otpCode || otpCode.length !== 6) {
        ptApp.showToast('Vui lòng nhập đủ 6 chữ số OTP', 'warning');
        return;
      }

      const submitBtn = $('#btnLoginOtpSubmit');
      submitBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...');

      try {
        const res = await apiClient.auth.loginWithOtp(phone, otpCode, undefined, 'PT');
        submitBtn.prop('disabled', false).html('<i class="fa-solid fa-check"></i> Xác nhận đăng nhập');

        if (res.data?.requires_2fa) {
          this.openTwoFaScreen(res.data.temp_token, res.data.phone || phone, res.data.dev_otp);
          return;
        }
        // API decides whether a second factor is required.
        this.clearLockout();
        ptApp.showToast('Đăng nhập bằng mã OTP SMS thành công!', 'success');
        ptApp.initSession(res.data.user, 'overview');
      } catch (err) {
        submitBtn.prop('disabled', false).html('<i class="fa-solid fa-check"></i> Xác nhận đăng nhập');
        this.recordFailedAttempt(err.data?.message || 'Mã OTP không chính xác');
      }
    }

    // ================================================================
    // PT05-US01: BƯỚC XÁC THỰC 2 LỚP 2FA (6-BOX AUTO JUMP)
    // ================================================================
    openTwoFaScreen(tempToken, phone, devOtp, maskedPhone) {
      this.temp2faToken = tempToken;
      this.twoFaPhone = phone;
      this.twoFaResendRemaining = 3;

      // Mask phone before displaying it in the 2FA prompt.
      const masked = phone.length >= 10 
        ? `[${phone.substring(0, 4)} *** ${phone.substring(phone.length - 3)}]`
        : `[${phone}]`;
      $('#twoFaMaskedPhone').text(maskedPhone || masked);
      $('#resendAttemptsLeft').text(this.twoFaResendRemaining);

      // Reset 6 input boxes
      $('.otp-box').val('');
      $('#btnVerify2FaSubmit').prop('disabled', true);

      $('#authScreen').hide();
      $('#twoFaScreen').fadeIn(200);
      $('.otp-box[data-index="0"]').focus();

      this.startTwoFaCountdown(60);

      if (devOtp) {
        ptApp.showToast(`OTP phát triển (không gửi SMS): ${devOtp}`, 'info');
      }
    }

    closeTwoFaScreen() {
      if (this.twoFaCountdownTimer) clearInterval(this.twoFaCountdownTimer);
      $('#twoFaScreen').hide();
      $('#authScreen').fadeIn(200);
    }

    startTwoFaCountdown(seconds) {
      let count = seconds;
      $('#twoFaCountdown').text(`(${count}s)`).show();
      $('#btnResend2FaOtp').prop('disabled', true);

      if (this.twoFaCountdownTimer) clearInterval(this.twoFaCountdownTimer);
      this.twoFaCountdownTimer = setInterval(() => {
        count--;
        $('#twoFaCountdown').text(`(${count}s)`);
        if (count <= 0) {
          clearInterval(this.twoFaCountdownTimer);
          $('#twoFaCountdown').text('(Đã hết hạn)');
          if (this.twoFaResendRemaining > 0) {
            $('#btnResend2FaOtp').prop('disabled', false);
          }
        }
      }, 1000);
    }

    bindTwoFaOtpInputs() {
      const self = this;
      const inputs = $('.otp-box');

      inputs.on('input', function (e) {
        const val = $(this).val().replace(/[^0-9]/g, '');
        $(this).val(val ? val.charAt(0) : '');

        const idx = parseInt($(this).data('index'), 10);
        if (val && idx < 5) {
          inputs.eq(idx + 1).focus();
        }
        self.checkTwoFaInputsFilled();
      });

      inputs.on('keydown', function (e) {
        const idx = parseInt($(this).data('index'), 10);
        if (e.key === 'Backspace' && !$(this).val() && idx > 0) {
          inputs.eq(idx - 1).focus();
        }
      });

      // Handle paste 6 numbers event
      inputs.on('paste', function (e) {
        e.preventDefault();
        const clipboardData = (e.originalEvent || e).clipboardData.getData('text');
        const digits = clipboardData.replace(/[^0-9]/g, '').slice(0, 6);
        if (digits.length > 0) {
          digits.split('').forEach((d, i) => {
            if (i < 6) inputs.eq(i).val(d);
          });
          const nextIdx = Math.min(digits.length, 5);
          inputs.eq(nextIdx).focus();
          self.checkTwoFaInputsFilled();
        }
      });
    }

    checkTwoFaInputsFilled() {
      let fullCode = '';
      $('.otp-box').each(function () {
        fullCode += $(this).val();
      });

      const isComplete = fullCode.length === 6;
      $('#btnVerify2FaSubmit').prop('disabled', !isComplete);
      if (isComplete) {
        this.handleVerify2Fa();
      }
    }

    async handleVerify2Fa() {
      let otpCode = '';
      $('.otp-box').each(function () {
        otpCode += $(this).val();
      });

      if (!/^\d{6}$/.test(otpCode) || this.verifying) return;
      this.verifying = true;

      const submitBtn = $('#btnVerify2FaSubmit');
      submitBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...');

      try {
        const res = await apiClient.auth.verify2fa(this.temp2faToken, otpCode);
        submitBtn.prop('disabled', false).html('<i class="fa-solid fa-lock-open"></i> Xác nhận 2FA');

        // 2FA Success -> Final F01: Khởi tạo Session và Mở PT01 · Lịch
        this.clearLockout();
        ptApp.showToast('Xác thực 2 lớp thành công! Đang vào ứng dụng...', 'success');
        this.closeTwoFaScreen();
        ptApp.initSession(res.data.user, 'overview');
      } catch (err) {
        submitBtn.prop('disabled', false).html('<i class="fa-solid fa-lock-open"></i> Xác nhận 2FA');
        this.recordFailedAttempt(err.data?.message || 'Mã OTP 2FA không chính xác');
      } finally { this.verifying = false; }
    }

    async handleResend2FaOtp() {
      if (this.twoFaResendRemaining <= 0) {
        ptApp.showToast('Bạn đã sử dụng hết 3 lần gửi lại OTP trong phiên này', 'warning');
        return;
      }

      try {
        const res = await apiClient.auth.requestOtp(this.twoFaPhone, this.temp2faToken, 'PT');
        this.twoFaResendRemaining = res.data.resends_remaining ?? this.twoFaResendRemaining - 1;
        $('#resendAttemptsLeft').text(this.twoFaResendRemaining);
        this.startTwoFaCountdown(60);
        const hint = res.data?.dev_otp ? ` (OTP: ${res.data.dev_otp})` : '';
        ptApp.showToast(res.data?.dev_otp ? `OTP phát triển (không gửi SMS): ${res.data.dev_otp}` : 'Đã gửi lại mã OTP.', 'success');
      } catch (err) {
        ptApp.showToast('Lỗi gửi lại mã OTP. Vui lòng thử lại.', 'error');
      }
    }

    // ================================================================
    // PT05-US02: KÍCH HOẠT TÀI KHOẢN PT BẰNG OTP (HLV LẦN ĐẦU)
    // ================================================================
    openActivationScreen() {
      this.activationCoachData = null;
      $('#actOtpCode, #actNewPassword, #actConfirmPassword').val('');
      $('#actGroupOtp, #actOtpCountdownText').hide();
      $('#btnActRequestOtp').show().prop('disabled', false);
      this.updateFormControls();
      $('#authScreen').hide();
      $('#activationScreen').fadeIn(200);
      $('#actStepTwoContainer').hide();
      $('#actProfilePreviewCard').hide();
      $('#actAlreadyActiveCard').hide();
      this.actResendRemaining = 3;
    }

    closeActivationScreen() {
      if (this.actOtpCountdownTimer) clearInterval(this.actOtpCountdownTimer);
      $('#activationScreen').hide();
      $('#authScreen').fadeIn(200);
    }

    async handleActivationLookup() {
      const phoneOrCode = $('#actPhoneOrCode').val().trim();
      if (!phoneOrCode) {
        ptApp.showToast('Vui lòng nhập Số điện thoại hoặc Mã PT để tra cứu', 'warning');
        return;
      }

      // Reset UI states
      $('#actProfilePreviewCard').hide();
      $('#actStepTwoContainer').hide();
      $('#actAlreadyActiveCard').hide();

      this.activationCoachData = null;
      let found;
      $('#btnActLookup').prop('disabled', true);
      try {
        const res = await apiClient.auth.activationLookup(phoneOrCode, 'PT');
        found = res.data;
      } catch (err) {
        ptApp.showToast(err.message || 'Không thể tra cứu hồ sơ. Vui lòng thử lại.', 'error');
        return;
      } finally { $('#btnActLookup').prop('disabled', false); }

      // 3. Xử lý các nhánh Activity Diagram PT05-US02 (D01: Trạng thái hồ sơ HLV?)
      
      // Nhánh 1: Chưa có hồ sơ nhân sự (D01 "Chưa có hồ sơ" -> E02 -> F03)
      if (!found) {
        ptApp.showToast(
          'Không tìm thấy thông tin hồ sơ HLV. Vui lòng liên hệ Lễ tân hoặc Quản lý chi nhánh để được tạo hồ sơ nhân sự trước khi kích hoạt.',
          'error'
        );
        return;
      }

      // Nhánh 2: Tài khoản đã được kích hoạt trước đó (D01 "Đã kích hoạt" -> E01 -> F02: AF-01)
      if ((found.account_status || found.status) === 'ACTIVE') {
        $('#actAlreadyActiveCard').slideDown(200);
        ptApp.showToast(
          'Tài khoản HLV đã được kích hoạt. Vui lòng quay lại màn hình Đăng nhập để truy cập ứng dụng.',
          'warning'
        );
        return;
      }

      // Nhánh 3: Hồ sơ chờ kích hoạt (D01 "Hồ sơ chờ kích hoạt" -> S02)
      if ((found.account_status || found.status) !== 'PENDING_ACTIVATION') {
        ptApp.showToast('Hồ sơ này chưa đủ điều kiện kích hoạt.', 'error');
        return;
      }
      this.activationCoachData = {
        id: found.id,
        name: found.masked_name || found.full_name,
        code: found.masked_code || found.pt_code || 'Chưa cập nhật',
        branch: found.branch_name || 'Chưa cập nhật',
        phone: found.phone || phoneOrCode,
        status: found.status
      };

      $('#actPreviewName').text(`HLV ${this.activationCoachData.name}`);
      $('#actPreviewCode').text(this.activationCoachData.code);
      $('#actPreviewBranch').text(this.activationCoachData.branch);
      $('#actProfilePreviewCard').slideDown(200);
      $('#actStepTwoContainer').slideDown(200);
      this.actResendRemaining = 3;
      this.updateFormControls();

      ptApp.showToast('Đã tìm thấy hồ sơ HLV chờ kích hoạt. Vui lòng bấm [ Nhận mã OTP ] để tiếp tục.', 'success');
    }

    async handleActivationRequestOtp() {
      if (this.actResendRemaining <= 0) {
        ptApp.showToast('Bạn đã sử dụng hết 3 lần yêu cầu cấp lại mã OTP trong phiên này', 'warning');
        return;
      }

      const phone = this.activationCoachData?.phone;
      if (!phone) {
        ptApp.showToast('Không xác định được số điện thoại nhận OTP của HLV', 'error');
        return;
      }

      const reqBtn = $('#btnActRequestOtp');
      reqBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...');

      try {
        const res = await apiClient.auth.requestOtp(phone, null, 'PT');
        this.actResendRemaining = res.data.resends_remaining ?? this.actResendRemaining - 1;

        reqBtn.hide();
        $('#actOtpCountdownText').css('display', 'flex');
        $('#actGroupOtp').slideDown(200);

        let countdown = 60;
        $('#actOtpCountdownText').text(`${countdown}s`);
        
        if (this.actOtpCountdownTimer) clearInterval(this.actOtpCountdownTimer);
        this.actOtpCountdownTimer = setInterval(() => {
          countdown--;
          $('#actOtpCountdownText').text(`${countdown}s`);
          if (countdown <= 0) {
            clearInterval(this.actOtpCountdownTimer);
            $('#actOtpCountdownText').hide();
            if (this.actResendRemaining > 0) {
              reqBtn.show().prop('disabled', false).html(`<i class="fa-solid fa-paper-plane"></i> Gửi lại OTP (${this.actResendRemaining} lần)`);
            } else {
              reqBtn.show().prop('disabled', true).html('<i class="fa-solid fa-ban"></i> Hết lượt gửi OTP');
            }
          }
        }, 1000);

        const devHint = res.data?.dev_otp ? ` (OTP: ${res.data.dev_otp})` : '';
        ptApp.showToast(res.data?.dev_otp ? `OTP phát triển (không gửi SMS): ${res.data.dev_otp}` : 'Đã gửi mã OTP kích hoạt.', 'success');
        $('#actOtpCode').focus();
      } catch (err) {
        reqBtn.prop('disabled', false).html('<i class="fa-solid fa-paper-plane"></i> Nhận mã OTP Kích hoạt');
        ptApp.showToast('Không thể gửi mã OTP kích hoạt. Vui lòng thử lại.', 'error');
      }
    }

    async handleActivationSubmit() {
      if (!this.activationCoachData || $('#btnActSubmit').prop('disabled')) return;
      const otp = $('#actOtpCode').val().trim();
      const newPass = $('#actNewPassword').val();
      const confirmPass = $('#actConfirmPassword').val();

      // Kiểm tra tính hợp lệ của mã OTP
      if (!otp || otp.length !== 6) {
        ptApp.showToast('Vui lòng nhập đủ 6 chữ số mã OTP kích hoạt', 'warning');
        return;
      }

      // Kiểm tra tiêu chuẩn bảo mật mật khẩu mới (Main Flow Bước 8 & Field spec)
      // Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số/ký tự đặc biệt
      const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).{8,}$/;
      if (!newPass || !passwordComplexityRegex.test(newPass)) {
        ptApp.showToast(
          'Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường và chữ số hoặc ký tự đặc biệt.',
          'warning'
        );
        return;
      }

      // Kiểm tra trùng khớp 100% hai ô mật khẩu
      if (newPass !== confirmPass) {
        ptApp.showToast('Mật khẩu xác nhận không trùng khớp 100% với mật khẩu mới!', 'warning');
        return;
      }

      const submitBtn = $('#btnActSubmit');
      submitBtn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang kích hoạt...');

      try {
        const phone = this.activationCoachData.phone;
        const res = await apiClient.auth.loginWithOtp(phone, otp, newPass, 'PT');

        // Kích hoạt thành công: cập nhật trạng thái
        this.activationCoachData.status = 'ACTIVE';

        submitBtn.prop('disabled', false).html('<i class="fa-solid fa-user-shield"></i> Kích hoạt & Đăng nhập');
        this.closeActivationScreen();

        // Final F01: Chuyển ACTIVE, khởi tạo Session Mobile PT và điều hướng HLV vào màn hình PT01 · Lịch
        ptApp.showToast('Kích hoạt tài khoản PT thành công! Mật khẩu mới đã được thiết lập an toàn.', 'success');
        if (res.data?.requires_2fa) this.openTwoFaScreen(res.data.temp_token, phone, res.data.dev_otp);
        else ptApp.initSession(res.data.user, 'overview');
      } catch (err) {
        submitBtn.prop('disabled', false).html('<i class="fa-solid fa-user-shield"></i> Kích hoạt & Đăng nhập');
        // Báo lỗi theo AF-02 & Diagram D02: Mã OTP sai hoặc hết hạn
        ptApp.showToast(
          err.data?.message || 'Mã OTP không chính xác hoặc đã hết thời hạn 60 giây. Vui lòng kiểm tra lại.',
          'error'
        );
      }
    }
  }

  window.PtAuthController = PtAuthController;
  window.ptAuth = new PtAuthController();

})(window, jQuery);
