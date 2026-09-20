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
    $('<h3>').css({ fontSize: 17, lineHeight: 1.45, margin: 0, cursor: 'pointer' }).attr('title', 'Xem chi tiết gói').text(pkg.package_name).on('click', () => openPackageDetail(pkg, reload)).appendTo(top); badge(top, pkg.status);
    let model;
    try { model = packageModel(pkg); } catch (_) { model = { service_type: pkg.package_type, limit_type: null }; }
    $('<div>').css({ color: 'var(--text-muted, #667085)', fontSize: 12 }).text(`${pkg.package_code} · ${model.service_type}${model.limit_type ? ' - ' + limits[model.limit_type] : ''}`).appendTo(item);
    $('<strong>').css({ color: 'var(--primary, #237b58)', fontSize: 24, lineHeight: 1.3 }).text(money(pkg.price)).appendTo(item);
    if (pkg.gym_price || pkg.pt_price) {
      const parts = [];
      if (pkg.gym_price) parts.push(`Gym: ${money(pkg.gym_price)}`);
      if (pkg.pt_price) parts.push(`PT: ${money(pkg.pt_price)}`);
      $('<div style="font-size:11px;color:#748078;">').text(parts.join(' + ')).appendTo(item);
    }
    const benefits = [];
    if (pkg.duration_days) benefits.push(`Thời hạn: ${pkg.duration_days} ngày`);
    if (['GYM_SESSION', 'GYM_SESSIONS'].includes(pkg.package_type) || (pkg.package_type === 'COMBO' && pkg.total_gym_sessions != null)) benefits.push(`Gym: ${text(pkg.total_gym_sessions)} lượt`);
    if (['PT_SESSION', 'PT_SESSIONS', 'COMBO'].includes(pkg.package_type)) {
      benefits.push(`PT: ${text(pkg.total_pt_sessions)} buổi (${pkg.session_duration_minutes || 60}p/buổi)`);
      if (pkg.package_mode === 'GROUP_1_N') benefits.push(`PT Nhóm 1-${pkg.max_group_members || 3}`);
      else benefits.push('PT 1-1');
    }
    if (pkg.package_type === 'GYM_TIME' || (pkg.package_type === 'COMBO' && pkg.total_gym_sessions == null)) benefits.push('Gym không giới hạn lượt');
    $('<div>').text(benefits.join(' · ') || '-').appendTo(item);
    $('<div>').css({ fontSize: 13, color: 'var(--text-muted, #667085)' }).text(`Áp dụng: ${(pkg.branches?.map(b => b.branch_name) || pkg.allowed_branch_names)?.join(', ') || '-'}`).appendTo(item);
    if (pkg.description) $('<div>').css('fontSize', 13).text(pkg.description).appendTo(item);
    const actions = $('<div class="view-actions">').css({ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, marginTop: 'auto', borderTop: '1px solid #edf0ee' }).appendTo(item);
    button(actions, { icon: 'info', text: 'Chi tiết', onClick: () => openPackageDetail(pkg, reload) });
    button(actions, { icon: 'edit', text: 'Sửa', onClick: () => openPackageModal(pkg.id) });
    button(actions, { icon: pkg.status === 'ACTIVE' ? 'remove' : 'check', text: pkg.status === 'ACTIVE' ? 'Ngừng bán' : 'Mở bán lại', type: pkg.status === 'ACTIVE' ? 'danger' : 'normal', stylingMode: pkg.status === 'ACTIVE' ? 'contained' : 'outlined', onClick: () => changePackageStatus(pkg, reload) });
  }
  function openPackageDetail(pkg, reload) {
    const dialog = popup(`Chi tiết gói tập: ${pkg.package_name}`, 580);
    const body = dialog.content;

    const $top = $('<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding-bottom:14px;border-bottom:1px solid #e4e7ec;margin-bottom:16px;">').appendTo(body);
    const $titles = $('<div>').appendTo($top);
    $('<h3 style="margin:0 0 4px;font-size:18px;font-weight:700;color:#101828;">').text(pkg.package_name).appendTo($titles);
    $('<div style="font-size:13px;color:#667085;">').text(`Mã định danh: ${pkg.package_code || '-'}`).appendTo($titles);
    badge($top, pkg.status);

    const section = (title) => {
      const $sec = $('<section style="margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #f2f4f7;">').appendTo(body);
      $('<h4 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#344054;text-transform:uppercase;letter-spacing:0.5px;">').text(title).appendTo($sec);
      return $sec;
    };

    const row = ($parent, label, value) => {
      const $r = $('<div style="display:grid;grid-template-columns:190px 1fr;gap:12px;padding:6px 0;font-size:14px;line-height:1.5;">').appendTo($parent);
      $('<span style="color:#667085;">').text(label).appendTo($r);
      const $val = $('<strong style="color:#1d2939;word-break:break-word;">').text(value ?? '-').appendTo($r);
      return $val;
    };

    let model;
    try { model = packageModel(pkg); } catch (_) { model = { service_type: pkg.package_type, limit_type: null }; }

    // 1. Phân loại & Bảng giá
    const $secPrice = section('Phân loại & Giá bán niêm yết');
    row($secPrice, 'Loại dịch vụ', model.service_type);
    row($secPrice, 'Cách giới hạn', model.limit_type ? limits[model.limit_type] : 'Theo ngày');
    row($secPrice, 'Tổng giá niêm yết', money(pkg.price)).css({ color: 'var(--primary, #237b58)', fontSize: '16px' });
    if (pkg.package_type === 'COMBO' || pkg.gym_price || pkg.pt_price) {
      if (pkg.gym_price) row($secPrice, 'Giá thành phần Gym', money(pkg.gym_price));
      if (pkg.pt_price) row($secPrice, 'Giá thành phần PT', money(pkg.pt_price));
    }

    // 2. Quyền lợi & Hạn mức sử dụng
    const $secBenefits = section('Quyền lợi & Hạn mức sử dụng');
    const isSessionOnly = ['PT_SESSION', 'PT_SESSIONS', 'GYM_SESSION', 'GYM_SESSIONS'].includes(pkg.package_type) || !pkg.duration_days;
    row($secBenefits, 'Thời hạn sử dụng', isSessionOnly ? 'Vô thời hạn (theo số buổi)' : `${pkg.duration_days} ngày`);

    if (['GYM_SESSION', 'GYM_SESSIONS'].includes(pkg.package_type) || (pkg.package_type === 'COMBO' && pkg.total_gym_sessions != null)) {
      row($secBenefits, 'Số lượt Gym', `${text(pkg.total_gym_sessions)} lượt`);
    } else if (pkg.package_type === 'GYM_TIME' || (pkg.package_type === 'COMBO' && pkg.total_gym_sessions == null)) {
      row($secBenefits, 'Quyền tập Gym', 'Không giới hạn lượt tập trong thời hạn');
    }

    if (['PT_SESSION', 'PT_SESSIONS', 'COMBO'].includes(pkg.package_type)) {
      row($secBenefits, 'Số buổi tập PT', `${text(pkg.total_pt_sessions)} buổi`);
      row($secBenefits, 'Thời lượng mỗi buổi', `${pkg.session_duration_minutes || 60} phút / buổi`);
      row($secBenefits, 'Hình thức huấn luyện', pkg.package_mode === 'GROUP_1_N' ? `1 Kèm Nhiều (Nhóm tối đa ${pkg.max_group_members || 3} học viên)` : '1 Kèm 1 (Cá nhân)');
    }

    // 3. Phạm vi chi nhánh & Mô tả
    const $secBranch = section('Phạm vi áp dụng & Mô tả');
    const branchNames = (pkg.branches?.map(b => b.branch_name) || pkg.allowed_branch_names)?.filter(Boolean).join(', ');
    row($secBranch, 'Chi nhánh áp dụng', branchNames || 'Tất cả chi nhánh');
    row($secBranch, 'Trạng thái bán', pkg.status === 'ACTIVE' ? 'Đang mở bán' : 'Đang ngừng bán');
    if (pkg.description) {
      const $descWrap = $('<div style="margin-top:10px;padding:12px;background:#f9fafb;border-radius:6px;border:1px solid #eaecf0;">').appendTo($secBranch);
      $('<div style="font-size:12px;font-weight:600;color:#667085;margin-bottom:4px;">').text('MÔ TẢ QUYỀN LỢI CHI TIẾT:').appendTo($descWrap);
      $('<p style="margin:0;font-size:13px;line-height:1.6;color:#344054;white-space:pre-line;">').text(pkg.description).appendTo($descWrap);
    }

    // Dialog toolbar buttons
    dialog.instance.option('toolbarItems', [
      {
        toolbar: 'bottom', location: 'after', widget: 'dxButton',
        options: { text: 'Đóng', stylingMode: 'outlined', onClick: () => dialog.instance.hide() }
      },
      {
        toolbar: 'bottom', location: 'after', widget: 'dxButton',
        options: {
          icon: pkg.status === 'ACTIVE' ? 'remove' : 'check',
          text: pkg.status === 'ACTIVE' ? 'Ngừng bán' : 'Mở bán lại',
          type: pkg.status === 'ACTIVE' ? 'danger' : 'normal',
          stylingMode: pkg.status === 'ACTIVE' ? 'contained' : 'outlined',
          onClick: () => {
            dialog.instance.hide();
            changePackageStatus(pkg, reload);
          }
        }
      },
      {
        toolbar: 'bottom', location: 'after', widget: 'dxButton',
        options: {
          icon: 'edit',
          text: 'Sửa gói',
          type: 'default',
          stylingMode: 'contained',
          onClick: () => {
            dialog.instance.hide();
            openPackageModal(pkg.id);
          }
        }
      }
    ]);
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
      const model = pkg ? packageModel(pkg) : { service_type: 'GYM', limit_type: 'DAYS' };
      const initSt = model.service_type || 'GYM';
      const initLt = model.limit_type || (initSt === 'PT' ? 'SESSIONS' : initSt === 'COMBO' ? 'DAYS_SESSIONS' : 'DAYS');
      const initShowDuration = initLt === 'DAYS' || initLt === 'DAYS_SESSIONS';
      const data = {
        ...model,
        limit_type: initLt,
        package_name: pkg?.package_name || '',
        duration_days: pkg?.duration_days ?? (initShowDuration ? (pkg ? null : 30) : null),
        total_gym_sessions: pkg?.total_gym_sessions ?? null,
        total_pt_sessions: pkg?.total_pt_sessions ?? null,
        price: pkg ? Number(pkg.price) : null,
        gym_price: pkg?.gym_price != null ? Number(pkg.gym_price) : null,
        pt_price: pkg?.pt_price != null ? Number(pkg.pt_price) : null,
        session_duration_minutes: pkg?.session_duration_minutes || 60,
        package_mode: pkg?.package_mode || 'INDIVIDUAL_1_1',
        max_group_members: pkg?.max_group_members || 3,
        branch_ids: branchIds,
        status: pkg?.status || 'ACTIVE',
        description: pkg?.description || ''
      };

      const initGymSessions = initSt === 'GYM' && initLt === 'SESSIONS';
      const initPt = ['PT', 'COMBO'].includes(initSt);
      const initCombo = initSt === 'COMBO';
      const initGroup = initPt && data.package_mode === 'GROUP_1_N';

      let dialog, updating = false;
      const items = [
        field('service_type', 'Loại gói', 'dxSelectBox', { dataSource: types, valueExpr: 'id', displayExpr: 'text', readOnly: Boolean(id) }, [required('Loại gói')]),
        field('limit_type', 'Cách giới hạn', 'dxSelectBox', { dataSource: limitOptions(initSt), valueExpr: 'id', displayExpr: 'text', readOnly: Boolean(id) || initSt !== 'GYM' }, [required('Cách giới hạn')]),
        { ...field('package_name', 'Tên gói', 'dxTextBox', { maxLength: 150 }, [required('Tên gói'), { type: 'custom', message: 'Vui lòng nhập tên gói', validationCallback: e => Boolean(e.value?.trim()) }]), colSpan: 2 },
        { ...field('duration_days', 'Thời hạn (ngày)', 'dxNumberBox', { min: 1, showSpinButtons: true }, positiveInteger(initShowDuration)), visible: initShowDuration, isRequired: initShowDuration },
        { ...field('total_gym_sessions', 'Số lượt Gym', 'dxNumberBox', { min: 1, showSpinButtons: true }, positiveInteger(true)), visible: initGymSessions, isRequired: initGymSessions },
        { ...field('total_pt_sessions', 'Số buổi PT', 'dxNumberBox', { min: 1, showSpinButtons: true }, positiveInteger(true)), visible: initPt, isRequired: initPt },
        { ...field('session_duration_minutes', 'Thời lượng 1 buổi PT (phút)', 'dxSelectBox', { items: [30, 45, 60, 90, 120] }), visible: initPt },
        { ...field('package_mode', 'Hình thức huấn luyện PT', 'dxSelectBox', { items: [{ id: 'INDIVIDUAL_1_1', text: '1 Kèm 1 (Cá nhân)' }, { id: 'GROUP_1_N', text: '1 Kèm Nhiều (Nhóm)' }], valueExpr: 'id', displayExpr: 'text' }), visible: initPt },
        { ...field('max_group_members', 'Số học viên tối đa trong nhóm', 'dxNumberBox', { min: 2, max: 10, showSpinButtons: true }), visible: initGroup, isRequired: initGroup },
        field('price', 'Tổng giá bán niêm yết (VND)', 'dxNumberBox', { min: 0, format: '#,##0', showSpinButtons: true, step: 1000 }, [required('Giá bán'), { type: 'custom', message: 'Giá bán phải lớn hơn 0', validationCallback: e => Number.isFinite(e.value) && e.value > 0 }]),
        { ...field('gym_price', 'Giá thành phần Gym (VND)', 'dxNumberBox', { min: 0, format: '#,##0', showSpinButtons: true }), visible: initCombo, isRequired: initCombo },
        { ...field('pt_price', 'Giá thành phần PT (VND)', 'dxNumberBox', { min: 0, format: '#,##0', showSpinButtons: true }), visible: initCombo, isRequired: initCombo },
        { ...field('branch_ids', 'Chi nhánh áp dụng', 'dxTagBox', { dataSource: branchList.filter(b => b.status === 'ACTIVE' || branchIds.includes(b.id)), valueExpr: 'id', displayExpr: 'branch_name', searchEnabled: true, showSelectionControls: true, selectAllText: 'Tất cả chi nhánh', applyValueMode: 'useButtons', multiline: true }, [{ type: 'custom', message: 'Chọn ít nhất một chi nhánh', validationCallback: e => Array.isArray(e.value) && e.value.length > 0 }]), colSpan: 2, isRequired: true },
        field('status', 'Trạng thái bán', 'dxSelectBox', { dataSource: sellingStatuses, valueExpr: 'id', displayExpr: 'text' }, [required('Trạng thái bán')]),
        { ...field('description', 'Mô tả quyền lợi', 'dxTextArea', { height: 90, maxLength: 2000 }), colSpan: 2 }
      ];

      function syncDynamicFields(form) {
        if (!form) return;
        const currentData = form.option('formData') || {};
        const serviceType = currentData.service_type || 'GYM';
        const limitType = currentData.limit_type;
        const pkgMode = currentData.package_mode || 'INDIVIDUAL_1_1';

        const isGym = serviceType === 'GYM';
        const isPt = serviceType === 'PT';
        const isCombo = serviceType === 'COMBO';
        const ptActive = isPt || isCombo;
        const groupActive = ptActive && pkgMode === 'GROUP_1_N';

        form.beginUpdate();

        // 1. limit_type options and state
        const lOpts = limitOptions(serviceType);
        form.itemOption('limit_type', 'editorOptions', {
          dataSource: lOpts,
          valueExpr: 'id',
          displayExpr: 'text',
          readOnly: Boolean(id) || serviceType !== 'GYM'
        });
        if (serviceType === 'PT' && limitType !== 'SESSIONS') {
          form.updateData('limit_type', 'SESSIONS');
        } else if (serviceType === 'COMBO' && limitType !== 'DAYS_SESSIONS') {
          form.updateData('limit_type', 'DAYS_SESSIONS');
        } else if (serviceType === 'GYM' && !limitType) {
          form.updateData('limit_type', 'DAYS');
        }

        const effectiveLimitType = form.option('formData')?.limit_type || limitType;
        const isGymSessions = isGym && effectiveLimitType === 'SESSIONS';

        // 2. duration_days (Thời hạn ngày):
        // CHỈ HIỆN VÀ BẮT BUỘC khi Cách giới hạn là Theo ngày (DAYS) hoặc Theo ngày + buổi (DAYS_SESSIONS cho Combo)!
        // ẨN HOÀN TOÀN khi Cách giới hạn là Theo buổi (SESSIONS - cho cả GYM Theo buổi và PT Theo buổi).
        const showDuration = effectiveLimitType === 'DAYS' || effectiveLimitType === 'DAYS_SESSIONS';
        form.itemOption('duration_days', 'visible', showDuration);
        form.itemOption('duration_days', 'isRequired', showDuration);
        form.itemOption('duration_days', 'validationRules', positiveInteger(showDuration));
        if (!showDuration) {
          form.updateData('duration_days', null);
        } else if (!form.option('formData')?.duration_days) {
          form.updateData('duration_days', 30);
        }

        // 3. total_gym_sessions (Số lượt Gym):
        // CHỈ HIỆN VÀ BẮT BUỘC khi Loại gói = GYM và Cách giới hạn = Theo buổi (SESSIONS)!
        form.itemOption('total_gym_sessions', 'visible', isGymSessions);
        form.itemOption('total_gym_sessions', 'isRequired', isGymSessions);
        if (!isGymSessions) form.updateData('total_gym_sessions', null);

        // 4. total_pt_sessions (Số buổi PT)
        form.itemOption('total_pt_sessions', 'visible', ptActive);
        form.itemOption('total_pt_sessions', 'isRequired', ptActive);
        if (!ptActive) form.updateData('total_pt_sessions', null);

        // 5. session_duration_minutes & package_mode
        form.itemOption('session_duration_minutes', 'visible', ptActive);
        form.itemOption('package_mode', 'visible', ptActive);

        // 6. max_group_members
        form.itemOption('max_group_members', 'visible', groupActive);
        form.itemOption('max_group_members', 'isRequired', groupActive);
        if (!groupActive && pkgMode !== 'GROUP_1_N') form.updateData('max_group_members', null);

        // 7. gym_price & pt_price
        form.itemOption('gym_price', 'visible', isCombo);
        form.itemOption('gym_price', 'isRequired', isCombo);
        form.itemOption('pt_price', 'visible', isCombo);
        form.itemOption('pt_price', 'isRequired', isCombo);
        if (!isCombo) {
          form.updateData('gym_price', null);
          form.updateData('pt_price', null);
        }

        form.endUpdate();
      }

      dialog = formDialog(pkg ? 'Cập nhật danh mục gói tập' : 'Tạo mới danh mục gói tập', data, items, async values => {
        const isG = values.service_type === 'GYM';
        const isGS = isG && values.limit_type === 'SESSIONS';
        const hasP = ['PT', 'COMBO'].includes(values.service_type);
        const isC = values.service_type === 'COMBO';
        const isGrp = hasP && values.package_mode === 'GROUP_1_N';

        if (isC) {
          if (values.gym_price == null || values.pt_price == null) {
            throw new Error('Vui lòng nhập đầy đủ Giá thành phần Gym và Giá thành phần PT cho gói Combo.');
          }
        }

        const isShowDuration = values.limit_type === 'DAYS' || values.limit_type === 'DAYS_SESSIONS';
        const payload = {
          package_name: values.package_name.trim(),
          duration_days: isShowDuration ? (values.duration_days ?? null) : null,
          total_gym_sessions: isGS ? values.total_gym_sessions : null,
          total_pt_sessions: hasP ? values.total_pt_sessions : null,
          price: values.price,
          gym_price: isC ? (values.gym_price ?? null) : null,
          pt_price: isC ? (values.pt_price ?? null) : null,
          session_duration_minutes: hasP ? (values.session_duration_minutes || 60) : 60,
          package_mode: hasP ? (values.package_mode || 'INDIVIDUAL_1_1') : 'INDIVIDUAL_1_1',
          max_group_members: isGrp ? (values.max_group_members || 3) : null,
          branch_ids: [...values.branch_ids],
          status: values.status,
          description: values.description?.trim() || null
        };
        if (id) await api().request(`/packages/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
        else await api().packages.create({ ...payload, package_type: packageType(values) });
        notify(id ? 'Đã cập nhật gói tập' : 'Đã tạo gói tập'); if (currentReload) await currentReload();
      }, {
        saveText: id ? 'Lưu thay đổi' : 'Tạo gói tập',
        skipUnchanged: Boolean(id),
        onChange: e => {
          if (updating || !dialog?.form) return;
          if (['service_type', 'limit_type', 'package_mode'].includes(e.dataField)) {
            updating = true;
            try {
              syncDynamicFields(dialog.form);
            } finally {
              updating = false;
            }
          }
        }
      });
      syncDynamicFields(dialog.form);
    } catch (err) { DevExpress.ui.notify(err.message, 'error', 4000); }
  }
  function openingHours(branch) { return branch.open_time && branch.close_time ? `${branch.open_time.slice(0, 5)} - ${branch.close_time.slice(0, 5)}` : '-'; }
  function renderCardMetrics(parent, stats) {
    const block = $('<dl>').css({ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, margin: 0, padding: '14px 0', borderTop: '1px solid #edf0ee', borderBottom: '1px solid #edf0ee' }).appendTo(parent);
    [['Hội viên', stats?.member_count], ['Huấn luyện viên', stats?.pt_count], ['Đang tập', stats?.currently_training]].forEach(([label, value]) => {
      const item = $('<div>').css('text-align', 'center').appendTo(block);
      $('<dd>').css({ fontSize: 22, fontWeight: 700, margin: '0 0 2px', fontFamily: 'Manrope, sans-serif', color: 'var(--text-main, #26332e)' }).text(text(value)).appendTo(item);
      $('<dt>').css({ fontSize: 11, color: 'var(--text-muted, #748078)' }).text(label).appendTo(item);
    });
  }
  async function renderBranches(containerId, context = {}) {
    const current = ++version, root = $(document.getElementById(containerId)).empty(); root.text('Đang tải chi nhánh...');
    try {
      await authorize(true);
      if (current !== version || !root[0]?.isConnected) return;
      frame(containerId, 'Chi nhánh', 'Thêm chi nhánh', () => openBranchModal());

      // 1. Hero Metric Cards Container (Tổng quan toàn chuỗi)
      const heroContainer = $('<div class="branch-hero-metrics" style="margin-bottom: 24px;">').appendTo(root);

      // 2. Thanh công cụ tìm kiếm, lọc trạng thái & chuyển chế độ xem
      const bar = $('<div class="filter-bar" style="display:flex;gap:12px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">').appendTo(root);
      const tabsEl = $('<div>').appendTo(bar);
      const searchEl = $('<div>').css({ width: 280, maxWidth: '100%' }).appendTo(bar);
      const rightGroup = $('<div style="margin-left:auto;display:flex;align-items:center;gap:10px;">').appendTo(bar);
      const count = $('<span role="status" style="color:var(--text-muted);font-size:13px;">').appendTo(rightGroup);
      const viewGroup = $('<div>').appendTo(rightGroup);
      const refreshBtn = $('<div>').appendTo(rightGroup);

      const messages = $('<div>').appendTo(root);
      const contentContainer = $('<div>').appendTo(root);
      const cards = cardGrid(contentContainer);
      const gridContainer = $('<div>').appendTo(contentContainer).hide();

      let statusFilter = '';
      let searchQuery = '';
      let viewMode = 'cards';
      let sequence = 0;
      let rawBranches = [];
      const branchStatsMap = new Map();

      const renderList = () => {
        const query = searchQuery.trim().toLowerCase();
        const filtered = rawBranches.filter(b => {
          if (statusFilter && b.status !== statusFilter) return false;
          if (query) {
            const match = [b.branch_code, b.branch_name, b.address, b.phone]
              .filter(Boolean)
              .some(f => String(f).toLowerCase().includes(query));
            if (!match) return false;
          }
          return true;
        });

        count.text(`${filtered.length} chi nhánh`);
        messages.empty();
        if (!filtered.length) {
          $('<p style="padding: 32px 0; color: var(--text-muted); text-align: center;">').text('Không tìm thấy chi nhánh nào phù hợp').appendTo(messages);
        }

        if (viewMode === 'cards') {
          gridContainer.hide().empty();
          cards.show().empty();
          filtered.forEach(branch => {
            const item = card(cards);
            const currentBranchId = api().getCurrentBranchId();
            const isCurrent = currentBranchId === branch.id;
            const statsData = branchStatsMap.get(branch.id);

            // Top Header: Name & Code | Badge
            const top = $('<div>').css({ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }).appendTo(item);
            const titleArea = $('<div>').appendTo(top);
            $('<h3>').css({ fontSize: 17, margin: '0 0 4px', lineHeight: 1.4, color: 'var(--text-main, #26332e)', fontWeight: 700 }).text(branch.branch_name).appendTo(titleArea);
            $('<div>').css({ fontSize: 12, color: 'var(--text-muted, #667085)', fontWeight: 500 }).text(branch.branch_code).appendTo(titleArea);
            badge(top, branch.status, true);

            // Address & Hours
            $('<div style="font-size:13px;color:var(--text-muted);line-height:1.4;">').text(text(branch.address)).appendTo(item);
            $('<div style="font-size:13px;color:var(--text-main);">').text(`${text(branch.phone)} · ${openingHours(branch)}`).appendTo(item);

            // PT Commission
            $('<div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">')
              .append(
                $('<i class="fa-solid fa-hand-holding-dollar" style="color:#237b58;">'),
                $('<span>').html(`Hoa hồng PT mặc định: <strong style="color:var(--text-main);">${branch.default_pt_commission_percentage != null ? branch.default_pt_commission_percentage : 20}%</strong>`)
              )
              .appendTo(item);

            // 3 Quick Stats
            const statsEl = $('<div>').appendTo(item);
            renderCardMetrics(statsEl, statsData);

            // Action Buttons
            const actions = $('<div class="view-actions">').css({ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 8 }).appendTo(item);

            // Select Branch Button
            if (isCurrent) {
              button(actions, {
                icon: 'check',
                text: 'Đang làm việc',
                type: 'default',
                stylingMode: 'contained',
                disabled: true
              });
            } else {
              button(actions, {
                icon: 'pin',
                text: 'Chọn cơ sở',
                stylingMode: 'outlined',
                onClick: () => {
                  api().setCurrentBranchId(branch.id);
                  const selector = $('#globalBranchSelector').dxSelectBox('instance');
                  if (selector) {
                    const oldHandler = selector.option('onValueChanged');
                    selector.option('onValueChanged', null);
                    selector.option('value', branch.id);
                    selector.option('onValueChanged', oldHandler);
                  }
                  $('#workspaceScope').text(branch.branch_name);
                  DevExpress.ui.notify(`Đã chuyển sang không gian làm việc của ${branch.branch_name}`, 'success', 2500);
                  renderList();
                }
              });
            }

            button(actions, {
              icon: 'chart',
              text: 'Số liệu',
              onClick: async () => {
                api().setCurrentBranchId(branch.id);
                const selector = $('#globalBranchSelector').dxSelectBox('instance');
                if (selector) {
                  const oldHandler = selector.option('onValueChanged');
                  selector.option('onValueChanged', null);
                  selector.option('value', branch.id);
                  selector.option('onValueChanged', oldHandler);
                }
                $('#workspaceScope').text(branch.branch_name);
                DevExpress.ui.notify(`Đang chuyển đến Báo cáo của ${branch.branch_name}...`, 'info', 1800);
                await window.ParadiseApp.navigateTo('reports');
              }
            });
            button(actions, { icon: 'edit', text: 'Chỉnh sửa', onClick: () => openBranchModal(branch.id) });
          });
        } else {
          cards.hide().empty();
          gridContainer.show().empty();
          const gridData = filtered.map(b => ({
            ...b,
            stats: branchStatsMap.get(b.id)
          }));

          WebUI.grid(gridContainer, gridData, [
            { dataField: 'branch_code', caption: 'Mã CN', width: 110, alignment: 'center' },
            { dataField: 'branch_name', caption: 'Tên chi nhánh', minWidth: 180 },
            { dataField: 'address', caption: 'Địa chỉ', minWidth: 230 },
            { dataField: 'phone', caption: 'Hotline', width: 130 },
            { dataField: 'opening_hours', caption: 'Giờ mở cửa', width: 130, alignment: 'center', calculateCellValue: r => openingHours(r) },
            { dataField: 'default_pt_commission_percentage', caption: 'Hoa hồng PT', width: 120, alignment: 'center', calculateCellValue: r => `${r.default_pt_commission_percentage != null ? r.default_pt_commission_percentage : 20}%` },
            { dataField: 'member_count', caption: 'Hội viên', width: 100, alignment: 'center', calculateCellValue: r => r.stats?.member_count ?? '-' },
            { dataField: 'pt_count', caption: 'HLV', width: 90, alignment: 'center', calculateCellValue: r => r.stats?.pt_count ?? '-' },
            { dataField: 'currently_training', caption: 'Đang tập', width: 100, alignment: 'center', calculateCellValue: r => r.stats?.currently_training ?? '-' },
            { dataField: 'status', caption: 'Trạng thái', width: 140, alignment: 'center', cellTemplate: (el, cell) => badge(el, cell.value, true) },
            {
              caption: 'Thao tác', width: 170, alignment: 'center',
              cellTemplate: (el, cell) => {
                const wrap = $('<div style="display:flex;gap:6px;justify-content:center;align-items:center;">').appendTo(el);
                const isCurrent = api().getCurrentBranchId() === cell.data.id;
                if (!isCurrent) {
                  button(wrap, {
                    icon: 'pin', hint: 'Chọn làm việc tại cơ sở này',
                    onClick: () => {
                      api().setCurrentBranchId(cell.data.id);
                      const selector = $('#globalBranchSelector').dxSelectBox('instance');
                      if (selector) {
                        const oldHandler = selector.option('onValueChanged');
                        selector.option('onValueChanged', null);
                        selector.option('value', cell.data.id);
                        selector.option('onValueChanged', oldHandler);
                      }
                      $('#workspaceScope').text(cell.data.branch_name);
                      DevExpress.ui.notify(`Đã chuyển sang không gian làm việc của ${cell.data.branch_name}`, 'success', 2500);
                      renderList();
                    }
                  });
                }
                button(wrap, {
                  icon: 'chart', hint: 'Xem báo cáo chi nhánh',
                  onClick: async () => {
                    api().setCurrentBranchId(cell.data.id);
                    const selector = $('#globalBranchSelector').dxSelectBox('instance');
                    if (selector) {
                      const oldHandler = selector.option('onValueChanged');
                      selector.option('onValueChanged', null);
                      selector.option('value', cell.data.id);
                      selector.option('onValueChanged', oldHandler);
                    }
                    $('#workspaceScope').text(cell.data.branch_name);
                    DevExpress.ui.notify(`Đang chuyển đến Báo cáo của ${cell.data.branch_name}...`, 'info', 1800);
                    await window.ParadiseApp.navigateTo('reports');
                  }
                });
                button(wrap, { icon: 'edit', hint: 'Chỉnh sửa', onClick: () => openBranchModal(cell.data.id) });
              }
            }
          ]);
        }
      };

      const load = async () => {
        const request = ++sequence; cards.empty(); gridContainer.empty(); messages.empty(); count.text('Đang tải chi nhánh...');
        try {
          const data = rows(await api().request('/branches', { headers: { 'x-branch-id': 'ALL' } }));
          if (current !== version || request !== sequence || !root[0].isConnected) return;
          rawBranches = data;
          branchList = data;

          // Fetch stats concurrently for all branches
          await Promise.allSettled(data.map(async branch => {
            try {
              const res = await api().request(`/branches/${encodeURIComponent(branch.id)}/stats`);
              branchStatsMap.set(branch.id, res.data);
            } catch (err) {
              branchStatsMap.set(branch.id, null);
            }
          }));

          // Compute Chain-wide Totals (Hero Metrics)
          const totalBranches = data.length;
          const activeBranches = data.filter(b => b.status === 'ACTIVE').length;
          let totalMembers = 0, totalPts = 0, currentlyTraining = 0;
          data.forEach(b => {
            const s = branchStatsMap.get(b.id);
            if (s) {
              totalMembers += Number(s.member_count || 0);
              totalPts += Number(s.pt_count || 0);
              currentlyTraining += Number(s.currently_training || 0);
            }
          });

          heroContainer.empty();
          WebUI.metrics(heroContainer, [
            { label: 'Tổng số cơ sở', value: `${totalBranches} chi nhánh`, caption: `${activeBranches} đang hoạt động`, icon: 'building', tone: 'green' },
            { label: 'Tổng hội viên toàn chuỗi', value: `${totalMembers} người`, caption: 'Hồ sơ đã đăng ký', icon: 'users', tone: 'blue' },
            { label: 'Đội ngũ Huấn luyện viên', value: `${totalPts} HLV`, caption: 'Nhân sự PT toàn hệ thống', icon: 'dumbbell', tone: 'amber' },
            { label: 'Đang tập luyện lúc này', value: `${currentlyTraining} khách`, caption: 'Check-in thực tế hôm nay', icon: 'person-running', tone: 'coral' }
          ]);

          renderList();
        } catch (err) {
          if (current === version && request === sequence) {
            count.text('Không thể tải chi nhánh');
            error(messages, err, load);
          }
        }
      };

      currentReload = load;

      tabsEl.dxTabs({
        dataSource: [{ id: '', text: 'Tất cả' }, ...branchStatuses],
        selectedIndex: 0,
        onItemClick: e => {
          statusFilter = e.itemData.id;
          renderList();
        }
      });

      let timer;
      searchEl.dxTextBox({
        label: 'Tìm chi nhánh',
        labelMode: 'static',
        placeholder: 'Tên, mã, địa chỉ, hotline...',
        showClearButton: true,
        valueChangeEvent: 'input',
        onValueChanged: e => {
          clearTimeout(timer);
          timer = setTimeout(() => {
            searchQuery = e.value || '';
            renderList();
          }, 250);
        }
      });

      viewGroup.dxButtonGroup({
        items: [
          { id: 'cards', icon: 'card', hint: 'Xem dạng lưới thẻ' },
          { id: 'grid', icon: 'menu', hint: 'Xem dạng bảng chi tiết' }
        ],
        keyExpr: 'id',
        selectedItemKeys: ['cards'],
        onItemClick: e => {
          viewMode = e.itemData.id;
          renderList();
        }
      });

      button(refreshBtn, { icon: 'refresh', hint: 'Tải lại chi nhánh và số liệu', onClick: load });

      await load();
      if (context.action === 'create') await openBranchModal();
      else if (context.branch_id) await openBranchStats(context.branch_id);
    } catch (err) {
      if (current === version) {
        root.empty();
        error(root, err, err.status === 403 ? null : () => renderBranches(containerId, context));
        if (err.status === 403) {
          DevExpress.ui.notify(err.message, 'error', 3500);
          await window.ParadiseApp.navigateTo('dashboard');
        }
      }
    }
  }
  async function openBranchModal(id = null) {
    try {
      await authorize(true); await loadBranchOptions();
      const branch = id ? (await api().branches.getById(id)).data : null;
      if (id && !branch?.id) throw new Error('Chi nhánh không tồn tại.');
      const data = {
        branch_name: branch?.branch_name || '',
        address: branch?.address || '',
        phone: branch?.phone || '',
        opening_hours: branch ? openingHours(branch) : '',
        status: branch?.status || 'ACTIVE',
        default_pt_commission_percentage: branch?.default_pt_commission_percentage != null ? Number(branch.default_pt_commission_percentage) : 20
      };
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
        field('status', 'Trạng thái hoạt động', 'dxSelectBox', { dataSource: branchStatuses, valueExpr: 'id', displayExpr: 'text' }, [required('Trạng thái hoạt động')]),
        ...(!id ? [
          field('default_pt_commission_percentage', 'Tỷ lệ hoa hồng PT mặc định (%)', 'dxNumberBox', {
            min: 0,
            max: 100,
            step: 0.5,
            format: '#,##0.0',
            showSpinButtons: true
          }, [
            required('Tỷ lệ hoa hồng PT mặc định'),
            { type: 'range', min: 0, max: 100, message: 'Tỷ lệ hoa hồng PT phải từ 0% đến 100%' }
          ])
        ] : [
          field('default_pt_commission_percentage', 'Tỷ lệ hoa hồng PT mặc định (%)', 'dxNumberBox', {
            readOnly: true,
            format: '#,##0.0'
          })
        ])
      ];
      formDialog(id ? 'Chỉnh sửa chi nhánh' : 'Thêm chi nhánh', data, items, async values => {
        const [open, close] = values.opening_hours.trim().split('-').map(s => s.trim());
        const payload = {
          branch_name: values.branch_name.trim(),
          address: values.address.trim(),
          phone: values.phone.replace(/[\s().-]/g, '').replace(/^\+84/, '0'),
          open_time: `${open}:00`,
          close_time: `${close}:00`,
          status: values.status
        };
        if (!id) {
          payload.default_pt_commission_percentage = values.default_pt_commission_percentage != null ? Number(values.default_pt_commission_percentage) : 20.0;
        }
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
        renderCardMetrics(dialog.content, stats);
        $('<h3>').css({ fontSize: 15, margin: '24px 0 16px' }).text('Dịch vụ & hoạt động trong tháng').appendTo(dialog.content);
        const table = $('<dl>').css({ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }).appendTo(dialog.content);
        [['Gói Gym đang hiệu lực', stats.active_packages?.gym], ['Gói PT đang hiệu lực', stats.active_packages?.pt], ['Combo đang hiệu lực', stats.active_packages?.combo], ['Lượt check-in trong tháng', stats.monthly_checkins], ['Buổi PT đã hoàn thành', stats.monthly_completed_pt]].forEach(([label, value]) => { $('<dt>').text(label).appendTo(table); $('<dd>').css({ margin: 0, fontWeight: 700 }).text(text(value)).appendTo(table); });
      } catch (err) { if (dialog.host.closest('body').length) { dialog.content.empty(); renderCardMetrics(dialog.content); error(dialog.content, new Error('Không thể nạp dữ liệu chi nhánh, vui lòng thử lại sau'), load); } }
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
