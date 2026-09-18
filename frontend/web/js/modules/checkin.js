window.CheckinModule = (function () {
  let selectedDate = new Date(), view, logGrid, poll, revision = 0, selected = null, inside = false, quickButton, lookupVersion = 0, manualPopup = null;
  const W = () => WebUI;
  const branchId = () => apiClient.getCurrentBranchId();
  function concreteBranch() { return branchId() && branchId() !== 'ALL'; }
  function gateMemberStore() {
    return new DevExpress.data.CustomStore({ key: 'id', loadMode: 'processed',
      load: async options => {
        const query = String(options.searchValue || '').trim();
        if (query.length < 2 || !concreteBranch()) return [];
        return W().rows(await apiClient.request('/access-gate/members?q=' + encodeURIComponent(query)));
      },
      byKey: async id => (await apiClient.request('/access-gate/member/' + encodeURIComponent(id))).data
    });
  }
  async function render(containerId, context = {}) {
    destroy();
    selectedDate = context.date ? new Date(String(context.date).slice(0, 10) + 'T00:00:00') : new Date();
    view = W().page(containerId, 'Ra vào & check-in', ParadiseApp.getBranchName());
    $('<div>').appendTo(view.actions).dxDateBox({ value: selectedDate, type: 'date', displayFormat: 'dd/MM/yyyy', max: new Date(), width: 155, inputAttr: { 'aria-label': 'Ngày xem nhật ký' }, onValueChanged: e => { if (e.value) { selectedDate = e.value; loadLogs(); } } });
    W().button(view.actions, '', 'refresh', () => refresh()).option('hint', 'Làm mới nhật ký');
    const layout = $('<div class="checkin-layout">').appendTo(view.body);
    const tools = $('<div class="checkin-tools">').appendTo(layout);
    const quick = $('<section class="tool-panel">').append('<h2>Kiểm soát ra/vào</h2>').appendTo(tools);
    $('<div id="quickMemberSelect">').appendTo(quick).dxSelectBox({
      dataSource: gateMemberStore(), minSearchLength: 2, showDataBeforeSearch: false, valueExpr: 'id', displayExpr: item => item ? [item.member_code, item.full_name, item.phone].filter(Boolean).join(' · ') : '',
      searchEnabled: true, searchExpr: ['phone', 'member_code', 'full_name'], showClearButton: true, placeholder: 'Mã HV, họ tên, số điện thoại',
      noDataText: 'Không tìm thấy hội viên', inputAttr: { 'aria-label': 'Tìm hội viên check-in' },
      onValueChanged: e => selectMember(e.value)
    });
    $('<div id="quickMemberSummary" class="selection-summary">').append($('<small>').text('Chưa chọn hội viên')).appendTo(quick);
    quickButton = W().button(quick, 'Ghi nhận vào', 'runner', quickCheckin, true);
    quickButton.option({ width: '100%', disabled: true });
    $('<div id="quickCheckinError" class="form-error" role="alert">').appendTo(quick);
    if (!concreteBranch()) $('#quickCheckinError').text('Chọn một chi nhánh làm việc để ghi nhận ra/vào.');
    const devices = $('<section class="tool-panel">').append('<h2>Thiết bị</h2><div id="gateDeviceList"></div>').appendTo(tools);
    const actions = $('<div class="view-actions">').css('margin-top', 16).appendTo(devices);
    if (ParadiseApp.isAdmin() && ParadiseApp.hasPermission('manage_devices')) W().button(actions, 'Cấu hình', 'preferences', () => ParadiseApp.navigateTo('equipment'));
    W().button(actions, 'Thủ công', 'edit', () => openManual()).option('disabled', !concreteBranch());
    const section = W().section(layout, 'Nhật ký ra/vào', header => $('<span id="accessCount" class="status-badge">').appendTo(header));
    $('<div id="gateLogError">').appendTo(section.body);
    logGrid = W().grid(section.body, [], [
      { dataField: 'check_in_time', caption: 'Thời gian', width: 85, calculateCellValue: row => W().time(row.check_in_time || row.event_time) },
      { dataField: 'direction', caption: 'Vào/Ra', width: 75, cellTemplate: (el, cell) => el.append(W().badge(cell.value === 'OUT' ? 'RA' : 'VÀO', cell.value === 'OUT' ? 'neutral' : 'success')) },
      { dataField: 'member_name', caption: 'Hội viên', minWidth: 150, cellTemplate: (el, cell) => el.append($('<strong>').text(cell.data.member_name || 'Chưa nhận diện'), $('<div class="cell-secondary">').text(cell.data.member_code || '-')) },
      { dataField: 'package_name', caption: 'Gói tập', minWidth: 145 },
      { dataField: 'device_name', caption: 'Điểm quét', minWidth: 115, calculateCellValue: row => row.device_name || row.device_code || (row.access_method === 'MANUAL' ? 'Quầy lễ tân' : '-') },
      { caption: 'Cách thức', minWidth: 115, cellTemplate: (el, cell) => { const row = cell.data; el.append(W().badge(row.access_method === 'MANUAL' || row.source === 'MANUAL' ? 'Thủ công' : row.access_method === 'RFID_CARD' ? 'Thẻ từ' : 'Quét khuôn mặt', 'info')); } },
      { caption: 'Lý do / Ghi chú', minWidth: 175, calculateCellValue: row => row.denial_reason || row.manual_reason || row.reason || '-' },
      { caption: 'Người thực hiện', minWidth: 135, calculateCellValue: row => row.performed_by_name || row.recorded_by_name || row.actor_name || (row.access_method === 'MANUAL' ? '-' : 'Hệ thống') },
      { dataField: 'status', caption: 'Trạng thái', minWidth: 145, cellTemplate: (el, cell) => { const valid = ['ALLOWED', 'VALID'].includes(cell.value); el.append(W().badge(valid ? 'Hợp lệ' : 'Không đủ điều kiện', valid ? 'success' : 'danger')); } }
    ], { columnAutoWidth: true, paging: { pageSize: 15 } });
    await refresh();
    poll = setInterval(() => { if (W().dateKey(selectedDate) === W().dateKey(new Date()) && !document.hidden) refresh(true); }, 15000);
  }
  async function loadLogs(quiet = false) {
    const version = ++revision;
    if (!logGrid) return;
    if (!quiet) logGrid.beginCustomLoading('Đang tải nhật ký...');
    try {
      const response = await apiClient.gate.getTodayLogs({ date: W().dateKey(selectedDate) });
      if (version !== revision || !logGrid) return;
      const data = W().rows(response);
      logGrid.option('dataSource', data);
      $('#accessCount').text(data.length + ' sự kiện');
      $('#gateLogError').empty();
    } catch (err) {
      if (version === revision && logGrid) W().error('#gateLogError', err, () => loadLogs());
    } finally { if (version === revision && logGrid) logGrid.endCustomLoading(); }
  }
  async function loadDevices() {
    const target = document.getElementById('gateDeviceList');
    if (!target) return;
    try {
      const response = await apiClient.request('/devices');
      if (!document.contains(target)) return;
      const devices = W().rows(response);
      $(target).empty();
      if (!devices.length) return W().empty(target, 'Chưa có thiết bị tại chi nhánh', 'display');
      devices.forEach(device => {
        const online = device.status === 'ONLINE';
        const state = {
          ONLINE: { label: 'Online', tone: 'success' }, OFFLINE: { label: 'Offline', tone: 'danger' },
          ERROR: { label: 'Lỗi', tone: 'danger' }, PENDING_SYNC: { label: 'Chờ đồng bộ', tone: 'warning' },
          INACTIVE: { label: 'Ngừng hoạt động', tone: 'neutral' }
        }[device.status] || { label: 'Chưa xác định', tone: 'neutral' };
        const row = $('<div class="device-row">').appendTo(target);
        $('<div>').append($('<strong>').text(device.device_name || device.name || device.device_code), $('<small>').text('Đồng bộ: ' + W().time(device.last_heartbeat_at || device.last_heartbeat || device.last_sync_at))).appendTo(row);
        const kiosk = /KIOSK|DISPLAY|SCREEN/.test(device.device_type || '');
        row.append(W().badge(kiosk ? (online ? 'K01 sẵn sàng' : 'K01: ' + state.label) : state.label, state.tone));
      });
    } catch (err) { if (document.contains(target)) W().error(target, err, loadDevices); }
  }
  async function refresh(quiet = false) { await Promise.allSettled([loadLogs(quiet), loadDevices()]); }
  async function selectMember(id) {
    const version = ++lookupVersion;
    selected = null; inside = false; quickButton?.option({ disabled: true, text: 'Ghi nhận vào' });
    $('#quickCheckinError').empty();
    $('#quickMemberSummary').empty().append($('<small>').text(id ? 'Đang kiểm tra hiện diện...' : 'Chưa chọn hội viên'));
    if (!id) return;
    if (!concreteBranch()) { $('#quickCheckinError').text('Chọn một chi nhánh làm việc để ghi nhận ra/vào.'); return; }
    try {
      const profile = await apiClient.request('/access-gate/member/' + encodeURIComponent(id));
      if (version !== lookupVersion || !view) return;
      selected = profile.data; inside = profile.data.is_inside === true;
      $('#quickMemberSummary').empty().append($('<strong>').text(selected.full_name), $('<small>').text(selected.member_code + ' · ' + selected.phone), $(W().badge(inside ? 'Đang trong phòng tập' : 'Đang ngoài phòng tập', inside ? 'success' : 'neutral')).css('margin-top', 9));
      quickButton.option({ disabled: false, text: inside ? 'Ghi nhận ra' : 'Ghi nhận vào' });
    } catch (err) { if (version === lookupVersion) $('#quickCheckinError').text(err.message); }
  }
  async function quickCheckin() {
    if (!selected || !concreteBranch()) return;
    quickButton.option('disabled', true); $('#quickCheckinError').empty();
    const id = selected.id, direction = inside ? 'OUT' : 'IN';
    try {
      const response = await apiClient.gate.manualCheckIn({ member_id: id, branch_id: branchId(), direction, reason: 'Ghi nhận tại quầy', event_time: new Date().toISOString() });
      if (response.data?.allowed === false) throw new Error(response.data.reason || 'Không đủ điều kiện vào tập');
      DevExpress.ui.notify(direction === 'OUT' ? 'Đã ghi nhận ra.' : 'Đã ghi nhận vào.', 'success', 2500);
      await selectMember(id);
    } catch (err) { $('#quickCheckinError').text(err.message); }
    finally { if (selected) quickButton?.option('disabled', false); await loadLogs(true); }
  }
  function openManual() {
    if (!concreteBranch()) return;
    manualPopup?.hide();
    let form, popup, submitting = false, sequence = 0;
    const data = { member_id: null, registration_id: null, direction: 'IN', event_time: new Date(), reason: 'Thiết bị lỗi', other_reason: '', location: ParadiseApp.getBranchName() + ' · Quầy lễ tân' };
    const required = [{ type: 'required', message: 'Trường này là bắt buộc' }];
    async function registrations(memberId) {
      const version = ++sequence;
      form.updateData('registration_id', null);
      form.getEditor('registration_id').option({ dataSource: [], disabled: true });
      if (!memberId) return;
      try {
        const response = await apiClient.request('/access-gate/member/' + encodeURIComponent(memberId));
        if (version !== sequence) return;
        const today = W().dateKey(new Date());
        const items = (response.data.allowed_registrations || []).filter(reg => reg.status === 'ACTIVE' && String(reg.start_date).slice(0, 10) <= today && (!reg.end_date || String(reg.end_date).slice(0, 10) >= today) && !['PT_SESSION', 'PT_SESSIONS'].includes(reg.package_type_snapshot));
        form.getEditor('registration_id').option({ dataSource: items, disabled: false });
        if (items.length === 1) form.updateData('registration_id', items[0].id);
      } catch (err) { $('#manualError').text(err.message); }
    }
    popup = W().popup('Ghi nhận ra/vào thủ công', content => {
      const body = $('<div>').appendTo(content);
      form = $('<div>').appendTo(body).dxForm({ formData: data, labelLocation: 'top', showColonAfterLabel: false, colCount: 2, colCountByScreen: { xs: 1, sm: 2 },
        items: [
          { dataField: 'member_id', label: { text: 'Hội viên' }, colSpan: 2, editorType: 'dxSelectBox', editorOptions: { dataSource: gateMemberStore(), minSearchLength: 2, showDataBeforeSearch: false, valueExpr: 'id', displayExpr: item => item ? [item.member_code, item.full_name, item.phone].join(' · ') : '', searchEnabled: true, searchExpr: ['member_code', 'full_name', 'phone'] }, validationRules: required },
          { dataField: 'registration_id', label: { text: 'Gói tập sử dụng' }, colSpan: 2, editorType: 'dxSelectBox', editorOptions: { dataSource: [], valueExpr: 'id', displayExpr: item => item ? (item.package_name_snapshot || item.package_name) + ' · ' + W().date(item.end_date) : '', disabled: true, noDataText: 'Không có gói Gym còn hiệu lực' }, validationRules: required },
          { dataField: 'location', label: { text: 'Chi nhánh / điểm vào' }, colSpan: 2, editorOptions: { readOnly: true } },
          { dataField: 'direction', label: { text: 'Loại sự kiện' }, editorType: 'dxSelectBox', editorOptions: { items: [{ id: 'IN', text: 'Vào' }, { id: 'OUT', text: 'Ra' }], valueExpr: 'id', displayExpr: 'text' }, validationRules: required },
          { dataField: 'event_time', label: { text: 'Thời điểm ghi nhận' }, editorType: 'dxDateBox', editorOptions: { type: 'datetime', displayFormat: 'dd/MM/yyyy HH:mm', max: new Date() }, validationRules: required },
          { dataField: 'reason', label: { text: 'Lý do thủ công' }, colSpan: 2, editorType: 'dxSelectBox', editorOptions: { items: ['Thiết bị lỗi', 'Không nhận diện được khuôn mặt', 'Khác'] }, validationRules: required },
          { dataField: 'other_reason', label: { text: 'Mô tả lý do khác' }, colSpan: 2, visible: false, editorType: 'dxTextArea', editorOptions: { maxLength: 255, height: 80 }, validationRules: [{ type: 'custom', reevaluate: true, validationCallback: e => data.reason !== 'Khác' || !!String(e.value || '').trim(), message: 'Nhập mô tả lý do khác' }] }
        ],
        onFieldDataChanged: e => { if (e.dataField === 'member_id') registrations(e.value); if (e.dataField === 'reason') form.itemOption('other_reason', 'visible', e.value === 'Khác'); }
      }).dxForm('instance');
      $('<div id="manualError" class="form-error" role="alert">').appendTo(body);
    }, [
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Hủy', onClick: () => popup.hide() } },
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Ghi nhận thủ công', type: 'default', stylingMode: 'contained', onClick: async e => {
        if (submitting || !form.validate().isValid) return;
        submitting = true; e.component.option('disabled', true); $('#manualError').empty();
        try {
          const response = await apiClient.gate.manualCheckIn({ member_id: data.member_id, registration_id: data.registration_id, branch_id: branchId(), direction: data.direction, event_time: new Date(data.event_time).toISOString(), reason: data.reason === 'Khác' ? data.other_reason.trim() : data.reason });
          if (response.data?.allowed === false) throw new Error(response.data.reason || 'Không đủ điều kiện vào tập');
          DevExpress.ui.notify('Đã ghi nhận sự kiện ra/vào.', 'success', 2500);
          popup.hide(); await loadLogs(); if (selected?.id === data.member_id) await selectMember(data.member_id);
        } catch (err) { $('#manualError').text(err.message); }
        finally { submitting = false; if ($('#manualError').length) e.component.option('disabled', false); }
      } } }
    ]);
    manualPopup = popup;
    popup.option('onDisposing', () => { if (manualPopup === popup) manualPopup = null; });
  }
  function destroy() { clearInterval(poll); manualPopup?.hide(); revision++; lookupVersion++; selected = null; logGrid = null; view = null; quickButton = null; }
  return { render, refresh, destroy, openManual };
})();
