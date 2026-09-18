/** W04 registrations and W08 payments. Business records always come from REST. */
window.SalesModule = (function () {
  'use strict';

  const registrationStatuses = {
    PENDING_PAYMENT: 'Chờ thanh toán', ACTIVE: 'Đang hiệu lực', SCHEDULED: 'Chưa đến ngày hiệu lực',
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

  function day(input) {
    if (!input) return null;
    if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : new Date(input.getFullYear(), input.getMonth(), input.getDate());
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(input));
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
    const $badge = $('<span>').addClass(`status-badge badge-${tone}`).text((payment ? paymentStatuses : registrationStatuses)[status] || value(status)).appendTo($parent);
    if (status === 'EXPIRED') $badge.css({ background: '#f4f4f5', color: '#52525b', borderColor: '#a1a1aa' });
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
    return { ...r, registration_code: regCode(r), member_name: memberName(r), member_code: memberCode(r), member_phone: memberPhone(r), package_name: packageName(r) };
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
        return matches && (!memberId || r.member_id === memberId) && (!state || (state === 'EXPIRING' ? expiring(r) : r.status === state)) && (!assignment || (assignment === 'unassigned' ? hasPT(r) && !r.assigned_pt_id : !!r.assigned_pt_id));
      });
      view.grid.option('dataSource', filtered);
    };
    controls.q = filter(view.filters, 'Tìm đăng ký', 'dxTextBox', { placeholder: 'Mã ĐK, hội viên, SĐT, tên gói', mode: 'search', valueChangeEvent: 'input', onValueChanged: () => view.grid && apply() });
    controls.status = filter(view.filters, 'Trạng thái', 'dxSelectBox', { items: [{ id: '', text: 'Tất cả' }, ...Object.entries(registrationStatuses).map(([id, text]) => ({ id, text }))], value: Object.prototype.hasOwnProperty.call(registrationStatuses, context.status) ? context.status : '', valueExpr: 'id', displayExpr: 'text', onValueChanged: () => view.grid && apply() });
    controls.assignment = filter(view.filters, 'Tình trạng gán PT', 'dxSelectBox', { items: [{ id: '', text: 'Tất cả' }, { id: 'unassigned', text: 'Chưa gán PT' }, { id: 'assigned', text: 'Đã gán PT' }], value: '', valueExpr: 'id', displayExpr: 'text', onValueChanged: () => view.grid && apply() });
    button(view.filters, 'Đặt lại', 'revert', () => Object.values(controls).forEach(c => c.option('value', '')));
    iconButton(view.filters, 'Làm mới danh sách đăng ký', 'refresh', () => view.reload());
    view.grid = grid(view.panel, [
      { dataField: 'registration_code', caption: 'Mã', minWidth: 95, customizeText: c => value(c.value) },
      { dataField: 'member_name', caption: 'Hội viên', minWidth: 170, cellTemplate: (el, c) => twoLines(el, c.value, [memberCode(c.data), c.data.member_home_branch_name || c.data.member_branch_name].filter(Boolean).join(' · ')) },
      { dataField: 'package_name', caption: 'Gói đăng ký', minWidth: 180 },
      { caption: 'Kỳ hiệu lực', minWidth: 160, calculateCellValue: r => `${dateText(r.start_date)} - ${dateText(r.end_date)}` },
      { dataField: 'price_snapshot', caption: 'Số tiền', alignment: 'right', minWidth: 130, customizeText: c => money(c.value) },
      { caption: 'PT phụ trách', minWidth: 155, calculateCellValue: ptName },
      { dataField: 'status', caption: 'Trạng thái', minWidth: 130, cellTemplate: (el, c) => badge(el, c.value) },
      { caption: 'Thao tác', width: 185, fixed: true, fixedPosition: 'right', cellTemplate(el, c) {
        const $actions = $('<div>').css({ display: 'flex', gap: 3, flexWrap: 'wrap' }).appendTo(el);
        iconButton($actions, 'Chi tiết đăng ký', 'info', () => openRegistrationDetail(c.data.id));
        if (hasPT(c.data) && !c.data.assigned_pt_id && c.data.status !== 'CANCELLED') button($actions, 'Gán PT', 'user', () => openAssignment(c.data.id));
        if (['ACTIVE', 'EXPIRED', 'EXPIRING', 'SCHEDULED'].includes(c.data.status)) button($actions, 'Gia hạn', 'repeat', () => openRegistrationModal({ renewalId: c.data.id }));
        if (c.data.status === 'PENDING_PAYMENT') button($actions, 'Thu tiền', 'money', () => openPaymentModal(c.data.id), true);
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
        const start = old ? addDays(day(old.end_date) >= today ? old.end_date : today, 1) : today;
        const selectedPackageId = old ? old.package_id : options.packageId;
        const model = { member_id: old?.member_id || member?.id || null, package_id: activePackages.some(p => p.id === selectedPackageId) ? selectedPackageId : null, start_date: start };
        const $error = $('<div>').hide().appendTo(dialog.body);
        let form;
        const update = () => {
          const pkg = activePackages.find(p => p.id === model.package_id);
          form?.getEditor('end_preview')?.option('value', pkg ? dateText(addDays(model.start_date, pkg.duration_days)) : '--');
          form?.getEditor('price_preview')?.option('value', pkg ? money(pkg.price) : '--');
        };
        const items = old ? [readonly('Đăng ký cũ / Hội viên', () => `${value(regCode(old))} · ${value(memberName(old))}`), readonly('Ngày hết hạn cũ', () => dateText(old.end_date))] : [field('member_id', 'Hội viên', 'dxSelectBox', {
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
        const submit = formActions(dialog, old ? 'Xác nhận lưu gia hạn' : 'Xác nhận lưu đăng ký', async () => {
          if (!form.validate().isValid) return;
          $error.hide();
          form.option('disabled', true);
          try {
            const body = { package_id: model.package_id, start_date: dateKey(model.start_date) };
            const response = old ? await api().request(`/registrations/${idPath(old.id)}/renew`, { method: 'POST', body }) : await api().registrations.create({ ...body, member_id: model.member_id, ...(branchId() ? { sold_branch_id: branchId() } : {}) });
            const result = dataOf(response), registration = result?.registration || result;
            if (!registration?.id) throw new Error('Chưa nhận được mã đăng ký. Vui lòng làm mới danh sách trước khi thử lại.');
            notify(old ? 'Đã tạo đăng ký gia hạn chờ thanh toán' : 'Đã tạo đăng ký chờ thanh toán');
            closeDialog(dialog); refreshCurrent();
            await openPaymentModal(registration.id);
          } catch (err) { if (!dialog.closed) errorBlock($error, err); }
          finally { if (!dialog.closed) form.option('disabled', false); }
        });
        if (!activePackages.length) { submit.option('disabled', true); errorBlock($error, new Error('Không có gói đang mở bán tại chi nhánh.')); }
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
        if (r.assigned_pt_id) { refreshCurrent(); throw new Error('Gói đăng ký đã được gán HLV phụ trách.'); }
        const [trainerRows, branches] = await Promise.all([allRows('/pt-bookings/trainers', { branch_id: r.sold_branch_id, status: 'ACTIVE' }), allRows('/branches')]);
        const trainers = trainerRows.filter(p => p.status === 'ACTIVE' && (!r.sold_branch_id || p.branch_id === r.sold_branch_id));
        if (dialog.closed) return;
        dialog.body.empty();
        const $error = $('<div>').hide().appendTo(dialog.body);
        const model = { pt_id: null, note: '' };
        const form = $('<div>').appendTo(dialog.body).dxForm({ formData: model, labelLocation: 'top', showRequiredMark: true, items: [
          readonly('Mã đăng ký', () => regCode(r)), readonly('Hội viên', () => [memberName(r), memberCode(r), memberPhone(r)].filter(Boolean).join(' · ')),
          readonly('Gói đăng ký', () => packageName(r)), readonly('Chi nhánh', () => r.sold_branch_name || r.sold_branch?.branch_name || branches.find(b => b.id === r.sold_branch_id)?.branch_name),
          field('pt_id', 'Huấn luyện viên phụ trách', 'dxSelectBox', { dataSource: trainers, valueExpr: 'id', displayExpr: p => p ? [p.full_name, p.pt_code, p.phone].filter(Boolean).join(' · ') : '', searchEnabled: true, searchExpr: ['full_name', 'phone', 'pt_code'], noDataText: 'Không tìm thấy HLV khả dụng tại chi nhánh' }, true),
          field('note', 'Ghi chú phân công', 'dxTextArea', { maxLength: 255, height: 80 })
        ] }).dxForm('instance');
        let conflicted = false;
        const submit = formActions(dialog, 'Xác nhận gán PT', async () => {
          if (conflicted || !form.validate().isValid) return;
          form.option('disabled', true);
          try {
            await api().request(`/registrations/${idPath(r.id)}/assign-pt`, { method: 'POST', body: { pt_id: model.pt_id, note: model.note } });
            notify('Đã gán PT phụ trách'); closeDialog(dialog); refreshCurrent(); if (onSaved) onSaved();
          } catch (err) {
            errorBlock($error, err);
            if (err.status === 409) { conflicted = true; dialog.blocked = true; refreshCurrent(); if (onSaved) onSaved(); }
          } finally { if (!dialog.closed && !conflicted) form.option('disabled', false); }
        });
        if (!trainers.length) { errorBlock($error, new Error('Không tìm thấy HLV khả dụng tại chi nhánh')); submit.option('disabled', true); }
      } catch (err) { if (!dialog.closed) errorBlock(dialog.body, err, init); }
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
        info($package, 'Kỳ hiệu lực', `${dateText(r.start_date)} - ${dateText(r.end_date)}`);
        info($package, 'Chi nhánh áp dụng', (r.allowed_branches || []).map(b => b.branch_name || b.name).filter(Boolean).join(', '));
        info($package, 'Nhân viên tiếp nhận', r.created_by_name || r.created_by_account?.full_name || r.creator?.full_name);
        const $payment = section(dialog.body, 'Thanh toán 100%');
        info($payment, 'Giá trị gói', money(r.price_snapshot));
        const paid = (r.payments || []).find(confirmed);
        info($payment, 'Trạng thái thanh toán', paid ? 'Đã thanh toán 100%' : r.status === 'PENDING_PAYMENT' ? 'Chờ thanh toán 100%' : r.payment_status ? paymentStatuses[r.payment_status] : null);
        if (paid) { info($payment, 'Phương thức', method(paid)); info($payment, 'Thời gian thanh toán', timestamp(paid.confirmed_at)); button($payment, 'Xem phiếu thu', 'doc', () => openReceipt(paid)); }
        if (r.status === 'PENDING_PAYMENT') button($payment, 'Thu tiền ngay', 'money', () => { closeDialog(dialog); openPaymentModal(r.id); }, true);
        const $rights = section(dialog.body, 'Quyền lợi & tiến độ sử dụng');
        if (hasGym(r)) {
          const total = daysBetween(r.start_date, r.end_date), elapsed = daysBetween(r.start_date, new Date()), remaining = daysBetween(new Date(), r.end_date);
          info($rights, 'Quyền tập Gym', remaining === null ? null : `Còn ${Math.max(0, remaining)} ngày`);
          progress($rights, 'Đã trôi qua / Tổng hạn (ngày)', total === null || elapsed === null ? null : Math.min(total, Math.max(0, elapsed)), total, '#237b58');
          info($rights, 'Lượt check-in thực tế', r.gym_checkin_count ?? r.checkin_count ?? r.progress?.gym_checkin_count ?? r.progress?.checkin_count ?? r.progress?.checkins);
          if (['GYM_SESSION', 'GYM_SESSIONS'].includes(type(r))) info($rights, 'Buổi Gym còn lại', r.remaining_gym_sessions);
        }
        if (hasPT(r)) {
          info($rights, 'Buổi PT có thể đặt', r.remaining_pt_sessions);
          progress($rights, 'Đã tập / Tổng cấp (buổi)', r.used_pt_sessions, r.total_pt_sessions_snapshot ?? r.total_pt_sessions, '#d97706');
          info($rights, 'Buổi đang giữ chỗ', r.booked_pt_sessions); info($rights, 'HLV phụ trách', ptName(r));
          if (!r.assigned_pt_id && r.status !== 'CANCELLED') button($rights, 'Gán PT phụ trách', 'user', () => openAssignment(r.id, load));
        }
      } catch (err) { if (!dialog.closed) errorBlock(dialog.body, err, load); }
    };
    await load();
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
    view.statValues = ['Tổng thực thu', 'Lượt thanh toán thành công', 'Đơn chờ thanh toán'].map(label => {
      const $cell = $('<div>').css({ minWidth: 0, overflowWrap: 'anywhere' }).appendTo($stats); $('<div>').addClass('text-muted').text(label).appendTo($cell);
      return $('<strong>').css({ display: 'block', marginTop: 8, fontSize: 22, overflowWrap: 'anywhere' }).text('--').appendTo($cell);
    });
    const filters = { from: day(context.date || new Date()), to: day(context.date || new Date()), q: '', status: '', payment_method: '' };
    const schedule = () => { clearTimeout(view.debounce); view.debounce = setTimeout(() => view.reload?.(), 280); };
    filter(view.filters, 'Từ ngày', 'dxDateBox', { type: 'date', value: filters.from, displayFormat: 'dd/MM/yyyy', useMaskBehavior: true, onValueChanged: e => { filters.from = e.value; schedule(); } });
    filter(view.filters, 'Đến ngày', 'dxDateBox', { type: 'date', value: filters.to, displayFormat: 'dd/MM/yyyy', useMaskBehavior: true, onValueChanged: e => { filters.to = e.value; schedule(); } });
    filter(view.filters, 'Tìm giao dịch', 'dxTextBox', { mode: 'search', placeholder: 'Mã phiếu, mã ĐK, hội viên, SĐT', valueChangeEvent: 'input', onValueChanged: e => { filters.q = e.value; schedule(); } });
    filter(view.filters, 'Phương thức', 'dxSelectBox', { items: [{ id: '', text: 'Tất cả' }, { id: 'CASH', text: 'Tiền mặt' }, { id: 'BANK_TRANSFER', text: 'Chuyển khoản' }], value: '', valueExpr: 'id', displayExpr: 'text', onValueChanged: e => { filters.payment_method = e.value; schedule(); } });
    filter(view.filters, 'Trạng thái', 'dxSelectBox', { items: [{ id: '', text: 'Tất cả' }, { id: 'COMPLETED', text: 'Thành công' }, { id: 'PENDING', text: 'Chờ thanh toán' }, { id: 'EXPIRED', text: 'Hết hạn' }], value: '', valueExpr: 'id', displayExpr: 'text', onValueChanged: e => { filters.status = e.value; schedule(); } });
    iconButton(view.filters, 'Làm mới giao dịch', 'refresh', () => view.reload());
    view.grid = grid(view.panel, [
      { dataField: 'payment_code', caption: 'Mã phiếu', minWidth: 125 },
      { dataField: 'event_at', caption: 'Thời gian', minWidth: 145, customizeText: c => timestamp(c.value) },
      { dataField: 'member_name', caption: 'Hội viên', minWidth: 170, cellTemplate: (el, c) => twoLines(el, c.value, [c.data.member_code, c.data.member_phone].filter(Boolean).join(' · ')) },
      { dataField: 'registration_code', caption: 'Đăng ký', minWidth: 175, cellTemplate: (el, c) => twoLines(el, c.value, value(c.data.package_name)) },
      { caption: 'Phương thức', calculateCellValue: method, minWidth: 120 },
      { dataField: 'amount', caption: 'Số tiền', alignment: 'right', minWidth: 130, cellTemplate: (el, c) => $('<strong>').css('color', '#237b58').text(money(c.value)).appendTo(el) },
      { dataField: 'collected_by_name', caption: 'Người thu', minWidth: 145 },
      { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 110 },
      { dataField: 'status', caption: 'Trạng thái', minWidth: 130, cellTemplate: (el, c) => badge(el, c.value, true) },
      { caption: 'Thao tác', width: 95, fixed: true, fixedPosition: 'right', cellTemplate(el, c) {
        const $actions = $('<div>').css('display', 'flex').appendTo(el);
        if (confirmed(c.data)) iconButton($actions, 'Xem và in phiếu thu', 'doc', () => openReceipt(c.data));
        if (c.data.status === 'PENDING') {
          iconButton($actions, 'Kiểm tra trạng thái thanh toán', 'refresh', e => checkPayment(c.data, e.component));
          iconButton($actions, 'Xác nhận đã đối chiếu tiền', 'check', () => openManualConfirmation(c.data));
        }
      } }
    ]);
    view.reload = async () => {
      if (!alive(view)) return;
      const generation = ++view.generation;
      if (!day(filters.from) || !day(filters.to) || day(filters.from) > day(filters.to)) {
        view.grid.endCustomLoading(); view.grid.option('dataSource', []); view.statValues.forEach(v => v.text('--'));
        errorBlock(view.error, new Error('Chọn khoảng ngày hợp lệ: Từ ngày không được sau Đến ngày.')); return;
      }
      view.error.hide(); view.grid.beginCustomLoading('Đang tải...'); view.statValues.forEach(v => v.text('--'));
      try {
        const [payments, pending] = await Promise.all([
          allRows('/payments', { date_from: dateKey(filters.from), date_to: dateKey(filters.to), member_id: memberId }),
          allRows('/registrations', { status: 'PENDING_PAYMENT', member_id: memberId })
        ]);
        if (!alive(view) || generation !== view.generation) return;
        const q = (filters.q || '').trim().toLocaleLowerCase('vi');
        const rows = payments.map(normalizePayment).filter(p => {
          const d = dateKey(p.event_at);
          return (!memberId || p.member_id === memberId) && d >= dateKey(filters.from) && d <= dateKey(filters.to) && (!filters.status || (filters.status === 'COMPLETED' ? confirmed(p) : p.status === filters.status)) && (!filters.payment_method || (filters.payment_method === 'CASH' ? p.payment_method === 'CASH' : ['BANK_TRANSFER', 'BANK_TRANSFER_VIETQR'].includes(p.payment_method))) && (!q || [p.payment_code, p.registration_code, p.member_name, p.member_phone].some(v => String(v || '').toLocaleLowerCase('vi').includes(q)));
        });
        view.records = rows; view.pending = pending.filter(r => r.status === 'PENDING_PAYMENT' && (!memberId || r.member_id === memberId));
        view.grid.option('dataSource', rows);
        const successful = rows.filter(confirmed);
        view.statValues[0].text(money(successful.reduce((sum, p) => sum + Number(p.amount), 0)));
        view.statValues[1].text(`${successful.length} lượt`);
        view.statValues[2].text(`${view.pending.length} đơn · ${money(view.pending.reduce((sum, r) => sum + Number(r.price_snapshot), 0))}`);
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
      if (updated.id !== payment.id || Number(updated.amount) !== Number(payment.amount)) {
        throw new Error('Phản hồi đối soát không khớp giao dịch đang kiểm tra.');
      }
      if (confirmed(updated)) { notify('Đã ghi nhận thanh toán 100%'); refreshCurrent(); if (afterConfirmed) await afterConfirmed(updated); }
      else if (updated.status === 'EXPIRED') { notify('Giao dịch đã hết hạn thanh toán', 'warning'); refreshCurrent(); }
      else notify('Chưa ghi nhận tiền vào tài khoản ngân hàng. Vui lòng thử lại hoặc đối chiếu bill chuyển khoản.', 'warning');
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
        const registrations = (await allRows('/registrations', { status: 'PENDING_PAYMENT', member_id: memberId })).filter(r => r.status === 'PENDING_PAYMENT' && (!memberId || r.member_id === memberId)).map(normalizeRegistration);
        if (dialog.closed) return;
        dialog.body.empty();
        const $error = $('<div>').hide().appendTo(dialog.body);
        const model = { registration_id: registrations.some(r => r.id === registrationId) ? registrationId : null, payment_method: 'CASH', note: '' };
        const invoices = new Map();
        let invoice = null, revision = 0, form, submit, pollBusy = false;
        const $form = $('<div>').appendTo(dialog.body);
        const $qr = $('<div>').hide().css({ paddingTop: 16, textAlign: 'center' }).appendTo(dialog.body);
        const chosen = () => registrations.find(r => r.id === model.registration_id);
        const complete = async p => { if (dialog.closed) return; closeDialog(dialog); refreshCurrent(); await openReceipt(p); };
        async function getInvoice() {
          const r = chosen();
          if (!r) throw new Error('Chọn đơn đăng ký chờ thanh toán.');
          const key = `${r.id}:${model.payment_method}`;
          if (!invoices.has(key)) {
            const promise = api().payments.createInvoice({ registration_id: r.id, payment_method: model.payment_method, note: model.note, branch_id: r.sold_branch_id }).then(dataOf);
            invoices.set(key, promise);
            promise.catch(() => invoices.delete(key));
          }
          const result = await invoices.get(key);
          if (!result?.payment?.id || result.payment.registration_id !== r.id || Number(result.payment.amount) !== Number(r.price_snapshot)) throw new Error('Giao dịch không khớp đăng ký hoặc số tiền phải thu. Vui lòng tải lại.');
          return result;
        }
        const update = async () => {
          if (!form || !submit) return;
          const token = ++revision, r = chosen();
          invoice = null; $error.hide(); $qr.empty().toggle(model.payment_method === 'BANK_TRANSFER');
          form.getEditor('member_preview').option('value', r ? [memberName(r), memberCode(r), memberPhone(r)].filter(Boolean).join(' · ') : '--');
          form.getEditor('package_preview').option('value', r ? `${value(regCode(r))} · ${value(packageName(r))}` : '--');
          form.getEditor('amount_preview').option('value', r ? money(r.price_snapshot) : '--');
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
            $('<img>').attr({ src: source, alt: 'Mã VietQR thanh toán', width: 220, height: 220 }).css({ maxWidth: '100%', objectFit: 'contain' }).on('error', () => errorBlock($error, new Error('Không tải được ảnh VietQR. Vui lòng thử lại.'), update)).appendTo($qr);
            info($qr, 'Ngân hàng', qr.bankName || qr.bank_name || qr.bankBin);
            info($qr, 'Số tài khoản', qr.accountNo || qr.account_no);
            info($qr, 'Chủ tài khoản', qr.accountName || qr.account_name);
            info($qr, 'Số tiền', money(invoice.amount));
            info($qr, 'Nội dung chuyển khoản', qr.transferContent || qr.transfer_content || qr.paymentCode);
            if (invoice.expires_at) info($qr, 'Hạn thanh toán', timestamp(invoice.expires_at));
            badge($qr, invoice.status, true);
            if (invoice.status === 'PENDING') button($qr, 'Đối chiếu thủ công', 'check', () => openManualConfirmation(invoice, complete, model.note));
          } catch (err) { if (!dialog.closed && token === revision) errorBlock($qr, err, update); }
          finally { if (!dialog.closed && token === revision) submit.option('disabled', !invoice || invoice.status === 'EXPIRED'); }
        };
        form = $form.dxForm({ formData: model, labelLocation: 'top', showRequiredMark: true, items: [
          field('registration_id', 'Đơn đăng ký chờ thanh toán', 'dxSelectBox', { dataSource: registrations, valueExpr: 'id', displayExpr: r => r ? [regCode(r), memberName(r), memberPhone(r)].filter(Boolean).join(' · ') : '', searchEnabled: true, searchExpr: ['registration_code', 'member_name', 'member_phone'], noDataText: 'Không tìm thấy đơn đăng ký chờ thanh toán phù hợp', placeholder: 'Tìm SĐT, hội viên hoặc mã đăng ký' }, true),
          field('member_preview', 'Thông tin hội viên', 'dxTextBox', { readOnly: true }),
          field('package_preview', 'Gói tập đăng ký', 'dxTextBox', { readOnly: true }),
          field('amount_preview', 'Số tiền thanh toán 100%', 'dxTextBox', { readOnly: true }),
          field('payment_method', 'Phương thức thanh toán', 'dxRadioGroup', { items: [{ id: 'CASH', text: 'Tiền mặt' }, { id: 'BANK_TRANSFER', text: 'Chuyển khoản' }], valueExpr: 'id', displayExpr: 'text', layout: 'horizontal' }, true),
          field('note', 'Ghi chú giao dịch', 'dxTextArea', { maxLength: 255, height: 76 })
        ], onFieldDataChanged(e) { if (['registration_id', 'payment_method'].includes(e.dataField)) update(); } }).dxForm('instance');
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
            const response = dataOf(await api().request(`/payments/${idPath(expected)}`));
            const latest = response.payment || response;
            if (latest.id !== expected) throw new Error('Trạng thái trả về không khớp giao dịch đang chờ.');
            if (!dialog.closed && invoice?.id === expected && confirmed(latest)) await complete(latest);
            else if (!dialog.closed && invoice?.id === expected && latest?.status === 'EXPIRED') { invoice = latest; submit.option('disabled', true); errorBlock($qr, new Error('Giao dịch đã hết hạn. Đóng và mở lại thanh toán để tạo mã mới.')); clearInterval(dialog.timer); }
          } catch (err) { if (!dialog.closed) errorBlock($error, err); }
          finally { pollBusy = false; }
        }, 10000);
      } catch (err) { if (!dialog.closed) errorBlock(dialog.body, err, init); }
    };
    await init();
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
        if (registration) info($paper, 'Kỳ hiệu lực', `${dateText(registration.start_date)} - ${dateText(registration.end_date)}`);
        info($paper, 'Phương thức', method(response.payment || (receipt.payment_method ? receipt : payment)));
        info($paper, 'Mã giao dịch', response.payment?.transaction_ref || receipt.transaction_ref || payment.transaction_ref);
        info($paper, 'Người thu', receipt.issued_by_name || payment.collected_by_name);
        info($paper, 'Chi nhánh', receipt.branch_name || payment.branch_name || registration?.sold_branch?.branch_name || registration?.sold_branch_name);
        info($paper, 'Thực thu 100%', money(receipt.amount)).css({ fontWeight: 700, color: '#237b58' });
        if (receipt.note) info($paper, 'Ghi chú', receipt.note);
        const $actions = $('<div>').css({ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }).appendTo(dialog.body);
        button($actions, 'Đóng', 'close', () => closeDialog(dialog));
        button($actions, 'In phiếu thu', 'print', () => printReceipt($paper), true);
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
    openPaymentModal, openReceipt, openManualConfirmation, dispose, refresh: refreshCurrent,
    loadRegistrationForPayment: openPaymentModal,
    resetSaleForm: () => openRegistrationModal()
  };
})();
