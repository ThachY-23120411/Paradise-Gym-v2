window.MembersModule = (function () {
  'use strict';
  const $ = window.jQuery || window.$;
  const statuses = [{ id: 'ACTIVE', text: 'Đang hoạt động' }, { id: 'INACTIVE', text: 'Ngừng hoạt động' }, { id: 'ARCHIVED', text: 'Đã lưu trữ' }];
  let grid, root, user, branches = [], activeBranchId, renderVersion = 0, detailPopup;
  const popups = new Set();
  let filters = { q: '', status: '', branch_id: '' };
  const api = () => window.apiClient;
  const text = value => value === null || value === undefined || value === '' ? '-' : String(value);
  const statusText = value => statuses.find(s => s.id === value)?.text || text(value);
  const list = response => Array.isArray(response.data) ? response.data : response.data?.items || [];
  const normalizePhone = value => String(value || '').replace(/[\s().-]/g, '').replace(/^\+84/, '0');
  const validPhone = value => /^0[35789]\d{8}$/.test(normalizePhone(value));
  const notify = (message, type = 'success') => DevExpress.ui.notify(message, type, 3500);
  const required = label => ({ type: 'required', message: `${label} là bắt buộc` });
  const activeRole = context => {
    const role = context?.active_role || context?.role || api().getUser()?.active_role || api().getUser()?.role;
    return context?.roles?.includes(role) ? role : context?.roles?.length === 1 ? context.roles[0] : null;
  };
  const isReceptionist = () => activeRole(user) === 'RECEPTIONIST';
  const allowedBranches = data => user?.is_all_branches ? data : data.filter(b => user?.branch_ids?.includes(b.id));
  const branchName = id => branches.find(b => b.id === id)?.branch_name || '';
  function dateOnly(value) {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function button(parent, options) {
    return $('<div>').appendTo(parent).dxButton({ stylingMode: 'outlined', ...options }).dxButton('instance');
  }
  function errorBox(parent, err, retry) {
    const box = $('<div class="module-error" role="alert">').css({ padding: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }).appendTo(parent);
    $('<span>').text(err.message || 'Không thể tải dữ liệu. Vui lòng thử lại.').appendTo(box);
    if (retry) button(box, { text: 'Thử lại', icon: 'refresh', onClick: () => { box.remove(); retry(); } });
  }
  function badge(parent, status) {
    $('<span>').addClass('status-badge ' + (status === 'ACTIVE' ? 'badge-success' : status === 'ARCHIVED' ? 'badge-info' : 'badge-warning')).text(statusText(status)).appendTo(parent);
  }
  function field(dataField, label, editorType = 'dxTextBox', editorOptions = {}, validationRules = []) {
    return { dataField, label: { text: label }, editorType, editorOptions, validationRules };
  }
  function popup(title, width = 600, drawer = false) {
    const host = $('<div>').appendTo(document.body);
    let content;
    const instance = host.dxPopup({
      title, width: () => Math.min(width, window.innerWidth - 24), height: drawer ? '100%' : 'auto', maxHeight: drawer ? '100%' : '92vh',
      showCloseButton: true, dragEnabled: false, hideOnOutsideClick: false, deferRendering: false,
      position: drawer ? { my: 'right top', at: 'right top', of: window } : { my: 'center', at: 'center', of: window },
      wrapperAttr: { class: drawer ? 'member-detail-drawer' : 'member-form-popup' },
      onShown: e => {
        const titlebar = $(e.component.content()).closest('.dx-overlay-content').find('.dx-popup-title');
        titlebar.find('.dx-toolbar-before').css({ width: 'calc(100% - 48px)' });
        titlebar.find('.dx-toolbar-label').css({ maxWidth: '100%', width: '100%' });
      },
      contentTemplate: element => { content = $('<div>').css({ overflowY: 'auto', maxHeight: drawer ? 'calc(100vh - 140px)' : '68vh', padding: 4 }).appendTo(element); },
      onHidden: () => { popups.delete(instance); instance.dispose(); host.remove(); }
    }).dxPopup('instance');
    popups.add(instance); instance.show();
    return { instance, content, host };
  }
  function editDialog(title, data, items, save, options = {}) {
    const dialog = popup(title, options.width || 620);
    const errors = $('<div role="alert">').appendTo(dialog.content);
    let busy = false;
    const form = $('<div>').appendTo(dialog.content).dxForm({
      formData: data, labelLocation: 'top', colCount: 1, showColonAfterLabel: false,
      showValidationSummary: false, items, onFieldDataChanged: options.onChange
    }).dxForm('instance');
    const initial = JSON.stringify(data);
    dialog.instance.option('onHiding', event => { event.cancel = busy; });
    dialog.instance.option('toolbarItems', [
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Hủy', onClick: () => dialog.instance.hide() } },
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: {
        text: options.saveText || 'Lưu thay đổi', type: 'default', icon: 'save', stylingMode: 'contained',
        onClick: async event => {
          if (busy) return;
          busy = true; event.component.option('disabled', true); errors.empty();
          try {
            let result = form.validate();
            if (result.status === 'pending') result = await result.complete;
            if (!result.isValid) return;
            form.option('disabled', true);
            const values = form.option('formData');
            if (options.skipUnchanged && JSON.stringify(values) === initial) { busy = false; dialog.instance.hide(); return; }
            form.option('disabled', true);
            await save(values, form);
            busy = false; dialog.instance.hide();
          } catch (err) {
            if (err.status === 409 && options.phoneDuplicate) err.message = 'Số điện thoại đã tồn tại trong hệ thống.';
            const fieldName = err.field || err.data?.field || (err.status === 409 && options.phoneDuplicate ? 'phone' : null);
            if (fieldName && form.getEditor(fieldName)) form.getEditor(fieldName).option({ validationStatus: 'invalid', validationErrors: [{ message: err.message }] });
            errorBox(errors, err);
          } finally {
            busy = false;
            if (dialog.host.closest('body').length) { form.option('disabled', false); event.component.option('disabled', false); }
          }
        }
      } }
    ]);
    return { ...dialog, form };
  }
  async function render(containerId, context = {}) {
    const version = ++renderVersion;
    root = $(document.getElementById(containerId)).empty(); grid = null;
    const view = root;
    $('<div role="status">').css('padding', 24).text('Đang tải danh sách hội viên...').appendTo(view);
    try {
      const me = await api().auth.getMe();
      if (version !== renderVersion || !view[0]?.isConnected) return;
      user = me.data?.user || me.data;
      if (!['QTV', 'RECEPTIONIST'].includes(activeRole(user))) throw new Error('Bạn không có quyền truy cập hồ sơ hội viên.');
      branches = allowedBranches(list(await api().request('/branches', { headers: { 'x-branch-id': 'ALL' } })));
      if (version !== renderVersion || !view[0]?.isConnected) return;
      const selected = api().getCurrentBranchId();
      activeBranchId = branches.some(b => b.id === selected) ? selected : null;
      if (!activeBranchId && branches.length === 1) activeBranchId = branches[0].id;
      if (isReceptionist() && !activeBranchId) throw new Error('Chưa xác định chi nhánh trực quầy. Vui lòng chọn chi nhánh làm việc.');
      filters = { q: '', status: '', branch_id: activeBranchId || '' };
      view.empty();
      const header = $('<div class="view-header"><div class="view-header-title"><h2>Hội viên & khách hàng</h2></div><div class="view-actions"></div></div>').appendTo(view);
      button(header.find('.view-actions'), { icon: 'add', text: 'Thêm hội viên', type: 'default', stylingMode: 'contained', onClick: () => openMemberModal() });
      const bar = $('<div class="filter-bar">').css({ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }).appendTo(view);
      let timer;
      const search = $('<div>').css({ flex: '1 1 250px', minWidth: 180 }).appendTo(bar).dxTextBox({
        label: 'Tìm hội viên', labelMode: 'static', placeholder: 'Mã HV, họ tên, SĐT', showClearButton: true, valueChangeEvent: 'input',
        onValueChanged: e => { clearTimeout(timer); timer = setTimeout(() => { if (version !== renderVersion) return; filters.q = e.value?.trim() || ''; reload(); }, 300); }
      }).dxTextBox('instance');
      const status = $('<div>').css('minWidth', 190).appendTo(bar).dxSelectBox({
        label: 'Trạng thái hồ sơ', labelMode: 'static', dataSource: [{ id: '', text: 'Tất cả trạng thái' }, ...statuses], valueExpr: 'id', displayExpr: 'text', value: '',
        onValueChanged: e => { filters.status = e.value; reload(); }
      }).dxSelectBox('instance');
      const branch = $('<div>').css('minWidth', 200).appendTo(bar).dxSelectBox({
        label: 'Chi nhánh tiếp nhận', labelMode: 'static', dataSource: isReceptionist() ? branches.filter(b => b.id === activeBranchId) : [{ id: '', branch_name: 'Tất cả trong phạm vi' }, ...branches],
        valueExpr: 'id', displayExpr: 'branch_name', value: filters.branch_id, readOnly: isReceptionist(), searchEnabled: true,
        onValueChanged: e => { filters.branch_id = e.value; reload(); }
      }).dxSelectBox('instance');
      button(bar, { icon: 'revert', hint: 'Đặt lại bộ lọc', onClick: () => { search.option('value', ''); status.option('value', ''); branch.option('value', activeBranchId || ''); } });
      button(bar, { icon: 'refresh', hint: 'Tải lại danh sách hội viên', onClick: refresh });
      const panel = $('<div class="card-panel">').appendTo(view);
      const count = $('<div class="card-panel-header">').css('padding', '12px 16px').appendTo(panel);
      const errors = $('<div>').appendTo(panel);
      const source = new DevExpress.data.CustomStore({ key: 'id', load: async options => {
        const params = { page: Math.floor((options.skip || 0) / (options.take || 20)) + 1, limit: options.take || 20, ...filters };
        Object.keys(params).forEach(key => { if (params[key] === '') delete params[key]; });
        errors.empty();
        try {
          const response = await api().request('/members?' + new URLSearchParams(params), { headers: { 'x-branch-id': filters.branch_id || 'ALL' } });
          const rows = list(response);
          if (rows.some(m => (!user.is_all_branches && !user.branch_ids?.includes(m.home_branch_id)) || (isReceptionist() && m.home_branch_id !== activeBranchId))) throw new Error('Dữ liệu hội viên không khớp phạm vi chi nhánh.');
          const total = response.data?.total ?? rows.length;
          count.text(`${total} hội viên`); return { data: rows, totalCount: total };
        } catch (err) { count.text('Không thể tải danh sách'); errorBox(errors, err, refresh); throw err; }
      } });
      grid = $('<div>').appendTo(panel).dxDataGrid({
        dataSource: source, remoteOperations: { paging: true }, showBorders: false, rowAlternationEnabled: true,
        hoverStateEnabled: true, columnAutoWidth: true, wordWrapEnabled: true, columnHidingEnabled: true,
        errorRowEnabled: false, sorting: { mode: 'none' }, noDataText: isReceptionist() ? 'Không tìm thấy hội viên nào trong chi nhánh' : 'Không tìm thấy hội viên nào',
        loadPanel: { enabled: true, text: 'Đang tải...' }, paging: { pageSize: 20 }, pager: { visible: true, allowedPageSizes: [10, 20, 50], showPageSizeSelector: true, showInfo: true, showNavigationButtons: true },
        columns: [
          { dataField: 'member_code', caption: 'Mã HV', minWidth: 90, cellTemplate: (el, info) => $('<a href="#">').text(info.value).on('click', e => { e.preventDefault(); openDetail(info.data.id); }).appendTo(el) },
          { dataField: 'full_name', caption: 'Họ và tên', minWidth: 200, cellTemplate: (el, info) => {
            const row = $('<div>').css({ display: 'flex', gap: 10, alignItems: 'center' }).appendTo(el);
            if (info.data.avatar_url && /^https?:\/\//.test(info.data.avatar_url)) {
              $('<img class="member-avatar">').attr({ src: info.data.avatar_url, alt: info.value }).css({ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1px solid #237b58' }).appendTo(row);
            } else {
              $('<span class="member-initials">').css({ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', background: '#e4f3ef', color: '#185740', borderRadius: '50%' }).text((info.value || '').trim().split(/\s+/).slice(-2).map(s => s[0]).join('').toUpperCase()).appendTo(row);
            }
            $('<strong>').text(text(info.value)).appendTo(row);
          } },
          { dataField: 'phone', caption: 'Số điện thoại', minWidth: 125 },
          { dataField: 'email', caption: 'Email', minWidth: 180, hidingPriority: 0, customizeText: e => text(e.value) },
          { dataField: 'home_branch_name', caption: 'Chi nhánh', minWidth: 150, hidingPriority: 1 },
          { dataField: 'status', caption: 'Trạng thái hồ sơ', minWidth: 145, cellTemplate: (el, info) => badge(el, info.value) },
          { caption: 'Thao tác', width: 130, cellTemplate: (el, info) => {
            const actions = $('<div>').css({ display: 'flex', gap: 4 }).appendTo(el);
            button(actions, { icon: 'edit', hint: 'Sửa hồ sơ', stylingMode: 'text', onClick: () => openMemberModal(info.data.id) });
            button(actions, { icon: 'repeat', hint: 'Đổi trạng thái', stylingMode: 'text', onClick: () => openStatus(info.data.id) });
            button(actions, { icon: 'folder', hint: 'Xem đăng ký gói', stylingMode: 'text', onClick: () => quickRegisterPackage(info.data.id) });
          } }
        ]
      }).dxDataGrid('instance');
      if (context.action === 'create') await openMemberModal(null, context.phone || '');
      else if (context.member_id) await openDetail(context.member_id);
    } catch (err) { if (version === renderVersion && view[0]?.isConnected) { view.empty(); errorBox(view, err, () => render(containerId, context)); } }
  }
  function reload() { if (grid) { if (grid.pageIndex() === 0) grid.refresh(); else grid.pageIndex(0); } }
  function refresh() { if (grid && root?.[0]?.isConnected) return grid.refresh(); }
  async function getMember(id) {
    const member = (await api().members.getById(id)).data;
    if (!member?.id) throw new Error('Hồ sơ hội viên không tồn tại.');
    const context = user || (await api().auth.getMe()).data;
    if (!['QTV', 'RECEPTIONIST'].includes(activeRole(context))) throw new Error('Bạn không có quyền truy cập hồ sơ hội viên.');
    if (!context?.is_all_branches && !context?.branch_ids?.includes(member.home_branch_id)) throw new Error('Hồ sơ nằm ngoài phạm vi chi nhánh.');
    if (activeRole(context) === 'RECEPTIONIST' && api().getCurrentBranchId() && member.home_branch_id !== api().getCurrentBranchId()) throw new Error('Hồ sơ không thuộc chi nhánh trực quầy.');
    return member;
  }
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(file);
    });
  }

  function openCameraCapture(onSuccess) {
    const camDialog = popup('Chụp ảnh từ Camera tại quầy', 520);
    const body = $('<div style="padding:10px;text-align:center;">').appendTo(camDialog.content);
    const videoWrap = $('<div style="width:100%;max-width:420px;height:315px;margin:0 auto 12px;background:#1a1a1a;border-radius:8px;overflow:hidden;position:relative;display:grid;place-items:center;">').appendTo(body);
    const video = $('<video autoplay playsinline style="width:100%;height:100%;object-fit:cover;transform:scaleX(-1);">').appendTo(videoWrap)[0];
    const statusMsg = $('<div style="color:#888;font-size:12px;margin-bottom:12px;">').text('Đang kết nối camera...').appendTo(body);

    let localStream = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' } })
        .then(stream => {
          localStream = stream;
          video.srcObject = stream;
          statusMsg.text('Căn chỉnh khuôn mặt vào giữa khung hình rồi bấm "Chụp ảnh".');
        })
        .catch(err => {
          statusMsg.html(`<span style="color:#b5493a;">Không thể kết nối camera: ${err.message || 'Thiết bị không hỗ trợ'}. Vui lòng tải file ảnh từ máy.</span>`);
        });
    } else {
      statusMsg.html('<span style="color:#b5493a;">Trình duyệt không hỗ trợ truy cập camera. Vui lòng tải ảnh từ máy tính.</span>');
    }

    camDialog.instance.option('onHiding', () => {
      if (localStream) localStream.getTracks().forEach(t => t.stop());
    });

    camDialog.instance.option('toolbarItems', [
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Đóng', onClick: () => camDialog.instance.hide() } },
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: {
        text: 'Chụp ảnh', type: 'default', stylingMode: 'contained', icon: 'camera',
        onClick: async event => {
          if (!localStream || !video.videoWidth) {
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
            camDialog.instance.hide();
          } catch (err) {
            statusMsg.html(`<span style="color:#b5493a;">Lỗi xử lý ảnh: ${err.message}</span>`);
            event.component.option('disabled', false);
          }
        }
      } }
    ]);
  }

  function renderAvatarField(container, getForm, initialUrl) {
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
      .on('click', () => openCameraCapture(url => {
        const form = getForm();
        if (form) form.option('formData').avatar_url = url;
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
        if (form) form.option('formData').avatar_url = url;
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
        if (form) form.option('formData').avatar_url = '';
        urlInput.val('');
        updatePreview('');
      });

    // 4. Ô nhập URL trực tiếp
    const urlInput = $('<input type="text" placeholder="Hoặc dán URL ảnh chân dung (https://...)" style="width:100%;font-size:12px;padding:6px 10px;border:1px solid #d2ded7;border-radius:4px;background:#fff;margin-top:2px;">')
      .val(initialUrl || '')
      .on('input change', function () {
        const val = $(this).val().trim();
        const form = getForm();
        if (form) form.option('formData').avatar_url = val;
        updatePreview(val);
      })
      .appendTo(controls);

    $('<small style="color:#748078;font-size:11px;display:block;margin-top:2px;">')
      .text('Ảnh chân dung hiển thị làm Avatar hồ sơ và dữ liệu nhận diện khuôn mặt Kiosk check-in.')
      .appendTo(controls);

    updatePreview(initialUrl);
  }

  async function openMemberModal(id = null, phone = '') {
    try {
      user = (await api().auth.getMe()).data;
      if (!['QTV', 'RECEPTIONIST'].includes(activeRole(user))) throw new Error('Bạn không có quyền sửa hồ sơ hội viên.');
      branches = allowedBranches(list(await api().request('/branches', { headers: { 'x-branch-id': 'ALL' } })));
      const member = id ? await getMember(id) : null;
      const selected = api().getCurrentBranchId();
      const branchId = member?.home_branch_id || (branches.some(b => b.id === selected) ? selected : branches.length === 1 ? branches[0].id : null);
      if (!branchId) throw new Error('Vui lòng chọn chi nhánh làm việc trước khi thêm hội viên.');
      if (!id && !branches.some(b => b.id === branchId && b.status === 'ACTIVE')) throw new Error('Chi nhánh tiếp nhận đang ngừng hoạt động.');
      const data = {
        full_name: member?.full_name || '',
        phone: member?.phone || phone,
        email: member?.email || '',
        home_branch_name: member?.home_branch_name || branchName(branchId),
        date_of_birth: dateOnly(member?.date_of_birth),
        avatar_url: member?.avatar_url || ''
      };
      let dialog, phoneTimer;
      const phoneRules = [required('Số điện thoại'), { type: 'custom', message: 'Số điện thoại Việt Nam gồm 10 chữ số, bắt đầu bằng 0', validationCallback: e => validPhone(e.value) }];
      if (!id) phoneRules.push({ type: 'async', message: 'Số điện thoại đã tồn tại', ignoreEmptyValue: true, validationCallback: async e => {
        const value = normalizePhone(e.value);
        if (!validPhone(value)) return false;
        const result = await api().members.searchPhone(value);
        if (dialog && normalizePhone(dialog.form.option('formData').phone) === value) {
          dialog.content.find('.phone-existing-profile').remove();
          if (result.data?.exists && result.data?.member?.id) $('<a href="#" class="phone-existing-profile">').text('Mở hồ sơ đã tồn tại').on('click', event => { event.preventDefault(); dialog.instance.hide(); openDetail(result.data.member.id); }).appendTo(dialog.content);
        }
        return !result.data?.exists;
      } });
      dialog = editDialog(id ? 'Sửa hồ sơ hội viên' : 'Thêm mới hồ sơ hội viên', data, [
        field('full_name', 'Họ và tên', 'dxTextBox', { maxLength: 150 }, [required('Họ và tên'), { type: 'custom', message: 'Vui lòng nhập họ và tên', validationCallback: e => Boolean(e.value?.trim()) }]),
        field('phone', 'Số điện thoại', 'dxTextBox', { mode: 'tel', readOnly: Boolean(id), valueChangeEvent: 'input' }, phoneRules),
        field('email', 'Email', 'dxTextBox', { mode: 'email', maxLength: 254 }, [{ type: 'email', ignoreEmptyValue: true, message: 'Email không đúng định dạng' }]),
        field('home_branch_name', 'Chi nhánh tiếp nhận', 'dxTextBox', { readOnly: true }, [required('Chi nhánh tiếp nhận')]),
        field('date_of_birth', 'Ngày sinh', 'dxDateBox', { type: 'date', displayFormat: 'dd/MM/yyyy', dateSerializationFormat: 'yyyy-MM-dd', max: new Date(), showClearButton: true, invalidDateMessage: 'Ngày sinh không hợp lệ' }),
        {
          dataField: 'avatar_url',
          label: { text: 'Avatar & Đăng ký khuôn mặt' },
          template: (formData, itemElement) => {
            renderAvatarField(itemElement, () => dialog?.form, data.avatar_url);
          }
        }
      ], async values => {
        const avatarUrl = values.avatar_url?.trim() || null;
        const payload = {
          full_name: values.full_name.trim().replace(/\s+/g, ' '),
          email: values.email?.trim() || null,
          date_of_birth: dateOnly(values.date_of_birth),
          avatar_url: avatarUrl,
          face_enrolled: Boolean(avatarUrl)
        };
        const response = id ? await api().members.update(id, payload) : await api().members.create({ ...payload, phone: normalizePhone(values.phone), home_branch_id: branchId });
        notify(id ? 'Đã cập nhật hồ sơ hội viên' : 'Đã thêm hội viên'); refresh();
        if (!id && response.data?.id) openDetail(response.data.id);
      }, { skipUnchanged: Boolean(id), phoneDuplicate: !id, saveText: id ? 'Lưu thay đổi' : 'Thêm hội viên',
        onChange: e => { if (!id && e.dataField === 'phone') { clearTimeout(phoneTimer); phoneTimer = setTimeout(() => { if (dialog?.host.closest('body').length) dialog.form.getEditor('phone').element().dxValidator('instance')?.validate(); }, 350); } }
      });
    } catch (err) { notify(err.message, 'error'); }
  }
  async function openStatus(id) {
    try {
      const member = await getMember(id);
      editDialog('Đổi trạng thái hội viên', { member: `${member.member_code} - ${member.full_name}`, current_status: statusText(member.status), status: null, reason: '' }, [
        field('member', 'Hội viên', 'dxTextBox', { readOnly: true }), field('current_status', 'Trạng thái hiện tại', 'dxTextBox', { readOnly: true }),
        field('status', 'Trạng thái mới', 'dxSelectBox', { dataSource: statuses.filter(s => s.id !== member.status), valueExpr: 'id', displayExpr: 'text' }, [required('Trạng thái mới')]),
        field('reason', 'Lý do đổi trạng thái', 'dxTextArea', { height: 90, maxLength: 1000 })
      ], async data => {
        await api().request(`/members/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status: data.status, reason: data.reason.trim() || null } });
        notify('Đã cập nhật trạng thái hội viên'); refresh();
      });
    } catch (err) { notify(err.message, 'error'); }
  }
  function details(parent, rows) {
    const table = $('<dl>').css({ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(0, 2fr)', gap: '10px 16px', margin: '16px 0' }).appendTo(parent);
    rows.forEach(([label, value]) => { $('<dt>').css('color', 'var(--text-muted, #667085)').text(label).appendTo(table); $('<dd>').css({ margin: 0, overflowWrap: 'anywhere' }).text(text(value)).appendTo(table); });
  }
  function detailGrid(parent, rows, columns, empty) {
    return $('<div>').appendTo(parent).dxDataGrid({ dataSource: rows, columns, columnAutoWidth: true, wordWrapEnabled: true, showBorders: false, rowAlternationEnabled: true, noDataText: empty, paging: { pageSize: 10 }, pager: { showInfo: true } }).dxDataGrid('instance');
  }

  function openRoadmapModal(reg) {
    const d = popup(`Tiến độ & Lộ trình tập luyện: ${reg.package_name_snapshot || 'Gói tập'}`, 680);
    d.content.empty().html('<div style="padding: 24px; text-align: center; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>Đang tải tiến độ học tập...</div>');
    api().request(`/pt-bookings?registration_id=${encodeURIComponent(reg.id)}`, { headers: { 'x-branch-id': 'ALL' } })
      .then(res => {
        const bookings = list(res).sort((a, b) => new Date(`${a.booking_date}T${a.start_time || '00:00'}`) - new Date(`${b.booking_date}T${b.start_time || '00:00'}`));
        const completed = bookings.filter(b => b.status === 'COMPLETED');
        const booked = bookings.filter(b => ['BOOKED', 'CONFIRMED'].includes(b.status));
        const pending = bookings.filter(b => ['PENDING', 'PENDING_COMPLETION', 'PENDING_CONFIRMATION'].includes(b.status));
        const total = Number(reg.total_pt_sessions_snapshot || reg.total_pt_sessions || 0);
        const used = Number(reg.used_pt_sessions || completed.length);
        const remaining = Number(reg.remaining_pt_sessions ?? Math.max(0, total - used));
        const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

        d.content.empty();
        const header = $('<div style="background: #f8faf9; border: 1px solid #dfe6e2; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px;">').appendTo(d.content);
        header.html(`
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 14px; color: #185740;">Tiến độ hoàn thành: ${used} / ${total} buổi (${pct}%)</strong>
            <span style="font-size: 12px; color: #586b5e;">Còn lại: <strong style="color: #237b58;">${remaining} buổi</strong></span>
          </div>
          <div style="height: 8px; background: #e2ece5; border-radius: 4px; overflow: hidden; margin-bottom: 10px;">
            <div style="height: 100%; width: ${pct}%; background: #237b58; border-radius: 4px; transition: width 0.3s;"></div>
          </div>
          <div style="display: flex; gap: 14px; font-size: 12px; color: #475569; flex-wrap: wrap;">
            <span><i class="fa-solid fa-circle-check" style="color: #237b58; margin-right: 4px;"></i>Đã hoàn thành: <strong>${used}</strong></span>
            <span><i class="fa-solid fa-calendar-check" style="color: #0284c7; margin-right: 4px;"></i>Đang đặt lịch: <strong>${booked.length}</strong></span>
            ${pending.length ? `<span><i class="fa-solid fa-clock" style="color: #d97706; margin-right: 4px;"></i>Chờ xác nhận: <strong>${pending.length}</strong></span>` : ''}
            <span><i class="fa-solid fa-dumbbell" style="color: #748078; margin-right: 4px;"></i>Tổng số buổi: <strong>${total}</strong></span>
          </div>
        `);

        if (!bookings.length) {
          $('<div style="text-align: center; padding: 32px 16px; color: #748078;">')
            .html('<i class="fa-solid fa-dumbbell" style="font-size: 32px; color: #b2d988; margin-bottom: 8px; display: block;"></i>Gói tập chưa có buổi tập nào được xếp trên hệ thống.')
            .appendTo(d.content);
          return;
        }

        $('<div style="font-size: 13px; font-weight: 700; color: #185740; margin-bottom: 8px;">Danh sách buổi học theo lộ trình:</div>').appendTo(d.content);
        const timeline = $('<div style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; padding-right: 4px;">').appendTo(d.content);
        bookings.forEach((b, idx) => {
          const item = $('<div style="background: #fff; border: 1px solid #dfe6e2; border-radius: 6px; padding: 12px 14px;">').appendTo(timeline);
          const isComp = b.status === 'COMPLETED';
          const isBooked = ['BOOKED', 'CONFIRMED'].includes(b.status);
          const badgeClass = isComp ? 'badge-success' : isBooked ? 'badge-info' : b.status === 'CANCELLED' ? 'badge-danger' : 'badge-warning';
          const badgeText = isComp ? 'Hoàn thành' : isBooked ? 'Đã đặt lịch' : b.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ xác nhận';

          item.html(`
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="font-size: 13px; color: #185740;">Buổi ${b.session_number || (idx + 1)} · ${b.booking_date ? new Date(b.booking_date).toLocaleDateString('vi-VN') : ''} (${(b.start_time || '').slice(0, 5)} - ${(b.end_time || '').slice(0, 5)})</strong>
              <span class="status-badge ${badgeClass}" style="font-size: 10px;">${badgeText}</span>
            </div>
            <div style="font-size: 12px; color: #586b5e; margin-bottom: 4px;"><strong>Huấn luyện viên:</strong> ${text(b.pt_name || 'Chưa phân công')}</div>
            ${isComp ? `
              <div style="font-size: 12px; color: #26332e; margin-bottom: 4px;"><strong>Bài tập:</strong> ${text(b.workout_notes || 'Chưa ghi chú')}</div>
              <div style="font-size: 12px; color: #586b5e;"><strong>Đánh giá thể lực:</strong> ${text(b.fitness_assessment || 'Chưa có đánh giá')}</div>
            ` : ''}
          `);
        });
      })
      .catch(err => {
        d.content.empty();
        errorBox(d.content, err, () => openRoadmapModal(reg));
      });
  }


  async function openDetail(id) {
    const context = user || (await api().auth.getMe()).data;
    if (activeRole(context) === 'QTV') return openQtvDetail(id, context);
    return openLegacyDetail(id);
  }

  async function openQtvDetail(id, context) {
    if (detailPopup && popups.has(detailPopup)) {
      detailPopup.option('animation', null);
      detailPopup.hide();
    }
    const dialog = popup('Hồ sơ hội viên', 1180);
    detailPopup = dialog.instance;
    let closed = false;
    dialog.instance.option('onHiding', () => { closed = true; });
    dialog.instance.option({ height: '90vh', maxWidth: '96vw', wrapperAttr: { class: 'qtv-member-profile-popup' } });
    const shell = $('<div class="qtv-member-profile">').appendTo(dialog.content);
    const scopeId = api().getCurrentBranchId();
    const alive = () => !closed && dialog.host.closest('body').length && api().getCurrentBranchId() === scopeId;
    const permissions = context.permissions || {};
    const financial = Array.isArray(permissions) ? permissions.includes('view_financial') || permissions.includes('*') : permissions.view_financial === true;
    const request = async path => {
      if (!alive()) throw new Error('Phạm vi chi nhánh đã thay đổi. Vui lòng mở lại hồ sơ.');
      const response = await api().request(path);
      if (!alive()) throw new Error('Phạm vi chi nhánh đã thay đổi. Vui lòng mở lại hồ sơ.');
      return response.data;
    };
    let overviewPromise;
    function overview() {
      if (!overviewPromise) overviewPromise = request('/members/' + encodeURIComponent(id) + '/overview-data').then(data => {
        for (const key of ['registrations', 'bookings', 'community_registrations']) {
          if (!Array.isArray(data?.[key])) throw new Error('Dữ liệu hồ sơ không đầy đủ: ' + key);
        }
        if (data.profile?.id !== id || !Array.isArray(data.group_invitations?.sent) || !Array.isArray(data.group_invitations?.received)) throw new Error('Dữ liệu hồ sơ hoặc lời mời nhóm không đầy đủ.');
        return { ...data,
          registrations: data.registrations.map(row => ({ ...row, member_relationship: row.is_group_member === true ? 'PARTICIPANT' : row.member_id === id ? 'OWNER' : null })),
          group_invitations: ['received', 'sent'].flatMap(direction => data.group_invitations[direction].map(row => ({ ...row, direction, status: row.invitation_status })))
        };
      }).catch(err => { overviewPromise = null; throw err; });
      return overviewPromise;
    }
    async function allPayments() {
      const result = [], seen = new Set();
      for (let page = 1; ; page++) {
        const data = await request('/payments?' + new URLSearchParams({ member_id: id, page, limit: 100 }));
        if (!Array.isArray(data?.items) || !Number.isInteger(data.total) || data.total < 0) throw new Error('Không thể xác định đầy đủ lịch sử thanh toán.');
        for (const row of data.items) {
          if (!row.id || seen.has(row.id)) throw new Error('Lịch sử thanh toán thay đổi khi tải. Vui lòng thử lại.');
          seen.add(row.id); result.push(row);
        }
        if (result.length === data.total) return result.filter(row => row.member_id === id && row.confirmed_at);
        if (!data.items.length || result.length > data.total) throw new Error('Lịch sử thanh toán chưa tải đầy đủ. Vui lòng thử lại.');
      }
    }


    const labels = {
      ACTIVE: 'Đang hiệu lực',
      FROZEN: 'Đang đóng băng',
      EXPIRED: 'Đã hết hạn',
      COMPLETED: 'Hoàn thành',
      CANCELLED: 'Đã hủy',
      PENDING_PAYMENT: 'Chờ thanh toán',
      PENDING: 'Chờ xác nhận',
      CONFIRMED: 'Đã đặt lịch',
      ACCEPTED: 'Đã chấp nhận',
      REJECTED: 'Đã từ chối',
      REVOKED: 'Đã thu hồi',
      NO_SHOW: 'Vắng mặt',
      ATTENDED: 'Đã tham gia',
      IN: 'Vào cổng',
      OUT: 'Ra cổng',
      CASH: 'Tiền mặt',
      BANK_TRANSFER: 'Chuyển khoản',
      sent: 'Đã gửi',
      received: 'Đã nhận',
      OWNER: 'Chủ gói',
      PARTICIPANT: 'Thành viên nhóm'
    };
    Object.assign(labels, {
      BOOKED: 'Đã đặt lịch',
      PENDING_COMPLETION: 'Chờ xác nhận',
      PENDING_CONFIRMATION: 'Chờ xác nhận',
      EXPIRING: 'Sắp hết hạn',
      SCHEDULED: 'Chưa tới thời gian hiệu lực',
      EXHAUSTED: 'Hết lượt',
      GROUP_1_N: 'PT kèm nhóm',
      GROUP_PT: 'PT kèm nhóm',
      ONE_ON_ONE: 'PT cá nhân 1-1',
      INDIVIDUAL: 'Cá nhân'
    });
    const translated = value => labels[value] || text(value);
    const col = (dataField, caption, width) => ({ dataField, caption, ...(width ? { width } : { minWidth: 170 }), encodeHtml: true });
    function statusCell(cell, info) {
      const value = info.value;
      const isFrozen = info.data?.is_frozen || value === 'FROZEN';
      const effectiveVal = isFrozen ? 'FROZEN' : value;
      const tone = ['ACTIVE', 'COMPLETED', 'ACCEPTED', 'ATTENDED'].includes(effectiveVal) ? 'success'
        : ['PENDING', 'PENDING_PAYMENT', 'PENDING_COMPLETION', 'PENDING_CONFIRMATION', 'EXPIRING'].includes(effectiveVal) ? 'warning'
          : ['CANCELLED', 'EXPIRED', 'EXHAUSTED', 'REJECTED', 'REVOKED', 'NO_SHOW', 'INACTIVE'].includes(effectiveVal) ? 'danger'
            : ['CONFIRMED', 'BOOKED', 'FROZEN', 'SCHEDULED', 'ARCHIVED'].includes(effectiveVal) ? 'info' : 'neutral';
      const badge = $('<span>').addClass('status-badge badge-' + tone).appendTo(cell);
      $('<span class="status-dot" aria-hidden="true">').appendTo(badge);
      $('<span>').text(translated(effectiveVal)).appendTo(badge);
    }
    const stateCol = { ...col('status', 'Trạng thái', 155), customizeText: e => translated(e.value), cellTemplate: statusCell };
    const calendar = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('/') : text(value);
    const dateCol = (field, caption) => ({ ...col(field, caption, 125), customizeText: e => calendar(e.value) });
    function dayOf(row, field) {
      const value = row[field];
      if (!value) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const zone = row.branch_timezone || row.timezone || branches.find(b => b.id === (row.branch_id || row.sold_branch_id))?.timezone;
      const valueDate = new Date(value);
      if (!zone || !Number.isFinite(valueDate.getTime())) return String(value).slice(0, 10);
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(valueDate);
      return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('-');
    }
    function stamp(row, field) {
      const value = row[field], zone = row.branch_timezone || row.timezone || branches.find(b => b.id === (row.branch_id || row.sold_branch_id))?.timezone;
      if (!value || !zone || !Number.isFinite(new Date(value).getTime())) return text(value);
      return new Intl.DateTimeFormat('vi-VN', { timeZone: zone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
    }
    const timestampCol = (field, caption) => ({ caption, width: 165, calculateCellValue: row => stamp(row, field) });
    const tableFilters = new Map();
    function table(parent, rows, columns, dateField, options = {}) {
      const toolbar = $('<div class="qtv-member-profile-filters">').appendTo(parent);
      const filterKey = parent.closest('section').find('h3').first().text();
      const saved = tableFilters.get(filterKey) || {};
      let { query = '', status = null, from = null, to = null, method = null } = saved;
      let instance;
      const rowStatus = row => row.display_status || row.status;
      function control(label) {
        const field = $('<div class="qtv-member-profile-filter">').appendTo(toolbar);
        $('<div class="qtv-member-profile-filter-label">').text(label).appendTo(field);
        return $('<div>').appendTo(field);
      }
      const warning = $('<div class="qtv-member-profile-warning" role="alert">').hide().appendTo(parent);
      function apply() {
        tableFilters.set(filterKey, { query, status, from, to, method });
        const invalid = from && to && from > to;
        warning.toggle(!!invalid).text(invalid ? 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.' : '');
        instance?.option('dataSource', invalid ? [] : rows.filter(row => {
          const day = dateField && dayOf(row, dateField);
          const statusMatch = !status ? true : (options.statusMatcher ? options.statusMatcher(row, status) : rowStatus(row) === status);
          return statusMatch && (!method || row.payment_method === method) && (!from || day >= from) && (!to || day <= to) && (!query || columns.some(c => String(c.calculateCellValue ? c.calculateCellValue(row) : row[c.dataField] ?? '').toLocaleLowerCase('vi').includes(query)));
        }));
      }
      control('Tìm kiếm').dxTextBox({ value: query, placeholder: 'Tìm kiếm', mode: 'search', valueChangeEvent: 'input', inputAttr: { 'aria-label': 'Tìm kiếm' }, onValueChanged: e => { query = (e.value || '').trim().toLocaleLowerCase('vi'); apply(); } });
      if (options.statusFilter !== false && (options.statusOptions || rows.some(row => rowStatus(row)))) {
        const ds = options.statusOptions || [...new Set(rows.map(rowStatus).filter(Boolean))].map(value => ({ value, label: translated(value) }));
        control('Trạng thái').dxSelectBox({ value: status, dataSource: ds, valueExpr: 'value', displayExpr: 'label', placeholder: 'Tất cả trạng thái', showClearButton: true, inputAttr: { 'aria-label': 'Trạng thái' }, onValueChanged: e => { status = e.value; apply(); } });
      }
      if (options.paymentMethod) control('Phương thức').dxSelectBox({ value: method, dataSource: [...new Set(rows.map(row => row.payment_method).filter(Boolean))].map(value => ({ value, label: translated(value) })), valueExpr: 'value', displayExpr: 'label', placeholder: 'Tất cả phương thức', showClearButton: true, inputAttr: { 'aria-label': 'Phương thức' }, onValueChanged: e => { method = e.value; apply(); } });
      if (dateField) ['Từ ngày', 'Đến ngày'].forEach((label, index) => control(label).dxDateBox({ value: index ? to : from, type: 'date', displayFormat: 'dd/MM/yyyy', dateSerializationFormat: 'yyyy-MM-dd', showClearButton: true, inputAttr: { 'aria-label': label }, onValueChanged: e => { if (index) to = dateOnly(e.value); else from = dateOnly(e.value); apply(); } }));
      let receiptHost;
      const displayedColumns = options.paymentMethod ? [...columns, { caption: 'Phiếu thu', width: 90, cellTemplate: (cell, info) => button(cell, {
        icon: 'fa-solid fa-receipt', hint: 'Xem phiếu thu', elementAttr: { 'aria-label': 'Xem phiếu thu' }, onClick: () => {
          receiptHost.empty();
          section(receiptHost, 'Chi tiết phiếu thu', async () => {
            const receipt = await request('/payments/' + encodeURIComponent(info.data.id) + '/receipt');
            if (receipt?.payment_id !== info.data.id) throw new Error('Phiếu thu không khớp giao dịch đã chọn.');
            return receipt;
          }, (body, receipt) => {
            button(body, { icon: 'close', hint: 'Đóng phiếu thu', onClick: () => receiptHost.empty() });
            details(body, [['Mã phiếu thu', receipt.receipt_code], ['Mã thanh toán', receipt.payment_code], ['Mã đăng ký', receipt.reg_code], ['Người nộp', receipt.payer_name], ['Số điện thoại', receipt.payer_phone], ['Gói tập', receipt.package_name_snapshot], ['Số tiền', receipt.amount == null ? null : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(receipt.amount)], ['Phương thức', translated(receipt.payment_method)], ['Chi nhánh', receipt.branch_name], ['Người lập', receipt.issued_by_name], ['Ngày lập', stamp({ ...receipt, branch_id: info.data.branch_id }, 'issued_at')], ['Ghi chú', receipt.note]]);
            body[0].scrollIntoView({ block: 'nearest' });
          });
        }
      }) }] : columns;
      instance = detailGrid(parent, rows, displayedColumns);
      if (options.paymentMethod) receiptHost = $('<div class="qtv-member-profile-receipt">').appendTo(parent);
      if (options.registrationDetail) instance.option('masterDetail', { enabled: true, template: (container, info) => {
        const row = info.data;
        const total = Number(row.total_pt_sessions_snapshot || 0);
        const isPt = row.package_type_snapshot === 'PT_SESSION' || row.package_type_snapshot === 'COMBO' || total > 0;
        if (isPt) {
          const used = Number(row.used_pt_sessions || 0);
          const booked = Number(row.booked_pt_sessions || 0);
          const rem = Number(row.remaining_pt_sessions ?? Math.max(0, total - used));
          const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
          const progressCard = $('<div style="background: #f8faf9; border: 1px solid #dfe6e2; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">').appendTo(container);
          const left = $('<div style="flex: 1; min-width: 240px;">').appendTo(progressCard);
          left.html(`
            <div style="font-size: 13px; font-weight: 700; color: #185740; margin-bottom: 4px;">
              Tiến độ học tập PT: ${used}/${total} buổi hoàn thành (${pct}%)
            </div>
            <div style="font-size: 12px; color: #586b5e; margin-bottom: 8px;">
              Đã hoàn thành: <strong>${used}</strong> · Đang đặt lịch: <strong>${booked}</strong> · Còn lại: <strong>${rem}</strong> buổi
            </div>
            <div style="height: 8px; background: #e2ece5; border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${pct}%; background: #237b58; border-radius: 4px;"></div>
            </div>
          `);
          button(progressCard, {
            text: 'Xem chi tiết lộ trình buổi học',
            icon: 'fa-solid fa-route',
            stylingMode: 'contained',
            type: 'default',
            elementAttr: { style: 'background: #237b58; color: #fff; font-size: 12px;' },
            onClick: () => openRoadmapModal(row)
          });
        }
        details(container, [['Chế độ gói', translated(row.package_mode)], ['Huấn luyện viên', row.assigned_pt_name], ['Chi nhánh sử dụng', Array.isArray(row.allowed_branches) ? row.allowed_branches.map(b => b.branch_name).join(', ') : null], ['Tổng lượt Gym của gói', row.total_gym_sessions_snapshot], ['Lượt Gym còn lại của gói', row.remaining_gym_sessions], ['Tổng buổi PT của gói', row.total_pt_sessions_snapshot], ['Buổi PT đã dùng của gói', row.used_pt_sessions], ['Buổi PT đã đặt của gói', row.booked_pt_sessions], ['Buổi PT còn lại của gói', row.remaining_pt_sessions]]);
      } });
      apply();
    }
    async function section(parent, title, loader, render) {
      const block = $('<section class="qtv-member-profile-section">').appendTo(parent);
      $('<h3>').text(title).appendTo(block);
      const body = $('<div>').appendTo(block);
      async function load() {
        body.empty().append($('<p role="status">').text('Đang tải dữ liệu...'));
        try {
          const data = await loader();
          if (!alive() || !body.closest('body').length) return;
          body.empty(); render(body, data);
        } catch (err) {
          if (!closed && body.closest('body').length) { body.empty(); errorBox(body, err, load); }
        }
      }
      await load();
    }
    const registrationColumns = [
      col('reg_code', 'Mã đăng ký', 105),
      col('package_name_snapshot', 'Gói tập', 170),
      { ...col('display_status', 'Trạng thái', 140), calculateCellValue: row => row.display_status || row.status, customizeText: e => translated(e.value), cellTemplate: statusCell },
      {
        caption: 'Tiến độ học tập', width: 165, alignment: 'center',
        cellTemplate: (cell, info) => {
          const r = info.data;
          const total = Number(r.total_pt_sessions_snapshot || 0);
          const isPt = r.package_type_snapshot === 'PT_SESSION' || r.package_type_snapshot === 'COMBO' || total > 0;
          if (!isPt) {
            if (r.total_gym_sessions_snapshot) {
              $('<span style="font-size: 12px; color: #586b5e;">').text(`Gym: còn ${r.remaining_gym_sessions ?? '--'} lượt`).appendTo(cell);
            } else {
              $('<span style="font-size: 12px; color: #87938c;">').text('--').appendTo(cell);
            }
            return;
          }
          const used = Number(r.used_pt_sessions || 0);
          const rem = Number(r.remaining_pt_sessions ?? Math.max(0, total - used));
          const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
          const wrap = $('<div style="display: flex; flex-direction: column; gap: 3px; padding: 2px 0;">').appendTo(cell);
          const top = $('<div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600;">').appendTo(wrap);
          $('<span style="color: #185740;">').text(`${used}/${total} buổi (${pct}%)`).appendTo(top);
          $('<span style="color: #748078;">').text(`Còn ${rem}`).appendTo(top);
          const bar = $('<div style="height: 6px; background: #e2ece5; border-radius: 3px; overflow: hidden;">').appendTo(wrap);
          $('<div style="height: 100%; background: #237b58; border-radius: 3px;">').css('width', `${pct}%`).appendTo(bar);
        }
      },
      {
        caption: 'Lộ trình', width: 95, alignment: 'center',
        cellTemplate: (cell, info) => {
          const r = info.data;
          const isPt = r.package_type_snapshot === 'PT_SESSION' || r.package_type_snapshot === 'COMBO' || Number(r.total_pt_sessions_snapshot) > 0;
          if (!isPt) {
            $('<span>').css('color', '#87938c').text('--').appendTo(cell);
            return;
          }
          button(cell, {
            text: 'Tiến độ',
            icon: 'fa-solid fa-route',
            stylingMode: 'outlined',
            elementAttr: { style: 'font-size: 11px; padding: 2px 6px; height: 26px; color: #237b58;' },
            onClick: () => openRoadmapModal(r)
          });
        }
      },
      { ...col('member_relationship', 'Vai trò', 95), customizeText: e => translated(e.value) },
      dateCol('start_date', 'Bắt đầu'),
      dateCol('end_date', 'Kết thúc'),
      col('branch_name', 'Chi nhánh', 125)
    ];
    const bookingColumns = [dateCol('booking_date', 'Ngày tập'), col('start_time', 'Bắt đầu', 100), col('end_time', 'Kết thúc', 100), col('pt_name', 'Huấn luyện viên'), stateCol, { caption: 'Quan hệ', width: 170, calculateCellValue: row => row.is_group_participant === true ? 'Tham gia buổi nhóm' : row.member_id === id ? 'Người đặt lịch' : '-' }, col('session_number', 'Buổi thứ', 90), timestampCol('pt_confirmed_at', 'PT xác nhận'), timestampCol('member_confirmed_at', 'Hội viên xác nhận'), col('workout_notes', 'Nội dung buổi tập'), col('fitness_assessment', 'Đánh giá thể lực')];
    try {
      shell.append($('<p role="status">').text('Đang tải hồ sơ...'));
      const member = (await overview()).profile;
      if (!alive()) return;
      shell.empty();
      dialog.instance.option('title', text(member.member_code) + ' - ' + text(member.full_name));
      const sidebar = $('<aside class="qtv-member-profile-sidebar">').appendTo(shell);
      if (/^https?:\/\//i.test(member.avatar_url || '')) $('<img class="qtv-member-profile-avatar">').attr({ src: member.avatar_url, alt: member.full_name || '' }).appendTo(sidebar);
      $('<h2>').text(text(member.full_name)).appendTo(sidebar);
      $('<p>').text(text(member.member_code)).appendTo(sidebar);
      badge(sidebar, member.status);
      $('<p>').text(text(member.phone)).appendTo(sidebar);
      $('<p>').text(text(member.home_branch_name)).appendTo(sidebar);
      const nav = $('<nav aria-label="Thông tin hội viên">').appendTo(sidebar);
      const main = $('<main class="qtv-member-profile-main">').appendTo(shell);
      const tabs = [
        ['packages', 'Gói của tôi', 'fa-ticket'],
        ['schedule', 'Lịch tập', 'fa-calendar-days'],
        ...(financial ? [['payments', 'Thanh toán', 'fa-credit-card']] : []),
        ['account', 'Tài khoản', 'fa-user']
      ];
      const buttons = new Map();
      const selectedSubTabs = new Map();
      let activeTab = 'packages';
      function subTabs(parent, entries) {
        const host = $('<div>').appendTo(parent);
        const content = $('<div>').appendTo(parent);
        const tab = activeTab;
        function show(index) { selectedSubTabs.set(tab, index); content.empty(); entries[index][1](content); }
        const index = selectedSubTabs.get(tab) || 0;
        host.dxTabs({ items: entries.map(([label]) => ({ text: label })), selectedIndex: index, scrollByContent: true, showNavButtons: true, onSelectionChanged: e => show(e.component.option('selectedIndex')) });
        show(index);
      }
      function renderTab(key) {
        activeTab = key;
        main.empty(); buttons.forEach((btn, name) => btn.attr('aria-current', name === key ? 'page' : null).toggleClass('is-active', name === key));
        if (key === 'schedule') {
          subTabs(main, [
            ['PT', body => section(body, 'Lịch PT', overview, (el, data) => {
              if (data.booking_participants_available === false) $('<p class="qtv-member-profile-warning" role="alert">').text('Hệ thống chưa có dữ liệu người tham gia buổi nhóm. Danh sách chỉ bao gồm lịch do hội viên đứng tên.').appendTo(el);
              table(el, data.bookings, bookingColumns, 'booking_date', {
                statusOptions: [
                  { value: 'COMPLETED', label: 'Hoàn thành' },
                  { value: 'BOOKED', label: 'Đã đặt lịch' },
                  { value: 'PENDING', label: 'Chờ xác nhận' },
                  { value: 'CANCELLED', label: 'Đã hủy' }
                ],
                statusMatcher: (row, target) => {
                  if (target === 'COMPLETED') return row.status === 'COMPLETED';
                  if (target === 'BOOKED') return row.status === 'BOOKED' || row.status === 'CONFIRMED';
                  if (target === 'PENDING') return ['PENDING', 'PENDING_CONFIRMATION', 'PENDING_COMPLETION', 'AWAITING_CONFIRMATION'].includes(row.status);
                  if (target === 'CANCELLED') return row.status === 'CANCELLED';
                  return row.status === target;
                }
              });
            })],
            ['Lớp cộng đồng', body => section(body, 'Lớp đã đăng ký', overview, (el, data) => table(el, data.community_registrations, [
              col('title', 'Lớp học'),
              dateCol('class_date', 'Ngày học'),
              col('start_time', 'Bắt đầu', 100),
              col('end_time', 'Kết thúc', 100),
              col('instructor_name', 'Huấn luyện viên'),
              col('branch_name', 'Chi nhánh'),
              stateCol
            ], 'class_date', {
              statusOptions: [
                { value: 'CONFIRMED', label: 'Đã đăng ký' },
                { value: 'COMPLETED', label: 'Hoàn thành' },
                { value: 'CANCELLED', label: 'Đã hủy' }
              ],
              statusMatcher: (row, target) => {
                if (target === 'CONFIRMED') return row.status === 'CONFIRMED' || row.class_status === 'OPEN';
                if (target === 'COMPLETED') return row.status === 'COMPLETED' || row.status === 'ATTENDED';
                if (target === 'CANCELLED') return row.status === 'CANCELLED';
                return row.status === target;
              }
            }))]
          ]);
        } else if (key === 'packages') {
          subTabs(main, [
            ['Gói đã đăng ký', body => section(body, 'Gói đã đăng ký', overview, (el, data) => table(el, data.registrations, registrationColumns, 'start_date', {
              registrationDetail: true,
              statusOptions: [
                { value: 'ACTIVE', label: 'Đang hiệu lực' },
                { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
                { value: 'SCHEDULED', label: 'Chưa tới thời gian hiệu lực' },
                { value: 'FROZEN', label: 'Đang đóng băng' },
                { value: 'EXPIRING', label: 'Sắp hết hạn' },
                { value: 'CANCELLED', label: 'Đã hủy' },
                { value: 'EXPIRED', label: 'Đã hết hạn' }
              ],
              statusMatcher: (row, target) => {
                const s = row.status;
                const isFrozen = row.is_frozen === true || s === 'FROZEN';
                const isExpiring = row.display_status === 'EXPIRING' || row.is_expiring === true;
                if (target === 'ACTIVE') return (s === 'ACTIVE' || row.display_status === 'ACTIVE') && !isFrozen && !isExpiring;
                if (target === 'PENDING_PAYMENT') return s === 'PENDING_PAYMENT';
                if (target === 'SCHEDULED') return s === 'SCHEDULED';
                if (target === 'FROZEN') return isFrozen;
                if (target === 'EXPIRING') return isExpiring;
                if (target === 'CANCELLED') return s === 'CANCELLED';
                if (target === 'EXPIRED') return s === 'EXPIRED';
                return (row.display_status || s) === target;
              }
            }))],
            ['Lời mời nhóm', body => section(body, 'Lời mời nhóm', overview, (el, data) => table(el, data.group_invitations, [
              { ...col('direction', 'Chiều', 110), customizeText: e => translated(e.value) },
              col('package_name_snapshot', 'Gói tập'),
              col('inviter_name', 'Người mời'),
              col('recipient_name', 'Người nhận'),
              stateCol,
              timestampCol('created_at', 'Ngày gửi')
            ], 'created_at'))]
          ]);
        } else if (key === 'payments' && financial) {
          subTabs(main, [
            ['Đã thanh toán', body => section(body, 'Lịch sử thanh toán', allPayments, (el, rows) => table(el, rows, [col('payment_code', 'Mã thanh toán', 135), col('receipt_code', 'Phiếu thu', 125), col('package_name_snapshot', 'Gói tập'), { ...col('amount', 'Số tiền', 145), dataType: 'number', format: { type: 'fixedPoint', precision: 0 } }, { ...col('payment_method', 'Phương thức', 135), customizeText: e => translated(e.value) }, timestampCol('confirmed_at', 'Xác nhận lúc'), col('branch_name', 'Chi nhánh')], 'confirmed_at', { statusFilter: false, paymentMethod: true }))],
            ['Chờ thanh toán', body => section(body, 'Đăng ký chờ thanh toán', overview, (el, data) => table(el, data.registrations.filter(r => r.member_relationship === 'OWNER' && r.status === 'PENDING_PAYMENT'), registrationColumns, 'start_date', { registrationDetail: true }))]
          ]);
        } else if (key === 'account') {
          details(main, [['Họ và tên', member.full_name], ['Mã hội viên', member.member_code], ['Số điện thoại', member.phone], ['Email', member.email], ['Ngày sinh', calendar(member.date_of_birth)], ['Giới tính', ({ NAM: 'Nam', NU: 'Nữ', KHAC: 'Khác', MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' })[member.gender] || member.gender], ['Chi nhánh quản lý', member.home_branch_name]]);
        }
      }
      tabs.forEach(([key, label, icon]) => {
        const btn = $('<button type="button" class="qtv-member-profile-tab">').attr('data-member-tab', key).append($('<i aria-hidden="true">').addClass('fa-solid ' + icon)).append($('<span>').text(label)).on('click', () => renderTab(key)).appendTo(nav);
        buttons.set(key, btn);
      });
      renderTab('packages');
    } catch (err) { if (!closed && dialog.host.closest('body').length) { shell.empty(); errorBox(shell, err, () => { dialog.instance.hide(); openQtvDetail(id, context); }); } }
  }


  async function openLegacyDetail(id) {
    const dialog = popup('Hồ sơ hội viên', 1180);
    detailPopup = dialog.instance;
    const load = async () => {
      dialog.content.empty().text('Đang tải hồ sơ...');
      try {
        const [memberRes, regsRes, booksRes, comRes, payRes, logsRes, consentsRes, invitesRes] = await Promise.allSettled([
          api().request('/members/' + id),
          api().request('/registrations?member_id=' + id, { headers: { 'x-branch-id': 'ALL' } }),
          api().request('/pt-bookings?member_id=' + id, { headers: { 'x-branch-id': 'ALL' } }),
          api().request('/community-classes/registrations?member_id=' + id, { headers: { 'x-branch-id': 'ALL' } }),
          api().request('/payments?member_id=' + id, { headers: { 'x-branch-id': 'ALL' } }),
          api().request('/access-logs?member_id=' + id + '&limit=200', { headers: { 'x-branch-id': 'ALL' } }),
          api().request('/members/' + id + '/consents'),
          api().request('/group-invitations?member_id=' + id)
        ]);

        const member = memberRes.status === 'fulfilled' ? memberRes.value.data : await getMember(id);
        const registrations = regsRes.status === 'fulfilled' ? list(regsRes.value) : [];
        const bookings = booksRes.status === 'fulfilled' ? list(booksRes.value) : [];
        const communityClasses = comRes.status === 'fulfilled' ? list(comRes.value) : [];
        const payments = payRes.status === 'fulfilled' ? list(payRes.value) : [];
        const accessLogs = logsRes.status === 'fulfilled' ? list(logsRes.value) : [];
        const consentState = consentsRes.status === 'fulfilled' ? (consentsRes.value?.data || consentsRes.value) : {};
        const groupInvitations = invitesRes.status === 'fulfilled' ? list(invitesRes.value) : [];


        const activeRegs = registrations.filter(r => r.status === 'ACTIVE' || r.status === 'FROZEN');
        const remainingGym = activeRegs.reduce((sum, r) => sum + (parseInt(r.remaining_gym_sessions, 10) || 0), 0);
        const remainingPt = activeRegs.reduce((sum, r) => sum + (parseInt(r.remaining_pt_sessions, 10) || 0), 0);
        const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
        const upcomingBookings = bookings.filter(b => ['CONFIRMED', 'PENDING', 'BOOKED'].includes(b.status));
        const totalPaidAmount = payments.filter(p => p.confirmed_at || ['SUCCESS', 'CONFIRMED', 'COMPLETED'].includes(p.status)).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
        const formatMoney = val => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val || 0);
        const hasBioFace = !!member.has_biometric_face;

        dialog.instance.option('title', `${member.member_code} - ${member.full_name}`);
        dialog.content.empty();

        const layoutWrap = $('<div class="profile-modal-wrap">').appendTo(dialog.content);

        // ================= CỘT TRÁI: SIDEBAR HỘI VIÊN (260px) =================
        const sidebar = $('<div class="profile-modal-sidebar">').appendTo(layoutWrap);

        // 1. Profile Hero Card
        const profileCard = $('<div class="profile-sidebar-hero">').appendTo(sidebar);
        const avatarWrap = $('<div style="position: relative; width: 68px; height: 68px; margin: 0 auto;">').appendTo(profileCard);
        if (member.avatar_url && /^https?:\/\//.test(member.avatar_url)) {
          $(`<img src="${member.avatar_url}" alt="${member.full_name}" style="width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2.5px solid var(--primary, #237b58); box-shadow: 0 2px 6px rgba(35,123,88,0.18);">`).appendTo(avatarWrap);
        } else {
          $(`<div style="width: 68px; height: 68px; border-radius: 50%; background: var(--primary-light, #eaf4ee); color: var(--primary-dark, #185740); font-size: 22px; font-weight: 700; display: grid; place-items: center; border: 2px solid var(--primary, #237b58); font-family: Manrope, sans-serif;">${(member.full_name || '?').trim().split(/\\s+/).slice(-2).map(x => x[0]).join('').toUpperCase()}</div>`).appendTo(avatarWrap);
        }

        $('<h3>').text(member.full_name).appendTo(profileCard);

        const badgeRow = $('<div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; align-items: center;">').appendTo(profileCard);
        $('<span style="background: var(--primary-light, #eaf4ee); color: var(--primary-dark, #185740); font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-family: Manrope, monospace;">').text(member.member_code).appendTo(badgeRow);
        badge(badgeRow, member.status);

        const subInfo = $('<div style="font-size: 12px; color: var(--text-muted, #586b5e); display: flex; flex-direction: column; gap: 5px; width: 100%; border-top: 1px dashed var(--border-color, #dfe6e2); padding-top: 10px; margin-top: 4px; text-align: left;">').appendTo(profileCard);
        $(`<div><i class="fa-solid fa-phone" style="width: 18px; color: var(--primary, #237b58);"></i> <strong>${member.phone || '--'}</strong></div>`).appendTo(subInfo);
        $(`<div><i class="fa-solid fa-location-dot" style="width: 18px; color: var(--primary, #237b58);"></i> ${member.home_branch_name || 'Hệ thống'}</div>`).appendTo(subInfo);
        $(`<div><i class="fa-solid ${hasBioFace ? 'fa-face-smile' : 'fa-circle-exclamation'}" style="width: 18px; color: ${hasBioFace ? '#237b58' : '#b87514'};"></i> ${hasBioFace ? 'Đã có Face ID' : 'Chưa có Face ID'}</div>`).appendTo(subInfo);

        // 2. Menu Sidebar Dọc Chuẩn 5 Menu App Mobile Hội Viên
        const navMenu = $('<div class="profile-sidebar-nav">').appendTo(sidebar);
        $('<div class="profile-sidebar-heading">MENU HỘI VIÊN</div>').appendTo(navMenu);

        const menuItems = [
          { id: 'packages', label: 'Gói của tôi', icon: 'fa-solid fa-ticket', count: registrations.length },
          { id: 'schedule', label: 'Lịch tập', icon: 'fa-regular fa-calendar', count: bookings.length + communityClasses.length },
          { id: 'payments', label: 'Thanh toán', icon: 'fa-solid fa-credit-card', count: payments.length },
          { id: 'account', label: 'Tài khoản', icon: 'fa-regular fa-user', count: null }
        ];

        let activeTabId = 'packages';
        const menuBtnMap = {};

        menuItems.forEach(item => {
          const btn = $('<div class="profile-sidebar-item member-sidebar-item">')
            .append($(`<i class="${item.icon}" style="width: 16px; font-size: 13px; text-align: center; color: #586b5e;"></i>`))
            .append($('<span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">').text(item.label));

          if (item.count !== null && item.count !== undefined) {
            $('<span class="profile-sidebar-count">').text(item.count).appendTo(btn);
          }

          btn.on('click', () => switchTab(item.id));
          btn.appendTo(navMenu);
          menuBtnMap[item.id] = btn;
        });

        // 3. Chân Sidebar: Nút tác vụ nhanh
        const quickActions = $('<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; border-top: 1px solid var(--border-color, #dfe6e2); padding-top: 12px; margin-top: auto; flex-shrink: 0;">').appendTo(sidebar);
        $('<button class="dx-button dx-button-default dx-button-mode-outlined" style="font-size: 11px; padding: 5px; height: 32px; border-radius: 4px;">')
          .html('<i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i>Sửa hồ sơ')
          .on('click', () => { dialog.instance.hide(); openMemberModal(id); })
          .appendTo(quickActions);
        $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 11px; padding: 5px; height: 32px; border-radius: 4px;">')
          .html('<i class="fa-solid fa-repeat" style="margin-right: 4px;"></i>Đổi trạng thái')
          .on('click', () => { dialog.instance.hide(); openStatus(id); })
          .appendTo(quickActions);
        $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 11px; padding: 5px; height: 32px; border-radius: 4px;">')
          .html('<i class="fa-solid fa-cart-plus" style="margin-right: 4px;"></i>Đăng ký gói')
          .on('click', () => quickRegisterPackage(id))
          .appendTo(quickActions);
        $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 11px; padding: 5px; height: 32px; border-radius: 4px;">')
          .html('<i class="fa-solid fa-qrcode" style="margin-right: 4px;"></i>Mã QR')
          .on('click', () => openQrModal(member))
          .appendTo(quickActions);

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

          // -------------------------------------------------------------
          // TAB 1: TRANG CHỦ (home) - TỔNG QUAN, LỊCH SẮP TỚI, MÃ QR CHECK-IN CỔNG
          // -------------------------------------------------------------
          if (tabId === 'home') {
            // Bộ chỉ số tổng quan theo chuẩn metric-card
            const metricsRow = $('<div class="metrics-row" style="margin-bottom: 20px;">').appendTo(mainPanel);
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
            metricsRow.append(mCard('metric-green', 'Gói đang kích hoạt', `${activeRegs.length} gói`, 'Đang hiệu lực tập luyện', 'fa-solid fa-boxes-stacked'));
            metricsRow.append(mCard('metric-blue', 'Lượt Gym khả dụng', `${remainingGym} lượt`, 'Tự do tập luyện cơ sở', 'fa-solid fa-dumbbell'));
            metricsRow.append(mCard('metric-coral', 'Buổi PT khả dụng', `${remainingPt} buổi`, 'Huấn luyện viên cá nhân', 'fa-solid fa-user-tie'));
            metricsRow.append(mCard('metric-amber', 'Tổng chi tiêu tích lũy', formatMoney(totalPaidAmount), `${payments.length} giao dịch thành công`, 'fa-solid fa-wallet'));

            // Buổi tập sắp tới
            const nextBooking = bookings.filter(b => ['CONFIRMED', 'BOOKED', 'PENDING'].includes(b.status)).sort((a, b) => new Date(`${a.booking_date}T${a.start_time || '00:00'}`) - new Date(`${b.booking_date}T${b.start_time || '00:00'}`))[0];
            const nextClass = communityClasses.filter(c => c.status === 'CONFIRMED' && new Date(c.class_date) >= new Date()).sort((a, b) => new Date(`${a.class_date}T${a.start_time || '00:00'}`) - new Date(`${b.class_date}T${b.start_time || '00:00'}`))[0];

            const scheduleBox = $('<div class="profile-card-box" style="display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;">').appendTo(mainPanel);
            const scheduleLeft = $('<div style="display: flex; align-items: center; gap: 14px;">').appendTo(scheduleBox);
            scheduleLeft.html(`
              <div style="width: 44px; height: 44px; border-radius: 8px; background: var(--primary-light, #eaf4ee); color: var(--primary, #237b58); display: grid; place-items: center; font-size: 20px; flex-shrink: 0;"><i class="fa-regular fa-calendar-check"></i></div>
              <div>
                <div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted, #748078); text-transform: uppercase; letter-spacing: 0.5px;">LỊCH TẬP TIẾP THEO</div>
                <div style="font-size: 14px; font-weight: 700; color: var(--primary-dark, #185740); margin-top: 2px;">
                  ${nextBooking ? `Buổi PT: ${new Date(nextBooking.booking_date).toLocaleDateString('vi-VN')} (${(nextBooking.start_time || '').slice(0, 5)} - ${(nextBooking.end_time || '').slice(0, 5)}) · HLV ${nextBooking.pt_name || 'Cá nhân'}` : nextClass ? `Lớp: ${nextClass.title} · ${new Date(nextClass.class_date).toLocaleDateString('vi-VN')} (${(nextClass.start_time || '').slice(0, 5)})` : 'Chưa có lịch hẹn tập luyện tiếp theo'}
                </div>
                <div style="font-size: 12px; color: #586b5e; margin-top: 2px;">
                  ${nextBooking ? `Buổi thứ ${nextBooking.session_number || '--'} · ${nextBooking.branch_name || member.home_branch_name}` : nextClass ? `HLV: ${nextClass.instructor_name || '--'} · ${nextClass.branch_name || ''}` : 'Hội viên có thể đặt lịch PT hoặc đăng ký lớp cộng đồng'}
                </div>
              </div>
            `);
            button(scheduleBox, {
              text: 'Xem lịch tập',
              icon: 'calendar',
              stylingMode: 'outlined',
              onClick: () => switchTab('schedule')
            });

            // Lời mời vào gói tập nhóm (nếu có)
            const pendingInvites = groupInvitations.filter(i => i.invitation_status === 'PENDING');
            if (pendingInvites.length > 0) {
              const inviteBanner = $('<div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 12px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">').appendTo(mainPanel);
              inviteBanner.html(`
                <div style="display: flex; align-items: center; gap: 10px;">
                  <i class="fa-solid fa-envelope-open-text" style="color: #ca8a04; font-size: 16px;"></i>
                  <span style="font-size: 12.5px; color: #854d0e; font-weight: 600;">Có ${pendingInvites.length} lời mời tham gia gói tập nhóm đang chờ hội viên phản hồi.</span>
                </div>
              `);
              button(inviteBanner, {
                text: 'Xem gói của tôi',
                icon: 'arrowright',
                stylingMode: 'text',
                onClick: () => switchTab('packages')
              });
            }

            // Khung mã check-in cổng Turnstile
            const qrPassBox = $('<div class="profile-card-box" style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">').appendTo(mainPanel);
            $(`
              <div style="width: 70px; height: 70px; background: #fff; border: 1px solid var(--border-color, #dfe6e2); border-radius: 8px; display: grid; place-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.04); flex-shrink: 0;">
                <i class="fa-solid fa-qrcode" style="font-size: 40px; color: var(--primary, #237b58);"></i>
              </div>
            `).appendTo(qrPassBox);

            const qrInfo = $('<div style="flex: 1; min-width: 220px;">').appendTo(qrPassBox);
            $('<div style="font-size: 10.5px; font-weight: 700; color: var(--text-muted, #748078); text-transform: uppercase; letter-spacing: 0.5px;">MÃ CHECK-IN QUẸT CỔNG TỰ ĐỘNG (TURNSTILE PASS)</div>').appendTo(qrInfo);
            $(`<div style="font-size: 17px; font-weight: 800; color: var(--primary-dark, #185740); font-family: Manrope, monospace; letter-spacing: 1px; margin: 2px 0;">${member.member_code}</div>`).appendTo(qrInfo);
            $(`<div style="font-size: 12px; color: #586b5e;">Mã định danh quét qua cổng kiểm soát Turnstile và xác thực tại quầy lễ tân chi nhánh.</div>`).appendTo(qrInfo);

            const qrActions = $('<div style="display: flex; gap: 8px; flex-wrap: wrap;">').appendTo(qrPassBox);
            button(qrActions, {
              text: 'Phóng to mã QR quét cổng',
              icon: 'qrcode',
              stylingMode: 'contained',
              type: 'default',
              onClick: () => openQrModal(member)
            });
            button(qrActions, {
              text: hasBioFace ? 'Cập nhật Face ID' : 'Thu thập Face ID',
              icon: 'camera',
              stylingMode: 'outlined',
              type: 'normal',
              onClick: () => openFaceEnrollModal(member, load)
            });

            // Tóm tắt danh mục gói đang hiệu lực
            const activeRegSection = $('<div class="profile-card-box">').appendTo(mainPanel);
            $('<h4 class="profile-section-title"><i class="fa-solid fa-boxes-stacked" style="margin-right: 6px;"></i>Gói Tập Đang Hoạt Động Của Hội Viên</h4>').appendTo(activeRegSection);
            if (!activeRegs.length) {
              $('<div style="text-align: center; padding: 24px; color: var(--text-muted, #748078); font-size: 12px;">Hội viên hiện không có gói tập nào đang kích hoạt.</div>').appendTo(activeRegSection);
            } else {
              const regList = $('<div style="display: flex; flex-direction: column; gap: 8px;">').appendTo(activeRegSection);
              activeRegs.forEach(r => {
                const isFrozen = r.status === 'FROZEN' || r.is_frozen;
                const row = $(`
                  <div style="background: #fbfcfb; border: 1px solid #e1e8e3; border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                    <div>
                      <strong style="font-size: 13px; color: var(--primary-dark, #185740);">${r.package_name_snapshot || 'Gói tập'}</strong>
                      <div style="font-size: 11.5px; color: var(--text-muted, #748078); margin-top: 2px;">Hạn dùng: ${r.end_date ? new Date(r.end_date).toLocaleDateString('vi-VN') : 'Không thời hạn'} · Lượt Gym: ${r.remaining_gym_sessions ?? '--'} · Buổi PT: ${r.remaining_pt_sessions ?? '--'}</div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                      <span class="status-badge ${isFrozen ? 'badge-info' : 'badge-success'}" style="${isFrozen ? 'background:#e0f2fe;color:#0369a1;font-weight:600;' : ''}">${isFrozen ? '❄️ Đang đóng băng' : 'Đang hiệu lực'}</span>
                    </div>
                  </div>
                `).appendTo(regList);
                button(row.find('div:last-child'), {
                  text: 'Lộ trình',
                  icon: 'route',
                  stylingMode: 'text',
                  onClick: () => openRoadmapModal(r)
                });
              });
            }
          }

          // -------------------------------------------------------------
          // TAB 2: LỊCH TẬP (schedule) - LỊCH PT 1-1 & LỚP CỘNG ĐỒNG
          // -------------------------------------------------------------
          else if (tabId === 'schedule') {
            const subNav = $('<div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid var(--border-color, #dfe6e2); padding-bottom: 10px;">').appendTo(mainPanel);
            let schedMode = 'pt';
            const btnPt = $('<button class="dx-button dx-button-default dx-button-mode-contained" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">').text(`Lịch tập PT 1-1 (${bookings.length})`).appendTo(subNav);
            const btnClass = $('<button class="dx-button dx-button-normal dx-button-mode-outlined" style="font-size: 12px; padding: 6px 14px; border-radius: 4px;">').text(`Lớp tập cộng đồng (${communityClasses.length})`).appendTo(subNav);
            const schedContainer = $('<div>').appendTo(mainPanel);

            function renderScheduleView() {
              schedContainer.empty();
              if (schedMode === 'pt') {
                btnPt.removeClass('dx-button-mode-outlined').addClass('dx-button-mode-contained');
                btnClass.removeClass('dx-button-mode-contained').addClass('dx-button-mode-outlined');

                const mRow = $('<div class="metrics-row" style="margin-bottom: 16px;">').appendTo(schedContainer);
                const mCard = (tone, label, val, sub) => $(`
                  <article class="metric-card ${tone}">
                    <div class="metric-label"><span>${label}</span></div>
                    <strong class="metric-value">${val}</strong>
                    <span class="metric-caption">${sub}</span>
                  </article>
                `);
                mRow.append(mCard('metric-green', 'Tổng buổi PT đã xếp', bookings.length, 'Lịch sử và sắp tới'));
                mRow.append(mCard('metric-blue', 'Buổi đã hoàn thành', completedBookings.length, 'Đã tập & trừ buổi'));
                mRow.append(mCard('metric-amber', 'Buổi sắp diễn ra', upcomingBookings.length, 'Chờ tập & xác nhận'));

                detailGrid(schedContainer, bookings, [
                  { dataField: 'booking_date', caption: 'Ngày tập', dataType: 'date', format: 'dd/MM/yyyy', width: 95, alignment: 'center' },
                  { caption: 'Khung giờ', width: 105, alignment: 'center', calculateCellValue: row => `${(row.start_time || '').slice(0, 5)} - ${(row.end_time || '').slice(0, 5)}` },
                  { dataField: 'pt_name', caption: 'Huấn luyện viên', minWidth: 140 },
                  { dataField: 'session_number', caption: 'Buổi thứ', width: 85, alignment: 'center', customizeText: c => c.value ? `Buổi ${c.value}` : '--' },
                  { dataField: 'workout_notes', caption: 'Nội dung bài tập', minWidth: 160, customizeText: c => c.value || '--' },
                  { dataField: 'fitness_assessment', caption: 'Đánh giá thể lực', minWidth: 150, customizeText: c => c.value || '--' },
                  {
                    caption: 'Xác nhận kép', width: 135, alignment: 'center', cellTemplate: (el, c) => {
                      const ptOk = !!c.data?.pt_confirmed_at;
                      const memOk = !!c.data?.member_confirmed_at;
                      if (ptOk && memOk) {
                        $('<span class="status-badge badge-success" style="font-size: 10px;">').text('✓ Cả 2 đã duyệt').appendTo(el);
                      } else if (ptOk) {
                        $('<span class="status-badge badge-info" style="font-size: 10px;">').text('PT đã duyệt').appendTo(el);
                      } else if (memOk) {
                        $('<span class="status-badge badge-info" style="font-size: 10px;">').text('HV đã duyệt').appendTo(el);
                      } else {
                        $('<span style="font-size: 11px; color: var(--text-light, #87938c);">').text('--').appendTo(el);
                      }
                    }
                  },
                  {
                    dataField: 'status', caption: 'Trạng thái', width: 125, alignment: 'center', cellTemplate: (el, c) => {
                      const map = { PENDING: 'Chờ duyệt', CONFIRMED: 'Đã lên lịch', BOOKED: 'Đã đặt', COMPLETED: 'Hoàn thành', CANCELLED: 'Đã hủy', NO_SHOW: 'Vắng mặt' };
                      const tone = c.value === 'COMPLETED' ? 'badge-success' : ['CONFIRMED', 'BOOKED'].includes(c.value) ? 'badge-info' : c.value === 'PENDING' ? 'badge-warning' : 'badge-danger';
                      $('<span>').addClass(`status-badge ${tone}`).text(map[c.value] || c.value).appendTo(el);
                    }
                  }
                ], 'Hội viên chưa có buổi tập PT nào.');
              } else {
                btnClass.removeClass('dx-button-mode-outlined').addClass('dx-button-mode-contained');
                btnPt.removeClass('dx-button-mode-contained').addClass('dx-button-mode-outlined');

                detailGrid(schedContainer, communityClasses, [
                  { dataField: 'title', caption: 'Tên lớp học', minWidth: 160 },
                  { dataField: 'discipline_name', caption: 'Bộ môn', width: 110, customizeText: c => c.value || '--' },
                  { dataField: 'class_date', caption: 'Ngày học', dataType: 'date', format: 'dd/MM/yyyy', width: 95, alignment: 'center' },
                  { caption: 'Khung giờ', width: 105, alignment: 'center', calculateCellValue: row => `${(row.start_time || '').slice(0, 5)} - ${(row.end_time || '').slice(0, 5)}` },
                  { dataField: 'instructor_name', caption: 'Huấn luyện viên', minWidth: 130 },
                  { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 130 },
                  {
                    dataField: 'status', caption: 'Trạng thái', width: 120, alignment: 'center', cellTemplate: (el, c) => {
                      const isConf = c.value === 'CONFIRMED';
                      $('<span>').addClass(`status-badge ${isConf ? 'badge-success' : 'badge-danger'}`).text(isConf ? 'Đã đăng ký' : 'Đã hủy').appendTo(el);
                    }
                  }
                ], 'Hội viên chưa đăng ký tham gia lớp cộng đồng nào.');
              }
            }

            btnPt.on('click', () => { schedMode = 'pt'; renderScheduleView(); });
            btnClass.on('click', () => { schedMode = 'class'; renderScheduleView(); });
            renderScheduleView();
          }

          // -------------------------------------------------------------
          // TAB 3: GÓI CỦA TÔI (packages) - HỢP ĐỒNG, TIẾN ĐỘ, CHUYỂN NHƯỢNG
          // -------------------------------------------------------------
          else if (tabId === 'packages') {
            const mRow = $('<div class="metrics-row" style="margin-bottom: 18px;">').appendTo(mainPanel);
            const mCard = (tone, label, val, sub) => $(`
              <article class="metric-card ${tone}">
                <div class="metric-label"><span>${label}</span></div>
                <strong class="metric-value">${val}</strong>
                <span class="metric-caption">${sub}</span>
              </article>
            `);
            mRow.append(mCard('metric-green', 'Tổng hợp đồng', registrations.length, 'Bao gồm mọi trạng thái'));
            mRow.append(mCard('metric-blue', 'Hợp đồng đang hiệu lực', activeRegs.length, 'Đang hoạt động hoặc đóng băng'));
            mRow.append(mCard('metric-amber', 'Số dư tập luyện', `${remainingGym} Gym · ${remainingPt} PT`, 'Khả dụng trên hệ thống'));

            const toolbar = $('<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">').appendTo(mainPanel);
            $('<h4 class="profile-section-title" style="margin: 0;"><i class="fa-solid fa-boxes-stacked" style="margin-right: 6px;"></i>Danh Sách Gói Tập & Hợp Đồng Đăng Ký</h4>').appendTo(toolbar);
            button(toolbar, {
              text: 'Đăng ký gói tập mới',
              icon: 'plus',
              stylingMode: 'contained',
              type: 'default',
              onClick: () => quickRegisterPackage(id)
            });

            detailGrid(mainPanel, registrations, [
              { caption: 'Mã đăng ký', dataField: 'reg_code', minWidth: 100, alignment: 'center', calculateCellValue: row => row.reg_code || row.registration_code },
              { dataField: 'package_name_snapshot', caption: 'Gói tập', minWidth: 160 },
              { dataField: 'start_date', caption: 'Bắt đầu', dataType: 'date', format: 'dd/MM/yyyy', width: 95, alignment: 'center' },
              { dataField: 'end_date', caption: 'Hết hạn', dataType: 'date', format: 'dd/MM/yyyy', width: 95, alignment: 'center', customizeText: c => c.value ? c.valueText : '--' },
              { dataField: 'remaining_gym_sessions', caption: 'Lượt Gym', width: 85, alignment: 'center', customizeText: c => c.value ?? '--' },
              { dataField: 'remaining_pt_sessions', caption: 'Buổi PT', width: 85, alignment: 'center', customizeText: c => c.value ?? '--' },
              {
                dataField: 'total_amount', caption: 'Giá gói', width: 115, alignment: 'right',
                customizeText: c => c.value !== null && c.value !== undefined ? formatMoney(c.value) : '--'
              },
              {
                dataField: 'status', caption: 'Trạng thái', width: 145, alignment: 'center', cellTemplate: (el, c) => {
                  const isFrozen = c.data?.is_frozen || c.value === 'FROZEN';
                  const state = window.WebUI.registrationNearExpiry(c.data) ? 'EXPIRING' : c.value;
                  const map = { PENDING_PAYMENT: 'Chờ thanh toán', SCHEDULED: 'Chưa hiệu lực', ACTIVE: 'Đang hiệu lực', FROZEN: 'Đang đóng băng', EXPIRING: 'Sắp hết hạn', EXPIRED: 'Đã hết hạn', CANCELLED: 'Đã hủy' };
                  const tone = isFrozen ? 'badge-info' : state === 'ACTIVE' ? 'badge-success' : state === 'SCHEDULED' ? 'badge-info' : ['PENDING_PAYMENT', 'EXPIRING'].includes(state) ? 'badge-warning' : 'badge-danger';
                  const label = isFrozen ? '❄️ Đang đóng băng' : (map[state] || state);
                  const $badge = $('<span>').addClass(`status-badge ${tone}`).text(label).appendTo(el);
                  if (isFrozen) $badge.css({ background: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc', fontWeight: 600 });
                }
              },
              {
                caption: 'Thao tác', width: 110, alignment: 'center', cellTemplate: (el, c) => {
                  button(el, {
                    text: 'Lộ trình',
                    icon: 'route',
                    stylingMode: 'text',
                    onClick: () => openRoadmapModal(c.data)
                  });
                }
              }
            ], 'Hội viên chưa đăng ký gói tập nào.');

            // Bảng Yêu cầu chuyển nhượng gói tập (Transfer Requests - Migration 015)
            $('<h4 class="profile-section-title" style="margin: 24px 0 12px;"><i class="fa-solid fa-arrow-right-arrow-left" style="margin-right: 6px;"></i>Yêu Cầu Chuyển Nhượng Gói Tập</h4>').appendTo(mainPanel);
            detailGrid(mainPanel, transferRequests, [
              { caption: 'Mã yêu cầu', dataField: 'request_code', width: 115, alignment: 'center', calculateCellValue: r => r.request_code || r.id?.slice(0, 8) },
              { caption: 'Chiều', width: 95, alignment: 'center', calculateCellValue: r => r.from_member_id === id ? 'Đã gửi đi' : 'Đã nhận' },
              { caption: 'Gói chuyển nhượng', dataField: 'package_name_snapshot', minWidth: 150 },
              { caption: 'Người liên quan', minWidth: 140, calculateCellValue: r => r.from_member_id === id ? `Đến: ${r.to_member_name || '--'}` : `Từ: ${r.from_member_name || '--'}` },
              { caption: 'Lý do', dataField: 'reason', minWidth: 140, customizeText: c => c.value || '--' },
              { caption: 'Ngày gửi', dataField: 'created_at', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm', width: 135, alignment: 'center' },
              {
                caption: 'Trạng thái', dataField: 'status', width: 125, alignment: 'center', cellTemplate: (el, c) => {
                  const map = { PENDING: 'Chờ duyệt', ACCEPTED: 'Đã chấp nhận', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy' };
                  const tone = c.value === 'ACCEPTED' ? 'badge-success' : c.value === 'PENDING' ? 'badge-warning' : 'badge-danger';
                  $('<span>').addClass(`status-badge ${tone}`).text(map[c.value] || c.value).appendTo(el);
                }
              }
            ], 'Chưa có yêu cầu chuyển nhượng gói tập nào.');
          }

          // -------------------------------------------------------------
          // TAB 4: THANH TOÁN (payments) - GIAO DỊCH, PHIẾU THU & CHECK-IN LOGS
          // -------------------------------------------------------------
          else if (tabId === 'payments') {
            const mRow = $('<div class="metrics-row" style="margin-bottom: 18px;">').appendTo(mainPanel);
            const mCard = (tone, label, val, sub) => $(`
              <article class="metric-card ${tone}">
                <div class="metric-label"><span>${label}</span></div>
                <strong class="metric-value">${val}</strong>
                <span class="metric-caption">${sub}</span>
              </article>
            `);
            mRow.append(mCard('metric-green', 'Tổng chi tiêu tích lũy', formatMoney(totalPaidAmount), 'Tổng tiền đã thanh toán thành công'));
            mRow.append(mCard('metric-blue', 'Tổng số giao dịch', payments.length, 'Hóa đơn và biên lai'));

            $('<h4 class="profile-section-title"><i class="fa-solid fa-wallet" style="margin-right: 6px;"></i>Lịch Sử Giao Dịch Thu Tiền & Phiếu Thu Điện Tử</h4>').appendTo(mainPanel);

            detailGrid(mainPanel, payments, [
              { dataField: 'payment_code', caption: 'Mã phiếu', width: 90, alignment: 'center', cellTemplate: (el, c) => $('<strong>').css({ color: 'var(--primary-dark, #185740)', fontFamily: 'Manrope, monospace', fontSize: 11.5 }).text(c.value || '--').appendTo(el) },
              {
                caption: 'Thời gian', width: 135, alignment: 'center',
                calculateCellValue: r => (r.confirmed_at || r.created_at) ? new Date(r.confirmed_at || r.created_at) : null,
                dataType: 'datetime', format: 'dd/MM/yyyy HH:mm'
              },
              {
                dataField: 'amount', caption: 'Số tiền', width: 120, alignment: 'right',
                cellTemplate: (el, c) => $('<strong>').css({ color: 'var(--primary, #237b58)', fontSize: 12.5, fontFamily: 'Manrope, sans-serif' }).text(formatMoney(c.value)).appendTo(el)
              },
              {
                dataField: 'payment_method', caption: 'Hình thức', width: 110, alignment: 'center',
                customizeText: c => c.value === 'CASH' ? 'Tiền mặt' : ['BANK_TRANSFER', 'BANK_TRANSFER_VIETQR'].includes(c.value) ? 'Chuyển khoản' : c.value === 'POS_CARD' ? 'Thẻ POS' : (c.value || '--')
              },
              { dataField: 'package_name_snapshot', caption: 'Gói tập liên quan', minWidth: 140, customizeText: c => c.value || '--' },
              {
                dataField: 'receipt_code', caption: 'Mã phiếu thu', width: 105, alignment: 'center',
                cellTemplate: (el, c) => {
                  if (c.value) {
                    $('<span>').css({ background: 'var(--primary-light, #eaf4ee)', color: 'var(--primary-dark, #185740)', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: 11, fontFamily: 'Manrope, monospace' }).text(c.value).appendTo(el);
                  } else {
                    $('<span>').css({ color: 'var(--text-light, #8b9690)' }).text('--').appendTo(el);
                  }
                }
              },
              {
                caption: 'Trạng thái', width: 115, alignment: 'center', cellTemplate: (el, c) => {
                  const isSuccess = !!c.data?.confirmed_at || ['SUCCESS', 'CONFIRMED', 'COMPLETED'].includes(c.data?.status);
                  const isExpired = !isSuccess && c.data?.expires_at && new Date(c.data.expires_at) < new Date();
                  const label = isSuccess ? 'Thành công' : isExpired ? 'Đã hết hạn' : 'Chờ thanh toán';
                  const tone = isSuccess ? 'badge-success' : isExpired ? 'badge-danger' : 'badge-warning';
                  $('<span>').addClass(`status-badge ${tone}`).text(label).appendTo(el);
                }
              }
            ], 'Hội viên chưa có giao dịch thanh toán nào.');

            // Lịch sử ra vào cổng Turnstile
            $('<h4 class="profile-section-title" style="margin: 24px 0 12px;"><i class="fa-solid fa-arrow-right-to-bracket" style="margin-right: 6px;"></i>Nhật Ký Quẹt Thẻ & Ra Vào Cổng Turnstile</h4>').appendTo(mainPanel);

            const filterRow = $('<div style="display: flex; gap: 12px; align-items: center; margin-bottom: 14px;">').appendTo(mainPanel);
            const dateFilter = $('<div>').css('maxWidth', 220).appendTo(filterRow);
            const logsContainer = $('<div>').appendTo(mainPanel);

            let logLoadVersion = 0;
            async function fetchLogs(targetDate) {
              const currentReq = ++logLoadVersion;
              logsContainer.empty().html('<div style="padding: 20px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>Đang tải dữ liệu ra vào...</div>');
              try {
                const params = { member_id: id, limit: 500 };
                if (targetDate) params.date = dateOnly(targetDate);
                const res = await api().request('/access-gate/logs?' + new URLSearchParams(params), { headers: { 'x-branch-id': 'ALL' } });
                if (currentReq !== logLoadVersion || !logsContainer[0].isConnected) return;
                logsContainer.empty();
                const items = list(res).filter(l => l.member_id === id);
                detailGrid(logsContainer, items, [
                  { dataField: 'check_in_time', caption: 'Thời gian', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm:ss', width: 145, alignment: 'center' },
                  { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 130 },
                  { dataField: 'direction', caption: 'Chiều', width: 95, alignment: 'center', cellTemplate: (el, c) => el.text(c.value === 'IN' ? 'Vào cổng' : 'Ra cổng') },
                  { dataField: 'access_method', caption: 'Phương thức', width: 110, alignment: 'center', customizeText: c => c.value === 'FACE_ID' ? 'Face ID' : c.value === 'QR_CODE' ? 'Mã QR' : (c.value || '--') },
                  {
                    dataField: 'status', caption: 'Kết quả', width: 110, alignment: 'center', cellTemplate: (el, c) => {
                      const ok = c.value === 'ALLOWED' || c.value === 'ACTIVE';
                      $('<span>').addClass(`status-badge ${ok ? 'badge-success' : 'badge-danger'}`).text(ok ? 'Hợp lệ' : 'Từ chối').appendTo(el);
                    }
                  },
                  { dataField: 'denial_reason', caption: 'Lý do từ chối', minWidth: 140, customizeText: c => c.value || '--' }
                ], targetDate ? 'Không có lượt ra vào trong ngày đã chọn.' : 'Không có dữ liệu ra vào.');
              } catch (err) {
                if (currentReq === logLoadVersion) {
                  logsContainer.empty();
                  errorBox(logsContainer, err, () => fetchLogs(targetDate));
                }
              }
            }

            dateFilter.dxDateBox({
              label: 'Chọn ngày lọc',
              labelMode: 'floating',
              type: 'date',
              displayFormat: 'dd/MM/yyyy',
              value: new Date(),
              max: new Date(),
              showClearButton: true,
              onValueChanged: e => fetchLogs(e.value)
            });

            button(filterRow, {
              text: 'Xem tất cả',
              icon: 'list',
              stylingMode: 'outlined',
              onClick: () => {
                dateFilter.dxDateBox('instance').option('value', null);
                fetchLogs(null);
              }
            });

            fetchLogs(new Date());
          }

          // -------------------------------------------------------------
          // TAB 5: TÀI KHOẢN (account) - HỒ SƠ CHI TIẾT, FACE ID, BẢO MẬT & PDPA
          // -------------------------------------------------------------
          else if (tabId === 'account') {
            // BẢNG THÔNG TIN CHI TIẾT HỒ SƠ HỘI VIÊN (100% TỪ DATABASE POSTGRESQL)
            const detailSection = $('<div class="profile-card-box">').appendTo(mainPanel);
            $('<h4 class="profile-section-title"><i class="fa-solid fa-user-check" style="margin-right: 8px;"></i>Thông Tin Hồ Sơ Cá Nhân & Quản Trị</h4>').appendTo(detailSection);

            const gridDl = $('<dl class="profile-info-grid">').appendTo(detailSection);
            const addField = (lbl, val, customVal) => {
              const item = $('<div class="profile-info-item">').appendTo(gridDl);
              $('<dt>').text(lbl).appendTo(item);
              if (customVal) {
                $('<dd>').append(customVal).appendTo(item);
              } else {
                $('<dd>').text(val || '--').appendTo(item);
              }
            };

            addField('Mã hội viên', member.member_code);
            addField('Họ và tên', member.full_name);
            addField('Giới tính', member.gender === 'MALE' ? 'Nam' : member.gender === 'FEMALE' ? 'Nữ' : 'Chưa cập nhật');
            addField('Ngày sinh', member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString('vi-VN') : 'Chưa cập nhật');
            addField('Số điện thoại', member.phone);
            addField('Email', member.email || 'Chưa cập nhật');
            addField('Chi nhánh tiếp nhận', member.home_branch_name || 'Hệ thống');
            addField('Ngày gia nhập', member.created_at ? new Date(member.created_at).toLocaleDateString('vi-VN') : '--');
            const statusBadgeEl = $('<span>');
            badge(statusBadgeEl, member.status);
            addField('Trạng thái hồ sơ', null, statusBadgeEl);
            addField('Nhận diện khuôn mặt', null, $(`<span class="status-badge ${hasBioFace ? 'badge-success' : 'badge-warning'}">${hasBioFace ? 'Đã thu thập Face ID' : 'Chưa thu thập Face ID'}</span>`));

            // Khối Face ID Kiosk
            const faceSection = $('<div class="profile-card-box" style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">').appendTo(mainPanel);
            
            const facePreview = $('<div style="width: 70px; height: 70px; border-radius: 50%; overflow: hidden; border: 2px solid var(--primary, #237b58); display: grid; place-items: center; background: var(--primary-light, #eaf4ee); flex-shrink: 0;">').appendTo(faceSection);
            if (member.avatar_url && /^https?:\/\//.test(member.avatar_url)) {
              $(`<img src="${member.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;">`).appendTo(facePreview);
            } else {
              $('<i class="fa-solid fa-face-smile" style="font-size: 32px; color: var(--primary, #237b58);"></i>').appendTo(facePreview);
            }

            const faceInfo = $('<div style="flex: 1; min-width: 200px;">').appendTo(faceSection);
            $('<div style="font-size: 13px; font-weight: 700; color: #1a2b23; margin-bottom: 4px;">Dữ liệu nhận diện khuôn mặt Kiosk (Face ID)</div>').appendTo(faceInfo);
            $(`<div style="font-size: 12px; color: #586b5e; margin-bottom: 10px;">Trạng thái: <span class="status-badge ${hasBioFace ? 'badge-success' : 'badge-warning'}">${hasBioFace ? 'Đã thu thập mẫu khuôn mặt' : 'Chưa thu thập khuôn mặt'}</span></div>`).appendTo(faceInfo);
            
            const faceBtns = $('<div style="display: flex; gap: 8px; flex-wrap: wrap;">').appendTo(faceInfo);
            button(faceBtns, {
              text: 'Chụp ảnh từ Camera tại quầy',
              icon: 'camera',
              stylingMode: 'contained',
              type: 'default',
              onClick: () => openCameraCapture(async url => {
                try {
                  await api().request(`/members/${id}`, { method: 'PUT', body: { full_name: member.full_name, avatar_url: url } });
                  member.avatar_url = url;
                  notify('Đã cập nhật ảnh Face ID từ Camera!', 'success');
                  load();
                } catch (err) { notify(err.message, 'error'); }
              })
            });
            button(faceBtns, {
              text: 'Tải ảnh / Nhập URL',
              icon: 'upload',
              stylingMode: 'outlined',
              onClick: () => openFaceEnrollModal(member, load)
            });

            // Khối Bản ghi đồng ý chính sách PDPA (100% từ bảng member_consents, không có trường giả)
            const consentsBox = $('<div class="profile-card-box">').appendTo(mainPanel);
            $('<h4 class="profile-section-title"><i class="fa-solid fa-file-contract" style="margin-right: 6px;"></i>Lịch Sử Đồng Ý Xử Lý Dữ Liệu Cá Nhân (PDPA Consents)</h4>').appendTo(consentsBox);

            detailGrid(consentsBox, consentState.consents || [], [
              { dataField: 'consent_type', caption: 'Loại đồng ý', minWidth: 160 },
              { dataField: 'is_granted', caption: 'Trạng thái', width: 120, alignment: 'center', cellTemplate: (el, c) => {
                $('<span>').addClass(`status-badge ${c.value ? 'badge-success' : 'badge-danger'}`).text(c.value ? 'Đã đồng ý' : 'Đã rút').appendTo(el);
              } },
              { dataField: 'policy_version', caption: 'Phiên bản', width: 100, alignment: 'center', customizeText: c => c.value || '--' },
              { dataField: 'created_at', caption: 'Ngày đồng ý', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm', width: 140, alignment: 'center' },
              { dataField: 'revoked_at', caption: 'Ngày rút', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm', width: 140, alignment: 'center', customizeText: c => c.value ? c.valueText : '--' }
            ], 'Chưa có bản ghi đồng ý xử lý dữ liệu cá nhân.');

            const consentActions = $('<div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;">').appendTo(consentsBox);
            button(consentActions, { text: 'Đăng ký nhận diện', icon: 'user', onClick: () => openRecognition(id) });
            if (activeRole(user) === 'QTV') {
              button(consentActions, { text: 'Rút đồng ý', icon: 'remove', type: 'danger', onClick: () => openRevokeConsent(id) });
            }
          }
        }


        const onConsentUpdated = (_, event) => {
          if (event?.member_id === id && dialog.host.closest('body').length && activeTabId === 'account') {
            load();
          }
        };
        $(document).on('paradise:consent-updated.members', onConsentUpdated);
        dialog.instance.on('hidden', () => $(document).off('paradise:consent-updated.members', onConsentUpdated));

        switchTab('packages');
      } catch (err) {
        if (dialog.host.closest('body').length) {
          dialog.content.empty();
          errorBox(dialog.content, err, load);
        }
      }
    };

    dialog.instance.option('toolbarItems', [
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Đóng', onClick: () => dialog.instance.hide() } }
    ]);
    await load();
  }


  function openQrModal(member) {
    const code = member.qr_code || `MEM-${member.member_code}`;
    const dialog = popup('Mã QR Check-in Hội viên', 420);
    $('<div style="text-align:center;padding:20px;">')
      .append($('<h3>').text(member.full_name))
      .append($('<p style="color:#748078;margin-top:4px;">').text(member.member_code + ' · ' + member.phone))
      .append($('<div style="margin:20px auto;width:200px;height:200px;background:#f8fbf9;border:2px dashed #237b58;border-radius:8px;display:grid;place-items:center;font-size:12px;color:#237b58;">')
        .html(`<div style="text-align:center;"><i class="fa-solid fa-qrcode" style="font-size:96px;display:block;margin-bottom:8px;"></i><strong>${code}</strong></div>`))
      .append($('<p style="font-size:12px;color:#748078;">').text('Dùng mã này để quét qua cổng kiểm soát ra vào (Turnstile)'))
      .appendTo(dialog.content);
    dialog.instance.option('toolbarItems', [{ toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Đóng', onClick: () => dialog.instance.hide() } }]);
  }

  function openFaceEnrollModal(member, onComplete) {
    const dialog = popup('Thu thập khuôn mặt (Face ID)', 480);
    const body = $('<div style="padding:10px;">').appendTo(dialog.content);
    $('<p style="color:#555;margin-bottom:16px;">').text(`Thu thập ảnh chân dung nhận diện cho hội viên ${member.full_name} (${member.member_code}).`).appendTo(body);

    const previewContainer = $('<div style="width:160px;height:160px;margin:0 auto 16px;border-radius:50%;overflow:hidden;border:3px solid #237b58;display:grid;place-items:center;background:#f0f4f2;">').appendTo(body);
    let currentAvatar = member.avatar_url || '';
    if (currentAvatar) {
      $(`<img src="${currentAvatar}" style="width:100%;height:100%;object-fit:cover;">`).appendTo(previewContainer);
    } else {
      $('<i class="fa-solid fa-camera" style="font-size:40px;color:#748078;">').appendTo(previewContainer);
    }

    const form = $('<div>').appendTo(body).dxForm({
      formData: { avatar_url: member.avatar_url || '' },
      labelLocation: 'top',
      items: [
        {
          dataField: 'avatar_url', label: { text: 'Đường dẫn ảnh / URL ảnh khuôn mặt' },
          editorType: 'dxTextBox',
          editorOptions: {
            placeholder: 'Nhập URL ảnh khuôn mặt hội viên (https://...)',
            onValueChanged: e => {
              previewContainer.empty();
              if (e.value) $(`<img src="${e.value}" style="width:100%;height:100%;object-fit:cover;">`).appendTo(previewContainer);
              else $('<i class="fa-solid fa-camera" style="font-size:40px;color:#748078;">').appendTo(previewContainer);
            }
          },
          validationRules: [{ type: 'required', message: 'Vui lòng cung cấp ảnh' }]
        }
      ]
    }).dxForm('instance');

    dialog.instance.option('toolbarItems', [
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Hủy', onClick: () => dialog.instance.hide() } },
      { toolbar: 'bottom', location: 'after', widget: 'dxButton', options: {
        text: 'Lưu nhận diện khuôn mặt', type: 'default', stylingMode: 'contained', icon: 'check',
        onClick: async () => {
          if (!form.validate().isValid) return;
          const url = form.option('formData').avatar_url;
          try {
            await api().request(`/members/${member.id}`, {
              method: 'PUT',
              body: { full_name: member.full_name, avatar_url: url, face_enrolled: true }
            });
            notify('Đã thu thập khuôn mặt hội viên thành công!', 'success');
            dialog.instance.hide();
            if (onComplete) await onComplete();
          } catch (err) { errorBox(body, err); }
        }
      } }
    ]);
  }

  async function openRecognition(id) {
    try {
      if (typeof window.SystemModule?.openRecognition !== 'function') throw new Error('Chức năng đăng ký nhận diện chưa được kết nối. Vui lòng thử lại sau.');
      return await window.SystemModule.openRecognition(id);
    } catch (err) { notify(err.message, 'error'); }
  }
  async function openRevokeConsent(id) {
    try {
      if (typeof window.SystemModule?.openRevokeConsent !== 'function') throw new Error('Chức năng rút đồng ý chưa được kết nối. Vui lòng thử lại sau.');
      return await window.SystemModule.openRevokeConsent(id);
    } catch (err) { notify(err.message, 'error'); }
  }
  function quickRegisterPackage(id) {
    if (detailPopup) { try { detailPopup.hide(); } catch (_) { /* Already disposed. */ } detailPopup = null; }
    return window.ParadiseApp.navigateTo('registrations', { member_id: id });
  }
  function dispose() {
    renderVersion++; grid = null; root = null; detailPopup = null;
    $(document).off('.members');
    popups.forEach(instance => { const element = instance.element(); instance.dispose(); element.remove(); }); popups.clear();
  }
  return { render, refresh, openDetail, openMemberModal, openStatus, openRecognition, openRevokeConsent, dispose, openNewWithPhone: phone => openMemberModal(null, phone), quickRegisterPackage };
})();
