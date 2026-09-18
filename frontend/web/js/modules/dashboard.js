window.DashboardModule = (function () {
  let currentDate = new Date(), view = null, revision = 0;
  const ui = () => window.WebUI;
  async function render(containerId) {
    const W = ui();
    const admin = ParadiseApp.isAdmin();
    view = W.page(containerId, 'Tổng quan', ParadiseApp.getBranchName());
    if (admin) $('<div>').appendTo(view.actions).dxDateBox({ value: currentDate, type: 'date', displayFormat: 'dd/MM/yyyy', max: new Date(), width: 156, inputAttr: { 'aria-label': 'Ngày tác nghiệp' }, onValueChanged: e => { if (e.value) { currentDate = e.value; load(); } } });
    else currentDate = new Date();
    W.button(view.actions, '', 'refresh', load).option('hint', 'Làm mới tổng quan');
    await load();
  }
  async function load() {
    if (!view) return;
    const W = ui(), target = view.body, version = ++revision, day = W.dateKey(currentDate), admin = ParadiseApp.isAdmin();
    W.loading(target);
    try {
      const data = (await apiClient.request('/dashboard?date=' + day)).data;
      if (version !== revision || !document.contains(target[0])) return;
      target.empty();
      const metrics = data.metrics;
      const sessions = data.bookings || [];
      const completed = sessions.filter(item => item.status === 'COMPLETED').length;
      const upcoming = sessions.filter(item => item.status === 'BOOKED' && new Date(String(item.booking_date).slice(0, 10) + 'T' + item.start_time) > new Date()).length;
      const cards = admin ? [
        { label: 'Hội viên đang hoạt động', value: metrics.active_members, caption: 'Hồ sơ đang hoạt động', icon: 'users', tone: 'green' },
        ...(ParadiseApp.hasPermission('view_financial') ? [{ label: 'Tiền thực thu trong ngày', value: W.money(metrics.cash_received), caption: 'Giao dịch đã xác nhận', icon: 'wallet', tone: 'blue' }] : []),
        { label: 'Gói sắp hết hạn', value: metrics.expiring_packages, caption: 'Trong 14 ngày tới', icon: 'hourglass-half', tone: 'amber' },
        { label: 'Buổi PT trong ngày', value: metrics.pt_bookings, caption: day === W.dateKey(new Date()) ? upcoming + ' buổi sắp tới' : completed + ' buổi đã hoàn thành', icon: 'dumbbell', tone: 'coral' }
      ] : [
        { label: 'Lượt check-in hôm nay', value: metrics.checkins, caption: 'Tại chi nhánh đang phục vụ', icon: 'arrow-right-to-bracket' },
        { label: 'Booking PT hôm nay', value: metrics.pt_bookings, caption: 'Lịch tập tại chi nhánh', icon: 'calendar-days', tone: 'blue' },
        { label: 'Đăng ký chờ thanh toán', value: metrics.pending_registrations, caption: 'Chưa kích hoạt quyền tập', icon: 'file-invoice', tone: 'amber' },
        { label: 'Yêu cầu cần xử lý', value: metrics.pending_requests, caption: 'Công việc tại quầy', icon: 'list-check', tone: 'coral' }
      ];
      W.metrics(target, cards);
      const quick = $('<div class="quick-actions">').appendTo(target);
      W.button(quick, 'Thêm hội viên', 'add', () => ParadiseApp.navigateTo('members', { action: 'create' }), true);
      W.button(quick, 'Tạo đăng ký', 'doc', () => ParadiseApp.navigateTo('registrations', { action: 'create' }));
      W.button(quick, 'Đặt lịch PT', 'event', () => ParadiseApp.navigateTo('pt-schedule', { action: 'create' }));
      W.button(quick, 'Ghi nhận ra/vào', 'runner', () => ParadiseApp.navigateTo('access-gate'));
      if (!admin) renderTasks(target, data.tasks || {});
      const columns = $('<div class="dashboard-columns">').appendTo(target);
      renderAccess(columns, data.access_logs || []);
      renderSchedule(columns, data.bookings || []);
    } catch (err) { if (version === revision) W.error(target, err, load); }
  }
  function renderTasks(container, tasks) {
    const W = ui(), section = W.section(container, 'Việc cần xử lý tại quầy');
    const list = $('<div class="task-list">').appendTo(section.body);
    [
      { label: 'Đăng ký chưa thanh toán', count: tasks.pending_registrations, icon: 'file-invoice', route: 'registrations', context: { status: 'PENDING_PAYMENT' } },
      { label: 'Booking PT sắp tới', count: tasks.upcoming_bookings, icon: 'calendar-days', route: 'pt-schedule', context: { status: 'BOOKED' } },
      { label: 'Booking chờ xác nhận', count: tasks.awaiting_bookings, icon: 'clock', route: 'pt-schedule', context: { status: 'PENDING_COMPLETION' } },
      { label: 'Hội viên cần hỗ trợ đặt lịch', count: tasks.unassigned_registrations, icon: 'user-plus', route: 'pt-schedule', context: { action: 'create' } },
      { label: 'Thiết bị check-in có lỗi', count: tasks.offline_devices, icon: 'display', route: 'access-gate', context: {} }
    ].forEach(task => $('<button class="task-button">').toggleClass('task-danger', task.route === 'access-gate' && task.count > 0).append($('<i>').addClass('fa-solid fa-' + task.icon), $('<span>').text(task.label), $('<strong>').text(task.count ?? '-')).on('click', () => ParadiseApp.navigateTo(task.route, task.context)).appendTo(list));
  }
  function renderAccess(container, logs) {
    const W = ui(), section = W.section(container, 'Ra/vào gần nhất', header => W.button(header, 'Xem tất cả', 'chevronright', () => ParadiseApp.navigateTo('access-gate', { date: W.dateKey(currentDate) })));
    if (!logs.length) return W.empty(section.body, 'Không có lượt ra vào nào được ghi nhận trong ngày này', 'door-open');
    logs.slice(0, 8).forEach(log => {
      const valid = ['ALLOWED', 'VALID'].includes(log.status);
      const endDate = log.registration_end_date && String(log.registration_end_date).slice(0, 10);
      const horizon = new Date(currentDate); horizon.setDate(horizon.getDate() + 14);
      const expiring = valid && endDate && endDate >= W.dateKey(currentDate) && endDate <= W.dateKey(horizon);
      const row = $('<div class="activity-row">').appendTo(section.body);
      row.append(W.badge(log.direction === 'OUT' ? 'RA' : 'VÀO', log.direction === 'OUT' ? 'neutral' : 'success'));
      if (log.member_avatar_url && /^https?:\/\//.test(log.member_avatar_url)) $('<img class="member-avatar">').attr({ src: log.member_avatar_url, alt: log.member_name || 'Hội viên' }).appendTo(row);
      else $('<div class="member-avatar">').text((log.member_name || '?').split(' ').slice(-2).map(x => x[0]).join('')).appendTo(row);
      $('<div class="activity-body">').append($('<strong>').text(log.member_name || 'Chưa nhận diện'), $('<small>').text([log.member_code, log.package_name, log.device_name || log.branch_name].filter(Boolean).join(' · '))).appendTo(row);
      $('<div class="activity-end">').append($('<small>').text(W.time(log.check_in_time || log.event_time)), W.badge(valid ? (expiring ? 'Sắp hết hạn' : 'Hợp lệ') : 'Không đủ điều kiện', valid ? (expiring ? 'warning' : 'success') : 'danger')).appendTo(row);
    });
  }
  function renderSchedule(container, bookings) {
    const W = ui(), section = W.section(container, 'Lịch PT · ' + W.date(currentDate), header => W.button(header, '', 'event', () => ParadiseApp.navigateTo('pt-schedule', { date: W.dateKey(currentDate) })).option('hint', 'Mở lịch tập PT'));
    if (!bookings.length) return W.empty(section.body, 'Không có lịch tập PT nào trong ngày này', 'calendar-check');
    bookings.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))).slice(0, 10).forEach(booking => {
      let label = 'Sắp tới', tone = 'info';
      if (booking.status === 'COMPLETED') { label = 'Đã ghi nhận'; tone = 'success'; }
      else if (['CANCELLED', 'NO_SHOW'].includes(booking.status)) { label = booking.status === 'CANCELLED' ? 'Đã hủy' : 'Vắng mặt'; tone = 'neutral'; }
      else if (booking.pt_confirmed_at || booking.member_confirmed_at || ['PENDING_CONFIRMATION', 'PENDING_COMPLETION', 'AWAITING_CONFIRMATION'].includes(booking.status)) { label = 'Chờ xác nhận'; tone = 'warning'; }
      else {
        const start = new Date((booking.booking_date || W.dateKey(currentDate)).slice(0, 10) + 'T' + (booking.start_time || '00:00'));
        const end = new Date((booking.booking_date || W.dateKey(currentDate)).slice(0, 10) + 'T' + (booking.end_time || '23:59'));
        if (new Date() >= start && new Date() < end) { label = 'Đang diễn ra'; tone = 'warning'; }
        else if (new Date() >= end) { label = 'Chờ xác nhận'; tone = 'warning'; }
      }
      const row = $('<button class="activity-row schedule-item">').attr('type', 'button').appendTo(section.body).on('click', () => ParadiseApp.navigateTo('pt-schedule', { date: booking.booking_date || W.dateKey(currentDate), booking_id: booking.id }));
      $('<span class="activity-time">').text(String(booking.start_time || '').slice(0, 5)).appendTo(row);
      $('<div class="activity-body">').append($('<strong>').text(booking.member_name || '-'), $('<small>').text(booking.pt_name || booking.trainer_name || '-')).appendTo(row);
      $(W.badge(label, tone)).appendTo(row);
    });
  }
  return { render, refresh: load, destroy: () => { revision++; view = null; } };
})();
