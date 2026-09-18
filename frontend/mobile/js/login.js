/**
 * PARADISE GYM - UNIFIED MOBILE LOGIN CONTROLLER
 * Single Common Entry Point for both Member and Trainer (PT)
 * Automatically detects Account Role and dispatches to the corresponding app.
 */

(function (window, $) {
  'use strict';

  class UnifiedMobileAuth {
    constructor() {
      this.currentView = 'password'; // 'password' | 'otp' | '2fa' | 'activate' | 'register'
      this.temp2faData = null;
      this.otpCountdown = null;
      this.lockoutUntil = 0;
      this.lockoutTimer = null;
    }

    init() {
      this.bindEvents();
      this.checkAutoRedirect();
      this.loadBranchOptions();
      this.checkLockoutState();
    }

    // Auto-redirect if user already has an active session
    async checkAutoRedirect() {
      const token = apiClient.getAccessToken();
      if (!token) return;

      try {
        const res = await apiClient.auth.getMe();
        if (res.data) {
          this.dispatchRole(res.data);
        }
      } catch (err) {
        // Stale or revoked token
        apiClient.clearAuth();
      }
    }

    dispatchRole(user) {
      const role = user.active_role || user.role || (user.roles?.includes('PT') ? 'PT' : 'MEMBER');
      if (role === 'PT') {
        window.location.replace('/mobile/pt/');
      } else if (role === 'MEMBER') {
        window.location.replace('/mobile/member/');
      } else {
        this.showToast('Tài khoản nhân viên Quản trị/Lễ tân. Đang chuyển sang Web Admin...', 'info');
        setTimeout(() => window.location.replace('/web/'), 1200);
      }
    }

    bindEvents() {
      const self = this;

      // Mode Navigation
      $('.tab-btn').on('click', function () {
        const view = $(this).data('view');
        self.switchView(view);
      });

      // Eye Toggles
      $('.btn-toggle-eye').on('click', function () {
        const targetId = $(this).data('target');
        const input = $(`#${targetId}`);
        const icon = $(this).find('i');
        if (input.attr('type') === 'password') {
          input.attr('type', 'text');
          icon.removeClass('fa-eye').addClass('fa-eye-slash');
        } else {
          input.attr('type', 'password');
          icon.removeClass('fa-eye-slash').addClass('fa-eye');
        }
      });

      // Submit: Password Login
      $('#formLoginPassword').on('submit', function (e) {
        e.preventDefault();
        self.handlePasswordLogin();
      });

      // Request Login OTP
      $('#btnRequestLoginOtp').on('click', function () {
        self.handleRequestLoginOtp();
      });

      // Submit: OTP Login
      $('#formLoginOtp').on('submit', function (e) {
        e.preventDefault();
        self.handleOtpLogin();
      });

      // Submit: 2FA Verification
      $('#form2Fa').on('submit', function (e) {
        e.preventDefault();
        self.handle2FaSubmit();
      });

      // Resend 2FA OTP
      $('#btnResend2FaOtp').on('click', function () {
        self.handleResend2FaOtp();
      });

      // Switch to Register View
      $('#linkGoRegister').on('click', function (e) {
        e.preventDefault();
        self.switchView('register');
      });

      // Switch to Activate View
      $('#linkGoActivate').on('click', function (e) {
        e.preventDefault();
        self.switchView('activate');
      });

      // Back to Login Links
      $('.btn-back-login').on('click', function (e) {
        e.preventDefault();
        self.switchView('password');
      });

      // Activation: Lookup
      $('#btnActLookup').on('click', function () {
        self.handleActivationLookup();
      });

      // Activation: Request OTP
      $('#btnActRequestOtp').on('click', function () {
        self.handleActivationRequestOtp();
      });

      // Activation: Submit
      $('#formActivate').on('submit', function (e) {
        e.preventDefault();
        self.handleActivationSubmit();
      });

      // Register: Request OTP
      $('#btnRequestRegOtp').on('click', function () {
        self.handleRegisterRequestOtp();
      });

      // Register Submit (Member)
      $('#formRegister').on('submit', function (e) {
        e.preventDefault();
        self.handleRegisterSubmit();
      });

      // Setup 6-Box OTP Inputs
      this.setupOtpInputBoxes('otpBoxesLogin', 'loginOtpCodeHidden');
      this.setupOtpInputBoxes('otpBoxes2Fa', 'twoFaCodeHidden');
      this.setupOtpInputBoxes('otpBoxesAct', 'actOtpCodeHidden');
      this.setupOtpInputBoxes('otpBoxesReg', 'regOtpCodeHidden');
    }

    setupOtpInputBoxes(containerId, hiddenInputId) {
      const container = $(`#${containerId}`);
      if (!container.length) return;

      const boxes = container.find('.otp-box');
      boxes.on('input', function () {
        const val = $(this).val().replace(/\D/g, '').slice(-1);
        $(this).val(val);

        if (val) {
          const next = $(this).next('.otp-box');
          if (next.length) next.focus();
        }

        // Collect combined OTP
        let fullCode = '';
        boxes.each(function () { fullCode += $(this).val(); });
        $(`#${hiddenInputId}`).val(fullCode);
      });

      boxes.on('keydown', function (e) {
        if (e.key === 'Backspace' && !$(this).val()) {
          const prev = $(this).prev('.otp-box');
          if (prev.length) prev.focus();
        }
      });

      boxes.on('paste', function (e) {
        e.preventDefault();
        const clipboard = (e.originalEvent || e).clipboardData.getData('text').trim();
        if (/^\d{6}$/.test(clipboard)) {
          boxes.each(function (idx) {
            $(this).val(clipboard[idx]);
          });
          boxes.last().focus();
          $(`#${hiddenInputId}`).val(clipboard);
        }
      });
    }

    switchView(viewName) {
      this.currentView = viewName;
      $('.form-panel').hide();
      $(`.tab-btn`).removeClass('active');

      if (viewName === 'password') {
        $('#tabBtnPassword').addClass('active');
        $('#panelPassword').fadeIn(150);
        $('#tabNav').show();
      } else if (viewName === 'otp') {
        $('#tabBtnOtp').addClass('active');
        $('#panelOtp').fadeIn(150);
        $('#tabNav').show();
      } else if (viewName === '2fa') {
        $('#tabNav').hide();
        $('#panel2Fa').fadeIn(150);
      } else if (viewName === 'activate') {
        $('#tabNav').hide();
        $('#panelActivate').fadeIn(150);
      } else if (viewName === 'register') {
        $('#tabNav').hide();
        $('#panelRegister').fadeIn(150);
        this.loadBranchOptions();
      }
    }

    // ========================================================
    // 1. PASSWORD LOGIN (Member Phone or PT Code + Password)
    // ========================================================
    async handlePasswordLogin() {
      if (this.checkLockoutState()) return;

      const rawIdentifier = $('#loginIdentifier').val().trim();
      const password = $('#loginPassword').val();

      if (!rawIdentifier || !password) {
        this.showToast('Vui lòng nhập đầy đủ Số điện thoại / Mã PT và Mật khẩu', 'warning');
        return;
      }

      const btn = $('#btnLoginPasswordSubmit');
      btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập...');

      try {
        const res = await apiClient.auth.loginWithPassword(rawIdentifier, password);
        btn.prop('disabled', false).html('<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP NGAY');

        if (res.data?.requires_2fa) {
          this.temp2faData = {
            temp_token: res.data.temp_token,
            phone: rawIdentifier,
            masked_phone: res.data.masked_phone || rawIdentifier
          };
          this.open2FaView(res.data);
        } else {
          this.showToast('Đăng nhập thành công!', 'success');
          this.dispatchRole(res.data.user);
        }
      } catch (err) {
        btn.prop('disabled', false).html('<i class="fa-solid fa-right-to-bracket"></i> ĐĂNG NHẬP NGAY');
        if (err.status === 423) {
          this.triggerLockout(Date.now() + 15 * 60 * 1000);
        } else {
          this.showToast(err.data?.message || err.message || 'Đăng nhập không thành công', 'error');
        }
      }
    }

    // ========================================================
    // 2. OTP PASSWORDLESS LOGIN
    // ========================================================
    async handleRequestLoginOtp() {
      if (this.checkLockoutState()) return;

      const phone = $('#loginOtpPhone').val().trim();
      if (!phone || !/^0[0-9]{9}$/.test(phone)) {
        this.showToast('Vui lòng nhập đúng định dạng Số điện thoại 10 số (0xxxxxxxxx)', 'warning');
        return;
      }

      const btn = $('#btnRequestLoginOtp');
      btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...');

      try {
        const res = await apiClient.auth.requestOtp(phone);
        btn.prop('disabled', false).text('Gửi lại OTP');
        $('#otpBoxesGroup').slideDown(200);
        $('#btnLoginOtpSubmit').prop('disabled', false);

        if (res.data?.dev_otp) {
          $('#otpDevHint').text(`Mã phát triển OTP: ${res.data.dev_otp}`).show();
        }

        this.startOtpTimer('loginOtpTimer', btn, res.data?.ttl_seconds || 60);
        this.showToast('Mã OTP 6 số đã được gửi qua SMS (hiệu lực 60s)', 'info');
        $('#otpBoxesLogin .otp-box').first().focus();
      } catch (err) {
        btn.prop('disabled', false).text('Nhận mã OTP');
        this.showToast(err.data?.message || err.message || 'Không thể gửi mã OTP', 'error');
      }
    }

    async handleOtpLogin() {
      const phone = $('#loginOtpPhone').val().trim();
      const code = $('#loginOtpCodeHidden').val().trim();

      if (!phone || code.length !== 6) {
        this.showToast('Vui lòng nhập đủ 6 chữ số mã OTP', 'warning');
        return;
      }

      const btn = $('#btnLoginOtpSubmit');
      btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực...');

      try {
        const res = await apiClient.auth.loginWithOtp(phone, code);
        btn.prop('disabled', false).html('<i class="fa-solid fa-arrow-right-to-bracket"></i> ĐĂNG NHẬP VỚI OTP');
        this.showToast('Đăng nhập OTP thành công!', 'success');
        this.dispatchRole(res.data.user);
      } catch (err) {
        btn.prop('disabled', false).html('<i class="fa-solid fa-arrow-right-to-bracket"></i> ĐĂNG NHẬP VỚI OTP');
        this.showToast(err.data?.message || err.message || 'Mã OTP không chính xác hoặc đã hết hạn', 'error');
      }
    }

    // ========================================================
    // 3. 2FA VERIFICATION
    // ========================================================
    open2FaView(data) {
      this.switchView('2fa');
      $('#twoFaMaskedPhone').text(data.masked_phone || 'số điện thoại đã đăng ký');
      if (data.dev_otp) {
        $('#twoFaDevHint').text(`Mã OTP 2FA phát triển: ${data.dev_otp}`).show();
      }
      this.startOtpTimer('twoFaTimer', $('#btnResend2FaOtp'), data.ttl_seconds || 60);
      $('#otpBoxes2Fa .otp-box').val('');
      $('#twoFaCodeHidden').val('');
      $('#otpBoxes2Fa .otp-box').first().focus();
    }

    async handle2FaSubmit() {
      const code = $('#twoFaCodeHidden').val().trim();
      if (code.length !== 6) {
        this.showToast('Vui lòng nhập đủ 6 chữ số mã OTP 2FA', 'warning');
        return;
      }

      const btn = $('#btnVerify2FaSubmit');
      btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực 2FA...');

      try {
        const res = await apiClient.auth.verify2fa(this.temp2faData.temp_token, code);
        btn.prop('disabled', false).html('<i class="fa-solid fa-shield-check"></i> XÁC THỰC HOÀN TẤT');
        this.showToast('Xác thực 2FA thành công!', 'success');
        this.dispatchRole(res.data.user);
      } catch (err) {
        btn.prop('disabled', false).html('<i class="fa-solid fa-shield-check"></i> XÁC THỰC HOÀN TẤT');
        this.showToast(err.data?.message || err.message || 'Mã OTP 2FA không chính xác', 'error');
      }
    }

    async handleResend2FaOtp() {
      const btn = $('#btnResend2FaOtp');
      btn.prop('disabled', true);
      try {
        const res = await apiClient.auth.requestOtp(this.temp2faData.phone, this.temp2faData.temp_token);
        if (res.data?.dev_otp) {
          $('#twoFaDevHint').text(`Mã OTP 2FA phát triển: ${res.data.dev_otp}`).show();
        }
        this.startOtpTimer('twoFaTimer', btn, res.data?.ttl_seconds || 60);
        this.showToast('Đã gửi lại mã OTP 2FA mới', 'info');
      } catch (err) {
        this.showToast(err.data?.message || err.message, 'error');
      }
    }

    // ========================================================
    // 4. FIRST-TIME ACTIVATION (Member & PT)
    // ========================================================
    async handleActivationLookup() {
      const raw = $('#actIdentifier').val().trim();
      if (!raw) {
        this.showToast('Vui lòng nhập Số điện thoại hoặc Mã PT để tra cứu', 'warning');
        return;
      }

      const btn = $('#btnActLookup');
      btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang tra cứu...');

      try {
        const isPt = /^PT[0-9]+$/i.test(raw);
        const role = isPt ? 'PT' : 'MEMBER';
        const res = await apiClient.auth.activationLookup(raw, role);
        btn.prop('disabled', false).html('<i class="fa-solid fa-magnifying-glass"></i> Tra cứu hồ sơ');

        if (res.data?.status === 'ACTIVE') {
          this.showToast('Tài khoản đã được kích hoạt trước đó. Vui lòng đăng nhập bằng mật khẩu.', 'info');
          this.switchView('password');
          $('#loginIdentifier').val(raw);
          return;
        }

        $('#actProfileName').text(res.data?.full_name || res.data?.masked_name || 'Hội viên / HLV');
        $('#actProfileBranch').text(res.data?.branch_name || res.data?.home_branch_name || 'Chi nhánh Paradise');
        $('#actProfilePreview').slideDown(200);
        $('#actStepOtp').slideDown(200);
        this.showToast('Tìm thấy hồ sơ hợp lệ! Vui lòng bấm [Nhận mã kích hoạt].', 'success');
      } catch (err) {
        btn.prop('disabled', false).html('<i class="fa-solid fa-magnifying-glass"></i> Tra cứu hồ sơ');
        this.showToast(err.data?.message || err.message || 'Không tìm thấy hồ sơ', 'error');
      }
    }

    async handleActivationRequestOtp() {
      const raw = $('#actIdentifier').val().trim();
      const isPt = /^PT[0-9]+$/i.test(raw);
      const role = isPt ? 'PT' : 'MEMBER';
      const btn = $('#btnActRequestOtp');
      btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...');

      try {
        const res = await apiClient.auth.requestOtp(raw, null, role);
        btn.prop('disabled', false).text('Gửi lại mã');
        $('#actOtpInputGroup').slideDown(200);
        $('#actPasswordGroup').slideDown(200);
        $('#btnActSubmit').prop('disabled', false);

        if (res.data?.dev_otp) {
          $('#actDevHint').text(`Mã OTP phát triển: ${res.data.dev_otp}`).show();
        }
        this.startOtpTimer('actTimer', btn, res.data?.ttl_seconds || 60);
        this.showToast('Mã OTP kích hoạt đã gửi tới SĐT đăng ký', 'info');
      } catch (err) {
        btn.prop('disabled', false).text('Nhận mã OTP');
        this.showToast(err.data?.message || err.message, 'error');
      }
    }

    async handleActivationSubmit() {
      const raw = $('#actIdentifier').val().trim();
      const code = $('#actOtpCodeHidden').val().trim();
      const pass = $('#actPassword').val();
      const confirmPass = $('#actConfirmPassword').val();

      if (code.length !== 6) {
        this.showToast('Vui lòng nhập đủ 6 số mã OTP', 'warning');
        return;
      }
      if (!pass || pass.length < 6) {
        this.showToast('Mật khẩu mới phải có tối thiểu 6 ký tự', 'warning');
        return;
      }
      if (pass !== confirmPass) {
        this.showToast('Xác nhận mật khẩu không khớp', 'warning');
        return;
      }

      const btn = $('#btnActSubmit');
      btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang kích hoạt...');

      const isPt = /^PT[0-9]+$/i.test(raw);
      const role = isPt ? 'PT' : 'MEMBER';

      try {
        const res = await apiClient.auth.loginWithOtp(raw, code, pass, role);
        btn.prop('disabled', false).html('<i class="fa-solid fa-check"></i> HOÀN TẤT KÍCH HOẠT');
        this.showToast('Kích hoạt tài khoản thành công!', 'success');
        this.dispatchRole(res.data.user);
      } catch (err) {
        btn.prop('disabled', false).html('<i class="fa-solid fa-check"></i> HOÀN TẤT KÍCH HOẠT');
        this.showToast(err.data?.message || err.message, 'error');
      }
    }

    // ========================================================
    // 5. MEMBER REGISTRATION (With Mandatory Branch Dropdown)
    // ========================================================
    async loadBranchOptions() {
      try {
        const res = await apiClient.request('/branches?status=ACTIVE');
        const select = $('#regHomeBranch');
        select.empty();
        select.append('<option value="" disabled selected>-- Chọn chi nhánh phòng tập * --</option>');

        const branches = res.data?.items || res.data || [];
        branches.forEach(b => {
          select.append(`<option value="${b.id}">${b.branch_name} (${b.branch_code})</option>`);
        });
      } catch (e) {
        console.warn('Không thể nạp danh sách chi nhánh:', e);
      }
    }

    async handleRegisterRequestOtp() {
      const fullName = $('#regFullName').val().trim();
      const phone = $('#regPhone').val().trim();
      const branchId = $('#regHomeBranch').val();
      const email = $('#regEmail').val().trim();
      const password = $('#regPassword').val();
      const confirm = $('#regConfirmPassword').val();

      if (!fullName || !phone || !password) {
        this.showToast('Vui lòng điền đầy đủ các thông tin bắt buộc (*)', 'warning');
        return;
      }
      if (!branchId) {
        this.showToast('Bắt buộc phải chọn Chi nhánh phòng tập đăng ký!', 'warning');
        $('#regHomeBranch').focus();
        return;
      }
      if (!/^0[0-9]{9}$/.test(phone)) {
        this.showToast('Số điện thoại không hợp lệ (cần 10 chữ số)', 'warning');
        return;
      }
      if (password.length < 6) {
        this.showToast('Mật khẩu phải từ 6 ký tự trở lên', 'warning');
        return;
      }
      if (password !== confirm) {
        this.showToast('Mật khẩu xác nhận không khớp', 'warning');
        return;
      }

      const btn = $('#btnRequestRegOtp');
      btn.prop('disabled', true).find('#btnRequestRegOtpText').text('Đang gửi OTP...');

      try {
        const res = await apiClient.auth.signupOtp({
          login_phone: phone,
          full_name: fullName,
          home_branch_id: branchId,
          email: email || undefined,
          password
        });
        this.signupToken = res.data.signup_token;

        if (res.data.delivery === 'DEVELOPMENT_ONLY') {
          $('#regOtpDevHint').html(`<strong>Môi trường thử nghiệm:</strong> Mã OTP của bạn là <strong>${res.data.dev_otp}</strong>`).slideDown(150);
        } else {
          $('#regOtpDevHint').hide();
        }

        $('#regOtpBoxesGroup').slideDown(150);
        $('#btnRegisterSubmit').prop('disabled', false);

        this.startOtpTimer('regOtpTimer', btn, res.data.ttl_seconds || 60);
        btn.find('#btnRequestRegOtpText').text('Gửi lại mã OTP');
        this.showToast('Đã gửi mã OTP tới số điện thoại của bạn!', 'success');
        $('#otpBoxesReg .otp-box').first().focus();
      } catch (err) {
        btn.prop('disabled', false).find('#btnRequestRegOtpText').text('Nhận mã OTP');
        this.showToast(err.data?.message || err.message || 'Không thể gửi mã OTP', 'error');
      }
    }

    async handleRegisterSubmit() {
      const otpCode = $('#regOtpCodeHidden').val();
      if (!this.signupToken) {
        this.showToast('Vui lòng bấm nhận mã OTP trước khi hoàn tất đăng ký', 'warning');
        return;
      }
      if (!otpCode || otpCode.length !== 6) {
        this.showToast('Vui lòng nhập đủ 6 chữ số mã OTP', 'warning');
        $('#otpBoxesReg .otp-box').first().focus();
        return;
      }

      const btn = $('#btnRegisterSubmit');
      btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang hoàn tất...');

      try {
        const res = await apiClient.auth.signup({
          signup_token: this.signupToken,
          otp_code: otpCode,
          device_name: 'Trình duyệt Mobile'
        });

        btn.prop('disabled', false).html('<i class="fa-solid fa-user-plus"></i> HOÀN TẤT TẠO TÀI KHOẢN');
        this.showToast('Tạo tài khoản Hội viên thành công!', 'success');
        this.dispatchRole(res.data.user);
      } catch (err) {
        btn.prop('disabled', false).html('<i class="fa-solid fa-user-plus"></i> HOÀN TẤT TẠO TÀI KHOẢN');
        this.showToast(err.data?.message || err.message || 'Đăng ký không thành công', 'error');
      }
    }

    // ========================================================
    // TIMERS, LOCKOUT & TOASTS
    // ========================================================
    startOtpTimer(timerElementId, buttonElement, durationSeconds) {
      let remaining = durationSeconds;
      const timerEl = $(`#${timerElementId}`);
      buttonElement.prop('disabled', true);

      if (this.otpCountdown) clearInterval(this.otpCountdown);
      timerEl.text(`(${remaining}s)`).show();

      this.otpCountdown = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(this.otpCountdown);
          timerEl.hide();
          buttonElement.prop('disabled', false);
        } else {
          timerEl.text(`(${remaining}s)`);
        }
      }, 1000);
    }

    checkLockoutState() {
      const now = Date.now();
      const storedLock = Number(localStorage.getItem('paradise_login_lockout') || 0);
      if (storedLock > now) {
        this.triggerLockout(storedLock);
        return true;
      }
      return false;
    }

    triggerLockout(expiryTime) {
      this.lockoutUntil = expiryTime;
      localStorage.setItem('paradise_login_lockout', expiryTime);

      $('#lockoutBanner').slideDown(200);
      $('button[type="submit"], #btnRequestLoginOtp').prop('disabled', true);
      $('input').prop('disabled', true);

      if (this.lockoutTimer) clearInterval(this.lockoutTimer);
      const update = () => {
        const remainingSec = Math.max(0, Math.ceil((this.lockoutUntil - Date.now()) / 1000));
        const mins = Math.floor(remainingSec / 60).toString().padStart(2, '0');
        const secs = (remainingSec % 60).toString().padStart(2, '0');
        $('#lockoutCountdown').text(`${mins}:${secs}`);

        if (remainingSec <= 0) {
          clearInterval(this.lockoutTimer);
          localStorage.removeItem('paradise_login_lockout');
          $('#lockoutBanner').slideUp(200);
          $('button[type="submit"], #btnRequestLoginOtp').prop('disabled', false);
          $('input').prop('disabled', false);
          this.showToast('Khóa tạm thời 15 phút đã kết thúc. Bạn có thể đăng nhập lại.', 'success');
        }
      };

      update();
      this.lockoutTimer = setInterval(update, 1000);
    }

    showToast(message, type = 'info') {
      $('.login-toast').remove();
      const toast = $(`<div class="login-toast ${type}"><i class="fa-solid fa-circle-info"></i> <span>${message}</span></div>`);
      $('body').append(toast);
      setTimeout(() => {
        toast.fadeOut(300, function () { $(this).remove(); });
      }, 3500);
    }
  }

  $(document).ready(() => {
    window.unifiedAuth = new UnifiedMobileAuth();
    window.unifiedAuth.init();
  });
})(window, jQuery);