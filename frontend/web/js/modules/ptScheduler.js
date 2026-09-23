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
        ...(settings.extraButtons || []),
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
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  }

  function openTrainerCameraCapture(state, onSuccess) {
    const host = $('<div>').appendTo(state?.root || $('body'));
    let localStream = null;
    const camPopup = host.dxPopup({
      title: 'Chụp ảnh từ Camera tại quầy',
      width: 520,
      maxWidth: 'calc(100vw - 24px)',
      height: 'auto',
      showCloseButton: true,
      dragEnabled: true,
      hideOnOutsideClick: false,
      onHiding: () => {
        if (localStream) localStream.getTracks().forEach(t => t.stop());
      },
      onHidden: () => {
        if (state?.popups) state.popups = state.popups.filter(item => item !== camPopup);
        host.remove();
      },
      contentTemplate: element => {
        const body = $('<div style="padding:10px;text-align:center;">').appendTo(element);
        const videoWrap = $('<div style="width:100%;max-width:420px;height:315px;margin:0 auto 12px;background:#1a1a1a;border-radius:8px;overflow:hidden;position:relative;display:grid;place-items:center;">').appendTo(body);
        const video = $('<video autoplay playsinline style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1);">').appendTo(videoWrap)[0];
        const statusMsg = $('<div style="color:#888;font-size:12px;margin-bottom:12px;">').text('Đang kết nối camera...').appendTo(body);

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
            .then(stream => {
              localStream = stream;
              video.srcObject = stream;
              statusMsg.text('Căn chỉnh khuôn mặt vào giữa khung hình rồi bấm "Chụp ảnh".');
            })
            .catch(err => {
              statusMsg.html(`<span style="color:#b5493a;">Không thể kết nối camera: ${err.message || 'Thiết bị không hỗ trợ'}. Vui lòng tải file ảnh từ máy tính.</span>`);
            });
        } else {
          statusMsg.html('<span style="color:#b5493a;">Trình duyệt không hỗ trợ truy cập camera. Vui lòng tải file ảnh từ máy tính.</span>');
        }

        body.data('video', video);
        body.data('statusMsg', statusMsg);
      },
      toolbarItems: [
        { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Đóng', onClick: () => camPopup.hide() } },
        { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: {
          text: 'Chụp ảnh', type: 'default', stylingMode: 'contained', icon: 'camera',
          onClick: async event => {
            const body = host.find('.dx-popup-content > div');
            const video = body.data('video');
            const statusMsg = body.data('statusMsg');
            if (!localStream || !video || !video.videoWidth) {
              notify('Chưa có tín hiệu camera', 'warning');
              return;
            }
            event.component.option('disabled', true);
            statusMsg.text('Đang xử lý ảnh chụp...');
            try {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth || 640;
              canvas.height = video.videoHeight || 480;
              const ctx = canvas.getContext('2d');
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
              const base64Data = dataUrl.split(',')[1];
              const res = await api().request('/avatar/upload', {
                method: 'POST',
                body: { content_base64: base64Data, mime_type: 'image/jpeg' }
              });
              const url = res.data?.avatar_url || res.avatar_url;
              onSuccess(url);
              notify('Đã chụp ảnh khuôn mặt thành công!', 'success');
              camPopup.hide();
            } catch (err) {
              statusMsg.html(`<span style="color:#b5493a;">Lỗi xử lý ảnh: ${err.message}</span>`);
              event.component.option('disabled', false);
            }
          }
        } }
      ]
    }).dxPopup('instance');
    if (state?.popups) state.popups.push(camPopup);
    camPopup.show();
  }

  function renderTrainerAvatarField(container, getForm, initialUrl, state) {
    const wrapper = $('<div class="avatar-field-wrapper" style="border:1px dashed #b8cebf;border-radius:8px;padding:12px 14px;background:#f9fcf9;margin-top:4px;">').appendTo(container);
    const flex = $('<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">').appendTo(wrapper);

    const preview = $('<div class="avatar-preview-box" style="width:84px;height:84px;border-radius:50%;overflow:hidden;border:3px solid #237b58;background:#edf4ee;display:grid;place-items:center;flex-shrink:0;">').appendTo(flex);

    function updatePreview(url) {
      preview.empty();
      if (url && /^https?:\/\//.test(url)) {
        $(`<img src="${url}" style="width:100%;height:100%;object-fit:cover;">`).appendTo(preview);
        clearBtn.show();
      } else {
        $('<i class="fa-solid fa-camera" style="font-size:26px;color:#748078;"></i>').appendTo(preview);
        clearBtn.hide();
      }
    }

    const controls = $('<div style="flex:1;min-width:230px;display:flex;flex-direction:column;gap:8px;">').appendTo(flex);
    const btnRow = $('<div style="display:flex;gap:8px;flex-wrap:wrap;">').appendTo(controls);

    // 1. Nút chụp camera
    $('<button type="button" class="dx-button dx-button-normal dx-widget dx-button-has-icon dx-button-has-text" style="font-size:12px;padding:5px 12px;border-radius:4px;cursor:pointer;">')
      .append($('<i class="fa-solid fa-camera" style="margin-right:6px;color:#237b58;"></i>'), $('<span>').text('Chụp camera'))
      .appendTo(btnRow)
      .on('click', () => openTrainerCameraCapture(state, url => {
        const form = getForm();
        if (form) {
          form.updateData('avatar_url', url);
          if (form.option('formData')) form.option('formData').avatar_url = url;
        }
        urlInput.val(url);
        updatePreview(url);
      }));

    // 2. Nút tải file
    const fileInput = $('<input type="file" accept="image/png,image/jpeg,image/webp" style="display:none;">').appendTo(btnRow);
    const uploadBtn = $('<button type="button" class="dx-button dx-button-normal dx-widget dx-button-has-icon dx-button-has-text" style="font-size:12px;padding:5px 12px;border-radius:4px;cursor:pointer;">')
      .append($('<i class="fa-solid fa-upload" style="margin-right:6px;color:#3378b7;"></i>'), $('<span>').text('Tải ảnh lên'))
      .appendTo(btnRow)
      .on('click', () => fileInput.trigger('click'));

    fileInput.on('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        notify('Kích thước ảnh tối đa 5 MB', 'error');
        return;
      }
      try {
        uploadBtn.prop('disabled', true).text('Đang tải...');
        const base64 = await fileToBase64(file);
        const res = await api().request('/avatar/upload', {
          method: 'POST',
          body: { content_base64: base64.split(',')[1], mime_type: file.type }
        });
        const url = res.data?.avatar_url || res.avatar_url;
        const form = getForm();
        if (form) {
          form.updateData('avatar_url', url);
          if (form.option('formData')) form.option('formData').avatar_url = url;
        }
        urlInput.val(url);
        updatePreview(url);
        notify('Đã tải ảnh lên thành công!', 'success');
      } catch (err) {
        notify(err.message || 'Lỗi tải ảnh', 'error');
      } finally {
        uploadBtn.prop('disabled', false).html('<i class="fa-solid fa-upload" style="margin-right:6px;color:#3378b7;"></i><span>Tải ảnh lên</span>');
        fileInput.val('');
      }
    });

    // 3. Nút xóa ảnh
    const clearBtn = $('<button type="button" class="dx-button dx-button-normal dx-widget dx-button-has-icon dx-button-has-text" style="font-size:12px;padding:5px 12px;border-radius:4px;color:#b5493a;cursor:pointer;display:none;">')
      .append($('<i class="fa-solid fa-trash" style="margin-right:4px;"></i>'), $('<span>').text('Xóa'))
      .appendTo(btnRow)
      .on('click', () => {
        const form = getForm();
        if (form) {
          form.updateData('avatar_url', '');
          if (form.option('formData')) form.option('formData').avatar_url = '';
        }
        urlInput.val('');
        updatePreview('');
      });

    // 4. Ô nhập URL trực tiếp
    const urlInput = $('<input type="text" placeholder="Hoặc dán URL ảnh chân dung (https://...)" style="width:100%;font-size:12px;padding:6px 10px;border:1px solid #d2ded7;border-radius:4px;background:#fff;margin-top:2px;">')
      .val(initialUrl || '')
      .on('input change', function () {
        const val = $(this).val().trim();
        const form = getForm();
        if (form) {
          form.updateData('avatar_url', val);
          if (form.option('formData')) form.option('formData').avatar_url = val;
        }
        updatePreview(val);
      })
      .appendTo(controls);

    $('<small style="color:#748078;font-size:11px;display:block;margin-top:2px;">')
      .text('Ảnh chân dung hiển thị làm Avatar hồ sơ Huấn luyện viên và nhận diện khuôn mặt.')
      .appendTo(controls);

    updatePreview(initialUrl);
  }

  function profileData(pt) {
    return {
      full_name: pt?.full_name || '',
      phone: pt?.phone || '',
      email: pt?.email || '',
      branch_id: pt?.branch_id || branchId(),
      specialty: pt?.specialty ?? pt?.specialties ?? '',
      avatar_url: pt?.avatar_url || ''
    };
  }
  function profilePayload(data, editing) {
    const payload = {
      full_name: nameValue(data.full_name),
      email: String(data.email || '').trim() || null,
      branch_id: data.branch_id,
      specialties: String(data.specialty || '').trim() || null,
      avatar_url: String(data.avatar_url || '').trim() || null,
      face_enrolled: Boolean(String(data.avatar_url || '').trim())
    };
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
          field('specialty', 'Chuyên môn / Ghi chú', false, 'dxTextArea', { height: 72 }),
          {
            dataField: 'avatar_url',
            label: { text: 'Avatar & Ảnh chân dung PT' },
            template: (formData, itemElement) => {
              renderTrainerAvatarField(itemElement, () => formInstance, data.avatar_url, state);
            }
          }
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

  function ptDetails(parent, rows) {
    const table = $('<dl>').css({ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(0, 2fr)', gap: '10px 16px', margin: '12px 0' }).appendTo(parent);
    rows.forEach(([label, value]) => {
      $('<dt>').css({ color: 'var(--text-muted, #667085)', fontWeight: 600 }).text(label).appendTo(table);
      $('<dd>').css({ margin: 0, overflowWrap: 'anywhere' }).text(value || '--').appendTo(table);
    });
  }
  function ptDetailGrid(parent, rows, columns, empty) {
    return $('<div>').appendTo(parent).dxDataGrid({
      dataSource: rows,
      columns,
      width: '100%',
      columnAutoWidth: false,
      wordWrapEnabled: false,
      showBorders: false,
      showRowLines: true,
      showColumnLines: false,
      hoverStateEnabled: true,
      rowAlternationEnabled: false,
      noDataText: empty || 'Không có dữ liệu phù hợp',
      loadPanel: { enabled: true, text: 'Đang tải dữ liệu...' },
      scrolling: { mode: 'standard', useNative: true },
      paging: { pageSize: 10 },
      pager: {
        visible: true,
        showInfo: true,
        showNavigationButtons: true,
        showPageSizeSelector: true,
        allowedPageSizes: [10, 20, 50],
        infoText: 'Trang {0}/{1} · {2} bản ghi'
      }
    }).dxDataGrid('instance');
  }

  async function openCommunityClassMembersModal(classData) {
    try {
      const classId = classData.id;
      const formatVnd = val => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';
      const host = $('<div>').appendTo($('body'));
      const popup = host.dxPopup({
        title: 'Thông tin lớp học & Danh sách hội viên',
        width: 620, maxWidth: 'calc(100vw - 32px)', height: 'auto', maxHeight: '88vh',
        showCloseButton: true, dragEnabled: false, hideOnOutsideClick: true,
        onHidden: () => { host.remove(); },
        contentTemplate: element => {
          const content = $('<div style="padding: 4px 6px;">').appendTo(element);
          const totalComp = Number(classData.total_compensation || ((Number(classData.base_price) || 0) + (Number(classData.bonus_amount) || 0)));

          $(`
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); color: #ffffff; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
              <div style="font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 2px;">
                <i class="fa-solid fa-users" style="margin-right: 4px;"></i>LỚP TẬP CỘNG ĐỒNG
              </div>
              <div style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">
                ${classData.title || 'Lớp cộng đồng'}
              </div>
              <div style="font-size: 12px; display: flex; flex-wrap: wrap; gap: 14px; opacity: 0.95;">
                <span><i class="fa-solid fa-calendar" style="margin-right: 4px;"></i>${classData.class_date ? new Date(classData.class_date).toLocaleDateString('vi-VN') : '--'}</span>
                <span><i class="fa-solid fa-clock" style="margin-right: 4px;"></i>${clock(classData.start_time)} - ${clock(classData.end_time)}</span>
                <span><i class="fa-solid fa-location-dot" style="margin-right: 4px;"></i>${classData.branch_name || '--'}</span>
              </div>
              <div style="font-size: 12px; display: flex; flex-wrap: wrap; gap: 14px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2);">
                <span><i class="fa-solid fa-user-group" style="margin-right: 4px;"></i>Sĩ số: <strong>${classData.enrolled_slots || 0}/${classData.max_slots || 30} HV</strong></span>
                <span><i class="fa-solid fa-sack-dollar" style="margin-right: 4px;"></i>Thù lao: <strong>${formatVnd(totalComp)}</strong></span>
              </div>
            </div>
          `).appendTo(content);

          $('<div style="font-size: 13px; font-weight: 700; color: #185740; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">')
            .html(`<span><i class="fa-solid fa-list-check" style="margin-right: 6px;"></i>Danh sách học viên tham gia</span><small style="color: #748078; font-weight: 400; font-size: 11px;">Sắp xếp theo thứ tự đăng ký</small>`)
            .appendTo(content);

          const gridContainer = $('<div>').appendTo(content);
          const loader = $('<div style="text-align:center;padding:24px;color:#748078;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách học viên...</div>').appendTo(gridContainer);

          (async () => {
            try {
              const res = await api().request(`/community-classes/${classId}/members`);
              const members = rows(res);
              loader.remove();
              if (!members.length) {
                $('<div style="text-align:center;padding:24px;color:#748078;background:#f8faf9;border-radius:6px;border:1px dashed #dfe6e2;">Chưa có học viên nào đăng ký lớp học này.</div>').appendTo(gridContainer);
                return;
              }
              $('<div>').appendTo(gridContainer).dxDataGrid({
                dataSource: members.map((m, idx) => ({ ...m, stt: idx + 1 })),
                showBorders: true,
                columnAutoWidth: false,
                wordWrapEnabled: false,
                paging: { pageSize: 10 },
                columns: [
                  { dataField: 'stt', caption: 'STT', width: 60, alignment: 'center' },
                  { dataField: 'full_name', caption: 'Họ và tên', minWidth: 150 },
                  { dataField: 'member_code', caption: 'Mã HV', width: 100, alignment: 'center' },
                  { dataField: 'phone', caption: 'Số điện thoại', width: 120 },
                  {
                    dataField: 'enrolled_at', caption: 'Thời gian đăng ký', width: 140, alignment: 'center',
                    dataType: 'datetime', format: 'dd/MM/yyyy HH:mm',
                    customizeText: c => c.value ? c.valueText : '--'
                  }
                ]
              });
            } catch (err) {
              loader.html(`<span style="color:#b5493a;">Không thể tải danh sách học viên: ${err.message || 'Lỗi kết nối'}</span>`);
            }
          })();
        },
        toolbarItems: [
          {
            widget: 'dxButton', toolbar: 'bottom', location: 'after',
            options: { text: 'Đóng', stylingMode: 'outlined', onClick: () => popup.hide() }
          }
        ]
      }).dxPopup('instance');
      popup.show();
    } catch (e) {
      notify('Không thể mở thông tin lớp học: ' + e.message, 'error');
    }
  }

  async function showTrainerDetail(state, pt) {
    try {
      const formatVnd = val => (Number(val) || 0).toLocaleString('vi-VN') + ' ₫';
      const host = $('<div>').appendTo(state.root);
      const popup = host.dxPopup({
        title: `Hồ sơ Huấn luyện viên: ${pt.full_name || ''} (${pt.pt_code || pt.code || ''})`,
        width: 1180, maxWidth: 'calc(100vw - 32px)', height: 'auto', maxHeight: '94vh',
        showCloseButton: true, dragEnabled: false, hideOnOutsideClick: true,
        onShown: e => {
          const titlebar = $(e.component.content()).closest('.dx-overlay-content').find('.dx-popup-title');
          titlebar.find('.dx-toolbar-before').css({ width: 'calc(100% - 48px)' });
          titlebar.find('.dx-toolbar-label').css({ maxWidth: '100%', width: '100%' });
        },
        onHidden: () => {
          state.popups = state.popups.filter(item => item !== popup);
          host.remove();
        },
        contentTemplate: element => {
          const content = $('<div class="pt-trainer-detail-content" style="padding: 0;">').appendTo(element);
          const loadIndicator = $('<div style="text-align:center;padding:40px 0;color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary); margin-bottom: 12px; display: block;"></i>Đang tải dữ liệu hồ sơ huấn luyện viên...</div>').appendTo(content);

          (async () => {
            try {
              const [fullPtRes, regsRes, bookingsRes, accessRes, commsRes, classesRes] = await Promise.allSettled([
                api().request(`/pt-bookings/trainers/${encodeURIComponent(pt.id)}`),
                api().request(`/registrations?pt_id=${encodeURIComponent(pt.id)}`, { headers: { 'x-branch-id': 'ALL' } }),
                api().request(`/pt-bookings?pt_id=${encodeURIComponent(pt.id)}`, { headers: { 'x-branch-id': 'ALL' } }),
                api().request(`/access-gate/logs?pt_id=${encodeURIComponent(pt.id)}`, { headers: { 'x-branch-id': 'ALL' } }),
                api().request(`/commissions?pt_id=${encodeURIComponent(pt.id)}`, { headers: { 'x-branch-id': 'ALL' } }),
                api().request(`/community-classes?instructor_id=${encodeURIComponent(pt.id)}`, { headers: { 'x-branch-id': 'ALL' } })
              ]);

              const fullPt = (fullPtRes.status === 'fulfilled' && fullPtRes.value) ? read(fullPtRes.value) : pt;
              const assignedRegistrations = (regsRes.status === 'fulfilled' && regsRes.value) ? rows(regsRes.value) : [];
              const allBookings = (bookingsRes.status === 'fulfilled' && bookingsRes.value) ? rows(bookingsRes.value) : [];
              const accessLogs = (accessRes.status === 'fulfilled' && accessRes.value) ? rows(accessRes.value) : [];
              const commissions = (commsRes.status === 'fulfilled' && commsRes.value) ? rows(commsRes.value) : [];
              const communityClasses = (classesRes.status === 'fulfilled' && classesRes.value) ? rows(classesRes.value) : [];
              const totalClassCompensation = communityClasses.reduce((sum, c) => sum + Number(c.total_compensation || (Number(c.base_price || 0) + Number(c.bonus_amount || 0))), 0);

              popup.option('title', `${fullPt.pt_code || pt.code || 'HLV'} - ${fullPt.full_name}`);
              loadIndicator.remove();

              const completedSessions = allBookings.filter(b => b.status === 'COMPLETED');
              const upcomingSessions = allBookings.filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED');
              const completedCommunityClasses = communityClasses.filter(c => c.status === 'COMPLETED' || new Date(c.class_date + 'T' + (c.end_time || '23:59')) < new Date());
              const upcomingCommunityClasses = communityClasses.filter(c => !completedCommunityClasses.includes(c) && c.status !== 'CANCELLED');

              // 1. Phân loại danh sách học viên phụ trách duy nhất
              const memberMap = new Map();
              assignedRegistrations.forEach(r => {
                const mId = r.member_id || r.id;
                if (!memberMap.has(mId)) {
                  memberMap.set(mId, {
                    id: mId,
                    name: r.member_name || r.full_name || '--',
                    code: r.member_code || '--',
                    phone: r.member_phone || r.phone || '--',
                    branch_name: r.branch_name || fullPt.branch_name || '--',
                    registrations: [],
                    totalRemainingPt: 0,
                    activeCount: 0,
                    earliestStart: r.start_date
                  });
                }
                const m = memberMap.get(mId);
                m.registrations.push(r);
                m.totalRemainingPt += (parseInt(r.remaining_pt_sessions, 10) || 0);
                if (r.status === 'ACTIVE') m.activeCount++;
                if (r.start_date && (!m.earliestStart || new Date(r.start_date) < new Date(m.earliestStart))) {
                  m.earliestStart = r.start_date;
                }
              });
              const uniqueMembers = Array.from(memberMap.values());

              // 2. Tính toán các chỉ số thu nhập gộp (Khớp 100% Mobile PT)
              const totalPaidComm = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + Number(c.total_commission_amount || 0), 0);
              const pendingComm = commissions.filter(c => ['PENDING_CONFIRMATION', 'PENDING', 'APPROVED'].includes(c.status)).reduce((sum, c) => sum + Number(c.total_commission_amount || 0), 0);
              const latestCommission = commissions.slice().sort((a, b) => (b.year - a.year) || (b.month - a.month))[0] || null;
              const totalPTCommission = latestCommission ? Number(latestCommission.total_commission_amount || 0) : totalPaidComm;
              const totalEstimatedIncome = totalPTCommission + totalClassCompensation;

              // 3. Ca dạy hôm nay
              const todayStr = new Date().toISOString().slice(0, 10);
              const todayPtSessions = allBookings.filter(b => (b.booking_date || '').slice(0, 10) === todayStr && b.status !== 'CANCELLED');
              const todayCommunityClasses = communityClasses.filter(c => (c.class_date || '').slice(0, 10) === todayStr && c.status !== 'CANCELLED');
              const todayTotalSessions = todayPtSessions.length + todayCommunityClasses.length;

              // 4. Tổng hợp danh sách ca dạy sắp tới (PT 1:1 + Lớp cộng đồng)
              const allUpcoming = [
                ...upcomingSessions.map(b => ({
                  category: 'PT',
                  categoryLabel: 'PT 1:1',
                  date: b.booking_date,
                  start_time: b.start_time,
                  end_time: b.end_time,
                  title: b.package_name_snapshot || 'Ca tập PT',
                  target: b.member_name,
                  target_sub: b.member_phone ? `SĐT: ${b.member_phone}` : '',
                  sub: `Buổi thứ ${b.session_number || '--'}`,
                  branch: b.branch_name || fullPt.branch_name,
                  status: b.status,
                  raw: b
                })),
                ...upcomingCommunityClasses.map(c => ({
                  category: 'CLASS',
                  categoryLabel: 'Lớp cộng đồng',
                  date: c.class_date,
                  start_time: c.start_time,
                  end_time: c.end_time,
                  title: c.title || 'Lớp cộng đồng',
                  target: `Sĩ số: ${c.enrolled_slots || 0}/${c.max_slots || 30} HV`,
                  target_sub: `Bộ môn: ${c.discipline_name || '--'}`,
                  sub: `Thù lao: ${formatVnd(c.total_compensation || ((Number(c.base_price) || 0) + (Number(c.bonus_amount) || 0)))}`,
                  branch: c.branch_name || fullPt.branch_name,
                  status: c.status || 'SCHEDULED',
                  raw: c
                }))
              ].sort((a, b) => new Date(`${a.date}T${a.start_time || '00:00'}`) - new Date(`${b.date}T${b.start_time || '00:00'}`));
              const nextUpcoming = allUpcoming[0];

              // 5. Tổng hợp lịch sử ca dạy hoàn thành
              const allHistory = [
                ...completedSessions.map(b => ({
                  category: 'PT',
                  categoryLabel: 'PT 1:1',
                  date: b.booking_date,
                  start_time: b.start_time,
                  end_time: b.end_time,
                  title: b.package_name_snapshot || 'Ca tập PT',
                  target: b.member_name,
                  session_number: b.session_number ? `Buổi ${b.session_number}` : '--',
                  workout_notes: b.workout_notes || '--',
                  fitness_assessment: b.fitness_assessment || '--',
                  pt_confirmed_at: b.pt_confirmed_at,
                  member_confirmed_at: b.member_confirmed_at,
                  is_deducted: b.is_deducted,
                  raw: b
                })),
                ...completedCommunityClasses.map(c => ({
                  category: 'CLASS',
                  categoryLabel: 'Lớp cộng đồng',
                  date: c.class_date,
                  start_time: c.start_time,
                  end_time: c.end_time,
                  title: c.title || 'Lớp cộng đồng',
                  target: `Sĩ số: ${c.enrolled_slots || 0}/${c.max_slots || 30} HV`,
                  session_number: `${c.discipline_name || 'Lớp CĐ'}`,
                  workout_notes: `Thù lao: ${formatVnd(c.total_compensation || ((Number(c.base_price) || 0) + (Number(c.bonus_amount) || 0)))}`,
                  fitness_assessment: `Chi nhánh: ${c.branch_name || '--'}`,
                  pt_confirmed_at: c.created_at,
                  member_confirmed_at: null,
                  is_deducted: true,
                  raw: c
                }))
              ].sort((a, b) => new Date(`${b.date}T${b.start_time || '00:00'}`) - new Date(`${a.date}T${a.start_time || '00:00'}`));

              const layoutWrap = $('<div style="display: flex; min-height: 600px; max-height: calc(94vh - 85px); margin: -10px -16px; overflow: hidden;">').appendTo(content);

              // ================= CỘT TRÁI: SIDEBAR HLV (260px) =================
              const sidebar = $('<div class="profile-modal-sidebar">').appendTo(layoutWrap);

              // Profile Hero Card
              const profileCard = $('<div class="profile-sidebar-hero">').appendTo(sidebar);
              const avatarWrap = $('<div style="position: relative; width: 68px; height: 68px; margin: 0 auto;">').appendTo(profileCard);
              if (fullPt.avatar_url && /^https?:\/\//.test(fullPt.avatar_url)) {
                $(`<img src="${fullPt.avatar_url}" alt="${fullPt.full_name}" style="width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--primary, #237b58); box-shadow: 0 2px 6px rgba(35,123,88,0.18);">`).appendTo(avatarWrap);
              } else {
                $(`<div style="width: 68px; height: 68px; border-radius: 50%; background: var(--primary-light, #eaf4ee); color: var(--primary-dark, #185740); font-size: 22px; font-weight: 700; display: grid; place-items: center; border: 2px solid var(--primary, #237b58); font-family: Manrope, sans-serif;">${(fullPt.full_name || '?').trim().split(/\\s+/).slice(-2).map(x => x[0]).join('').toUpperCase()}</div>`).appendTo(avatarWrap);
              }

              $('<h3>').text(fullPt.full_name).appendTo(profileCard);

              const badgeRow = $('<div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; align-items: center;">').appendTo(profileCard);
              $('<span style="background: var(--primary-light, #eaf4ee); color: var(--primary-dark, #185740); font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-family: Manrope, monospace;">').text(fullPt.pt_code || pt.code || 'HLV').appendTo(badgeRow);
              badge(badgeRow, fullPt.status, PROFILE_STATUS);

              const subInfo = $('<div style="font-size: 12px; color: var(--text-muted, #586b5e); display: flex; flex-direction: column; gap: 5px; width: 100%; border-top: 1px dashed var(--border-color, #dfe6e2); padding-top: 10px; margin-top: 4px; text-align: left;">').appendTo(profileCard);
              $(`<div><i class="fa-solid fa-phone" style="width: 18px; color: var(--primary, #237b58);"></i> <strong>${fullPt.phone || '--'}</strong></div>`).appendTo(subInfo);
              $(`<div><i class="fa-solid fa-location-dot" style="width: 18px; color: var(--primary, #237b58);"></i> ${fullPt.branch_name || 'Paradise Gym'}</div>`).appendTo(subInfo);
              $(`<div><i class="fa-solid fa-clock" style="width: 18px; color: var(--primary, #237b58);"></i> Ca trực: ${(fullPt.work_start_time || '08:00').slice(0, 5)} - ${(fullPt.work_end_time || '18:00').slice(0, 5)}</div>`).appendTo(subInfo);

              // 5 Menu Sidebar Dọc Khớp 100% Mobile PT
              const navMenu = $('<div class="profile-sidebar-nav">').appendTo(sidebar);
              $('<div class="profile-sidebar-heading">MENU HUẤN LUYỆN VIÊN</div>').appendTo(navMenu);

              const menuItems = [
                { id: 'overview', label: 'Tổng quan', icon: 'fa-solid fa-chart-pie', count: null },
                { id: 'schedule', label: 'Lịch', icon: 'fa-solid fa-calendar-days', count: allUpcoming.length || (allBookings.length + communityClasses.length) },
                { id: 'members', label: 'Gói phụ trách', icon: 'fa-solid fa-boxes-stacked', count: assignedRegistrations.length },
                { id: 'commissions', label: 'Thu nhập', icon: 'fa-solid fa-sack-dollar', count: commissions.length || null },
                { id: 'profile', label: 'Tài khoản', icon: 'fa-solid fa-circle-user', count: null }
              ];

              let activeTabId = 'overview';
              const menuBtnMap = {};

              menuItems.forEach(item => {
                const btn = $('<div class="profile-sidebar-item trainer-sidebar-item">')
                  .append($(`<i class="${item.icon}" style="width: 16px; font-size: 13px; text-align: center; color: #586b5e;"></i>`))
                  .append($('<span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">').text(item.label));

                if (item.count !== null && item.count !== undefined) {
                  $('<span class="profile-sidebar-count">').text(item.count).appendTo(btn);
                }

                btn.on('click', () => switchTab(item.id));
                btn.appendTo(navMenu);
                menuBtnMap[item.id] = btn;
              });

              // Chân Sidebar: Nút tác vụ nhanh
              const quickActions = $('<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-top: 1px solid var(--border-color, #dfe6e2); padding-top: 12px; margin-top: auto; flex-shrink: 0;">').appendTo(sidebar);
              if (isAdmin()) {
                $('<button class="dx-button dx-button-default dx-button-mode-outlined" style="font-size: 11px; padding: 5px; height: 32px; border-radius: 4px;">')
                  .html('<i class="fa-solid fa-user-pen" style="margin-right: 4px;"></i>Sửa hồ sơ')
                  .on('click', () => { popup.hide(); showTrainerForm(state, fullPt); })
                  .appendTo(quickActions);
                $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 11px; padding: 5px; height: 32px; border-radius: 4px;">')
                  .html('<i class="fa-solid fa-repeat" style="margin-right: 4px;"></i>Bàn giao')
                  .on('click', () => { popup.hide(); openTrainerHandoverModal(state, fullPt); })
                  .appendTo(quickActions);
                $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 11px; padding: 5px; height: 32px; border-radius: 4px; grid-column: span 2;">')
                  .html('<i class="fa-solid fa-toggle-on" style="margin-right: 4px;"></i>Đổi trạng thái làm việc')
                  .on('click', () => { popup.hide(); showTrainerStatus(state, fullPt); })
                  .appendTo(quickActions);
              }

              // ================= CỘT PHẢI: VÙNG NỘI DUNG ĐỘNG (MAIN CONTENT) =================
              const mainPanel = $('<div class="profile-modal-main">').appendTo(layoutWrap);

              function switchTab(tabId) {
                activeTabId = tabId;
                Object.keys(menuBtnMap).forEach(k => {
                  const el = menuBtnMap[k];
                  if (k === tabId) {
                    el.addClass('is-active');
                  } else {
                    el.removeClass('is-active');
                  }
                });
                renderTabContent(tabId);
              }

              function renderTabContent(tabId) {
                mainPanel.empty();

                // =============================================================
                // TAB 1: TỔNG QUAN (overview) - Hero thu nhập, 5 KPI, Ca tiếp theo & Check-in
                // =============================================================
                if (tabId === 'overview') {
                  // Hero Card: Thù lao & hoa hồng tháng này
                  const heroCard = $(`
                    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">
                      <div>
                        <div style="font-size: 11px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">TỔNG THU NHẬP ƯỚC TÍNH THÁNG NÀY</div>
                        <div style="font-size: 24px; font-weight: 700; color: #15803d; font-family: Manrope, sans-serif; margin-top: 2px;">
                          ${formatVnd(totalEstimatedIncome)}
                        </div>
                        <div style="font-size: 12px; color: #166534; margin-top: 4px; display: flex; gap: 16px; flex-wrap: wrap;">
                          <span><i class="fa-solid fa-dumbbell" style="margin-right: 4px;"></i>Hoa hồng gói PT/COMBO: <strong>${formatVnd(totalPTCommission)}</strong></span>
                          <span><i class="fa-solid fa-users" style="margin-right: 4px;"></i>Thù lao lớp cộng đồng: <strong>${formatVnd(totalClassCompensation)}</strong></span>
                        </div>
                      </div>
                      <button type="button" class="dx-button dx-button-default dx-button-mode-contained btn-view-income-detail" style="font-size: 12px; padding: 7px 16px; border-radius: 4px; cursor: pointer;">
                        <i class="fa-solid fa-arrow-right" style="margin-right: 6px;"></i>Xem chi tiết thu nhập
                      </button>
                    </div>
                  `).appendTo(mainPanel);
                  heroCard.find('.btn-view-income-detail').on('click', () => switchTab('commissions'));

                  // 5 Thẻ Metric KPI Chuẩn Mobile PT
                  const mRow = $('<div class="metrics-row" style="margin-bottom: 20px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">').appendTo(mainPanel);
                  const mCard = (tone, label, val, sub, icon) => $(`
                    <article class="metric-card ${tone}">
                      <div class="metric-label">
                        <span>${label}</span>
                        <i class="${icon}" aria-hidden="true"></i>
                      </div>
                      <strong class="metric-value">${val}</strong>
                      <span class="metric-caption">${sub}</span>
                    </article>
                  `);
                  mRow.append(mCard('metric-blue', 'Buổi PT đã dạy', `${completedSessions.length} buổi`, 'Đã xác nhận kép 2 chiều', 'fa-solid fa-calendar-check'));
                  mRow.append(mCard('metric-purple', 'Lớp học cộng đồng', `${communityClasses.length} lớp`, `Thù lao: ${formatVnd(totalClassCompensation)}`, 'fa-solid fa-people-group'));
                  mRow.append(mCard('metric-green', 'Học viên phụ trách', `${uniqueMembers.length} học viên`, 'Hợp đồng đang phụ trách', 'fa-solid fa-users'));
                  mRow.append(mCard('metric-amber', 'Gói đang kích hoạt', `${assignedRegistrations.filter(r => r.status === 'ACTIVE').length} hợp đồng`, 'Học viên đang theo tập', 'fa-solid fa-boxes-stacked'));
                  mRow.append(mCard('metric-coral', 'Lịch dạy hôm nay', `${todayTotalSessions} ca`, `${todayPtSessions.length} ca PT · ${todayCommunityClasses.length} lớp CĐ`, 'fa-solid fa-clock'));

                  // Ca dạy tiếp theo
                  const sessionBox = $('<div class="profile-card-box" style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px;">').appendTo(mainPanel);
                  const sessionLeft = $('<div style="display: flex; align-items: center; gap: 14px;">').appendTo(sessionBox);
                  const isClass = nextUpcoming?.category === 'CLASS';
                  sessionLeft.html(`
                    <div style="width: 44px; height: 44px; border-radius: 8px; background: ${isClass ? '#f4f0fd' : 'var(--primary-light, #eaf4ee)'}; color: ${isClass ? '#7c3aed' : 'var(--primary, #237b58)'}; display: grid; place-items: center; font-size: 20px; flex-shrink: 0;">
                      <i class="fa-solid ${isClass ? 'fa-people-group' : 'fa-dumbbell'}"></i>
                    </div>
                    <div>
                      <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted, #748078); text-transform: uppercase; letter-spacing: 0.5px;">
                        CA DẠY TIẾP THEO ${isClass ? '(LỚP CỘNG ĐỒNG)' : '(KÈM PT 1:1)'}
                      </div>
                      <div style="font-size: 14px; font-weight: 700; color: var(--primary-dark, #185740); margin-top: 2px;">
                        ${nextUpcoming ? `${nextUpcoming.title} · ${new Date(nextUpcoming.date).toLocaleDateString('vi-VN')} (${clock(nextUpcoming.start_time)} - ${clock(nextUpcoming.end_time)})` : 'Không có ca dạy tiếp theo'}
                      </div>
                      <div style="font-size: 12px; color: #586b5e; margin-top: 2px;">
                        ${nextUpcoming ? `${nextUpcoming.target} · ${nextUpcoming.sub} · ${nextUpcoming.branch}` : 'Huấn luyện viên hiện không có ca dạy sắp diễn ra'}
                      </div>
                    </div>
                  `);
                  $('<button class="dx-button dx-button-default dx-button-mode-outlined" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">')
                    .text('Xem toàn bộ lịch dạy')
                    .on('click', () => switchTab('schedule'))
                    .appendTo(sessionBox);

                  // Nhật ký quẹt thẻ vào/ra cổng
                  $('<h4 class="profile-section-title"><i class="fa-solid fa-arrow-right-to-bracket" style="margin-right: 6px;"></i>Nhật Ký Quẹt Thẻ & Check-in Ca Trực Của Huấn Luyện Viên</h4>').appendTo(mainPanel);
                  ptDetailGrid(mainPanel, accessLogs, [
                    { caption: 'Thời gian', dataField: 'check_in_time', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm', width: 140, alignment: 'center' },
                    { caption: 'Chi nhánh', dataField: 'branch_name', minWidth: 140 },
                    { caption: 'Chiều', dataField: 'direction', width: 95, alignment: 'center', cellTemplate: (el, c) => el.text(c.value === 'IN' ? 'Vào cổng' : 'Ra cổng') },
                    { caption: 'Phương thức', dataField: 'access_method', width: 110, alignment: 'center', customizeText: c => c.value === 'FACE_ID' ? 'Face ID' : c.value === 'QR_CODE' ? 'Mã QR' : (c.value || '--') },
                    { caption: 'Kết quả', dataField: 'status', width: 110, alignment: 'center', cellTemplate: (el, c) => {
                      const ok = c.value === 'ALLOWED' || c.value === 'ACTIVE';
                      $('<span>').addClass(`status-badge ${ok ? 'badge-success' : 'badge-danger'}`).text(ok ? 'Hợp lệ' : 'Từ chối').appendTo(el);
                    } },
                    { caption: 'Lý do từ chối', dataField: 'denial_reason', minWidth: 140, customizeText: c => c.value || '--' }
                  ], 'Chưa có lịch sử ra vào cổng của HLV.');
                }

                // =============================================================
                // TAB 2: LỊCH (schedule) - Gộp cả Ca dạy PT 1:1 và Lớp cộng đồng
                // =============================================================
                else if (tabId === 'schedule') {
                  const subNav = $('<div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border-color, #dfe6e2); padding-bottom: 10px;">').appendTo(mainPanel);
                  let schedMode = 'upcoming';
                  const btnUpcoming = $('<button class="dx-button dx-button-default dx-button-mode-contained" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">').text(`Lịch dạy sắp tới (${allUpcoming.length})`).appendTo(subNav);
                  const btnHistory = $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">').text(`Lịch sử ca dạy đã hoàn thành (${allHistory.length})`).appendTo(subNav);
                  const schedContainer = $('<div>').appendTo(mainPanel);

                  function renderScheduleSubView() {
                    schedContainer.empty();
                    if (schedMode === 'upcoming') {
                      btnUpcoming.removeClass('dx-button-mode-outlined').addClass('dx-button-mode-contained');
                      btnHistory.removeClass('dx-button-mode-contained').addClass('dx-button-mode-outlined');

                      ptDetailGrid(schedContainer, allUpcoming, [
                        {
                          caption: 'Loại ca', width: 120, alignment: 'center',
                          cellTemplate: (el, cell) => {
                            const isCls = cell.data.category === 'CLASS';
                            $('<span>')
                              .addClass('status-badge')
                              .css({
                                background: isCls ? '#f4f0fd' : '#eaf4ee',
                                color: isCls ? '#7c3aed' : '#237b58',
                                border: `1px solid ${isCls ? '#ddd6fe' : '#bbf7d0'}`,
                                fontWeight: 600
                              })
                              .text(isCls ? 'Lớp cộng đồng' : 'Kèm PT 1:1')
                              .appendTo(el);
                          }
                        },
                        { caption: 'Ngày dạy', dataField: 'date', dataType: 'date', format: 'dd/MM/yyyy', width: 105, alignment: 'center' },
                        { caption: 'Khung giờ', calculateCellValue: b => `${clock(b.start_time)} - ${clock(b.end_time)}`, width: 115, alignment: 'center' },
                        { caption: 'Nội dung / Gói tập', dataField: 'title', minWidth: 150 },
                        {
                          caption: 'Học viên / Sĩ số', minWidth: 160,
                          cellTemplate: (el, cell) => {
                            const r = cell.data;
                            $('<div>')
                              .append($('<strong>').text(r.target || '--'))
                              .append($('<small style="display:block;color:#748078;font-size:11px;">').text(r.target_sub || ''))
                              .appendTo(el);
                          }
                        },
                        { caption: 'Chi nhánh', dataField: 'branch', minWidth: 130 },
                        { caption: 'Trạng thái', dataField: 'status', width: 130, alignment: 'center', cellTemplate: (el, c) => badge(el, c.value, BOOKING_STATUS) },
                        {
                          caption: 'Thao tác', width: 130, alignment: 'center',
                          cellTemplate: (el, cell) => {
                            if (cell.data.category === 'CLASS') {
                              $('<button class="dx-button dx-button-default dx-button-mode-outlined" style="font-size: 11px; padding: 3px 8px; border-radius: 4px;">')
                                .html('<i class="fa-solid fa-list-ul" style="margin-right: 4px;"></i>Xem học viên')
                                .on('click', () => openCommunityClassMembersModal(cell.data.raw))
                                .appendTo(el);
                            } else {
                              el.text('--');
                            }
                          }
                        }
                      ], 'Không có ca dạy nào sắp diễn ra.');
                    } else {
                      btnHistory.removeClass('dx-button-mode-outlined').addClass('dx-button-mode-contained');
                      btnUpcoming.removeClass('dx-button-mode-contained').addClass('dx-button-mode-outlined');

                      ptDetailGrid(schedContainer, allHistory, [
                        {
                          caption: 'Loại ca', width: 115, alignment: 'center',
                          cellTemplate: (el, cell) => {
                            const isCls = cell.data.category === 'CLASS';
                            $('<span>')
                              .addClass('status-badge')
                              .css({
                                background: isCls ? '#f4f0fd' : '#eaf4ee',
                                color: isCls ? '#7c3aed' : '#237b58',
                                border: `1px solid ${isCls ? '#ddd6fe' : '#bbf7d0'}`,
                                fontWeight: 600
                              })
                              .text(isCls ? 'Lớp cộng đồng' : 'Kèm PT 1:1')
                              .appendTo(el);
                          }
                        },
                        { caption: 'Ngày dạy', dataField: 'date', dataType: 'date', format: 'dd/MM/yyyy', width: 105, alignment: 'center' },
                        { caption: 'Khung giờ', calculateCellValue: b => `${clock(b.start_time)} - ${clock(b.end_time)}`, width: 110, alignment: 'center' },
                        { caption: 'Hội viên / Lớp', dataField: 'target', minWidth: 140 },
                        { caption: 'Buổi số / Bộ môn', dataField: 'session_number', width: 110, alignment: 'center' },
                        { caption: 'Nội dung / Ghi chú', dataField: 'workout_notes', minWidth: 150, customizeText: c => c.value || '--' },
                        { caption: 'Đánh giá / Phòng', dataField: 'fitness_assessment', minWidth: 140, customizeText: c => c.value || '--' },
                        {
                          caption: 'Xác nhận PT', dataField: 'pt_confirmed_at', width: 130, alignment: 'center',
                          dataType: 'datetime', format: 'dd/MM/yyyy HH:mm',
                          customizeText: c => c.value ? c.valueText : '--'
                        },
                        {
                          caption: 'Xác nhận HV', dataField: 'member_confirmed_at', width: 130, alignment: 'center',
                          dataType: 'datetime', format: 'dd/MM/yyyy HH:mm',
                          customizeText: c => c.value ? c.valueText : '--'
                        },
                        { caption: 'Trừ buổi', calculateCellValue: b => b.is_deducted ? 'Đã trừ' : 'Chưa', width: 85, alignment: 'center' }
                      ], 'Chưa có lịch sử ca dạy hoàn thành.');
                    }
                  }

                  btnUpcoming.on('click', () => { schedMode = 'upcoming'; renderScheduleSubView(); });
                  btnHistory.on('click', () => { schedMode = 'history'; renderScheduleSubView(); });
                  renderScheduleSubView();
                }

                // =============================================================
                // TAB 3: GÓI PHỤ TRÁCH (members) - 3 Sub-tabs chuẩn hóa Mobile PT
                // =============================================================
                else if (tabId === 'members') {
                  const subNav = $('<div style="display: flex; gap: 8px; margin-bottom: 14px; border-bottom: 1px solid var(--border-color, #dfe6e2); padding-bottom: 10px; flex-wrap: wrap;">').appendTo(mainPanel);
                  let currentMembersTab = 'members';

                  const btnTabMembers = $('<button class="dx-button dx-button-default dx-button-mode-contained" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">').text(`Học viên phụ trách (${uniqueMembers.length})`).appendTo(subNav);
                  const btnTabPackages = $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">').text(`Gói đang phụ trách (${assignedRegistrations.length})`).appendTo(subNav);
                  const btnTabCommunity = $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">').text(`Lớp tập CĐ phụ trách (${communityClasses.length})`).appendTo(subNav);

                  // Thanh tìm kiếm realtime
                  const searchWrap = $('<div style="margin-bottom: 16px; position: relative;">').appendTo(mainPanel);
                  const searchInput = $('<input type="text" class="dx-texteditor-input" placeholder="Tìm kiếm nhanh..." style="width: 100%; height: 36px; padding: 6px 12px 6px 34px; border: 1px solid var(--border-color, #dfe6e2); border-radius: 6px; font-size: 12.5px; background: #ffffff;">').appendTo(searchWrap);
                  $('<i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 11px; color: var(--text-muted, #748078); font-size: 13px;"></i>').appendTo(searchWrap);

                  let searchQuery = '';
                  searchInput.on('input', e => {
                    searchQuery = e.target.value.trim().toLowerCase();
                    renderMembersSubView();
                  });

                  const viewContainer = $('<div>').appendTo(mainPanel);

                  function renderMembersSubView() {
                    viewContainer.empty();
                    searchInput.attr('placeholder', currentMembersTab === 'members' ? 'Tìm học viên phụ trách...' : (currentMembersTab === 'packages' ? 'Tìm gói tập, mã HĐ...' : 'Tìm lớp tập cộng đồng...'));

                    btnTabMembers.toggleClass('dx-button-mode-contained', currentMembersTab === 'members').toggleClass('dx-button-mode-outlined', currentMembersTab !== 'members');
                    btnTabPackages.toggleClass('dx-button-mode-contained', currentMembersTab === 'packages').toggleClass('dx-button-mode-outlined', currentMembersTab !== 'packages');
                    btnTabCommunity.toggleClass('dx-button-mode-contained', currentMembersTab === 'community').toggleClass('dx-button-mode-outlined', currentMembersTab !== 'community');

                    // SUB-TAB 1: Học viên phụ trách
                    if (currentMembersTab === 'members') {
                      let list = uniqueMembers;
                      if (searchQuery) {
                        list = list.filter(m => (m.name || '').toLowerCase().includes(searchQuery) || (m.code || '').toLowerCase().includes(searchQuery) || (m.phone || '').toLowerCase().includes(searchQuery));
                      }

                      const mRow = $('<div class="metrics-row" style="margin-bottom: 16px;">').appendTo(viewContainer);
                      mRow.append($(`
                        <article class="metric-card metric-green"><div class="metric-label"><span>Học viên phụ trách</span><i class="fa-solid fa-users"></i></div><strong class="metric-value">${uniqueMembers.length}</strong><span class="metric-caption">Phân công theo dõi</span></article>
                        <article class="metric-card metric-blue"><div class="metric-label"><span>Buổi PT còn lại</span><i class="fa-solid fa-calendar-days"></i></div><strong class="metric-value">${uniqueMembers.reduce((s, m) => s + m.totalRemainingPt, 0)}</strong><span class="metric-caption">Tổng buổi khả dụng</span></article>
                        <article class="metric-card metric-amber"><div class="metric-label"><span>Đang theo tập</span><i class="fa-solid fa-dumbbell"></i></div><strong class="metric-value">${uniqueMembers.filter(m => m.activeCount > 0).length}</strong><span class="metric-caption">Có gói đang hiệu lực</span></article>
                      `));

                      ptDetailGrid(viewContainer, list, [
                        { caption: 'Mã HV', dataField: 'code', width: 100, alignment: 'center' },
                        { caption: 'Họ và tên', dataField: 'name', minWidth: 160 },
                        { caption: 'Số điện thoại', dataField: 'phone', width: 125 },
                        { caption: 'Chi nhánh', dataField: 'branch_name', minWidth: 140 },
                        { caption: 'Gói đăng ký', calculateCellValue: m => `${m.registrations.length} gói (${m.activeCount} hiệu lực)`, minWidth: 140, alignment: 'center' },
                        { caption: 'Buổi PT còn lại', dataField: 'totalRemainingPt', width: 120, alignment: 'center', cellTemplate: (el, c) => $('<strong>').css({ color: '#237b58' }).text(`${c.value} buổi`).appendTo(el) },
                        { caption: 'Tham gia từ', dataField: 'earliestStart', dataType: 'date', format: 'dd/MM/yyyy', width: 110, alignment: 'center' },
                        {
                          caption: 'Trạng thái', width: 120, alignment: 'center',
                          cellTemplate: (el, c) => {
                            const act = c.data.activeCount > 0;
                            $('<span>').addClass(`status-badge ${act ? 'badge-success' : 'badge-info'}`).text(act ? 'Đang tập' : 'Chờ gói mới').appendTo(el);
                          }
                        }
                      ], 'Huấn luyện viên chưa phụ trách học viên nào.');
                    }

                    // SUB-TAB 2: Gói đang phụ trách
                    else if (currentMembersTab === 'packages') {
                      let list = assignedRegistrations;
                      if (searchQuery) {
                        list = list.filter(r => (r.member_name || '').toLowerCase().includes(searchQuery) || (r.reg_code || r.registration_code || '').toLowerCase().includes(searchQuery) || (r.package_name_snapshot || '').toLowerCase().includes(searchQuery));
                      }

                      const mRow = $('<div class="metrics-row" style="margin-bottom: 16px;">').appendTo(viewContainer);
                      const totalRemSessions = assignedRegistrations.reduce((s, r) => s + (parseInt(r.remaining_pt_sessions, 10) || 0), 0);
                      const activeAssigned = assignedRegistrations.filter(r => r.status === 'ACTIVE').length;
                      mRow.append($(`
                        <article class="metric-card metric-green"><div class="metric-label"><span>Tổng hợp đồng PT</span><i class="fa-solid fa-boxes-stacked"></i></div><strong class="metric-value">${assignedRegistrations.length}</strong><span class="metric-caption">Hợp đồng giao phụ trách</span></article>
                        <article class="metric-card metric-blue"><div class="metric-label"><span>Buổi PT còn lại cần dạy</span><i class="fa-solid fa-calendar-check"></i></div><strong class="metric-value">${totalRemSessions}</strong><span class="metric-caption">Khả dụng trên các gói</span></article>
                        <article class="metric-card metric-amber"><div class="metric-label"><span>Hợp đồng đang kích hoạt</span><i class="fa-solid fa-check"></i></div><strong class="metric-value">${activeAssigned}</strong><span class="metric-caption">Trạng thái ACTIVE</span></article>
                      `));

                      ptDetailGrid(viewContainer, list, [
                        { caption: 'Mã HĐ', calculateCellValue: r => r.reg_code || r.registration_code, width: 115, alignment: 'center' },
                        { caption: 'Hội viên', dataField: 'member_name', minWidth: 150 },
                        { caption: 'Số điện thoại', dataField: 'member_phone', width: 120 },
                        { caption: 'Gói tập', dataField: 'package_name_snapshot', minWidth: 160 },
                        { caption: 'Tổng buổi', dataField: 'total_pt_sessions_snapshot', width: 90, alignment: 'center' },
                        { caption: 'Đã tập', dataField: 'used_pt_sessions', width: 80, alignment: 'center' },
                        { caption: 'Còn lại', dataField: 'remaining_pt_sessions', width: 80, alignment: 'center', cellTemplate: (el, c) => $('<strong>').css({ color: '#237b58' }).text(c.value).appendTo(el) },
                        { caption: 'Hạn dùng', dataField: 'end_date', dataType: 'date', format: 'dd/MM/yyyy', width: 110, alignment: 'center' },
                        { caption: 'Trạng thái', dataField: 'status', width: 140, alignment: 'center', cellTemplate: (el, c) => badge(el, c.value, BOOKING_STATUS) }
                      ], 'Không có gói tập nào phù hợp.');
                    }

                    // SUB-TAB 3: Lớp tập CĐ phụ trách
                    else if (currentMembersTab === 'community') {
                      let list = communityClasses;
                      if (searchQuery) {
                        list = list.filter(c => (c.title || '').toLowerCase().includes(searchQuery) || (c.discipline_name || '').toLowerCase().includes(searchQuery) || (c.branch_name || '').toLowerCase().includes(searchQuery));
                      }

                      const mRow = $('<div class="metrics-row" style="margin-bottom: 16px;">').appendTo(viewContainer);
                      const totalEnrolled = communityClasses.reduce((s, c) => s + Number(c.enrolled_slots || 0), 0);
                      mRow.append($(`
                        <article class="metric-card metric-purple"><div class="metric-label"><span>Lớp CĐ phụ trách</span><i class="fa-solid fa-people-group"></i></div><strong class="metric-value">${communityClasses.length}</strong><span class="metric-caption">Ca phân công huấn luyện</span></article>
                        <article class="metric-card metric-blue"><div class="metric-label"><span>Tổng lượt học viên</span><i class="fa-solid fa-users"></i></div><strong class="metric-value">${totalEnrolled}</strong><span class="metric-caption">HV đã đăng ký tập</span></article>
                        <article class="metric-card metric-amber"><div class="metric-label"><span>Tổng thù lao ước tính</span><i class="fa-solid fa-sack-dollar"></i></div><strong class="metric-value" style="font-size:20px;">${formatVnd(totalClassCompensation)}</strong><span class="metric-caption">Cơ bản + Thưởng sĩ số</span></article>
                      `));

                      ptDetailGrid(viewContainer, list, [
                        {
                          dataField: 'class_date', caption: 'Ngày dạy', width: 105, alignment: 'center',
                          dataType: 'date', format: 'dd/MM/yyyy', sortOrder: 'desc'
                        },
                        {
                          caption: 'Khung giờ', width: 110, alignment: 'center',
                          calculateCellValue: r => `${clock(r.start_time)} - ${clock(r.end_time)}`
                        },
                        {
                          dataField: 'title', caption: 'Lớp học & Bộ môn', minWidth: 160,
                          cellTemplate: (el, cell) => {
                            const r = cell.data;
                            $('<div>')
                              .append($('<strong>').text(r.title || 'Lớp cộng đồng'))
                              .append($('<small style="display:block;color:#748078;font-size:11px;">').text(r.discipline_name || 'Bộ môn nhóm'))
                              .appendTo(el);
                          }
                        },
                        { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 130 },
                        {
                          caption: 'Sĩ số', width: 115, alignment: 'center',
                          cellTemplate: (el, cell) => {
                            const r = cell.data;
                            const enr = Number(r.enrolled_slots || 0);
                            const max = Number(r.max_slots || 30);
                            const pct = Math.round((enr / max) * 100);
                            $(`<div><strong>${enr}/${max} HV</strong> <small style="color:#7c3aed;">(${pct}%)</small></div>`).appendTo(el);
                          }
                        },
                        {
                          caption: 'Thù lao (VND)', alignment: 'right', minWidth: 135,
                          cellTemplate: (el, cell) => {
                            const r = cell.data;
                            const total = Number(r.total_compensation || ((Number(r.base_price) || 0) + (Number(r.bonus_amount) || 0)));
                            const wrap = $('<div style="text-align:right;">').appendTo(el);
                            $('<strong style="font-family:Manrope,sans-serif;color:#7c3aed;font-size:12.5px;display:block;">')
                              .text(formatVnd(total))
                              .appendTo(wrap);
                            if (Number(r.bonus_amount) > 0) {
                              $('<small style="color:#748078;font-size:10px;">')
                                .text(`(Gốc: ${formatVnd(r.base_price)} + Thưởng: ${formatVnd(r.bonus_amount)})`)
                                .appendTo(wrap);
                            }
                          }
                        },
                        {
                          dataField: 'status', caption: 'Trạng thái', width: 115, alignment: 'center',
                          cellTemplate: (el, cell) => {
                            const st = cell.value;
                            const badgeText = st === 'COMPLETED' ? 'Hoàn thành' : st === 'SCHEDULED' ? 'Đã lên lịch' : st === 'CANCELLED' ? 'Đã hủy' : (st || 'Đã lên lịch');
                            const badgeTone = st === 'COMPLETED' ? 'badge-success' : st === 'CANCELLED' ? 'badge-danger' : 'badge-info';
                            $('<span class="status-badge">').addClass(badgeTone).text(badgeText).appendTo(el);
                          }
                        },
                        {
                          caption: 'Thao tác', width: 135, alignment: 'center',
                          cellTemplate: (el, cell) => {
                            $('<button class="dx-button dx-button-default dx-button-mode-outlined" style="font-size: 11px; padding: 3px 8px; border-radius: 4px;">')
                              .html('<i class="fa-solid fa-list-ul" style="margin-right: 4px;"></i>Xem học viên')
                              .on('click', () => openCommunityClassMembersModal(cell.data))
                              .appendTo(el);
                          }
                        }
                      ], 'Không có lớp học cộng đồng nào.');
                    }
                  }

                  btnTabMembers.on('click', () => { currentMembersTab = 'members'; renderMembersSubView(); });
                  btnTabPackages.on('click', () => { currentMembersTab = 'packages'; renderMembersSubView(); });
                  btnTabCommunity.on('click', () => { currentMembersTab = 'community'; renderMembersSubView(); });
                  renderMembersSubView();
                }

                // =============================================================
                // TAB 4: THU NHẬP (commissions) - 3 Sub-tabs chuẩn hóa Mobile PT
                // =============================================================
                else if (tabId === 'commissions') {
                  const subNav = $('<div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border-color, #dfe6e2); padding-bottom: 10px; flex-wrap: wrap;">').appendTo(mainPanel);
                  let currentIncomeTab = 'income_summary';

                  const btnTabSummary = $('<button class="dx-button dx-button-default dx-button-mode-contained" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">').text('Thu nhập').appendTo(subNav);
                  const btnTabPtCombo = $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">').text('Gói PT / Combo').appendTo(subNav);
                  const btnTabCommunityComp = $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">').text('Thù lao lớp CĐ').appendTo(subNav);

                  const incomeContainer = $('<div>').appendTo(mainPanel);

                  function renderIncomeSubView() {
                    incomeContainer.empty();
                    btnTabSummary.toggleClass('dx-button-mode-contained', currentIncomeTab === 'income_summary').toggleClass('dx-button-mode-outlined', currentIncomeTab !== 'income_summary');
                    btnTabPtCombo.toggleClass('dx-button-mode-contained', currentIncomeTab === 'pt_combo').toggleClass('dx-button-mode-outlined', currentIncomeTab !== 'pt_combo');
                    btnTabCommunityComp.toggleClass('dx-button-mode-contained', currentIncomeTab === 'community_comp').toggleClass('dx-button-mode-outlined', currentIncomeTab !== 'community_comp');

                    // SUB-TAB 1: Thu nhập (Tổng hợp & Khối xác nhận chi trả 2 chiều gộp)
                    if (currentIncomeTab === 'income_summary') {
                      // Banner Tổng thu nhập
                      $(`
                        <div style="background: linear-gradient(135deg, #185740 0%, #237b58 100%); color: #ffffff; border-radius: 8px; padding: 18px 22px; margin-bottom: 18px;">
                          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.85;">
                            TỔNG THU NHẬP ƯỚC TÍNH (THÁNG ${latestCommission ? `${latestCommission.month}/${latestCommission.year}` : `${new Date().getMonth() + 1}/${new Date().getFullYear()}`})
                          </div>
                          <div style="font-size: 28px; font-weight: 700; font-family: Manrope, sans-serif; margin: 4px 0 8px;">
                            ${formatVnd(totalEstimatedIncome)}
                          </div>
                          <div style="font-size: 12px; display: flex; gap: 20px; flex-wrap: wrap; opacity: 0.95;">
                            <span>Hoa hồng gói PT/COMBO: <strong>${formatVnd(totalPTCommission)}</strong></span>
                            <span>Thù lao lớp cộng đồng: <strong>${formatVnd(totalClassCompensation)}</strong></span>
                            <span>Tổng ca dạy: <strong>${completedSessions.length + completedCommunityClasses.length} ca</strong></span>
                          </div>
                        </div>
                      `).appendTo(incomeContainer);

                      // Khối Xác Nhận Chi Trả 2 Chiều Gộp (Chống chối nhận tiền)
                      const isPaid = latestCommission?.status === 'PAID';
                      const confirmBox = $(`
                        <div style="background: #ffffff; border: 1.5px solid ${isPaid ? '#bbf7d0' : '#fed7aa'}; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <div>
                              <div style="font-size: 10.5px; font-weight: 700; color: ${isPaid ? '#15803d' : '#c2410c'}; text-transform: uppercase; letter-spacing: 0.5px;">
                                <i class="fa-solid fa-handshake" style="margin-right: 5px;"></i>ĐỐI SOÁT & XÁC NHẬN CHI TRẢ GỘP 2 CHIỀU
                              </div>
                              <div style="font-size: 15px; font-weight: 700; color: #185740; margin-top: 3px;">
                                Số tiền chi trả gộp: <span style="color: #15803d; font-family: Manrope, sans-serif;">${formatVnd(totalEstimatedIncome)}</span>
                              </div>
                              <div style="font-size: 12px; color: #586b5e; margin-top: 3px;">
                                Hình thức: <strong>Tiền mặt tại quầy / Chuyển khoản ngân hàng</strong> · Kỳ thanh toán: Tháng ${latestCommission ? `${latestCommission.month}/${latestCommission.year}` : `${new Date().getMonth() + 1}/${new Date().getFullYear()}`}
                              </div>
                            </div>
                            <div>
                              <span class="status-badge ${isPaid ? 'badge-success' : 'badge-warning'}" style="font-size: 12px; padding: 5px 12px;">
                                <i class="fa-solid ${isPaid ? 'fa-circle-check' : 'fa-clock'}" style="margin-right: 4px;"></i>
                                ${isPaid ? 'Đã chi trả & Hoàn tất ký nhận 2 chiều' : 'Chờ xác nhận chi trả 2 chiều'}
                              </span>
                            </div>
                          </div>
                          ${latestCommission?.pt_confirmed_at ? `
                            <div style="font-size: 11.5px; color: #15803d; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #bbf7d0;">
                              <i class="fa-solid fa-check-double" style="margin-right: 4px;"></i>Huấn luyện viên đã xác nhận nhận tiền vào lúc: <strong>${new Date(latestCommission.pt_confirmed_at).toLocaleString('vi-VN')}</strong>
                            </div>
                          ` : ''}
                        </div>
                      `).appendTo(incomeContainer);

                      // 2 Card đối soát chi tiết chuyển nhanh
                      const detailRow = $('<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">').appendTo(incomeContainer);

                      const cardPt = $(`
                        <div class="profile-card-box" style="margin: 0; padding: 16px; border: 1px solid var(--border-color, #dfe6e2); border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 700; color: #185740;"><i class="fa-solid fa-dumbbell" style="margin-right: 6px; color: var(--primary);"></i>Hoa hồng gói PT / COMBO</span>
                            <i class="fa-solid fa-chevron-right" style="color: #748078; font-size: 12px;"></i>
                          </div>
                          <div style="font-size: 20px; font-weight: 700; color: #15803d; font-family: Manrope, sans-serif;">
                            ${formatVnd(totalPTCommission)}
                          </div>
                          <div style="font-size: 12px; color: #586b5e; margin-top: 4px;">
                            Số ca dạy: <strong>${completedSessions.length} buổi</strong> · Tỷ lệ: <strong>25%</strong>
                          </div>
                        </div>
                      `).appendTo(detailRow);
                      cardPt.on('click', () => { currentIncomeTab = 'pt_combo'; renderIncomeSubView(); });

                      const cardCommunity = $(`
                        <div class="profile-card-box" style="margin: 0; padding: 16px; border: 1px solid var(--border-color, #dfe6e2); border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-size: 13px; font-weight: 700; color: #7c3aed;"><i class="fa-solid fa-people-group" style="margin-right: 6px;"></i>Thù lao lớp học cộng đồng</span>
                            <i class="fa-solid fa-chevron-right" style="color: #748078; font-size: 12px;"></i>
                          </div>
                          <div style="font-size: 20px; font-weight: 700; color: #7c3aed; font-family: Manrope, sans-serif;">
                            ${formatVnd(totalClassCompensation)}
                          </div>
                          <div style="font-size: 12px; color: #586b5e; margin-top: 4px;">
                            Số ca dạy: <strong>${communityClasses.length} lớp</strong> · Đã hoàn thành: <strong>${completedCommunityClasses.length} lớp</strong>
                          </div>
                        </div>
                      `).appendTo(detailRow);
                      cardCommunity.on('click', () => { currentIncomeTab = 'community_comp'; renderIncomeSubView(); });
                    }

                    // SUB-TAB 2: Gói PT / Combo
                    else if (currentIncomeTab === 'pt_combo') {
                      const mRow = $('<div class="metrics-row" style="margin-bottom: 16px;">').appendTo(incomeContainer);
                      mRow.append($(`
                        <article class="metric-card metric-green"><div class="metric-label"><span>Hoa hồng gói PT/Combo</span><i class="fa-solid fa-sack-dollar"></i></div><strong class="metric-value">${formatVnd(totalPTCommission)}</strong><span class="metric-caption">Thực nhận kỳ này</span></article>
                        <article class="metric-card metric-blue"><div class="metric-label"><span>Số buổi dạy hoàn thành</span><i class="fa-solid fa-calendar-check"></i></div><strong class="metric-value">${completedSessions.length}</strong><span class="metric-caption">Đã xác nhận kép</span></article>
                        <article class="metric-card metric-amber"><div class="metric-label"><span>Tỷ lệ hoa hồng</span><i class="fa-solid fa-percent"></i></div><strong class="metric-value">${latestCommission?.commission_percentage || 25}%</strong><span class="metric-caption">Theo chính sách phân bổ</span></article>
                      `));

                      $('<h4 class="profile-section-title"><i class="fa-solid fa-list-check" style="margin-right: 6px;"></i>Bảng Kê Chi Trả Hoa Hồng Theo Kỳ (Đối Soát 2 Chiều)</h4>').appendTo(incomeContainer);

                      ptDetailGrid(incomeContainer, commissions, [
                        { caption: 'Kỳ hoa hồng', calculateCellValue: c => `Tháng ${c.month}/${c.year}`, width: 125, alignment: 'center' },
                        { caption: 'Số buổi', dataField: 'total_pt_sessions_taught', width: 75, alignment: 'center' },
                        { caption: 'Doanh thu cơ sở', dataField: 'pt_revenue_share', width: 120, alignment: 'right', customizeText: c => formatVnd(c.value) },
                        { caption: 'Tỷ lệ %', dataField: 'commission_percentage', width: 70, alignment: 'center', customizeText: c => `${c.value}%` },
                        { caption: 'Tiền hoa hồng', dataField: 'total_commission_amount', width: 125, alignment: 'right', cellTemplate: (el, c) => $('<strong>').css({ color: '#15803d', fontFamily: 'Manrope, sans-serif' }).text(formatVnd(c.value)).appendTo(el) },
                        {
                          caption: 'Ngày chi trả', width: 140, alignment: 'center',
                          calculateCellValue: c => (c.paid_at || c.payout_date) ? new Date(c.paid_at || c.payout_date) : null,
                          dataType: 'datetime', format: 'dd/MM/yyyy HH:mm',
                          customizeText: c => c.value ? c.valueText : '--'
                        },
                        { caption: 'Mã GD chi trả', dataField: 'payout_ref', width: 110, alignment: 'center', customizeText: c => c.value || '--' },
                        {
                          caption: 'Trạng thái', dataField: 'status', width: 155, alignment: 'center', cellTemplate: (el, c) => {
                            const map = { PAID: 'Đã thanh toán', PENDING_CONFIRMATION: 'Chờ PT xác nhận', PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt' };
                            const tone = c.value === 'PAID' ? 'badge-success' : c.value === 'PENDING_CONFIRMATION' ? 'badge-warning' : 'badge-info';
                            const $b = $('<span>').addClass(`status-badge ${tone}`).text(map[c.value] || c.value).appendTo(el);
                            if (c.data?.pt_confirmed_at) {
                              $b.attr('title', `PT đã xác nhận: ${new Date(c.data.pt_confirmed_at).toLocaleString('vi-VN')}`);
                            }
                          }
                        }
                      ], 'Chưa có bảng kê hoa hồng nào.');
                    }

                    // SUB-TAB 3: Thù lao lớp CĐ
                    else if (currentIncomeTab === 'community_comp') {
                      const mRow = $('<div class="metrics-row" style="margin-bottom: 16px;">').appendTo(incomeContainer);
                      const baseComp = communityClasses.reduce((s, c) => s + Number(c.base_price || 0), 0);
                      const bonusComp = communityClasses.reduce((s, c) => s + Number(c.bonus_amount || 0), 0);
                      mRow.append($(`
                        <article class="metric-card metric-purple"><div class="metric-label"><span>Tổng thù lao lớp CĐ</span><i class="fa-solid fa-sack-dollar"></i></div><strong class="metric-value">${formatVnd(totalClassCompensation)}</strong><span class="metric-caption">Cơ bản + Thưởng sĩ số</span></article>
                        <article class="metric-card metric-green"><div class="metric-label"><span>Thù lao cơ bản</span><i class="fa-solid fa-wallet"></i></div><strong class="metric-value">${formatVnd(baseComp)}</strong><span class="metric-caption">Định mức theo ca</span></article>
                        <article class="metric-card metric-amber"><div class="metric-label"><span>Thưởng sĩ số</span><i class="fa-solid fa-gift"></i></div><strong class="metric-value">${formatVnd(bonusComp)}</strong><span class="metric-caption">Thưởng lấp đầy lớp</span></article>
                      `));

                      $('<h4 class="profile-section-title"><i class="fa-solid fa-users" style="margin-right: 6px;"></i>Chi Tiết Thù Lao Từng Lớp Học Cộng Đồng</h4>').appendTo(incomeContainer);

                      ptDetailGrid(incomeContainer, communityClasses, [
                        {
                          dataField: 'class_date', caption: 'Ngày dạy', width: 105, alignment: 'center',
                          dataType: 'date', format: 'dd/MM/yyyy', sortOrder: 'desc'
                        },
                        {
                          caption: 'Khung giờ', width: 110, alignment: 'center',
                          calculateCellValue: r => `${clock(r.start_time)} - ${clock(r.end_time)}`
                        },
                        {
                          dataField: 'title', caption: 'Lớp học & Bộ môn', minWidth: 160,
                          cellTemplate: (el, cell) => {
                            const r = cell.data;
                            $('<div>')
                              .append($('<strong>').text(r.title || 'Lớp cộng đồng'))
                              .append($('<small style="display:block;color:#748078;font-size:11px;">').text(r.discipline_name || 'Bộ môn nhóm'))
                              .appendTo(el);
                          }
                        },
                        { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 130 },
                        {
                          caption: 'Sĩ số', width: 95, alignment: 'center',
                          calculateCellValue: r => `${r.enrolled_slots || 0}/${r.max_slots || 30}`
                        },
                        {
                          caption: 'Cơ bản', dataField: 'base_price', width: 110, alignment: 'right',
                          customizeText: c => formatVnd(c.value)
                        },
                        {
                          caption: 'Thưởng', dataField: 'bonus_amount', width: 110, alignment: 'right',
                          customizeText: c => formatVnd(c.value)
                        },
                        {
                          caption: 'Tổng thù lao', width: 125, alignment: 'right',
                          cellTemplate: (el, cell) => {
                            const r = cell.data;
                            const total = Number(r.total_compensation || ((Number(r.base_price) || 0) + (Number(r.bonus_amount) || 0)));
                            $('<strong>').css({ color: '#7c3aed', fontFamily: 'Manrope, sans-serif' }).text(formatVnd(total)).appendTo(el);
                          }
                        },
                        {
                          caption: 'Thao tác', width: 135, alignment: 'center',
                          cellTemplate: (el, cell) => {
                            $('<button class="dx-button dx-button-default dx-button-mode-outlined" style="font-size: 11px; padding: 3px 8px; border-radius: 4px;">')
                              .html('<i class="fa-solid fa-list-ul" style="margin-right: 4px;"></i>Xem học viên')
                              .on('click', () => openCommunityClassMembersModal(cell.data))
                              .appendTo(el);
                          }
                        }
                      ], 'Chưa có lớp học cộng đồng nào.');
                    }
                  }

                  btnTabSummary.on('click', () => { currentIncomeTab = 'income_summary'; renderIncomeSubView(); });
                  btnTabPtCombo.on('click', () => { currentIncomeTab = 'pt_combo'; renderIncomeSubView(); });
                  btnTabCommunityComp.on('click', () => { currentIncomeTab = 'community_comp'; renderIncomeSubView(); });
                  renderIncomeSubView();
                }

                // =============================================================
                // TAB 5: TÀI KHOẢN (profile) - Hồ sơ, chuyên môn, ngân hàng & cài đặt
                // =============================================================
                else if (tabId === 'profile') {
                  const infoSection = $('<div class="profile-card-box" style="margin-bottom: 20px;">').appendTo(mainPanel);
                  $('<h4 class="profile-section-title"><i class="fa-solid fa-address-card" style="margin-right: 8px;"></i>Thông Tin Nhân Sự Huấn Luyện Viên</h4>').appendTo(infoSection);

                  const gridDl = $('<dl class="profile-info-grid">').appendTo(infoSection);
                  const addField = (lbl, val, customVal) => {
                    const item = $('<div class="profile-info-item">').appendTo(gridDl);
                    $('<dt>').text(lbl).appendTo(item);
                    if (customVal) {
                      $('<dd>').append(customVal).appendTo(item);
                    } else {
                      $('<dd>').text(val || '--').appendTo(item);
                    }
                  };

                  addField('Mã huấn luyện viên', fullPt.pt_code || pt.code);
                  addField('Họ và tên', fullPt.full_name);
                  addField('Số điện thoại', fullPt.phone);
                  addField('Email làm việc', fullPt.email || 'Chưa cập nhật');
                  addField('Chi nhánh phục vụ', fullPt.branch_name || '--');
                  addField('Khung giờ làm việc', `${(fullPt.work_start_time || '08:00').slice(0, 5)} - ${(fullPt.work_end_time || '18:00').slice(0, 5)}`);
                  addField('Ngày làm việc trong tuần', fullPt.work_days === 'MON_TO_FRI' ? 'Thứ 2 - Thứ 6' : fullPt.work_days === 'ALL_WEEK' ? 'Thứ 2 - Chủ nhật' : (fullPt.work_days || 'Thứ 2 - Thứ 6'));
                  const statusBadgeEl = $('<span>');
                  badge(statusBadgeEl, fullPt.status, PROFILE_STATUS);
                  addField('Trạng thái hoạt động', null, statusBadgeEl);
                  addField('Nhận diện khuôn mặt Kiosk', null, $(`<span class="status-badge ${fullPt.face_enrolled ? 'badge-success' : 'badge-warning'}">${fullPt.face_enrolled ? 'Đã có khuôn mặt' : 'Chưa có khuôn mặt'}</span>`));

                  // Khối Chuyên môn & Hồ sơ năng lực
                  const specSection = $('<div class="profile-card-box" style="margin-bottom: 20px;">').appendTo(mainPanel);
                  $('<h4 class="profile-section-title"><i class="fa-solid fa-award" style="margin-right: 6px;"></i>Chuyên Môn & Hồ Sơ Năng Lực</h4>').appendTo(specSection);
                  $('<div style="font-size: 11px; color: var(--text-muted, #748078); font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Chuyên môn / Ghi chú năng lực:</div>').appendTo(specSection);
                  $('<div style="font-size: 13px; color: var(--text-main, #26332e); background: #fbfcfb; border: 1px solid var(--border-color, #dfe6e2); border-radius: 6px; padding: 10px 14px; margin-bottom: 12px;">').text(fullPt.specialties || fullPt.specialty || 'Chưa cập nhật chuyên môn');

                  if (fullPt.bio) {
                    $('<div style="font-size: 11px; color: var(--text-muted, #748078); font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">Giới thiệu bản thân (Bio):</div>').appendTo(specSection);
                    $('<div style="font-size: 13px; color: var(--text-main, #26332e); background: #fbfcfb; border: 1px solid var(--border-color, #dfe6e2); border-radius: 6px; padding: 10px 14px;">').text(fullPt.bio);
                  }

                  // Khối Tài khoản ngân hàng chi trả thu nhập
                  const bankSection = $('<div class="profile-card-box" style="margin-bottom: 20px;">').appendTo(mainPanel);
                  $('<h4 class="profile-section-title"><i class="fa-solid fa-building-columns" style="margin-right: 6px;"></i>Tài Khoản Ngân Hàng Nhận Thu Nhập</h4>').appendTo(bankSection);
                  const bankGrid = $('<dl class="profile-info-grid">').appendTo(bankSection);
                  const addBankItem = (lbl, val) => {
                    const itm = $('<div class="profile-info-item">').appendTo(bankGrid);
                    $('<dt>').text(lbl).appendTo(itm);
                    $('<dd style="font-weight: 600; color: var(--primary-dark, #185740);">').text(val || 'Chưa cập nhật').appendTo(itm);
                  };
                  addBankItem('Ngân hàng thụ hưởng', fullPt.bank_name);
                  addBankItem('Số tài khoản', fullPt.bank_account_no);
                  addBankItem('Tên chủ tài khoản', fullPt.bank_account_name);

                  // Khối Cài đặt & Tùy chọn HLV
                  const optSection = $('<div class="profile-card-box">').appendTo(mainPanel);
                  $('<h4 class="profile-section-title"><i class="fa-solid fa-sliders" style="margin-right: 6px;"></i>Cài Đặt & Tùy Chọn Ứng Dụng</h4>').appendTo(optSection);
                  const optList = $('<div style="display: flex; flex-direction: column; gap: 10px;">').appendTo(optSection);
                  const addOptionRow = (title, desc, isChecked) => {
                    $(`
                      <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fbfcfb; border: 1px solid #edf1ee; border-radius: 6px;">
                        <div>
                          <div style="font-size: 12.5px; font-weight: 600; color: #185740;">${title}</div>
                          <div style="font-size: 11px; color: #748078;">${desc}</div>
                        </div>
                        <span class="status-badge ${isChecked ? 'badge-success' : 'badge-info'}">${isChecked ? 'Bật' : 'Tắt'}</span>
                      </div>
                    `).appendTo(optList);
                  };
                  addOptionRow('Nhận thông báo lịch mới', 'Thông báo khi có ca tập mới hoặc học viên đổi lịch', true);
                  addOptionRow('Nhắc ghi kết quả buổi học', 'Nhắc nhở cập nhật bài tập và chỉ số sau ca dạy', true);
                  addOptionRow('Hiển thị SĐT cho học viên', 'Cho phép học viên nhìn thấy số khi được phân công', Boolean(fullPt.show_phone !== false));
                  addOptionRow('Xác thực 2 lớp (2FA khi đăng nhập)', 'Yêu cầu mã OTP SMS gửi về điện thoại mỗi khi đăng nhập', Boolean(fullPt.two_factor_enabled));
                }
              }

              switchTab('overview');
            } catch (err) {
              loadIndicator.html(`<span style="color:#b5493a;">Lỗi khi tải hồ sơ: ${err.message || 'Không thể tải dữ liệu'}</span>`);
            }
          })();
        },
        toolbarItems: [
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

  async function openTrainerHandoverModal(state, pt) {
    try {
      const trainers = rows(await api().request('/pt-bookings/trainers'));
      const available = trainers.filter(t => t.id !== pt.id && t.status === 'ACTIVE');
      if (!available.length) {
        notify('Không có HLV nào khác đang hoạt động để nhận bàn giao.', 'warning');
        return;
      }

      formPopup(state, {
        title: `Bàn giao học viên & lịch tập: ${pt.full_name}`,
        width: 540,
        items: [
          readonlyField('HLV chuyển giao', `${pt.full_name} (${pt.pt_code || ''})`),
          {
            dataField: 'new_pt_id', label: { text: 'Chọn HLV tiếp nhận' },
            editorType: 'dxSelectBox',
            editorOptions: {
              dataSource: available, valueExpr: 'id',
              displayExpr: t => `${t.full_name} (${t.pt_code || ''})`,
              placeholder: 'Chọn HLV tiếp nhận'
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn HLV tiếp nhận' }]
          },
          {
            dataField: 'reason', label: { text: 'Lý do bàn giao' },
            editorType: 'dxSelectBox',
            editorOptions: {
              items: ['HLV nghỉ việc đột xuất', 'HLV chuyển công tác/chi nhánh', 'Điều phối lại học viên', 'Khác'],
              value: 'HLV nghỉ việc đột xuất'
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn lý do' }]
          }
        ],
        submit: async values => {
          await api().request(`/pt-bookings/trainers/${encodeURIComponent(pt.id)}/handover`, {
            method: 'POST',
            body: { new_pt_id: values.new_pt_id, reason: values.reason }
          });
          notify('Đã bàn giao học viên và toàn bộ lịch tập sang HLV mới thành công!');
          await loadTrainers(state);
        }
      });
    } catch (err) { notify(err.message, 'error'); }
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
      {
        dataField: 'pt_code', caption: 'Mã PT', width: 100,
        calculateCellValue: pt => pt.pt_code || pt.code,
        cellTemplate: (el, info) => $('<a href="#">').text(info.value).on('click', e => { e.preventDefault(); showTrainerDetail(state, info.data); }).appendTo(el)
      },
      {
        dataField: 'full_name', caption: 'Họ và tên', minWidth: 200, cellTemplate: (el, info) => {
          const row = $('<div>').css({ display: 'flex', gap: 10, alignItems: 'center' }).appendTo(el);
          if (info.data.avatar_url && /^https?:\/\//.test(info.data.avatar_url)) {
            $('<img class="trainer-avatar member-avatar">').attr({ src: info.data.avatar_url, alt: info.value }).css({ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #237b58' }).appendTo(row);
          } else {
            const initials = (info.value || '').trim().split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase() || 'PT';
            $('<span class="trainer-initials member-initials">').css({ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', background: '#e4f3ef', color: '#185740', borderRadius: '50%', fontWeight: 700, fontSize: 12 }).text(initials).appendTo(row);
          }
          $('<strong>').text(info.value || '--').appendTo(row);
        }
      },
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
      paging: { pageSize: 20 }, pager: { visible: true, showInfo: true, showPageSizeSelector: true, allowedPageSizes: [10, 20, 50] },
      onRowClick: event => {
        if (event.rowType === 'data' && $(event.event.target).closest('.dx-button, a').length === 0) {
          showTrainerDetail(state, event.data);
        }
      },
      columns
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
    if (state.modeView === 'list' || state.calendarView === 'day' || state.calendarView === 'Ngày') return [dayKey(date)];
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
    button(state.actions, {
      icon: 'add', text: 'Đặt lịch mới', type: 'default', stylingMode: 'contained',
      hint: 'Đặt lịch tập PT mới',
      onClick: () => {
        if (!state.trainer) {
          notify('Vui lòng chọn huấn luyện viên trước khi đặt lịch.', 'warning');
          return;
        }
        showBookingForm(state, { booking_date: dayKey(state.date || new Date()), start_time: '09:00' });
      }
    });
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
    state.communityClasses = [];
    state.status.empty(); message(state.content, 'Đang tải lịch tập...');
    try {
      const responses = await Promise.all([
        request('/pt-bookings', { pt_id: pt.id, branch_id: pt.branch_id, date_from: dates[0], date_to: dates[dates.length - 1] }),
        request('/community-classes', { instructor_id: pt.id, branch_id: pt.branch_id, date_from: dates[0], date_to: dates[dates.length - 1] }),
        ...(pt.status === 'ACTIVE' ? dates.map(date => request('/pt-bookings/available-slots', { pt_id: pt.id, date })) : [])
      ]);
      if (!alive(state) || sequence !== state.sequence) return;
      state.bookings = rows(responses[0]).filter(booking => booking.pt_id === pt.id && dates.includes(dayKey(booking.booking_date)));
      state.communityClasses = rows(responses[1]).filter(c => dates.includes(dayKey(c.class_date)));
      state.availability = new Map(dates.map((date, index) => [date, read(responses[index + 2])]));
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
  const clockFromDate = d => {
    if (!d) return '09:00';
    const dateObj = d instanceof Date ? d : new Date(d);
    return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
  };
  function calculateEndTime(startStr, durationMinutes) {
    if (!startStr) return '';
    const [h, m] = startStr.split(':').map(Number);
    const total = h * 60 + m + (durationMinutes || 60);
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  }
  function calculateDurationMinutes(start, end) {
    if (!start || !end) return 60;
    const [sh, sm] = String(start).split(':').map(Number);
    const [eh, em] = String(end).split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }
  function checkCollision(state, dateStr, startStr, endStr, excludeId = null) {
    const bookingConflict = state.bookings.some(b =>
      b.id !== excludeId &&
      activeBooking(b) &&
      dayKey(b.booking_date) === dateStr &&
      clock(b.start_time) < endStr &&
      clock(b.end_time) > startStr
    );
    const classConflict = (state.communityClasses || []).some(c =>
      c.id !== excludeId &&
      c.status !== 'CANCELLED' &&
      dayKey(c.class_date) === dateStr &&
      clock(c.start_time) < endStr &&
      clock(c.end_time) > startStr
    );
    return bookingConflict || classConflict;
  }
  function getAllAppointments(state) {
    const list = state.bookings.filter(activeBooking).map(booking => ({
      ...booking,
      id: booking.id,
      text: `${booking.member_name || ''} - ${booking.package_name || booking.package_name_snapshot || ''}`,
      startDate: appointmentTime(booking.booking_date, booking.start_time),
      endDate: appointmentTime(booking.booking_date, booking.end_time),
      is_draft: false,
      is_community_class: false
    }));

    (state.communityClasses || []).forEach(c => {
      if (c.status !== 'CANCELLED') {
        list.push({
          ...c,
          id: 'comm-' + c.id,
          class_id: c.id,
          text: `[Lớp CĐ] ${c.title || c.discipline_name || 'Lớp cộng đồng'}`,
          startDate: appointmentTime(c.class_date, c.start_time),
          endDate: appointmentTime(c.class_date, c.end_time),
          is_draft: false,
          is_community_class: true
        });
      }
    });

    if (state.draft) {
      list.push({
        ...state.draft,
        id: 'draft-booking',
        text: 'Lịch tập dự kiến',
        startDate: state.draft.startDate,
        endDate: state.draft.endDate,
        is_draft: true
      });
    }
    return list;
  }
  function refreshSchedulerAppointments(state) {
    if (state.scheduler) {
      state.scheduler.option('dataSource', getAllAppointments(state));
    }
  }
  function renderDraftFloatingBar(state) {
    state.content.find('.pt-floating-draft-bar').remove();
  }

  function appointmentContent(state, booking, parent, compact = false) {
    if (booking.is_draft) {
      const draftBox = $('<div class="pt-draft-inner">').appendTo(parent);
      $('<div class="pt-draft-handle">').html('<i class="fa-solid fa-arrows-up-down"></i> KÉO ĐỔI GIỜ').appendTo(draftBox);
      const timeRow = $('<div class="pt-draft-time">').appendTo(draftBox);

      const startStr = booking.startDate ? clockFromDate(booking.startDate) : (booking.start_time || '09:00');
      const duration = Number(booking.duration_minutes) || Number(state.draft?.duration_minutes) || 60;
      const endStr = booking.endDate ? clockFromDate(booking.endDate) : calculateEndTime(startStr, duration);

      booking.start_time = startStr;
      booking.end_time = endStr;
      if (state.draft && state.draft.id === booking.id) {
        state.draft.start_time = startStr;
        state.draft.end_time = endStr;
      }

      $('<strong>').text(`${startStr} - ${endStr}`).appendTo(timeRow);
      $('<span class="pt-duration-tag">').text(`${duration}p`).appendTo(timeRow);

      const desc = $('<div class="pt-draft-desc">').appendTo(draftBox);
      if (booking.member_name) {
        desc.text(`${booking.member_name} · ${booking.package_name || 'Gói PT'}`);
      } else {
        desc.text('Click thẻ để nhập thông tin đặt lịch');
      }

      const btnRow = $('<div class="pt-draft-btn-row">').appendTo(draftBox);
      $('<button type="button" class="pt-draft-btn-confirm">').html('<i class="fa-solid fa-check"></i> Đặt lịch').appendTo(btnRow)
        .on('click', e => { e.stopPropagation(); showBookingForm(state, booking); });
      $('<button type="button" class="pt-draft-btn-cancel">').html('<i class="fa-solid fa-xmark"></i> Hủy').appendTo(btnRow)
        .on('click', e => {
          e.stopPropagation();
          state.draft = null;
          state.content.find('.pt-floating-draft-bar').remove();
          refreshSchedulerAppointments(state);
          notify('Đã hủy lịch dự kiến.', 'info');
        });

      draftBox.css('cursor', 'pointer').on('click', e => {
        if ($(e.target).closest('button').length) return;
        showBookingForm(state, booking);
      });
      return;
    }

    if (booking.is_community_class) {
      const isDayView = state.calendarView === 'day' || state.calendarView === 'Ngày';
      const compVal = Number(booking.total_compensation || (Number(booking.base_price || 0) + Number(booking.bonus_amount || 0)));
      const enrolled = Number(booking.enrolled_slots || 0);
      const max = Number(booking.max_slots || 40);

      // BỎ BORDER-LEFT Ở ĐÂY VÌ THẺ CHA .dx-scheduler-appointment ĐÃ CÓ BORDER-LEFT 5px (CHỐNG LỖI 2 ĐƯỜNG SỌC)
      const content = $('<div class="pt-appointment-card-body pt-community-card-body" style="background: transparent; border: none; padding: 6px 12px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; color: #fff; box-sizing: border-box;">')
        .addClass(isDayView ? 'pt-view-day' : 'pt-view-week')
        .appendTo(parent);

      const topRow = $('<div style="display: flex; justify-content: space-between; align-items: center;">').appendTo(content);
      $('<div style="font-weight: 700; color: #ddd6fe; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">')
        .html('<i class="fa-solid fa-users" style="margin-right: 5px;"></i>LỚP CỘNG ĐỒNG')
        .appendTo(topRow);

      const topActions = $('<div style="display: flex; align-items: center; gap: 8px;">').appendTo(topRow);
      $('<span style="background: rgba(255,255,255,0.22); color: #fff; font-size: 10.5px; font-weight: 600; padding: 2px 7px; border-radius: 4px; font-family: Manrope, monospace;">')
        .text(`${enrolled}/${max} HV`)
        .appendTo(topActions);

      // NÚT XEM DANH SÁCH HỘI VIÊN NỔI BẬT TRÊN THẺ LỊCH
      const memberBtnText = isDayView ? '<i class="fa-solid fa-list-check"></i> Xem danh sách hội viên' : '<i class="fa-solid fa-list-check"></i> DS HV';
      $('<button type="button" class="pt-btn-community-members" title="Xem danh sách hội viên đã đăng ký lớp học này">')
        .html(memberBtnText)
        .appendTo(topActions)
        .on('click', e => {
          e.preventDefault();
          e.stopPropagation();
          openCommunityClassDetailModal(state, booking);
        });

      $('<div style="font-weight: 700; color: #ffffff; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 3px 0;">')
        .text(booking.title || 'Lớp tập nhóm')
        .attr('title', booking.title || '')
        .appendTo(content);

      const botRow = $('<div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #c4b5fd;">').appendTo(content);
      $('<span>').html(`<i class="fa-regular fa-clock" style="margin-right: 4px;"></i><strong>${clock(booking.start_time)} - ${clock(booking.end_time)}</strong>`).appendTo(botRow);
      $('<strong style="color: #fbbf24; font-family: Manrope, sans-serif;">').text((compVal || 0).toLocaleString('vi-VN') + ' đ').appendTo(botRow);

      content.css('cursor', 'pointer').on('click', e => {
        e.stopPropagation();
        openCommunityClassDetailModal(state, booking);
      });
      return;
    }

    const isEnded = ended(booking);
    const durationMin = booking.session_duration_minutes || calculateDurationMinutes(booking.start_time, booking.end_time);
    const isDayView = state.calendarView === 'day' || state.calendarView === 'Ngày';
    const content = $('<div class="pt-appointment-card-body">')
      .addClass(isDayView ? 'pt-view-day' : 'pt-view-week')
      .appendTo(parent);

    if (isDayView) {
      // --- BỐ CỤC CHẾ ĐỘ NGÀY (DAY VIEW): 2 HÀNG RỘNG RÃI, THOÁNG ĐẸP, TUYỆT ĐỐI KHÔNG CHỒNG ĐÈ ---
      const topRow = $('<div class="pt-day-top-row">').appendTo(content);
      const topLeft = $('<div class="pt-day-top-left">').appendTo(topRow);

      $('<div class="pt-card-time">')
        .html(`<i class="fa-regular fa-clock" style="margin-right: 5px;"></i><strong>${clock(booking.start_time)} - ${clock(booking.end_time)}</strong> <span class="pt-card-dur-tag">${durationMin}p</span>`)
        .appendTo(topLeft);

      $('<span class="pt-card-status-pill">')
        .text(BOOKING_STATUS[booking.status] || booking.status || 'Đã đặt')
        .appendTo(topLeft);

      const topRight = $('<div class="pt-day-top-right">').appendTo(topRow);

      if (booking.status === 'BOOKED') {
        $('<button type="button" class="pt-btn-card-complete">')
          .addClass(isEnded ? 'is-ended' : 'is-waiting')
          .html('<i class="fa-solid fa-check"></i> Xác nhận hoàn thành')
          .attr('title', isEnded ? 'Xác nhận hoàn thành buổi tập (QTV-W06-US03)' : `Buổi tập chưa kết thúc (sau ${clock(booking.end_time)} mới có thể xác nhận)`)
          .appendTo(topRight)
          .on('click', e => {
            e.preventDefault(); e.stopPropagation();
            if (!isEnded) {
              notify(`Buổi tập chưa kết thúc (kết thúc lúc ${clock(booking.end_time)}). Chưa thể xác nhận hoàn thành.`, 'warning');
              return;
            }
            confirmBookingCompletion(state, booking);
          });

        $('<button type="button" class="pt-btn-card-cancel">')
          .html('<i class="fa-solid fa-xmark"></i> Hủy lịch')
          .attr('title', 'Hủy lịch PT này (QTV-W06-US04 / LT-W06-US04)')
          .appendTo(topRight)
          .on('click', e => {
            e.preventDefault(); e.stopPropagation();
            showCancellation(state, booking);
          });
      }

      // Hàng 2: Tên hội viên & Gói tập rõ ràng, nổi bật
      const bottomRow = $('<div class="pt-day-bottom-row">').appendTo(content);
      $('<strong class="pt-card-member-name">')
        .html(`<i class="fa-regular fa-user" style="margin-right: 5px; opacity: 0.85;"></i>${booking.member_name || '--'}`)
        .appendTo(bottomRow);
      $('<span class="pt-card-divider">').text('·').appendTo(bottomRow);
      $('<span class="pt-card-pkg-name">')
        .text([booking.member_code, booking.package_name || booking.package_name_snapshot].filter(Boolean).join(' - '))
        .appendTo(bottomRow);

    } else {
      // --- BỐ CỤC CHẾ ĐỘ TUẦN (WEEK VIEW): PHÂN BỔ ĐỀU CÁC HÀNG CÂN ĐỐI ---
      const headerRow = $('<div class="pt-week-header-row">').appendTo(content);
      $('<div class="pt-card-time">')
        .html(`<i class="fa-regular fa-clock" style="margin-right: 3px;"></i>${clock(booking.start_time)}-${clock(booking.end_time)}`)
        .appendTo(headerRow);

      if (booking.status === 'BOOKED') {
        $('<button type="button" class="pt-btn-card-cancel-mini">')
          .html('<i class="fa-solid fa-xmark"></i>')
          .attr('title', 'Hủy lịch PT')
          .appendTo(headerRow)
          .on('click', e => {
            e.preventDefault(); e.stopPropagation();
            showCancellation(state, booking);
          });
      }

      $('<strong class="pt-card-member-name">')
        .text(booking.member_name || '--')
        .attr('title', booking.member_name || '')
        .appendTo(content);

      const packageLabel = [booking.member_code, booking.package_name || booking.package_name_snapshot].filter(Boolean).join(' · ');
      $('<div class="pt-card-pkg-name">')
        .text(packageLabel)
        .attr('title', packageLabel)
        .appendTo(content);

      const footerRow = $('<div class="pt-week-footer-row">').appendTo(content);
      $('<span class="pt-card-status-pill">')
        .text(BOOKING_STATUS[booking.status] || booking.status || 'Đã đặt')
        .appendTo(footerRow);

      if (booking.status === 'BOOKED') {
        $('<button type="button" class="pt-btn-card-complete-mini">')
          .addClass(isEnded ? 'is-ended' : 'is-waiting')
          .html('<i class="fa-solid fa-check"></i>')
          .attr('title', isEnded ? 'Xác nhận hoàn thành buổi tập' : `Buổi tập chưa kết thúc (sau ${clock(booking.end_time)} mới có thể xác nhận)`)
          .appendTo(footerRow)
          .on('click', e => {
            e.preventDefault(); e.stopPropagation();
            if (!isEnded) {
              notify(`Buổi tập chưa kết thúc (kết thúc lúc ${clock(booking.end_time)}).`, 'warning');
              return;
            }
            confirmBookingCompletion(state, booking);
          });
      }
    }
  }

  function renderCalendar(state) {
    const appointments = getAllAppointments(state);
    state.scheduler = $('<div id="ptScheduler">').appendTo($('<div class="card-panel" style="position:relative;min-height:780px;">').appendTo(state.content)).dxScheduler({
      dataSource: appointments,
      views: [
        { type: 'day', name: 'Ngày', intervalCount: 1, cellDuration: 15 },
        { type: 'workWeek', name: 'Tuần (T2-T6)', cellDuration: 15 },
        { type: 'week', name: 'Toàn tuần', cellDuration: 15 }
      ],
      currentView: state.calendarView,
      currentDate: state.date,
      firstDayOfWeek: 1,
      startDayHour: 6,
      endDayHour: 22,
      cellDuration: 15, // 15 phút mỗi ô lưới
      showAllDayPanel: false,
      height: 750,
      editing: {
        allowAdding: false,
        allowDeleting: false,
        allowDragging: true, // KÉO THẢ THẺ LỊCH TẬP
        allowResizing: true, // KÉO VIỀN TRÊN / VIỀN DƯỚI ĐIỀU CHỈNH THỜI LƯỢNG
        allowUpdating: true
      },
      showCurrentTimeIndicator: true,
      onAppointmentFormOpening: event => { event.cancel = true; },
      onAppointmentDblClick: event => { event.cancel = true; },
      onAppointmentClick: event => {
        event.cancel = true;
        if (event.appointmentData.is_draft) {
          showBookingForm(state, event.appointmentData);
        } else if (event.appointmentData.is_community_class) {
          // Handled inside appointment card click template
        } else {
          showBookingDetail(state, event.appointmentData);
        }
      },
      onAppointmentRendered: event => {
        const item = event.appointmentData;
        const el = $(event.appointmentElement);
        if (item.is_draft) {
          el.addClass('pt-draft-appointment');
        } else if (item.is_community_class) {
          el.addClass('pt-appointment-community');
          el.css({
            'background': 'linear-gradient(135deg, #2e1065 0%, #4c1d95 100%)',
            'background-color': '#4c1d95',
            'border-left': '5px solid #a78bfa',
            'border-radius': '6px',
            'box-shadow': '0 2px 8px rgba(76, 29, 149, 0.4)'
          });
        } else if (item.status) {
          const statusKey = String(item.status).toLowerCase();
          el.addClass(`pt-appointment-${statusKey}`);

          // Directly apply inline styles to guarantee status color themes
          if (statusKey === 'booked') {
            el.css({
              'background': '#1e40af',
              'background-color': '#1e40af',
              'border-left': '5px solid #60a5fa',
              'border-radius': '6px',
              'box-shadow': '0 2px 8px rgba(30, 64, 175, 0.4)'
            });
          } else if (['awaiting_confirmation', 'pending_completion'].includes(statusKey)) {
            el.css({
              'background': '#b45309',
              'background-color': '#b45309',
              'border-left': '5px solid #fbbf24',
              'border-radius': '6px',
              'box-shadow': '0 2px 8px rgba(180, 83, 9, 0.4)'
            });
          } else if (statusKey === 'completed') {
            el.css({
              'background': '#047857',
              'background-color': '#047857',
              'border-left': '5px solid #34d399',
              'border-radius': '6px',
              'box-shadow': '0 2px 8px rgba(4, 120, 87, 0.4)'
            });
          } else if (statusKey === 'cancelled') {
            el.css({
              'background': '#475569',
              'background-color': '#475569',
              'border-left': '5px solid #94a3b8',
              'border-radius': '6px',
              'opacity': '0.75'
            });
          } else if (statusKey === 'no_show') {
            el.css({
              'background': '#991b1b',
              'background-color': '#991b1b',
              'border-left': '5px solid #f87171',
              'border-radius': '6px'
            });
          }
        }
      },
      onAppointmentUpdating: event => {
        const item = event.oldData || event.appointmentData;
        if (!item?.is_draft) {
          event.cancel = true;
          notify('Chỉ thẻ lịch tập dự kiến mới có thể kéo đổi giờ và điều chỉnh thời lượng.', 'warning');
          return;
        }

        const oldStart = new Date(item.startDate);
        const oldEnd = new Date(item.endDate);
        let newStart = new Date(event.newData?.startDate || item.startDate);
        let newEnd = new Date(event.newData?.endDate || item.endDate);

        const oldDur = Math.max(15, Math.round((oldEnd.getTime() - oldStart.getTime()) / 60000));
        let newDur = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);

        const isResizeTop = Math.abs(newEnd.getTime() - oldEnd.getTime()) < 60000 && Math.abs(newStart.getTime() - oldStart.getTime()) >= 60000;
        const isResizeBottom = Math.abs(newStart.getTime() - oldStart.getTime()) < 60000 && Math.abs(newEnd.getTime() - oldEnd.getTime()) >= 60000;
        const isMove = !isResizeTop && !isResizeBottom;

        const maxDuration = Number(state.draft?.package_duration) || Number(item.package_duration) || Number(item.duration_minutes) || 180;
        const minDuration = 15;

        if (isResizeBottom || isResizeTop) {
          if (newDur < minDuration) {
            newDur = minDuration;
            if (isResizeBottom) newEnd = new Date(newStart.getTime() + minDuration * 60000);
            else newStart = new Date(newEnd.getTime() - minDuration * 60000);
          } else if (newDur > maxDuration) {
            newDur = maxDuration;
            if (isResizeBottom) newEnd = new Date(newStart.getTime() + maxDuration * 60000);
            else newStart = new Date(newEnd.getTime() - maxDuration * 60000);
          }
        } else if (isMove) {
          // Khi di chuyển cả thẻ, bảo toàn thời lượng đã điều chỉnh
          newEnd = new Date(newStart.getTime() + oldDur * 60000);
          newDur = oldDur;
        }

        if (event.newData) {
          event.newData.startDate = newStart;
          event.newData.endDate = newEnd;
        }

        const newDateStr = dayKey(newStart);
        const newStartStr = clockFromDate(newStart);
        const newEndStr = clockFromDate(newEnd);

        // 1. Kiểm tra thời điểm trong quá khứ
        if (newStart.getTime() <= Date.now()) {
          event.cancel = true;
          notify('Không thể dời lịch tập về thời điểm trong quá khứ.', 'warning');
          setTimeout(() => {
            refreshSchedulerAppointments(state);
            renderDraftFloatingBar(state);
          }, 0);
          return;
        }

        // 2. Kiểm tra ngày làm việc HLV
        const dayOfWeek = newStart.getDay();
        if (state.trainer?.work_days === 'MON_TO_FRI' && (dayOfWeek === 0 || dayOfWeek === 6)) {
          event.cancel = true;
          notify('HLV chỉ làm việc từ Thứ 2 đến Thứ 6.', 'warning');
          setTimeout(() => {
            refreshSchedulerAppointments(state);
            renderDraftFloatingBar(state);
          }, 0);
          return;
        }

        // 3. Khung giờ hoạt động 06:00 - 22:00
        if (newStartStr < '06:00' || newEndStr > '22:00') {
          event.cancel = true;
          notify('Thời gian tập phải nằm trong khung giờ hoạt động (06:00 - 22:00).', 'warning');
          setTimeout(() => {
            refreshSchedulerAppointments(state);
            renderDraftFloatingBar(state);
          }, 0);
          return;
        }

        // 4. KIỂM TRA VA CHẠM (COLLISION) - Trùng thẻ đã có từ trước -> HỦY BỎ và QUAY VỀ VỊ TRÍ CŨ
        const hasCollision = checkCollision(state, newDateStr, newStartStr, newEndStr, item.id);
        if (hasCollision) {
          event.cancel = true;
          notify(`⚠️ Khung giờ ${newStartStr} - ${newEndStr} đã có lịch đặt từ trước. Thẻ lịch tự động quay về vị trí cũ!`, 'warning');
          setTimeout(() => {
            refreshSchedulerAppointments(state);
            renderDraftFloatingBar(state);
          }, 0);
          return;
        }

        if (event.newData) {
          event.newData.startDate = newStart;
          event.newData.endDate = newEnd;
        }

        if (state.draft) {
          state.draft.startDate = newStart;
          state.draft.endDate = newEnd;
          state.draft.booking_date = newDateStr;
          state.draft.start_time = newStartStr;
          state.draft.end_time = newEndStr;
          state.draft.duration_minutes = newDur;
        }
      },
      onAppointmentUpdated: event => {
        const item = event.appointmentData || event.newData || state.draft;
        if (!item || !item.is_draft) return;

        const newStart = new Date(item.startDate);
        const newEnd = new Date(item.endDate);
        const duration = Math.max(15, Math.round((newEnd.getTime() - newStart.getTime()) / 60000));

        const newDateStr = dayKey(newStart);
        const newStartStr = clockFromDate(newStart);
        const newEndStr = clockFromDate(newEnd);

        // Safeguard va chạm
        const hasCollision = checkCollision(state, newDateStr, newStartStr, newEndStr, item.id);
        if (hasCollision) {
          refreshSchedulerAppointments(state);
          return;
        }

        if (state.draft) {
          state.draft.startDate = newStart;
          state.draft.endDate = newEnd;
          state.draft.booking_date = newDateStr;
          state.draft.start_time = newStartStr;
          state.draft.end_time = newEndStr;
          state.draft.duration_minutes = duration;
        }

        const maxDur = Number(state.draft?.package_duration) || duration;
        const shortenNote = duration < maxDur ? ` (Rút ngắn từ gói ${maxDur}p · Vẫn tính 1 buổi)` : '';
        notify(`⏰ Đã điều chỉnh lịch tập: ${newStartStr} - ${newEndStr} (${duration} phút${shortenNote})`, 'success');

        renderDraftFloatingBar(state);

        if (state.activeBookingForm) {
          state.activeBookingForm.updateData('date', dayDate(newDateStr));
          state.activeBookingForm.updateData('start_time', newStartStr);
          state.activeBookingForm.updateData('end_time', newEndStr);
          state.activeBookingForm.updateData('duration_minutes', duration);
          state.activeBookingForm.updateData('duration_display', `${duration} phút${shortenNote}`);
        }

        setTimeout(() => {
          refreshSchedulerAppointments(state);
        }, 0);
      },
      onCellClick: event => {
        event.cancel = true;
        const clickedStart = new Date(event.cellData.startDate);
        const dateStr = dayKey(clickedStart);
        const startStr = clockFromDate(clickedStart);

        if (clickedStart.getTime() <= Date.now()) {
          notify('Không thể đặt lịch ở thời điểm trong quá khứ.', 'warning');
          return;
        }
        const dayOfWeek = clickedStart.getDay();
        if (state.trainer?.work_days === 'MON_TO_FRI' && (dayOfWeek === 0 || dayOfWeek === 6)) {
          notify('HLV chỉ làm việc từ Thứ 2 đến Thứ 6.', 'warning');
          return;
        }

        // Nếu đã có thẻ dự kiến với gói tập đã chọn sẵn -> Di chuyển thẻ đó tới ô mới click
        if (state.draft && state.draft.registration_id) {
          const duration = Number(state.draft.duration_minutes) || 60;
          const clickedEnd = new Date(clickedStart.getTime() + duration * 60000);
          const endStr = clockFromDate(clickedEnd);

          if (startStr < '06:00' || endStr > '22:00') {
            notify('Thời gian tập phải nằm trong khung giờ hoạt động (06:00 - 22:00).', 'warning');
            return;
          }

          const hasCollision = checkCollision(state, dateStr, startStr, endStr, state.draft.id);
          if (hasCollision) {
            notify(`⚠️ Khung giờ ${startStr} - ${endStr} đã có lịch đặt từ trước. Không thể di chuyển thẻ vào khung giờ này!`, 'warning');
            return;
          }

          state.draft.startDate = clickedStart;
          state.draft.endDate = clickedEnd;
          state.draft.booking_date = dateStr;
          state.draft.start_time = startStr;
          state.draft.end_time = endStr;

          const maxDur = Number(state.draft?.package_duration) || duration;
          const shortenNote = duration < maxDur ? ` (Rút ngắn từ gói ${maxDur}p · Vẫn tính 1 buổi)` : '';
          notify(`⏰ Đã điều chỉnh giờ bắt đầu: ${startStr} - ${endStr} (${duration} phút${shortenNote})`, 'success');

          refreshSchedulerAppointments(state);
          renderDraftFloatingBar(state);
          return;
        }

        // Nếu chưa có thẻ dự kiến: kiểm tra xem ô click có bị trùng lịch từ trước không
        const defaultEndStr = calculateEndTime(startStr, 60);
        if (checkCollision(state, dateStr, startStr, defaultEndStr)) {
          notify(`⚠️ Khung giờ này đã có lịch đặt từ trước của HLV. Vui lòng chọn khung giờ còn trống.`, 'warning');
          return;
        }

        // Nếu chưa chọn gói: mở modal để chọn Hội viên & Gói PT trước, với giờ dự kiến là ô vừa click!
        showBookingForm(state, {
          booking_date: dateStr,
          start_time: startStr
        });
      },
      timeCellTemplate: (cell, index, element) => {
        $(element).css({ verticalAlign: 'middle', padding: 0, position: 'relative' });
        const h = String(cell.date.getHours()).padStart(2, '0');
        const m = String(cell.date.getMinutes()).padStart(2, '0');

        const labelDiv = $('<div class="pt-time-panel-label">').appendTo(element);

        if (m === '00') {
          $('<span style="font-weight: 700; color: #1e293b; font-size: 12px; padding: 0 4px; border-radius: 3px;">')
            .text(`${h}:00`)
            .appendTo(labelDiv);
        } else {
          $('<span style="font-size: 10.5px; font-weight: 500; color: #64748b; padding: 0 4px; border-radius: 3px;">')
            .text(`${h}:${m}`)
            .appendTo(labelDiv);
        }
      },
      dataCellTemplate: (cell, _, element) => {
        $(element).css({ cursor: 'pointer' });
      },
      appointmentTemplate: (data, _, element) => appointmentContent(state, data.appointmentData, element),
      onOptionChanged: event => {
        if (!alive(state)) return;
        if (event.name === 'currentDate' && dayKey(event.value) !== dayKey(state.date)) {
          state.date = dayDate(event.value); state.datePicker.option('value', state.date); loadSchedule(state);
        }
        if (event.name === 'currentView') {
          const view = event.value;
          const normalized = (view === 'Ngày' || view === 'day') ? 'day' : view;
          if (state.calendarView !== normalized) { state.calendarView = normalized; loadSchedule(state); }
        }
      }
    }).dxScheduler('instance');

    renderDraftFloatingBar(state);

    if (!state.bookings.length && !state.draft) {
      $('<p class="pt-calendar-summary">').text('Chưa có lịch tập trong thời gian đã chọn. Click vào ô giờ bất kỳ để tạo thẻ đặt lịch.').appendTo(state.content);
    }
  }

  function renderSlotList(state) {
    const date = dayKey(state.date);
    const dayBookings = state.bookings.filter(booking => dayKey(booking.booking_date) === date && activeBooking(booking));
    dayBookings.sort((a, b) => clock(a.start_time).localeCompare(clock(b.start_time)));

    const panel = $('<div class="card-panel">').appendTo(state.content);
    const headerRow = $('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">').appendTo(panel);
    $('<h4 style="margin:0;font-size:15px;color:#185740;">').text(`Danh sách lịch tập ngày ${dayDate(date).toLocaleDateString('vi-VN')} (${dayBookings.length} buổi)`).appendTo(headerRow);
    button(headerRow, {
      icon: 'add', text: 'Đặt lịch mới ngày này', type: 'default', stylingMode: 'contained',
      onClick: () => {
        showBookingForm(state, { booking_date: date, start_time: '09:00' });
      }
    });

    $('<div id="ptSlotList">').appendTo(panel).dxDataGrid({
      dataSource: dayBookings, keyExpr: 'id', showBorders: false, showRowLines: true, wordWrapEnabled: true,
      noDataText: 'Chưa có lịch tập nào trong ngày này.', columnAutoWidth: true, rowAlternationEnabled: true,
      columns: [
        { caption: 'Khung giờ', width: 145, calculateCellValue: b => `${clock(b.start_time)} - ${clock(b.end_time)}` },
        { caption: 'Thời lượng', width: 110, calculateCellValue: b => `${b.session_duration_minutes || calculateDurationMinutes(b.start_time, b.end_time)} phút` },
        { dataField: 'member_name', caption: 'Hội viên', minWidth: 180, cellTemplate: (cell, info) => {
          $('<strong>').text(info.value || '--').appendTo(cell);
          if (info.data.member_code) $('<div>').text(info.data.member_code).appendTo(cell);
        } },
        { dataField: 'package_name', caption: 'Gói PT sử dụng', minWidth: 180, calculateCellValue: b => b.package_name || b.package_name_snapshot || '--' },
        { dataField: 'status', caption: 'Trạng thái', width: 155, cellTemplate: (cell, info) => badge(cell, info.value) },
        { caption: 'Thao tác', width: 220, cellTemplate: (cell, info) => {
          const booking = info.data;
          const actions = $('<div>').css({ display: 'flex', gap: 6, flexWrap: 'wrap' }).appendTo(cell);
          button(actions, { icon: 'find', hint: 'Chi tiết buổi tập', onClick: () => showBookingDetail(state, booking) });
          if (booking.status === 'BOOKED') {
            button(actions, { icon: 'close', text: 'Hủy lịch', type: 'danger', stylingMode: 'contained', onClick: () => showCancellation(state, booking) });
            button(actions, { icon: 'check', text: 'Xác nhận hoàn thành', type: 'default', stylingMode: 'contained', disabled: !ended(booking), onClick: () => confirmBookingCompletion(state, booking) });
          }
        } }
      ]
    });

    const cancelled = state.bookings.filter(booking => dayKey(booking.booking_date) === date && !activeBooking(booking));
    if (cancelled.length) {
      $('<h4 style="margin:20px 0 10px;color:#991b1b;font-size:14px;">').text('Lịch đã hủy / Vắng mặt').appendTo(panel);
      $('<div>').appendTo(panel).dxDataGrid({
        dataSource: cancelled, keyExpr: 'id', showRowLines: true, wordWrapEnabled: true, paging: { enabled: false },
        columns: [
          { caption: 'Khung giờ', width: 145, calculateCellValue: booking => `${clock(booking.start_time)} - ${clock(booking.end_time)}` },
          { dataField: 'member_name', caption: 'Hội viên' },
          { dataField: 'package_name', caption: 'Gói PT' },
          { dataField: 'status', caption: 'Trạng thái', cellTemplate: (cell, info) => badge(cell, info.value) },
          { type: 'buttons', buttons: [{ icon: 'find', hint: 'Chi tiết buổi tập', onClick: event => showBookingDetail(state, event.row.data) }] }
        ]
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
      ['PT', 'PT_SESSION', 'PT_SESSIONS', 'COMBO', 'COMBO_GYM_PT'].includes(type) &&
      reg.status === 'ACTIVE' && !reg.is_frozen && Number(reg.remaining_pt_sessions) > 0 &&
      (!start || dayKey(start) <= date) && (!end || dayKey(end) >= date) &&
      (!allowed || !allowed.length || allowed.includes(pt.branch_id));
  }
  function generateStartTimeSlots(stepMinutes = 15, startHour = 6, endHour = 21, endMinute = 45) {
    const slots = [];
    let currentTotal = startHour * 60;
    const maxTotal = endHour * 60 + endMinute;
    while (currentTotal <= maxTotal) {
      const h = Math.floor(currentTotal / 60);
      const m = currentTotal % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push({ id: timeStr, text: timeStr });
      currentTotal += stepMinutes;
    }
    return slots;
  }
  function generateEndTimeSlots(startStr, maxMinutes = 180) {
    if (!startStr) return [];
    const [sh, sm] = String(startStr).split(':').map(Number);
    const startTotal = sh * 60 + sm;
    const slots = [];
    const step = 15;
    const minMinutes = 15;
    const effectiveMax = Math.max(Number(maxMinutes) || 60, minMinutes);
    const maxTotal = Math.min(22 * 60, startTotal + effectiveMax);
    for (let t = startTotal + minMinutes; t <= maxTotal; t += step) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const dur = t - startTotal;
      slots.push({ id: timeStr, text: `${timeStr} (${dur} phút)`, duration: dur });
    }
    return slots;
  }

  function canBook(state, date, slotOrStart) {
    if (!state.trainer || state.trainer.status !== 'ACTIVE') return false;
    const dateStr = dayKey(date);
    const startStr = typeof slotOrStart === 'object' && slotOrStart !== null ? slotOrStart.start_time : slotOrStart;
    if (!startStr) return true;
    if (appointmentTime(dateStr, startStr).getTime() <= Date.now()) return false;
    const dur = typeof slotOrStart === 'object' && slotOrStart?.duration_minutes ? slotOrStart.duration_minutes : 60;
    const endStr = typeof slotOrStart === 'object' && slotOrStart?.end_time ? slotOrStart.end_time : calculateEndTime(startStr, dur);
    return !checkCollision(state, dateStr, startStr, endStr);
  }


  function showQuickBooking(state) {
    if (!state.trainer) {
      notify('Vui lòng chọn huấn luyện viên trước khi đặt lịch.', 'warning');
      return;
    }
    showBookingForm(state, { booking_date: dayKey(state.date || new Date()), start_time: '09:00' });
  }

  function showBookingForm(state, draftOrDate, maybeSlot) {
    const pt = state.trainer;
    if (!pt) {
      notify('Vui lòng chọn huấn luyện viên trước khi đặt lịch.', 'warning');
      return;
    }

    let initialDateStr = dayKey(state.date);
    let initialStart = '09:00';
    let initialDuration = null;
    let initialPackageDuration = null;
    let initialDurationDisplay = '';
    let initialEnd = '';
    let initialMemberId = null;
    let initialRegId = null;
    let initialMemberName = '';
    let initialPackageName = '';
    let initialNotes = '';

    if (draftOrDate && typeof draftOrDate === 'object' && !(draftOrDate instanceof Date)) {
      initialDateStr = dayKey(draftOrDate.booking_date || state.date);
      initialStart = draftOrDate.start_time ? clock(draftOrDate.start_time) : '09:00';
      initialDuration = draftOrDate.duration_minutes ? Number(draftOrDate.duration_minutes) : null;
      initialPackageDuration = draftOrDate.package_duration ? Number(draftOrDate.package_duration) : (initialDuration || null);
      initialMemberId = draftOrDate.member_id || null;
      initialRegId = draftOrDate.registration_id || null;
      initialMemberName = draftOrDate.member_name || '';
      initialPackageName = draftOrDate.package_name || '';
      initialNotes = draftOrDate.notes || '';
      if (initialDuration) {
        initialEnd = draftOrDate.end_time || calculateEndTime(initialStart, initialDuration);
        const pkgDur = initialPackageDuration || initialDuration;
        if (initialDuration < pkgDur) {
          initialDurationDisplay = `${initialDuration} phút (Rút ngắn từ gói ${pkgDur}p · Vẫn tính 1 buổi)`;
        } else {
          initialDurationDisplay = `${initialDuration} phút (Theo cấu hình gói đã chọn)`;
        }
      }
    } else if (draftOrDate) {
      initialDateStr = dayKey(draftOrDate);
      if (maybeSlot) {
        initialStart = clock(maybeSlot.start_time || '09:00');
        initialDuration = maybeSlot.session_duration_minutes ? Number(maybeSlot.session_duration_minutes) : null;
        initialPackageDuration = initialDuration;
        if (initialDuration) {
          initialDurationDisplay = `${initialDuration} phút (Theo cấu hình gói đã chọn)`;
          initialEnd = calculateEndTime(initialStart, initialDuration);
        }
      }
    }

    let registrationLoad = 0;
    let registrations = [];
    let closed = false;
    let modal;
    let calendarDragButton = null;

    const timeSlots = generateStartTimeSlots();
    const initialEndSlots = initialStart ? generateEndTimeSlots(initialStart, initialPackageDuration || initialDuration || 180) : [];

    const loadRegistrations = async (memberId, form) => {
      const sequence = ++registrationLoad;
      registrations = [];
      form.updateData('registration_id', null);
      form.updateData('duration_minutes', null);
      form.updateData('package_duration', null);
      form.updateData('duration_display', '');
      form.updateData('end_time', '');

      const endEditor = form.getEditor('end_time');
      if (endEditor) {
        endEditor.option({ dataSource: [], disabled: true, placeholder: 'Chọn gói PT trước' });
      }

      if (calendarDragButton) calendarDragButton.option('disabled', true);

      const editor = form.getEditor('registration_id');
      editor.option({ dataSource: [], disabled: true, placeholder: memberId ? 'Đang tải gói PT...' : 'Chọn hội viên trước' });
      if (!memberId) return;
      try {
        const response = await request('/registrations', { member_id: memberId });
        if (closed || sequence !== registrationLoad) return;
        const targetDate = dayKey(form.option('formData').date || initialDateStr);
        registrations = rows(response).filter(reg => eligibleRegistration(reg, memberId, pt, targetDate));
        editor.option({
          dataSource: registrations,
          disabled: false,
          placeholder: registrations.length ? 'Chọn gói PT' : 'Không có gói PT hợp lệ',
          noDataText: 'Hội viên không có gói PT nào do HLV này phụ trách còn hiệu lực.'
        });
        modal.errorBox.empty();

        if (registrations.length === 0) {
          form.updateData('duration_display', 'Hội viên chưa có gói PT khả dụng với HLV này');
        }

        if (initialRegId && registrations.some(r => r.id === initialRegId)) {
          form.updateData('registration_id', initialRegId);
          const reg = registrations.find(r => r.id === initialRegId);
          if (reg) {
            const pkgDur = Number(reg.session_duration_minutes) || 60;
            const actualDur = initialDuration || pkgDur;
            const curStart = form.option('formData').start_time || initialStart;
            const curEnd = initialEnd || calculateEndTime(curStart, actualDur);
            const slots = generateEndTimeSlots(curStart, pkgDur);

            form.updateData('package_duration', pkgDur);
            form.updateData('duration_minutes', actualDur);
            if (actualDur < pkgDur) {
              form.updateData('duration_display', `${actualDur} phút (Rút ngắn từ gói ${pkgDur}p · Vẫn tính 1 buổi)`);
            } else {
              form.updateData('duration_display', `${actualDur} phút (Theo cấu hình gói đã chọn)`);
            }

            if (endEditor) {
              endEditor.option({ dataSource: slots, disabled: false, placeholder: 'Chọn hoặc giữ giờ kết thúc được gợi ý' });
            }
            form.updateData('end_time', curEnd);
            if (calendarDragButton) calendarDragButton.option('disabled', false);
          }
        }
      } catch (error) {
        if (!closed && sequence === registrationLoad) {
          editor.option({ disabled: true, placeholder: 'Không tải được gói PT' });
          showError(modal.errorBox, error, () => loadRegistrations(memberId, form));
        }
      }
    };

    modal = formPopup(state, {
      title: 'Đặt lịch PT mới',
      width: 620,
      data: {
        pt_id: pt.id,
        member_id: initialMemberId || state.context.member_id || null,
        registration_id: initialRegId,
        package_duration: initialPackageDuration || initialDuration,
        duration_minutes: initialDuration,
        duration_display: initialDurationDisplay,
        date: dayDate(initialDateStr),
        start_time: initialStart,
        end_time: initialEnd,
        notes: initialNotes
      },
      submitText: 'Xác nhận đặt lịch',
      submitIcon: 'check',
      extraButtons: [
        {
          widget: 'dxButton',
          toolbar: 'bottom',
          location: 'before',
          options: {
            text: 'Kéo chọn giờ trên Calendar',
            icon: 'event',
            type: 'default',
            stylingMode: 'outlined',
            disabled: !initialRegId,
            onInitialized: event => { calendarDragButton = event.component; },
            onClick: () => {
              const data = modal.form.option('formData');
              if (!data.member_id || !data.registration_id) {
                notify('Vui lòng chọn Hội viên và Gói PT trước khi kéo chọn trên lịch.', 'warning');
                return;
              }
              const reg = registrations.find(r => r.id === data.registration_id);
              const pkgDur = Number(reg?.session_duration_minutes) || 60;
              const dateStr = dayKey(data.date || initialDateStr);
              const startStr = data.start_time ? clock(data.start_time) : (initialStart || '09:00');
              const endStr = data.end_time ? clock(data.end_time) : calculateEndTime(startStr, pkgDur);
              const dur = Math.max(15, calculateDurationMinutes(startStr, endStr) || pkgDur);

              const memberEditor = modal.form.getEditor('member_id');
              const memberDisplay = memberEditor?.option('displayValue') || '';
              const memberName = memberDisplay.includes(' - ') ? memberDisplay.split(' - ').slice(1).join(' - ') : memberDisplay;

              modal.popup.hide();

              state.draft = {
                id: 'draft-booking',
                is_draft: true,
                pt_id: pt.id,
                booking_date: dateStr,
                start_time: startStr,
                end_time: endStr,
                duration_minutes: dur,
                package_duration: pkgDur,
                startDate: appointmentTime(dateStr, startStr),
                endDate: appointmentTime(dateStr, endStr),
                member_id: data.member_id,
                member_name: memberName || initialMemberName || 'Hội viên',
                registration_id: data.registration_id,
                package_name: reg?.package_name_snapshot || reg?.package_name || 'Gói PT',
                notes: data.notes || ''
              };

              if (dayKey(state.date) !== dateStr) {
                state.date = dayDate(dateStr);
                if (state.datePicker) state.datePicker.option('value', state.date);
                loadSchedule(state);
              } else {
                refreshSchedulerAppointments(state);
                renderDraftFloatingBar(state);
              }

              notify(`Đã kích hoạt thẻ đặt lịch ${dur} phút cho gói "${reg?.package_name_snapshot || reg?.package_name}". Bạn có thể kéo thẻ hoặc rê chuột vào viền trên/dưới để chỉnh giờ!`, 'info');
            }
          }
        }
      ],
      items: [
        readonlyField('PT phụ trách', trainerLabel(pt)),
        readonlyField('Chi nhánh phục vụ', pt.branch_name || '--'),
        field('member_id', 'Hội viên *', true, 'dxSelectBox', {
          dataSource: { store: memberSource(pt.branch_id), paginate: true, pageSize: 20 },
          valueExpr: 'id', displayExpr: memberLabel,
          searchEnabled: true, minSearchLength: 0, searchExpr: ['phone', 'full_name', 'member_code'], searchTimeout: 300,
          placeholder: 'Tìm theo SĐT, họ tên hoặc mã hội viên', showClearButton: true, noDataText: 'Không tìm thấy hội viên'
        }),
        field('registration_id', 'Gói PT sử dụng *', true, 'dxSelectBox', {
          dataSource: [], valueExpr: 'id',
          displayExpr: reg => reg ? `${reg.registration_code || reg.reg_code || ''} - ${reg.package_name_snapshot || reg.package_name || ''} (${reg.remaining_pt_sessions} buổi còn lại · ${reg.session_duration_minutes || 60}p)` : '',
          disabled: true, placeholder: 'Vui lòng chọn hội viên trước', searchEnabled: true, noDataText: 'Hội viên không có gói PT phù hợp'
        }),
        field('date', 'Ngày tập *', true, 'dxDateBox', {
          type: 'date', displayFormat: 'dd/MM/yyyy', min: dayDate(new Date()), useMaskBehavior: true
        }),
        field('start_time', 'Giờ bắt đầu *', true, 'dxSelectBox', {
          dataSource: timeSlots, valueExpr: 'id', displayExpr: 'text',
          searchEnabled: true, placeholder: 'Chọn giờ bắt đầu'
        }),
        field('end_time', 'Giờ kết thúc *', true, 'dxSelectBox', {
          dataSource: initialEndSlots,
          valueExpr: 'id',
          displayExpr: 'text',
          searchEnabled: true,
          disabled: !initialRegId,
          placeholder: initialRegId ? 'Chọn hoặc giữ giờ kết thúc được gợi ý' : 'Chọn gói PT trước'
        }),
        field('duration_display', 'Thời lượng buổi tập', false, 'dxTextBox', {
          readOnly: true,
          placeholder: 'Vui lòng chọn hội viên & gói PT để xác định thời lượng'
        }),
        field('notes', 'Ghi chú cho buổi', false, 'dxTextArea', { height: 70, placeholder: 'Mục tiêu buổi tập, lưu ý thể lực...' })
      ],
      onReady: instance => {
        state.activeBookingForm = instance;
        const currentData = instance.option('formData');
        if (currentData.member_id) loadRegistrations(currentData.member_id, instance);
      },
      onChange: (event, form) => {
        const data = form.option('formData');
        const endEditor = form.getEditor('end_time');
        if (event.dataField === 'member_id') {
          loadRegistrations(event.value, form);
        } else if (event.dataField === 'registration_id') {
          const reg = registrations.find(r => r.id === event.value);
          if (reg) {
            const pkgDur = Number(reg.session_duration_minutes) || 60;
            const curStart = data.start_time || '09:00';
            const curEnd = calculateEndTime(curStart, pkgDur);
            const slots = generateEndTimeSlots(curStart, pkgDur);

            data.package_duration = pkgDur;
            data.duration_minutes = pkgDur;
            data.end_time = curEnd;

            form.updateData('package_duration', pkgDur);
            form.updateData('duration_minutes', pkgDur);
            form.updateData('duration_display', `${pkgDur} phút (Theo cấu hình gói đã chọn)`);
            if (endEditor) {
              endEditor.option({ dataSource: slots, disabled: false, placeholder: 'Chọn hoặc giữ giờ kết thúc được gợi ý' });
            }
            form.updateData('end_time', curEnd);
            if (calendarDragButton) calendarDragButton.option('disabled', false);

            if (state.draft && state.draft.registration_id) {
              state.draft.duration_minutes = pkgDur;
              state.draft.package_duration = pkgDur;
              state.draft.end_time = curEnd;
              state.draft.registration_id = reg.id;
              state.draft.package_name = reg.package_name_snapshot || reg.package_name;
              state.draft.endDate = new Date(state.draft.startDate.getTime() + pkgDur * 60000);
              refreshSchedulerAppointments(state);
              renderDraftFloatingBar(state);
            }
          } else {
            data.package_duration = null;
            data.duration_minutes = null;
            data.end_time = null;
            form.updateData('package_duration', null);
            form.updateData('duration_minutes', null);
            form.updateData('duration_display', '');
            if (endEditor) {
              endEditor.option({ dataSource: [], disabled: true, placeholder: 'Chọn gói PT trước' });
            }
            form.updateData('end_time', '');
            if (calendarDragButton) calendarDragButton.option('disabled', true);
          }
        } else if (event.dataField === 'start_time') {
          const newStart = event.value;
          const reg = registrations.find(r => r.id === data.registration_id);
          const pkgDur = Number(reg?.session_duration_minutes) || Number(data.package_duration) || 60;
          const currentActualDur = Number(data.duration_minutes) || pkgDur;
          const slots = generateEndTimeSlots(newStart, pkgDur);

          if (endEditor) {
            endEditor.option('dataSource', slots);
          }

          const newEnd = calculateEndTime(newStart, currentActualDur);
          data.end_time = newEnd;
          form.updateData('end_time', newEnd);

          if (state.draft && state.draft.registration_id) {
            state.draft.start_time = newStart;
            state.draft.end_time = newEnd;
            state.draft.startDate = appointmentTime(state.draft.booking_date, newStart);
            state.draft.endDate = appointmentTime(state.draft.booking_date, newEnd);
            refreshSchedulerAppointments(state);
            renderDraftFloatingBar(state);
          }
        } else if (event.dataField === 'end_time') {
          const curStart = data.start_time || '09:00';
          const newEnd = event.value;
          if (curStart && newEnd) {
            const actualDur = calculateDurationMinutes(curStart, newEnd);
            const reg = registrations.find(r => r.id === data.registration_id);
            const pkgDur = Number(reg?.session_duration_minutes) || Number(data.package_duration) || actualDur;

            if (actualDur > 0) {
              data.duration_minutes = actualDur;
              let displayText = `${actualDur} phút`;
              if (actualDur < pkgDur) {
                displayText += ` (Rút ngắn từ gói ${pkgDur}p · Vẫn tính 1 buổi)`;
              } else {
                displayText += ` (Theo cấu hình gói đã chọn)`;
              }
              form.updateData('duration_display', displayText);

              if (state.draft && state.draft.registration_id) {
                state.draft.end_time = newEnd;
                state.draft.duration_minutes = actualDur;
                state.draft.endDate = appointmentTime(state.draft.booking_date, newEnd);
                refreshSchedulerAppointments(state);
                renderDraftFloatingBar(state);
              }
            }
          }
        } else if (event.dataField === 'date') {
          const newDateStr = dayKey(event.value);
          if (state.draft && state.draft.registration_id) {
            state.draft.booking_date = newDateStr;
            state.draft.startDate = appointmentTime(newDateStr, state.draft.start_time);
            state.draft.endDate = appointmentTime(newDateStr, state.draft.end_time);
            refreshSchedulerAppointments(state);
            renderDraftFloatingBar(state);
          }
          if (data.member_id) loadRegistrations(data.member_id, form);
        }
      },
      onClose: () => {
        closed = true;
        registrationLoad++;
        state.activeBookingForm = null;
      },
      submit: async data => {
        if (!data.registration_id) {
          throw new Error('Vui lòng chọn hội viên và gói PT sử dụng.');
        }
        const targetDate = dayKey(data.date);
        const start = clock(data.start_time);
        const reg = registrations.find(r => r.id === data.registration_id);
        const pkgDuration = Number(reg?.session_duration_minutes) || Number(data.package_duration) || 60;
        const end = clock(data.end_time || calculateEndTime(start, pkgDuration));
        const actualDuration = calculateDurationMinutes(start, end);

        if (actualDuration <= 0) {
          throw new Error('Giờ kết thúc phải sau giờ bắt đầu.');
        }
        if (actualDuration > pkgDuration) {
          throw new Error(`Thời lượng buổi tập (${actualDuration} phút) không được vượt quá thời lượng của gói (${pkgDuration} phút).`);
        }

        if (!registrations.some(r => r.id === data.registration_id && eligibleRegistration(r, data.member_id, pt, targetDate))) {
          throw new Error('Gói PT không còn hợp lệ hoặc đã hết số buổi. Vui lòng chọn lại.');
        }

        if (appointmentTime(targetDate, start).getTime() <= Date.now()) {
          throw new Error('Không thể đặt lịch ở thời điểm trong quá khứ.');
        }

        if (checkCollision(state, targetDate, start, end)) {
          throw new Error(`Khung giờ ${start} - ${end} ngày ${dayDate(targetDate).toLocaleDateString('vi-VN')} bị trùng với một lịch tập khác của HLV!`);
        }

        await api().request('/pt-bookings', {
          method: 'POST',
          body: {
            registration_id: data.registration_id,
            member_id: data.member_id,
            pt_id: pt.id,
            branch_id: pt.branch_id,
            booking_date: targetDate,
            start_time: start,
            end_time: end,
            session_duration_minutes: actualDuration,
            workout_notes: String(data.notes || '').trim() || null
          }
        });

        notify('Đã đặt lịch PT thành công!');
        state.draft = null;
        state.content.find('.pt-floating-draft-bar').remove();
        await loadSchedule(state);
      }
    });

    if (state.context.member_id && !initialMemberId) {
      modal.form.updateData('member_id', state.context.member_id);
    }
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
  async function showConfirmActorModal(state, booking, onDone) {
    if (!ended(booking)) {
      notify(`Buổi tập chưa kết thúc (kết thúc lúc ${clock(booking.end_time)}). Chưa thể xác nhận hoàn thành.`, 'warning');
      return;
    }
    let latest;
    try {
      latest = await freshBooking(booking);
    } catch (e) {
      latest = booking;
    }
    if (!pendingBooking(latest)) {
      notify('Buổi tập đã hoàn thành hoặc đã hủy. Vui lòng tải lại lịch.', 'warning');
      return;
    }
    if (latest.pt_confirmed_at && latest.member_confirmed_at) {
      notify('Cả Huấn luyện viên và Học viên đều đã xác nhận buổi tập này.', 'info');
      return;
    }

    const host = $('<div>').appendTo(state.root);
    let popupInstance, formInstance, busy = false;

    // Ưu tiên chọn bên chưa xác nhận
    let defaultActor = 'PT';
    if (!latest.pt_confirmed_at && latest.member_confirmed_at) {
      defaultActor = 'PT';
    } else if (latest.pt_confirmed_at && !latest.member_confirmed_at) {
      defaultActor = 'MEMBER';
    } else if (!latest.pt_confirmed_at && !latest.member_confirmed_at) {
      defaultActor = 'PT';
    }

    const actorOptions = [
      { id: 'PT', text: `Huấn luyện viên (PT: ${latest.pt_name || trainerLabel(state.trainer) || 'HLV'})`, disabled: !!latest.pt_confirmed_at },
      { id: 'MEMBER', text: `Học viên (${latest.member_name || 'Hội viên'})`, disabled: !!latest.member_confirmed_at },
      { id: 'BOTH', text: 'Cả hai bên (HLV & Học viên cùng xác nhận)', disabled: !!(latest.pt_confirmed_at && latest.member_confirmed_at) }
    ];

    const formData = {
      confirm_for: defaultActor,
      workout_notes: latest.workout_notes || latest.workout_content || '',
      fitness_assessment: latest.fitness_assessment || ''
    };

    popupInstance = host.dxPopup({
      title: 'Xác nhận hoàn thành buổi tập',
      width: 540,
      maxWidth: 'calc(100vw - 24px)',
      height: 'auto',
      maxHeight: '90vh',
      showCloseButton: true,
      hideOnOutsideClick: false,
      onHiding: event => { if (busy) event.cancel = true; },
      onHidden: () => {
        state.popups = state.popups.filter(item => item !== popupInstance);
        popupInstance.dispose();
        host.remove();
      },
      contentTemplate: container => {
        const root = $('<div>').appendTo(container);

        // 1. Tóm tắt thông tin buổi tập
        const summary = $('<div class="confirm-actor-summary">')
          .css({ padding: '12px 16px', background: '#f8faf9', border: '1px solid #dfe6e2', borderRadius: '6px', marginBottom: '14px', fontSize: '13px', lineHeight: '1.6' })
          .appendTo(root);
        summary.html(`
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span><i class="fa-regular fa-user" style="color:var(--primary); margin-right:6px;"></i>Hội viên: <strong>${latest.member_name || '--'}</strong> (${latest.member_code || ''})</span>
            <span><i class="fa-solid fa-dumbbell" style="color:var(--primary); margin-right:6px;"></i>PT: <strong>${latest.pt_name || trainerLabel(state.trainer) || '--'}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; color: #556059; font-size: 12px;">
            <span><i class="fa-regular fa-clock" style="margin-right:6px;"></i>${clock(latest.start_time)} - ${clock(latest.end_time)} (${dayDate(latest.booking_date).toLocaleDateString('vi-VN')})</span>
            <span>${latest.package_name || latest.package_name_snapshot || ''}</span>
          </div>
        `);

        // 2. Trạng thái xác nhận hiện tại
        const statusBlock = $('<div>')
          .css({ padding: '10px 14px', background: '#ffffff', border: '1px solid #dfe6e2', borderRadius: '6px', marginBottom: '16px' })
          .appendTo(root);
        const ptBadge = latest.pt_confirmed_at
          ? `<span class="badge badge-success"><i class="fa-solid fa-check"></i> Đã xác nhận (${new Date(latest.pt_confirmed_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ${new Date(latest.pt_confirmed_at).toLocaleDateString('vi-VN')})</span>`
          : `<span class="badge badge-warning"><i class="fa-regular fa-clock"></i> Chưa xác nhận</span>`;
        const memberBadge = latest.member_confirmed_at
          ? `<span class="badge badge-success"><i class="fa-solid fa-check"></i> Đã xác nhận (${new Date(latest.member_confirmed_at).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})} ${new Date(latest.member_confirmed_at).toLocaleDateString('vi-VN')})</span>`
          : `<span class="badge badge-warning"><i class="fa-regular fa-clock"></i> Chưa xác nhận</span>`;
        statusBlock.html(`
          <div style="font-size: 12px; font-weight: 600; color: #253e30; margin-bottom: 8px;">Trạng thái xác nhận hiện tại:</div>
          <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Huấn luyện viên (PT):</span>
              ${ptBadge}
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>Học viên (Hội viên):</span>
              ${memberBadge}
            </div>
          </div>
        `);

        // 3. Form chọn bên xác nhận & nhập đánh giá
        const formDiv = $('<div>').appendTo(root);
        formInstance = formDiv.dxForm({
          formData: formData,
          labelLocation: 'top',
          showColonAfterLabel: false,
          items: [
            {
              dataField: 'confirm_for',
              label: { text: 'Chọn bên xác nhận hoàn thành' },
              editorType: 'dxRadioGroup',
              editorOptions: {
                dataSource: actorOptions,
                valueExpr: 'id',
                displayExpr: 'text',
                value: defaultActor,
                layout: 'vertical',
                onValueChanged: e => {
                  const isPT = ['PT', 'BOTH'].includes(e.value);
                  formInstance.itemOption('workout_notes', 'visible', isPT);
                  formInstance.itemOption('fitness_assessment', 'visible', isPT);
                }
              },
              validationRules: [{ type: 'required', message: 'Vui lòng chọn bên xác nhận' }]
            },
            {
              dataField: 'workout_notes',
              label: { text: 'Nội dung bài tập (tùy chọn)' },
              editorType: 'dxTextArea',
              visible: ['PT', 'BOTH'].includes(defaultActor),
              editorOptions: {
                height: 70,
                placeholder: 'Ghi lại nội dung bài tập đã thực hiện trong buổi...'
              }
            },
            {
              dataField: 'fitness_assessment',
              label: { text: 'Đánh giá thể lực (tùy chọn)' },
              editorType: 'dxTextBox',
              visible: ['PT', 'BOTH'].includes(defaultActor),
              editorOptions: {
                placeholder: 'Nhận xét thể lực hoặc mức độ hoàn thành bài tập...'
              }
            }
          ]
        }).dxForm('instance');
      },
      toolbarItems: [
        {
          widget: 'dxButton',
          toolbar: 'bottom',
          location: 'after',
          options: {
            text: 'Hủy',
            stylingMode: 'outlined',
            onClick: () => popupInstance.hide()
          }
        },
        {
          widget: 'dxButton',
          toolbar: 'bottom',
          location: 'after',
          options: {
            text: 'Xác nhận hoàn thành',
            icon: 'check',
            type: 'default',
            stylingMode: 'contained',
            onClick: async e => {
              if (busy) return;
              const validation = formInstance.validate();
              if (!validation.isValid) return;

              busy = true;
              e.component.option('disabled', true);
              formInstance.option('disabled', true);

              try {
                const currentData = formInstance.option('formData');
                const payload = {
                  confirm_for: currentData.confirm_for
                };
                if (['PT', 'BOTH'].includes(currentData.confirm_for)) {
                  if (currentData.workout_notes) payload.workout_notes = currentData.workout_notes;
                  if (currentData.fitness_assessment) payload.fitness_assessment = currentData.fitness_assessment;
                }
                const res = await api().request(`/pt-bookings/${encodeURIComponent(booking.id)}/confirm`, {
                  method: 'POST',
                  body: payload
                });
                popupInstance.hide();
                if (res?.data?.is_completed || res?.is_completed) {
                  notify('Buổi tập đã hoàn thành! Cả hai bên đều đã hoàn tất xác nhận và đã khấu trừ 1 buổi.', 'success');
                } else {
                  notify('Đã ghi nhận xác nhận hoàn thành. Buổi tập chuyển sang Chờ đối soát hoàn tất.', 'success');
                }
                if (onDone) {
                  await onDone();
                } else {
                  await refreshBookingView(state);
                }
              } catch (err) {
                notify(err.message || 'Không thể xác nhận hoàn thành.', 'error');
              } finally {
                busy = false;
                if (host.closest('body').length) {
                  e.component.option('disabled', false);
                  formInstance.option('disabled', false);
                }
              }
            }
          }
        }
      ]
    }).dxPopup('instance');

    state.popups.push(popupInstance);
    popupInstance.show();
  }

  async function openCommunityClassDetailModal(state, booking) {
    const classId = booking.class_id || String(booking.id).replace(/^comm-/, '');
    const compVal = Number(booking.total_compensation || (Number(booking.base_price || 0) + Number(booking.bonus_amount || 0)));
    const enrolled = Number(booking.enrolled_slots || 0);
    const max = Number(booking.max_slots || 40);

    const host = $('<div>').appendTo(state.root || 'body');
    let content;
    const popup = host.dxPopup({
      title: `Lớp học cộng đồng: ${booking.title || '--'}`,
      width: 780,
      maxWidth: 'calc(100vw - 24px)',
      height: 'auto',
      maxHeight: '90vh',
      showCloseButton: true,
      hideOnOutsideClick: true,
      onHidden: () => {
        state.popups = state.popups.filter(item => item !== popup);
        host.remove();
      },
      contentTemplate: element => {
        content = $('<div style="padding: 4px;">').appendTo(element);
      },
      toolbarItems: [
        {
          widget: 'dxButton',
          toolbar: 'bottom',
          location: 'after',
          options: {
            text: 'Đóng',
            stylingMode: 'outlined',
            type: 'normal',
            onClick: () => popup.hide()
          }
        }
      ]
    }).dxPopup('instance');

    state.popups.push(popup);
    popup.show();

    content.empty();

    // 1. Overview Card
    $(`
      <div style="background: linear-gradient(135deg, #2e1065 0%, #4c1d95 100%); color: #ffffff; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; box-shadow: 0 4px 14px rgba(76, 29, 149, 0.25);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #ddd6fe; letter-spacing: 0.5px;">
              <i class="fa-solid fa-users" style="margin-right: 5px;"></i>LỚP HỌC CỘNG ĐỒNG · ${booking.discipline_name || 'BỘ MÔN NHÓM'}
            </span>
            <h3 style="margin: 4px 0 0; font-size: 18px; font-weight: 700; color: #ffffff;">${booking.title || '--'}</h3>
          </div>
          <span style="background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; color: #ffffff; font-family: Manrope, monospace;">
            ${enrolled}/${max} HỌC VIÊN
          </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; font-size: 12.5px; border-top: 1px solid rgba(255,255,255,0.18); padding-top: 10px; margin-top: 6px;">
          <div><i class="fa-regular fa-clock" style="margin-right: 6px; color: #c4b5fd;"></i><strong>${clock(booking.start_time)} - ${clock(booking.end_time)}</strong></div>
          <div><i class="fa-solid fa-user-ninja" style="margin-right: 6px; color: #c4b5fd;"></i>HLV: <strong>${booking.instructor_name || state.trainer?.full_name || '--'}</strong></div>
          <div><i class="fa-solid fa-location-dot" style="margin-right: 6px; color: #c4b5fd;"></i><strong>${booking.branch_name || 'Chi nhánh'}</strong></div>
          <div><i class="fa-solid fa-coins" style="margin-right: 6px; color: #fbbf24;"></i>Thù lao: <strong style="color: #fbbf24;">${compVal.toLocaleString('vi-VN')} đ</strong></div>
        </div>
      </div>
    `).appendTo(content);

    // 2. Section Header
    $(`
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="font-weight: 700; font-size: 14px; color: #185740;">
          <i class="fa-solid fa-users-line" style="margin-right: 6px;"></i>Danh sách hội viên đã đăng ký (${enrolled} người)
        </div>
      </div>
    `).appendTo(content);

    // 3. Grid Container
    const gridDiv = $('<div>').appendTo(content);
    const loadingDiv = $('<div style="text-align: center; padding: 25px; color: #748078;"><i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>Đang tải danh sách hội viên...</div>').appendTo(gridDiv);

    try {
      const res = await api().request(`/community-classes/${encodeURIComponent(classId)}/members`);
      loadingDiv.remove();
      const data = read(res);
      const members = data?.members || [];
      if (!members.length) {
        $('<div style="text-align: center; padding: 30px; color: #748078; background: #f8fbf9; border-radius: 6px; border: 1px dashed #dfe6e2;"><i class="fa-solid fa-user-group" style="font-size: 28px; margin-bottom: 8px; display: block; opacity: 0.5;"></i>Chưa có học viên nào đăng ký lớp học này.</div>').appendTo(gridDiv);
        return;
      }

      gridDiv.dxDataGrid({
        dataSource: members,
        columns: [
          { caption: 'STT', width: 50, alignment: 'center', cellTemplate: (el, cell) => el.text(cell.rowIndex + 1) },
          { dataField: 'member_code', caption: 'Mã HV', width: 110, alignment: 'center', cellTemplate: (el, cell) => {
            $('<span class="dx-badge" style="background:#eaf4ee; color:#237b58; font-weight:700; padding:3px 8px; border-radius:4px; font-family:monospace;">').text(cell.value || '--').appendTo(el);
          }},
          { dataField: 'full_name', caption: 'Họ và tên', minWidth: 160, cellTemplate: (el, cell) => {
            $('<strong style="color: #1e293b;">').text(cell.value || '--').appendTo(el);
          }},
          { dataField: 'phone', caption: 'Số điện thoại', width: 130, alignment: 'center', cellTemplate: (el, cell) => el.text(cell.value || '--') },
          { dataField: 'registration_date', caption: 'Thời điểm đăng ký', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm', width: 160, alignment: 'center' },
          { dataField: 'status', caption: 'Trạng thái', width: 130, alignment: 'center', cellTemplate: (el, cell) => {
            $('<span class="dx-badge" style="background: #ecfdf5; color: #047857; font-weight: 600; padding: 3px 8px; border-radius: 4px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-check" style="margin-right: 4px;"></i>Đã đăng ký</span>').appendTo(el);
          }}
        ],
        showBorders: true,
        columnAutoWidth: true,
        rowAlternationEnabled: true,
        paging: { pageSize: 6 },
        pager: { showPageSizeSelector: false, showInfo: true }
      });
    } catch (err) {
      loadingDiv.html(`<div style="color: #ef4444; padding: 15px;"><i class="fa-solid fa-triangle-exclamation"></i> Không thể tải danh sách học viên: ${err.message || err}</div>`);
    }
  }

  async function confirmBookingCompletion(state, booking, onDone) {
    return showConfirmActorModal(state, booking, onDone);
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
            showConfirmActorModal(state, currentBooking, async () => {
              await reload();
              await refreshBookingView(state);
            });
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
          readonlyField('Khấu trừ buổi', latest.is_deducted ? 'Đã khấu trừ' : 'Chưa khấu trừ')
        ];
        if (latest.session_number != null) details.push(readonlyField('Buổi số', String(latest.session_number)));
        if (latest.notes || latest.note) details.push(readonlyField('Ghi chú khi đặt lịch', latest.notes || latest.note));
        if (latest.workout_notes || latest.workout_content) details.push(readonlyField('Nội dung bài tập', latest.workout_notes || latest.workout_content));
        if (latest.fitness_assessment) details.push(readonlyField('Đánh giá thể lực', latest.fitness_assessment));
        if (latest.cancelled_at) details.push(readonlyField('Thời điểm hủy', new Date(latest.cancelled_at).toLocaleString('vi-VN')));
        if (latest.cancel_reason) details.push(readonlyField('Lý do hủy', latest.cancel_reason));
        $('<div>').appendTo(content).dxForm({ readOnly: true, labelLocation: 'top', colCount: 2, colCountByScreen: { xs: 1 }, items: details });
        completeButton.option({ visible: pendingBooking(latest), disabled: !ended(latest) }); cancelButton.option('visible', latest.status === 'BOOKED');
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
    openBookingForm: slot => current && showBookingForm(current, slot || { booking_date: dayKey(new Date(Date.now() + 86400000)), start_time: '09:00' }),
    destroy: () => { if (current) { current.popups.forEach(popup => popup.hide()); current.sequence++; current = null; } },
    openTrainerSchedule: (ptId, context = {}) => window.ParadiseApp?.navigateTo('pt-schedule', { ...context, pt_id: ptId }),
    openBookingDetail: bookingId => window.ParadiseApp?.navigateTo('pt-schedule', { booking_id: bookingId })
  };
})();
