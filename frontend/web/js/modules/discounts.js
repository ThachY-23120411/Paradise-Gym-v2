/**
 * W17: Quản lý voucher & khuyến mãi (Discounts Module)
 * Dành cho Quản trị viên (QTV)
 * Quản lý mã giảm giá, voucher % hoặc tiền mặt, giới hạn lượt dùng và thời gian áp dụng.
 */
window.DiscountsModule = (function () {
  'use strict';
  let view = null, revision = 0;
  const W = () => window.WebUI;
  const api = () => window.apiClient;

  async function render(containerId, context = {}) {
    destroy();
    view = W().page(containerId, 'Voucher & khuyến mãi', ParadiseApp.getBranchName());

    W().button(view.actions, 'Tạo mã voucher', 'add', () => openDiscountModal(), true);
    W().button(view.actions, '', 'refresh', () => load()).option('hint', 'Làm mới danh sách');

    await load();
  }

  async function load() {
    if (!view) return;
    const target = view.body, version = ++revision;
    W().loading(target);

    try {
      const res = await api().request('/discounts');
      if (version !== revision || !document.contains(target[0])) return;
      target.empty();

      const discounts = res.data || [];
      if (!discounts.length) {
        return W().empty(target, 'Chưa có mã khuyến mãi hoặc voucher nào được tạo.', 'ticket-simple');
      }

      const gridContainer = $('<div>').appendTo(target);
      W().grid(gridContainer, discounts, [
        {
          dataField: 'code', caption: 'Mã voucher', width: 130,
          cellTemplate: (el, cell) => {
            $('<span style="font-family:\'Manrope\', monospace; font-weight: 700; color: #253e30; font-size: 13px; letter-spacing: 0.5px;">')
              .text(cell.value)
              .appendTo(el);
          }
        },
        {
          dataField: 'title', caption: 'Tên chương trình', minWidth: 200,
          cellTemplate: (el, cell) => {
            $('<strong>').css({ color: '#26332e', fontSize: '13px' }).text(cell.value).appendTo(el);
          }
        },
        {
          caption: 'Chi nhánh áp dụng', width: 190,
          cellTemplate: (el, cell) => {
            const r = cell.data;
            const names = (r.branch_names && r.branch_names.length) ? r.branch_names : (r.branch_name ? [r.branch_name] : []);
            if (!names.length || names.length >= 3) {
              $('<span style="color:#748078;font-size:13px;">')
                .text('Toàn chuỗi')
                .appendTo(el);
            } else if (names.length === 1) {
              $('<span style="color:#26332e;font-size:13px;">')
                .text(names[0])
                .appendTo(el);
            } else {
              const shortNames = names.map(n => n.replace('Paradise Gym ', '')).join(', ');
              $('<span style="color:#26332e;font-size:13px;" title="' + names.join(', ') + '">')
                .text(shortNames)
                .appendTo(el);
            }
          }
        },
        {
          caption: 'Mức giảm', width: 110, alignment: 'right',
          cellTemplate: (el, cell) => {
            const r = cell.data;
            if (r.discount_type === 'PERCENT') {
              $('<span style="font-weight:600;color:#253e30;">').text(`Giảm ${r.discount_value}%`).appendTo(el);
            } else {
              $('<span style="font-weight:600;color:#253e30;">').text(`Giảm ${W().money(r.discount_value)}`).appendTo(el);
            }
          }
        },
        {
          caption: 'Giảm tối đa', width: 120, alignment: 'right',
          cellTemplate: (el, cell) => {
            const r = cell.data;
            if (r.discount_type === 'PERCENT' && r.max_discount_amount) {
              $('<span style="font-weight:500;color:#26332e;">').text(W().money(r.max_discount_amount)).appendTo(el);
            } else {
              $('<span style="color:#8b978f;">').text('--').appendTo(el);
            }
          }
        },
        {
          caption: 'Đơn tối thiểu', width: 120, alignment: 'right',
          cellTemplate: (el, cell) => {
            const r = cell.data;
            if (r.min_order_value && Number(r.min_order_value) > 0) {
              $('<span style="color:#26332e;">').text(W().money(r.min_order_value)).appendTo(el);
            } else {
              $('<span style="color:#8b978f;">').text('--').appendTo(el);
            }
          }
        },
        {
          caption: 'Thời hạn áp dụng', width: 175, alignment: 'center',
          calculateCellValue: r => `${W().date(r.start_date)} - ${W().date(r.end_date)}`
        },
        {
          caption: 'Lượt sử dụng', width: 110, alignment: 'center',
          calculateCellValue: r => `${r.used_count || 0} / ${r.usage_limit != null ? r.usage_limit : '∞'}`
        },
        {
          dataField: 'is_active', caption: 'Trạng thái', width: 115, alignment: 'center',
          cellTemplate: (el, cell) => {
            const active = Boolean(cell.value);
            el.append(W().badge(active ? 'Đang bật' : 'Đã tắt', active ? 'success' : 'neutral'));
          }
        },
        {
          caption: 'Thao tác', width: 100, alignment: 'center', fixed: true, fixedPosition: 'right',
          cellTemplate: (el, cell) => {
            const r = cell.data;
            const box = $('<div style="display:flex;justify-content:center;">').appendTo(el);
            W().button(box, r.is_active ? 'Tắt' : 'Bật', r.is_active ? 'remove' : 'check', async () => {
              try {
                await api().request(`/discounts/${r.id}`, {
                  method: 'PUT',
                  body: { is_active: !r.is_active }
                });
                DevExpress.ui.notify(`Đã ${r.is_active ? 'tắt' : 'bật'} mã ${r.code}`, 'success', 2500);
                await load();
              } catch (err) { DevExpress.ui.notify(err.message, 'error', 3500); }
            });
          }
        }
      ], { columnAutoWidth: true, paging: { pageSize: 10 } });

    } catch (err) {
      if (version === revision) W().error(target, err, load);
    }
  }

  async function openDiscountModal() {
    let branches = [];
    try {
      const bRes = await api().request('/branches', { headers: { 'x-branch-id': 'ALL' } });
      branches = W().rows(bRes);
    } catch (e) {
      branches = [];
    }

    const allBranchIds = branches.map(b => b.id);
    const branchOptions = [
      { id: 'ALL', branch_name: 'Áp dụng toàn chuỗi (Tất cả chi nhánh)' },
      ...branches.map(b => ({ id: b.id, branch_name: b.branch_name }))
    ];
    const currentBranchId = api().getCurrentBranchId();
    let initialBranches;
    if (currentBranchId && currentBranchId !== 'ALL' && allBranchIds.includes(currentBranchId)) {
      initialBranches = [currentBranchId];
    } else {
      initialBranches = ['ALL', ...allBranchIds];
    }

    const dialog = W().popup('Tạo mã voucher / khuyến mãi mới', content => {
      const formDiv = $('<div>').appendTo(content);
      const data = {
        branch_ids: initialBranches,
        code: '',
        title: '',
        discount_type: 'PERCENT',
        discount_value: 10,
        min_order_value: 0,
        max_discount_amount: null,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        usage_limit: 100,
        is_active: true
      };

      const form = formDiv.dxForm({
        formData: data,
        labelLocation: 'top',
        showColonAfterLabel: false,
        colCount: 2,
        items: [
          {
            dataField: 'branch_ids', label: { text: 'Chi nhánh áp dụng' },
            editorType: 'dxTagBox',
            colSpan: 2,
            editorOptions: {
              items: branchOptions,
              valueExpr: 'id', displayExpr: 'branch_name',
              searchEnabled: true,
              showSelectionControls: true,
              applyValueMode: 'instantly',
              multiline: true,
              showDropDownButton: true,
              placeholder: 'Chọn chi nhánh áp dụng...',
              onValueChanged: function (e) {
                if (e.component._isSyncing) return;
                const newValues = e.value || [];
                const prevValues = e.previousValue || [];
                const selectedSet = new Set(newValues);
                const prevSet = new Set(prevValues);

                e.component._isSyncing = true;
                try {
                  // 1. Nếu người dùng vừa tick chọn "Tất cả" (ALL) -> tự động tick tất cả chi nhánh
                  if (selectedSet.has('ALL') && !prevSet.has('ALL')) {
                    e.component.option('value', ['ALL', ...allBranchIds]);
                    return;
                  }

                  // 2. Nếu người dùng vừa bỏ tick "Tất cả" (ALL) -> bỏ chọn tất cả
                  if (!selectedSet.has('ALL') && prevSet.has('ALL')) {
                    e.component.option('value', []);
                    return;
                  }

                  // 3. Xử lý khi người dùng chọn/bỏ chọn từng chi nhánh
                  const realCount = allBranchIds.filter(id => selectedSet.has(id)).length;
                  if (realCount === allBranchIds.length) {
                    if (!selectedSet.has('ALL')) {
                      e.component.option('value', ['ALL', ...allBranchIds]);
                    }
                  } else {
                    if (selectedSet.has('ALL')) {
                      e.component.option('value', newValues.filter(id => id !== 'ALL'));
                    }
                  }
                } finally {
                  e.component._isSyncing = false;
                }
              }
            },
            validationRules: [
              {
                type: 'custom',
                message: 'Vui lòng chọn ít nhất một chi nhánh áp dụng',
                validationCallback: e => Array.isArray(e.value) && e.value.length > 0
              }
            ]
          },
          {
            dataField: 'code', label: { text: 'Mã khuyến mãi (Code)' },
            editorType: 'dxTextBox', editorOptions: { placeholder: 'VÍ DỤ: SUMMER2026, VIP10...' },
            validationRules: [{ type: 'required', message: 'Vui lòng nhập mã code' }]
          },
          {
            dataField: 'title', label: { text: 'Tên chương trình khuyến mãi' },
            editorType: 'dxTextBox', editorOptions: { placeholder: 'Chào hè 2026, Khai xuân...' },
            validationRules: [{ type: 'required', message: 'Vui lòng nhập tên chương trình' }]
          },
          {
            dataField: 'discount_type', label: { text: 'Hình thức giảm' },
            editorType: 'dxSelectBox',
            editorOptions: {
              items: [
                { id: 'PERCENT', text: 'Giảm theo tỷ lệ phần trăm (%)' },
                { id: 'FIXED_AMOUNT', text: 'Giảm số tiền cố định (VNĐ)' }
              ],
              valueExpr: 'id', displayExpr: 'text',
              onValueChanged: e => {
                const isPercent = e.value === 'PERCENT';
                form.itemOption('max_discount_amount', 'visible', isPercent);
                form.itemOption('discount_value', 'label', {
                  text: isPercent ? 'Giá trị giảm (%)' : 'Giá trị giảm (VNĐ)'
                });
                if (!isPercent) {
                  form.updateData('max_discount_amount', null);
                  data.max_discount_amount = null;
                }
              }
            },
            validationRules: [{ type: 'required', message: 'Chọn hình thức giảm' }]
          },
          {
            dataField: 'discount_value', name: 'discount_value',
            label: { text: data.discount_type === 'PERCENT' ? 'Giá trị giảm (%)' : 'Giá trị giảm (VNĐ)' },
            editorType: 'dxNumberBox',
            editorOptions: { min: 1, format: '#,##0' },
            validationRules: [{ type: 'required', message: 'Nhập giá trị giảm' }]
          },
          {
            dataField: 'min_order_value', label: { text: 'Đơn hàng tối thiểu (VNĐ)' },
            editorType: 'dxNumberBox', editorOptions: { min: 0, format: '#,##0' }
          },
          {
            dataField: 'max_discount_amount', name: 'max_discount_amount',
            label: { text: 'Giảm tối đa (VNĐ)' },
            visible: data.discount_type === 'PERCENT',
            editorType: 'dxNumberBox', editorOptions: { min: 0, format: '#,##0' }
          },
          {
            dataField: 'start_date', label: { text: 'Ngày bắt đầu' },
            editorType: 'dxDateBox', editorOptions: { type: 'date', displayFormat: 'dd/MM/yyyy', dateSerializationFormat: 'yyyy-MM-dd' },
            validationRules: [{ type: 'required', message: 'Chọn ngày bắt đầu' }]
          },
          {
            dataField: 'end_date', label: { text: 'Ngày kết thúc' },
            editorType: 'dxDateBox', editorOptions: { type: 'date', displayFormat: 'dd/MM/yyyy', dateSerializationFormat: 'yyyy-MM-dd' },
            validationRules: [{ type: 'required', message: 'Chọn ngày kết thúc' }]
          },
          {
            dataField: 'usage_limit', label: { text: 'Số lượt sử dụng tối đa' },
            editorType: 'dxNumberBox', editorOptions: { min: 1 }
          }
        ]
      }).dxForm('instance');

      $('<div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">').append(
        $('<div>').dxButton({ text: 'Hủy', stylingMode: 'outlined', onClick: () => dialog.hide() }),
        $('<div>').dxButton({
          text: 'Tạo mã voucher', type: 'default', stylingMode: 'contained', icon: 'save',
          onClick: async () => {
            if (!form.validate().isValid) return;
            const currentData = form.option('formData') || data;
            const isPercent = currentData.discount_type === 'PERCENT';
            if (isPercent && Number(currentData.discount_value) > 100) {
              return DevExpress.ui.notify('Tỷ lệ giảm phần trăm không được vượt quá 100%', 'error', 3000);
            }
            const selectedIds = (currentData.branch_ids || []).filter(id => id !== 'ALL');
            const isAll = (currentData.branch_ids || []).includes('ALL') || selectedIds.length === 0 || selectedIds.length === allBranchIds.length;
            const branchId = isAll ? null : (selectedIds.length === 1 ? selectedIds[0] : null);
            const branchIds = isAll ? null : selectedIds;

            try {
              await api().request('/discounts', {
                method: 'POST',
                body: {
                  ...currentData,
                  branch_id: branchId,
                  branch_ids: branchIds,
                  code: String(currentData.code || '').toUpperCase().replace(/\s+/g, ''),
                  max_discount_amount: isPercent ? (Number(currentData.max_discount_amount) || null) : null
                }
              });
              DevExpress.ui.notify('Đã tạo mã khuyến mãi thành công!', 'success', 2500);
              dialog.hide();
              await load();
            } catch (err) { DevExpress.ui.notify(err.message, 'error', 3500); }
          }
        })
      ).appendTo(content);
    });
  }

  function destroy() { revision++; view = null; }
  return { render, refresh: load, destroy };
})();
