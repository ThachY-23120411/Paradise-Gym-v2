window.MembersModule = (function () {
  'use strict';
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
    $('<div>').appendTo(parent).dxDataGrid({ dataSource: rows, columns, columnAutoWidth: true, wordWrapEnabled: true, showBorders: false, rowAlternationEnabled: true, noDataText: empty, paging: { pageSize: 10 }, pager: { showInfo: true } });
  }
  async function openDetail(id) {
    const dialog = popup('Hồ sơ hội viên', 840, true); detailPopup = dialog.instance;
    const load = async () => {
      dialog.content.empty().text('Đang tải hồ sơ...');
      try {
        const member = await getMember(id);
        if (!dialog.host.closest('body').length) return;
        dialog.instance.option('title', `${member.member_code} - ${member.full_name}`); dialog.content.empty();
        const headerCard = $('<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">').appendTo(dialog.content);
        const avatarHtml = member.avatar_url && /^https?:\/\//.test(member.avatar_url)
          ? `<img src="${member.avatar_url}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #237b58;">`
          : `<div style="width:52px;height:52px;border-radius:50%;background:#eaf4ee;color:#237b58;font-size:18px;font-weight:700;display:grid;place-items:center;border:2px solid #237b58;">${(member.full_name || '?').split(' ').slice(-2).map(x => x[0]).join('')}</div>`;
        $(avatarHtml).appendTo(headerCard);
        const headerInfo = $('<div>').appendTo(headerCard);
        $('<div>').append($(badge(headerInfo, member.status)), $(` <span class="status-badge ${member.face_enrolled ? 'badge-success' : 'badge-warning'}">${member.face_enrolled ? 'Đã thu thập khuôn mặt' : 'Chưa có khuôn mặt'}</span>`)).appendTo(headerInfo);

        details(dialog.content, [
          ['Mã hội viên', member.member_code],
          ['Số điện thoại', member.phone],
          ['Email', member.email],
          ['Chi nhánh tiếp nhận', member.home_branch_name],
          ['Ngày sinh', member.date_of_birth ? new Date(member.date_of_birth).toLocaleDateString('vi-VN') : '-'],
          ['Mã QR Check-in', member.qr_code || `MEM-${member.member_code}`]
        ]);
        const actions = $('<div class="view-actions">').css({ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }).appendTo(dialog.content);
        button(actions, { text: 'Sửa hồ sơ', icon: 'edit', onClick: () => { dialog.instance.hide(); openMemberModal(id); } });
        button(actions, { text: 'Đổi trạng thái', icon: 'repeat', onClick: () => { dialog.instance.hide(); openStatus(id); } });
        button(actions, { text: 'Đăng ký gói', icon: 'folder', onClick: () => quickRegisterPackage(id) });
        button(actions, { text: 'Xem mã QR', icon: 'card', onClick: () => openQrModal(member) });
        button(actions, { text: 'Thu thập khuôn mặt', icon: 'user', type: member.face_enrolled ? 'normal' : 'default', onClick: () => openFaceEnrollModal(member, load) });
        const tabs = $('<div>').appendTo(dialog.content), body = $('<div>').css('paddingTop', 16).appendTo(dialog.content);
        let tabVersion = 0;
        async function showTab(tab) {
          const current = ++tabVersion; body.empty();
          if (tab === 'registrations') detailGrid(body, member.registrations || [], [
            { caption: 'Mã đăng ký', calculateCellValue: row => row.reg_code || row.registration_code }, { dataField: 'package_name_snapshot', caption: 'Gói tập' },
            { dataField: 'start_date', caption: 'Bắt đầu', dataType: 'date', format: 'dd/MM/yyyy' }, { dataField: 'end_date', caption: 'Hết hạn', dataType: 'date', format: 'dd/MM/yyyy', customizeText: c => c.value ? c.valueText : '--' },
            { dataField: 'remaining_gym_sessions', caption: 'Lượt Gym còn lại' }, { dataField: 'remaining_pt_sessions', caption: 'Buổi PT còn lại' },
            {
              dataField: 'status', caption: 'Trạng thái', minWidth: 130, cellTemplate: (el, c) => {
                const isFrozen = c.data?.is_frozen || c.value === 'FROZEN';
                const state = window.WebUI.registrationNearExpiry(c.data) ? 'EXPIRING' : c.value;
                const map = { PENDING_PAYMENT: 'Chờ thanh toán', SCHEDULED: 'Chưa đến ngày hiệu lực', ACTIVE: 'Đang hiệu lực', FROZEN: 'Đang đóng băng', EXPIRING: 'Sắp hết hạn', EXPIRED: 'Đã hết hạn', CANCELLED: 'Đã hủy' };
                const tone = isFrozen ? 'badge-info' : state === 'ACTIVE' ? 'badge-success' : state === 'SCHEDULED' ? 'badge-info' : ['PENDING_PAYMENT', 'EXPIRING'].includes(state) ? 'badge-warning' : 'badge-danger';
                const label = isFrozen ? '❄️ Đang đóng băng' : (map[state] || state);
                const $badge = $('<span>').addClass(`status-badge ${tone}`).text(label).appendTo(el);
                if (isFrozen) $badge.css({ background: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc', fontWeight: 600 });
              }
            }
          ], 'Chưa có đăng ký gói');
          if (tab === 'access') {
            const dateFilter = $('<div>').css({ maxWidth: 240, marginBottom: 16 }).appendTo(body);
            const logs = $('<div>').appendTo(body);
            let logVersion = 0;
            async function loadLogs(day) {
              const request = ++logVersion; logs.empty().text('Đang tải lịch sử ra vào...');
              try {
                const response = await api().request('/access-gate/logs?' + new URLSearchParams({ member_id: id, date: dateOnly(day), limit: 1000 }), { headers: { 'x-branch-id': 'ALL' } });
                if (request !== logVersion || current !== tabVersion || !logs[0].isConnected) return;
                logs.empty(); detailGrid(logs, list(response).filter(log => log.member_id === id), [
                  { dataField: 'check_in_time', caption: 'Thời gian', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm' }, { dataField: 'branch_name', caption: 'Chi nhánh' },
                  { dataField: 'direction', caption: 'Chiều' }, { dataField: 'access_method', caption: 'Phương thức' }, { dataField: 'status', caption: 'Kết quả' }, { dataField: 'denial_reason', caption: 'Lý do' }
                ], 'Không có lượt ra vào trong ngày đã chọn');
              } catch (err) { if (current === tabVersion && request === logVersion) { logs.empty(); errorBox(logs, err, () => loadLogs(day)); } }
            }
            dateFilter.dxDateBox({ label: 'Ngày ra vào', labelMode: 'static', type: 'date', displayFormat: 'dd/MM/yyyy', value: new Date(), max: new Date(), onValueChanged: e => { if (e.value) loadLogs(e.value); } });
            await loadLogs(new Date());
          }
          if (tab === 'bookings') {
            body.text('Đang tải lịch tập...');
            try {
              const response = await api().pt.listBookings({ member_id: id });
              if (current !== tabVersion || !body[0].isConnected) return;
              body.empty(); detailGrid(body, list(response).filter(b => b.member_id === id), [
                { dataField: 'booking_date', caption: 'Ngày', dataType: 'date', format: 'dd/MM/yyyy' }, { dataField: 'start_time', caption: 'Bắt đầu' },
                { dataField: 'end_time', caption: 'Kết thúc' }, { dataField: 'pt_name', caption: 'Huấn luyện viên' }, { dataField: 'status', caption: 'Trạng thái' }
              ], 'Chưa có lịch tập PT');
            } catch (err) { if (current === tabVersion) { body.empty(); errorBox(body, err, () => showTab(tab)); } }
          }
          if (tab === 'consents') {
            body.text('Đang tải trạng thái đồng ý...');
            try {
              const response = await api().request(`/members/${encodeURIComponent(id)}/consents`);
              if (current !== tabVersion || !body[0].isConnected) return;
              body.empty(); const state = response.data;
              details(body, [['Nhận diện khuôn mặt', state.recognition_status], ['Trạng thái yêu cầu xóa', state.deletion_status]]);
              detailGrid(body, state.consents || [], [
                { dataField: 'consent_type', caption: 'Loại đồng ý' }, { dataField: 'is_granted', caption: 'Đồng ý', dataType: 'boolean' },
                { dataField: 'policy_version', caption: 'Phiên bản' }, { dataField: 'granted_at', caption: 'Ngày đồng ý', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm' },
                { dataField: 'revoked_at', caption: 'Ngày rút', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm' }
              ], 'Chưa có bản ghi đồng ý');
              const controls = $('<div>').css({ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }).appendTo(body);
              button(controls, { text: 'Đăng ký nhận diện', icon: 'user', onClick: () => openRecognition(id) });
              if (activeRole(user) === 'QTV') button(controls, { text: 'Rút đồng ý', icon: 'remove', type: 'danger', onClick: () => openRevokeConsent(id) });
              button(controls, { icon: 'refresh', hint: 'Cập nhật trạng thái đồng ý', onClick: () => showTab('consents') });
            } catch (err) { if (current === tabVersion) { body.empty(); errorBox(body, err, () => showTab(tab)); } }
          }
        }
        tabs.dxTabs({ dataSource: [{ id: 'registrations', text: 'Gói tập' }, { id: 'bookings', text: 'Lịch PT' }, { id: 'access', text: 'Ra vào' }, { id: 'consents', text: 'Đồng ý & nhận diện' }], selectedIndex: 0, scrollByContent: true, showNavButtons: true, onItemClick: e => showTab(e.itemData.id) });
        const onConsentUpdated = (_, event) => { if (event?.member_id === id && dialog.host.closest('body').length && tabs.dxTabs('instance').option('selectedIndex') === 3) showTab('consents'); };
        $(document).on('paradise:consent-updated.members', onConsentUpdated);
        dialog.instance.on('hidden', () => $(document).off('paradise:consent-updated.members', onConsentUpdated));
        showTab('registrations');
      } catch (err) { if (dialog.host.closest('body').length) { dialog.content.empty(); errorBox(dialog.content, err, load); } }
    };
    dialog.instance.option('toolbarItems', [{ toolbar: 'bottom', location: 'after', widget: 'dxButton', options: { text: 'Đóng', onClick: () => dialog.instance.hide() } }]);
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
