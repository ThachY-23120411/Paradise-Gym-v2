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
          dataField: 'title', caption: 'Tên chương trình', minWidth: 180,
          cellTemplate: (el, cell) => {
            $('<strong>').css({ color: '#26332e', fontSize: '13px' }).text(cell.value).appendTo(el);
          }
        },
        {
          caption: 'Gói áp dụng', width: 170,
          cellTemplate: (el, cell) => {
            const r = cell.data;
            if (r.applicable_package_name) {
              $('<span style="font-weight:600;color:#185740;">')
                .text(r.applicable_package_name)
                .appendTo(el);
            } else {
              $('<span style="color:#748078;">').text('Tất cả gói tập').appendTo(el);
            }
          }
        },
        {
          caption: 'Chi nhánh áp dụng', width: 180,
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
          caption: 'Mức giảm / Khuyến mãi', minWidth: 140, alignment: 'right',
          cellTemplate: (el, cell) => {
            const r = cell.data;
            if (r.discount_type === 'PERCENT') {
              $('<span style="font-weight:600;color:#253e30;">').text(`Giảm ${r.discount_value}%`).appendTo(el);
            } else if (r.discount_type === 'FIXED_AMOUNT') {
              $('<span style="font-weight:600;color:#253e30;">').text(`Giảm ${W().money(r.discount_value)}`).appendTo(el);
            } else if (r.discount_type === 'SESSION') {
              $('<span style="font-weight:600;color:#237b58;">').text(`Tặng ${r.bonus_pt_sessions} buổi`).appendTo(el);
            } else if (r.discount_type === 'DAY') {
              $('<span style="font-weight:600;color:#237b58;">').text(`Tặng ${r.bonus_days} ngày`).appendTo(el);
            } else if (r.discount_type === 'BOTH') {
              $('<span style="font-weight:600;color:#237b58;">').text(`Tặng ${r.bonus_days} ngày + ${r.bonus_pt_sessions} buổi PT`).appendTo(el);
            } else {
              $('<span style="color:#8b978f;">').text('--').appendTo(el);
            }
          }
        },
        {
          caption: 'Giảm tối đa', width: 110, alignment: 'right',
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
          caption: 'Đơn tối thiểu', width: 110, alignment: 'right',
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
    let packages = [];
    try {
      const [bRes, pRes] = await Promise.all([
        api().request('/branches', { headers: { 'x-branch-id': 'ALL' } }),
        api().request('/packages', { headers: { 'x-branch-id': 'ALL' } })
      ]);
      branches = W().rows(bRes);
      packages = W().rows(pRes);
    } catch (e) {
      branches = [];
      packages = [];
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

    function getPackageOptions(selectedBranchIds) {
      const isAll = !selectedBranchIds || selectedBranchIds.includes('ALL') || selectedBranchIds.length === 0 || selectedBranchIds.length === allBranchIds.length;
      const filtered = isAll ? packages : packages.filter(p => {
        const pB = p.branch_ids || [];
        return selectedBranchIds.some(bid => pB.includes(bid));
      });

      return [
        { id: null, text: 'Tất cả gói tập (Không giới hạn)', package_type: null },
        ...filtered.map(p => {
          let typeLabel = 'Theo ngày';
          if (p.package_type === 'PT_SESSION') typeLabel = 'Buổi PT';
          else if (p.package_type === 'GYM_SESSION') typeLabel = 'Buổi Gym';
          else if (p.package_type === 'COMBO') typeLabel = 'Gói Combo';
          return {
            id: p.id,
            text: `${p.package_name} [${typeLabel}] - ${W().money(p.price)}`,
            package_type: p.package_type
          };
        })
      ];
    }

    const dialog = W().popup('Tạo mã voucher / khuyến mãi mới', content => {
      const formDiv = $('<div>').appendTo(content);
      const data = {
        branch_ids: initialBranches,
        applicable_package_id: null,
        code: '',
        title: '',
        discount_type: 'PERCENT',
        discount_value: 10,
        bonus_days: null,
        bonus_pt_sessions: null,
        min_order_value: 0,
        max_discount_amount: null,
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        usage_limit: 100,
        is_active: true
      };

      let formInstance = null;

      function updatePromotionTypeState(pkgId, preferredType) {
        if (!formInstance) return;
        const pkg = packages.find(p => p.id === pkgId);
        const pkgType = pkg ? pkg.package_type : null;

        let availableTypes = [];
        let nextType = preferredType || data.discount_type;
        let isReadOnly = false;

        if (pkgType === 'PT_SESSION' || pkgType === 'GYM_SESSION') {
          // TH1: Gói theo buổi
          availableTypes = [
            { id: 'PERCENT', text: 'Giảm theo tỷ lệ phần trăm (%)' },
            { id: 'FIXED_AMOUNT', text: 'Giảm số tiền cố định (VNĐ)' },
            { id: 'SESSION', text: 'Tặng số buổi tập (Buổi)' }
          ];
          if (!['PERCENT', 'FIXED_AMOUNT', 'SESSION'].includes(nextType)) {
            nextType = 'SESSION';
          }
        } else if (pkgType === 'GYM_TIME') {
          // TH2: Gói theo ngày
          availableTypes = [
            { id: 'PERCENT', text: 'Giảm theo tỷ lệ phần trăm (%)' },
            { id: 'FIXED_AMOUNT', text: 'Giảm số tiền cố định (VNĐ)' },
            { id: 'DAY', text: 'Tặng thời gian tập (Ngày)' }
          ];
          if (!['PERCENT', 'FIXED_AMOUNT', 'DAY'].includes(nextType)) {
            nextType = 'DAY';
          }
        } else if (pkgType === 'COMBO') {
          // TH3: Gói Combo -> Hỗ trợ %, VNĐ và Khuyến mãi theo buổi và ngày
          availableTypes = [
            { id: 'PERCENT', text: 'Giảm theo tỷ lệ phần trăm (%)' },
            { id: 'FIXED_AMOUNT', text: 'Giảm số tiền cố định (VNĐ)' },
            { id: 'BOTH', text: 'Khuyến mãi theo buổi và ngày' }
          ];
          if (!['PERCENT', 'FIXED_AMOUNT', 'BOTH'].includes(nextType)) {
            nextType = 'PERCENT';
          }
          isReadOnly = false;
        } else {
          // TH0: Tất cả gói
          availableTypes = [
            { id: 'PERCENT', text: 'Giảm theo tỷ lệ phần trăm (%)' },
            { id: 'FIXED_AMOUNT', text: 'Giảm số tiền cố định (VNĐ)' }
          ];
          if (!['PERCENT', 'FIXED_AMOUNT'].includes(nextType)) {
            nextType = 'PERCENT';
          }
        }

        const curEditorOptions = formInstance.itemOption('discount_type').editorOptions || {};
        formInstance.itemOption('discount_type', 'editorOptions', {
          ...curEditorOptions,
          items: availableTypes,
          readOnly: isReadOnly
        });

        const selectBox = formInstance.getEditor('discount_type');
        if (selectBox) {
          selectBox.option('items', availableTypes);
          selectBox.option('value', nextType);
          selectBox.option('readOnly', isReadOnly);
        }
        data.discount_type = nextType;
        formInstance.updateData('discount_type', nextType);
        const edType = formInstance.getEditor('discount_type');
        if (edType) {
          edType.option('readOnly', isReadOnly);
          edType.option('value', nextType);
        }

        const isPercent = nextType === 'PERCENT';
        const isFixed = nextType === 'FIXED_AMOUNT';
        const isSession = nextType === 'SESSION';
        const isDay = nextType === 'DAY';
        const isBoth = nextType === 'BOTH';

        formInstance.itemOption('discount_value', 'visible', isPercent || isFixed);
        formInstance.itemOption('discount_value', 'label', {
          text: isPercent ? 'Giá trị giảm (%)' : 'Giá trị giảm (VNĐ)'
        });

        formInstance.itemOption('max_discount_amount', 'visible', isPercent);
        if (!isPercent) {
          formInstance.updateData('max_discount_amount', null);
        }

        formInstance.itemOption('bonus_days', 'visible', isDay || isBoth);
        formInstance.itemOption('bonus_days', 'label', {
          text: isBoth ? 'Số ngày gym khuyến mãi' : 'Số ngày khuyến mãi'
        });

        formInstance.itemOption('bonus_pt_sessions', 'visible', isSession || isBoth);
        formInstance.itemOption('bonus_pt_sessions', 'label', {
          text: isBoth ? 'Số buổi PT khuyến mãi' : 'Số buổi khuyến mãi'
        });
      }

      formInstance = formDiv.dxForm({
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
                  if (selectedSet.has('ALL') && !prevSet.has('ALL')) {
                    e.component.option('value', ['ALL', ...allBranchIds]);
                    return;
                  }
                  if (!selectedSet.has('ALL') && prevSet.has('ALL')) {
                    e.component.option('value', []);
                    return;
                  }
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
                  // Update packages available
                  const currentVals = e.component.option('value') || [];
                  const pkgEditor = formInstance ? formInstance.getEditor('applicable_package_id') : null;
                  if (pkgEditor) {
                    const newPkgItems = getPackageOptions(currentVals);
                    pkgEditor.option('items', newPkgItems);
                    const curPkgId = pkgEditor.option('value');
                    if (curPkgId && !newPkgItems.some(item => item.id === curPkgId)) {
                      pkgEditor.option('value', null);
                      updatePromotionTypeState(null);
                    }
                  }
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
            dataField: 'applicable_package_id', label: { text: 'Gói tập áp dụng' },
            editorType: 'dxSelectBox',
            colSpan: 2,
            editorOptions: {
              items: getPackageOptions(initialBranches),
              valueExpr: 'id', displayExpr: 'text',
              searchEnabled: true,
              showClearButton: true,
              placeholder: 'Tất cả gói tập (hoặc chọn gói cụ thể)...',
              onValueChanged: function (e) {
                data.applicable_package_id = e.value || null;
                updatePromotionTypeState(e.value);
              }
            }
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
            dataField: 'discount_type', label: { text: 'Hình thức khuyến mãi' },
            editorType: 'dxSelectBox',
            editorOptions: {
              items: [
                { id: 'PERCENT', text: 'Giảm theo tỷ lệ phần trăm (%)' },
                { id: 'FIXED_AMOUNT', text: 'Giảm số tiền cố định (VNĐ)' }
              ],
              valueExpr: 'id', displayExpr: 'text',
              onValueChanged: e => {
                if (!e.value) return;
                data.discount_type = e.value;
                const isPercent = e.value === 'PERCENT';
                const isFixed = e.value === 'FIXED_AMOUNT';
                const isSession = e.value === 'SESSION';
                const isDay = e.value === 'DAY';
                const isBoth = e.value === 'BOTH';

                formInstance.itemOption('discount_value', 'visible', isPercent || isFixed);
                formInstance.itemOption('discount_value', 'label', {
                  text: isPercent ? 'Giá trị giảm (%)' : 'Giá trị giảm (VNĐ)'
                });

                formInstance.itemOption('max_discount_amount', 'visible', isPercent);
                if (!isPercent) {
                  formInstance.updateData('max_discount_amount', null);
                }

                formInstance.itemOption('bonus_days', 'visible', isDay || isBoth);
                formInstance.itemOption('bonus_days', 'label', {
                  text: isBoth ? 'Số ngày gym khuyến mãi' : 'Số ngày khuyến mãi'
                });

                formInstance.itemOption('bonus_pt_sessions', 'visible', isSession || isBoth);
                formInstance.itemOption('bonus_pt_sessions', 'label', {
                  text: isBoth ? 'Số buổi PT khuyến mãi' : 'Số buổi khuyến mãi'
                });
              }
            },
            validationRules: [{ type: 'required', message: 'Chọn hình thức khuyến mãi' }]
          },
          {
            dataField: 'discount_value', name: 'discount_value',
            label: { text: 'Giá trị giảm (%)' },
            editorType: 'dxNumberBox',
            editorOptions: { min: 1, format: '#,##0' }
          },
          {
            dataField: 'bonus_days', name: 'bonus_days',
            label: { text: 'Số ngày khuyến mãi' },
            visible: false,
            editorType: 'dxNumberBox',
            editorOptions: { min: 1, format: '#,##0' }
          },
          {
            dataField: 'bonus_pt_sessions', name: 'bonus_pt_sessions',
            label: { text: 'Số buổi khuyến mãi' },
            visible: false,
            editorType: 'dxNumberBox',
            editorOptions: { min: 1, format: '#,##0' }
          },
          {
            dataField: 'min_order_value', label: { text: 'Đơn hàng tối thiểu (VNĐ)' },
            editorType: 'dxNumberBox', editorOptions: { min: 0, format: '#,##0' }
          },
          {
            dataField: 'max_discount_amount', name: 'max_discount_amount',
            label: { text: 'Giảm tối đa (VNĐ)' },
            visible: true,
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
            if (!formInstance.validate().isValid) return;
            const currentData = formInstance.option('formData') || data;
            const dType = currentData.discount_type;
            const pkgId = currentData.applicable_package_id || null;

            if (dType === 'PERCENT') {
              const val = Number(currentData.discount_value);
              if (!val || val <= 0) return DevExpress.ui.notify('Vui lòng nhập giá trị giảm phần trăm', 'error', 3000);
              if (val > 100) return DevExpress.ui.notify('Tỷ lệ giảm phần trăm không được vượt quá 100%', 'error', 3000);
            } else if (dType === 'FIXED_AMOUNT') {
              const val = Number(currentData.discount_value);
              if (!val || val <= 0) return DevExpress.ui.notify('Vui lòng nhập số tiền giảm cố định', 'error', 3000);
            } else if (dType === 'SESSION') {
              const bonusPt = parseInt(currentData.bonus_pt_sessions, 10);
              if (!bonusPt || bonusPt <= 0) return DevExpress.ui.notify('Vui lòng nhập số buổi khuyến mãi', 'error', 3000);
            } else if (dType === 'DAY') {
              const bonusD = parseInt(currentData.bonus_days, 10);
              if (!bonusD || bonusD <= 0) return DevExpress.ui.notify('Vui lòng nhập số ngày khuyến mãi', 'error', 3000);
            } else if (dType === 'BOTH') {
              const bonusD = parseInt(currentData.bonus_days, 10);
              const bonusPt = parseInt(currentData.bonus_pt_sessions, 10);
              if (!bonusD || bonusD <= 0) return DevExpress.ui.notify('Vui lòng nhập số ngày gym khuyến mãi', 'error', 3000);
              if (!bonusPt || bonusPt <= 0) return DevExpress.ui.notify('Vui lòng nhập số buổi PT khuyến mãi', 'error', 3000);
            }

            const selectedIds = (currentData.branch_ids || []).filter(id => id !== 'ALL');
            const isAll = (currentData.branch_ids || []).includes('ALL') || selectedIds.length === 0 || selectedIds.length === allBranchIds.length;
            const branchId = isAll ? null : (selectedIds.length === 1 ? selectedIds[0] : null);
            const branchIds = isAll ? null : selectedIds;

            try {
              await api().request('/discounts', {
                method: 'POST',
                body: {
                  branch_id: branchId,
                  branch_ids: branchIds,
                  applicable_package_id: pkgId,
                  code: String(currentData.code || '').toUpperCase().replace(/\s+/g, ''),
                  title: currentData.title,
                  discount_type: dType,
                  discount_value: ['PERCENT', 'FIXED_AMOUNT'].includes(dType) ? Number(currentData.discount_value) : 0,
                  bonus_pt_sessions: ['SESSION', 'BOTH'].includes(dType) ? parseInt(currentData.bonus_pt_sessions, 10) : null,
                  bonus_days: ['DAY', 'BOTH'].includes(dType) ? parseInt(currentData.bonus_days, 10) : null,
                  min_order_value: Number(currentData.min_order_value || 0),
                  max_discount_amount: dType === 'PERCENT' ? (Number(currentData.max_discount_amount) || null) : null,
                  start_date: currentData.start_date,
                  end_date: currentData.end_date,
                  usage_limit: currentData.usage_limit ? parseInt(currentData.usage_limit, 10) : null,
                  is_active: currentData.is_active !== false
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
