/** W05/W06: scoped PT profiles, availability and staff booking workflows. */
window.PtSchedulerModule = (function () {
  'use strict';

  const PROFILE_STATUS = { ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', ARCHIVED: 'Đã lưu trữ' };
  const BOOKING_STATUS = {
    BOOKED: 'Đã đặt', AWAITING_CONFIRMATION: 'Chờ xác nhận hoàn thành',
    PENDING_COMPLETION: 'Chờ xác nhận hoàn thành', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', NO_SHOW: 'Vắng mặt'
  };
  const BADGES = {
    ACTIVE: 'badge-success', INACTIVE: 'badge-warning', ARCHIVED: 'badge-danger', BOOKED: 'badge-info',
    AWAITING_CONFIRMATION: 'badge-warning', PENDING_COMPLETION: 'badge-warning', COMPLETED: 'badge-success',
    CANCELLED: 'badge-warning', NO_SHOW: 'badge-danger'
  };
  let current = null;
  const api = () => window.apiClient;
  const read = response => response?.data ?? response;
  const rows = response => { const data = read(response); return Array.isArray(data) ? data : (data?.items || []); };
  const isAdmin = () => {
    if (window.ParadiseApp?.isAdmin) return window.ParadiseApp.isAdmin();
    const user = api()?.getUser();
    return [...(Array.isArray(user?.roles) ? user.roles : []), user?.role].some(role => ['QTV', 'ADMIN'].includes(role));
  };
  const dayKey = value => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const date = new Date(value);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  };
  const dayDate = value => new Date(`${dayKey(value)}T00:00:00`);
  const clock = value => String(value || '').slice(0, 5);
  const appointmentTime = (day, time) => new Date(`${dayKey(day)}T${clock(time)}:00`);
  const trainerLabel = pt => pt ? `${pt.full_name || ''} (${pt.pt_code || pt.code || ''})` : '';
  const memberLabel = member => member ? `${member.member_code || member.code || ''} - ${member.full_name || ''}` : '';
  const phoneValue = value => String(value || '').replace(/[\s().-]/g, '').replace(/^\+84/, '0');
  const nameValue = value => String(value || '').trim().replace(/\s+/g, ' ');
  const activeBooking = booking => !['CANCELLED', 'NO_SHOW'].includes(booking.status);
  const pendingBooking = booking => ['BOOKED', 'AWAITING_CONFIRMATION', 'PENDING_COMPLETION'].includes(booking.status);
  const ended = booking => appointmentTime(booking.booking_date, booking.end_time).getTime() <= Date.now();
  const alive = state => current === state && $.contains(document, state.root[0]);
  const branchId = () => {
    const active = api()?.getCurrentBranchId();
    if (active && active !== 'ALL') return active;
    const user = api()?.getUser();
    if (isAdmin()) return null;
    return user?.branch_id || user?.branch_ids?.[0] || null;
  };

  function request(path, params, options) {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value);
    });
    return api().request(`${path}${query.toString() ? '?' + query.toString() : ''}`, options);
  }
  function notify(message, type = 'success') { DevExpress.ui.notify({ message, type, displayTime: type === 'error' ? 5000 : 3000 }); }
  function button(parent, options) {
    return $('<div>').appendTo(parent).dxButton({ stylingMode: 'outlined', elementAttr: { 'aria-label': options.text || options.hint || '' }, ...options }).dxButton('instance');
  }
  function badge(parent, value, labels = BOOKING_STATUS) {
    $('<span>').addClass(`status-badge ${BADGES[value] || 'badge-info'}`).text(labels[value] || value || '--').appendTo(parent);
  }
  function message(parent, text, retry, error = false) {
    parent.empty().attr('role', error ? 'alert' : 'status').addClass('pt-state');
    $('<p>').text(text).appendTo(parent);
    if (retry) button(parent, { icon: 'refresh', text: 'Thử lại', onClick: retry });
  }
  function showError(parent, error, retry) { message(parent, error?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.', retry, true); }
  function createView(containerId, mode, title, context) {
    if (current) current.popups.forEach(popup => popup.hide());
    const container = typeof containerId === 'string' ? $(document.getElementById(containerId.replace(/^#/, ''))) : $(containerId);
    container.empty();
    const root = $('<section class="pt-module">').appendTo(container);
    const header = $('<div class="view-header">').appendTo(root);
    const heading = $('<div class="view-header-title">').appendTo(header);
    $('<h2>').text(title).appendTo(heading);
    const actions = $('<div class="view-actions">').appendTo(header);
    const status = $('<div class="pt-page-status" aria-live="polite">').appendTo(root);
    current = { root, header, heading, actions, status, mode, containerId, context: context || {}, popups: [], sequence: 0 };
    return current;
  }
  function field(dataField, label, required = false, editorType = 'dxTextBox', editorOptions = {}) {
    return { dataField, label: { text: label }, editorType, editorOptions,
      validationRules: required ? [{ type: 'required', message: `${label} là bắt buộc.` }] : [] };
  }
  function readonlyField(label, value) {
    return { label: { text: label }, template: (_, element) => $('<div class="pt-readonly">').text(value || '--').appendTo(element) };
  }

  function formPopup(state, settings) {
    const host = $('<div>').appendTo(state.root);
    let form, errorBox, saveButton;
    let saving = false;
    let closed = false;
    const popup = host.dxPopup({
      title: settings.title, width: settings.width || 600, maxWidth: 'calc(100vw - 24px)', height: 'auto', maxHeight: '90vh',
      showCloseButton: true, dragEnabled: true, hideOnOutsideClick: false,
      onHiding: event => { if (saving) event.cancel = true; },
      onHidden: () => { closed = true; settings.onClose?.(); state.popups = state.popups.filter(item => item !== popup); host.remove(); },
      contentTemplate: element => {
        const content = $('<div class="pt-form-content">').appendTo(element);
        if (settings.summary) $('<p>').text(settings.summary).appendTo(content);
        errorBox = $('<div aria-live="polite">').appendTo(content);
        form = $('<div>').appendTo(content).dxForm({
          formData: settings.data, labelLocation: 'top', showColonAfterLabel: false, showRequiredMark: true, colCount: 1,
          items: settings.items,
          onFieldDataChanged: event => {
            if (!saving && settings.changed) saveButton?.option('disabled', !settings.changed(form.option('formData')));
            settings.onChange?.(event, form);
          }
        }).dxForm('instance');
        settings.onReady?.(form, errorBox);
      },
      toolbarItems: [
        { widget: 'dxButton', toolbar: 'bottom', location: 'after', options: { text: 'Hủy', stylingMode: 'outlined', onClick: () => popup.hide() } },
        { widget: 'dxButton', toolbar: 'bottom', location: 'after', options: {
          text: settings.submitText || 'Lưu thay đổi', icon: settings.submitIcon || 'save', type: settings.destructive ? 'danger' : 'default',
          stylingMode: 'contained', disabled: !!settings.changed, onInitialized: event => { saveButton = event.component; },
          onClick: async () => {
            if (saving || closed) return;
            const validation = form.validate();
            const result = validation.status === 'pending' ? await validation.complete : validation;
            if (!result.isValid || closed || saving) return;
            saving = true;
            saveButton.option('disabled', true);
            form.option('disabled', true);
            errorBox.empty();
            try { await settings.submit(form.option('formData')); saving = false; popup.hide(); }
            catch (error) {
              if (!closed) {
                showError(errorBox, error);
                const dataField = error.data?.field || error.data?.data?.field;
                if (dataField && form.getEditor(dataField)) form.getEditor(dataField).option({ isValid: false, validationErrors: [{ message: error.message }] });
              }
            } finally {
              saving = false;
              if (!closed) {
                form.option('disabled', false);
                saveButton.option('disabled', settings.changed ? !settings.changed(form.option('formData')) : false);
              }
            }
          }
        } }
      ]
    }).dxPopup('instance');
    state.popups.push(popup);
    popup.show();
    return { popup, form, errorBox };
  }
  function profileData(pt) {
    return { full_name: pt?.full_name || '', phone: pt?.phone || '', email: pt?.email || '',
      branch_id: pt?.branch_id || branchId(), specialty: pt?.specialty ?? pt?.specialties ?? '' };
  }
  function profilePayload(data, editing) {
    const payload = { full_name: nameValue(data.full_name), email: String(data.email || '').trim() || null,
      branch_id: data.branch_id, specialties: String(data.specialty || '').trim() || null };
    if (!editing) payload.phone = phoneValue(data.phone);
    return payload;
  }

  async function showTrainerForm(state, pt) {
    if (!isAdmin()) return;
    try {
      if (pt) pt = read(await api().request(`/pt-bookings/trainers/${encodeURIComponent(pt.id)}`));
      const branches = rows(await api().branches.list()).filter(branch => branch.status === 'ACTIVE' || branch.id === pt?.branch_id);
      if (!alive(state)) return;
      const data = profileData(pt);
      const original = JSON.stringify(profilePayload(data, !!pt));
      let phoneValidation = 0;
      let formInstance = null;
      let checkChanged = null;

      const phoneField = field('phone', 'Số điện thoại', true, 'dxTextBox', {
        readOnly: !!pt, mode: 'tel', valueChangeEvent: 'input', inputAttr: { autocomplete: 'tel', 'aria-label': 'Số điện thoại' }
      });
      if (!pt) phoneField.validationRules.push(
        { type: 'custom', message: 'Số điện thoại Việt Nam phải gồm 10 chữ số.', validationCallback: event => /^0\d{9}$/.test(phoneValue(event.value)) },
        { type: 'async', message: 'Số điện thoại đã tồn tại.', ignoreEmptyValue: true, validationCallback: async event => {
          const value = phoneValue(event.value);
          if (!/^0\d{9}$/.test(value)) return true;
          const sequence = ++phoneValidation;
          await new Promise(resolve => setTimeout(resolve, 300));
          if (sequence !== phoneValidation) return true;
          const result = read(await request('/pt-bookings/trainers/check-phone', { phone: value }));
          if (typeof result?.exists !== 'boolean') throw new Error('Chưa xác minh được số điện thoại.');
          return !result.exists;
        } }
      );
      const nameField = field('full_name', 'Họ và tên', true);
      nameField.validationRules.push({ type: 'custom', message: 'Vui lòng nhập họ và tên.', validationCallback: event => !!nameValue(event.value) });
      const emailField = field('email', 'Email', false, 'dxTextBox', { mode: 'email', inputAttr: { autocomplete: 'email' } });
      emailField.validationRules.push({ type: 'email', message: 'Email không đúng định dạng.' });

      return formPopup(state, {
        title: pt ? 'Sửa hồ sơ PT' : 'Thêm mới hồ sơ PT', width: 680, data, submitText: pt ? 'Lưu thay đổi' : 'Thêm PT', submitIcon: pt ? 'save' : 'add',
        changed: pt ? values => JSON.stringify(profilePayload(values, true)) !== original : undefined,
        onReady: (f, eb) => { formInstance = f; },
        items: [
          nameField, phoneField, emailField,
          field('branch_id', 'Chi nhánh phục vụ', true, 'dxSelectBox', {
            dataSource: branches, valueExpr: 'id', displayExpr: 'branch_name', searchEnabled: true,
            noDataText: 'Không có chi nhánh được phép', placeholder: 'Chọn chi nhánh'
          }),
          field('specialty', 'Chuyên môn / Ghi chú', false, 'dxTextArea', { height: 72 })
        ],
        submit: async values => {
          await api().request(pt ? `/pt-bookings/trainers/${encodeURIComponent(pt.id)}` : '/pt-bookings/trainers', {
            method: pt ? 'PUT' : 'POST', body: profilePayload(values, !!pt)
          });
          notify(pt ? 'Đã cập nhật hồ sơ PT.' : 'Đã thêm hồ sơ PT.');
          await loadTrainers(state);
        }
      });
    } catch (error) { if (alive(state)) showError(state.status, error, () => showTrainerForm(state, pt)); }
  }

  async function showTrainerDetail(state, pt) {
    try {
      const fullPt = read(await api().request(`/pt-bookings/trainers/${encodeURIComponent(pt.id)}`));
      const host = $('<div>').appendTo(state.root);
      const popup = host.dxPopup({
        title: `Hồ sơ PT: ${fullPt.full_name} (${fullPt.pt_code || pt.code || ''})`,
        width: 660, maxWidth: 'calc(100vw - 24px)', height: 'auto', maxHeight: '90vh',
        showCloseButton: true, dragEnabled: true, hideOnOutsideClick: true,
        onHidden: () => {
          state.popups = state.popups.filter(item => item !== popup);
          host.remove();
        },
        contentTemplate: element => {
          const content = $('<div class="pt-trainer-detail-content" style="padding: 10px;">').appendTo(element);
          const infoGroup = [
            readonlyField('Họ và tên', fullPt.full_name),
            readonlyField('Mã PT', fullPt.pt_code || pt.code),
            readonlyField('Số điện thoại', fullPt.phone || 'Chưa cập nhật'),
            readonlyField('Email', fullPt.email || 'Chưa cập nhật'),
            readonlyField('Chi nhánh phục vụ', fullPt.branch_name || '--'),
            { label: { text: 'Trạng thái' }, template: (_, el) => badge(el, fullPt.status, PROFILE_STATUS) },
            readonlyField('Chuyên môn / Ghi chú', fullPt.specialties || fullPt.specialty || 'Chưa cập nhật')
          ];
          $('<div>').appendTo(content).dxForm({
            readOnly: true, labelLocation: 'top', colCount: 2, colCountByScreen: { xs: 1 }, items: infoGroup
          });
        },
        toolbarItems: [
          ...(isAdmin() ? [{
            widget: 'dxButton', toolbar: 'bottom', location: 'after',
            options: {
              text: 'Sửa hồ sơ PT', icon: 'edit', type: 'default', stylingMode: 'contained',
              onClick: () => {
                popup.hide();
                showTrainerForm(state, fullPt);
              }
            }
          }] : []),
          {
            widget: 'dxButton', toolbar: 'bottom', location: 'after',
            options: { text: 'Đóng', stylingMode: 'outlined', onClick: () => popup.hide() }
          }
        ]
      }).dxPopup('instance');
      state.popups.push(popup);
      popup.show();
    } catch (error) {
      if (alive(state)) showError(state.status, error);
    }
  }

  function showTrainerStatus(state, pt) {
    if (!isAdmin()) return;
    formPopup(state, {
      title: 'Đổi trạng thái hồ sơ PT', data: { status: pt.status, reason: '' }, changed: data => data.status !== pt.status,
      items: [readonlyField('Huấn luyện viên', trainerLabel(pt)),
        { label: { text: 'Trạng thái hiện tại' }, template: (_, element) => badge(element, pt.status, PROFILE_STATUS) },
        field('status', 'Trạng thái mới', true, 'dxSelectBox', {
          dataSource: Object.entries(PROFILE_STATUS).map(([id, text]) => ({ id, text })), valueExpr: 'id', displayExpr: 'text'
        }), field('reason', 'Lý do đổi trạng thái', false, 'dxTextArea', { height: 88 })],
      submit: async data => {
        await api().request(`/pt-bookings/trainers/${encodeURIComponent(pt.id)}/status`, {
          method: 'PATCH', body: { status: data.status, reason: String(data.reason || '').trim() || null }
        });
        notify('Đã cập nhật trạng thái PT.');
        await loadTrainers(state);
      }
    });
  }

  async function renderTrainers(containerId, context = {}) {
    const state = createView(containerId, 'trainers', 'Huấn luyện viên', context);
    state.branch = branchId();
    state.filterStatus = null;
    state.count = $('<span class="pt-count">').appendTo(state.heading);
    if (isAdmin()) button(state.actions, { text: 'Thêm hồ sơ PT', icon: 'add', type: 'default', stylingMode: 'contained', onClick: () => showTrainerForm(state) });
    button(state.actions, { icon: 'refresh', hint: 'Tải lại danh sách PT', onClick: () => loadTrainers(state) });
    const filters = $('<div class="filter-bar">').appendTo(state.root);
    $('<div>').appendTo(filters).dxTextBox({
      placeholder: 'Tìm theo tên, SĐT hoặc mã PT', showClearButton: true, width: 300, valueChangeEvent: 'input',
      inputAttr: { 'aria-label': 'Tìm huấn luyện viên' }, onValueChanged: event => state.grid?.searchByText(event.value || '')
    });
    $('<div>').appendTo(filters).dxSelectBox({
      label: 'Trạng thái', labelMode: 'floating', placeholder: 'Tất cả trạng thái', width: 210,
      dataSource: Object.entries(PROFILE_STATUS).filter(([id]) => isAdmin() || id !== 'ARCHIVED').map(([id, text]) => ({ id, text })),
      valueExpr: 'id', displayExpr: 'text', showClearButton: true,
      onValueChanged: event => { state.filterStatus = event.value; loadTrainers(state); }
    });
    if (isAdmin()) {
      state.branchFilter = $('<div>').appendTo(filters).dxSelectBox({
        label: 'Chi nhánh', labelMode: 'floating', placeholder: 'Tất cả chi nhánh được phép', width: 240,
        valueExpr: 'id', displayExpr: 'branch_name', value: state.branch, searchEnabled: true, showClearButton: true,
        onValueChanged: event => { state.branch = event.value; loadTrainers(state); }
      }).dxSelectBox('instance');
      try {
        const branches = rows(await api().branches.list());
        if (!alive(state)) return;
        state.branchFilter.option('dataSource', branches);
      } catch (error) { if (alive(state)) showError(state.status, error, () => renderTrainers(containerId, context)); }
    }
    if (!alive(state)) return;
    const columns = [
      { dataField: 'pt_code', caption: 'Mã PT', width: 100, calculateCellValue: pt => pt.pt_code || pt.code },
      { dataField: 'full_name', caption: 'Họ và tên', minWidth: 180 },
      { dataField: 'phone', caption: 'Số điện thoại', width: 140 },
      { dataField: 'email', caption: 'Email', minWidth: 180, cellTemplate: (cell, info) => cell.text(info.value || '--') },
      { dataField: 'branch_name', caption: 'Chi nhánh phục vụ', minWidth: 170 },
      { dataField: 'specialty', caption: 'Chuyên môn / Ghi chú', minWidth: 220, calculateCellValue: pt => pt.specialty ?? pt.specialties ?? '--' },
      { dataField: 'status', caption: 'Trạng thái', width: 165, cellTemplate: (cell, info) => badge(cell, info.value, PROFILE_STATUS) }
    ];
    const actionButtons = [
      { icon: 'card', hint: 'Xem chi tiết hồ sơ', onClick: event => showTrainerDetail(state, event.row.data) }
    ];
    if (isAdmin()) {
      actionButtons.push(
        { icon: 'edit', hint: 'Sửa hồ sơ PT', onClick: event => showTrainerForm(state, event.row.data) },
        { icon: 'repeat', hint: 'Đổi trạng thái', onClick: event => showTrainerStatus(state, event.row.data) }
      );
    }
    columns.push({ type: 'buttons', caption: 'Thao tác', width: isAdmin() ? 130 : 70, buttons: actionButtons });
    state.grid = $('<div id="trainersGrid">').appendTo($('<div class="card-panel">').appendTo(state.root)).dxDataGrid({
      dataSource: [], keyExpr: 'id', showBorders: false, showRowLines: true, columnAutoWidth: true, wordWrapEnabled: true,
      rowAlternationEnabled: true, hoverStateEnabled: true, noDataText: 'Không có huấn luyện viên phù hợp.',
      searchPanel: { visible: false, searchVisibleColumnsOnly: true }, scrolling: { mode: 'standard', useNative: true },
      paging: { pageSize: 20 }, pager: { visible: true, showInfo: true, showPageSizeSelector: true, allowedPageSizes: [10, 20, 50] }, columns
    }).dxDataGrid('instance');
    await loadTrainers(state);
    if (alive(state) && context.action === 'create') await showTrainerForm(state);
  }
  async function loadTrainers(state) {
    if (!alive(state) || !state.grid) return;
    const sequence = ++state.sequence;
    state.status.empty();
    state.grid.beginCustomLoading('Đang tải huấn luyện viên...');
    try {
      const trainers = rows(await request('/pt-bookings/trainers', { branch_id: state.branch, status: state.filterStatus }));
      if (!alive(state) || sequence !== state.sequence) return;
      const scoped = state.branch ? trainers.filter(pt => pt.branch_id === state.branch) : trainers;
      state.grid.option('dataSource', scoped);
      state.count.text(`${scoped.length} huấn luyện viên`);
    } catch (error) {
      if (alive(state) && sequence === state.sequence) { state.grid.option('dataSource', []); state.count.text(''); showError(state.status, error, () => loadTrainers(state)); }
    } finally { if (alive(state) && sequence === state.sequence) state.grid.endCustomLoading(); }
  }

  function scheduleDates(state) {
    const date = dayDate(state.date);
    if (state.modeView === 'list' || state.calendarView === 'day') return [dayKey(date)];
    date.setDate(date.getDate() - (date.getDay() + 6) % 7);
    return Array.from({ length: 5 }, (_, index) => { const item = new Date(date); item.setDate(item.getDate() + index); return dayKey(item); });
  }
  async function renderSchedule(containerId, context = {}) {
    if (typeof context === 'string') context = { pt_id: context };
    if (['BOOKED', 'PENDING_COMPLETION', 'AWAITING_CONFIRMATION'].includes(context.status) && context.action !== 'create') {
      return renderBookingTasks(containerId, context);
    }
    const state = createView(containerId, 'schedule', 'Lịch tập PT', context);
    state.date = context.date ? dayDate(context.date) : new Date();
    state.modeView = 'calendar'; state.calendarView = 'day'; state.trainer = null;
    state.bookings = []; state.availability = new Map();
    button(state.actions, { icon: 'refresh', hint: 'Tải lại lịch PT', onClick: () => state.trainer ? loadSchedule(state) : loadScheduleTrainers(state) });
    const filters = $('<div class="filter-bar">').appendTo(state.root);
    state.selector = $('<div id="ptSelector">').css('max-width', '100%').appendTo(filters).dxSelectBox({
      label: 'Huấn luyện viên', labelMode: 'floating', placeholder: 'Tìm theo tên, SĐT hoặc mã PT', width: 330,
      searchEnabled: true, searchExpr: ['full_name', 'phone', 'pt_code', 'code'], displayExpr: trainerLabel, valueExpr: 'id',
      showClearButton: true, noDataText: 'Không tìm thấy huấn luyện viên',
      onValueChanged: event => {
        state.trainer = (state.trainers || []).find(pt => pt.id === event.value) || null;
        state.sequence++; state.status.empty();
        state.controls.css('display', state.trainer ? 'flex' : 'none');
        state.content.empty();
        if (state.trainer) state.loading = loadSchedule(state);
        else message(state.content, 'Chưa có HLV được chọn');
      }
    }).dxSelectBox('instance');
    state.controls = $('<div class="pt-schedule-controls">').css({ display: 'none', flexWrap: 'wrap', gap: 10, alignItems: 'center' }).appendTo(filters);
    state.datePicker = $('<div>').appendTo(state.controls).dxDateBox({
      type: 'date', displayFormat: 'dd/MM/yyyy', value: state.date, useMaskBehavior: true, label: 'Ngày xem lịch', labelMode: 'floating', width: 180,
      onValueChanged: event => {
        if (!event.value || dayKey(event.value) === dayKey(state.date)) return;
        state.date = dayDate(event.value); loadSchedule(state);
      }
    }).dxDateBox('instance');
    $('<div>').appendTo(state.controls).dxButtonGroup({
      items: [{ id: 'calendar', text: 'Lịch', icon: 'event' }, { id: 'list', text: 'Danh sách', icon: 'menu' }],
      keyExpr: 'id', selectedItemKeys: ['calendar'], selectionMode: 'single',
      onSelectionChanged: event => {
        const selected = event.addedItems[0];
        if (selected && state.modeView !== selected.id) { state.modeView = selected.id; loadSchedule(state); }
      }
    });
    state.content = $('<div class="pt-schedule-content">').appendTo(state.root);
    message(state.content, 'Chưa có HLV được chọn');
    let targetBooking;
    if (context.booking_id) {
      try {
        targetBooking = rows(await request('/pt-bookings', { branch_id: branchId(), date: context.date })).find(booking => booking.id === context.booking_id);
        if (!targetBooking) throw new Error('Không tìm thấy buổi tập trong phạm vi được phép.');
        context.pt_id = targetBooking.pt_id; state.date = dayDate(targetBooking.booking_date); state.datePicker.option('value', state.date);
      } catch (error) { if (alive(state)) showError(state.status, error); }
    }
    await loadScheduleTrainers(state, context.pt_id);
    await state.loading;
    if (alive(state) && targetBooking) await showBookingDetail(state, targetBooking);
    else if (alive(state) && context.action === 'create' && state.trainers) showQuickBooking(state);
  }
  async function loadScheduleTrainers(state, presetPtId) {
    state.selector.option('disabled', true);
    try {
      const trainers = rows(await request('/pt-bookings/trainers', { branch_id: branchId(), status: 'ACTIVE' }));
      if (!alive(state)) return;
      state.trainers = trainers.filter(pt => pt.status === 'ACTIVE' && (!branchId() || pt.branch_id === branchId()));
      if (presetPtId && !state.trainers.some(pt => pt.id === presetPtId)) {
        const historical = read(await api().request(`/pt-bookings/trainers/${encodeURIComponent(presetPtId)}`));
        if (!alive(state)) return;
        if (!historical?.id || (branchId() && historical.branch_id !== branchId())) throw new Error('Huấn luyện viên không thuộc phạm vi chi nhánh hiện tại.');
        state.trainers.push(historical);
      }
      state.selector.option('dataSource', state.trainers);
      if (presetPtId && state.trainers.some(pt => pt.id === presetPtId)) state.selector.option('value', presetPtId);
    } catch (error) { if (alive(state)) showError(state.status, error, () => loadScheduleTrainers(state, presetPtId)); }
    finally { if (alive(state)) state.selector.option('disabled', false); }
  }
  async function loadSchedule(state) {
    if (!alive(state) || !state.trainer) return;
    const sequence = ++state.sequence;
    const dates = scheduleDates(state);
    const pt = state.trainer;
    state.availability = new Map();
    state.bookings = [];
    state.status.empty(); message(state.content, 'Đang tải lịch tập...');
    try {
      const responses = await Promise.all([
        request('/pt-bookings', { pt_id: pt.id, branch_id: pt.branch_id, date_from: dates[0], date_to: dates[dates.length - 1] }),
        ...(pt.status === 'ACTIVE' ? dates.map(date => request('/pt-bookings/available-slots', { pt_id: pt.id, date })) : [])
      ]);
      if (!alive(state) || sequence !== state.sequence) return;
      state.bookings = rows(responses[0]).filter(booking => booking.pt_id === pt.id && dates.includes(dayKey(booking.booking_date)));
      state.availability = new Map(dates.map((date, index) => [date, read(responses[index + 1])]));
      state.content.empty().removeAttr('role').removeClass('pt-state');
      if (state.modeView === 'list') renderSlotList(state); else renderCalendar(state);
    } catch (error) { if (alive(state) && sequence === state.sequence) showError(state.content, error, () => loadSchedule(state)); }
  }
  async function renderBookingTasks(containerId, context) {
    const state = createView(containerId, 'booking-tasks', 'Lịch tập PT', context);
    state.branch = branchId();
    state.taskStatus = context.status === 'BOOKED' ? 'BOOKED' : 'PENDING_COMPLETION';
    state.taskDate = context.date ? dayDate(context.date) : null;
    state.upcomingOnly = context.upcoming !== false;
    state.count = $('<span class="pt-count">').appendTo(state.heading);
    const navigate = nextContext => window.ParadiseApp?.navigateTo
      ? window.ParadiseApp.navigateTo('pt-schedule', nextContext) : renderSchedule(containerId, nextContext);
    button(state.actions, { icon: 'add', text: 'Đặt lịch PT', type: 'default', stylingMode: 'contained', onClick: () => navigate({ action: 'create' }) });
    button(state.actions, { icon: 'event', text: 'Lịch theo HLV', onClick: () => navigate({}) });
    button(state.actions, { icon: 'refresh', hint: 'Tải lại danh sách lịch PT', onClick: () => loadBookingTasks(state) });
    const filters = $('<div class="filter-bar">').appendTo(state.root);
    $('<div>').css('max-width', '100%').appendTo(filters).dxSelectBox({
      label: 'Trạng thái', labelMode: 'floating', width: 245, value: state.taskStatus, valueExpr: 'id', displayExpr: 'text',
      dataSource: [
        { id: 'BOOKED', text: BOOKING_STATUS.BOOKED },
        { id: 'PENDING_COMPLETION', text: BOOKING_STATUS.PENDING_COMPLETION }
      ],
      onValueChanged: event => {
        state.taskStatus = event.value;
        state.upcomingControl.toggle(event.value === 'BOOKED');
        loadBookingTasks(state);
      }
    });
    $('<div>').appendTo(filters).dxDateBox({
      label: 'Ngày tập', labelMode: 'floating', type: 'date', displayFormat: 'dd/MM/yyyy', value: state.taskDate,
      useMaskBehavior: true, showClearButton: true, placeholder: 'Tất cả ngày', width: 180,
      onValueChanged: event => { state.taskDate = event.value; loadBookingTasks(state); }
    });
    state.upcomingControl = $('<div>').toggle(state.taskStatus === 'BOOKED').appendTo(filters).dxCheckBox({
      text: 'Chỉ lịch sắp tới', value: state.upcomingOnly,
      onValueChanged: event => { state.upcomingOnly = event.value; loadBookingTasks(state); }
    });
    state.grid = $('<div id="ptBookingTasksGrid">').appendTo($('<div class="card-panel">').appendTo(state.root)).dxDataGrid({
      dataSource: [], keyExpr: 'id', showBorders: false, showRowLines: true, rowAlternationEnabled: true,
      hoverStateEnabled: true, columnAutoWidth: true, wordWrapEnabled: true,
      columnFixing: { enabled: true },
      noDataText: 'Không có lịch PT phù hợp với bộ lọc.',
      searchPanel: { visible: true, width: 260, placeholder: 'Tìm PT, hội viên hoặc gói tập' },
      scrolling: { useNative: true }, paging: { pageSize: 20 },
      pager: { visible: true, showInfo: true, showPageSizeSelector: true, allowedPageSizes: [10, 20, 50] },
      onRowDblClick: event => showBookingDetail(state, event.data),
      columns: [
        { dataField: 'booking_date', caption: 'Ngày tập', width: 115, dataType: 'date', format: 'dd/MM/yyyy', sortOrder: 'asc', sortIndex: 0 },
        { caption: 'Khung giờ', width: 125, calculateCellValue: booking => `${clock(booking.start_time)} - ${clock(booking.end_time)}` },
        { dataField: 'pt_name', caption: 'Huấn luyện viên', minWidth: 180 },
        { dataField: 'member_name', caption: 'Hội viên', minWidth: 180, cellTemplate: (cell, info) => {
          $('<strong>').text(info.value || '--').appendTo(cell);
          $('<div>').text(info.data.member_code || '').appendTo(cell);
        } },
        { dataField: 'package_name', caption: 'Gói PT sử dụng', minWidth: 160 },
        { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 160 },
        { dataField: 'status', caption: 'Trạng thái', minWidth: 175, cellTemplate: (cell, info) => badge(cell, info.value) },
        { type: 'buttons', caption: 'Thao tác', width: 105, fixed: true, fixedPosition: 'right', buttons: [
          { icon: 'find', hint: 'Chi tiết buổi tập', onClick: event => showBookingDetail(state, event.row.data) },
          { icon: 'event', hint: 'Xem lịch HLV ngày này', onClick: event => navigate({ pt_id: event.row.data.pt_id, date: dayKey(event.row.data.booking_date) }) }
        ] }
      ]
    }).dxDataGrid('instance');
    await loadBookingTasks(state);
    if (alive(state) && context.booking_id) {
      const booking = state.bookings?.find(item => item.id === context.booking_id);
      if (booking) await showBookingDetail(state, booking);
    }
  }
  async function loadBookingTasks(state) {
    if (!alive(state) || !state.grid) return;
    const sequence = ++state.sequence;
    const selectedStatus = state.taskStatus;
    const selectedDate = state.taskDate ? dayKey(state.taskDate) : null;
    const upcoming = selectedStatus === 'BOOKED' && state.upcomingOnly;
    state.status.empty();
    state.heading.find('h2').text(selectedStatus === 'BOOKED' ? (upcoming ? 'Lịch PT sắp tới' : 'Lịch PT đã đặt') : 'Lịch PT chờ xác nhận');
    state.grid.beginCustomLoading('Đang tải lịch tập...');
    try {
      const response = await request('/pt-bookings', {
        branch_id: state.branch, status: selectedStatus, date: selectedDate,
        date_from: upcoming && !selectedDate ? dayKey(new Date()) : undefined
      });
      if (!alive(state) || sequence !== state.sequence) return;
      state.bookings = rows(response).filter(booking => {
        const statusMatches = selectedStatus === 'BOOKED' ? booking.status === 'BOOKED' : ['PENDING_COMPLETION', 'AWAITING_CONFIRMATION'].includes(booking.status);
        return statusMatches && (!state.branch || booking.branch_id === state.branch) &&
          (!selectedDate || dayKey(booking.booking_date) === selectedDate) &&
          (!upcoming || appointmentTime(booking.booking_date, booking.start_time).getTime() > Date.now());
      });
      state.grid.option('dataSource', state.bookings);
      state.count.text(`${state.bookings.length} buổi tập`);
    } catch (error) {
      if (alive(state) && sequence === state.sequence) {
        state.bookings = []; state.grid.option('dataSource', []); state.count.text('');
        showError(state.status, error, () => loadBookingTasks(state));
      }
    } finally { if (alive(state) && sequence === state.sequence) state.grid.endCustomLoading(); }
  }
  function refreshBookingView(state) {
    return state.mode === 'booking-tasks' ? loadBookingTasks(state) : loadSchedule(state);
  }
  function slotFor(state, date, start) {
    const availability = state.availability.get(dayKey(date));
    return (availability?.slots || availability?.available_slots || []).find(slot => clock(slot.start_time) === clock(start));
  }
  function canBook(state, date, slot) {
    if (!slot || slot.is_available !== true || state.trainer?.status !== 'ACTIVE') return false;
    if (appointmentTime(date, slot.start_time).getTime() <= Date.now()) return false;
    return !state.bookings.some(booking => activeBooking(booking) && dayKey(booking.booking_date) === dayKey(date) && clock(booking.start_time) === clock(slot.start_time));
  }
  function appointmentContent(state, booking, parent, compact = false) {
    const content = $('<div class="pt-appointment">').css({ whiteSpace: 'normal', overflowWrap: 'anywhere' }).appendTo(parent);
    const packageLabel = [booking.member_code, booking.package_name || booking.package_name_snapshot].filter(Boolean).join(' · ');
    $('<strong>').text(booking.member_name || '--').attr('title', booking.member_name || '')
      .css({ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }).appendTo(content);
    $('<div>').text(packageLabel).attr('title', packageLabel)
      .css({ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }).appendTo(content);
    badge(content, booking.status);
    content.find('.status-badge').css({ maxWidth: '100%', whiteSpace: 'normal', lineHeight: '1.3' });
    if (!compact && booking.status === 'BOOKED') {
      const actions = $('<div class="pt-slot-actions">').css({ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }).appendTo(content);
      button(actions, { icon: 'close', hint: 'Hủy lịch', type: 'danger', stylingMode: 'contained', onClick: event => { event.event?.stopPropagation(); showCancellation(state, booking); } });
      button(actions, { icon: 'check', hint: 'Xác nhận hoàn thành', type: 'default', stylingMode: 'contained', disabled: !ended(booking),
        onClick: event => { event.event?.stopPropagation(); showBookingDetail(state, booking); } });
    }
  }
  function renderCalendar(state) {
    const appointments = state.bookings.filter(activeBooking).map(booking => ({
      ...booking, text: `${booking.member_name || ''} - ${booking.package_name || ''}`,
      startDate: appointmentTime(booking.booking_date, booking.start_time), endDate: appointmentTime(booking.booking_date, booking.end_time)
    }));
    state.scheduler = $('<div id="ptScheduler">').appendTo($('<div class="card-panel">').appendTo(state.content)).dxScheduler({
      dataSource: appointments, views: [{ type: 'day', name: 'Ngày' }, { type: 'workWeek', name: 'Tuần' }],
      currentView: state.calendarView, currentDate: state.date, firstDayOfWeek: 1, startDayHour: 8, endDayHour: 18,
      cellDuration: 120, showAllDayPanel: false, height: 730, editing: false, showCurrentTimeIndicator: true,
      onAppointmentFormOpening: event => { event.cancel = true; }, onAppointmentDblClick: event => { event.cancel = true; },
      onAppointmentClick: event => { event.cancel = true; showBookingDetail(state, event.appointmentData); },
      onCellClick: event => {
        event.cancel = true;
        const date = dayKey(event.cellData.startDate);
        const start = `${String(event.cellData.startDate.getHours()).padStart(2, '0')}:00`;
        const slot = slotFor(state, date, start);
        if (canBook(state, date, slot)) showBookingForm(state, date, slot);
      },
      timeCellTemplate: (cell, _, element) => {
        $(element).css({ height: 128, verticalAlign: 'top' });
        $('<span>').text(`${String(cell.date.getHours()).padStart(2, '0')}:${String(cell.date.getMinutes()).padStart(2, '0')}`).appendTo(element);
      },
      dataCellTemplate: (cell, _, element) => {
        $(element).css({ height: 128, verticalAlign: 'top' });
        const date = dayKey(cell.startDate);
        const start = `${String(cell.startDate.getHours()).padStart(2, '0')}:00`;
        const slot = slotFor(state, date, start);
        if (canBook(state, date, slot)) button(element, {
          icon: 'add', text: state.calendarView === 'day' ? 'Chọn khung giờ' : undefined, hint: `Đặt lịch ${date} ${start}`, stylingMode: 'text',
          onClick: event => { event.event?.stopPropagation(); showBookingForm(state, date, slot); }
        });
        else if (!slot || slot.is_available === true) $('<span class="pt-slot-unavailable">').text('Không khả dụng').appendTo(element);
      },
      appointmentTemplate: (data, _, element) => appointmentContent(state, data.appointmentData, element, state.calendarView !== 'day'),
      onOptionChanged: event => {
        if (!alive(state)) return;
        if (event.name === 'currentDate' && dayKey(event.value) !== dayKey(state.date)) {
          state.date = dayDate(event.value); state.datePicker.option('value', state.date); loadSchedule(state);
        }
        if (event.name === 'currentView') {
          const view = ['day', 'Ngày'].includes(event.value) ? 'day' : 'workWeek';
          if (state.calendarView !== view) { state.calendarView = view; loadSchedule(state); }
        }
      }
    }).dxScheduler('instance');
    if (!state.bookings.length) $('<p class="pt-calendar-summary">').text('Chưa có lịch tập trong thời gian đã chọn.').appendTo(state.content);
  }
  function renderSlotList(state) {
    const date = dayKey(state.date);
    const dayBookings = state.bookings.filter(booking => dayKey(booking.booking_date) === date);
    // Five documented time-scale rows; only API availability can make a row bookable.
    const data = Array.from({ length: 5 }, (_, index) => {
      const start = `${String(8 + index * 2).padStart(2, '0')}:00`;
      const end = `${String(10 + index * 2).padStart(2, '0')}:00`;
      return { id: start, start, end, booking: dayBookings.find(booking => activeBooking(booking) && clock(booking.start_time) === start), slot: slotFor(state, date, start) };
    });
    $('<div id="ptSlotList">').appendTo($('<div class="card-panel">').appendTo(state.content)).dxDataGrid({
      dataSource: data, keyExpr: 'id', showBorders: false, showRowLines: true, wordWrapEnabled: true, paging: { enabled: false }, columnAutoWidth: true, rowAlternationEnabled: true,
      columns: [
        { caption: 'Khung giờ', width: 145, calculateCellValue: item => `${item.start} - ${item.end}` },
        { caption: 'Hội viên / Gói PT', minWidth: 250, cellTemplate: (cell, info) => {
          if (info.data.booking) appointmentContent(state, info.data.booking, cell, true);
          else cell.text(canBook(state, date, info.data.slot) ? 'Khung giờ trống' : 'Không khả dụng');
        } },
        { caption: 'Thao tác', minWidth: 250, cellTemplate: (cell, info) => {
          const { booking, slot } = info.data;
          const actions = $('<div>').css({ display: 'flex', gap: 6, flexWrap: 'wrap' }).appendTo(cell);
          if (booking) {
            button(actions, { icon: 'find', hint: 'Chi tiết buổi tập', onClick: () => showBookingDetail(state, booking) });
            if (booking.status === 'BOOKED') {
              button(actions, { icon: 'close', text: 'Hủy lịch', type: 'danger', stylingMode: 'contained', onClick: () => showCancellation(state, booking) });
              button(actions, { icon: 'check', text: 'Xác nhận hoàn thành', type: 'default', stylingMode: 'contained', disabled: !ended(booking), onClick: () => showBookingDetail(state, booking) });
            }
          } else if (canBook(state, date, slot)) button(actions, {
            icon: 'add', text: 'Chọn khung giờ', type: 'default', stylingMode: 'contained', onClick: () => showBookingForm(state, date, slot)
          });
        } }
      ]
    });
    const availability = state.availability.get(date);
    if (availability?.message) $('<p>').text(availability.message).appendTo(state.content);
    const cancelled = dayBookings.filter(booking => !activeBooking(booking));
    if (cancelled.length) {
      $('<h3>').text('Lịch đã hủy / Vắng mặt').appendTo(state.content);
      $('<div>').appendTo(state.content).dxDataGrid({
        dataSource: cancelled, keyExpr: 'id', showRowLines: true, wordWrapEnabled: true, paging: { enabled: false },
        columns: [{ caption: 'Khung giờ', calculateCellValue: booking => `${clock(booking.start_time)} - ${clock(booking.end_time)}` },
          { dataField: 'member_name', caption: 'Hội viên' }, { dataField: 'package_name', caption: 'Gói PT' },
          { dataField: 'status', caption: 'Trạng thái', cellTemplate: (cell, info) => badge(cell, info.value) },
          { type: 'buttons', buttons: [{ icon: 'find', hint: 'Chi tiết buổi tập', onClick: event => showBookingDetail(state, event.row.data) }] }]
      });
    }
  }
  function memberSource(branch) {
    return new DevExpress.data.CustomStore({
      key: 'id', loadMode: 'processed', load: async options => {
        const response = await request('/members', { q: options.searchValue || '', branch_id: branch, status: 'ACTIVE',
          page: Math.floor((options.skip || 0) / (options.take || 20)) + 1, limit: options.take || 20 });
        const data = read(response);
        return { data: rows(response), totalCount: data?.total ?? rows(response).length };
      }, byKey: async id => read(await api().members.getById(id))
    });
  }
  function eligibleRegistration(reg, memberId, pt, date) {
    const type = reg.package_type_snapshot || reg.package_type;
    const start = reg.pt_start_date || reg.start_date;
    const end = reg.pt_end_date || reg.end_date;
    const allowed = reg.allowed_branch_ids || reg.allowed_branches?.map(branch => typeof branch === 'string' ? branch : branch.id);
    return reg.member_id === memberId && reg.assigned_pt_id === pt.id &&
      ['PT', 'PT_SESSION', 'PT_SESSIONS', 'COMBO', 'COMBO_GYM_PT'].includes(type) && reg.status === 'ACTIVE' && Number(reg.remaining_pt_sessions) > 0 &&
      !!start && !!end && dayKey(start) <= date && dayKey(end) >= date && (!allowed || allowed.includes(pt.branch_id));
  }
  function showQuickBooking(state) {
    let sequence = 0;
    let closed = false;
    let selected = null;
    let available = [];
    let form;
    let errors;
    const loadSlots = async () => {
      const version = ++sequence;
      const data = form.option('formData');
      const slotEditor = form.getEditor('start_time');
      available = [];
      form.updateData('start_time', null);
      slotEditor.option({ dataSource: [], disabled: true, placeholder: 'Chọn HLV và ngày tập' });
      if (!data.pt_id || !data.date) return;
      slotEditor.option('placeholder', 'Đang tải khung giờ...');
      errors.empty();
      try {
        const result = read(await request('/pt-bookings/available-slots', { pt_id: data.pt_id, date: dayKey(data.date) }));
        if (closed || version !== sequence) return;
        available = (result?.slots || result?.available_slots || []).filter(slot =>
          slot.is_available === true && appointmentTime(data.date, slot.start_time).getTime() > Date.now());
        slotEditor.option({ dataSource: available, disabled: false,
          placeholder: available.length ? 'Chọn khung giờ' : 'Không có khung giờ trống', noDataText: result?.message || 'Không có khung giờ trống.' });
      } catch (error) {
        if (!closed && version === sequence) {
          slotEditor.option('placeholder', 'Không tải được khung giờ');
          showError(errors, error, loadSlots);
        }
      }
    };
    formPopup(state, {
      title: 'Chọn lịch tập PT', submitText: 'Tiếp tục', submitIcon: 'chevronnext',
      data: { pt_id: state.trainer?.id || null, date: dayDate(state.date), start_time: null },
      items: [
        field('pt_id', 'Huấn luyện viên', true, 'dxSelectBox', {
          dataSource: state.trainers, valueExpr: 'id', displayExpr: trainerLabel, searchEnabled: true,
          searchExpr: ['full_name', 'phone', 'pt_code', 'code'], placeholder: 'Tìm theo tên, SĐT hoặc mã PT',
          noDataText: 'Không tìm thấy huấn luyện viên', showClearButton: true
        }),
        field('date', 'Ngày tập', true, 'dxDateBox', { type: 'date', displayFormat: 'dd/MM/yyyy',
          min: dayDate(new Date()), useMaskBehavior: true }),
        field('start_time', 'Khung giờ', true, 'dxSelectBox', {
          dataSource: [], valueExpr: 'start_time', displayExpr: slot => slot ? `${clock(slot.start_time)} - ${clock(slot.end_time)}` : '',
          disabled: true, placeholder: 'Chọn HLV và ngày tập'
        })
      ],
      onReady: (instance, errorBox) => { form = instance; errors = errorBox; if (form.option('formData').pt_id) loadSlots(); },
      onChange: event => { if (form && ['pt_id', 'date'].includes(event.dataField)) loadSlots(); },
      submit: async data => {
        const slot = available.find(item => item.start_time === data.start_time);
        if (!slot || appointmentTime(data.date, slot.start_time).getTime() <= Date.now()) throw new Error('Vui lòng chọn khung giờ còn khả dụng.');
        selected = { ptId: data.pt_id, date: dayKey(data.date), start: slot.start_time };
      },
      onClose: () => {
        closed = true; sequence++;
        if (selected && alive(state)) openQuickBookingForm(state, selected);
      }
    });
  }
  async function openQuickBookingForm(state, choice) {
    try {
      state.date = dayDate(choice.date);
      state.datePicker.option('value', state.date);
      if (state.selector.option('value') !== choice.ptId) state.selector.option('value', choice.ptId);
      else state.loading = loadSchedule(state);
      await state.loading;
      if (!alive(state)) return;
      const slot = slotFor(state, choice.date, choice.start);
      if (!canBook(state, choice.date, slot)) throw new Error('Khung giờ không còn khả dụng. Vui lòng chọn lịch khác.');
      showBookingForm(state, choice.date, slot);
    } catch (error) { if (alive(state)) showError(state.status, error, () => showQuickBooking(state)); }
  }
  function showBookingForm(state, date, slot) {
    if (!canBook(state, date, slot)) return;
    const pt = state.trainer;
    let registrationLoad = 0, registrations = [], closed = false, modal;
    const loadRegistrations = async (memberId, form) => {
      const sequence = ++registrationLoad;
      registrations = []; form.updateData('registration_id', null);
      const editor = form.getEditor('registration_id');
      editor.option({ dataSource: [], disabled: true, placeholder: memberId ? 'Đang tải gói PT...' : 'Chọn hội viên trước' });
      if (!memberId) return;
      try {
        const response = await request('/registrations', { member_id: memberId });
        if (closed || sequence !== registrationLoad) return;
        registrations = rows(response).filter(reg => eligibleRegistration(reg, memberId, pt, date));
        editor.option({ dataSource: registrations, disabled: false, placeholder: registrations.length ? 'Chọn gói PT' : 'Không có gói PT hợp lệ', noDataText: 'Không có gói PT hợp lệ cho HLV và ngày tập này.' });
        modal.errorBox.empty();
      } catch (error) {
        if (!closed && sequence === registrationLoad) {
          editor.option({ disabled: true, placeholder: 'Không tải được gói PT' });
          showError(modal.errorBox, error, () => loadRegistrations(memberId, form));
        }
      }
    };
    modal = formPopup(state, {
      title: 'Đặt lịch PT', data: { member_id: null, registration_id: null, notes: '' }, submitText: 'Xác nhận đặt lịch', submitIcon: 'event',
      items: [readonlyField('PT phụ trách', trainerLabel(pt)), readonlyField('Ngày tập', dayDate(date).toLocaleDateString('vi-VN')),
        readonlyField('Khung giờ', `${clock(slot.start_time)} - ${clock(slot.end_time)}`), readonlyField('Chi nhánh', pt.branch_name),
        field('member_id', 'Hội viên', true, 'dxSelectBox', {
          dataSource: { store: memberSource(pt.branch_id), paginate: true, pageSize: 20 }, valueExpr: 'id', displayExpr: memberLabel,
          searchEnabled: true, minSearchLength: 0, searchExpr: ['phone', 'full_name', 'member_code'], searchTimeout: 300,
          placeholder: 'Tìm theo SĐT, họ tên hoặc mã hội viên', showClearButton: true, noDataText: 'Không tìm thấy hội viên'
        }),
        field('registration_id', 'Gói PT sử dụng', true, 'dxSelectBox', {
          dataSource: [], valueExpr: 'id', displayExpr: reg => reg ? `${reg.registration_code || ''} - ${reg.package_name_snapshot || reg.package_name || ''} (${reg.remaining_pt_sessions} buổi còn lại)` : '',
          disabled: true, placeholder: 'Chọn hội viên trước', searchEnabled: true
        }), field('notes', 'Ghi chú cho buổi', false, 'dxTextArea', { height: 80 })],
      onChange: (event, form) => { if (event.dataField === 'member_id') loadRegistrations(event.value, form); },
      onClose: () => { closed = true; registrationLoad++; },
      submit: async data => {
        if (!registrations.some(reg => reg.id === data.registration_id && eligibleRegistration(reg, data.member_id, pt, date))) {
          throw new Error('Gói PT không còn hợp lệ. Vui lòng chọn lại hội viên và gói.');
        }
        const availability = read(await request('/pt-bookings/available-slots', { pt_id: pt.id, date }));
        const actual = (availability?.slots || availability?.available_slots || []).find(item => clock(item.start_time) === clock(slot.start_time));
        if (!actual?.is_available || appointmentTime(date, slot.start_time).getTime() <= Date.now()) throw new Error('Khung giờ không còn khả dụng. Vui lòng tải lại lịch và chọn ca khác.');
        await api().request('/pt-bookings', { method: 'POST', body: {
          registration_id: data.registration_id, member_id: data.member_id, pt_id: pt.id, branch_id: pt.branch_id,
          booking_date: date, start_time: slot.start_time, end_time: slot.end_time, workout_notes: String(data.notes || '').trim() || null
        } });
        notify('Đã đặt lịch PT.'); await loadSchedule(state);
      }
    });
    if (state.context.member_id) modal.form.updateData('member_id', state.context.member_id);
  }
  async function freshBooking(booking) {
    const response = await request('/pt-bookings', { pt_id: booking.pt_id, date: dayKey(booking.booking_date), branch_id: booking.branch_id });
    const found = rows(response).find(item => item.id === booking.id);
    if (!found) throw new Error('Buổi tập không còn tồn tại hoặc bạn không có quyền truy cập.');
    return found;
  }
  function showCancellation(state, booking) {
    if (!pendingBooking(booking)) return;
    formPopup(state, {
      title: 'Xác nhận hủy lịch PT', data: {}, submitText: 'Xác nhận hủy', submitIcon: 'close', destructive: true, summary: 'Hủy buổi tập đã chọn?',
      items: [readonlyField('Hội viên', `${booking.member_name || ''} (${booking.member_code || ''})`),
        readonlyField('PT phụ trách', booking.pt_name || trainerLabel(state.trainer)), readonlyField('Ngày tập', dayDate(booking.booking_date).toLocaleDateString('vi-VN')),
        readonlyField('Khung giờ', `${clock(booking.start_time)} - ${clock(booking.end_time)}`), readonlyField('Gói PT sử dụng', booking.package_name)],
      submit: async () => {
        const latest = await freshBooking(booking);
        if (!pendingBooking(latest)) throw new Error('Buổi tập đã hoàn thành hoặc đã hủy. Vui lòng tải lại lịch.');
        const result = await api().request(`/pt-bookings/${encodeURIComponent(booking.id)}/cancel`, { method: 'POST', body: {} });
        notify(result.message || 'Đã hủy lịch PT.'); await refreshBookingView(state);
      }
    });
  }
  async function showBookingDetail(state, booking) {
    const host = $('<div>').appendTo(state.root);
    let content, currentBooking, completeButton, cancelButton;
    let busy = false, closed = false;
    const popup = host.dxPopup({
      title: 'Chi tiết buổi tập PT', width: 640, maxWidth: 'calc(100vw - 24px)', height: 'auto', maxHeight: '90vh', showCloseButton: true, hideOnOutsideClick: false,
      onHiding: event => { if (busy) event.cancel = true; },
      onHidden: () => { closed = true; state.popups = state.popups.filter(item => item !== popup); host.remove(); },
      contentTemplate: element => { content = $('<div>').appendTo(element); },
      toolbarItems: [
        { widget: 'dxButton', toolbar: 'bottom', location: 'before', options: {
          icon: 'close', text: 'Hủy lịch', type: 'danger', stylingMode: 'outlined', visible: false, onInitialized: event => { cancelButton = event.component; },
          onClick: () => { popup.hide(); showCancellation(state, currentBooking); }
        } },
        { widget: 'dxButton', toolbar: 'bottom', location: 'after', options: { text: 'Đóng', stylingMode: 'outlined', onClick: () => popup.hide() } },
        { widget: 'dxButton', toolbar: 'bottom', location: 'after', options: {
          icon: 'check', text: 'Xác nhận hoàn thành', type: 'default', stylingMode: 'contained', visible: false, onInitialized: event => { completeButton = event.component; },
          onClick: async () => {
            if (busy || !currentBooking || !ended(currentBooking)) return;
            busy = true; completeButton.option('disabled', true); cancelButton.option('disabled', true);
            try {
              // Staff reconcile existing confirmations; only PT/member mobile flows may sign.
              const response = await api().request(`/pt-bookings/${encodeURIComponent(booking.id)}/confirm`, { method: 'POST' });
              notify(response.message || 'Đã kiểm tra xác nhận buổi tập.'); await reload(); await refreshBookingView(state);
            } catch (error) {
              if (!closed) { content.find('.pt-detail-error').remove(); showError($('<div class="pt-detail-error">').prependTo(content), error); }
            } finally {
              busy = false;
              if (!closed) { completeButton.option('disabled', !currentBooking || !ended(currentBooking)); cancelButton.option('disabled', false); }
            }
          }
        } }
      ]
    }).dxPopup('instance');
    async function reload() {
      message(content, 'Đang tải chi tiết buổi tập...'); completeButton.option('visible', false); cancelButton.option('visible', false);
      try {
        const latest = await freshBooking(booking);
        if (closed) return;
        currentBooking = latest; content.empty();
        const details = [
          readonlyField('Hội viên', `${latest.member_name || ''} (${latest.member_code || ''})`), readonlyField('Số điện thoại', latest.member_phone),
          readonlyField('PT phụ trách', latest.pt_name || trainerLabel(state.trainer)), readonlyField('Chi nhánh', latest.branch_name),
          readonlyField('Gói PT sử dụng', latest.package_name), readonlyField('Ngày tập', dayDate(latest.booking_date).toLocaleDateString('vi-VN')),
          readonlyField('Khung giờ', `${clock(latest.start_time)} - ${clock(latest.end_time)}`),
          { label: { text: 'Trạng thái' }, template: (_, element) => badge(element, latest.status) },
          readonlyField('PT xác nhận', latest.pt_confirmed_at ? new Date(latest.pt_confirmed_at).toLocaleString('vi-VN') : 'Chưa xác nhận'),
          readonlyField('Hội viên xác nhận', latest.member_confirmed_at ? new Date(latest.member_confirmed_at).toLocaleString('vi-VN') : 'Chưa xác nhận'),
          readonlyField('Khấu trừ buổi', latest.is_deducted ? 'Đã khấu trừ' : 'Chưa khấu trừ'), readonlyField('Ghi chú cho buổi', latest.notes || latest.note || latest.workout_notes)
        ];
        if (latest.session_number != null) details.push(readonlyField('Buổi số', String(latest.session_number)));
        if (latest.workout_content || latest.workout_notes) details.push(readonlyField('Nội dung bài tập', latest.workout_content || latest.workout_notes));
        if (latest.fitness_assessment) details.push(readonlyField('Đánh giá thể lực', latest.fitness_assessment));
        if (latest.cancelled_at) details.push(readonlyField('Thời điểm hủy', new Date(latest.cancelled_at).toLocaleString('vi-VN')));
        if (latest.cancel_reason) details.push(readonlyField('Lý do hủy', latest.cancel_reason));
        $('<div>').appendTo(content).dxForm({ readOnly: true, labelLocation: 'top', colCount: 2, colCountByScreen: { xs: 1 }, items: details });
        completeButton.option({ visible: pendingBooking(latest), disabled: !ended(latest) }); cancelButton.option('visible', pendingBooking(latest));
      } catch (error) { if (!closed) showError(content, error, reload); }
    }
    state.popups.push(popup); popup.show(); await reload();
  }

  return {
    renderTrainers, renderSchedule,
    refresh: () => {
      if (!current) return;
      if (current.mode === 'trainers') return loadTrainers(current);
      if (current.mode === 'booking-tasks') return loadBookingTasks(current);
      return current.trainer ? loadSchedule(current) : loadScheduleTrainers(current);
    },
    openCreateTrainer: () => current?.mode === 'trainers' && showTrainerForm(current),
    destroy: () => { if (current) { current.popups.forEach(popup => popup.hide()); current.sequence++; current = null; } },
    openTrainerSchedule: (ptId, context = {}) => window.ParadiseApp?.navigateTo('pt-schedule', { ...context, pt_id: ptId }),
    openBookingDetail: bookingId => window.ParadiseApp?.navigateTo('pt-schedule', { booking_id: bookingId })
  };
})();
