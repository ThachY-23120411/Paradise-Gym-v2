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
          const headerCard = $('<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e2ece5;">').appendTo(content);
          const avatarHtml = fullPt.avatar_url && /^https?:\/\//.test(fullPt.avatar_url)
            ? `<img src="${fullPt.avatar_url}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #237b58;">`
            : `<div style="width:60px;height:60px;border-radius:50%;background:#eaf4ee;color:#237b58;font-size:20px;font-weight:700;display:grid;place-items:center;border:2px solid #237b58;">${(fullPt.full_name || '?').trim().split(/\s+/).slice(-2).map(x => x[0]).join('').toUpperCase()}</div>`;
          $(avatarHtml).appendTo(headerCard);
          const headerInfo = $('<div>').appendTo(headerCard);
          $('<h4 style="margin:0 0 4px;font-size:16px;font-weight:700;color:#185740;">').text(fullPt.full_name).appendTo(headerInfo);
          $('<div>').append($(badge(headerInfo, fullPt.status, PROFILE_STATUS)), $(` <span class="status-badge ${fullPt.face_enrolled ? 'badge-success' : 'badge-warning'}">${fullPt.face_enrolled ? 'Đã có ảnh chân dung' : 'Chưa có ảnh chân dung'}</span>`)).appendTo(headerInfo);

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
          ...(isAdmin() ? [
            {
              widget: 'dxButton', toolbar: 'bottom', location: 'after',
              options: {
                text: 'Bàn giao học viên', icon: 'repeat', type: 'normal',
                onClick: () => {
                  popup.hide();
                  openTrainerHandoverModal(state, fullPt);
                }
              }
            },
            {
              widget: 'dxButton', toolbar: 'bottom', location: 'after',
              options: {
                text: 'Sửa hồ sơ PT', icon: 'edit', type: 'default', stylingMode: 'contained',
                onClick: () => {
                  popup.hide();
                  showTrainerForm(state, fullPt);
                }
              }
            }
          ] : []),
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
      { dataField: 'pt_code', caption: 'Mã PT', width: 100, calculateCellValue: pt => pt.pt_code || pt.code },
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
    return state.bookings.some(b =>
      b.id !== excludeId &&
      activeBooking(b) &&
      dayKey(b.booking_date) === dateStr &&
      clock(b.start_time) < endStr &&
      clock(b.end_time) > startStr
    );
  }
  function getAllAppointments(state) {
    const list = state.bookings.filter(activeBooking).map(booking => ({
      ...booking,
      id: booking.id,
      text: `${booking.member_name || ''} - ${booking.package_name || booking.package_name_snapshot || ''}`,
      startDate: appointmentTime(booking.booking_date, booking.start_time),
      endDate: appointmentTime(booking.booking_date, booking.end_time),
      is_draft: false
    }));
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
    if (!state.draft) return;
    const draft = state.draft;
    const startStr = draft.startDate ? clockFromDate(draft.startDate) : (draft.start_time || '09:00');
    const duration = Number(draft.duration_minutes) || 60;
    const endStr = draft.endDate ? clockFromDate(draft.endDate) : calculateEndTime(startStr, duration);
    draft.start_time = startStr;
    draft.end_time = endStr;
    const targetDate = draft.startDate ? dayDate(draft.startDate) : dayDate(draft.booking_date || new Date());
    const targetDateStr = dayKey(targetDate);
    const dateText = targetDate.toLocaleDateString('vi-VN');

    const bar = $('<div class="pt-floating-draft-bar">').appendTo(state.content);
    const info = $('<div class="info">').appendTo(bar);
    $('<span class="pt-duration-tag">').text(`${duration} phút`).appendTo(info);
    const textCol = $('<div style="display:flex;flex-direction:column;">').appendTo(info);
    $('<strong style="color:#065f46;font-size:14px;">').text(`${startStr} - ${endStr}`).appendTo(textCol);
    if (draft.member_name) {
      $('<span style="font-size:12px;color:#0f172a;font-weight:600;">').text(`${draft.member_name} · ${draft.package_name || 'Gói PT'}`).appendTo(textCol);
    }
    $('<span style="font-size:11px;color:#64748b;">').text(`Ngày tập: ${dateText}`).appendTo(textCol);

    $('<div class="hint">').html('<i class="fa-solid fa-arrows-up-down" style="color:#059669;"></i> <span>Kéo thả thẻ xanh trên lịch để đổi giờ</span>').appendTo(bar);

    const actions = $('<div class="actions">').appendTo(bar);
    if (draft.registration_id) {
      button(actions, {
        text: 'Xác nhận đặt lịch', icon: 'check', type: 'default', stylingMode: 'contained',
        onClick: async () => {
          if (appointmentTime(targetDateStr, draft.start_time).getTime() <= Date.now()) {
            notify('Không thể đặt lịch ở thời điểm trong quá khứ.', 'warning');
            return;
          }
          if (checkCollision(state, targetDateStr, draft.start_time, draft.end_time)) {
            notify(`⚠️ Khung giờ ${draft.start_time} - ${draft.end_time} bị trùng với lịch khác của HLV!`, 'error');
            return;
          }
          try {
            await api().request('/pt-bookings', {
              method: 'POST',
              body: {
                registration_id: draft.registration_id,
                member_id: draft.member_id,
                pt_id: state.trainer.id,
                branch_id: state.trainer.branch_id,
                booking_date: targetDateStr,
                start_time: draft.start_time,
                end_time: draft.end_time,
                session_duration_minutes: duration,
                workout_notes: String(draft.notes || '').trim() || null
              }
            });
            notify('Đã đặt lịch PT thành công!');
            state.draft = null;
            bar.remove();
            await loadSchedule(state);
          } catch (err) {
            notify(err.message || 'Không thể đặt lịch.', 'error');
          }
        }
      });
      button(actions, {
        text: 'Đổi gói / thông tin', icon: 'edit', stylingMode: 'outlined',
        onClick: () => showBookingForm(state, state.draft)
      });
    } else {
      button(actions, {
        text: 'Điền thông tin & Đặt lịch', icon: 'check', type: 'default', stylingMode: 'contained',
        onClick: () => showBookingForm(state, state.draft)
      });
    }
    button(actions, {
      text: 'Hủy chọn', icon: 'close', stylingMode: 'outlined',
      onClick: () => {
        state.draft = null;
        bar.remove();
        refreshSchedulerAppointments(state);
        notify('Đã hủy chọn lịch dự kiến.', 'info');
      }
    });
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
      return;
    }

    const isEnded = ended(booking);
    const durationMin = booking.session_duration_minutes || calculateDurationMinutes(booking.start_time, booking.end_time);
    const isDayView = state.calendarView === 'day';
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

        if (!isEnded) {
          $('<button type="button" class="pt-btn-card-cancel">')
            .html('<i class="fa-solid fa-xmark"></i> Hủy lịch')
            .attr('title', 'Hủy lịch PT này (QTV-W06-US04 / LT-W06-US04)')
            .appendTo(topRight)
            .on('click', e => {
              e.preventDefault(); e.stopPropagation();
              showCancellation(state, booking);
            });
        }
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

      if (booking.status === 'BOOKED' && !isEnded) {
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
        { type: 'day', name: 'Ngày', intervalCount: 1 },
        { type: 'workWeek', name: 'Tuần (T2-T6)' },
        { type: 'week', name: 'Toàn tuần' }
      ],
      currentView: state.calendarView,
      currentDate: state.date,
      firstDayOfWeek: 1,
      startDayHour: 6,
      endDayHour: 22,
      cellDuration: 30, // 30 phút mỗi ô lưới
      showAllDayPanel: false,
      height: 750,
      editing: {
        allowAdding: false,
        allowDeleting: false,
        allowDragging: true, // KÉO THẢ THẺ LỊCH TẬP
        allowResizing: false,
        allowUpdating: true
      },
      showCurrentTimeIndicator: true,
      onAppointmentFormOpening: event => { event.cancel = true; },
      onAppointmentDblClick: event => { event.cancel = true; },
      onAppointmentClick: event => {
        event.cancel = true;
        if (event.appointmentData.is_draft) {
          showBookingForm(state, event.appointmentData);
        } else {
          showBookingDetail(state, event.appointmentData);
        }
      },
      onAppointmentRendered: event => {
        const item = event.appointmentData;
        const el = $(event.appointmentElement);
        if (item.is_draft) {
          el.addClass('pt-draft-appointment');
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
          notify('Chỉ thẻ lịch tập dự kiến mới có thể nhấn giữ kéo đổi giờ.', 'warning');
          return;
        }

        const newStart = new Date(event.newData?.startDate || item.startDate);
        const duration = Number(state.draft?.duration_minutes) || Number(item.duration_minutes) || 60;
        const newEnd = new Date(newStart.getTime() + duration * 60000);

        if (event.newData) {
          event.newData.startDate = newStart;
          event.newData.endDate = newEnd;
        }

        const newDateStr = dayKey(newStart);
        const newStartStr = clockFromDate(newStart);
        const newEndStr = clockFromDate(newEnd);

        if (state.draft) {
          state.draft.startDate = newStart;
          state.draft.endDate = newEnd;
          state.draft.booking_date = newDateStr;
          state.draft.start_time = newStartStr;
          state.draft.end_time = newEndStr;
          state.draft.duration_minutes = duration;
        }
      },
      onAppointmentUpdated: event => {
        const item = event.appointmentData || event.newData || state.draft;
        if (!item || !item.is_draft) return;

        const newStart = new Date(item.startDate);
        const duration = Number(state.draft?.duration_minutes) || Number(item.duration_minutes) || 60;
        const newEnd = new Date(newStart.getTime() + duration * 60000);

        const newDateStr = dayKey(newStart);
        const newStartStr = clockFromDate(newStart);
        const newEndStr = clockFromDate(newEnd);

        if (state.draft) {
          state.draft.startDate = newStart;
          state.draft.endDate = newEnd;
          state.draft.booking_date = newDateStr;
          state.draft.start_time = newStartStr;
          state.draft.end_time = newEndStr;
          state.draft.duration_minutes = duration;
        }

        const hasCollision = checkCollision(state, newDateStr, newStartStr, newEndStr);
        if (hasCollision) {
          notify(`⚠️ Khung giờ ${newStartStr} - ${newEndStr} bị trùng với lịch khác của HLV!`, 'warning');
        } else {
          notify(`⏰ Đã điều chỉnh giờ bắt đầu: ${newStartStr} - ${newEndStr} (${duration} phút)`, 'success');
        }

        renderDraftFloatingBar(state);

        if (state.activeBookingForm) {
          state.activeBookingForm.updateData('date', dayDate(newDateStr));
          state.activeBookingForm.updateData('start_time', newStartStr);
          state.activeBookingForm.updateData('end_time', newEndStr);
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

          state.draft.startDate = clickedStart;
          state.draft.endDate = clickedEnd;
          state.draft.booking_date = dateStr;
          state.draft.start_time = startStr;
          state.draft.end_time = endStr;

          const hasCollision = checkCollision(state, dateStr, startStr, endStr);
          if (hasCollision) {
            notify(`⚠️ Khung giờ ${startStr} - ${endStr} bị trùng với lịch khác của HLV!`, 'warning');
          } else {
            notify(`⏰ Đã điều chỉnh giờ bắt đầu: ${startStr} - ${endStr} (${duration} phút)`, 'success');
          }

          refreshSchedulerAppointments(state);
          renderDraftFloatingBar(state);
          return;
        }

        // Nếu chưa chọn gói: mở modal để chọn Hội viên & Gói PT trước, với giờ dự kiến là ô vừa click!
        showBookingForm(state, {
          booking_date: dateStr,
          start_time: startStr
        });
      },
      timeCellTemplate: (cell, index, element) => {
        $(element).css({ verticalAlign: 'top', padding: 0, position: 'relative' });
        const h = String(cell.date.getHours()).padStart(2, '0');
        const m = String(cell.date.getMinutes()).padStart(2, '0');
        const isFirst = (cell.date.getHours() === 6 && cell.date.getMinutes() === 0) || index === 0;

        const labelDiv = $('<div class="pt-time-panel-label">')
          .toggleClass('is-first-cell', isFirst)
          .appendTo(element);

        if (m === '00') {
          $('<span style="font-weight: 700; color: #1e293b; font-size: 12px; background: #ffffff; padding: 0 4px; border-radius: 3px;">')
            .text(`${h}:00`)
            .appendTo(labelDiv);
        } else {
          $('<span style="font-size: 11px; color: #64748b; background: #ffffff; padding: 0 4px; border-radius: 3px;">')
            .text(`${h}:${m}`)
            .appendTo(labelDiv);
        }

        if (cell.date.getHours() === 21 && cell.date.getMinutes() === 30) {
          const endDiv = $('<div class="pt-time-panel-label is-last-cell">').appendTo(element);
          $('<span style="font-weight: 700; color: #1e293b; font-size: 12px; background: #ffffff; padding: 0 4px; border-radius: 3px;">')
            .text('22:00')
            .appendTo(endDiv);
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
          if (state.calendarView !== view) { state.calendarView = view; loadSchedule(state); }
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
            if (!ended(booking)) {
              button(actions, { icon: 'close', text: 'Hủy lịch', type: 'danger', stylingMode: 'contained', onClick: () => showCancellation(state, booking) });
            }
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
  function generateStartTimeSlots(stepMinutes = 15, startHour = 6, endHour = 21, endMinute = 30) {
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
      initialMemberId = draftOrDate.member_id || null;
      initialRegId = draftOrDate.registration_id || null;
      initialMemberName = draftOrDate.member_name || '';
      initialPackageName = draftOrDate.package_name || '';
      initialNotes = draftOrDate.notes || '';
      if (initialDuration) {
        initialDurationDisplay = `${initialDuration} phút (Theo cấu hình gói đã chọn)`;
        initialEnd = calculateEndTime(initialStart, initialDuration);
      }
    } else if (draftOrDate) {
      initialDateStr = dayKey(draftOrDate);
      if (maybeSlot) {
        initialStart = clock(maybeSlot.start_time || '09:00');
        initialDuration = maybeSlot.session_duration_minutes ? Number(maybeSlot.session_duration_minutes) : null;
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

    const loadRegistrations = async (memberId, form) => {
      const sequence = ++registrationLoad;
      registrations = [];
      form.updateData('registration_id', null);
      form.updateData('duration_minutes', null);
      form.updateData('duration_display', '');
      form.updateData('end_time', '');

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
            const dur = Number(reg.session_duration_minutes) || 60;
            form.updateData('duration_minutes', dur);
            form.updateData('duration_display', `${dur} phút (Theo cấu hình gói đã chọn)`);
            const curStart = form.option('formData').start_time || initialStart;
            const curEnd = calculateEndTime(curStart, dur);
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
              const dur = Number(reg?.session_duration_minutes) || Number(data.duration_minutes) || 60;
              const dateStr = dayKey(data.date || initialDateStr);
              const startStr = data.start_time ? clock(data.start_time) : (initialStart || '09:00');
              const endStr = calculateEndTime(startStr, dur);

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

              notify(`Đã kích hoạt thẻ đặt lịch ${dur} phút cho gói "${reg?.package_name_snapshot || reg?.package_name}". Nhấn giữ thẻ xanh và kéo lên/xuống để chọn giờ!`, 'info');
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
        field('duration_display', 'Thời lượng buổi tập', false, 'dxTextBox', {
          readOnly: true,
          placeholder: 'Vui lòng chọn hội viên & gói PT để xác định thời lượng'
        }),
        field('date', 'Ngày tập *', true, 'dxDateBox', {
          type: 'date', displayFormat: 'dd/MM/yyyy', min: dayDate(new Date()), useMaskBehavior: true
        }),
        field('start_time', 'Giờ bắt đầu *', true, 'dxSelectBox', {
          dataSource: timeSlots, valueExpr: 'id', displayExpr: 'text',
          searchEnabled: true, placeholder: 'Chọn giờ bắt đầu'
        }),
        field('end_time', 'Giờ kết thúc', false, 'dxTextBox', {
          readOnly: true,
          placeholder: '--:--'
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
        if (event.dataField === 'member_id') {
          loadRegistrations(event.value, form);
        } else if (event.dataField === 'registration_id') {
          const reg = registrations.find(r => r.id === event.value);
          if (reg) {
            const dur = Number(reg.session_duration_minutes) || 60;
            const curStart = data.start_time || '09:00';
            const curEnd = calculateEndTime(curStart, dur);
            data.duration_minutes = dur;
            data.end_time = curEnd;

            form.updateData('duration_display', `${dur} phút (Theo cấu hình gói đã chọn)`);
            form.updateData('end_time', curEnd);
            if (calendarDragButton) calendarDragButton.option('disabled', false);

            if (state.draft && state.draft.registration_id) {
              state.draft.duration_minutes = dur;
              state.draft.end_time = curEnd;
              state.draft.registration_id = reg.id;
              state.draft.package_name = reg.package_name_snapshot || reg.package_name;
              state.draft.endDate = new Date(state.draft.startDate.getTime() + dur * 60000);
              refreshSchedulerAppointments(state);
              renderDraftFloatingBar(state);
            }
          } else {
            data.duration_minutes = null;
            data.end_time = null;
            form.updateData('duration_display', '');
            form.updateData('end_time', '');
            if (calendarDragButton) calendarDragButton.option('disabled', true);
          }
        } else if (event.dataField === 'start_time') {
          const newStart = event.value;
          const dur = Number(data.duration_minutes) || state.draft?.duration_minutes;
          if (dur) {
            const newEnd = calculateEndTime(newStart, dur);
            data.end_time = newEnd;
            form.updateData('end_time', newEnd);
          }
          if (state.draft && state.draft.registration_id) {
            state.draft.start_time = newStart;
            if (dur) state.draft.end_time = calculateEndTime(newStart, dur);
            state.draft.startDate = appointmentTime(state.draft.booking_date, newStart);
            state.draft.endDate = appointmentTime(state.draft.booking_date, state.draft.end_time);
            refreshSchedulerAppointments(state);
            renderDraftFloatingBar(state);
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
        const duration = Number(reg?.session_duration_minutes) || Number(data.duration_minutes) || 60;
        const end = calculateEndTime(start, duration);

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
            session_duration_minutes: duration,
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
        completeButton.option({ visible: pendingBooking(latest), disabled: !ended(latest) }); cancelButton.option('visible', latest.status === 'BOOKED' && !ended(latest));
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
