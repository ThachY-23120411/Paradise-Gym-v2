window.ParadiseApp = (function () {
  const menus = [
    { id: 'dashboard', code: 'W01', text: 'Tổng quan', icon: 'table-cells-large', module: 'DashboardModule', method: 'render', group: 'VẬN HÀNH' },
    { id: 'members', code: 'W02', text: 'Hội viên & khách hàng', icon: 'address-card', module: 'MembersModule', method: 'render' },
    { id: 'packages', code: 'W03', text: 'Gói tập', icon: 'boxes-stacked', module: 'PackagesModule', method: 'renderPackages', admin: true },
    { id: 'registrations', code: 'W04', text: 'Đăng ký & gia hạn', icon: 'file-signature', module: 'SalesModule', method: 'renderRegistrations' },
    { id: 'trainers', code: 'W05', text: 'Huấn luyện viên', icon: 'dumbbell', module: 'PtSchedulerModule', method: 'renderTrainers' },
    { id: 'pt-schedule', code: 'W06', text: 'Lịch tập & buổi PT', icon: 'calendar-days', module: 'PtSchedulerModule', method: 'renderSchedule' },
    { id: 'community-classes', code: 'W16', text: 'Lớp tập cộng đồng', icon: 'users-rectangle', module: 'CommunityModule', method: 'render' },
    { id: 'access-gate', code: 'W07', text: 'Ra vào & check-in', icon: 'arrow-right-to-bracket', module: 'CheckinModule', method: 'render' },
    { id: 'customer-care', code: 'W14', text: 'Chăm sóc khách hàng', icon: 'cake-candles', module: 'CustomerCareModule', method: 'render' },
    { id: 'payments', code: 'W08', text: 'Thu tiền & thanh toán', icon: 'wallet', module: 'SalesModule', method: 'renderPayments', group: 'KINH DOANH' },
    { id: 'commissions', code: 'W15', text: 'Hoa hồng PT', icon: 'hand-holding-dollar', module: 'CommissionsModule', method: 'render', admin: true },
    { id: 'discounts', code: 'W17', text: 'Voucher & khuyến mãi', icon: 'ticket', module: 'DiscountsModule', method: 'render', admin: true },
    { id: 'notifications', code: 'W09', text: 'Thông báo', icon: 'bell', module: 'SystemModule', method: 'renderNotifications' },
    { id: 'reports', code: 'W10', text: 'Báo cáo', icon: 'chart-column', module: 'ReportsModule', method: 'render', admin: true, permission: 'view_financial' },
    { id: 'branches', code: 'W11', text: 'Chi nhánh', icon: 'building', module: 'PackagesModule', method: 'renderBranches', admin: true, global: true, group: 'QUẢN TRỊ' },
    { id: 'equipment', code: 'W12', text: 'Hệ thống & thiết bị', icon: 'display', module: 'SystemModule', method: 'renderEquipment', admin: true },
    { id: 'users-rbac', code: 'W13', text: 'Tài khoản & phân quyền', icon: 'user-shield', module: 'SystemModule', method: 'renderRbac', admin: true }
  ];
  let user = null, branches = [], active = '', context = {}, opened = [], currentModule = null, authTimer = null, routeVersion = 0;
  const isAdmin = () => user?.active_role ? ['QTV', 'ADMIN'].includes(user.active_role) : !!user?.roles?.some(role => ['QTV', 'ADMIN'].includes(role));
  function hasPermission(name) {
    const permissions = user?.permissions || user?.permission;
    if (Array.isArray(permissions)) return permissions.includes(name) || permissions.includes('*');
    if (permissions && name in permissions) return permissions[name] === true;
    return isAdmin();
  }
  const allowedMenus = () => menus.filter(menu => (!menu.admin || isAdmin()) && (!menu.global || user?.is_all_branches) && (!menu.permission || hasPermission(menu.permission)));
  const getBranchName = () => branches.find(branch => branch.id === apiClient.getCurrentBranchId())?.branch_name || ((user?.is_all_branches && !apiClient.getCurrentBranchId()) || apiClient.getCurrentBranchId() === 'ALL' ? 'Toàn bộ chi nhánh' : 'Chi nhánh được phân công');
  function buildShortcuts() {
    const $shortcuts = $('.top-shortcuts').empty();
    allowedMenus().forEach(menu => {
      $('<button class="icon-button">')
        .attr({
          'data-route': menu.id,
          'title': `${menu.code} - ${menu.text}`,
          'aria-label': menu.text
        })
        .toggleClass('active', menu.id === active)
        .append($('<i>').addClass('fa-solid fa-' + menu.icon))
        .appendTo($shortcuts);
    });
  }
  function buildNavigation() {
    const nav = $('#sidebarList').empty();
    allowedMenus().forEach(menu => {
      if (menu.group) $('<div class="nav-group">').text(menu.group).appendTo(nav);
      $('<a class="menu-nav-item">').attr({ href: '#' + menu.id, 'data-menu': menu.id, title: menu.text })
        .append($('<i>').addClass('fa-solid fa-' + menu.icon), $('<span class="menu-nav-text">').text(menu.text), $('<small>').text(menu.code)).appendTo(nav);
    });
    $('#sidebarRoleIndicator').text(isAdmin() ? 'QTV' : 'LT');
    $('#scopeLabel').text(isAdmin() ? 'Quản trị vận hành' : 'Tiếp đón & chăm sóc');
    buildShortcuts();
  }
  function buildTabs() {
    const tabs = $('#workspaceTabs').empty();
    opened.forEach(id => {
      const menu = menus.find(item => item.id === id);
      const tab = $('<div class="workspace-tab">').toggleClass('active', id === active).appendTo(tabs);
      $('<button role="tab">').attr({ 'aria-selected': id === active, 'data-tab': id }).append($('<i>').addClass('fa-solid fa-' + menu.icon), $('<span>').text(menu.text)).on('click', () => navigateTo(id)).appendTo(tab);
      if (id !== 'dashboard') $('<button class="tab-close">').attr({ 'aria-label': 'Đóng ' + menu.text, title: 'Đóng ' + menu.text }).html('<i class="fa-solid fa-xmark"></i>').on('click', () => {
        const index = opened.indexOf(id);
        opened = opened.filter(value => value !== id);
        if (active === id) navigateTo(opened[Math.max(0, index - 1)] || 'dashboard');
        else buildTabs();
      }).appendTo(tab);
    });
  }
  async function navigateTo(id, nextContext = {}) {
    if (!user) return;
    const menu = allowedMenus().find(item => item.id === id);
    if (!menu) {
      DevExpress.ui.notify('Bạn không có quyền truy cập chức năng này.', 'error', 3500);
      if (active) return;
      return navigateTo('dashboard');
    }
    const version = ++routeVersion;
    currentModule?.destroy?.();
    currentModule?.dispose?.();
    WebUI.dispose('#mainViewport');
    active = id; context = nextContext;
    if (!opened.includes(id)) opened.push(id);
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    $('.menu-nav-item').removeClass('active').removeAttr('aria-current');
    $('.menu-nav-item[data-menu="' + id + '"]').addClass('active').attr('aria-current', 'page');
    $('.top-shortcuts .icon-button').removeClass('active').removeAttr('aria-current');
    $('.top-shortcuts .icon-button[data-route="' + id + '"]').addClass('active').attr('aria-current', 'page');
    buildTabs();
    document.title = menu.text + ' | Paradise Gym';
    if (innerWidth <= 900) document.body.classList.remove('sidebar-open');
    currentModule = window[menu.module];
    try {
      if (typeof currentModule?.[menu.method] !== 'function') throw new Error('Không thể mở ' + menu.text + '. Vui lòng tải lại trang.');
      await currentModule[menu.method]('mainViewport', nextContext);
      if (version === routeVersion) $('#mainViewport').scrollTop(0);
    } catch (err) {
      if (version === routeVersion) WebUI.error('#mainViewport', err, () => navigateTo(id, nextContext));
    }
  }
  async function loadBranches() {
    const response = await apiClient.request('/branches', { headers: { 'x-branch-id': 'ALL' } });
    branches = WebUI.rows(response).filter(branch => user.is_all_branches || user.branch_ids?.includes(branch.id));
    const global = isAdmin() && user.is_all_branches;
    const options = global ? [{ id: 'ALL', branch_name: 'Toàn bộ chi nhánh' }, ...branches] : branches;
    const saved = apiClient.getCurrentBranchId();
    const selected = options.some(branch => branch.id === saved) ? saved : options[0]?.id;
    if (!selected) throw new Error('Tài khoản chưa được phân công chi nhánh. Vui lòng liên hệ quản trị viên.');
    apiClient.setCurrentBranchId(selected);
    $('#globalBranchSelector').dxSelectBox({
      dataSource: options, valueExpr: 'id', displayExpr: 'branch_name', value: selected, width: 224,
      readOnly: !isAdmin() || options.length === 1, searchEnabled: options.length > 6,
      inputAttr: { 'aria-label': 'Chi nhánh làm việc' },
      onValueChanged: e => {
        apiClient.setCurrentBranchId(e.value);
        $('#workspaceScope').text(getBranchName());
        navigateTo(active || 'dashboard');
      }
    });
    $('#workspaceScope').text(getBranchName());
  }
  async function enterApp(profile) {
    const roles = profile.roles || (profile.role ? [profile.role] : []);
    if (!roles.some(role => ['QTV', 'ADMIN', 'RECEPTIONIST', 'LT'].includes(role))) {
      apiClient.clearAuth();
      throw new Error('Tài khoản này không có quyền sử dụng cổng quản trị.');
    }
    user = { ...profile, roles, role: profile.active_role || (roles.includes('QTV') || roles.includes('ADMIN') ? 'QTV' : 'RECEPTIONIST') };
    apiClient.setUser(user);
    if (!user.is_all_branches && !user.branch_ids?.includes(apiClient.getCurrentBranchId())) apiClient.removeItem(apiClient.currentBranchKey);
    await loadBranches();
    clearInterval(authTimer);
    $('#authView').prop('hidden', true).empty();
    $('#appShell').prop('hidden', false);
    $('#userName').text(user.full_name || user.phone);
    $('#userRole').text(isAdmin() ? 'Quản trị viên' : 'Lễ tân');
    $('#userAvatar').text((user.full_name || user.phone).split(' ').filter(Boolean).slice(-2).map(item => item[0]).join('').toUpperCase());
    buildNavigation();
    await navigateTo(location.hash.slice(1) || 'dashboard');
  }
  function showLogin(message = '') {
    routeVersion++;
    currentModule?.destroy?.();
    user = null; active = ''; opened = []; currentModule = null;
    $('#appShell').prop('hidden', true);
    $('#authView').prop('hidden', false).html(
      '<div class="auth-layout"><div class="auth-brand"><i class="fa-solid fa-dumbbell"></i><span>Paradise<strong>Gym</strong></span></div>' +
      '<form class="auth-form"><span class="auth-eyebrow">CỔNG QUẢN TRỊ</span><h1>Đăng nhập</h1><p>Paradise Gym</p>' +
      '<div id="authMode"></div><div id="authFields"></div><div id="authDelivery" role="status"></div><div id="authError" role="alert"></div><div id="authSubmit"></div><div id="otpResend"></div></form>' +
      '<div class="auth-footer">Paradise Gym · Quản trị viên & Lễ tân</div></div>');
    let mode = 'password', tempToken = null, otpRequested = false, resendAt = 0, resendCount = 0;
    const data = { phone: '', password: '', otp: '' };
    let form, submit;
    function setError(err) { $('#authError').text(err?.message || err || ''); }
    function delivery(result) {
      $('#authDelivery').text(result.delivery === 'DEVELOPMENT_ONLY' ? 'Môi trường phát triển · Mã OTP: ' + result.dev_otp : result.delivery === 'PROVIDER_ACCEPTED' ? 'Mã xác thực đã được gửi qua SMS.' : 'Mã xác thực có hiệu lực 60 giây.');
    }
    function tick() {
      const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
      const resend = $('#otpResend').dxButton('instance');
      resend?.option({ disabled: remaining > 0 || resendCount >= 3, text: remaining ? 'Gửi lại mã sau ' + remaining + 's' : 'Gửi lại mã OTP' });
    }
    async function sendOtp() {
      const response = await apiClient.request('/auth/request-otp', { method: 'POST', body: { login_phone: data.phone, ...(tempToken ? { temp_token: tempToken } : {}) } });
      delivery(response.data);
      otpRequested = true; resendAt = Date.now() + 60000;
      drawFields(); tick();
      clearInterval(authTimer); authTimer = setInterval(tick, 1000);
    }
    function drawFields() {
      const items = [{ dataField: 'phone', label: { text: 'Số điện thoại' }, editorOptions: { mode: 'tel', readOnly: !!tempToken, inputAttr: { autocomplete: 'username', 'aria-label': 'Số điện thoại' } }, validationRules: [{ type: 'required', message: 'Nhập số điện thoại' }, { type: 'pattern', pattern: /^(0\d{9}|\+84\d{9})$/, message: 'Số điện thoại không hợp lệ' }] }];
      if (mode === 'password' && !tempToken) items.push({ dataField: 'password', label: { text: 'Mật khẩu' }, editorOptions: { mode: 'password', inputAttr: { autocomplete: 'current-password', 'aria-label': 'Mật khẩu' } }, validationRules: [{ type: 'required', message: 'Nhập mật khẩu' }] });
      if (otpRequested || tempToken) items.push({ dataField: 'otp', label: { text: tempToken ? 'Mã xác thực hai bước' : 'Mã OTP' }, editorOptions: { maxLength: 6, inputAttr: { inputmode: 'numeric', autocomplete: 'one-time-code', 'aria-label': 'Mã OTP' } }, validationRules: [{ type: 'pattern', pattern: /^\d{6}$/, message: 'Nhập mã OTP gồm 6 chữ số' }, { type: 'required', message: 'Nhập mã OTP' }] });
      form = $('#authFields').dxForm({ formData: data, labelLocation: 'top', showColonAfterLabel: false, items }).dxForm('instance');
      submit = $('#authSubmit').dxButton({ text: tempToken ? 'Xác thực & đăng nhập' : mode === 'otp' && !otpRequested ? 'Gửi mã OTP' : 'Đăng nhập', type: 'default', stylingMode: 'contained', width: '100%', useSubmitBehavior: true }).dxButton('instance');
      $('#otpResend').toggle(otpRequested || !!tempToken).dxButton({ text: 'Gửi lại mã OTP', stylingMode: 'text', width: '100%', onClick: async () => { try { setError(''); await sendOtp(); resendCount++; } catch (err) { setError(err); } } });
    }
    $('#authMode').dxButtonGroup({ items: [{ id: 'password', text: 'Mật khẩu' }, { id: 'otp', text: 'OTP SMS' }], keyExpr: 'id', selectedItemKeys: ['password'], selectionMode: 'single', onItemClick: e => {
      mode = e.itemData.id; tempToken = null; otpRequested = false; data.otp = ''; clearInterval(authTimer); setError(''); $('#authDelivery').empty(); drawFields();
    } });
    drawFields(); setError(message);
    $('.auth-form').on('submit', async e => {
      e.preventDefault();
      if (!form.validate().isValid) return;
      setError(''); submit.option('disabled', true);
      try {
        if (mode === 'otp' && !otpRequested && !tempToken) { await sendOtp(); return; }
        const result = tempToken ? await apiClient.auth.verify2fa(tempToken, data.otp) :
          mode === 'otp' ? await apiClient.auth.loginWithOtp(data.phone, data.otp) :
          await apiClient.auth.loginWithPassword(data.phone, data.password);
        if (result.data.requires_2fa) {
          tempToken = result.data.temp_token; otpRequested = true; resendAt = Date.now() + 60000;
          delivery(result.data);
          drawFields(); tick(); clearInterval(authTimer); authTimer = setInterval(tick, 1000);
        } else await enterApp(result.data.user || (await apiClient.auth.getMe()).data);
      } catch (err) { setError(err); }
      finally { if ($('#authSubmit').length) submit.option('disabled', false); }
    });
  }
  async function init() {
    DevExpress.localization.locale('vi');
    DevExpress.ui.dxButton.defaultOptions({ options: { stylingMode: 'outlined' } });
    DevExpress.ui.dxTextBox.defaultOptions({ options: { stylingMode: 'outlined' } });
    DevExpress.ui.dxPopup.defaultOptions({ options: { shadingColor: 'rgba(24, 45, 34, 0.3)' } });
    $('#btnDrawerToggle').on('click', () => {
      if (innerWidth <= 900) document.body.classList.toggle('sidebar-open');
      else document.body.classList.toggle('sidebar-collapsed');
      $('#btnDrawerToggle').attr('aria-expanded', innerWidth <= 900 ? document.body.classList.contains('sidebar-open') : !document.body.classList.contains('sidebar-collapsed'));
      setTimeout(() => window.dispatchEvent(new Event('resize')), 180);
    });
    $(document).on('click', '[data-route]', function () { navigateTo($(this).data('route')); });
    $('#sidebarList').on('click', 'a', function (e) { e.preventDefault(); navigateTo($(this).data('menu')); });
    $('.brand-logo').on('click', e => { e.preventDefault(); navigateTo('dashboard'); });
    $('#btnLogout').on('click', async () => {
      try { await apiClient.auth.logout(); } catch (_) { apiClient.clearAuth(); }
      apiClient.removeItem(apiClient.currentBranchKey);
      history.replaceState(null, '', location.pathname); showLogin();
    });
    window.addEventListener('hashchange', () => { if (user) navigateTo(location.hash.slice(1) || 'dashboard'); });
    window.addEventListener('paradise:branches-changed', () => {
      if (user) loadBranches().catch(err => DevExpress.ui.notify(err.message, 'error', 4000));
    });
    try {
      const token = apiClient.getAccessToken();
      if (token && !token.startsWith('demo-')) await enterApp((await apiClient.auth.getMe()).data);
      else { apiClient.clearAuth(); showLogin(); }
    } catch (err) {
      if (err.status === 401 || err.status === 403) apiClient.clearAuth();
      showLogin(err.message);
    } finally { $('#bootState').remove(); document.body.classList.remove('is-booting'); }
  }
  $(init);
  return { navigateTo, refreshCurrentView: () => navigateTo(active || 'dashboard', context), isAdmin, hasPermission, getBranchName, getCurrentMenu: () => active, getContext: () => context, getCurrentUser: () => user, showLoginDialog: () => showLogin() };
})();
