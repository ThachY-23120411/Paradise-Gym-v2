/**
 * W16: Lớp tập cộng đồng (Community Classes Module)
 * Quản lý lịch các lớp tập nhóm (Yoga, Zumba, BodyPump, Cycling, Pilates,...)
 * Hiển thị tiến độ giữ chỗ (25/40 slot), đăng ký hội viên tại quầy và xem danh sách lớp.
 */
window.CommunityModule = (function () {
  'use strict';
  let view = null, revision = 0, selectedDate = new Date();
  const W = () => window.WebUI;
  const api = () => window.apiClient;

  const TIME_OPTIONS = [];
  for (let h = 6; h <= 21; h++) {
    const hh = String(h).padStart(2, '0');
    TIME_OPTIONS.push(`${hh}:00`, `${hh}:15`, `${hh}:30`, `${hh}:45`);
  }
  TIME_OPTIONS.push('22:00');

  function confirmDeleteClass(cls) {
    DevExpress.ui.dialog.confirm(
      `Bạn có chắc chắn muốn xóa lớp tập "<strong>${cls.title}</strong>" (${String(cls.start_time).slice(0, 5)} - ${String(cls.end_time).slice(0, 5)}) tại chi nhánh <strong>${cls.branch_name || ''}</strong>?<br><br><span style="color:#d84848;font-size:12px;">⚠️ Toàn bộ ${cls.enrolled_slots || 0} học viên đã đăng ký sẽ bị hủy theo lớp này.</span>`,
      'Xác nhận xóa lớp tập cộng đồng'
    ).then(async ok => {
      if (!ok) return;
      try {
        await api().request(`/community-classes/${cls.id}`, { method: 'DELETE' });
        DevExpress.ui.notify(`Đã xóa lớp tập "${cls.title}" thành công!`, 'success', 2500);
        await load();
      } catch (err) {
        DevExpress.ui.notify(err.message || 'Không thể xóa lớp tập', 'error', 3500);
      }
    });
  }

  async function render(containerId, context = {}) {
    destroy();
    selectedDate = context.date ? new Date(context.date) : new Date();
    view = W().page(containerId, 'Lớp tập cộng đồng', ParadiseApp.getBranchName());

    $('<div>').appendTo(view.actions).dxDateBox({
      value: selectedDate, type: 'date', displayFormat: 'dd/MM/yyyy', width: 155,
      inputAttr: { 'aria-label': 'Chọn ngày xem lớp' },
      onValueChanged: e => {
        if (e.value) { selectedDate = e.value; load(); }
      }
    });

    if (ParadiseApp.isAdmin()) {
      W().button(view.actions, 'Tạo lớp mới', 'add', () => openCreateClassModal(), true);
    }
    W().button(view.actions, '', 'refresh', () => load()).option('hint', 'Làm mới lịch lớp');

    await load();
  }

  async function load() {
    if (!view) return;
    const target = view.body, version = ++revision;
    W().loading(target);

    try {
      const dateStr = W().dateKey(selectedDate);
      const res = await api().request(`/community-classes?date=${dateStr}`);
      if (version !== revision || !document.contains(target[0])) return;
      target.empty();

      const classes = res.data || [];
      if (!classes.length) {
        return W().empty(target, `Không có lớp tập cộng đồng nào trong ngày ${W().date(selectedDate)}`, 'users-rectangle');
      }

      // Render cards or grid
      const gridContainer = $('<div>').appendTo(target);
      W().grid(gridContainer, classes, [
        {
          caption: 'Lớp học', minWidth: 200,
          cellTemplate: (el, cell) => {
            const r = cell.data;
            $('<div>')
              .append($('<strong style="font-size:14px;color:#237b58;">').text(r.title))
              .append($('<div style="color:#748078;font-size:12px;margin-top:2px;">').text(r.description || 'Lớp tập nhóm thể hình'))
              .appendTo(el);
          }
        },
        { dataField: 'instructor_name', caption: 'Huấn luyện viên', minWidth: 150 },
        {
          caption: 'Thời gian', width: 140,
          calculateCellValue: r => `${String(r.start_time).slice(0, 5)} - ${String(r.end_time).slice(0, 5)}`
        },
        { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 130 },
        {
          caption: 'Chỗ trống', width: 170,
          cellTemplate: (el, cell) => {
            const r = cell.data;
            const enrolled = Number(r.enrolled_slots || 0);
            const max = Number(r.max_slots || 40);
            const pct = Math.min(100, Math.round((enrolled / max) * 100));
            const isFull = enrolled >= max;

            const box = $('<div>').appendTo(el);
            $('<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">')
              .html(`<span>${enrolled}/${max} chỗ</span> <strong style="color:${isFull ? '#d84848' : '#237b58'};">${isFull ? 'HẾT CHỖ' : `Còn ${max - enrolled}`}</strong>`)
              .appendTo(box);
            $('<div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">')
              .append($(`<div style="width:${pct}%;height:100%;background:${isFull ? '#d84848' : '#237b58'};">`))
              .appendTo(box);
          }
        },
        {
          dataField: 'status', caption: 'Trạng thái', width: 120,
          cellTemplate: (el, cell) => {
            const isFull = cell.data.enrolled_slots >= cell.data.max_slots;
            el.append(W().badge(isFull ? 'Đã đủ chỗ' : 'Đang mở', isFull ? 'warning' : 'success'));
          }
        },
        {
          caption: 'Thao tác', width: 340, minWidth: 340, fixed: true, fixedPosition: 'right',
          cellTemplate: (el, cell) => {
            const r = cell.data;
            const isFull = r.enrolled_slots >= r.max_slots;
            const box = $('<div class="class-actions-cell" style="display:flex;gap:6px;align-items:center;flex-wrap:nowrap;">').appendTo(el);

            W().button(box, 'Danh sách', 'group', () => openClassMembersModal(r));

            if (!isFull) {
              W().button(box, 'Đăng ký', 'add', () => openRegisterMemberModal(r), true);
            }

            if (ParadiseApp.isAdmin()) {
              const btnDel = W().button(box, 'Xóa lớp', 'trash', () => confirmDeleteClass(r));
              btnDel.option('stylingMode', 'outlined');
              btnDel.option('type', 'danger');
            }
          }
        }
      ], { columnAutoWidth: true, paging: { pageSize: 10 } });

    } catch (err) {
      if (version === revision) W().error(target, err, load);
    }
  }

  function openCreateClassModal() {
    const dialog = W().popup('Thêm lịch lớp tập cộng đồng', content => {
      const formDiv = $('<div>').appendTo(content);
      const activeBranch = api().getCurrentBranchId();
      const defaultBranches = (activeBranch && activeBranch !== 'ALL') ? [activeBranch] : [];

      const data = {
        branch_ids: defaultBranches,
        title: '',
        instructor_name: '',
        class_date: W().dateKey(selectedDate),
        start_time: '18:00',
        end_time: '19:00',
        max_slots: 40,
        description: ''
      };

      const form = formDiv.dxForm({
        formData: data, labelLocation: 'top', colCount: 2,
        items: [
          {
            dataField: 'branch_ids', label: { text: 'Chi nhánh tổ chức (Chọn một hoặc nhiều chi nhánh)' }, colSpan: 2,
            editorType: 'dxTagBox',
            editorOptions: {
              dataSource: new DevExpress.data.CustomStore({
                key: 'id', loadMode: 'raw',
                load: async () => W().rows(await api().request('/branches', { headers: { 'x-branch-id': 'ALL' } }))
              }),
              valueExpr: 'id', displayExpr: 'branch_name',
              showSelectionControls: true,
              applyValueMode: 'instantly',
              selectAllMode: 'allPages',
              showMultiTagOnly: false,
              searchEnabled: true,
              placeholder: 'Chọn chi nhánh tổ chức (có thể chọn nhiều chi nhánh)...'
            },
            validationRules: [{
              type: 'custom',
              message: 'Vui lòng chọn ít nhất một chi nhánh',
              validationCallback: e => Array.isArray(e.value) && e.value.length > 0
            }]
          },
          {
            dataField: 'title', label: { text: 'Tên lớp học (Yoga, Zumba, BodyPump...)' }, colSpan: 2,
            editorType: 'dxTextBox',
            editorOptions: { placeholder: 'Ví dụ: Yoga Flow Buổi Chiều, Zumba Dance Sôi Động...' },
            validationRules: [{ type: 'required', message: 'Vui lòng nhập tên lớp' }]
          },
          {
            dataField: 'instructor_name', label: { text: 'Huấn luyện viên / Giáo viên' },
            editorType: 'dxTextBox',
            editorOptions: { placeholder: 'Tên HLV hướng dẫn' },
            validationRules: [{ type: 'required', message: 'Vui lòng nhập tên HLV' }]
          },
          {
            dataField: 'class_date', label: { text: 'Ngày học' },
            editorType: 'dxDateBox',
            editorOptions: { type: 'date', displayFormat: 'dd/MM/yyyy', dateSerializationFormat: 'yyyy-MM-dd' },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn ngày học' }]
          },
          {
            dataField: 'start_time', label: { text: 'Giờ bắt đầu' },
            editorType: 'dxSelectBox',
            editorOptions: {
              items: TIME_OPTIONS,
              searchEnabled: true,
              placeholder: 'Chọn giờ bắt đầu...',
              onValueChanged: e => {
                if (e.value && e.value.includes(':')) {
                  const [h, m] = e.value.split(':').map(Number);
                  const endHour = Math.min(22, h + 1);
                  const defaultEnd = `${String(endHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                  form.getEditor('end_time')?.option('value', defaultEnd);
                }
              }
            },
            validationRules: [{ type: 'required', message: 'Chọn giờ bắt đầu' }]
          },
          {
            dataField: 'end_time', label: { text: 'Giờ kết thúc' },
            editorType: 'dxSelectBox',
            editorOptions: {
              items: TIME_OPTIONS,
              searchEnabled: true,
              placeholder: 'Chọn giờ kết thúc...'
            },
            validationRules: [
              { type: 'required', message: 'Chọn giờ kết thúc' },
              {
                type: 'custom',
                message: 'Giờ kết thúc phải sau giờ bắt đầu',
                validationCallback: e => {
                  const start = form.getEditor('start_time')?.option('value');
                  const end = e.value;
                  if (!start || !end) return true;
                  return end > start;
                }
              }
            ]
          },
          {
            dataField: 'max_slots', label: { text: 'Số lượng chỗ tối đa' },
            editorType: 'dxNumberBox', editorOptions: { min: 5, max: 100, value: 40 },
            validationRules: [{ type: 'required', message: 'Nhập số chỗ tối đa' }]
          },
          {
            dataField: 'description', label: { text: 'Mô tả lớp học & lưu ý' }, colSpan: 2,
            editorType: 'dxTextArea', editorOptions: { height: 80, placeholder: 'Mang theo thảm tập cá nhân, khăn lau...' }
          }
        ]
      }).dxForm('instance');

      $('<div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">').append(
        $('<div>').dxButton({ text: 'Hủy', onClick: () => dialog.hide() }),
        $('<div>').dxButton({
          text: 'Tạo lớp học', type: 'default', stylingMode: 'contained', icon: 'save',
          onClick: async () => {
            if (!form.validate().isValid) return;
            const branchIds = Array.isArray(data.branch_ids) ? data.branch_ids : [data.branch_ids].filter(Boolean);
            if (!branchIds.length) {
              DevExpress.ui.notify('Vui lòng chọn ít nhất một chi nhánh', 'warning');
              return;
            }
            try {
              await api().request('/community-classes', {
                method: 'POST',
                body: { ...data, branch_ids: branchIds }
              });
              DevExpress.ui.notify(`Đã tạo lớp tập cộng đồng cho ${branchIds.length} chi nhánh thành công!`, 'success', 2500);
              dialog.hide();
              await load();
            } catch (err) { DevExpress.ui.notify(err.message, 'error', 3500); }
          }
        })
      ).appendTo(content);
    }, [], 640);
  }

  function openRegisterMemberModal(cls) {
    const dialog = W().popup(`Đăng ký lớp: ${cls.title}`, content => {
      const formDiv = $('<div>').appendTo(content);
      const data = { member_id: null };

      $('<div style="margin-bottom:12px;padding:10px;background:#f8fbf9;border:1px solid #dfe6e2;border-radius:4px;font-size:12px;">')
        .html(`
          <div><strong>Lớp:</strong> ${cls.title} (${cls.start_time.slice(0, 5)} - ${cls.end_time.slice(0, 5)})</div>
          <div><strong>HLV:</strong> ${cls.instructor_name} | <strong>Chỗ:</strong> ${cls.enrolled_slots}/${cls.max_slots}</div>
          <div style="color:#237b58;margin-top:4px;">* Yêu cầu: Hội viên có gói Gym còn hiệu lực sử dụng.</div>
        `).appendTo(formDiv);

      const form = formDiv.dxForm({
        formData: data, labelLocation: 'top',
        items: [
          {
            dataField: 'member_id', label: { text: 'Chọn hội viên tham gia' },
            editorType: 'dxSelectBox',
            editorOptions: {
              dataSource: new DevExpress.data.CustomStore({
                key: 'id', loadMode: 'processed',
                load: async opts => {
                  const q = String(opts.searchValue || '').trim();
                  if (q.length < 2) return [];
                  const res = await api().request(`/access-gate/members?q=${encodeURIComponent(q)}`);
                  return W().rows(res);
                },
                byKey: async id => (await api().request(`/members/${id}`)).data
              }),
              minSearchLength: 2, searchEnabled: true,
              valueExpr: 'id',
              displayExpr: item => item ? `${item.member_code} · ${item.full_name} · ${item.phone}` : '',
              placeholder: 'Tìm theo mã HV, họ tên hoặc SĐT...'
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn hội viên' }]
          }
        ]
      }).dxForm('instance');

      $('<div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">').append(
        $('<div>').dxButton({ text: 'Hủy', onClick: () => dialog.hide() }),
        $('<div>').dxButton({
          text: 'Xác nhận ghi danh', type: 'default', stylingMode: 'contained', icon: 'check',
          onClick: async () => {
            if (!form.validate().isValid) return;
            try {
              await api().request(`/community-classes/${cls.id}/register`, {
                method: 'POST',
                body: { member_id: data.member_id }
              });
              DevExpress.ui.notify('Đã đăng ký hội viên vào lớp thành công!', 'success', 2500);
              dialog.hide();
              await load();
            } catch (err) { DevExpress.ui.notify(err.message, 'error', 3500); }
          }
        })
      ).appendTo(content);
    });
  }

  async function openClassMembersModal(cls) {
    const dialog = W().popup(`Danh sách học viên: ${cls.title}`, content => {
      W().loading(content);
      api().request(`/community-classes/${cls.id}/members`).then(res => {
        content.empty();
        const members = res.data?.members || [];

        $('<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">')
          .html(`<div><strong>${cls.title}</strong> (${cls.start_time.slice(0, 5)} - ${cls.end_time.slice(0, 5)}) - HLV: ${cls.instructor_name}</div><strong style="color:#237b58;">${members.length}/${cls.max_slots} học viên</strong>`)
          .appendTo(content);

        if (!members.length) {
          return W().empty(content, 'Lớp học hiện chưa có học viên nào đăng ký', 'users');
        }

        W().grid(content, members, [
          { dataField: 'member_code', caption: 'Mã HV', width: 110 },
          { dataField: 'full_name', caption: 'Họ và tên', minWidth: 160 },
          { dataField: 'phone', caption: 'Số điện thoại', width: 120 },
          { dataField: 'registration_date', caption: 'Thời điểm đăng ký', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm', width: 150 },
          {
            caption: 'Hủy đăng ký', width: 120,
            cellTemplate: (el, cell) => {
              const btn = W().button(el, 'Hủy', 'trash', () => {
                DevExpress.ui.dialog.confirm(
                  `Bạn có chắc muốn hủy đăng ký lớp của học viên <strong>${cell.data.full_name}</strong> (${cell.data.member_code}) không?`,
                  'Xác nhận hủy đăng ký'
                ).then(async ok => {
                  if (!ok) return;
                  try {
                    await api().request(`/community-classes/${cls.id}/cancel`, {
                      method: 'POST',
                      body: { member_id: cell.data.member_id }
                    });
                    DevExpress.ui.notify('Đã hủy đăng ký học viên khỏi lớp', 'success', 2500);
                    dialog.hide();
                    await load();
                  } catch (err) { DevExpress.ui.notify(err.message, 'error', 3500); }
                });
              });
              btn.option('stylingMode', 'outlined');
              btn.option('type', 'danger');
            }
          }
        ], { columnAutoWidth: true, paging: { pageSize: 8 } });
      }).catch(err => W().error(content, err));
    }, [], 750);
  }

  function destroy() { revision++; view = null; }
  return { render, refresh: load, destroy };
})();
