window.PackagesModule = (function () {
  'use strict';
  const types = [{ id: 'GYM', text: 'GYM' }, { id: 'PT', text: 'PT' }, { id: 'COMBO', text: 'COMBO' }];
  const limits = { DAYS: 'Theo ngày', SESSIONS: 'Theo buổi', DAYS_SESSIONS: 'Theo ngày + buổi' };
  const sellingStatuses = [{ id: 'ACTIVE', text: 'Đang bán' }, { id: 'INACTIVE', text: 'Ngừng bán' }];
  const branchStatuses = [{ id: 'ACTIVE', text: 'Đang hoạt động' }, { id: 'INACTIVE', text: 'Tạm ngừng hoạt động' }];
  let user, branchList = [], version = 0, currentReload;
  const observers = new Set(), popups = new Set();
  const api = () => window.apiClient;
  const rows = response => Array.isArray(response.data) ? response.data : response.data?.items || [];
  const text = value => value === null || value === undefined || value === '' ? '-' : String(value);
  const money = value => value === null || value === undefined ? '-' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  const required = label => ({ type: 'required', message: `${label} là bắt buộc` });
  const notify = message => DevExpress.ui.notify(message, 'success', 3000);
  function button(parent, options) { return $('<div>').appendTo(parent).dxButton({ stylingMode: 'outlined', ...options }).dxButton('instance'); }
  function error(parent, err, retry) {
    const box = $('<div role="alert" class="module-error">').css({ padding: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }).appendTo(parent);
    $('<span>').text(err.message || 'Không thể tải dữ liệu. Vui lòng thử lại.').appendTo(box);
    if (retry) button(box, { icon: 'refresh', text: 'Thử lại', onClick: () => { box.remove(); retry(); } });
  }
  function badge(parent, status, branch = false) {
    $('<span>').addClass(`status-badge ${status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`).css({ whiteSpace: 'nowrap', flexShrink: 0 }).text((branch ? branchStatuses : sellingStatuses).find(s => s.id === status)?.text || text(status)).appendTo(parent);
  }
  function field(dataField, label, editorType = 'dxTextBox', editorOptions = {}, validationRules = []) {
    return { dataField, label: { text: label }, editorType, editorOptions, validationRules };
  }
  async function authorize(chainOnly = false) {
    const response = await api().auth.getMe(); user = response.data?.user || response.data;
    const selectedRole = user?.active_role || user?.role || api().getUser()?.active_role || api().getUser()?.role;
    const role = user?.roles?.includes(selectedRole) ? selectedRole : user?.roles?.length === 1 ? user.roles[0] : null;
    if (role !== 'QTV' || (chainOnly && user.is_all_branches !== true)) {
      const err = new Error(chainOnly ? 'Chỉ quản trị viên toàn chuỗi được quản lý chi nhánh.' : 'Bạn không có quyền quản lý danh mục gói tập.');
      err.status = 403; throw err;
    }
  }
  async function loadBranchOptions() {
    const data = rows(await api().request('/branches', { headers: { 'x-branch-id': 'ALL' } }));
    branchList = user.is_all_branches ? data : data.filter(b => user.branch_ids?.includes(b.id));
    return branchList;
  }
  function frame(containerId, title, addText, create) {
    const root = $(document.getElementById(containerId)).empty();
    const header = $('<div class="view-header"><div class="view-header-title"></div><div class="view-actions"></div></div>').appendTo(root);
    $('<h2>').text(title).appendTo(header.find('.view-header-title'));
    button(header.find('.view-actions'), { icon: 'add', text: addText, type: 'default', stylingMode: 'contained', onClick: create });
    return root;
  }
  function cardGrid(parent) {
    const grid = $('<div class="catalog-card-grid">').css({ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }).appendTo(parent);
    const observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      grid.css('gridTemplateColumns', `repeat(${width < 540 ? 1 : width < 840 ? 2 : 3}, minmax(0, 1fr))`);
    });
    observer.observe(grid[0]);
    observers.add(observer);
    return grid;
  }
  function card(parent) {
    return $('<article class="catalog-card">').css({ background: '#fff', border: '1px solid var(--border-color, #dfe5e2)', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, overflowWrap: 'anywhere' }).appendTo(parent);
  }
  function packageModel(pkg) {
    const map = { GYM_TIME: ['GYM', 'DAYS'], GYM_SESSIONS: ['GYM', 'SESSIONS'], PT_SESSIONS: ['PT', 'SESSIONS'], GYM_SESSION: ['GYM', 'SESSIONS'], PT_SESSION: ['PT', 'SESSIONS'], COMBO: ['COMBO', 'DAYS_SESSIONS'] };
    const pair = map[pkg.package_type];
    if (!pair) throw new Error('Loại gói chưa hợp lệ. Không thể chỉnh sửa gói này.');
    return { service_type: pair[0], limit_type: pair[1] };
  }
  function limitOptions(type) {
    return (type === 'GYM' ? ['DAYS', 'SESSIONS'] : type === 'PT' ? ['SESSIONS'] : type === 'COMBO' ? ['DAYS_SESSIONS'] : []).map(id => ({ id, text: limits[id] }));
  }
  function packageType(data) {
    if (data.service_type === 'GYM') return data.limit_type === 'SESSIONS' ? 'GYM_SESSION' : 'GYM_TIME';
    return data.service_type === 'PT' ? 'PT_SESSION' : 'COMBO';
  }
  function positiveInteger(requiredValue) {
    return [{ type: 'custom', reevaluate: true, message: requiredValue ? 'Nhập số nguyên lớn hơn 0' : 'Để trống hoặc nhập số nguyên lớn hơn 0', validationCallback: e => (!requiredValue && (e.value === null || e.value === undefined || e.value === '')) || (Number.isInteger(e.value) && e.value > 0) }];
  }
  function popup(title, width = 680, drawer = false) {
    const host = $('<div>').appendTo(document.body);
    let content;
    const instance = host.dxPopup({
      title, width: () => Math.min(width, window.innerWidth - 24), height: drawer ? '100%' : 'auto', maxHeight: drawer ? '100%' : '92vh',
      showCloseButton: true, dragEnabled: false, hideOnOutsideClick: false, deferRendering: false,
      position: drawer ? { my: 'right top', at: 'right top', of: window } : { my: 'center', at: 'center', of: window },
      wrapperAttr: { class: drawer ? 'branch-stats-drawer' : 'catalog-form-popup' },
      onShown: e => {
        const titlebar = $(e.component.content()).closest('.dx-overlay-content').find('.dx-popup-title');
        titlebar.find('.dx-toolbar-before').css({ width: 'calc(100% - 48px)' });
        titlebar.find('.dx-toolbar-label').css({ maxWidth: '100%', width: '100%' });
      },
      contentTemplate: el => { content = $('<div>').css({ overflowY: 'auto', maxHeight: drawer ? 'calc(100vh - 140px)' : '68vh', padding: 4 }).appendTo(el); },
      onHidden: () => { popups.delete(instance); instance.dispose(); host.remove(); }
    }).dxPopup('instance');
    popups.add(instance); instance.show(); return { host, instance, content };
  }
  function formDialog(title, data, items, save, options = {}) {
    const dialog = popup(title, options.width || 700), errors = $('<div role="alert">').appendTo(dialog.content);
    let busy = false;
    const form = $('<div>').appendTo(dialog.content).dxForm({ formData: data, colCount: 2, colCountByScreen: { xs: 1, sm: 2, md: 2, lg: 2 }, labelLocation: 'top', showColonAfterLabel: false, items, onFieldDataChanged: options.onChange }).dxForm('instance');
    const original = JSON.stringify(data);
    dialog.instance.option('onHiding', e => { e.cancel = busy; });
    dialog.instance.option('toolbarItems', [
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Hủy', onClick: () => dialog.instance.hide() } },
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { icon: 'save', text: options.saveText || 'Lưu thay đổi', type: 'default', stylingMode: 'contained', onClick: async e => {
        if (busy) return;
        busy = true; e.component.option('disabled', true); errors.empty();
        try {
          let result = form.validate();
          form.option('disabled', true);
          if (result.status === 'pending') result = await result.complete;
          if (!result.isValid) return;
          const values = form.option('formData');
          if (options.skipUnchanged && JSON.stringify(values) === original) { busy = false; dialog.instance.hide(); return; }
          form.option('disabled', true);
          await save(values); busy = false; dialog.instance.hide();
        } catch (err) {
          if (err.status === 409 && options.duplicateField === 'branch_name') err.message = 'Tên chi nhánh đã tồn tại trong hệ thống, vui lòng chọn tên khác';
          const name = err.field || err.data?.field || (options.duplicateField && err.status === 409 ? options.duplicateField : null);
          if (name && form.getEditor(name)) form.getEditor(name).option({ validationStatus: 'invalid', validationErrors: [{ message: err.message }] });
          error(errors, err);
        } finally {
          busy = false;
          if (dialog.host.closest('body').length) { form.option('disabled', false); e.component.option('disabled', false); }
        }
      } } }
    ]);
    return { ...dialog, form };
  }
  async function renderPackages(containerId, context = {}) {
    const current = ++version, root = $(document.getElementById(containerId)).empty();
    root.text('Đang tải gói tập...');
    try {
      await authorize(); await loadBranchOptions();
      if (current !== version || !root[0]?.isConnected) return;
      frame(containerId, 'Gói tập', 'Tạo gói mới', () => openPackageModal());
      const filter = $('<div class="filter-bar">').css({ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 }).appendTo(root);
      let status = '', query = '', sequence = 0;
      const tabs = $('<div>').appendTo(filter), count = $('<span role="status">').css({ marginLeft: 'auto', color: 'var(--text-muted, #667085)' }).appendTo(filter);
      const search = $('<div>').css({ width: 230, maxWidth: '100%' }).appendTo(filter);
      const messages = $('<div>').appendTo(root), cards = cardGrid(root);
      const load = async () => {
        const request = ++sequence; messages.empty(); cards.empty(); count.text('Đang tải...');
        try {
          const response = await api().packages.list({ status });
          if (current !== version || request !== sequence || !root[0].isConnected) return;
          const data = rows(response).filter(p => (!status || p.status === status) && (!query || `${p.package_code} ${p.package_name}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')))).sort((a, b) => String(a.package_code).localeCompare(String(b.package_code), 'vi', { numeric: true }));
          const scoped = user.is_all_branches ? data : data.filter(p => (p.allowed_branch_ids || p.branch_ids)?.some(id => user.branch_ids?.includes(id)));
          count.text(`${scoped.length} gói tập`);
          if (!scoped.length) $('<p>').css('padding', '24px 0').text('Không có gói tập nào').appendTo(messages);
          scoped.forEach(pkg => renderPackageCard(cards, pkg, load));
        } catch (err) { if (current === version && request === sequence) { count.text('Không thể tải danh mục'); error(messages, err, load); } }
      };
      currentReload = load;
      tabs.dxTabs({ dataSource: [{ id: '', text: 'Tất cả' }, ...sellingStatuses], selectedIndex: 0, onItemClick: e => { status = e.itemData.id; load(); } });
      let timer;
      search.dxTextBox({ label: 'Tìm gói tập', labelMode: 'static', placeholder: 'Tên hoặc mã gói', showClearButton: true, valueChangeEvent: 'input', onValueChanged: e => { clearTimeout(timer); timer = setTimeout(() => { query = e.value?.trim() || ''; if (current === version) load(); }, 300); } });
      button(filter, { icon: 'refresh', hint: 'Tải lại gói tập', onClick: load });
      await load();
      if (context.action === 'create') await openPackageModal();
      else if (context.package_id) await openPackageModal(context.package_id);
    } catch (err) { if (current === version) { root.empty(); error(root, err, () => renderPackages(containerId, context)); } }
  }
  function renderPackageCard(parent, pkg, reload) {
    const item = card(parent), top = $('<div>').css({ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }).appendTo(item);
    $('<h3>').css({ fontSize: 17, lineHeight: 1.45, margin: 0 }).text(pkg.package_name).appendTo(top); badge(top, pkg.status);
    let model;
    try { model = packageModel(pkg); } catch (_) { model = { service_type: pkg.package_type, limit_type: null }; }
    $('<div>').css({ color: 'var(--text-muted, #667085)', fontSize: 12 }).text(`${pkg.package_code} · ${model.service_type}${model.limit_type ? ' - ' + limits[model.limit_type] : ''}`).appendTo(item);
    $('<strong>').css({ color: 'var(--primary, #237b58)', fontSize: 24, lineHeight: 1.3 }).text(money(pkg.price)).appendTo(item);
    const benefits = [];
    if (pkg.duration_days) benefits.push(`Thời hạn: ${pkg.duration_days} ngày`);
    if (['GYM_SESSION', 'GYM_SESSIONS'].includes(pkg.package_type) || (pkg.package_type === 'COMBO' && pkg.total_gym_sessions != null)) benefits.push(`Gym: ${text(pkg.total_gym_sessions)} lượt`);
    if (['PT_SESSION', 'PT_SESSIONS', 'COMBO'].includes(pkg.package_type)) benefits.push(`PT: ${text(pkg.total_pt_sessions)} buổi`);
    if (pkg.package_type === 'GYM_TIME' || (pkg.package_type === 'COMBO' && pkg.total_gym_sessions == null)) benefits.push('Gym không giới hạn lượt');
    $('<div>').text(benefits.join(' · ') || '-').appendTo(item);
    $('<div>').css({ fontSize: 13, color: 'var(--text-muted, #667085)' }).text(`Áp dụng: ${(pkg.branches?.map(b => b.branch_name) || pkg.allowed_branch_names)?.join(', ') || '-'}`).appendTo(item);
    if (pkg.description) $('<div>').css('fontSize', 13).text(pkg.description).appendTo(item);
    const actions = $('<div class="view-actions">').css({ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, marginTop: 'auto', borderTop: '1px solid #edf0ee' }).appendTo(item);
    button(actions, { icon: 'edit', text: 'Sửa', onClick: () => openPackageModal(pkg.id) });
    button(actions, { icon: pkg.status === 'ACTIVE' ? 'remove' : 'check', text: pkg.status === 'ACTIVE' ? 'Ngừng bán' : 'Mở bán lại', type: pkg.status === 'ACTIVE' ? 'danger' : 'normal', stylingMode: pkg.status === 'ACTIVE' ? 'contained' : 'outlined', onClick: () => changePackageStatus(pkg, reload) });
  }
  async function changePackageStatus(pkg, reload) {
    const stop = pkg.status === 'ACTIVE', dialog = popup(stop ? 'Ngừng bán gói' : 'Mở bán lại gói', 480);
    $('<strong>').text(pkg.package_name).appendTo(dialog.content);
    $('<p>').text(stop ? 'Gói sẽ ngừng nhận đăng ký và gia hạn mới. Các đăng ký đã mua giữ nguyên quyền lợi.' : 'Gói sẽ được hiển thị lại trong danh mục bán mới.').appendTo(dialog.content);
    let busy = false;
    dialog.instance.option('onHiding', e => { e.cancel = busy; });
    dialog.instance.option('toolbarItems', [
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Hủy', onClick: () => dialog.instance.hide() } },
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Xác nhận', type: stop ? 'danger' : 'default', stylingMode: 'contained', onClick: async e => {
        if (busy) return; busy = true; e.component.option('disabled', true); dialog.content.find('.module-error').remove();
        try { await authorize(); await api().request(`/packages/${encodeURIComponent(pkg.id)}/status`, { method: 'PATCH', body: { status: stop ? 'INACTIVE' : 'ACTIVE' } }); busy = false; dialog.instance.hide(); notify(stop ? 'Đã ngừng bán gói' : 'Đã mở bán lại gói'); await reload(); }
        catch (err) { error(dialog.content, err); }
        finally { busy = false; if (dialog.host.closest('body').length) e.component.option('disabled', false); }
      } } }
    ]);
  }
  async function openPackageModal(id = null) {
    try {
      await authorize(); await loadBranchOptions();
      const pkg = id ? (await api().packages.getById(id)).data : null;
      if (id && !pkg?.id) throw new Error('Gói tập không tồn tại.');
      const branchIds = pkg ? (pkg.allowed_branch_ids || pkg.branch_ids || pkg.allowed_branches?.map(b => b.id) || []) : [];
      if (branchIds.some(bid => !branchList.some(b => b.id === bid))) throw new Error('Gói có chi nhánh ngoài phạm vi quản lý. Vui lòng liên hệ quản trị viên toàn chuỗi.');
      const model = pkg ? packageModel(pkg) : { service_type: null, limit_type: null };
      const data = { ...model, package_name: pkg?.package_name || '', duration_days: pkg?.duration_days ?? null, total_gym_sessions: pkg?.total_gym_sessions ?? null, total_pt_sessions: pkg?.total_pt_sessions ?? null, price: pkg ? Number(pkg.price) : null, branch_ids: branchIds, status: pkg?.status || 'ACTIVE', description: pkg?.description || '' };
      const gymSessions = () => data.service_type === 'GYM' && data.limit_type === 'SESSIONS';
      const ptSessions = () => ['PT', 'COMBO'].includes(data.service_type);
      let dialog, updating = false;
      const items = [
        field('service_type', 'Loại gói', 'dxSelectBox', { dataSource: types, valueExpr: 'id', displayExpr: 'text', readOnly: Boolean(id) }, [required('Loại gói')]),
        field('limit_type', 'Cách giới hạn', 'dxSelectBox', { dataSource: limitOptions(data.service_type), valueExpr: 'id', displayExpr: 'text', readOnly: Boolean(id) || data.service_type !== 'GYM' }, [required('Cách giới hạn')]),
        { ...field('package_name', 'Tên gói', 'dxTextBox', { maxLength: 150 }, [required('Tên gói'), { type: 'custom', message: 'Vui lòng nhập tên gói', validationCallback: e => Boolean(e.value?.trim()) }]), colSpan: 2 },
        field('duration_days', 'Thời hạn (ngày)', 'dxNumberBox', { min: 1, showSpinButtons: true }, positiveInteger(!gymSessions())),
        { ...field('total_gym_sessions', 'Số lượt Gym', 'dxNumberBox', { min: 1, showSpinButtons: true }, positiveInteger(true)), visible: gymSessions(), isRequired: true },
        { ...field('total_pt_sessions', 'Số buổi PT', 'dxNumberBox', { min: 1, showSpinButtons: true }, positiveInteger(true)), visible: ptSessions(), isRequired: true },
        field('price', 'Giá bán (VND)', 'dxNumberBox', { min: 0, format: '#,##0', showSpinButtons: true, step: 1000 }, [required('Giá bán'), { type: 'custom', message: 'Giá bán phải lớn hơn 0', validationCallback: e => Number.isFinite(e.value) && e.value > 0 }]),
        { ...field('branch_ids', 'Chi nhánh áp dụng', 'dxTagBox', { dataSource: branchList.filter(b => b.status === 'ACTIVE' || branchIds.includes(b.id)), valueExpr: 'id', displayExpr: 'branch_name', searchEnabled: true, showSelectionControls: true, selectAllText: 'Tất cả chi nhánh', applyValueMode: 'useButtons', multiline: true }, [{ type: 'custom', message: 'Chọn ít nhất một chi nhánh', validationCallback: e => Array.isArray(e.value) && e.value.length > 0 }]), colSpan: 2, isRequired: true },
        field('status', 'Trạng thái bán', 'dxSelectBox', { dataSource: sellingStatuses, valueExpr: 'id', displayExpr: 'text' }, [required('Trạng thái bán')]),
        { ...field('description', 'Mô tả quyền lợi', 'dxTextArea', { height: 90, maxLength: 2000 }), colSpan: 2 }
      ];
      dialog = formDialog(pkg ? 'Cập nhật danh mục gói tập' : 'Tạo mới danh mục gói tập', data, items, async values => {
        const payload = { package_name: values.package_name.trim(), duration_days: values.duration_days ?? null, total_gym_sessions: gymSessions() ? values.total_gym_sessions : null, total_pt_sessions: ptSessions() ? values.total_pt_sessions : null, price: values.price, branch_ids: [...values.branch_ids], status: values.status, description: values.description.trim() || null };
        if (id) await api().request(`/packages/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
        else await api().packages.create({ ...payload, package_type: packageType(values) });
        notify(id ? 'Đã cập nhật gói tập' : 'Đã tạo gói tập'); if (currentReload) await currentReload();
      }, { saveText: id ? 'Lưu thay đổi' : 'Tạo gói tập', skipUnchanged: Boolean(id), onChange: e => {
        if (id || updating || !dialog || !['service_type', 'limit_type'].includes(e.dataField)) return;
        updating = true;
        const form = dialog.form;
        form.beginUpdate();
        if (e.dataField === 'service_type') {
          const options = limitOptions(data.service_type);
          form.updateData('limit_type', options.length === 1 ? options[0].id : null);
          form.itemOption('limit_type', 'editorOptions', { dataSource: options, valueExpr: 'id', displayExpr: 'text', readOnly: data.service_type !== 'GYM' });
        }
        if (!gymSessions()) form.updateData('total_gym_sessions', null);
        if (!ptSessions()) form.updateData('total_pt_sessions', null);
        form.itemOption('total_gym_sessions', 'visible', gymSessions()); form.itemOption('total_pt_sessions', 'visible', ptSessions());
        form.itemOption('duration_days', 'validationRules', positiveInteger(!gymSessions())); form.itemOption('duration_days', 'isRequired', !gymSessions());
        form.endUpdate(); updating = false;
      } });
      dialog.form.itemOption('duration_days', 'isRequired', !gymSessions());
    } catch (err) { DevExpress.ui.notify(err.message, 'error', 4000); }
  }
  function openingHours(branch) { return branch.open_time && branch.close_time ? `${branch.open_time.slice(0, 5)} - ${branch.close_time.slice(0, 5)}` : '-'; }
  function metrics(parent, stats) {
    const block = $('<dl>').css({ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, margin: 0, padding: '16px 0', borderTop: '1px solid #edf0ee', borderBottom: '1px solid #edf0ee' }).appendTo(parent);
    [['Hội viên', stats?.member_count], ['Huấn luyện viên', stats?.pt_count], ['Đang tập', stats?.currently_training]].forEach(([label, value]) => {
      const item = $('<div>').appendTo(block);
      $('<dd>').css({ fontSize: 23, fontWeight: 700, margin: 0 }).text(text(value)).appendTo(item);
      $('<dt>').css({ fontSize: 12, color: 'var(--text-muted, #667085)' }).text(label).appendTo(item);
    });
  }
  async function renderBranches(containerId, context = {}) {
    const current = ++version, root = $(document.getElementById(containerId)).empty(); root.text('Đang tải chi nhánh...');
    try {
      await authorize(true);
      if (current !== version || !root[0]?.isConnected) return;
      frame(containerId, 'Chi nhánh', 'Thêm chi nhánh', () => openBranchModal());
      const bar = $('<div class="filter-bar">').css({ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }).appendTo(root);
      const count = $('<span role="status">').appendTo(bar), messages = $('<div>').appendTo(root), cards = cardGrid(root);
      let sequence = 0;
      const load = async () => {
        const request = ++sequence; cards.empty(); messages.empty(); count.text('Đang tải chi nhánh...');
        try {
          const data = rows(await api().request('/branches', { headers: { 'x-branch-id': 'ALL' } }));
          if (current !== version || request !== sequence || !root[0].isConnected) return;
          branchList = data; count.text(`${data.length} chi nhánh`);
          if (!data.length) $('<p>').css('padding', '24px 0').text('Chưa có dữ liệu chi nhánh').appendTo(messages);
          await Promise.allSettled(data.map(async branch => {
            const item = card(cards), top = $('<div>').css({ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'start' }).appendTo(item);
            $('<h3>').css({ fontSize: 17, margin: 0, lineHeight: 1.45 }).text(branch.branch_name).appendTo(top); badge(top, branch.status, true);
            $('<div>').css({ fontSize: 12, color: 'var(--text-muted, #667085)' }).text(branch.branch_code).appendTo(item);
            $('<div>').text(text(branch.address)).appendTo(item);
            $('<div>').css('fontSize', 13).text(`${text(branch.phone)} · ${openingHours(branch)}`).appendTo(item);
            const stats = $('<div role="status">').text('Đang tải số liệu...').appendTo(item);
            const actions = $('<div class="view-actions">').css({ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }).appendTo(item);
            button(actions, { icon: 'chart', text: 'Số liệu', onClick: () => openBranchStats(branch.id) }); button(actions, { icon: 'edit', text: 'Chỉnh sửa', onClick: () => openBranchModal(branch.id) });
            const loadStats = async () => {
              stats.empty().text('Đang tải số liệu...');
              try { const response = await api().request(`/branches/${encodeURIComponent(branch.id)}/stats`); if (item[0].isConnected) { stats.empty(); metrics(stats, response.data); } }
              catch (err) { if (item[0].isConnected) { stats.empty(); metrics(stats); error(stats, err, loadStats); } }
            };
            await loadStats();
          }));
        } catch (err) { if (current === version && request === sequence) { count.text('Không thể tải chi nhánh'); error(messages, err, load); } }
      };
      currentReload = load; button(bar, { icon: 'refresh', hint: 'Tải lại chi nhánh và số liệu', onClick: load });
      await load(); if (context.action === 'create') await openBranchModal(); else if (context.branch_id) await openBranchStats(context.branch_id);
    } catch (err) {
      if (current === version) {
        root.empty(); error(root, err, err.status === 403 ? null : () => renderBranches(containerId, context));
        if (err.status === 403) { DevExpress.ui.notify(err.message, 'error', 3500); await window.ParadiseApp.navigateTo('dashboard'); }
      }
    }
  }
  async function openBranchModal(id = null) {
    try {
      await authorize(true); await loadBranchOptions();
      const branch = id ? (await api().branches.getById(id)).data : null;
      if (id && !branch?.id) throw new Error('Chi nhánh không tồn tại.');
      const data = { branch_name: branch?.branch_name || '', address: branch?.address || '', phone: branch?.phone || '', opening_hours: branch ? openingHours(branch) : '', status: branch?.status || 'ACTIVE' };
      if (branch) data.branch_code = branch.branch_code;
      const hoursPattern = /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/;
      const items = [
        ...(branch ? [field('branch_code', 'Mã chi nhánh', 'dxTextBox', { readOnly: true })] : []),
        field('branch_name', 'Tên chi nhánh', 'dxTextBox', { maxLength: 100 }, [required('Tên chi nhánh'), { type: 'custom', message: 'Tên chi nhánh gồm 3-100 ký tự', validationCallback: e => e.value?.trim().length >= 3 && e.value.trim().length <= 100 }, { type: 'custom', message: 'Tên chi nhánh đã tồn tại trong hệ thống, vui lòng chọn tên khác', validationCallback: e => !branchList.some(b => b.id !== id && b.branch_name.trim().toLocaleLowerCase('vi') === e.value?.trim().toLocaleLowerCase('vi')) }]),
        { ...field('address', 'Địa chỉ', 'dxTextArea', { height: 80, maxLength: 255 }, [required('Địa chỉ'), { type: 'custom', message: 'Địa chỉ gồm 5-255 ký tự', validationCallback: e => e.value?.trim().length >= 5 && e.value.trim().length <= 255 }]), colSpan: 2 },
        field('phone', 'Số điện thoại', 'dxTextBox', { mode: 'tel' }, [required('Số điện thoại'), { type: 'custom', message: 'Nhập số di động 10 số hoặc số máy bàn Việt Nam', validationCallback: e => /^(0[35789]\d{8}|02\d{9})$/.test(String(e.value || '').replace(/[\s().-]/g, '').replace(/^\+84/, '0')) }]),
        field('opening_hours', 'Giờ mở cửa', 'dxTextBox', { placeholder: 'HH:mm - HH:mm' }, [required('Giờ mở cửa'), { type: 'custom', message: 'Nhập HH:mm - HH:mm, giờ đóng cửa phải sau giờ mở cửa', validationCallback: e => {
          const value = String(e.value || '').trim();
          if (!hoursPattern.test(value)) return false;
          const [open, close] = value.split('-').map(s => s.trim()); return open < close;
        } }]),
        field('status', 'Trạng thái hoạt động', 'dxSelectBox', { dataSource: branchStatuses, valueExpr: 'id', displayExpr: 'text' }, [required('Trạng thái hoạt động')])
      ];
      formDialog(id ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh', data, items, async values => {
        const [open, close] = values.opening_hours.trim().split('-').map(s => s.trim());
        const payload = { branch_name: values.branch_name.trim(), address: values.address.trim(), phone: values.phone.replace(/[\s().-]/g, '').replace(/^\+84/, '0'), open_time: `${open}:00`, close_time: `${close}:00`, status: values.status };
        if (id) await api().request(`/branches/${encodeURIComponent(id)}`, { method: 'PUT', body: payload }); else await api().branches.create(payload);
        notify(id ? 'Cập nhật thông tin chi nhánh thành công' : 'Thêm chi nhánh mới thành công');
        window.dispatchEvent(new CustomEvent('paradise:branches-changed'));
        if (currentReload) await currentReload();
      }, { skipUnchanged: Boolean(id), duplicateField: 'branch_name', saveText: id ? 'Lưu thay đổi' : 'Thêm chi nhánh' });
    } catch (err) { DevExpress.ui.notify(err.message, 'error', 4000); }
  }
  async function openBranchStats(id) {
    try { await authorize(true); } catch (err) { DevExpress.ui.notify(err.message, 'error', 4000); return; }
    const dialog = popup('Số liệu chi nhánh', 620, true);
    const load = async () => {
      dialog.content.empty().text('Đang tải số liệu chi nhánh...');
      try {
        const [branchResponse, statsResponse] = await Promise.all([api().branches.getById(id), api().request(`/branches/${encodeURIComponent(id)}/stats`)]);
        if (!dialog.host.closest('body').length) return;
        const branch = branchResponse.data, stats = statsResponse.data;
        dialog.instance.option('title', `${branch.branch_name} · ${branch.branch_code}`); dialog.content.empty();
        badge(dialog.content, branch.status, true);
        $('<p>').text(text(branch.address)).appendTo(dialog.content); $('<p>').text(`${text(branch.phone)} · Giờ mở cửa: ${openingHours(branch)}`).appendTo(dialog.content);
        metrics(dialog.content, stats);
        $('<h3>').css({ fontSize: 15, margin: '24px 0 16px' }).text('Dịch vụ & hoạt động trong tháng').appendTo(dialog.content);
        const table = $('<dl>').css({ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }).appendTo(dialog.content);
        [['Gói Gym đang hiệu lực', stats.active_packages?.gym], ['Gói PT đang hiệu lực', stats.active_packages?.pt], ['Combo đang hiệu lực', stats.active_packages?.combo], ['Lượt check-in trong tháng', stats.monthly_checkins], ['Buổi PT đã hoàn thành', stats.monthly_completed_pt]].forEach(([label, value]) => { $('<dt>').text(label).appendTo(table); $('<dd>').css({ margin: 0, fontWeight: 700 }).text(text(value)).appendTo(table); });
      } catch (err) { if (dialog.host.closest('body').length) { dialog.content.empty(); metrics(dialog.content); error(dialog.content, new Error('Không thể nạp dữ liệu chi nhánh, vui lòng thử lại sau'), load); } }
    };
    dialog.instance.option('toolbarItems', [{ toolbar: 'bottom', location: 'before', widget: 'dxButton', options: { icon: 'refresh', hint: 'Cập nhật số liệu', onClick: load } }, { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Đóng', onClick: () => dialog.instance.hide() } }]);
    await load();
  }
  function render(containerId, context = {}) { return context === 'branches' ? renderBranches(containerId) : renderPackages(containerId, typeof context === 'object' ? context : {}); }
  function dispose() {
    version++; currentReload = null;
    observers.forEach(observer => observer.disconnect()); observers.clear();
    popups.forEach(instance => { const element = instance.element(); instance.dispose(); element.remove(); }); popups.clear();
  }
  return { render, renderPackages, renderBranches, openPackageModal, openBranchModal, openBranchStats, dispose, refresh: () => currentReload?.() };
})();
