/** W04 registrations and W08 payments. Business records always come from REST. */
window.SalesModule = (function () {
  'use strict';

  const registrationStatuses = {
    PENDING_PAYMENT: 'Chờ thanh toán', ACTIVE: 'Đang hiệu lực', FROZEN: 'Đang đóng băng', SCHEDULED: 'Chưa đến ngày hiệu lực',
    EXPIRING: 'Sắp hết hạn', EXPIRED: 'Đã hết hạn', CANCELLED: 'Đã hủy'
  };
  const paymentStatuses = { COMPLETED: 'Thành công', CONFIRMED: 'Thành công', PENDING: 'Chờ thanh toán', EXPIRED: 'Hết hạn', CANCELLED: 'Đã hủy', FAILED: 'Thất bại' };
  let currentView = null;
  let serial = 0;
  const dialogs = new Set();
  const api = () => window.apiClient;
  const value = (v) => v === null || v === undefined || v === '' ? '--' : String(v);
  const money = (v) => v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? '--' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v));
  const dataOf = (r) => r && r.data !== undefined ? r.data : r;
  const rowsOf = (r) => { const d = dataOf(r); return Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : []; };
  const branchId = () => { const id = api().getCurrentBranchId?.(); return !id || id === 'ALL' ? null : id; };
  const idPath = (id) => encodeURIComponent(id);
  const confirmed = (p) => ['COMPLETED', 'CONFIRMED'].includes(p?.status);
  const method = (p) => p?.payment_method === 'CASH' ? 'Tiền mặt' : ['BANK_TRANSFER', 'BANK_TRANSFER_VIETQR'].includes(p?.payment_method) ? 'Chuyển khoản' : value(p?.payment_method);
  const regCode = (r) => r?.registration_code || r?.reg_code || r?.code;
  const packageName = (r) => r.package_name_snapshot || r.package_name;
  const memberName = (r) => r.member_name || r.member?.full_name;
  const memberCode = (r) => r.member_code || r.member?.member_code || r.member?.code;
  const memberPhone = (r) => r.member_phone || r.member?.phone;
  const type = (r) => r.package_type_snapshot || r.package_type;
  const hasPT = (r) => ['PT', 'PT_SESSION', 'PT_SESSIONS', 'COMBO'].includes(type(r));
  const hasGym = (r) => ['GYM', 'GYM_TIME', 'GYM_SESSION', 'GYM_SESSIONS', 'COMBO'].includes(type(r));
  const ptName = (r) => !hasPT(r) ? '--' : !r.assigned_pt_id ? 'Chưa có PT phụ trách' : [r.assigned_pt_name || r.pt_name || r.assigned_pt?.full_name, r.assigned_pt_code || r.pt_code || r.assigned_pt?.pt_code].filter(Boolean).join(' · ') || '--';
  const escapeHtml = (str) => $('<div>').text(String(str ?? '')).html();
  const isGroupPT = (r) => {
    if (!r) return false;
    const mode = r.package_mode || r.package_mode_snapshot;
    return hasPT(r) && ['GROUP_1_N', 'GROUP_PT'].includes(mode);
  };

  const today = () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()); };
  function day(input) {
    if (input === undefined) return today();
    if (!input) return null;
    if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : new Date(input.getFullYear(), input.getMonth(), input.getDate());
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(input));
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }
  function dateKey(input) {
    const d = day(input);
    return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
  }
  const dateText = (input) => day(input)?.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) || '--';
  const timestamp = (input) => input && !Number.isNaN(new Date(input).getTime()) ? new Date(input).toLocaleString('vi-VN') : '--';
  const addDays = (input, count) => { const d = day(input); if (!d || !Number.isFinite(Number(count))) return null; d.setDate(d.getDate() + Number(count)); return d; };
  const daysBetween = (a, b) => { const x = day(a), y = day(b); return x && y ? Math.round((Date.UTC(y.getFullYear(), y.getMonth(), y.getDate()) - Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())) / 86400000) : null; };
  const notify = (message, level = 'success') => DevExpress.ui.notify(message, level, 3500);
  function request(path, params = {}, options = {}) {
    const query = new URLSearchParams();
    Object.entries({ branch_id: branchId(), ...params }).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') query.set(k, v); });
    return api().request(path + (query.size ? '?' + query.toString() : ''), options);
  }
  async function allRows(path, params = {}) {
    const result = [];
    let page = 1;
    while (true) {
      const response = await request(path, { ...params, page, limit: 200 });
      const d = dataOf(response), batch = rowsOf(response);
      result.push(...batch);
      if (Array.isArray(d) || !Number.isFinite(Number(d?.total)) || result.length >= Number(d.total) || batch.length === 0) return result;
      page += 1;
      if (page > 500) throw new Error('Danh sách quá lớn. Vui lòng thu hẹp bộ lọc.');
    }
  }
  function button($parent, text, icon, onClick, primary = false, extra = {}) {
    return $('<div>').appendTo($parent).dxButton({ text, icon, hint: text, type: primary ? 'default' : 'normal',
      stylingMode: primary ? 'contained' : 'outlined', onClick, ...extra }).dxButton('instance');
  }
  function iconButton($parent, hint, icon, action) {
    return button($parent, '', icon, action, false, { hint, elementAttr: { 'aria-label': hint }, stylingMode: 'text', width: 34, height: 34 });
  }
  function errorBlock($parent, error, retry) {
    $parent.empty().show().attr('role', 'alert');
    $('<p>').text(error?.message || 'Không tải được dữ liệu. Vui lòng thử lại.').appendTo($parent);
    if (retry) button($parent, 'Thử lại', 'refresh', retry);
  }
  function loading($parent) {
    $parent.empty().attr('aria-live', 'polite');
    $('<div>').dxLoadIndicator({ width: 24, height: 24 }).appendTo($parent);
    $('<span>').text(' Đang tải...').appendTo($parent);
  }
  function badge($parent, status, payment = false) {
    const tone = ['ACTIVE', 'COMPLETED', 'CONFIRMED'].includes(status) ? 'success' : ['PENDING', 'PENDING_PAYMENT', 'EXPIRING'].includes(status) ? 'warning' : ['CANCELLED', 'FAILED'].includes(status) ? 'danger' : 'info';
    const label = (payment ? paymentStatuses : registrationStatuses)[status] || value(status);
    const textLabel = status === 'FROZEN' ? `❄️ ${label}` : label;
    const $badge = $('<span>').addClass(`status-badge badge-${tone}`).text(textLabel).appendTo($parent);
    if (status === 'EXPIRED') $badge.css({ background: '#f4f4f5', color: '#52525b', borderColor: '#a1a1aa' });
    if (status === 'FROZEN') $badge.css({ background: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc', fontWeight: 600 });
  }
  function twoLines($parent, title, subtitle) {
    $('<strong>').text(value(title)).appendTo($parent);
    $('<div>').addClass('text-muted').css({ fontSize: 12, marginTop: 3 }).text(subtitle).appendTo($parent);
  }
  function info($parent, label, content) {
    const row = $('<div>').css({ padding: '7px 0', display: 'grid', gridTemplateColumns: 'minmax(100px, 40%) minmax(0, 1fr)', gap: 12 }).appendTo($parent);
    $('<span>').addClass('text-muted').text(label).appendTo(row);
    return $('<span>').css({ overflowWrap: 'anywhere' }).text(value(content)).appendTo(row);
  }
  function section($parent, title) {
    const $s = $('<section>').css({ padding: '16px 0', borderBottom: '1px solid var(--border-color, #e5e7eb)' }).appendTo($parent);
    $('<h3>').css({ fontSize: 15, margin: '0 0 10px' }).text(title).appendTo($s);
    return $s;
  }
  function popup(title, width = 640, drawer = false) {
    const $host = $('<div>').appendTo(document.body);
    const result = { closed: false, busy: false, timer: null, body: null, instance: null, branch: branchId() };
    result.instance = $host.dxPopup({ title, width: () => Math.min(width, window.innerWidth - (drawer ? 0 : 24)),
      height: drawer ? '100%' : 'auto', maxHeight: drawer ? '100%' : '92vh', showCloseButton: true,
      dragEnabled: false, hideOnOutsideClick: drawer, deferRendering: false,
      position: drawer ? { my: 'right top', at: 'right top', of: window } : undefined,
      wrapperAttr: { class: drawer ? 'sales-detail-drawer' : 'sales-modal' },
      onHiding(e) { if (result.busy) e.cancel = true; },
      onHidden() { result.closed = true; clearInterval(result.timer); dialogs.delete(result); result.instance.dispose(); $host.remove(); },
      contentTemplate(el) { result.body = $('<div>').css({ maxHeight: drawer ? 'calc(100vh - 80px)' : 'calc(92vh - 120px)', overflowY: 'auto', padding: '2px 4px' }).appendTo(el); }
    }).dxPopup('instance');
    dialogs.add(result);
    result.instance.show();
    return result;
  }
  function formActions(dialog, label, action) {
    const $bar = $('<div>').css({ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', paddingTop: 20 }).appendTo(dialog.body);
    const cancel = button($bar, 'Hủy', 'close', () => dialog.instance.hide());
    const submit = button($bar, label, 'check', async () => {
      if (dialog.busy || dialog.closed) return;
      if (dialog.branch !== branchId()) { notify('Chi nhánh đã thay đổi. Vui lòng mở lại thao tác.', 'warning'); closeDialog(dialog); return; }
      dialog.busy = true; submit.option('disabled', true); cancel.option('disabled', true);
      try { await action(); } finally {
        dialog.busy = false;
        if (!dialog.closed) { submit.option('disabled', !!dialog.blocked); cancel.option('disabled', false); }
      }
    }, true);
    return submit;
  }
  function closeDialog(dialog) { dialog.busy = false; dialog.closed = true; clearInterval(dialog.timer); dialog.instance.hide(); }
  function field(name, label, editorType = 'dxTextBox', editorOptions = {}, required = false) {
    return { dataField: name, label: { text: label }, editorType, editorOptions: { stylingMode: 'outlined', ...editorOptions },
      validationRules: required ? [{ type: 'required', message: `${label} là bắt buộc` }] : [] };
  }
  function readonly(label, getter) {
    return { label: { text: label }, template(_, el) { $('<div>').css({ minHeight: 30, padding: '7px 0', overflowWrap: 'anywhere' }).text(value(getter())).appendTo(el); } };
  }
  function grid($parent, columns) {
    return $('<div>').appendTo($parent).dxDataGrid({ dataSource: [], keyExpr: 'id', columns, width: '100%',
      showBorders: false, showRowLines: true, rowAlternationEnabled: false, hoverStateEnabled: true,
      columnAutoWidth: true, columnMinWidth: 90, wordWrapEnabled: true, allowColumnResizing: true,
      columnFixing: { enabled: true },
      noDataText: 'Không có dữ liệu phù hợp', loadPanel: { enabled: true, text: 'Đang tải...' },
      scrolling: { mode: 'standard', useNative: true }, paging: { pageSize: 20 },
      pager: { visible: true, showInfo: true, showNavigationButtons: true, showPageSizeSelector: true, allowedPageSizes: [10, 20, 50], infoText: 'Trang {0}/{1} · {2} bản ghi' },
      editing: { allowUpdating: false, allowDeleting: false, allowAdding: false }
    }).dxDataGrid('instance');
  }
  function alive(view) { return view === currentView && view.root[0]?.isConnected && view.branch === branchId(); }
  function dispose() {
    if (currentView) { clearInterval(currentView.timer); clearTimeout(currentView.debounce); }
    for (const dialog of [...dialogs]) closeDialog(dialog);
    currentView = null;
  }
  function viewRoot(containerId, title, actionLabel, action) {
    dispose();
    const $container = typeof containerId === 'string' ? $(document.getElementById(containerId.replace(/^#/, ''))) : $(containerId);
    $container.empty();
    const root = $('<div>').addClass('sales-view').css({ minWidth: 0, maxWidth: '100%' }).appendTo($container);
    const view = { root, branch: branchId(), records: [], pending: [], generation: 0, context: {}, id: ++serial };
    currentView = view;
    const $head = $('<div class="view-header"><div class="view-header-title"></div><div class="view-actions"></div></div>').appendTo(root);
    $('<h2>').text(title).appendTo($head.find('.view-header-title'));
    button($head.find('.view-actions'), actionLabel, 'add', action, true);
    view.error = $('<div>').hide().appendTo(root);
    view.filters = $('<div>').addClass('filter-bar').css({ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end', marginBottom: 16 }).appendTo(root);
    view.panel = $('<div>').addClass('card-panel').css({ minWidth: 0, overflow: 'hidden' }).appendTo(root);
    return view;
  }
  function filter($bar, label, widget, options) {
    const $field = $('<div>').css({ minWidth: 'min(150px, 100%)', maxWidth: '100%', flex: '1 1 160px' }).appendTo($bar);
    const id = `sales-input-${++serial}`;
    $('<label>').attr('for', id).css({ display: 'block', fontSize: 12, marginBottom: 5 }).text(label).appendTo($field);
    return $('<div>').css({ minWidth: 0, maxWidth: '100%', width: '100%' }).appendTo($field)[widget]({ stylingMode: 'outlined', inputAttr: { id }, ...options })[widget]('instance');
  }
  function normalizeRegistration(r) {
    const effectiveStatus = r.is_frozen ? 'FROZEN' : r.status;
    return { ...r, status: effectiveStatus, registration_code: regCode(r), member_name: memberName(r), member_code: memberCode(r), member_phone: memberPhone(r), package_name: packageName(r) };
  }
  function expiring(r) {
    if (r.status !== 'ACTIVE') return false;
    const days = daysBetween(new Date(), r.end_date);
    return (days !== null && days >= 0 && days <= 7) || (hasPT(r) && r.remaining_pt_sessions != null && Number(r.remaining_pt_sessions) <= 2) || (['GYM_SESSION', 'GYM_SESSIONS'].includes(type(r)) && r.remaining_gym_sessions != null && Number(r.remaining_gym_sessions) <= 2);
  }
  async function renderRegistrations(containerId, context = {}) {
    if (typeof context === 'string') context = { member_id: context };
    context = context || {};
    const memberId = context.member_id || context.memberId;
    const view = viewRoot(containerId, 'Đăng ký & gia hạn', 'Tạo đăng ký gói mới', () => openRegistrationModal({ memberId }));
    view.context = context;
    const controls = {};
    const apply = () => {
      const q = (controls.q?.option('value') || '').trim().toLocaleLowerCase('vi');
      const state = controls.status?.option('value'), assignment = controls.assignment?.option('value');
      const filtered = view.records.filter(r => {
        const matches = !q || [r.registration_code, r.member_name, r.member_code, r.member_phone, r.package_name].some(v => String(v || '').toLocaleLowerCase('vi').includes(q));
        return matches && (!memberId || r.member_id === memberId) && (!state || (state === 'EXPIRING' ? expiring(r) : state === 'FROZEN' ? (r.status === 'FROZEN' || r.is_frozen) : state === 'ACTIVE' ? (r.status === 'ACTIVE' && !r.is_frozen) : r.status === state)) && (!assignment || (assignment === 'unassigned' ? hasPT(r) && !r.assigned_pt_id : !!r.assigned_pt_id));
      });
      view.grid.option('dataSource', filtered);
    };
    controls.q = filter(view.filters, 'Tìm đăng ký', 'dxTextBox', { placeholder: 'Mã ĐK, hội viên, SĐT, tên gói', mode: 'search', valueChangeEvent: 'input', onValueChanged: () => view.grid && apply() });
    controls.status = filter(view.filters, 'Trạng thái', 'dxSelectBox', { items: [{ id: '', text: 'Tất cả' }, ...Object.entries(registrationStatuses).map(([id, text]) => ({ id, text }))], value: Object.prototype.hasOwnProperty.call(registrationStatuses, context.status) ? context.status : '', valueExpr: 'id', displayExpr: 'text', onValueChanged: () => view.grid && apply() });
    controls.assignment = filter(view.filters, 'Tình trạng gán PT', 'dxSelectBox', { items: [{ id: '', text: 'Tất cả' }, { id: 'unassigned', text: 'Chưa gán PT' }, { id: 'assigned', text: 'Đã gán PT' }], value: '', valueExpr: 'id', displayExpr: 'text', onValueChanged: () => view.grid && apply() });
    button(view.filters, 'Đặt lại', 'revert', () => Object.values(controls).forEach(c => c.option('value', '')));
    iconButton(view.filters, 'Làm mới danh sách đăng ký', 'refresh', () => view.reload());
    view.grid = grid(view.panel, [
      { dataField: 'registration_code', caption: 'Mã', width: 105, alignment: 'center', customizeText: c => value(c.value) },
      { dataField: 'created_at', caption: 'Ngày tạo', width: 145, alignment: 'center', customizeText: c => timestamp(c.value) },
      { dataField: 'member_name', caption: 'Hội viên', minWidth: 170, cellTemplate: (el, c) => twoLines(el, c.value, [memberCode(c.data), c.data.member_home_branch_name || c.data.member_branch_name].filter(Boolean).join(' · ')) },
      { dataField: 'package_name', caption: 'Gói đăng ký', minWidth: 175 },
      { caption: 'Kỳ hiệu lực', width: 175, alignment: 'center', calculateCellValue: r => r.end_date ? `${dateText(r.start_date)} - ${dateText(r.end_date)}` : `Từ ${dateText(r.start_date)}` },
      { dataField: 'price_snapshot', caption: 'Số tiền', alignment: 'right', width: 120, customizeText: c => money(c.value) },
      { caption: 'PT phụ trách', width: 140, calculateCellValue: ptName },
      { dataField: 'status', caption: 'Trạng thái', width: 130, cellTemplate: (el, c) => badge(el, c.value) },
      { caption: 'Thao tác', width: 250, fixed: true, fixedPosition: 'right', cellTemplate(el, c) {
        const $actions = $('<div>').css({ display: 'flex', gap: 3, flexWrap: 'wrap' }).appendTo(el);
        iconButton($actions, 'Chi tiết đăng ký', 'info', () => openRegistrationDetail(c.data.id));
        if (isGroupPT(c.data) && ['ACTIVE', 'SCHEDULED'].includes(c.data.status)) {
          const countText = c.data.max_group_members ? ` (${c.data.total_group_members || 1}/${c.data.max_group_members})` : '';
          button($actions, `Mời vào nhóm${countText}`, 'group', () => openGroupMembersModal(c.data.id, () => view.reload()));
        }
        if (hasPT(c.data)) {
          if (!c.data.assigned_pt_id && ['ACTIVE', 'SCHEDULED'].includes(c.data.status)) {
            button($actions, 'Gán PT', 'user', () => openAssignment(c.data.id));
          } else if (c.data.assigned_pt_id && ['ACTIVE', 'SCHEDULED', 'FROZEN'].includes(c.data.status)) {
            button($actions, 'Gán lại PT', 'user', () => openAssignment(c.data.id));
          }
        }
        if (['ACTIVE', 'EXPIRED', 'EXPIRING', 'SCHEDULED', 'FROZEN'].includes(c.data.status)) button($actions, 'Gia hạn', 'repeat', () => openRegistrationModal({ renewalId: c.data.id }));
        if (c.data.status === 'PENDING_PAYMENT') {
          button($actions, 'Thu tiền', 'money', () => openPaymentModal(c.data.id), true);
          button($actions, 'Hủy đơn', 'close', () => openCancelModal(c.data, () => view.reload()), false, { stylingMode: 'outlined', elementAttr: { style: 'color: #dc2626; border-color: #fca5a5;' } });
        }
      } }
    ]);
    view.reload = async () => {
      const generation = ++view.generation;
      view.grid.beginCustomLoading('Đang tải...'); view.error.hide();
      try {
        const [rows, branches] = await Promise.all([allRows('/registrations', { member_id: memberId }), allRows('/branches')]);
        if (!alive(view) || generation !== view.generation) return;
        view.records = rows.map(r => normalizeRegistration({ ...r, member_home_branch_name: r.member_home_branch_name || branches.find(b => b.id === (r.home_branch_id || r.member?.home_branch_id))?.branch_name })); apply();
      } catch (err) { if (alive(view) && generation === view.generation) { view.grid.option('dataSource', []); errorBlock(view.error, err, view.reload); } }
      finally { if (alive(view) && generation === view.generation) view.grid.endCustomLoading(); }
    };
    await view.reload();
    if (alive(view) && (context.openCreate || context.action === 'create')) await openRegistrationModal({ memberId, packageId: context.package_id || context.packageId });
    if (alive(view) && (context.registration_id || context.registrationId)) {
      const id = context.registration_id || context.registrationId;
      if (context.action === 'renew') await openRegistrationModal({ renewalId: id });
      else if (context.action === 'assign') await openAssignment(id);
      else await openRegistrationDetail(id);
    }
  }

  function memberStore() {
    return new DevExpress.data.DataSource({ paginate: true, pageSize: 20,
      store: new DevExpress.data.CustomStore({ key: 'id', loadMode: 'processed', useDefaultSearch: false,
        load: async options => {
          const take = options.take || 20;
          const response = await request('/members', { q: options.searchValue, page: Math.floor((options.skip || 0) / take) + 1, limit: take });
          return { data: rowsOf(response), totalCount: Number(dataOf(response)?.total ?? rowsOf(response).length) };
        }, byKey: async id => dataOf(await api().members.getById(id)) }) });
  }
  async function openRegistrationModal(options = {}) {
    if (options.member_id) options = { ...options, memberId: options.member_id };
    const dialog = popup(options.renewalId ? 'Gia hạn đăng ký gói' : 'Tạo đăng ký gói mới');
    loading(dialog.body);
    const init = async () => {
      try {
        const [packages, previous, member] = await Promise.all([
          allRows('/packages', { status: 'ACTIVE' }),
          options.renewalId ? api().registrations.getById(options.renewalId).then(dataOf) : null,
          options.memberId ? api().members.getById(options.memberId).then(dataOf) : null
        ]);
        if (dialog.closed) return;
        dialog.body.empty();
        const activePackages = packages.filter(p => p.status === 'ACTIVE');
        const old = previous?.registration || previous;
        const today = day(new Date());
        const start = old ? (old.end_date ? addDays(day(old.end_date) >= today ? old.end_date : today, 1) : today) : today;
        const selectedPackageId = old ? old.package_id : options.packageId;
        const model = { member_id: old?.member_id || member?.id || null, package_id: activePackages.some(p => p.id === selectedPackageId) ? selectedPackageId : null, start_date: start };
        const $error = $('<div>').hide().appendTo(dialog.body);
        let form;
        const isSessionOnly = (pkg) => {
          if (!pkg) return false;
          const t = type(pkg);
          return ['PT', 'PT_SESSION', 'PT_SESSIONS', 'GYM_SESSION', 'GYM_SESSIONS'].includes(t) || !pkg.duration_days;
        };
        const update = () => {
          const pkg = activePackages.find(p => p.id === model.package_id);
          const isSession = isSessionOnly(pkg);
          form?.getEditor('end_preview')?.option('value', pkg && !isSession && pkg.duration_days ? dateText(addDays(model.start_date, pkg.duration_days)) : '--');
          form?.getEditor('price_preview')?.option('value', pkg ? money(pkg.price) : '--');
        };
        const items = old ? [readonly('Đăng ký cũ / Hội viên', () => `${value(regCode(old))} · ${value(memberName(old))}`), readonly('Ngày hết hạn cũ', () => old.end_date ? dateText(old.end_date) : '-- (Vô thời hạn)')] : [field('member_id', 'Hội viên', 'dxSelectBox', {
          dataSource: memberStore(), valueExpr: 'id', displayExpr: m => m ? [m.full_name, m.member_code, m.phone].filter(Boolean).join(' · ') : '',
          searchEnabled: true, searchExpr: ['full_name', 'phone', 'member_code'], searchTimeout: 250, showClearButton: true, noDataText: 'Không tìm thấy hội viên phù hợp', placeholder: 'Tìm SĐT hoặc họ tên'
        }, true)];
        items.push(field('package_id', old ? 'Gói gia hạn' : 'Gói đăng ký', 'dxSelectBox', {
          dataSource: activePackages, displayExpr: 'package_name', valueExpr: 'id', searchEnabled: true,
          searchExpr: ['package_name', 'package_code'], placeholder: 'Chọn gói đang mở bán', noDataText: 'Không có gói đang mở bán'
        }, true));
        items.push(field('start_date', old ? 'Ngày bắt đầu mới' : 'Ngày bắt đầu', 'dxDateBox', { type: 'date', displayFormat: 'dd/MM/yyyy', useMaskBehavior: true }, true));
        items.push(field('end_preview', old ? 'Ngày kết thúc mới' : 'Ngày kết thúc dự kiến', 'dxTextBox', { readOnly: true }));
        items.push(field('price_preview', 'Giá gốc hiện hành', 'dxTextBox', { readOnly: true }));
        form = $('<div>').appendTo(dialog.body).dxForm({ formData: model, items, labelLocation: 'top', showRequiredMark: true, colCount: 1,
          onFieldDataChanged(e) { if (['package_id', 'start_date'].includes(e.dataField)) update(); } }).dxForm('instance');
        update();
        const $bar = $('<div>').css({ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap', paddingTop: 20 }).appendTo(dialog.body);
        const cancelBtn = button($bar, 'Hủy', 'close', () => dialog.instance.hide());

        const saveRegistration = async (andPay = false) => {
          if (dialog.busy || dialog.closed) return;
          if (!form.validate().isValid) return;
          if (dialog.branch !== branchId()) { notify('Chi nhánh đã thay đổi. Vui lòng mở lại thao tác.', 'warning'); closeDialog(dialog); return; }
          $error.hide();
          dialog.busy = true;
          form.option('disabled', true);
          cancelBtn.option('disabled', true);
          saveBtn.option('disabled', true);
          saveAndPayBtn.option('disabled', true);
          try {
            const body = { package_id: model.package_id, start_date: dateKey(model.start_date) };
            const response = old ? await api().request(`/registrations/${idPath(old.id)}/renew`, { method: 'POST', body }) : await api().registrations.create({ ...body, member_id: model.member_id, ...(branchId() ? { sold_branch_id: branchId() } : {}) });
            const result = dataOf(response), registration = result?.registration || result;
            if (!registration?.id) throw new Error('Chưa nhận được mã đăng ký. Vui lòng làm mới danh sách trước khi thử lại.');
            notify(old ? 'Đã tạo đăng ký gia hạn chờ thanh toán' : 'Đã tạo đăng ký chờ thanh toán');
            closeDialog(dialog);
            refreshCurrent();
            if (andPay) {
              await openPaymentModal(registration.id);
            }
          } catch (err) {
            if (!dialog.closed) {
              errorBlock($error, err);
              dialog.busy = false;
              form.option('disabled', false);
              cancelBtn.option('disabled', false);
              saveBtn.option('disabled', false);
              saveAndPayBtn.option('disabled', false);
            }
          }
        };

        const saveBtn = button($bar, old ? 'Xác nhận lưu gia hạn' : 'Xác nhận lưu đăng ký', 'check', () => saveRegistration(false), false);
        const saveAndPayBtn = button($bar, old ? 'Lưu gia hạn và thu tiền' : 'Lưu đăng ký và thu tiền', 'money', () => saveRegistration(true), true);

        if (!activePackages.length) {
          saveBtn.option('disabled', true);
          saveAndPayBtn.option('disabled', true);
          errorBlock($error, new Error('Không có gói đang mở bán tại chi nhánh.'));
        }
      } catch (err) { if (!dialog.closed) errorBlock(dialog.body, err, init); }
    };
    await init();
  }

  async function openAssignment(registrationId, onSaved) {
    const dialog = popup('Gán PT phụ trách');
    loading(dialog.body);
    const init = async () => {
      try {
        const detail = dataOf(await api().registrations.getById(registrationId));
        const r = detail.registration || detail;
        if (!hasPT(r)) throw new Error('Đăng ký này không có quyền huấn luyện PT.');
        if (!['ACTIVE', 'SCHEDULED', 'FROZEN'].includes(r.status)) {
          refreshCurrent();
          throw new Error('Gói đăng ký phải ở trạng thái hiệu lực hoặc đã thanh toán mới được gán HLV.');
        }

        const isReassign = !!r.assigned_pt_id;
        dialog.instance.option('title', isReassign ? 'Gán lại PT phụ trách' : 'Gán PT phụ trách');

        const [trainerRows, branches] = await Promise.all([
          allRows('/pt-bookings/trainers', { branch_id: r.sold_branch_id, status: 'ACTIVE' }),
          allRows('/branches')
        ]);
        const trainers = trainerRows.filter(p => p.status === 'ACTIVE' && (!r.sold_branch_id || p.branch_id === r.sold_branch_id));
        if (dialog.closed) return;
        dialog.body.empty();
        const $error = $('<div>').hide().appendTo(dialog.body);
        const model = { pt_id: null, note: '' };

        const formItems = [
          readonly('Mã đăng ký', () => regCode(r)),
          readonly('Hội viên', () => [memberName(r), memberCode(r), memberPhone(r)].filter(Boolean).join(' · ')),
          readonly('Gói đăng ký', () => packageName(r)),
          readonly('Chi nhánh', () => r.sold_branch_name || r.sold_branch?.branch_name || branches.find(b => b.id === r.sold_branch_id)?.branch_name)
        ];

        if (isReassign) {
          formItems.push(readonly('HLV phụ trách hiện tại', () => ptName(r)));
        }

        formItems.push(
          field('pt_id', isReassign ? 'Chọn HLV phụ trách mới' : 'Huấn luyện viên phụ trách', 'dxSelectBox', {
            dataSource: trainers,
            valueExpr: 'id',
            displayExpr: p => p ? [p.full_name, p.pt_code, p.phone].filter(Boolean).join(' · ') : '',
            searchEnabled: true,
            searchExpr: ['full_name', 'phone', 'pt_code'],
            placeholder: isReassign ? 'Chọn HLV thay thế phụ trách gói...' : 'Chọn HLV phụ trách...',
            noDataText: 'Không tìm thấy HLV khả dụng tại chi nhánh'
          }, true),
          field('note', isReassign ? 'Lý do gán lại / Ghi chú bàn giao' : 'Ghi chú phân công', 'dxTextArea', {
            maxLength: 255,
            height: 80,
            placeholder: isReassign ? 'Ví dụ: HLV cũ quá tải, hội viên yêu cầu đổi PT...' : 'Ghi chú nguyện vọng hoặc lưu ý...'
          })
        );

        const form = $('<div>').appendTo(dialog.body).dxForm({
          formData: model,
          labelLocation: 'top',
          showRequiredMark: true,
          items: formItems
        }).dxForm('instance');

        let conflicted = false;
        const submit = formActions(dialog, isReassign ? 'Xác nhận gán lại PT' : 'Xác nhận gán PT', async () => {
          if (conflicted || !form.validate().isValid) return;
          if (isReassign && model.pt_id === r.assigned_pt_id) {
            errorBlock($error, new Error('Vui lòng chọn một HLV khác với HLV phụ trách hiện tại'));
            return;
          }
          form.option('disabled', true);
          try {
            await api().request(`/registrations/${idPath(r.id)}/assign-pt`, {
              method: 'POST',
              body: { pt_id: model.pt_id, note: model.note }
            });
            notify(isReassign ? 'Đã gán lại PT phụ trách thành công!' : 'Đã gán PT phụ trách thành công!');
            closeDialog(dialog);
            refreshCurrent();
            if (onSaved) onSaved();
          } catch (err) {
            errorBlock($error, err);
            if (err.status === 409) {
              conflicted = true;
              dialog.blocked = true;
              refreshCurrent();
              if (onSaved) onSaved();
            }
          } finally {
            if (!dialog.closed && !conflicted) form.option('disabled', false);
          }
        });
        if (!trainers.length) {
          errorBlock($error, new Error('Không tìm thấy HLV khả dụng tại chi nhánh'));
          submit.option('disabled', true);
        }
      } catch (err) {
        if (!dialog.closed) errorBlock(dialog.body, err, init);
      }
    };
    await init();
  }

  function progress($parent, label, used, total, color) {
    if (used == null || total == null) { info($parent, label, null); return; }
    const ratio = Number(total) > 0 ? Math.max(0, Math.min(100, Number(used) / Number(total) * 100)) : 0;
    $('<div>').css({ margin: '10px 0 5px' }).text(`${label}: ${used} / ${total}`).appendTo($parent);
    const $bar = $('<div>').attr({ role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': total, 'aria-valuenow': used }).css({ height: 7, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }).appendTo($parent);
    $('<div>').css({ width: `${ratio}%`, height: '100%', background: color }).appendTo($bar);
  }
  async function openRegistrationDetail(id) {
    const dialog = popup('Chi tiết lượt đăng ký gói', 580, true);
    const load = async () => {
      loading(dialog.body);
      try {
        const [response, branches] = await Promise.all([api().registrations.getById(id), allRows('/branches')]);
        const data = dataOf(response), r = data.registration || data;
        if (dialog.closed) return;
        dialog.body.empty(); dialog.instance.option('title', `Đăng ký ${value(regCode(r))}`);
        badge(dialog.body, r.status);
        const $member = section(dialog.body, 'Hội viên');
        const initials = String(memberName(r) || '').trim().split(/\s+/).slice(-2).map(n => n[0]).join('');
        $('<span>').css({ display: 'inline-grid', placeItems: 'center', width: 38, height: 38, borderRadius: 6, background: '#ecfdf5', color: '#237b58', fontWeight: 700 }).text(initials).appendTo($member);
        info($member, 'Họ tên', memberName(r)); info($member, 'Mã HV · SĐT', [memberCode(r), memberPhone(r)].filter(Boolean).join(' · '));
        info($member, 'Chi nhánh hội viên', r.member_home_branch_name || r.member_branch_name || r.member?.home_branch_name || r.member?.home_branch?.branch_name || branches.find(b => b.id === r.member?.home_branch_id)?.branch_name);
        const $package = section(dialog.body, 'Gói tập');
        info($package, 'Tên gói', packageName(r)); info($package, 'Phân loại', type(r) === 'COMBO' ? 'COMBO' : hasPT(r) ? 'PT' : hasGym(r) ? 'GYM' : type(r));
        info($package, 'Thời điểm tạo đăng ký', timestamp(r.created_at));
        info($package, 'Kỳ hiệu lực', r.end_date ? `${dateText(r.start_date)} - ${dateText(r.end_date)}` : `Từ ${dateText(r.start_date)} (Vô thời hạn)`);
        info($package, 'Chi nhánh áp dụng', (r.allowed_branches || []).map(b => b.branch_name || b.name).filter(Boolean).join(', '));
        info($package, 'Nhân viên tiếp nhận', r.created_by_name || r.created_by_account?.full_name || r.creator?.full_name);
        const $payment = section(dialog.body, 'Thanh toán 100%');
        info($payment, 'Giá trị gói', money(r.price_snapshot));
        const paid = (r.payments || []).find(confirmed);
        info($payment, 'Trạng thái thanh toán', paid ? 'Đã thanh toán 100%' : r.status === 'PENDING_PAYMENT' ? 'Chờ thanh toán 100%' : r.payment_status ? paymentStatuses[r.payment_status] : null);
        if (paid) { info($payment, 'Phương thức', method(paid)); info($payment, 'Thời gian thanh toán', timestamp(paid.confirmed_at)); button($payment, 'Xem phiếu thu', 'doc', () => openReceipt(paid)); }
        if (r.status === 'PENDING_PAYMENT') {
          const $payActions = $('<div style="display:flex;gap:8px;margin-top:10px;">').appendTo($payment);
          button($payActions, 'Thu tiền ngay', 'money', () => { closeDialog(dialog); openPaymentModal(r.id); }, true);
          button($payActions, 'Hủy đơn đăng ký', 'close', () => {
            openCancelModal(r, async () => {
              closeDialog(dialog);
              if (currentView?.reload) await currentView.reload();
            });
          }, false, { stylingMode: 'outlined', elementAttr: { style: 'color:#dc2626;border-color:#fca5a5;' } });
        }
        const $rights = section(dialog.body, 'Quyền lợi & tiến độ sử dụng');

        if (r.status === 'PENDING_PAYMENT') {
          $('<div class="status-callout" style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;padding:12px 14px;border-radius:6px;font-size:13px;margin:8px 0 12px;line-height:1.5;">')
            .html('<i class="fa fa-clock-o" style="margin-right:6px;font-size:15px;color:#d97706;"></i><strong>Chưa kích hoạt:</strong> Đăng ký đang ở trạng thái <strong>Chờ thanh toán 100%</strong>. Quyền lợi và tiến độ sử dụng sẽ bắt đầu được tính sau khi thu tiền thành công.')
            .appendTo($rights);
          if (hasGym(r)) {
            const total = daysBetween(r.start_date, r.end_date);
            info($rights, 'Quyền tập Gym', 'Chưa kích hoạt (Chờ thanh toán 100%)');
            if (total !== null) info($rights, 'Thời hạn gói đăng ký', `${total} ngày`);
            if (['GYM_SESSION', 'GYM_SESSIONS'].includes(type(r))) {
              info($rights, 'Số buổi Gym', `${r.total_gym_sessions ?? r.remaining_gym_sessions ?? 0} buổi (Chưa kích hoạt)`);
            }
            info($rights, 'Lượt check-in thực tế', '0 lượt (Chưa kích hoạt)');
          }
          if (hasPT(r)) {
            info($rights, 'Quyền huấn luyện PT', 'Chưa kích hoạt (Chờ thanh toán 100%)');
            info($rights, 'Tổng số buổi PT', `${r.total_pt_sessions_snapshot ?? r.total_pt_sessions ?? 0} buổi`);
            info($rights, 'HLV phụ trách', 'Chờ kích hoạt thanh toán');
          }
        } else if (r.status === 'CANCELLED') {
          $('<div class="status-callout" style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 14px;border-radius:6px;font-size:13px;margin:8px 0 12px;line-height:1.5;">')
            .html('<i class="fa fa-ban" style="margin-right:6px;font-size:15px;color:#dc2626;"></i><strong>Đã hủy:</strong> Đăng ký gói tập này đã bị hủy, không có hiệu lực sử dụng.')
            .appendTo($rights);
        } else {
          if (r.status === 'SCHEDULED') {
            $('<div class="status-callout" style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;padding:12px 14px;border-radius:6px;font-size:13px;margin:8px 0 12px;line-height:1.5;">')
              .html(`<i class="fa fa-calendar-check-o" style="margin-right:6px;font-size:15px;color:#2563eb;"></i><strong>Đã thanh toán 100%:</strong> Gói sẽ tự động có hiệu lực từ ngày <strong>${dateText(r.start_date)}</strong>.`)
              .appendTo($rights);
          }
          if (hasGym(r)) {
            const total = daysBetween(r.start_date, r.end_date);
            const elapsed = daysBetween(r.start_date, new Date());
            const remaining = daysBetween(new Date(), r.end_date);
            if (r.status === 'SCHEDULED') {
              info($rights, 'Quyền tập Gym', total !== null ? `Tổng ${total} ngày (Bắt đầu từ ${dateText(r.start_date)})` : 'Chờ ngày hiệu lực');
            } else {
              info($rights, 'Quyền tập Gym', remaining === null ? null : (r.status === 'EXPIRED' || remaining <= 0 ? 'Đã hết hạn' : `Còn ${Math.max(0, remaining)} ngày`));
              progress($rights, 'Đã trôi qua / Tổng hạn (ngày)', total === null || elapsed === null ? null : Math.min(total, Math.max(0, elapsed)), total, '#237b58');
            }
            info($rights, 'Lượt check-in thực tế', r.gym_checkin_count ?? r.checkin_count ?? r.progress?.gym_checkin_count ?? r.progress?.checkin_count ?? r.progress?.checkins ?? 0);
            if (['GYM_SESSION', 'GYM_SESSIONS'].includes(type(r))) info($rights, 'Buổi Gym còn lại', r.remaining_gym_sessions);
          }
          if (hasPT(r)) {
            info($rights, 'Buổi PT có thể đặt', r.remaining_pt_sessions);
            progress($rights, 'Đã tập / Tổng cấp (buổi)', r.used_pt_sessions, r.total_pt_sessions_snapshot ?? r.total_pt_sessions, '#d97706');
            info($rights, 'Buổi đang giữ chỗ', r.booked_pt_sessions);
            info($rights, 'HLV phụ trách', ptName(r));
            if (!r.assigned_pt_id && ['ACTIVE', 'SCHEDULED'].includes(r.status)) {
              button($rights, 'Gán PT phụ trách', 'user', () => openAssignment(r.id, load));
            } else if (r.assigned_pt_id && ['ACTIVE', 'SCHEDULED', 'FROZEN'].includes(r.status)) {
              button($rights, 'Gán lại PT', 'user', () => openAssignment(r.id, load));
            }
          }
        }

        if (isGroupPT(r)) {
          const $groupSec = section(dialog.body, 'Thành viên nhóm PT 1-Nhiều');
          const maxGrp = r.max_group_members_snapshot || r.max_group_members || 3;
          info($groupSec, 'Hình thức huấn luyện', `1 Kèm Nhiều (Nhóm tối đa ${maxGrp} học viên)`);
          const $groupActions = $('<div style="display:flex;gap:8px;margin-top:8px;">').appendTo($groupSec);
          button($groupActions, 'Quản lý thành viên nhóm', 'group', () => openGroupMembersModal(r.id, load));
        }

        if (r.is_frozen || ['ACTIVE', 'SCHEDULED', 'FROZEN'].includes(r.status) || (r.freezes && r.freezes.length > 0)) {
          const $contractSec = section(dialog.body, 'Đóng băng & Chuyển nhượng gói');
          const $contractActions = $('<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">').appendTo($contractSec);
          if (r.is_frozen) {
            $('<div style="margin-bottom:8px;">').append($('<span class="status-badge" style="background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;font-weight:600;padding:4px 10px;">').text('❄️ GÓI ĐANG BỊ ĐÓNG BĂNG')).appendTo($contractSec);
            button($contractActions, 'Mở đóng băng trước hạn', 'unlock', async () => {
              try {
                await api().request(`/registrations/${idPath(r.id)}/unfreeze`, { method: 'POST' });
                notify('Đã mở đóng băng gói tập thành công!');
                await load();
                if (currentView?.reload) await currentView.reload();
              } catch (err) { notify(err.message, 'error'); }
            }, true);
          
          } else if (['ACTIVE', 'SCHEDULED'].includes(r.status)) {
            button($contractActions, 'Đóng băng gói', 'hourglass-half', () => openFreezeModal(r, async () => { await load(); if (currentView?.reload) await currentView.reload(); }));
            button($contractActions, 'Chuyển nhượng gói', 'repeat', () => openTransferModal(r, async () => { await load(); if (currentView?.reload) await currentView.reload(); }));
          }

          if (r.freezes && r.freezes.length > 0) {
            const $freezeHistory = $('<div style="margin-top:14px;">').appendTo($contractSec);
            $('<h4 style="font-size:13px;font-weight:600;color:#334155;margin:0 0 8px;">Lịch sử các đợt đóng băng:</h4>').appendTo($freezeHistory);
            const $fTable = $('<table style="width:100%;border-collapse:collapse;font-size:12px;">').appendTo($freezeHistory);
            $fTable.html(`
              <thead>
                <tr style="border-bottom:1px solid #e2e8f0;color:#64748b;text-align:left;">
                  <th style="padding:6px;">Thời gian</th>
                  <th style="padding:6px;text-align:center;">Số ngày</th>
                  <th style="padding:6px;">Lý do</th>
                  <th style="padding:6px;text-align:center;">Trạng thái</th>
                  <th style="padding:6px;">Người duyệt</th>
                </tr>
              </thead>
              <tbody>
                ${r.freezes.map(f => `
                  <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:6px;color:#0f172a;">${dateText(f.start_date)} - ${dateText(f.end_date)}</td>
                    <td style="padding:6px;text-align:center;font-weight:600;">${f.freeze_days} ngày</td>
                    <td style="padding:6px;color:#475569;">${escapeHtml(f.reason || '--')}</td>
                    <td style="padding:6px;text-align:center;">
                      <span class="status-badge" style="font-size:10px;padding:2px 6px;border-radius:4px;${f.status === 'ACTIVE' ? 'background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;font-weight:600;' : f.status === 'SCHEDULED' ? 'background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-weight:600;' : 'background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;'}">
                        ${f.status === 'ACTIVE' ? 'Đang bảo lưu' : 'Đã kết thúc'}
                      </span>
                    </td>
                    <td style="padding:6px;color:#64748b;">${escapeHtml(f.approved_by_name || '--')}</td>
                  </tr>
                `).join('')}
              </tbody>
            `);
          }
        }

        if (r.transfers && r.transfers.length > 0) {
          const $transferSec = section(dialog.body, `Lịch sử chuyển nhượng gói (${r.transfers.length})`);
          const $tTable = $('<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:6px;">').appendTo($transferSec);
          $tTable.html(`
            <thead>
              <tr style="border-bottom:1px solid #e2e8f0;color:#64748b;text-align:left;">
                <th style="padding:6px;">Ngày chuyển</th>
                <th style="padding:6px;">Người chuyển</th>
                <th style="padding:6px;">Người nhận</th>
                <th style="padding:6px;text-align:right;">Phí</th>
                <th style="padding:6px;">Lý do</th>
                <th style="padding:6px;">Người thực hiện</th>
              </tr>
            </thead>
            <tbody>
              ${r.transfers.map(t => `
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:6px;color:#0f172a;">${timestamp(t.created_at || t.transferred_at)}</td>
                  <td style="padding:6px;color:#0f172a;font-weight:500;">${escapeHtml(t.from_member_name)} <span style="font-size:11px;color:#64748b;">(${escapeHtml(t.from_member_code || '')})</span></td>
                  <td style="padding:6px;color:#0f172a;font-weight:500;">${escapeHtml(t.to_member_name)} <span style="font-size:11px;color:#64748b;">(${escapeHtml(t.to_member_code || '')})</span></td>
                  <td style="padding:6px;text-align:right;color:#237b58;font-weight:600;">${Number(t.transfer_fee) > 0 ? money(t.transfer_fee) : 'Miễn phí'}</td>
                  <td style="padding:6px;color:#475569;">${escapeHtml(t.reason || '--')}</td>
                  <td style="padding:6px;color:#64748b;">${escapeHtml(t.approved_by_name || '--')}</td>
                </tr>
              `).join('')}
            </tbody>
          `);
        }
      } catch (err) { if (!dialog.closed) errorBlock(dialog.body, err, load); }
    };
    await load();
  }

  async function openGroupMembersModal(registrationId, onUpdated) {
    const dialog = popup('Quản lý thành viên nhóm PT 1-Nhiều', 640, true);
    const loadGroup = async () => {
      loading(dialog.body);
      try {
        const [regData, groupRes] = await Promise.all([
          api().registrations.getById(registrationId),
          api().request(`/registrations/${idPath(registrationId)}/group-members`)
        ]);
        const r = dataOf(regData)?.registration || dataOf(regData);
        const group = dataOf(groupRes);
        if (dialog.closed) return;
        dialog.body.empty();
        dialog.instance.option('title', `Quản lý nhóm PT · ${value(regCode(r))}`);

        const maxMembers = group.max_group_members || r.max_group_members_snapshot || 3;
        const totalCurrent = group.total_current || 1;
        const availableSlots = group.available_slots ?? Math.max(0, maxMembers - totalCurrent);
        const isFull = totalCurrent >= maxMembers;

        const membersList = group.members || [];
        const acceptedMembers = membersList.filter(m => m.invitation_status === 'ACCEPTED');
        const pendingInvitations = membersList.filter(m => m.invitation_status === 'PENDING');
        const totalOfficial = 1 + acceptedMembers.length;

        // 1. Thẻ thông tin gói và tiến độ nhóm
        const $headerCard = $('<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:16px;">').appendTo(dialog.body);
        $headerCard.html(`
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;">
            <div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;">${escapeHtml(r.package_name_snapshot || r.package_name)}</div>
              <div style="font-size:12px;color:#64748b;margin-top:2px;">Mã ĐK: <strong>${escapeHtml(r.reg_code || '')}</strong> · HLV: <strong>${escapeHtml(ptName(r))}</strong></div>
            </div>
            <div style="text-align:right;">
              <span class="status-badge ${isFull ? 'badge-warning' : 'badge-success'}" style="font-size:12px;padding:4px 10px;font-weight:700;">
                ${totalCurrent} / ${maxMembers} học viên
              </span>
              <div style="font-size:11px;color:#475569;margin-top:4px;">
                <strong>${totalOfficial}</strong> chính thức ${pendingInvitations.length ? `· <span style="color:#d97706;font-weight:600;">${pendingInvitations.length} chờ chấp thuận</span>` : ''} · ${isFull ? '<strong style="color:#b45309;">Đã đầy</strong>' : `Còn ${availableSlots} chỗ`}
              </div>
            </div>
          </div>
        `);

        // 2. Danh sách thành viên chính thức
        const $membersSec = section(dialog.body, `Thành viên chính thức trong nhóm (${totalOfficial}/${maxMembers} học viên)`);
        const $table = $('<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;">').appendTo($membersSec);
        $table.html(`
          <thead>
            <tr style="border-bottom:2px solid #e2e8f0;color:#475569;text-align:left;">
              <th style="padding:8px 6px;">Học viên</th>
              <th style="padding:8px 6px;">Số điện thoại</th>
              <th style="padding:8px 6px;text-align:center;">Vai trò</th>
              <th style="padding:8px 6px;text-align:center;">Trạng thái</th>
              <th style="padding:8px 6px;text-align:right;">Thao tác</th>
            </tr>
          </thead>
          <tbody></tbody>
        `);
        const $tbody = $table.find('tbody');

        // Dòng Trưởng nhóm (Leader)
        const leader = group.leader || { full_name: r.member_name, phone: r.member_phone, member_code: r.member_code };
        const $trLeader = $('<tr style="border-bottom:1px solid #f1f5f9;background:#f8fafc;">').appendTo($tbody);
        $trLeader.html(`
          <td style="padding:10px 6px;font-weight:600;color:#0f172a;">
            <div>${escapeHtml(leader.full_name || 'Trưởng nhóm')}</div>
            <div style="font-size:11px;color:#64748b;">${escapeHtml(leader.member_code || '')}</div>
          </td>
          <td style="padding:10px 6px;color:#334155;">${escapeHtml(leader.phone || '')}</td>
          <td style="padding:10px 6px;text-align:center;">
            <span class="status-badge" style="background:#e0f2fe;color:#0369a1;font-size:11px;padding:2px 8px;font-weight:600;">Trưởng nhóm</span>
          </td>
          <td style="padding:10px 6px;text-align:center;">
            <span class="status-badge badge-success" style="font-size:11px;padding:2px 8px;">Đã tham gia</span>
          </td>
          <td style="padding:10px 6px;text-align:right;color:#94a3b8;font-size:12px;">Người đứng tên</td>
        `);

        // Dòng các thành viên chính thức
        if (!acceptedMembers.length) {
          $('<tr style="border-bottom:1px solid #f1f5f9;">')
            .append($('<td colspan="5" style="padding:12px 6px;text-align:center;color:#94a3b8;font-style:italic;">').text('Chưa có thành viên nào khác tham gia nhóm'))
            .appendTo($tbody);
        } else {
          acceptedMembers.forEach(m => {
            const $tr = $('<tr style="border-bottom:1px solid #f1f5f9;">').appendTo($tbody);
            $tr.html(`
              <td style="padding:10px 6px;color:#0f172a;font-weight:500;">
                <div>${escapeHtml(m.full_name || '')}</div>
                <div style="font-size:11px;color:#64748b;">${escapeHtml(m.member_code || '')}</div>
              </td>
              <td style="padding:10px 6px;color:#334155;">${escapeHtml(m.phone || '')}</td>
              <td style="padding:10px 6px;text-align:center;">
                <span class="status-badge" style="background:#f1f5f9;color:#475569;font-size:11px;padding:2px 8px;">Thành viên</span>
              </td>
              <td style="padding:10px 6px;text-align:center;">
                <span class="status-badge badge-success" style="font-size:11px;padding:2px 8px;">Đã tham gia</span>
              </td>
              <td style="padding:10px 6px;text-align:right;" class="row-actions"></td>
            `);
            const $tdActions = $tr.find('.row-actions');
            const delBtn = $('<button type="button" class="btn-action-delete" style="border:none;background:#fee2e2;color:#dc2626;border-radius:4px;padding:4px 8px;font-size:12px;cursor:pointer;" title="Xóa học viên khỏi nhóm">')
              .text('Xóa')
              .appendTo($tdActions);
            delBtn.on('click', async () => {
              if (!window.confirm(`Bạn có chắc chắn muốn xóa học viên "${m.full_name}" khỏi nhóm PT này?`)) return;
              try {
                delBtn.prop('disabled', true).text('Đang xóa...');
                await api().request(`/registrations/${idPath(registrationId)}/group-members/${idPath(m.member_id)}`, { method: 'DELETE' });
                notify('Đã xóa thành viên khỏi nhóm PT thành công');
                await loadGroup();
                if (onUpdated) onUpdated();
              } catch (err) {
                notify(err.message || 'Lỗi khi xóa thành viên', 'error');
                delBtn.prop('disabled', false).text('Xóa');
              }
            });
          });
        }

        // 3. Danh sách lời mời đang chờ phản hồi
        const $pendingSec = section(dialog.body, `Danh sách lời mời đang chờ chấp thuận (${pendingInvitations.length})`);
        if (pendingInvitations.length) {
          const $pTable = $('<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;">').appendTo($pendingSec);
          $pTable.html(`
            <thead>
              <tr style="border-bottom:2px solid #e2e8f0;color:#475569;text-align:left;">
                <th style="padding:8px 6px;">Người nhận lời mời</th>
                <th style="padding:8px 6px;">Số điện thoại</th>
                <th style="padding:8px 6px;text-align:center;">Thời gian gửi</th>
                <th style="padding:8px 6px;text-align:center;">Trạng thái</th>
                <th style="padding:8px 6px;text-align:right;">Thao tác</th>
              </tr>
            </thead>
            <tbody></tbody>
          `);
          const $pBody = $pTable.find('tbody');
          pendingInvitations.forEach(m => {
            const $tr = $('<tr style="border-bottom:1px solid #f1f5f9;background:#fffbeb;">').appendTo($pBody);
            $tr.html(`
              <td style="padding:10px 6px;color:#0f172a;font-weight:500;">
                <div>${escapeHtml(m.full_name || '')}</div>
                <div style="font-size:11px;color:#64748b;">${escapeHtml(m.member_code || '')}</div>
              </td>
              <td style="padding:10px 6px;color:#334155;">${escapeHtml(m.phone || '')}</td>
              <td style="padding:10px 6px;text-align:center;font-size:12px;color:#64748b;">
                ${dateText(m.created_at) || '--'}
              </td>
              <td style="padding:10px 6px;text-align:center;">
                <span class="status-badge badge-warning" style="font-size:11px;padding:2px 8px;font-weight:600;">Chờ chấp thuận</span>
              </td>
              <td style="padding:10px 6px;text-align:right;" class="row-actions"></td>
            `);
            const $tdActions = $tr.find('.row-actions');
            const revokeBtn = $('<button type="button" class="btn-action-revoke" style="border:none;background:#fef3c7;color:#b45309;border-radius:4px;padding:4px 8px;font-size:12px;cursor:pointer;" title="Thu hồi lời mời">')
              .text('Thu hồi')
              .appendTo($tdActions);
            revokeBtn.on('click', async () => {
              if (!window.confirm(`Bạn có chắc chắn muốn thu hồi lời mời tham gia gửi tới "${m.full_name}"?`)) return;
              try {
                revokeBtn.prop('disabled', true).text('Đang thu hồi...');
                await api().request(`/registrations/${idPath(registrationId)}/group-members/${idPath(m.member_id)}`, { method: 'DELETE' });
                notify('Đã thu hồi lời mời tham gia thành công');
                await loadGroup();
                if (onUpdated) onUpdated();
              } catch (err) {
                notify(err.message || 'Lỗi khi thu hồi lời mời', 'error');
                revokeBtn.prop('disabled', false).text('Thu hồi');
              }
            });
          });
        } else {
          $('<div style="font-size:12px;color:#94a3b8;font-style:italic;padding:6px 0 10px;">')
            .text('Hiện không có lời mời nào đang chờ phản hồi.')
            .appendTo($pendingSec);
        }

        // 4. Khu vực Mời thêm học viên vào nhóm
        const $inviteSec = section(dialog.body, 'Mời thêm học viên vào nhóm');
        if (isFull) {
          $('<div style="font-size:12px;color:#64748b;padding:6px 0;">')
            .text(`Nhóm đã đủ ${maxMembers}/${maxMembers} học viên.`)
            .appendTo($inviteSec);
        } else {
          const $inviteForm = $('<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;margin-top:6px;">').appendTo($inviteSec);
          const $memberSelect = $('<div>').appendTo($inviteForm);
          const $options = $('<div style="margin:10px 0 4px;">').appendTo($inviteForm);
          $('<label style="display:inline-flex;align-items:center;gap:8px;font-size:12px;color:#334155;cursor:pointer;">')
            .append('<input type="checkbox" id="autoAcceptChk" style="width:15px;height:15px;accent-color:var(--primary,#237b58);cursor:pointer;">')
            .append('<span>Xác nhận vào nhóm ngay</span>')
            .appendTo($options);

          let selectedMemberId = null;
          $memberSelect.dxSelectBox({
            dataSource: memberStore(),
            valueExpr: 'id',
            displayExpr: m => m ? [m.full_name, m.member_code, m.phone].filter(Boolean).join(' · ') : '',
            searchEnabled: true,
            searchExpr: ['full_name', 'phone', 'member_code'],
            searchTimeout: 250,
            showClearButton: true,
            noDataText: 'Không tìm thấy hội viên phù hợp',
            placeholder: 'Tìm theo SĐT, họ tên hoặc mã HV để mời...',
            onValueChanged: e => { selectedMemberId = e.value; }
          });

          const $actionsRow = $('<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;">').appendTo($inviteForm);
          const inviteBtn = $('<button type="button" id="btnSubmitInvite" class="dx-button dx-button-default dx-button-mode-contained" style="background:var(--primary,#237b58);color:#fff;border-radius:4px;padding:8px 16px;font-weight:600;font-size:12px;cursor:pointer;border:none;">')
            .text('Gửi lời mời tham gia')
            .appendTo($actionsRow);

          $('#autoAcceptChk').on('change', function () {
            const checked = $(this).is(':checked');
            inviteBtn.text(checked ? 'Xác nhận vào nhóm ngay' : 'Gửi lời mời tham gia');
          });

          inviteBtn.on('click', async () => {
            if (!selectedMemberId) {
              notify('Vui lòng chọn một hội viên để mời vào nhóm', 'warning');
              return;
            }
            const autoAccept = $('#autoAcceptChk').is(':checked');
            inviteBtn.prop('disabled', true).text('Đang xử lý...');
            try {
              await api().request(`/registrations/${idPath(registrationId)}/invite-member`, {
                method: 'POST',
                body: { member_id: selectedMemberId, auto_accept: autoAccept }
              });
              notify(autoAccept ? 'Đã thêm học viên vào nhóm PT thành công!' : 'Đã gửi lời mời tham gia nhóm PT tới học viên thành công!');
              await loadGroup();
              if (onUpdated) onUpdated();
            } catch (err) {
              notify(err.message || 'Lỗi khi thực hiện thao tác', 'error');
              const checked = $('#autoAcceptChk').is(':checked');
              inviteBtn.prop('disabled', false).text(checked ? 'Xác nhận vào nhóm ngay' : 'Gửi lời mời tham gia');
            }
          });
        }
      } catch (err) {
        dialog.body.empty();
        errorBlock(dialog.body, err, loadGroup);
      }
    };
    await loadGroup();
  }

  function openCancelModal(r, onCompleted) {
    const dialog = popup(`Hủy đơn đăng ký: ${regCode(r)}`, 460);
    const $error = $('<div>').hide().appendTo(dialog.body);
    $('<div style="margin-bottom:12px;color:#475569;font-size:13px;line-height:1.5;">').html(
      `Bạn có chắc chắn muốn hủy đơn đăng ký <strong>${escapeHtml(regCode(r))}</strong> của hội viên <strong>${escapeHtml(memberName(r))}</strong>?<br>Thao tác này sẽ chuyển đơn sang trạng thái <strong>Đã hủy</strong> và không thể hoàn tác.`
    ).appendTo(dialog.body);

    const model = { reason: 'Khách đổi ý không mua' };
    const items = [
      field('reason', 'Lý do hủy đơn', 'dxTextArea', { height: 80, placeholder: 'Nhập lý do hủy đơn đăng ký...' }, true)
    ];
    const form = $('<div>').appendTo(dialog.body).dxForm({ formData: model, labelLocation: 'top', items }).dxForm('instance');

    formActions(dialog, 'Xác nhận hủy đơn', async () => {
      if (!form.validate().isValid) return;
      form.option('disabled', true);
      try {
        await api().request(`/registrations/${idPath(r.id)}/cancel`, {
          method: 'POST',
          body: { cancel_reason: model.reason }
        });
        notify('Đã hủy đơn đăng ký thành công');
        closeDialog(dialog);
        if (onCompleted) await onCompleted();
      } catch (err) { errorBlock($error, err); }
      finally { if (!dialog.closed) form.option('disabled', false); }
    });
  }

  function openFreezeModal(r, onComplete) {
    if (!r.end_date) {
      notify('Gói tập vô thời hạn không cần đóng băng bảo lưu thời gian.', 'warning');
      return;
    }
    const todayDate = today();
    const expiryDate = day(r.end_date);
    if (!expiryDate || expiryDate <= todayDate) {
      notify('Gói tập đã hết hạn, không thể đóng băng.', 'warning');
      return;
    }

    const maxDaysFromToday = daysBetween(todayDate, expiryDate);
    if (maxDaysFromToday <= 0) {
      notify('Gói tập không còn số ngày hiệu lực để đóng băng.', 'warning');
      return;
    }

    const dialog = popup(`Đóng băng gói: ${packageName(r)}`, 520);
    const $error = $('<div>').hide().appendTo(dialog.body);

    info(dialog.body, 'Hợp đồng', regCode(r));
    info(dialog.body, 'Hội viên', memberName(r));
    info(dialog.body, 'Thời hạn hiện tại', `${dateText(r.start_date)} - ${dateText(r.end_date)}`);

    // Default: Ngày bắt đầu = hôm nay, số ngày mặc định 7 ngày (hoặc tối đa số ngày còn lại nếu < 7)
    const initFreezeDays = Math.min(7, maxDaysFromToday);
    const initReactivateDate = addDays(todayDate, initFreezeDays);

    const model = {
      start_date: todayDate,
      freeze_days: initFreezeDays,
      reactivate_date: initReactivateDate,
      reason: ''
    };

    let isUpdating = false;
    let formInstance = null;

    const items = [
      field('start_date', 'Ngày bắt đầu đóng băng', 'dxDateBox', {
        type: 'date',
        displayFormat: 'dd/MM/yyyy',
        value: todayDate,
        readOnly: true
      }, false),

      field('freeze_days', 'Số ngày tạm dừng / đóng băng', 'dxNumberBox', {
        min: 1,
        max: maxDaysFromToday,
        showSpinButtons: true,
        onValueChanged: (e) => {
          if (isUpdating || !e.value) return;
          isUpdating = true;
          try {
            model.freeze_days = parseInt(e.value, 10) || 1;
            model.reactivate_date = addDays(todayDate, model.freeze_days);
            const reactivateEditor = formInstance?.getEditor('reactivate_date');
            if (reactivateEditor) {
              reactivateEditor.option('value', model.reactivate_date);
            }
          } finally {
            isUpdating = false;
          }
        }
      }, true),

      field('reactivate_date', 'Ngày mở lại dự kiến', 'dxDateBox', {
        type: 'date',
        displayFormat: 'dd/MM/yyyy',
        min: addDays(todayDate, 1),
        max: expiryDate,
        onValueChanged: (e) => {
          if (isUpdating || !e.value) return;
          isUpdating = true;
          try {
            model.reactivate_date = day(e.value);
            const diffDays = daysBetween(todayDate, model.reactivate_date);
            if (diffDays > 0) {
              model.freeze_days = diffDays;
              const daysEditor = formInstance?.getEditor('freeze_days');
              if (daysEditor) {
                daysEditor.option('value', diffDays);
              }
            }
          } finally {
            isUpdating = false;
          }
        }
      }, true),

      field('reason', 'Lý do đóng băng gói', 'dxTextArea', {
        height: 75,
        placeholder: 'Đi công tác, điều trị chấn thương, việc gia đình...'
      }, true)
    ];

    formInstance = $('<div>').appendTo(dialog.body).dxForm({
      formData: model,
      labelLocation: 'top',
      showColonAfterLabel: false,
      items
    }).dxForm('instance');

    formActions(dialog, 'Xác nhận đóng băng', async () => {
      if (!formInstance.validate().isValid) return;
      formInstance.option('disabled', true);
      try {
        await api().request(`/registrations/${idPath(r.id)}/freeze`, {
          method: 'POST',
          body: {
            start_date: dateKey(todayDate),
            freeze_days: model.freeze_days,
            reason: model.reason
          }
        });
        notify(`Đã kích hoạt đóng băng gói tập ${model.freeze_days} ngày!`);
        closeDialog(dialog);
        if (onComplete) await onComplete();
      } catch (err) { errorBlock($error, err); }
      finally { if (!dialog.closed) formInstance.option('disabled', false); }
    });
  }

  function openTransferModal(r, onComplete) {
    const dialog = popup(`Chuyển nhượng gói: ${packageName(r)}`, 520);
    const $error = $('<div>').hide().appendTo(dialog.body);
    info(dialog.body, 'Hợp đồng', regCode(r));
    info(dialog.body, 'Chủ sở hữu hiện tại', `${memberName(r)} (${memberCode(r)})`);

    const model = { to_member_id: null, reason: '' };
    const items = [
      field('to_member_id', 'Hội viên nhận chuyển nhượng', 'dxSelectBox', {
        dataSource: memberStore(), valueExpr: 'id',
        displayExpr: m => m ? `${m.full_name} · ${m.member_code} · ${m.phone}` : '',
        searchEnabled: true, searchExpr: ['full_name', 'phone', 'member_code'],
        placeholder: 'Tìm SĐT hoặc họ tên hội viên nhận...', noDataText: 'Không tìm thấy hội viên'
      }, true),
      field('reason', 'Lý do chuyển nhượng', 'dxTextArea', { height: 80, placeholder: 'Tặng / chuyển quyền sử dụng cho bạn bè/người thân...' })
    ];
    const form = $('<div>').appendTo(dialog.body).dxForm({ formData: model, labelLocation: 'top', items }).dxForm('instance');

    formActions(dialog, 'Xác nhận chuyển nhượng', async () => {
      if (!form.validate().isValid) return;
      form.option('disabled', true);
      try {
        await api().request(`/registrations/${idPath(r.id)}/transfer`, {
          method: 'POST',
          body: { to_member_id: model.to_member_id, reason: model.reason }
        });
        notify('Chuyển nhượng gói tập thành công!');
        closeDialog(dialog);
        if (onComplete) await onComplete();
      } catch (err) { errorBlock($error, err); }
      finally { if (!dialog.closed) form.option('disabled', false); }
    });
  }

  function normalizePayment(p) {
    return { ...p, payment_code: p.receipt_code || p.receipt?.receipt_code || p.payment_code,
      member_name: p.member_name || p.member?.full_name, member_code: p.member_code || p.member?.member_code,
      member_phone: p.member_phone || p.member?.phone, registration_code: regCode(p.registration) || p.registration_code || p.reg_code,
      package_name: p.package_name || p.package_name_snapshot || p.registration?.package_name_snapshot,
      collected_by_name: p.collected_by_name || p.collector_name || p.collected_by_account?.full_name,
      branch_name: p.branch_name || p.branch?.branch_name, event_at: p.confirmed_at || p.created_at };
  }
  async function renderPayments(containerId, context = {}) {
    if (typeof context === 'string') context = { registration_id: context };
    context = context || {};
    const memberId = context.member_id || context.memberId;
    const view = viewRoot(containerId, 'Thu tiền & thanh toán', 'Ghi nhận thanh toán', () => openPaymentModal(null, memberId));
    view.context = context;
    const $stats = $('<div>').addClass('sales-kpi-summary').css({ display: 'grid', minWidth: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(min(190px, 100%), 1fr))', gap: 16, marginBottom: 20, padding: '16px 0', borderBottom: '1px solid var(--border-color, #e5e7eb)' }).insertBefore(view.filters);
    const filters = { from: context.date ? day(context.date) : day(new Date()), to: context.date ? day(context.date) : day(new Date()), q: '', payment_method: '' };
    const schedule = () => { clearTimeout(view.debounce); view.debounce = setTimeout(() => view.reload?.(), 280); };
    view.statValues = ['Tổng thực thu', 'Lượt thanh toán thành công'].map(label => {
      const $cell = $('<div>').css({ minWidth: 0, overflowWrap: 'anywhere', padding: '6px 12px', borderRadius: 8, border: '1px solid transparent' }).appendTo($stats);
      const $label = $('<div>').addClass('text-muted').css({ display: 'flex', alignItems: 'center', gap: 6 }).appendTo($cell);
      $('<span>').text(label).appendTo($label);
      return $('<strong>').css({ display: 'block', marginTop: 8, fontSize: 22, overflowWrap: 'anywhere' }).text('--').appendTo($cell);
    });
    const fromBox = filter(view.filters, 'Từ ngày', 'dxDateBox', {
      type: 'date',
      value: filters.from,
      displayFormat: 'dd/MM/yyyy',
      useMaskBehavior: true,
      showClearButton: true,
      placeholder: 'Từ trước...',
      onValueChanged: e => { filters.from = e.value ? day(e.value) : null; schedule(); }
    });
    const toBox = filter(view.filters, 'Đến ngày', 'dxDateBox', {
      type: 'date',
      value: filters.to,
      displayFormat: 'dd/MM/yyyy',
      useMaskBehavior: true,
      showClearButton: true,
      placeholder: '...đến nay',
      onValueChanged: e => { filters.to = e.value ? day(e.value) : null; schedule(); }
    });
    button(view.filters, 'Toàn thời gian', 'clock', () => {
      fromBox.option('value', null);
      toBox.option('value', null);
      filters.from = null;
      filters.to = null;
      schedule();
    }, false, { hint: 'Bỏ giới hạn ngày (xem tất cả giao dịch từ trước tới nay)', height: 36 });
    button(view.filters, 'Hôm nay', 'event', () => {
      const today = day(new Date());
      fromBox.option('value', today);
      toBox.option('value', today);
      filters.from = today;
      filters.to = today;
      schedule();
    }, false, { hint: 'Xem giao dịch hôm nay', height: 36 });
    filter(view.filters, 'Tìm giao dịch', 'dxTextBox', { mode: 'search', placeholder: 'Mã phiếu, mã ĐK, hội viên, SĐT', valueChangeEvent: 'input', onValueChanged: e => { filters.q = e.value; schedule(); } });
    filter(view.filters, 'Phương thức', 'dxSelectBox', { items: [{ id: '', text: 'Tất cả' }, { id: 'CASH', text: 'Tiền mặt' }, { id: 'BANK_TRANSFER', text: 'Chuyển khoản' }], value: '', valueExpr: 'id', displayExpr: 'text', onValueChanged: e => { filters.payment_method = e.value; schedule(); } });
    iconButton(view.filters, 'Làm mới giao dịch', 'refresh', () => view.reload());
    view.grid = grid(view.panel, [
      { dataField: 'payment_code', caption: 'Mã phiếu', width: 100 },
      { dataField: 'event_at', caption: 'Thời gian', width: 135, customizeText: c => timestamp(c.value) },
      { dataField: 'member_name', caption: 'Hội viên', minWidth: 140, cellTemplate: (el, c) => twoLines(el, c.value, [c.data.member_code, c.data.member_phone].filter(Boolean).join(' · ')) },
      { dataField: 'registration_code', caption: 'Đăng ký', minWidth: 145, cellTemplate: (el, c) => twoLines(el, c.value, value(c.data.package_name)) },
      { caption: 'Phương thức', calculateCellValue: method, width: 110 },
      { dataField: 'amount', caption: 'Số tiền', alignment: 'right', width: 115, cellTemplate: (el, c) => $('<strong>').css('color', '#237b58').text(money(c.value)).appendTo(el) },
      { dataField: 'collected_by_name', caption: 'Người thu', width: 110 },
      { dataField: 'branch_name', caption: 'Chi nhánh', width: 140 },
      { caption: 'Thao tác', width: 165, fixed: true, fixedPosition: 'right', alignment: 'center', cellTemplate(el, c) {
        const $actions = $('<div>').css({ display: 'flex', justifyContent: 'center', alignItems: 'center' }).appendTo(el);
        button($actions, 'Xuất phiếu thu', 'doc', () => openReceipt(c.data), false, { stylingMode: 'outlined', type: 'default', height: 28, elementAttr: { style: 'font-size: 11px; font-weight: 600;' } });
      } }
    ]);
    view.reload = async () => {
      if (!alive(view)) return;
      const generation = ++view.generation;
      if (filters.from && filters.to && day(filters.from) > day(filters.to)) {
        view.grid.endCustomLoading(); view.grid.option('dataSource', []); view.statValues.forEach(v => v.text('--'));
        errorBlock(view.error, new Error('Chọn khoảng ngày hợp lệ: Từ ngày không được sau Đến ngày.')); return;
      }
      view.error.hide(); view.grid.beginCustomLoading('Đang tải...'); view.statValues.forEach(v => v.text('--'));
      try {
        const queryParams = { member_id: memberId };
        if (filters.from) queryParams.date_from = dateKey(filters.from);
        if (filters.to) queryParams.date_to = dateKey(filters.to);
        const payments = await allRows('/payments', queryParams);
        if (!alive(view) || generation !== view.generation) return;
        const q = (filters.q || '').trim().toLocaleLowerCase('vi');
        const dateScopedPayments = payments.map(normalizePayment).filter(p => {
          const d = dateKey(p.event_at);
          const fromOk = !filters.from || (d && d >= dateKey(filters.from));
          const toOk = !filters.to || (d && d <= dateKey(filters.to));
          return (!memberId || p.member_id === memberId) && fromOk && toOk;
        });
        const rows = dateScopedPayments.filter(p => {
          return (!filters.payment_method || (filters.payment_method === 'CASH' ? p.payment_method === 'CASH' : ['BANK_TRANSFER', 'BANK_TRANSFER_VIETQR'].includes(p.payment_method))) && (!q || [p.payment_code, p.registration_code, p.member_name, p.member_phone].some(v => String(v || '').toLocaleLowerCase('vi').includes(q)));
        });
        view.records = rows;
        view.grid.option('dataSource', rows);
        view.statValues[0].text(money(rows.reduce((sum, p) => sum + Number(p.amount), 0)));
        view.statValues[1].text(`${rows.length} lượt`);
      } catch (err) { if (alive(view) && generation === view.generation) { view.grid.option('dataSource', []); view.statValues.forEach(v => v.text('--')); errorBlock(view.error, err, view.reload); } }
      finally { if (alive(view) && generation === view.generation) view.grid.endCustomLoading(); }
    };
    await view.reload();
    view.timer = setInterval(() => { if (!alive(view)) clearInterval(view.timer); else if (!document.hidden && !dialogs.size) view.reload(); }, 30000);
    const registrationId = context.registration_id || context.registrationId;
    if (alive(view) && (registrationId || context.action === 'create')) await openPaymentModal(registrationId, memberId);
  }
  function refreshCurrent() { if (currentView && alive(currentView)) return currentView.reload?.(); }

  async function checkPayment(payment, control, afterConfirmed) {
    control?.option('disabled', true);
    try {
      const result = dataOf(await api().request(`/payments/${idPath(payment.id)}/check-bank-status`, { method: 'POST' }));
      const updated = result.payment || result;
      const resId = updated.id || updated.payment_id;
      if (resId && resId !== payment.id) {
        throw new Error('Phản hồi đối soát không khớp giao dịch đang kiểm tra.');
      }
      if (confirmed(updated) || updated.is_paid || updated.status === 'COMPLETED') {
        notify('Đã ghi nhận thanh toán 100%');
        refreshCurrent();
        if (afterConfirmed) await afterConfirmed(updated.id ? updated : { ...payment, ...updated, status: 'COMPLETED' });
      }
      else if (updated.status === 'EXPIRED') { notify('Giao dịch đã hết hạn thanh toán', 'warning'); refreshCurrent(); }
      else notify('Chưa ghi nhận tiền vào tài khoản ngân hàng. Vui lòng đợi SePay đồng bộ hoặc kiểm tra lại.', 'warning');
    } catch (err) { notify(err.message || 'Không kiểm tra được trạng thái thanh toán', 'error'); }
    finally { control?.option('disabled', false); }
  }
  async function openManualConfirmation(payment, afterConfirmed, initialNote = payment.note || '') {
    const dialog = popup('Xác nhận đối chiếu thanh toán', 540);
    const $error = $('<div>').hide().appendTo(dialog.body);
    info(dialog.body, 'Giao dịch', payment.payment_code || payment.id);
    info(dialog.body, 'Số tiền', money(payment.amount)); info(dialog.body, 'Phương thức', method(payment));
    const model = { transaction_ref: '', note: initialNote, reconciled: false };
    const items = [];
    if (payment.payment_method !== 'CASH') items.push(field('transaction_ref', 'Mã giao dịch trên chứng từ ngân hàng', 'dxTextBox', { maxLength: 100 }));
    items.push(field('note', 'Ghi chú đối soát', 'dxTextArea', { maxLength: 255, height: 80 }));
    items.push(field('reconciled', 'Đối chiếu thực thu', 'dxCheckBox', { text: `Đã đối chiếu và nhận đủ ${money(payment.amount)}` }));
    const form = $('<div>').appendTo(dialog.body).dxForm({ formData: model, labelLocation: 'top', items }).dxForm('instance');
    formActions(dialog, 'Xác nhận đã nhận đủ tiền', async () => {
      if (!form.validate().isValid) return;
      if (!model.reconciled) { errorBlock($error, new Error('Cần xác nhận đã đối chiếu và nhận đủ số tiền.')); return; }
      form.option('disabled', true);
      try {
        const result = dataOf(await api().payments.confirm(payment.id, { transaction_ref: model.transaction_ref.trim() || undefined, note: model.note, manual_confirmation: true }));
        if (!confirmed(result.payment || result)) throw new Error('Chưa có xác nhận thanh toán thành công từ hệ thống.');
        notify('Đã ghi nhận thanh toán 100%'); closeDialog(dialog); refreshCurrent();
        if (afterConfirmed) await afterConfirmed(result.payment || result); else await openReceipt(result.payment || payment);
      } catch (err) { if (!dialog.closed) errorBlock($error, err); }
      finally { if (!dialog.closed) form.option('disabled', false); }
    });
  }

  async function openPaymentModal(registrationId = null, memberId = null) {
    const dialog = popup('Ghi nhận thanh toán', 680);
    loading(dialog.body);
    const init = async () => {
      try {
        const [registrations, discountRows] = await Promise.all([
          allRows('/registrations', { status: 'PENDING_PAYMENT', member_id: memberId }),
          allRows('/discounts').catch(() => [])
        ]);
        if (dialog.closed) return;
        dialog.body.empty();
        const $error = $('<div>').hide().appendTo(dialog.body);
        const membersMap = new Map();
        registrations.forEach(r => {
          if (!membersMap.has(r.member_id)) {
            membersMap.set(r.member_id, {
              id: r.member_id,
              member_name: memberName(r),
              member_code: memberCode(r),
              member_phone: memberPhone(r),
              reg_codes: [regCode(r)].filter(Boolean),
              display: [memberName(r), memberCode(r), memberPhone(r)].filter(Boolean).join(' · ')
            });
          } else {
            const existing = membersMap.get(r.member_id);
            const code = regCode(r);
            if (code && !existing.reg_codes.includes(code)) existing.reg_codes.push(code);
          }
        });
        const members = Array.from(membersMap.values()).map(m => ({
          ...m,
          search_text: [m.member_name, m.member_code, m.member_phone, ...m.reg_codes].filter(Boolean).join(' ')
        }));

        const getPackagesForMember = memId => {
          if (!memId) return [];
          return registrations.filter(r => r.member_id === memId);
        };

        const targetReg = registrations.find(r => r.id === registrationId);
        const initialMemberId = targetReg ? targetReg.member_id : (memberId || (members.length === 1 ? members[0].id : null));
        const initialRegId = targetReg ? targetReg.id : (initialMemberId && getPackagesForMember(initialMemberId).length === 1 ? getPackagesForMember(initialMemberId)[0].id : null);

        const model = {
          member_id: initialMemberId,
          registration_id: initialRegId,
          payment_method: 'BANK_TRANSFER',
          discount_code: '',
          note: ''
        };
        const chosen = () => registrations.find(r => r.id === model.registration_id);
        const invoices = new Map();
        let invoice = null, revision = 0, form, submit, pollBusy = false;
        const $form = $('<div>').appendTo(dialog.body);
        const $qr = $('<div>').hide().css({ paddingTop: 16, textAlign: 'center' }).appendTo(dialog.body);
        const complete = async p => { if (dialog.closed) return; closeDialog(dialog); notify('Thanh toán VietQR thành công! Đã kích hoạt gói tập.', 'success'); refreshCurrent(); openPaymentSuccessModalAdmin(p); };

        const todayStr = dateKey(new Date());
        const activeDiscounts = (discountRows || []).filter(d => {
          if (d.is_active === false) return false;
          if (d.start_date && dateKey(d.start_date) > todayStr) return false;
          if (d.end_date && dateKey(d.end_date) < todayStr) return false;
          if (d.usage_limit != null && d.used_count >= d.usage_limit) return false;
          return true;
        });

        const getDiscountsFor = reg => {
          if (!reg) return activeDiscounts;
          return activeDiscounts.filter(d => !d.branch_id || d.branch_id === reg.sold_branch_id);
        };

        async function applyDiscount(code, manual = false) {
          const r = chosen();
          if (!r) {
            if (code && manual) notify('Vui lòng chọn đơn đăng ký trước', 'warning');
            return;
          }
          const cleanCode = (code || '').trim().toUpperCase();
          if (!cleanCode) {
            if (model.discount_code) {
              model.discount_code = '';
              invoices.clear();
              form?.getEditor('amount_preview')?.option('value', money(r.price_snapshot));
              notify('Đã hủy áp dụng mã giảm giá', 'info');
              await update();
            }
            return;
          }
          if (model.discount_code === cleanCode && !manual) return;
          try {
            const res = await api().request('/discounts/validate', {
              method: 'POST',
              body: { code: cleanCode, order_amount: r.price_snapshot, branch_id: r.sold_branch_id }
            });
            const disc = res.data;
            const title = disc.title || disc.discount?.title || cleanCode;
            notify(`Áp dụng thành công: ${title} (-${money(disc.discount_amount)})`, 'success');
            invoices.clear();
            model.discount_code = cleanCode;
            form?.getEditor('amount_preview')?.option('value', `${money(disc.final_amount)} (Đã giảm ${money(disc.discount_amount)})`);
            await update();
          } catch (err) {
            notify(err.message || 'Mã giảm giá không hợp lệ', 'error');
            model.discount_code = '';
            form?.getEditor('amount_preview')?.option('value', money(r.price_snapshot));
          }
        }

        async function getInvoice() {
          const r = chosen();
          if (!r) throw new Error('Chọn đơn đăng ký chờ thanh toán.');
          const key = `${r.id}:${model.payment_method}:${model.discount_code || ''}`;
          if (!invoices.has(key)) {
            const promise = api().payments.createInvoice({ registration_id: r.id, payment_method: model.payment_method, discount_code: model.discount_code?.trim() || undefined, note: model.note, branch_id: r.sold_branch_id }).then(dataOf);
            invoices.set(key, promise);
            promise.catch(() => invoices.delete(key));
          }
          const result = await invoices.get(key);
          if (!result?.payment?.id || result.payment.registration_id !== r.id) throw new Error('Giao dịch không khớp đăng ký hoặc số tiền phải thu. Vui lòng tải lại.');
          return result;
        }
        const update = async () => {
          if (!form || !submit) return;
          const token = ++revision, r = chosen();
          invoice = null; $error.hide(); $qr.empty().toggle(model.payment_method === 'BANK_TRANSFER');
          if (!model.discount_code) {
            form.getEditor('amount_preview')?.option('value', r ? money(r.price_snapshot) : '--');
          }
          submit.option({ text: model.payment_method === 'CASH' ? 'Xác nhận đã thu đủ tiền mặt' : 'Kiểm tra thanh toán', disabled: !r });
          if (!r || model.payment_method !== 'BANK_TRANSFER') return;
          loading($qr); submit.option('disabled', true);
          try {
            const result = await getInvoice();
            if (dialog.closed || token !== revision) return;
            invoice = result.payment; $qr.empty();
            if (confirmed(invoice)) { await complete(invoice); return; }
            const qr = result.vietqr || result.qr_data;
            const source = qr?.qrImageUrl || qr?.qr_image_url;
            if (!source || !/^https:\/\//i.test(source)) throw new Error('Chưa có mã VietQR hợp lệ từ ngân hàng.');
            $('<img>').attr({ src: source, alt: 'Mã VietQR thanh toán', width: 220, height: 220 }).css({ maxWidth: '100%', objectFit: 'contain', margin: '0 auto', display: 'block', borderRadius: '8px', border: '1px solid #dfe6e2' }).on('error', () => errorBlock($error, new Error('Không tải được ảnh VietQR. Vui lòng thử lại.'), update)).appendTo($qr);
            const bankDisplay = (qr.bankBin === '970415' || qr.bank_bin === '970415') ? 'VietinBank (970415)' : (qr.bankName || qr.bank_name || qr.bankBin);
            info($qr, 'Ngân hàng', bankDisplay);
            info($qr, 'Số tài khoản', qr.accountNo || qr.account_no);
            info($qr, 'Chủ tài khoản', qr.accountName || qr.account_name);
            info($qr, 'Số tiền', money(invoice.amount)).css({ fontWeight: 700, color: '#237b58' });
            info($qr, 'Nội dung chuyển khoản', qr.transferContent || qr.transfer_content || qr.paymentCode).css({ fontWeight: 600, color: '#185740' });
            if (invoice.expires_at) info($qr, 'Hạn thanh toán', timestamp(invoice.expires_at));
            badge($qr, invoice.status, true);
            if (invoice.status === 'PENDING') button($qr, 'Đối chiếu thủ công', 'check', () => openManualConfirmation(invoice, complete, model.note));
          } catch (err) { if (!dialog.closed && token === revision) errorBlock($qr, err, update); }
          finally { if (!dialog.closed && token === revision) submit.option('disabled', !invoice || invoice.status === 'EXPIRED'); }
        };
        form = $form.dxForm({ formData: model, labelLocation: 'top', showRequiredMark: true, items: [
          {
            dataField: 'member_id',
            label: { text: 'Hội viên cần thanh toán' },
            editorType: 'dxSelectBox',
            editorOptions: {
              dataSource: members,
              valueExpr: 'id',
              displayExpr: 'display',
              searchEnabled: true,
              searchExpr: ['member_name', 'member_code', 'member_phone', 'search_text'],
              placeholder: 'Tìm SĐT, họ tên hoặc mã hội viên...',
              noDataText: 'Không tìm thấy hội viên có đơn chờ thanh toán',
              showClearButton: true,
              onValueChanged: e => {
                model.member_id = e.value;
                const memRegs = getPackagesForMember(e.value);
                const regEditor = form?.getEditor('registration_id');
                regEditor?.option('dataSource', memRegs);
                if (memRegs.length === 1) {
                  regEditor?.option('value', memRegs[0].id);
                } else if (!memRegs.some(r => r.id === model.registration_id)) {
                  regEditor?.option('value', null);
                }
                update();
              }
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn hội viên.' }]
          },
          {
            dataField: 'registration_id',
            label: { text: 'Gói tập đăng ký chờ thanh toán' },
            editorType: 'dxSelectBox',
            editorOptions: {
              dataSource: getPackagesForMember(model.member_id),
              valueExpr: 'id',
              displayExpr: r => r ? `${value(regCode(r))} · ${value(packageName(r))} (${money(r.price_snapshot)})` : '',
              searchEnabled: true,
              searchExpr: ['registration_code', 'package_name', 'package_name_snapshot'],
              placeholder: 'Chọn gói tập cần thanh toán...',
              noDataText: 'Hội viên này chưa có đơn đăng ký chờ thanh toán',
              itemTemplate: r => {
                const $row = $('<div>').css({ padding: '4px 0' });
                $('<div>').css({ fontWeight: 600, color: '#185740' }).text(`${value(regCode(r))} · ${value(packageName(r))}`).appendTo($row);
                $('<div>').css({ fontSize: 12, color: '#64748b', display: 'flex', justifyContent: 'space-between', marginTop: 2 })
                  .append($('<span>').text(`Kỳ: ${r.end_date ? dateText(r.start_date) + ' - ' + dateText(r.end_date) : 'Từ ' + dateText(r.start_date)}`))
                  .append($('<strong>').css({ color: '#237b58' }).text(money(r.price_snapshot)))
                  .appendTo($row);
                return $row;
              },
              onValueChanged: e => {
                model.registration_id = e.value;
                model.discount_code = '';
                invoices.clear();
                const discountEditor = form?.getEditor('discount_code');
                if (discountEditor) {
                  discountEditor.option('dataSource', getDiscountsFor(chosen()));
                  discountEditor.option('value', null);
                }
                update();
              }
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn gói tập cần thanh toán.' }]
          },
          field('amount_preview', 'Số tiền thanh toán 100%', 'dxTextBox', { readOnly: true }),
          {
            dataField: 'discount_code', label: { text: 'Mã giảm giá / Voucher (nếu có)' },
            editorType: 'dxSelectBox',
            editorOptions: {
              dataSource: getDiscountsFor(chosen()),
              valueExpr: 'code',
              displayExpr: d => typeof d === 'string' ? d : d ? `${d.code} - ${d.title} (${d.discount_type === 'PERCENT' ? 'Giảm ' + d.discount_value + '%' : 'Giảm ' + money(d.discount_value)})` : '',
              searchEnabled: true,
              searchExpr: ['code', 'title'],
              acceptCustomValue: true,
              showClearButton: true,
              placeholder: 'Chọn mã giảm giá từ danh sách hoặc nhập mã...',
              noDataText: 'Không có mã giảm giá khả dụng',
              itemTemplate: item => {
                const $row = $('<div style="display:flex; justify-content:space-between; align-items:center; padding:5px 0; width:100%; border-bottom:1px solid #f0f3f1;">');
                const $left = $('<div>');
                $('<strong style="color:#237b58; font-size:13px;">').text(item.code).appendTo($left);
                $('<span style="color:#374151; font-size:12px; margin-left:8px;">').text(item.title).appendTo($left);
                const subDetails = [];
                if (item.min_order_value > 0) subDetails.push(`Đơn tối thiểu: ${money(item.min_order_value)}`);
                if (item.branch_name) subDetails.push(`CN: ${item.branch_name}`);
                if (subDetails.length) {
                  $('<div style="font-size:11px; color:#6b7280; margin-top:2px;">').text(subDetails.join(' · ')).appendTo($left);
                }
                $left.appendTo($row);
                $('<span class="status-badge badge-success" style="font-size:11px; font-weight:600; white-space:nowrap; margin-left:12px;">')
                  .text(item.discount_type === 'PERCENT' ? `Giảm ${item.discount_value}%` : `Giảm ${money(item.discount_value)}`)
                  .appendTo($row);
                return $row;
              },
              onCustomItemCreating: e => {
                if (!e.text) return;
                const code = e.text.trim().toUpperCase();
                e.customItem = { code, title: 'Mã tùy nhập' };
              },
              onValueChanged: async e => {
                await applyDiscount(e.value);
              },
              buttons: [
                'clear',
                'dropDown',
                {
                  name: 'apply', location: 'after',
                  options: {
                    icon: 'check', text: 'Áp dụng', type: 'default', stylingMode: 'contained',
                    onClick: async () => {
                      const code = form.getEditor('discount_code')?.option('value');
                      await applyDiscount(code, true);
                    }
                  }
                }
              ]
            }
          },
          field('payment_method', 'Phương thức thanh toán', 'dxRadioGroup', { items: [{ id: 'CASH', text: 'Tiền mặt' }, { id: 'BANK_TRANSFER', text: 'Chuyển khoản' }], valueExpr: 'id', displayExpr: 'text', layout: 'horizontal' }, true),
          field('note', 'Ghi chú giao dịch', 'dxTextArea', { maxLength: 255, height: 76 })
        ], onFieldDataChanged(e) {
          if (e.dataField === 'member_id') {
            const memRegs = getPackagesForMember(e.value);
            const regEditor = form?.getEditor('registration_id');
            regEditor?.option('dataSource', memRegs);
            if (memRegs.length === 1) {
              regEditor?.option('value', memRegs[0].id);
            } else if (!memRegs.some(r => r.id === model.registration_id)) {
              regEditor?.option('value', null);
            }
            update();
          } else if (e.dataField === 'registration_id') {
            model.discount_code = '';
            const discountEditor = form?.getEditor('discount_code');
            if (discountEditor) {
              discountEditor.option('dataSource', getDiscountsFor(chosen()));
              discountEditor.option('value', null);
            }
            update();
          } else if (e.dataField === 'payment_method') {
            update();
          }
        } }).dxForm('instance');
        submit = formActions(dialog, 'Xác nhận đã thu đủ tiền mặt', async () => {
          if (!form.validate().isValid) return;
          if (model.payment_method === 'BANK_TRANSFER') {
            if (invoice && invoice.status !== 'EXPIRED') await checkPayment(invoice, null, complete);
            return;
          }
          form.option('disabled', true);
          try {
            const result = await getInvoice(); invoice = result.payment;
            if (confirmed(invoice)) { await complete(invoice); return; }
            const confirmation = dataOf(await api().payments.confirm(invoice.id, { note: model.note, manual_confirmation: true }));
            if (!confirmed(confirmation.payment || confirmation)) throw new Error('Chưa nhận được xác nhận thanh toán thành công.');
            notify('Đã ghi nhận thanh toán 100%'); await complete(confirmation.payment || invoice);
          } catch (err) { if (!dialog.closed) errorBlock($error, err); }
          finally { if (!dialog.closed) form.option('disabled', false); }
        });
        await update();
        if (!registrations.length) errorBlock($error, new Error('Không tìm thấy đơn đăng ký chờ thanh toán phù hợp'));
        if (registrationId && !model.registration_id) errorBlock($error, new Error('Đơn đăng ký đã thanh toán hoặc không thuộc phạm vi chi nhánh hiện tại.'));
        dialog.timer = setInterval(async () => {
          if (dialog.closed || pollBusy || document.hidden || !invoice || model.payment_method !== 'BANK_TRANSFER' || confirmed(invoice)) return;
          pollBusy = true;
          const expected = invoice.id;
          try {
            const response = dataOf(await api().request(`/payments/${idPath(expected)}/check-bank-status`, { method: 'POST' }).catch(() => api().request(`/payments/${idPath(expected)}`)));
            const latest = response.payment || response;
            const isCompleted = confirmed(latest) || response.is_paid || response.status === 'COMPLETED';
            if (!dialog.closed && isCompleted) {
              const settledId = response.payment_id || latest?.payment_id || latest?.id || invoice.id;
              const paymentObj = { ...invoice, ...latest, ...response, id: settledId, payment_id: settledId, status: 'COMPLETED' };
              await complete(paymentObj);
            } else if (!dialog.closed && (latest?.status === 'EXPIRED' || response.status === 'EXPIRED')) {
              invoice = latest;
              submit.option('disabled', true);
              errorBlock($qr, new Error('Giao dịch đã hết hạn. Đóng và mở lại thanh toán để tạo mã mới.'));
              clearInterval(dialog.timer);
            }
          } catch (err) { if (!dialog.closed) errorBlock($error, err); }
          finally { pollBusy = false; }
        }, 2000);
      } catch (err) { if (!dialog.closed) errorBlock(dialog.body, err, init); }
    };
    await init();
  }

  function openPaymentSuccessModalAdmin(payment) {
    const dialog = popup('Thanh toán thành công', 480);
    const $b = dialog.body;
    $b.css({ textAlign: 'center', padding: '16px 8px' });
    $b.html(`
      <div style="margin-bottom:16px;">
        <div style="width:72px;height:72px;background:#eaf4ee;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 12px auto;box-shadow:0 4px 14px rgba(35,123,88,0.2);">
          <i class="dx-icon-check" style="font-size:42px;color:#237b58;"></i>
        </div>
        <h2 style="margin:0 0 6px 0;font-size:20px;font-weight:700;color:#185740;text-transform:uppercase;letter-spacing:0.5px;">Thanh toán thành công!</h2>
        <p class="text-muted" style="margin:0;font-size:13px;color:#5a6e65;">Giao dịch đã được ghi nhận và gói tập đã kích hoạt thành công.</p>
      </div>

      <div style="background:#f8faf9;border:1px solid #dfe6e2;border-radius:10px;padding:12px 16px;text-align:left;margin-bottom:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #dfe6e2;">
          <span class="text-muted" style="font-size:13px;">Gói tập:</span>
          <strong style="font-size:14px;color:#1c2d27;text-align:right;">${escapeHtml(payment.package_name || payment.package_name_snapshot || '--')}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #dfe6e2;">
          <span class="text-muted" style="font-size:13px;">Số tiền:</span>
          <strong style="font-size:18px;color:#237b58;">${money(payment.amount)}</strong>
        </div>
        ${(payment.receipt_code || payment.receipt?.receipt_code) ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #dfe6e2;">
          <span class="text-muted" style="font-size:13px;">Mã phiếu thu:</span>
          <span class="status-badge badge-success" style="font-weight:700;">${escapeHtml(payment.receipt_code || payment.receipt?.receipt_code)}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding-bottom:8px;border-bottom:1px dashed #dfe6e2;">
          <span class="text-muted" style="font-size:13px;">Hình thức:</span>
          <span style="font-size:13px;font-weight:500;">${method(payment)} (Tự động)</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="text-muted" style="font-size:13px;">Thời gian:</span>
          <span style="font-size:12px;color:#5a6e65;">${timestamp(payment.confirmed_at || new Date())}</span>
        </div>
      </div>

      <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">
        <div id="btnAdminSuccessReceipt"></div>
        <div id="btnAdminSuccessClose"></div>
      </div>
    `);

    button($b.find('#btnAdminSuccessReceipt'), 'In phiếu thu', 'print', () => {
      closeDialog(dialog);
      openReceipt(payment);
    }, false);

    button($b.find('#btnAdminSuccessClose'), 'Hoàn tất', 'check', () => {
      closeDialog(dialog);
    }, true);
  }

  async function openReceipt(payment) {
    const dialog = popup('Phiếu thu', 620);
    const load = async () => {
      loading(dialog.body);
      try {
        const response = dataOf(await api().payments.getReceipt(payment.id)), receipt = response.receipt || response;
        if (!receipt?.receipt_code || receipt.amount === undefined) throw new Error('Chưa có phiếu thu hợp lệ cho giao dịch này.');
        let registration = response.registration || payment.registration;
        if (!registration && payment.registration_id) registration = dataOf(await api().registrations.getById(payment.registration_id));
        if (dialog.closed) return;
        dialog.body.empty();
        const $paper = $('<article>').addClass('sales-receipt').appendTo(dialog.body);
        $('<h3>').text('PARADISE GYM').css({ fontSize: 18, marginTop: 0 }).appendTo($paper);
        $('<h4>').text('PHIẾU THU').appendTo($paper);
        info($paper, 'Số phiếu', receipt.receipt_code); info($paper, 'Thời gian', timestamp(receipt.issued_at));
        info($paper, 'Người nộp tiền', receipt.payer_name); info($paper, 'Số điện thoại', receipt.payer_phone);
        info($paper, 'Đăng ký', regCode(registration) || receipt.registration_code || receipt.reg_code || payment.registration_code || payment.reg_code);
        info($paper, 'Gói tập', (registration && packageName(registration)) || receipt.package_name_snapshot || payment.package_name || payment.package_name_snapshot);
        if (registration) info($paper, 'Kỳ hiệu lực', registration.end_date ? `${dateText(registration.start_date)} - ${dateText(registration.end_date)}` : `Từ ${dateText(registration.start_date)} (Vô thời hạn)`);
        info($paper, 'Phương thức', method(response.payment || (receipt.payment_method ? receipt : payment)));
        info($paper, 'Mã giao dịch', response.payment?.transaction_ref || receipt.transaction_ref || payment.transaction_ref);
        info($paper, 'Người thu', receipt.issued_by_name || payment.collected_by_name);
        info($paper, 'Chi nhánh', receipt.branch_name || payment.branch_name || registration?.sold_branch?.branch_name || registration?.sold_branch_name);
        info($paper, 'Thực thu 100%', money(receipt.amount)).css({ fontWeight: 700, color: '#237b58' });
        if (receipt.note) info($paper, 'Ghi chú', receipt.note);
        const $actions = $('<div>').css({ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }).appendTo(dialog.body);
        button($actions, 'Đóng', 'close', () => closeDialog(dialog));
        button($actions, 'Xuất / In phiếu thu', 'print', () => printReceipt($paper), true);
      } catch (err) { if (!dialog.closed) errorBlock(dialog.body, err, load); }
    };
    await load();
  }
  function printReceipt($paper) {
    const frame = document.createElement('iframe');
    frame.title = 'Bản in phiếu thu'; frame.style.cssText = 'position:fixed;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open(); doc.write('<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu thu Paradise Gym</title><style>body{font:14px Arial,sans-serif;color:#18181b;padding:20px}article{max-width:650px;margin:auto}h3,h4{text-align:center}@page{margin:15mm}</style></head><body></body></html>'); doc.close();
    doc.body.appendChild($paper[0].cloneNode(true));
    frame.contentWindow.addEventListener('afterprint', () => frame.remove(), { once: true });
    frame.contentWindow.focus(); frame.contentWindow.print();
    setTimeout(() => frame.remove(), 60000);
  }
  async function render(containerId, context = {}, memberId = null, packageId = null) {
    if (typeof context === 'string') return renderPayments(containerId, { registration_id: context, member_id: memberId });
    if (memberId || packageId) return renderRegistrations(containerId, { member_id: memberId, package_id: packageId, action: 'create' });
    if (window.ParadiseApp?.getCurrentMenu?.() === 'payments') return renderPayments(containerId, context || {});
    return renderRegistrations(containerId, context || {});
  }
  return {
    render, renderRegistrations, renderPayments, openRegistrationModal, openRegistrationDetail, openAssignment,
    openGroupMembersModal, openFreezeModal,
    openPaymentModal, openReceipt, openManualConfirmation, dispose, refresh: refreshCurrent,
    loadRegistrationForPayment: openPaymentModal,
    resetSaleForm: () => openRegistrationModal()
  };
})();
