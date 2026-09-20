/** W09/W12/W13: records, mutations and telemetry are supplied by REST only. */
window.SystemModule = (function () {
  'use strict';
  const ROLES = { QTV: 'Quản trị viên', RECEPTIONIST: 'Lễ tân', PT: 'Huấn luyện viên', MEMBER: 'Hội viên' };
  const EVENTS = { PAYMENT_CONFIRMED: 'Thanh toán thành công', BOOKING_CREATED: 'Đặt lịch PT', BOOKING_CANCELLED: 'Hủy lịch PT', BOOKING_REMINDER: 'Nhắc lịch PT', PT_REQUEST_ACCEPTED: 'Chấp nhận phân công PT', PT_REQUEST_REJECTED: 'Từ chối phân công PT', PT_ASSIGNMENT_REQUEST: 'Yêu cầu phân công PT', PT_SESSION_AWAITING_CONFIRMATION: 'Chờ xác nhận buổi PT', PT_SESSION_CONFIRMED: 'Xác nhận buổi PT', REGISTRATION_ACTIVATED: 'Kích hoạt đăng ký', REGISTRATION_CANCELLED: 'Hủy đăng ký', PACKAGE_EXPIRING: 'Gói tập sắp hết hạn', FACILITY_NOTICE: 'Thông báo chi nhánh' };
  const VARIABLE_ALIASES = { ten_hoi_vien: 'member_name', ten_goi: 'package_name', ngay_het_han: 'expiry_date', ten_pt: 'pt_name', thoi_gian_tap: 'time_slot', gio_tap: 'time_slot', so_tien: 'amount', ma_hop_dong: 'registration_code', ly_do_huy: 'cancel_reason' };
  const LABELS = { ACTIVE: 'Hoạt động', PENDING_ACTIVATION: 'Chờ kích hoạt', LOCKED: 'Đã khóa', ONLINE: 'Online', OFFLINE: 'Offline', ERROR: 'Lỗi', PENDING_SYNC: 'Chờ đồng bộ', INACTIVE: 'Ngừng hoạt động', OPEN: 'Mới ghi nhận', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã xử lý', LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Nghiêm trọng', GRANTED: 'Đã đồng ý', REVOKED: 'Đã rút', READY: 'Sẵn sàng', PENDING: 'Đang chờ' };
  let current;
  const rows = data => Array.isArray(data) ? data : (data?.items || []);
  const encoded = value => encodeURIComponent(value);
  const alive = element => !!element?.[0]?.isConnected;
  const text = value => value == null || value === '' ? '-' : String(value);
  const codes = roles => (roles || []).map(role => typeof role === 'string' ? role : role.code || role.role_code);
  const canManageDevices = ctx => ctx.admin && ctx.user.permissions?.manage_devices !== false;
  const canManageAccounts = ctx => ctx.admin && ctx.user.permissions?.manage_accounts !== false;
  const canEnroll = ctx => ctx.role === 'RECEPTIONIST' || canManageDevices(ctx);
  const options = values => values.map(code => ({ code, name: LABELS[code] || ROLES[code] || code }));
  const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '-';
  const dateKey = value => { const d = new Date(value); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  function errorText(error) {
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    if (error.status === 403) return 'Bạn không có quyền thực hiện thao tác trong phạm vi chi nhánh này.';
    if (error.status === 404) return 'Không tìm thấy dữ liệu hoặc chức năng chưa sẵn sàng. Vui lòng thử lại.';
    return error.message === 'Failed to fetch' ? 'Không thể kết nối máy chủ. Vui lòng thử lại.' : error.message || 'Không thể xử lý yêu cầu.';
  }
  function query(path, values = {}) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => { if (value !== '' && value != null) params.set(key, value); });
    return path + (params.size ? `?${params}` : '');
  }
  async function api(path, config = {}, ctx) {
    if (!window.apiClient) throw new Error('Chưa kết nối dịch vụ dữ liệu.');
    if (ctx && ctx.branch !== (apiClient.getCurrentBranchId() || '')) throw new Error('Chi nhánh đã thay đổi. Vui lòng mở lại màn hình.');
    const result = await apiClient.request(path, { ...config, headers: { ...(config.headers || {}), ...(ctx ? { 'x-active-role': ctx.role } : {}) } });
    if (!result || result.success === false || !Object.prototype.hasOwnProperty.call(result, 'data')) throw new Error(result?.message || 'Phản hồi dữ liệu không hợp lệ.');
    const data = result.data;
    // Adapt database field names at the module boundary.
    if (path.startsWith('/notifications/')) {
      const normalize = item => ({ ...item, event_code: item.event_code || item.event_type,
        template_name: item.template_name || item.name || item.template_code,
        unconfigured: item.unconfigured || item.configured === false,
        event_name: item.event_name || EVENTS[item.event_code || item.event_type] || item.event_code || item.event_type,
        is_active: item.is_active ?? item.is_enabled,
        recipient_modes: item.recipient_modes || item.modes?.map(mode => mode === 'BRANCH' ? 'BRANCH_BROADCAST' : mode) });
      if (Array.isArray(data)) return data.map(normalize);
      if (data?.items) return { ...data, items: data.items.map(normalize) };
      if (data && typeof data === 'object') return normalize(data);
    }
    return data;
  }
  async function all(path, ctx, filters = {}) {
    const items = [];
    for (let page = 1; page < 501; page += 1) {
      const result = await api(query(path, { ...filters, page, limit: 100 }), {}, ctx);
      const batch = rows(result); items.push(...batch);
      if (Array.isArray(result) || !batch.length || items.length >= Number(result.total)) return items;
      if (!Number.isFinite(Number(result.total))) throw new Error('Thiếu tổng số bản ghi trong phản hồi.');
    }
    throw new Error('Danh sách quá lớn. Vui lòng thu hẹp phạm vi chi nhánh.');
  }
  function button(host, label, icon, action, primary = false) {
    return $('<div>').appendTo(host).dxButton({ text: label, icon, hint: label, type: primary ? 'default' : 'normal', stylingMode: primary ? 'contained' : 'outlined', onClick: async e => {
      e.component.option('disabled', true);
      try { await action(e); } catch (error) { DevExpress.ui.notify(errorText(error), 'error', 5000); }
      finally { if (alive($(e.element))) e.component.option('disabled', false); }
    } }).dxButton('instance');
  }
  function iconButton(host, label, icon, action) {
    const instance = button(host, '', icon, action);
    instance.option({ hint: label, elementAttr: { 'aria-label': label }, stylingMode: 'text' }); return instance;
  }
  function notice(host, message, error = false) {
    host.empty().attr('role', error ? 'alert' : 'status');
    $('<p>').css({ margin: '12px 0', color: error ? '#b42318' : '#57616d', whiteSpace: 'pre-wrap' }).text(message).appendTo(host);
  }
  async function load(host, fetcher, render) {
    const revision = (host.data('revision') || 0) + 1; host.data('revision', revision);
    notice(host, 'Đang tải dữ liệu...');
    try {
      const data = await fetcher();
      if (!alive(host) || host.data('revision') !== revision) return;
      host.empty(); await render(data);
    } catch (error) {
      if (!alive(host) || host.data('revision') !== revision) return;
      notice(host, errorText(error), true); button(host, 'Thử lại', 'refresh', () => load(host, fetcher, render));
    }
  }
  function badge(host, value, label) {
    const kind = ['ACTIVE', 'ONLINE', 'GRANTED', 'READY', 'RESOLVED', 'READ'].includes(value) ? 'success'
      : ['LOCKED', 'ERROR', 'REVOKED', 'CRITICAL', 'FAILED'].includes(value) ? 'danger'
        : ['PENDING_ACTIVATION', 'PENDING_SYNC', 'IN_PROGRESS', 'PENDING'].includes(value) ? 'warning' : 'info';
    const element = $('<span>').addClass(`status-badge badge-${kind}`).css({ borderRadius: 4, margin: '2px 4px 2px 0' }).text(label || LABELS[value] || text(value)).appendTo(host);
    const roleColors = { QTV: ['#f1eafa', '#6941a5'], RECEPTIONIST: ['#e8f0fc', '#245994'], PT: ['#fff0dc', '#905916'], MEMBER: ['#e5f4eb', '#216347'] };
    if (roleColors[value]) element.css({ background: roleColors[value][0], color: roleColors[value][1] });
  }
  function detail(host, label, value) {
    const row = $('<div>').css({ marginBottom: 16, overflowWrap: 'anywhere' }).appendTo(host);
    $('<div>').css({ color: '#66717c', fontSize: 12, marginBottom: 5 }).text(label).appendTo(row);
    $('<div>').css({ whiteSpace: 'pre-wrap' }).text(text(value)).appendTo(row);
  }
  function actionColumn(render, width = 124) {
    return { caption: 'Thao tác', width, allowSorting: false, cellTemplate: (cell, item) => render($('<div>').css({ display: 'flex', gap: 4 }).appendTo(cell), item.data) };
  }
  function grid(host, source, columns, extra = {}) {
    const surface = $('<div>').addClass('card-panel').css({ padding: 0, minWidth: 0 }).appendTo(host);
    return $('<div>').appendTo(surface).dxDataGrid({ dataSource: source, keyExpr: 'id', columns, showBorders: true, showColumnLines: false,
      rowAlternationEnabled: true, hoverStateEnabled: true, wordWrapEnabled: true, columnAutoWidth: true, columnMinWidth: 95, allowColumnResizing: true,
      paging: { pageSize: 20 }, pager: { visible: true, showPageSizeSelector: true, allowedPageSizes: [10, 20, 50], showInfo: true, showNavigationButtons: true },
      loadPanel: { enabled: true, text: 'Đang tải dữ liệu...' }, noDataText: 'Không có dữ liệu phù hợp', errorRowEnabled: true, ...extra
    }).dxDataGrid('instance');
  }
  function remoteGrid(host, path, ctx, filters, columns, extra = {}) {
    const store = new DevExpress.data.CustomStore({ key: 'id', load: async opts => {
      const params = filters();
      if (params.date_from && params.date_to && params.date_from > params.date_to) throw new Error('Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.');
      const size = opts.take || 20;
      const data = await api(query(path, { ...params, event_type: params.event_code, page: Math.floor((opts.skip || 0) / size) + 1, limit: size }), {}, ctx);
      if (Array.isArray(data)) {
        const filtered = data.filter(row => (!params.status || row.status === params.status) && (!params.severity || row.severity === params.severity)
          && (!params.branch_id || row.branch_id === params.branch_id) && (!params.event_code || row.event_code === params.event_code)
          && (!params.q || Object.values(row).some(value => typeof value === 'string' && value.toLocaleLowerCase('vi').includes(params.q.toLocaleLowerCase('vi')))));
        return { data: filtered.slice(opts.skip || 0, (opts.skip || 0) + size), totalCount: filtered.length };
      }
      return { data: rows(data), totalCount: Number(data.total) };
    } });
    return grid(host, store, columns, { remoteOperations: { paging: true }, sorting: { mode: 'none' }, ...extra });
  }
  function field(name, label, type = 'dxTextBox', required = false, editorOptions = {}) {
    return { dataField: name, label: { text: label }, editorType: type, editorOptions, validationRules: required ? [{ type: 'required', message: `Vui lòng nhập hoặc chọn ${label.toLowerCase()}.` }] : [] };
  }
  function select(data, valueExpr = 'code', displayExpr = 'name') { return { dataSource: data, valueExpr, displayExpr, searchEnabled: true, showClearButton: true, placeholder: 'Chọn...' }; }
  function popup(ctx, title, drawer = false) {
    const node = $('<div>').appendTo(ctx.root);
    const body = $('<div>').css({ padding: 4, overflowWrap: 'anywhere' });
    const instance = node.dxPopup({ title, width: () => Math.min(drawer ? 650 : 680, window.innerWidth - 24), height: drawer ? '100%' : 'auto', maxHeight: '92vh',
      showCloseButton: true, hideOnOutsideClick: drawer, dragEnabled: !drawer,
      position: drawer ? { my: 'right center', at: 'right center', of: window } : undefined,
      contentTemplate: content => { $('<div>').append(body).appendTo(content).dxScrollView({ height: '100%' }); },
      onHidden: () => { instance.dispose(); node.remove(); }
    }).dxPopup('instance'); instance.show();
    return { instance, body, close: () => instance.hide() };
  }
  function editForm(dialog, data, items, save, message = 'Đã lưu thay đổi', saveLabel = 'Lưu thay đổi') {
    const form = $('<div>').appendTo(dialog.body).dxForm({ formData: data, items, labelLocation: 'top', colCount: 1, showColonAfterLabel: false, showValidationSummary: true }).dxForm('instance');
    const errorArea = $('<div>').appendTo(dialog.body);
    const actions = $('<div>').addClass('view-actions').css({ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }).appendTo(dialog.body);
    button(actions, 'Hủy', 'close', dialog.close);
    const saveButton = button(actions, saveLabel, 'save', async () => {
      if (!form.validate().isValid) return;
      errorArea.empty();
      try { if (await save(form.option('formData'), form) === false) return; DevExpress.ui.notify(message, 'success', 2500); dialog.close(); }
      catch (error) { notice(errorArea, errorText(error), true); }
    }, true);
    return { form, errorArea, saveButton };
  }
  function filtersBar(host, data, items, changed) {
    const wrapper = $('<div>').addClass('filter-bar').css({ display: 'block', width: '100%' }).appendTo(host);
    return $('<div>').css({ width: '100%' }).appendTo(wrapper).dxForm({ formData: data, labelLocation: 'top', colCountByScreen: { xs: 1, sm: 2, md: 3, lg: 4 }, items, onFieldDataChanged: changed }).dxForm('instance');
  }
  function dateFields() { return ['date_from', 'date_to'].map((key, i) => field(key, i ? 'Đến ngày' : 'Từ ngày', 'dxDateBox', false, { type: 'date', displayFormat: 'dd/MM/yyyy', useMaskBehavior: true, showClearButton: true, placeholder: i ? '...đến nay' : 'Từ trước...' })); }
  function withDates(data) {
    if (data.date_from && data.date_to && dateKey(data.date_from) > dateKey(data.date_to)) throw new Error('Từ ngày phải nhỏ hơn hoặc bằng Đến ngày.');
    const res = { ...data };
    if (res.date_from) res.date_from = dateKey(res.date_from); else delete res.date_from;
    if (res.date_to) res.date_to = dateKey(res.date_to); else delete res.date_to;
    return res;
  }
  async function page(containerId, title, adminOnly, context, render) {
    const root = $('<section>').addClass('system-view').appendTo($(document.getElementById(containerId)).empty());
    const header = $('<div>').addClass('view-header').appendTo(root);
    $('<div>').addClass('view-header-title').append($('<h2>').text(title)).appendTo(header);
    const actions = $('<div>').addClass('view-actions').appendTo(header);
    const body = $('<div>').appendTo(root);
    const ctx = { root, body, actions, context: context || {}, branch: window.apiClient?.getCurrentBranchId() || '' }; current = ctx;
    await load(body, async () => {
      ctx.user = await api('/auth/me');
      const roles = codes(ctx.user.roles); const stored = apiClient.getUser();
      const chosen = ctx.user.active_role || stored?.active_role || stored?.role;
      ctx.role = roles.includes(chosen) ? chosen : roles.length === 1 ? roles[0] : null;
      ctx.admin = ctx.role === 'QTV';
      if (!['QTV', 'RECEPTIONIST'].includes(ctx.role) || (adminOnly && !ctx.admin)) { ctx.denied = true; const error = new Error('Không có quyền truy cập.'); error.status = 403; throw error; }
      return ctx;
    }, render);
    if (ctx.denied && title === 'Tài khoản & phân quyền' && window.ParadiseApp?.navigateTo) {
      DevExpress.ui.notify('Bạn không có quyền quản lý tài khoản.', 'error', 3500);
      return ParadiseApp.navigateTo('dashboard');
    }
    button(actions, 'Làm mới', 'refresh', () => ctx.refresh?.());
  }
  async function tabs(ctx, items, initial = 0) {
    const tab = $('<div>').css({ marginBottom: 16 }).appendTo(ctx.body);
    const viewport = $('<div>').appendTo(ctx.body);
    const show = async item => {
      const area = $('<div>').appendTo(viewport.empty()); ctx.refresh = () => show(item);
      try { await item.render(area); } catch (error) { if (alive(area)) notice(area, errorText(error), true); }
    };
    tab.dxTabs({ dataSource: items, selectedIndex: initial, showNavButtons: true, scrollByContent: true, onItemClick: e => show(e.itemData) });
    await show(items[initial]);
  }

  function renderNotifications(containerId, context = {}) {
    return page(containerId, 'Thông báo', false, context, ctx => tabs(ctx, ctx.admin ? [
      { text: 'Cấu hình tự động', icon: 'preferences', render: area => notificationRules(area, ctx) },
      { text: 'Mẫu thông báo', icon: 'message', render: area => notificationTemplates(area, ctx) },
      { text: 'Lịch sử gửi', icon: 'clock', render: area => notificationHistory(area, ctx) }
    ] : [{ text: 'Lịch sử thông báo chi nhánh', icon: 'clock', render: area => notificationHistory(area, ctx) }], ctx.admin && context.action === 'create' ? 1 : 0));
  }
  const eventCatalog = ctx => all('/notifications/events', ctx);
  function notificationRules(area, ctx) {
    return load(area, async () => {
      const [rules, events, branches] = await Promise.all([all('/notifications/rules', ctx), eventCatalog(ctx), all('/branches', ctx)]);
      return [...rules.map(rule => ({ ...rule, branch_name: branches.find(branch => branch.id === rule.branch_id)?.branch_name })),
        ...events.filter(event => !rules.some(rule => rule.event_code === event.event_code)).map(event => ({ ...event, unconfigured: true }))];
    }, records => grid(area, records.map(record => ({ ...record, row_key: record.id || record.event_code })), [
      { dataField: 'event_code', caption: 'Sự kiện', minWidth: 210, cellTemplate: (cell, row) => {
        $('<strong>').text(row.data.event_name || row.value).appendTo(cell);
        $('<div>').css({ color: '#697480', fontSize: 12 }).text(row.value).appendTo(cell);
      } },
      { caption: 'Người nhận', minWidth: 170, cellTemplate: (cell, row) => codes(row.data.recipient_roles).forEach(role => badge(cell, role, ROLES[role])) },
      { dataField: 'template_name', caption: 'Mẫu áp dụng', minWidth: 200 }, { dataField: 'channel', caption: 'Kênh gửi', width: 100 },
      ...(ctx.branch === 'ALL' ? [{ dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 160 }] : []),
      { dataField: 'is_active', caption: 'Tự động gửi', width: 120, cellTemplate: (cell, row) => {
        if (row.data.unconfigured) { badge(cell, 'PENDING', 'Chưa cấu hình'); return; }
        let saving = false;
        $('<div>').appendTo(cell).dxSwitch({ value: !!row.value, switchedOnText: 'Bật', switchedOffText: 'Tắt', onValueChanged: async e => {
          if (saving) return; saving = true; e.component.option('disabled', true);
          try { await api('/notifications/rules', { method: 'PUT', body: ruleBody(row.data, e.value) }, ctx); row.data.is_active = e.value; }
          catch (error) { e.component.option('value', e.previousValue); DevExpress.ui.notify(errorText(error), 'error', 5000); }
          finally { if (alive($(e.element))) e.component.option('disabled', false); saving = false; }
        } });
      } },
      actionColumn((cell, record) => iconButton(cell, 'Sửa cấu hình', 'edit', () => ruleEditor(ctx, record, () => notificationRules(area, ctx))), 80)
    ], { keyExpr: 'row_key' }));
  }
  function ruleBody(record, enabled) {
    return { event_type: record.event_code, branch_id: record.branch_id, template_id: record.template_id, recipient_roles: record.recipient_roles,
      modes: (record.recipient_modes || []).map(mode => mode === 'BRANCH_BROADCAST' ? 'BRANCH' : mode), is_enabled: enabled };
  }
  function checkboxGroup(name, label, choices, selected) {
    return { dataField: name, label: { text: label }, template: (_, element) => {
      choices.forEach(choice => $('<div>').css({ marginBottom: 8 }).appendTo(element).dxCheckBox({ text: choice.name, value: selected.includes(choice.code), onValueChanged: e => {
        const index = selected.indexOf(choice.code);
        if (e.value && index < 0) selected.push(choice.code); if (!e.value && index >= 0) selected.splice(index, 1);
      } }));
    } };
  }
  async function ruleEditor(ctx, record, refresh) {
    if (record.unconfigured && (!ctx.branch || ctx.branch === 'ALL')) throw new Error('Vui lòng chọn chi nhánh làm việc trước khi cấu hình sự kiện.');
    const dialog = popup(ctx, 'Cấu hình thông báo tự động', true);
    await load(dialog.body, () => all('/notifications/templates', ctx, { event_type: record.event_code }), templates => {
      const data = { ...record, recipient_roles: [...codes(record.recipient_roles)], recipient_modes: [...(record.recipient_modes || [])] };
      editForm(dialog, data, [
        field('event_code', 'Sự kiện', 'dxTextBox', false, { readOnly: true }), field('event_name', 'Tên sự kiện', 'dxTextBox', false, { readOnly: true }),
        checkboxGroup('recipient_roles', 'Vai trò nhận *', options(Object.keys(ROLES)), data.recipient_roles),
        checkboxGroup('recipient_modes', 'Hình thức gửi *', [{ code: 'DIRECT', name: 'Người liên quan trực tiếp' }, { code: 'BRANCH_BROADCAST', name: 'Toàn bộ người dùng tại chi nhánh' }], data.recipient_modes),
        field('channel', 'Kênh thông báo', 'dxTextBox', false, { readOnly: true }),
        field('template_id', 'Mẫu áp dụng', 'dxSelectBox', true, select(templates.filter(t => t.is_active && t.event_code === record.event_code), 'id', 'template_name')),
        field('is_active', 'Tự động gửi', 'dxSwitch')
      ], async values => {
        if (!values.recipient_roles.length || !values.recipient_modes.length) throw new Error('Chọn ít nhất một vai trò nhận và một hình thức gửi.');
        await api('/notifications/rules', { method: 'PUT', body: ruleBody(values, !!values.is_active) }, ctx);
        await refresh();
      });
    });
  }
  function notificationTemplates(area, ctx) {
    return load(area, () => eventCatalog(ctx), events => {
      let table;
      const form = filtersBar(area, { q: '', event_code: null }, [field('q', 'Tìm mẫu', 'dxTextBox', false, { placeholder: 'Tên hoặc mã mẫu' }), field('event_code', 'Sự kiện', 'dxSelectBox', false, select(events, 'event_code', 'event_name'))], () => { table?.pageIndex(0); table?.refresh(); });
      const actions = $('<div>').addClass('view-actions').css({ margin: '12px 0' }).appendTo(area);
      button(actions, 'Thêm mẫu thông báo', 'add', () => templateEditor(ctx, null, events, () => table.refresh()), true);
      table = remoteGrid(area, '/notifications/templates', ctx, () => form.option('formData'), [
        { dataField: 'template_code', caption: 'Mã mẫu', width: 150 }, { dataField: 'template_name', caption: 'Tên mẫu', minWidth: 190 },
        { dataField: 'event_code', caption: 'Sự kiện', minWidth: 180 }, { dataField: 'title_template', caption: 'Tiêu đề mẫu', minWidth: 220 },
        { dataField: 'is_active', caption: 'Trạng thái', width: 145, cellTemplate: (cell, row) => badge(cell, row.value ? 'ACTIVE' : 'INACTIVE', row.value ? 'Đang sử dụng' : 'Ngừng sử dụng') },
        actionColumn((cell, record) => {
          iconButton(cell, 'Xem chi tiết mẫu', 'eyeopen', () => templateDetail(ctx, record, events, () => table.refresh()));
          iconButton(cell, 'Sửa mẫu', 'edit', () => templateEditor(ctx, record, events, () => table.refresh()));
          iconButton(cell, record.is_active ? 'Ngừng sử dụng' : 'Sử dụng lại', record.is_active ? 'remove' : 'check', async () => {
            if (!await DevExpress.ui.dialog.confirm('Xác nhận thay đổi trạng thái mẫu thông báo?', 'Trạng thái mẫu')) return;
            await api(`/notifications/templates/${encoded(record.id)}`, { method: 'PUT', body: { is_active: !record.is_active } }, ctx); await table.refresh();
          });
        })
      ]);
      if (ctx.context.action === 'create') { ctx.context = { ...ctx.context, action: null }; return templateEditor(ctx, null, events, () => table.refresh()); }
    });
  }
  const variablesFor = (events, code) => events.find(event => event.event_code === code)?.variables || [];
  async function templateEditor(ctx, record, events, refresh) {
    const dialog = popup(ctx, record ? 'Sửa mẫu thông báo' : 'Thêm mẫu thông báo');
    await load(dialog.body, () => record ? api(`/notifications/templates/${encoded(record.id)}`, {}, ctx) : Promise.resolve({}), saved => {
      const data = { template_name: '', event_code: null, title_template: '', body_template: '', ...saved };
      let form; let variableHost;
      let lastFocusedField = 'body_template';
      let titleSelection = [0, 0];
      let bodySelection = [0, 0];

      function insertVariable(variable) {
        const targetField = lastFocusedField === 'title_template' ? 'title_template' : 'body_template';
        const editor = form.getEditor(targetField);
        if (!editor) return;
        const value = editor.option('value') || '';
        const token = `{{${variable.key}}}`;
        const selection = targetField === 'title_template' ? titleSelection : bodySelection;
        const [start, end] = selection;
        const next = value.slice(0, start) + token + value.slice(end);
        const maxLen = targetField === 'title_template' ? 150 : 1000;
        if (next.length > maxLen) {
          DevExpress.ui.notify(`Vượt quá độ dài tối đa (${maxLen} ký tự).`, 'warning', 2500);
          return;
        }
        editor.option('value', next);
        const input = $(editor.element()).find(targetField === 'title_template' ? 'input' : 'textarea')[0];
        if (input) {
          input.focus();
          input.setSelectionRange(start + token.length, start + token.length);
        }
        if (targetField === 'title_template') {
          titleSelection = [start + token.length, start + token.length];
        } else {
          bodySelection = [start + token.length, start + token.length];
        }
      }

      function renderChips(code) {
        if (!variableHost) return;
        variableHost.empty();
        if (!code) return;

        const vars = variablesFor(events, code);
        if (!vars.length) return;

        const chipsWrap = $('<div>').css({ display: 'flex', flexWrap: 'wrap', gap: '6px', width: '100%' }).appendTo(variableHost);

        vars.forEach(variable => {
          $('<div>').appendTo(chipsWrap).dxButton({
            text: `${variable.label} {{${variable.key}}}`,
            icon: 'add',
            stylingMode: 'outlined',
            type: 'default',
            elementAttr: { style: 'font-size: 12px; border-radius: 4px; padding: 2px 6px; font-weight: 500;' },
            hint: `Chèn {{${variable.key}}}`,
            onClick: () => insertVariable(variable)
          });
        });
      }

      function showVariables(targetCode) {
        const code = targetCode !== undefined 
          ? targetCode 
          : (form?.getEditor('event_code')?.option('value') || form?.option('formData')?.event_code);

        if (!code) {
          // Chưa chọn sự kiện áp dụng -> Ẩn khối biến nội dung (chọn sự kiện trước mới hiển thị biến)
          if (form) form.itemOption('variables', 'visible', false);
          if (variableHost) variableHost.empty();
          return;
        }

        // Đã chọn sự kiện áp dụng -> Hiển thị khối biến và nạp các biến thuộc sự kiện đó
        if (form && !form.itemOption('variables', 'visible')) {
          form.itemOption('variables', 'visible', true);
        }
        renderChips(code);
      }

      const editor = editForm(dialog, data, [
        field('template_name', 'Tên mẫu thông báo', 'dxTextBox', true, { maxLength: 100 }),
        field('event_code', 'Sự kiện áp dụng', 'dxSelectBox', true, {
          ...select(events, 'event_code', 'event_name'),
          onValueChanged: e => {
            if (form) {
              form.option('formData').event_code = e.value;
            }
            showVariables(e.value);
          }
        }),
        {
          name: 'variables',
          label: { text: 'Biến nội dung' },
          visible: !!data.event_code,
          template: (_, element) => {
            variableHost = $('<div>').css({ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }).appendTo(element);
            const curCode = form ? (form.getEditor('event_code')?.option('value') || form.option('formData')?.event_code) : data.event_code;
            if (curCode) renderChips(curCode);
          }
        },
        field('title_template', 'Tiêu đề thông báo', 'dxTextBox', true, {
          maxLength: 150,
          onFocusIn: () => { lastFocusedField = 'title_template'; },
          onInitialized: e => {
            $(e.element).on('focusout keyup mouseup input focus', 'input', function () {
              lastFocusedField = 'title_template';
              titleSelection = [this.selectionStart, this.selectionEnd];
            });
          }
        }),
        field('body_template', 'Nội dung thông báo', 'dxTextArea', true, {
          maxLength: 1000,
          height: 160,
          valueChangeEvent: 'input',
          onFocusIn: () => { lastFocusedField = 'body_template'; },
          onInitialized: e => {
            $(e.element).on('focusout keyup mouseup input focus', 'textarea', function () {
              lastFocusedField = 'body_template';
              bodySelection = [this.selectionStart, this.selectionEnd];
            });
          }
        })
      ], async values => {
        const allowed = new Set(variablesFor(events, values.event_code).map(v => v.key));
        for (const name of ['template_name', 'title_template', 'body_template']) if (!String(values[name] || '').trim()) throw new Error('Vui lòng nhập đầy đủ tên mẫu, tiêu đề và nội dung thông báo.');
        for (const content of [values.title_template, values.body_template]) {
          const tokens = [...content.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)];
          if (tokens.some(token => !allowed.has(VARIABLE_ALIASES[token[1]] || token[1])) || /\{\{|\}\}/.test(content.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, ''))) throw new Error('Nội dung chứa biến không thuộc sự kiện đã chọn hoặc sai cú pháp.');
        }
        if (!record && (!ctx.branch || ctx.branch === 'ALL')) throw new Error('Vui lòng chọn chi nhánh làm việc trước khi tạo mẫu thông báo.');
        await api(record ? `/notifications/templates/${encoded(record.id)}` : '/notifications/templates', { method: record ? 'PUT' : 'POST', body: {
          template_name: values.template_name.trim(), event_type: values.event_code, title_template: values.title_template, body_template: values.body_template
        } }, ctx); await refresh();
      }, 'Đã lưu mẫu thông báo'); form = editor.form; showVariables();
    });
  }
  function taggedText(host, content, variables) {
    const labels = new Map(variables.map(variable => [variable.key, variable.label])); let position = 0;
    for (const match of (content || '').matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)) {
      host.append(document.createTextNode(content.slice(position, match.index))); badge(host, 'VARIABLE', labels.get(VARIABLE_ALIASES[match[1]] || match[1]) || match[1]); position = match.index + match[0].length;
    }
    host.append(document.createTextNode((content || '').slice(position)));
  }
  async function templateDetail(ctx, record, events, refresh) {
    const dialog = popup(ctx, 'Chi tiết mẫu thông báo', true);
    await load(dialog.body, () => api(`/notifications/templates/${encoded(record.id)}`, {}, ctx), data => {
      [['Mã mẫu', data.template_code], ['Tên mẫu', data.template_name], ['Sự kiện áp dụng', data.event_code], ['Kênh thông báo', data.channel || 'IN_APP'], ['Ngày tạo / Người tạo', `${date(data.created_at)} · ${text(data.creator_name)}`], ['Tiêu đề thông báo', data.title_template]].forEach(([label, value]) => detail(dialog.body, label, value));
      badge(dialog.body, data.is_active ? 'ACTIVE' : 'INACTIVE', data.is_active ? 'Đang sử dụng' : 'Ngừng sử dụng');
      $('<p>').text('Nội dung thông báo').appendTo(dialog.body);
      taggedText($('<div>').css({ whiteSpace: 'pre-wrap', marginBottom: 20 }).appendTo(dialog.body), data.body_template, variablesFor(events, data.event_code));
      button(dialog.body, 'Sửa mẫu', 'edit', () => { dialog.close(); return templateEditor(ctx, record, events, refresh); });
    });
  }
  function notificationHistory(area, ctx) {
    let table;
    const filters = { date_from: new Date(), date_to: new Date(), event_code: null, is_read: null, q: '' };
    const form = filtersBar(area, filters, [...dateFields(), field('event_code', 'Sự kiện', 'dxSelectBox', false, { ...select([], 'event_code', 'event_name'), placeholder: 'Tất cả' }),
      field('is_read', 'Trạng thái đọc', 'dxSelectBox', false, { ...select([{ code: 'true', name: 'Đã đọc' }, { code: 'false', name: 'Chưa đọc' }]), placeholder: 'Tất cả' }),
      field('q', 'Tìm nhật ký', 'dxTextBox', false, { placeholder: 'Tên, số điện thoại hoặc mã tham chiếu' })], () => { table?.pageIndex(0); table?.refresh(); });
    eventCatalog(ctx).then(events => { if (alive(area)) form.getEditor('event_code').option('dataSource', events); }).catch(error => { if (alive(area)) notice($('<div>').appendTo(area), `Không tải được danh mục sự kiện: ${errorText(error)}`, true); });
    table = remoteGrid(area, '/notifications/history', ctx, () => withDates(form.option('formData')), [
      { dataField: 'created_at', caption: 'Thời gian', width: 150, cellTemplate: (cell, row) => cell.text(date(row.value)) }, { dataField: 'event_code', caption: 'Sự kiện', minWidth: 165 },
      { dataField: 'recipient_name', caption: 'Người nhận', minWidth: 190, cellTemplate: (cell, row) => {
        $('<strong>').text(text(row.value)).appendTo(cell); $('<div>').css({ fontSize: 12, color: '#697480' }).text(`${text(row.data.recipient_code)} · ${text(row.data.recipient_phone)}`).appendTo(cell);
      } },
      { dataField: 'title', caption: 'Tiêu đề thông báo', minWidth: 230 },
      { dataField: 'reference_code', caption: 'Mã tham chiếu', width: 150, cellTemplate: (cell, row) => {
        if (!row.value) { cell.text('-'); return; } button(cell, row.value, 'link', () => sourceDetail(ctx, row.data)).option('stylingMode', 'text');
      } },
      { dataField: 'is_read', caption: 'Trạng thái đọc', width: 130, cellTemplate: (cell, row) => badge(cell, row.value ? 'READ' : 'UNREAD', row.value ? 'Đã đọc' : 'Chưa đọc') },
      actionColumn((cell, row) => iconButton(cell, 'Xem toàn văn', 'eyeopen', () => {
        const dialog = popup(ctx, 'Chi tiết thông báo', true);
        [['Người nhận', row.recipient_name], ['Thời gian', date(row.created_at)], ['Sự kiện', row.event_code], ['Tiêu đề', row.title], ['Nội dung', row.body || row.content]].forEach(([label, value]) => detail(dialog.body, label, value));
        if (row.reference_id) button(dialog.body, 'Mở chứng từ nguồn', 'link', () => sourceDetail(ctx, row));
      }), 76)
    ]);
  }
  async function sourceDetail(ctx, row) {
    const kind = String(row.reference_type || row.reference_table || '').toLowerCase();
    const routes = { payment: 'payments', payments: 'payments', registration: 'registrations', registrations: 'registrations', booking: 'pt-bookings', pt_bookings: 'pt-bookings', member: 'members', member_profiles: 'members' };
    const route = routes[kind];
    if (!route || !row.reference_id) throw new Error('Thông báo chưa có liên kết chứng từ nguồn hợp lệ.');
    const dialog = popup(ctx, 'Chứng từ nguồn', true);
    await load(dialog.body, () => api(`/${route}/${encoded(row.reference_id)}`, {}, ctx), data => {
      [['Mã chứng từ', data.registration_code || data.booking_code || data.payment_code || data.member_code || row.reference_code], ['Hội viên', data.member_name || data.member?.full_name || data.full_name],
        ['Chi nhánh', data.branch_name || data.home_branch_name], ['Gói tập', data.package_name_snapshot || data.package_name], ['Huấn luyện viên', data.pt_name || data.assigned_pt?.full_name],
        ['Trạng thái', LABELS[data.status] || data.status], ['Ngày tập', data.booking_date], ['Giờ bắt đầu', data.start_time], ['Giờ kết thúc', data.end_time],
        ['Số tiền', data.amount == null ? null : Number(data.amount).toLocaleString('vi-VN') + ' VND'], ['Nội dung', data.note || data.workout_notes]]
        .filter(([, value]) => value != null).forEach(([label, value]) => detail(dialog.body, label, value));
    });
  }

  function renderEquipment(containerId, context = {}) {
    return page(containerId, 'Hệ thống & thiết bị', true, context, ctx => tabs(ctx, [
      { text: 'Thiết bị', icon: 'preferences', render: area => devicesPage(area, ctx) },
      { text: 'Sự cố', icon: 'warning', render: area => incidentsPage(area, ctx) },
      { text: 'Consent & nhận diện', icon: 'user', render: area => consentPage(area, ctx) }
    ], context.member_id ? 2 : 0));
  }
  function devicesPage(area, ctx) {
    let table;
    const form = filtersBar(area, { status: null, branch_id: ctx.branch === 'ALL' ? null : ctx.branch, q: '' }, [
      field('branch_id', 'Chi nhánh', 'dxSelectBox', false, { ...select([], 'id', 'branch_name'), disabled: !ctx.admin || (!!ctx.branch && ctx.branch !== 'ALL') }),
      field('status', 'Trạng thái', 'dxSelectBox', false, select(options(['ONLINE', 'OFFLINE', 'ERROR', 'PENDING_SYNC', 'INACTIVE']))),
      field('q', 'Tìm thiết bị', 'dxTextBox', false, { placeholder: 'Mã, tên hoặc điểm lắp' })
    ], () => { table?.pageIndex(0); table?.refresh(); });
    all('/branches', ctx).then(branches => { if (alive(area)) form.getEditor('branch_id').option('dataSource', branches); }).catch(error => { if (alive(area)) notice($('<div>').appendTo(area), errorText(error), true); });
    const actions = $('<div>').addClass('view-actions').css({ display: 'flex', gap: 8, margin: '12px 0' }).appendTo(area);
    if (canManageDevices(ctx)) button(actions, 'Thêm thiết bị', 'add', () => deviceEditor(ctx, null, () => table.refresh()), true);
    if (ctx.role === 'RECEPTIONIST' || canManageDevices(ctx)) button(actions, 'Ghi nhận sự cố', 'warning', () => incidentEditor(ctx, null, null, () => table.refresh()));
    table = remoteGrid(area, '/devices', ctx, () => form.option('formData'), [
      { dataField: 'device_code', caption: 'Mã thiết bị', width: 140 },
      { dataField: 'device_name', caption: 'Thiết bị / Điểm lắp', minWidth: 210, cellTemplate: (cell, row) => {
        $('<strong>').text(text(row.value)).appendTo(cell); $('<div>').css({ fontSize: 12, color: '#697480' }).text(text(row.data.location_description)).appendTo(cell);
      } },
      { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 160 }, { dataField: 'device_type', caption: 'Loại thiết bị', width: 140 }, { dataField: 'direction', caption: 'Chiều', width: 85 },
      { dataField: 'status', caption: 'Trạng thái', width: 145, cellTemplate: (cell, row) => badge(cell, row.data.enabled === false ? 'INACTIVE' : row.value) },
      { dataField: 'last_heartbeat', caption: 'Heartbeat gần nhất', width: 160, cellTemplate: (cell, row) => cell.text(date(row.value)) },
      actionColumn((cell, record) => {
        iconButton(cell, 'Chi tiết thiết bị', 'eyeopen', () => deviceDetail(ctx, record, () => table.refresh()));
        if (canManageDevices(ctx)) iconButton(cell, 'Sửa thiết bị', 'edit', () => deviceEditor(ctx, record, () => table.refresh()));
        if (ctx.role === 'RECEPTIONIST' || canManageDevices(ctx)) iconButton(cell, 'Báo sự cố', 'warning', () => incidentEditor(ctx, null, record, () => table.refresh()));
      })
    ]);
    if (ctx.context.action === 'create') { ctx.context = { ...ctx.context, action: null }; return deviceEditor(ctx, null, () => table.refresh()); }
  }
  async function deviceEditor(ctx, record, refresh) {
    if (!canManageDevices(ctx)) throw new Error('Bạn không có quyền quản lý thiết bị.');
    const dialog = popup(ctx, record ? 'Sửa thiết bị' : 'Thêm thiết bị');
    await load(dialog.body, async () => {
      const [branches, catalog, saved] = await Promise.all([all('/branches', ctx), api('/devices/catalog', {}, ctx), record ? api(`/devices/${encoded(record.id)}`, {}, ctx) : Promise.resolve({})]);
      return { branches, catalog, saved };
    }, ({ branches, catalog, saved }) => {
      const data = { device_code: '', device_name: '', device_type: null, branch_id: ctx.branch && ctx.branch !== 'ALL' ? ctx.branch : null,
        location_description: '', direction: null, ...saved,
        status: saved.configured_status || saved.status || null,
        connection_status: LABELS[saved.connection_status || saved.status] || saved.connection_status || saved.status,
        updated_by_name: saved.updated_by_name || '--',
        credential: '' };
      let form;
      const updateCapability = event => {
        if (!form) return;
        const type = rows(catalog.types).find(item => item.code === (event?.value ?? form.option('formData').device_type));
        const directions = type?.directions || [];
        form.beginUpdate();
        form.itemOption('direction', 'editorOptions', { dataSource: directions });
        if (!directions.includes(form.option('formData').direction)) form.updateData('direction', null);
        for (const key of ['ip_address', 'endpoint', 'credential']) form.itemOption(key, 'visible', (type?.connection_fields || []).includes(key));
        form.endUpdate();
      };
      const editor = editForm(dialog, data, [
        field('device_code', 'Mã thiết bị', 'dxTextBox', true, { readOnly: !!record, maxLength: 50 }), field('device_name', 'Tên thiết bị', 'dxTextBox', true, { maxLength: 150 }),
        field('device_type', 'Loại thiết bị', 'dxSelectBox', true, { ...select(rows(catalog.types)), onValueChanged: updateCapability }),
        field('branch_id', 'Chi nhánh', 'dxSelectBox', true, select(branches, 'id', 'branch_name')), field('location_description', 'Điểm lắp', 'dxTextBox', true, { maxLength: 250 }),
        field('direction', 'Mục đích ra/vào', 'dxSelectBox', true, { dataSource: [] }),
        field('status', 'Trạng thái cấu hình', 'dxSelectBox', true, select(options(catalog.statuses || []))),
        { ...field('connection_status', 'Kết nối hiện tại', 'dxTextBox', false, { readOnly: true }), visible: !!record },
        { ...field('ip_address', 'Địa chỉ IP'), visible: false }, { ...field('endpoint', 'Địa chỉ kết nối'), visible: false },
        { ...field('credential', 'Thông tin xác thực', 'dxTextBox', false, { mode: 'password', inputAttr: { autocomplete: 'new-password' } }), visible: false },
        { ...field('last_heartbeat', 'Heartbeat gần nhất', 'dxDateBox', false, { readOnly: true, type: 'datetime', displayFormat: 'dd/MM/yyyy HH:mm' }), visible: !!saved.last_heartbeat },
        { ...field('last_test_result', 'Kết quả test gần nhất', 'dxTextBox', false, { readOnly: true }), visible: !!saved.last_test_result },
        { ...field('updated_at', 'Cập nhật lúc', 'dxDateBox', false, { readOnly: true, type: 'datetime', displayFormat: 'dd/MM/yyyy HH:mm' }), visible: !!record },
        { ...field('updated_by_name', 'Người cập nhật', 'dxTextBox', false, { readOnly: true }), visible: !!record }
      ], async values => {
        if (record && (values.branch_id !== saved.branch_id || values.location_description !== saved.location_description)) {
          if (!await DevExpress.ui.dialog.confirm('Xác nhận chuyển nơi lắp thiết bị? Lịch sử sự kiện cũ vẫn được giữ nguyên.', 'Chuyển nơi lắp')) return false;
        }
        const body = { device_name: values.device_name, device_type: values.device_type, branch_id: values.branch_id, location_description: values.location_description,
          direction: values.direction, status: values.status, enabled: values.status !== 'INACTIVE' };
        if (!record) body.device_code = values.device_code;
        const type = rows(catalog.types).find(item => item.code === values.device_type);
        for (const key of type?.connection_fields || []) body[key] = values[key] || null;
        await api(record ? `/devices/${encoded(record.id)}` : '/devices', { method: record ? 'PUT' : 'POST', body }, ctx); await refresh();
      }, 'Đã lưu thiết bị'); form = editor.form;
      form.option({ colCount: 2, colCountByScreen: { xs: 1, sm: 2, md: 2, lg: 2 } });
      updateCapability();
    });
  }
  async function deviceDetail(ctx, record, refresh) {
    const dialog = popup(ctx, 'Chi tiết thiết bị', true);
    await load(dialog.body, () => api(`/devices/${encoded(record.id)}`, {}, ctx), data => {
      [['Mã thiết bị', data.device_code], ['Tên thiết bị', data.device_name], ['Loại thiết bị', data.device_type], ['Chi nhánh', data.branch_name], ['Điểm lắp', data.location_description],
        ['Chiều', data.direction], ['Trạng thái cấu hình', LABELS[data.configured_status] || data.configured_status],
        ['Kết nối hiện tại', LABELS[data.connection_status || data.status] || data.connection_status || data.status],
        ['Heartbeat gần nhất', date(data.last_heartbeat)], ['Lỗi gần nhất', data.last_error]].forEach(([label, value]) => detail(dialog.body, label, label === 'Chi nhánh' ? data.branch_name || record.branch_name : value));
      if (data.status !== 'ONLINE') notice($('<div>').appendTo(dialog.body), 'Thiết bị chưa sẵn sàng hoạt động.');
      const resultHost = $('<div>').appendTo(dialog.body);
      const actions = $('<div>').addClass('view-actions').css({ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }).appendTo(dialog.body);
      if (canManageDevices(ctx)) {
        button(actions, 'Kiểm tra kết nối', 'refresh', async () => {
          notice(resultHost, 'Đang chờ thiết bị phản hồi...');
          try {
            const result = await api(`/devices/${encoded(data.id)}/test`, { method: 'POST' }, ctx);
            detail(resultHost.empty(), 'Kết quả kiểm tra', result.message || result.status); detail(resultHost, 'Thời điểm phản hồi', date(result.last_heartbeat || result.checked_at)); await refresh();
          } catch (error) { notice(resultHost, errorText(error), true); }
        });
        button(actions, 'Sửa thiết bị', 'edit', () => { dialog.close(); return deviceEditor(ctx, data, refresh); });
        if (data.enabled !== false && data.status !== 'INACTIVE') button(actions, 'Ngừng hoạt động', 'remove', async () => {
          if (!await DevExpress.ui.dialog.confirm('Ngừng hoạt động thiết bị này? Lịch sử ra/vào vẫn được giữ lại.', 'Ngừng thiết bị')) return;
          await api(`/devices/${encoded(data.id)}`, { method: 'PUT', body: { enabled: false, status: 'INACTIVE' } }, ctx); dialog.close(); await refresh();
        }).option('type', 'danger');
      }
      if (ctx.role === 'RECEPTIONIST' || canManageDevices(ctx)) button(actions, 'Báo sự cố', 'warning', () => incidentEditor(ctx, null, data, refresh));
      $('<h3>').css({ fontSize: 15 }).text('Sự kiện thiết bị').appendTo(dialog.body);
      remoteGrid(dialog.body, `/devices/${encoded(data.id)}/events`, ctx, () => ({}), [
        { dataField: 'occurred_at', caption: 'Phát sinh', cellTemplate: (cell, row) => cell.text(date(row.value)) }, { dataField: 'received_at', caption: 'Tiếp nhận', cellTemplate: (cell, row) => cell.text(date(row.value)) },
        { dataField: 'event_type', caption: 'Sự kiện' }, { dataField: 'source', caption: 'Nguồn', cellTemplate: (cell, row) => cell.text(row.value === 'ADMIN_AUDIT' ? 'Nhật ký quản trị' : text(row.value)) },
        { dataField: 'message', caption: 'Nội dung', minWidth: 160 }, { dataField: 'is_backfill', caption: 'Gửi bù', cellTemplate: (cell, row) => cell.text(row.value ? 'Gửi bù' : '-') }
      ]);
    });
  }
  function incidentsPage(area, ctx) {
    let table;
    const form = filtersBar(area, { status: null, severity: null, q: '' }, [field('status', 'Trạng thái xử lý', 'dxSelectBox', false, select(options(['OPEN', 'IN_PROGRESS', 'RESOLVED']))),
      field('severity', 'Mức độ', 'dxSelectBox', false, select(options(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']))), field('q', 'Tìm sự cố')], () => { table?.pageIndex(0); table?.refresh(); });
    const actions = $('<div>').addClass('view-actions').css({ margin: '12px 0' }).appendTo(area);
    if (ctx.role === 'RECEPTIONIST' || canManageDevices(ctx)) button(actions, 'Ghi nhận sự cố', 'add', () => incidentEditor(ctx, null, null, () => table.refresh()), true);
    table = remoteGrid(area, '/devices/incidents', ctx, () => form.option('formData'), [
      { dataField: 'device_code', caption: 'Thiết bị', width: 150 }, { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 150 }, { dataField: 'description', caption: 'Mô tả sự cố', minWidth: 250 },
      { dataField: 'severity', caption: 'Mức độ', width: 135, cellTemplate: (cell, row) => badge(cell, row.value) }, { dataField: 'status', caption: 'Xử lý', width: 135, cellTemplate: (cell, row) => badge(cell, row.value) },
      { dataField: 'created_at', caption: 'Ghi nhận lúc', width: 155, cellTemplate: (cell, row) => cell.text(date(row.value)) },
      ...(canManageDevices(ctx) ? [actionColumn((cell, row) => iconButton(cell, 'Cập nhật xử lý', 'edit', () => incidentEditor(ctx, row, null, () => table.refresh())), 80)] : [])
    ]);
  }
  async function incidentEditor(ctx, record, device, refresh) {
    if ((record && !canManageDevices(ctx)) || (ctx.admin && !canManageDevices(ctx))) throw new Error('Bạn không có quyền quản lý sự cố thiết bị.');
    const dialog = popup(ctx, record ? 'Xử lý sự cố thiết bị' : 'Ghi nhận sự cố thiết bị');
    await load(dialog.body, () => all('/devices', ctx), devices => editForm(dialog, { device_id: device?.id || null, description: '', severity: null, status: 'OPEN', ...record }, [
      field('device_id', 'Thiết bị', 'dxSelectBox', true, { ...select(devices, 'id', item => item ? `${item.device_code} · ${item.device_name || ''}` : ''), readOnly: !!record }),
      field('description', 'Mô tả sự cố', 'dxTextArea', true, { height: 130, maxLength: 2000 }), field('severity', 'Mức độ sự cố', 'dxSelectBox', true, select(options(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']))),
      field('status', 'Trạng thái xử lý', 'dxSelectBox', true, { ...select(options(['OPEN', 'IN_PROGRESS', 'RESOLVED'])), readOnly: !record || !ctx.admin })
    ], async values => {
      if (!values.description.trim()) throw new Error('Vui lòng nhập mô tả sự cố.');
      await api(record ? `/devices/incidents/${encoded(record.id)}` : '/devices/incidents', { method: record ? 'PUT' : 'POST', body: { device_id: values.device_id, description: values.description.trim(), severity: values.severity, status: record && ctx.admin ? values.status : 'OPEN' } }, ctx); await refresh();
    }, 'Đã ghi nhận sự cố'));
  }
  function memberStore(ctx) {
    return new DevExpress.data.CustomStore({ key: 'id', loadMode: 'processed', load: async opts => {
      const data = await api(query('/members', { q: opts.searchValue || '', page: Math.floor((opts.skip || 0) / (opts.take || 20)) + 1, limit: opts.take || 20 }), {}, ctx);
      return { data: rows(data), totalCount: Array.isArray(data) ? data.length : Number(data.total) };
    }, byKey: memberId => api(`/members/${encoded(memberId)}`, {}, ctx) });
  }
  function consentPage(area, ctx) {
    const filter = $('<div>').addClass('filter-bar').appendTo(area); const content = $('<div>').appendTo(area);
    $('<div>').appendTo(filter).dxSelectBox({ label: 'Hội viên', labelMode: 'static', placeholder: 'Tìm họ tên hoặc số điện thoại', searchEnabled: true, searchTimeout: 350,
      dataSource: new DevExpress.data.DataSource({ store: memberStore(ctx), paginate: true, pageSize: 20 }), valueExpr: 'id', value: ctx.context.member_id || null,
      displayExpr: member => member ? `${member.full_name} · ${member.member_code || ''} · ${member.phone || ''}` : '',
      onValueChanged: e => { if (e.value) consentMember(content, ctx, e.value); else notice(content, 'Chưa chọn hội viên.'); }
    });
    if (ctx.context.member_id) return consentMember(content, ctx, ctx.context.member_id);
    notice(content, 'Chưa chọn hội viên.');
  }
  async function consentMember(host, ctx, memberId) {
    await load(host, async () => {
      const [member, consents, catalog] = await Promise.all([api(`/members/${encoded(memberId)}`, {}, ctx), api(`/members/${encoded(memberId)}/consents`, {}, ctx), api('/consents/catalog', {}, ctx)]);
      return { member, consents, catalog };
    }, ({ member, consents, catalog }) => {
      $('<h3>').css({ fontSize: 16, marginTop: 16 }).text(`${member.full_name} · ${member.member_code || ''}`).appendTo(host);
      detail(host, 'Số điện thoại / Chi nhánh', `${text(member.phone)} · ${text(member.home_branch_name)}`);
      if (member.avatar_url) {
        try { const url = new URL(member.avatar_url, window.location.href); if (['https:', 'http:'].includes(url.protocol)) $('<img>').attr({ src: url.href, alt: 'Ảnh hồ sơ hội viên' }).css({ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }).appendTo(host); } catch (_) { /* Invalid profile URLs are not rendered. */ }
      }
      const actions = $('<div>').addClass('view-actions').css({ margin: '16px 0' }).appendTo(host);
      if (canEnroll(ctx)) button(actions, 'Đăng ký nhận diện', 'user', () => enrollment(ctx, member, catalog, () => consentMember(host, ctx, memberId)), true);
      const latest = latestConsents(consents);
      const revocableCatalog = { ...catalog, types: rows(catalog.types).filter(type => (type.is_recognition || ['PUBLIC_DISPLAY', 'BIRTHDAY_DISPLAY'].includes(type.code)) && latest.some(consent => consent.is_granted && consent.consent_type === type.code)) };
      grid(host, latest, [
        { dataField: 'consent_type', caption: 'Loại consent', calculateCellValue: row => rows(catalog.types).find(type => type.code === row.consent_type)?.name || row.consent_type },
        { dataField: 'is_granted', caption: 'Trạng thái', cellTemplate: (cell, row) => badge(cell, row.value ? 'GRANTED' : 'REVOKED') }, { dataField: 'policy_version', caption: 'Phiên bản' },
        { dataField: 'granted_at', caption: 'Đồng ý lúc', cellTemplate: (cell, row) => cell.text(row.data.is_granted ? date(row.value || row.data.created_at) : '-') }, { dataField: 'revoked_at', caption: 'Rút lúc', cellTemplate: (cell, row) => cell.text(date(row.value)) },
        { dataField: 'deletion_status', caption: 'Yêu cầu xóa' }, ...(canManageDevices(ctx) ? [actionColumn((cell, row) => { if (row.is_granted && revocableCatalog.types.some(type => type.code === row.consent_type)) iconButton(cell, 'Rút consent', 'remove', () => revokeConsent(ctx, member, row, revocableCatalog, () => consentMember(host, ctx, memberId))); }, 80)] : [])
      ]);
      if (consents.recognition_status) detail(host, 'Trạng thái nhận diện', consents.recognition_status);
      if (consents.deletion_status) detail(host, 'Trạng thái yêu cầu xóa', consents.deletion_status);
      if (rows(consents.audit).length) grid(host, rows(consents.audit), [{ dataField: 'created_at', caption: 'Thời gian', cellTemplate: (cell, row) => cell.text(date(row.value)) }, { dataField: 'actor_name', caption: 'Người thực hiện' }, { dataField: 'action_name', caption: 'Thao tác' }, { dataField: 'policy_version', caption: 'Phiên bản consent' }], { keyExpr: undefined });
    });
  }
  async function enrollment(ctx, member, catalog, refresh) {
    if (!canEnroll(ctx)) throw new Error('Bạn không có quyền đăng ký nhận diện.');
    const dialog = popup(ctx, 'Đăng ký nhận diện có consent', true); const recognition = rows(catalog.types).find(type => type.is_recognition);
    if (!recognition) { notice(dialog.body, 'Chưa có cấu hình consent nhận diện.', true); return; }
    await load(dialog.body, async () => {
      const [devices, catalog] = await Promise.all([all('/devices', ctx, { status: 'ONLINE' }), api('/devices/catalog', {}, ctx)]);
      return devices.filter(device => device.supports_capture || rows(catalog.types).some(type => type.code === device.device_type && type.supports_capture));
    }, devices => {
      detail(dialog.body, 'Hội viên', `${member.full_name} · ${member.member_code || ''} · ${member.phone || ''}`); detail(dialog.body, 'Mục đích sử dụng', recognition.purpose); detail(dialog.body, 'Phiên bản consent', recognition.version);
      const data = { is_granted: false, identity_verified: false, device_id: null }; let captured; let tested;
      const form = $('<div>').appendTo(dialog.body).dxForm({ formData: data, labelLocation: 'top', items: [
        field('is_granted', 'Consent của hội viên', 'dxCheckBox', false, { text: 'Hội viên đồng ý sử dụng dữ liệu nhận diện cho mục đích trên' }),
        field('identity_verified', 'Xác minh hồ sơ', 'dxCheckBox', false, { text: 'Đã đối chiếu đúng hồ sơ và định danh hội viên' }),
        field('device_id', 'Thiết bị đăng ký', 'dxSelectBox', true, select(devices.filter(device => device.status === 'ONLINE' && device.enabled !== false), 'id', 'device_name'))
      ], onFieldDataChanged: () => { captured = null; tested = null; } }).dxForm('instance');
      const resultHost = $('<div>').attr('aria-live', 'polite').appendTo(dialog.body); const actions = $('<div>').addClass('view-actions').css({ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }).appendTo(dialog.body);
      let busy = false;
      const run = async action => {
        if (busy) return; busy = true; form.option('disabled', true);
        try { await action(); } catch (error) { notice(resultHost, errorText(error), true); }
        finally { if (alive($(form.element()))) form.option('disabled', false); busy = false; }
      };
      button(actions, 'Ghi nhận consent & Capture', 'photo', () => run(async () => {
        captured = null; tested = null; if (!form.validate().isValid) return;
        if (!data.is_granted || !data.identity_verified) throw new Error('Cần hội viên đồng ý consent và xác minh đúng hồ sơ trước khi capture.');
        if (!data.device_id) throw new Error('Vui lòng chọn thiết bị đăng ký đang kết nối.');
        await api(`/members/${encoded(member.id)}/consents`, { method: 'POST', body: { consent_type: recognition.code, is_granted: true, consent_version: recognition.version, identity_verified: true } }, ctx);
        await refresh();
        notice(resultHost, 'Đã ghi nhận consent. Đang chờ thiết bị capture...');
        captured = await api(`/members/${encoded(member.id)}/biometric-enrollment`, { method: 'POST', body: { device_id: data.device_id } }, ctx);
        detail(resultHost.empty(), 'Kết quả capture', captured.message || captured.status);
      }), true);
      button(actions, 'Thử nhận diện', 'check', () => run(async () => {
        if (!captured || !['CAPTURED', 'ENROLLED', 'SUCCESS'].includes(captured.status)) throw new Error('Chưa có kết quả capture thành công từ thiết bị.');
        tested = await api(`/members/${encoded(member.id)}/recognition/test`, { method: 'POST', body: { device_id: data.device_id } }, ctx); detail(resultHost, 'Kết quả thử nhận diện', tested.message || tested.status);
      }));
      button(actions, 'Xác nhận sẵn sàng', 'save', () => run(async () => {
        if (!data.is_granted || !data.identity_verified || !tested || !['PASSED', 'SUCCESS'].includes(tested.status)) throw new Error('Chỉ xác nhận sẵn sàng sau khi thử nhận diện thành công.');
        const ready = await api(`/members/${encoded(member.id)}/recognition/ready`, { method: 'POST', body: { device_id: data.device_id } }, ctx);
        if (ready.status !== 'READY') throw new Error(ready.message || 'Thiết bị chưa xác nhận trạng thái sẵn sàng.');
        await refresh(); dialog.close(); DevExpress.ui.notify('Đăng ký nhận diện sẵn sàng', 'success', 2500);
      })); button(actions, 'Hủy', 'close', dialog.close);
    });
  }
  function revokeConsent(ctx, member, consent, catalog, refresh) {
    if (!canManageDevices(ctx)) throw new Error('Bạn không có quyền rút consent thay hội viên.');
    const dialog = popup(ctx, 'Rút consent'); const types = rows(catalog.types).filter(type => type.is_recognition || ['PUBLIC_DISPLAY', 'BIRTHDAY_DISPLAY'].includes(type.code));
    detail(dialog.body, 'Hội viên', `${member.full_name} · ${member.member_code || ''}`); const impact = $('<div>').appendTo(dialog.body);
    const data = { consent_type: consent.consent_type, delete_requested: false, confirmed: false }; let form;
    const update = () => {
      const type = types.find(item => item.code === data.consent_type);
      notice(impact, type?.is_recognition ? 'Rút consent sẽ ngừng nhận diện tự động. Lịch sử ra/vào vẫn được lưu theo thời hạn 12 tháng.' : 'Nội dung công khai thuộc consent này sẽ ngừng hiển thị. Các consent khác vẫn giữ nguyên.');
      form?.itemOption('delete_requested', 'visible', !!type?.is_recognition); if (!type?.is_recognition) data.delete_requested = false;
    };
    const editor = editForm(dialog, data, [field('consent_type', 'Loại consent cần rút', 'dxSelectBox', true, { ...select(types), onValueChanged: update }),
      { ...field('delete_requested', 'Yêu cầu xóa dữ liệu nhận diện', 'dxCheckBox', false, { text: 'Gửi yêu cầu xóa dữ liệu nhận diện' }), visible: !!types.find(type => type.code === data.consent_type)?.is_recognition },
      field('confirmed', 'Xác nhận rút consent', 'dxCheckBox', false, { text: 'Đã tiếp nhận yêu cầu của hội viên và xác nhận tác động' })
    ], async values => {
      if (!values.confirmed) throw new Error('Vui lòng xác nhận yêu cầu rút consent.'); const type = types.find(item => item.code === values.consent_type);
      if (type?.is_recognition) await api(`/members/${encoded(member.id)}/revoke-biometric`, { method: 'POST', body: { delete_requested: values.delete_requested, consent_type: values.consent_type } }, ctx);
      else await api(`/members/${encoded(member.id)}/consents`, { method: 'POST', body: { consent_type: values.consent_type, is_granted: false } }, ctx);
      await refresh();
    }, 'Đã rút consent', 'Xác nhận rút consent'); form = editor.form; editor.saveButton.option('type', 'danger'); update();
  }
  async function externalContext(adminOnly = false) {
    const user = await api('/auth/me'); const stored = apiClient.getUser(); const roles = codes(user.roles); const selected = user.active_role || stored?.active_role || stored?.role;
    const role = roles.includes(selected) ? selected : roles.length === 1 ? roles[0] : null;
    if (!['QTV', 'RECEPTIONIST'].includes(role) || (adminOnly && role !== 'QTV')) throw new Error('Bạn không có quyền thực hiện thao tác này.');
    return { user, role, admin: role === 'QTV', branch: apiClient.getCurrentBranchId() || '', root: $('#mainViewport').length ? $('#mainViewport') : $('body') };
  }
  async function openRecognition(memberId) {
    const ctx = await externalContext();
    const [member, catalog] = await Promise.all([api(`/members/${encoded(memberId)}`, {}, ctx), api('/consents/catalog', {}, ctx)]);
    return enrollment(ctx, member, catalog, async () => { $(document).trigger('paradise:consent-updated', [{ member_id: memberId }]); });
  }
  async function openRevokeConsent(memberId) {
    const ctx = await externalContext(true);
    const [member, catalog, consents] = await Promise.all([api(`/members/${encoded(memberId)}`, {}, ctx), api('/consents/catalog', {}, ctx), api(`/members/${encoded(memberId)}/consents`, {}, ctx)]);
    const granted = latestConsents(consents).filter(consent => consent.is_granted && rows(catalog.types).some(type => type.code === consent.consent_type && (type.is_recognition || ['PUBLIC_DISPLAY', 'BIRTHDAY_DISPLAY'].includes(type.code))));
    if (!granted.length) throw new Error('Hội viên không có consent đang hoạt động.');
    const available = { ...catalog, types: rows(catalog.types).filter(type => granted.some(consent => consent.consent_type === type.code)) };
    return revokeConsent(ctx, member, granted[0], available, async () => { $(document).trigger('paradise:consent-updated', [{ member_id: memberId }]); });
  }
  async function openDeviceStatus(deviceId) {
    const ctx = await externalContext(); return deviceDetail(ctx, { id: deviceId }, async () => {});
  }
  async function openIncident(deviceId) {
    const ctx = await externalContext(); return incidentEditor(ctx, null, deviceId ? { id: deviceId } : null, async () => {});
  }
  function latestConsents(data) {
    const result = new Map();
    [...rows(data.consents || data)].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).forEach(consent => { if (!result.has(consent.consent_type)) result.set(consent.consent_type, consent); });
    return [...result.values()];
  }

  function renderRbac(containerId, context = {}) {
    return page(containerId, 'Tài khoản & phân quyền', true, context, ctx => tabs(ctx, [
      { text: 'Tài khoản', icon: 'group', render: area => accountsPage(area, ctx) },
      { text: 'Nhật ký kiểm toán', icon: 'clock', render: area => auditPage(area, ctx) }
    ]));
  }
  function accountsPage(area, ctx) {
    return load(area, async () => {
      const [stats, roles, branches] = await Promise.all([api('/accounts/stats', {}, ctx), all('/roles', ctx), all('/branches', ctx)]); return { stats, roles, branches };
    }, ({ stats, roles, branches }) => {
      const statsHost = $('<div>').addClass('kpi-grid').css({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }).appendTo(area);
      [['Tổng tài khoản', stats.total], ['Đang hoạt động', stats.active], ['Chờ kích hoạt', stats.pending_activation], ['Đã khóa', stats.locked]].forEach(([label, value]) => {
        const metric = $('<div>').addClass('kpi-card').css({ borderRadius: 6, padding: 16 }).appendTo(statsHost);
        $('<div>').addClass('kpi-title').text(label).appendTo(metric); $('<div>').addClass('kpi-value').css({ fontSize: 26 }).text(value == null ? '-' : Number(value).toLocaleString('vi-VN')).appendTo(metric);
      });
      let table;
      const counts = stats.role_counts || stats.roles;
      const roleOptions = roles.map(role => { const code = role.code || role.role_code; return { code, name: `${role.name || role.role_name || ROLES[code] || code}${counts?.[code] == null ? '' : ` (${counts[code]})`}` }; });
      const form = filtersBar(area, { q: '', role: null, status: null }, [
        field('q', 'Tìm tài khoản', 'dxTextBox', false, { placeholder: 'Số điện thoại, họ tên hoặc mã hồ sơ' }),
        field('role', 'Vai trò', 'dxSelectBox', false, { ...select(roleOptions), placeholder: 'Tất cả' }),
        field('status', 'Trạng thái', 'dxSelectBox', false, { ...select(options(['ACTIVE', 'PENDING_ACTIVATION', 'LOCKED'])), placeholder: 'Tất cả' })
      ], () => { table?.pageIndex(0); table?.refresh(); });
      const actions = $('<div>').addClass('view-actions').css({ margin: '12px 0' }).appendTo(area);
      button(actions, 'Đặt lại bộ lọc', 'revert', () => { form.option('formData', { q: '', role: null, status: null }); table.pageIndex(0); return table.refresh(); });
      table = remoteGrid(area, '/accounts', ctx, () => form.option('formData'), [
        { dataField: 'login_phone', caption: 'SĐT đăng nhập', width: 145 },
        { dataField: 'full_name', caption: 'Người sử dụng', minWidth: 210, cellTemplate: (cell, row) => { $('<strong>').text(text(row.value)).appendTo(cell); $('<div>').css({ fontSize: 12, color: '#697480' }).text(`Hồ sơ: ${text(row.data.profile_code)}`).appendTo(cell); } },
        { dataField: 'roles', caption: 'Vai trò', minWidth: 160, cellTemplate: (cell, row) => codes(row.value).forEach(role => badge(cell, role, ROLES[role])) },
        { dataField: 'branch_names', caption: 'Chi nhánh áp dụng', minWidth: 185, calculateCellValue: row => row.is_all_branches ? 'Toàn hệ thống' : Array.isArray(row.branch_names) ? row.branch_names.join(', ') : row.branch_name || row.branch_names || (row.branch_ids || []).map(branchId => branches.find(branch => branch.id === branchId)?.branch_name).filter(Boolean).join(', ') || '-' },
        { dataField: 'status', caption: 'Trạng thái', width: 145, cellTemplate: (cell, row) => badge(cell, row.value) },
        ...(canManageAccounts(ctx) ? [actionColumn((cell, record) => iconButton(cell, 'Sửa tài khoản', 'edit', () => accountEditor(ctx, record, roles, () => accountsPage(area, ctx))), 80)] : [])
      ], { noDataText: 'Không tìm thấy tài khoản nào phù hợp' });
    });
  }
  async function accountEditor(ctx, record, roles, refresh) {
    if (!canManageAccounts(ctx)) throw new Error('Bạn không có quyền sửa tài khoản.');
    const dialog = popup(ctx, 'Sửa tài khoản');
    await load(dialog.body, () => all('/branches', ctx), branches => {
      const assigned = record.branch_ids || [];
      const data = { login_phone: record.login_phone, status: record.status, roles: [...codes(record.roles)], branch_scope: record.is_all_branches ? 'ALL' : assigned.length === 1 ? assigned[0] : null };
      const scopes = branches.map(branch => ({ code: branch.id, name: branch.branch_name }));
      if (ctx.user.is_all_branches) scopes.unshift({ code: 'ALL', name: 'Toàn hệ thống' });
      if (!record.is_all_branches && assigned.length > 1) {
        scopes.push({ code: 'KEEP_CURRENT', name: record.branch_names?.join(', ') || 'Giữ phạm vi chi nhánh hiện tại' }); data.branch_scope = 'KEEP_CURRENT';
      }
      const staff = () => data.roles.some(role => ['QTV', 'PT', 'RECEPTIONIST'].includes(role)); let form;
      const editor = editForm(dialog, data, [
        field('login_phone', 'SĐT đăng nhập', 'dxTextBox', false, { readOnly: true }),
        field('status', 'Trạng thái tài khoản', 'dxSelectBox', true, select(options(['ACTIVE', 'PENDING_ACTIVATION', 'LOCKED']))),
        field('roles', 'Vai trò', 'dxTagBox', true, { ...select(roles.map(role => ({ code: role.code || role.role_code, name: role.name || role.role_name || ROLES[role.code || role.role_code] }))), showSelectionControls: true,
          onValueChanged: () => { form?.itemOption('branch_scope', 'visible', staff()); } }),
        { ...field('branch_scope', 'Phạm vi chi nhánh', 'dxSelectBox', true, select(scopes)), visible: staff() }
      ], async values => {
        if (!values.roles.length) throw new Error('Tài khoản phải có ít nhất một vai trò.');
        if (staff() && !values.branch_scope) throw new Error('Vui lòng chọn phạm vi chi nhánh cho tài khoản nhân viên.');
        const actorId = ctx.user.account_id || ctx.user.id;
        const losesAdmin = !values.roles.includes('QTV') || values.branch_scope !== 'ALL' || values.status !== 'ACTIVE';
        if (record.id === actorId && (values.status === 'LOCKED' || !values.roles.includes('QTV') || (ctx.user.is_all_branches && losesAdmin))) throw new Error('Không thể tự khóa hoặc hạ quyền tài khoản quản trị đang đăng nhập.');
        if (record.is_last_chain_admin && losesAdmin) throw new Error('Không thể khóa hoặc hạ quyền Quản trị viên toàn chuỗi cuối cùng.');
        await api(`/accounts/${encoded(record.id)}`, { method: 'PUT', body: { status: values.status, roles: values.roles,
          branch_ids: staff() && values.branch_scope !== 'ALL' ? (values.branch_scope === 'KEEP_CURRENT' ? assigned : [values.branch_scope]) : [], is_all_branches: staff() && values.branch_scope === 'ALL' } }, ctx);
        await refresh();
      }, 'Cập nhật tài khoản thành công'); form = editor.form;
    });
  }
  function auditPage(area, ctx) {
    let table;
    const form = filtersBar(area, { date_from: new Date(), date_to: new Date(), q: '', action: '' }, [...dateFields(), field('q', 'Người thực hiện / Đối tượng'), field('action', 'Hành động')], () => { table?.pageIndex(0); table?.refresh(); });
    table = remoteGrid(area, '/audit-logs', ctx, () => withDates(form.option('formData')), [
      { dataField: 'created_at', caption: 'Thời điểm', width: 160, cellTemplate: (cell, row) => cell.text(date(row.value || row.data.timestamp)) },
      { dataField: 'actor_name', caption: 'Người thực hiện', minWidth: 170, calculateCellValue: row => row.actor_name || row.actor || row.actor_account_id },
      { dataField: 'action', caption: 'Hành động', width: 180, calculateCellValue: row => row.action || row.action_name },
      { dataField: 'target_table', caption: 'Đối tượng', width: 160, calculateCellValue: row => row.target_table || row.entity_type },
      { dataField: 'details', caption: 'Chi tiết', minWidth: 260, cellTemplate: (cell, row) => cell.text(typeof row.value === 'object' ? JSON.stringify(row.value) : text(row.value || row.data.reason)) },
      actionColumn((cell, record) => iconButton(cell, 'Xem nhật ký', 'eyeopen', () => {
        const dialog = popup(ctx, 'Chi tiết nhật ký kiểm toán', true);
        [['Thời điểm', date(record.created_at || record.timestamp)], ['Người thực hiện', record.actor_name || record.actor || record.actor_account_id], ['Hành động', record.action || record.action_name],
          ['Đối tượng', record.target_table || record.entity_type], ['Mã đối tượng', record.target_id || record.entity_id], ['Lý do', record.reason]].forEach(([label, value]) => detail(dialog.body, label, value));
        for (const [label, value] of [['Trước thay đổi', record.old_values], ['Sau thay đổi', record.new_values]]) if (value != null) detail(dialog.body, label, JSON.stringify(value, null, 2));
      }), 80)
    ]);
  }
  return { renderNotifications, renderEquipment, renderRbac, openRecognition, openRevokeConsent, openDeviceStatus, openIncident, refresh: () => current?.refresh?.() };
})();
