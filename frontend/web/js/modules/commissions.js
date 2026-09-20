/**
 * W15: Quản lý hoa hồng PT (Commissions Module)
 * Dành riêng cho Quản trị viên (QTV)
 * Bảng tính hoa hồng theo tháng, duyệt chi và cấu hình tỷ lệ hoa hồng PT.
 */
window.CommissionsModule = (function () {
  'use strict';
  let view = null, currentTab = 'monthly', revision = 0;
  let selectedMonth = new Date().getMonth() + 1, selectedYear = new Date().getFullYear();
  const W = () => window.WebUI;
  const api = () => window.apiClient;

  const formatDateTime = v => {
    if (!v) return '-';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  };

  const formatDateYmd = v => {
    if (!v) return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  function exportHistory(records = []) {
    if (!records.length) {
      return DevExpress.ui.notify('Không có dữ liệu để xuất file.', 'warning', 2500);
    }
    const headers = ['Kỳ tháng', 'Huấn luyện viên', 'Mã HLV', 'Chi nhánh', 'Số buổi dạy', 'Doanh số quy đổi', 'Tỷ lệ %', 'Tiền hoa hồng', 'Hình thức chi trả', 'Mã giao dịch / Phiếu chi', 'Thời gian chi trả', 'Người thực hiện'];
    const rows = records.map(r => [
      `Tháng ${r.month}/${r.year}`,
      `"${(r.pt_name || '').replace(/"/g, '""')}"`,
      `"${r.pt_code || ''}"`,
      `"${(r.branch_name || '').replace(/"/g, '""')}"`,
      r.total_pt_sessions_taught || 0,
      r.pt_revenue_share || 0,
      `${r.commission_percentage}%`,
      r.total_commission_amount || 0,
      r.payout_method === 'CASH' ? 'Tiền mặt tại quầy' : 'Chuyển khoản VietQR',
      `"${(r.payout_ref || '').replace(/"/g, '""')}"`,
      formatDateTime(r.paid_at),
      `"${(r.paid_by_name || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Lich_su_chi_tra_hoa_hong_${formatDateYmd(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    DevExpress.ui.notify('Đã xuất file lịch sử chi trả thành công!', 'success', 3000);
  }

  async function render(containerId, context = {}) {
    destroy();
    view = W().page(containerId, 'Quản lý hoa hồng PT', ParadiseApp.getBranchName());
    W().button(view.actions, '', 'refresh', () => load()).option('hint', 'Làm mới dữ liệu');

    currentTab = context.tab || 'monthly';
    await load();
  }

  async function load() {
    if (!view) return;
    const target = view.body, version = ++revision;
    target.empty();

    // Tab Navigation (Phong cách Administrative Forest Clean: sạch sẽ, không icon emoji)
    const tabContainer = $('<div class="commissions-tabs" style="margin-bottom: 16px;">').appendTo(target);
    const tabs = [
      { id: 'monthly', text: 'Bảng kê hoa hồng tháng' },
      { id: 'history', text: 'Lịch sử chi trả' },
      { id: 'configs', text: 'Cấu hình tỷ lệ hoa hồng' }
    ];

    const tabIndices = { monthly: 0, history: 1, configs: 2 };

    $('<div>').appendTo(tabContainer).dxTabs({
      dataSource: tabs,
      selectedIndex: tabIndices[currentTab] ?? 0,
      onItemClick: e => {
        currentTab = e.itemData.id;
        renderTab(contentArea, version);
      }
    });

    const contentArea = $('<div class="commissions-content">').appendTo(target);
    await renderTab(contentArea, version);
  }

  async function renderTab(container, version) {
    container.empty();
    if (currentTab === 'monthly') {
      await renderMonthlyTab(container, version);
    } else if (currentTab === 'history') {
      await renderHistoryTab(container, version);
    } else {
      await renderConfigsTab(container, version);
    }
  }

  async function renderMonthlyTab(container, version) {
    // Toolbar: Filter Month, Year & Calculate button
    const toolbar = $('<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">').appendTo(container);
    
    $('<div>').appendTo(toolbar).dxSelectBox({
      dataSource: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, text: `Tháng ${i + 1}` })),
      valueExpr: 'id', displayExpr: 'text', value: selectedMonth, width: 130,
      onValueChanged: e => { selectedMonth = e.value; reloadGrid(); }
    });

    $('<div>').appendTo(toolbar).dxNumberBox({
      value: selectedYear, min: 2025, max: 2030, width: 100,
      onValueChanged: e => { selectedYear = e.value; reloadGrid(); }
    });

    W().button(toolbar, 'Tính lại hoa hồng', 'fa-solid fa-calculator', async () => {
      try {
        W().loading(gridContainer);
        await api().request('/commissions/calculate', {
          method: 'POST',
          body: { month: selectedMonth, year: selectedYear, branch_id: api().getCurrentBranchId() }
        });
        DevExpress.ui.notify('Đã tính toán xong hoa hồng cho HLV!', 'success', 3000);
        await reloadGrid();
      } catch (err) {
        DevExpress.ui.notify(err.message, 'error', 3500);
        await reloadGrid();
      }
    }, true);

    let selectedPtRecordId = null;
    const summaryBox = $('<div class="commissions-kpis" style="margin-bottom:20px;">').appendTo(container);
    const gridContainer = $('<div>').appendTo(container);

    async function reloadGrid() {
      W().loading(gridContainer);
      try {
        const res = await api().request(`/commissions/monthly?month=${selectedMonth}&year=${selectedYear}`);
        if (version !== revision) return;
        gridContainer.empty();
        summaryBox.empty();

        const data = res.data || [];
        const totalPayout = data.reduce((sum, item) => sum + Number(item.total_commission_amount || 0), 0);
        const totalSessions = data.reduce((sum, item) => sum + Number(item.total_pt_sessions_taught || 0), 0);
        const totalRevenue = data.reduce((sum, item) => sum + Number(item.pt_revenue_share || 0), 0);
        const totalPaid = data.filter(item => item.status === 'PAID').reduce((sum, item) => sum + Number(item.total_commission_amount || 0), 0);
        const totalUnpaid = Math.max(0, totalPayout - totalPaid);
        const paidCount = data.filter(item => item.status === 'PAID' && Number(item.total_commission_amount || 0) > 0).length;
        const payableCount = data.filter(item => Number(item.total_commission_amount || 0) > 0).length;

        function updateKpis() {
          summaryBox.empty();
          const selected = selectedPtRecordId ? data.find(item => item.id === selectedPtRecordId) : null;
          const statusMap = { PENDING: 'Chờ chi trả', APPROVED: 'Chờ chi trả', PAID: 'Đã chi trả' };

          const kpis = selected ? [
            {
              label: 'Buổi đã dạy của HLV',
              value: selected.total_pt_sessions_taught,
              caption: `HLV: ${selected.pt_name} (${selected.pt_code || ''}) · Click dòng để bỏ chọn`,
              icon: 'dumbbell',
              tone: 'blue'
            },
            {
              label: 'Doanh số dạy của HLV',
              value: W().money(selected.pt_revenue_share),
              caption: 'Doanh số dịch vụ hoàn thành',
              icon: 'chart-line',
              tone: 'amber'
            },
            {
              label: 'Tiền hoa hồng của HLV',
              value: W().money(selected.total_commission_amount),
              caption: `Tỷ lệ: ${selected.commission_percentage}%`,
              icon: 'money-bill-wave',
              tone: 'green'
            },
            {
              label: 'Trạng thái chi trả',
              value: statusMap[selected.status] || selected.status,
              caption: selected.status === 'PAID'
                ? (selected.paid_at ? `Đã chi trả ngày ${formatDateTime(selected.paid_at)}` : 'Đã thanh toán thù lao')
                : (Number(selected.total_commission_amount) > 0 ? `Cần chi trả: ${W().money(selected.total_commission_amount)}` : 'Không phát sinh chi trả'),
              icon: selected.status === 'PAID' ? 'check-circle' : 'clock',
              tone: selected.status === 'PAID' ? 'teal' : (selected.status === 'APPROVED' ? 'orange' : 'neutral')
            }
          ] : [
            {
              label: 'Tổng số buổi dạy',
              value: totalSessions,
              caption: `Toàn bộ HLV (tháng ${selectedMonth}/${selectedYear}) · ${data.length} HLV`,
              icon: 'dumbbell',
              tone: 'blue'
            },
            {
              label: 'Tổng doanh số dạy PT',
              value: W().money(totalRevenue),
              caption: 'Giá trị dịch vụ hoàn thành trong tháng',
              icon: 'chart-line',
              tone: 'amber'
            },
            {
              label: 'Tổng tiền hoa hồng tháng',
              value: W().money(totalPayout),
              caption: totalRevenue > 0 ? `Chi phí hoa hồng (${((totalPayout / totalRevenue) * 100).toFixed(1)}% doanh số)` : 'Thực nhận tháng ' + selectedMonth + '/' + selectedYear,
              icon: 'money-bill-wave',
              tone: 'green'
            },
            {
              label: 'Tiến độ chi trả',
              value: W().money(totalPaid),
              caption: totalPayout > 0
                ? `Đã chi: ${W().money(totalPaid)} (${payableCount ? Math.round((paidCount / payableCount) * 100) : 0}%) · Chờ chi: ${W().money(totalUnpaid)}`
                : 'Chưa phát sinh khoản cần chi',
              icon: 'check-circle',
              tone: totalUnpaid > 0 ? 'orange' : 'teal'
            }
          ];

          W().metrics(summaryBox, kpis);
        }

        updateKpis();

        if (!data.length) {
          return W().empty(gridContainer, `Chưa có dữ liệu hoa hồng tháng ${selectedMonth}/${selectedYear}. Hãy bấm "Tính lại hoa hồng".`, 'calculator');
        }

        const gridInstance = W().grid(gridContainer, data, [
          {
            caption: 'Huấn luyện viên', minWidth: 200,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<div>')
                .append($('<strong>').text(r.pt_name))
                .append($('<small style="display:block;color:#748078;">').text(r.pt_code + (r.pt_phone ? ' · ' + r.pt_phone : '')))
                .appendTo(el);
            }
          },
          { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 130 },
          { dataField: 'total_pt_sessions_taught', caption: 'Buổi đã dạy', width: 110, alignment: 'center' },
          { dataField: 'pt_revenue_share', caption: 'Doanh số quy đổi', width: 140, alignment: 'right', calculateCellValue: r => W().money(r.pt_revenue_share) },
          { dataField: 'commission_percentage', caption: 'Tỷ lệ %', width: 90, alignment: 'center', calculateCellValue: r => `${r.commission_percentage}%` },
          {
            dataField: 'total_commission_amount', caption: 'Tiền hoa hồng', width: 140, alignment: 'right',
            cellTemplate: (el, cell) => $('<strong>').css('color', '#237b58').text(W().money(cell.value)).appendTo(el)
          },
          {
            dataField: 'status', caption: 'Trạng thái', width: 140,
            cellTemplate: (el, cell) => {
              const map = { PENDING: ['Chờ chi trả', 'warning'], APPROVED: ['Chờ chi trả', 'warning'], PAID: ['Đã chi trả', 'success'] };
              const [label, tone] = map[cell.value] || [cell.value, 'neutral'];
              el.append(W().badge(label, tone));
            }
          },
          {
            caption: 'Thao tác', width: 180, fixed: true, fixedPosition: 'right',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              const box = $('<div style="display:flex;gap:6px;">').appendTo(el);
              box.on('click', e => e.stopPropagation());

              W().button(box, 'Chi tiết', null, () => openCommissionDetails(r.id));

              if (r.status !== 'PAID') {
                // Có số liệu hoa hồng > 0đ: hiển thị trực tiếp nút Chi trả
                if (Number(r.total_commission_amount || 0) > 0) {
                  W().button(box, 'Chi trả', 'money', () => openPayoutModal(r, reloadGrid), true);
                }
              }
            }
          }
        ], {
          selection: { mode: 'single' },
          selectedRowKeys: selectedPtRecordId ? [selectedPtRecordId] : [],
          onRowClick: e => {
            if (e.rowType !== 'data') return;
            const clickedId = e.data.id;
            if (selectedPtRecordId === clickedId) {
              selectedPtRecordId = null;
              gridInstance.deselectAll();
            } else {
              selectedPtRecordId = clickedId;
              gridInstance.selectRows([clickedId], false);
            }
            updateKpis();
          },
          columnAutoWidth: true,
          paging: { pageSize: 10 }
        });

      } catch (err) {
        W().error(gridContainer, err, reloadGrid);
      }
    }

    await reloadGrid();
  }

  async function renderHistoryTab(container, version) {
    const headerRow = $('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">').appendTo(container);
    $('<h3>').css({ margin: 0, fontSize: '18px', fontWeight: '700' }).text('Lịch sử chi trả hoa hồng PT').appendTo(headerRow);

    const headerActions = $('<div style="display:flex;gap:8px;align-items:center;">').appendTo(headerRow);

    // Filter Bar
    const filterBar = $('<div class="filter-bar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;padding:0 0 12px 0;">').appendTo(container);

    // Metrics Row
    const metricsContainer = $('<div style="margin-bottom:20px;">').appendTo(container);

    // DataGrid Container
    const gridContainer = $('<div>').appendTo(container);

    let searchVal = '';
    let selectedPeriodMonth = 'ALL';
    let selectedPeriodYear = 2026;
    let selectedMethod = 'ALL';
    let historyRecords = [];

    // 1. Ô tìm kiếm
    $('<div>').css({ flex: '1 1 240px', minWidth: 180 }).appendTo(filterBar).dxTextBox({
      placeholder: 'Tìm theo HLV, mã HLV, mã GD, số phiếu...',
      showClearButton: true,
      valueChangeEvent: 'input',
      onValueChanged: e => {
        searchVal = (e.value || '').trim();
        loadHistory();
      }
    });

    // 2. Chọn Tháng (Chuẩn đồng bộ với Tab 1)
    const monthItems = [
      { id: 'ALL', text: 'Tất cả tháng' },
      ...Array.from({ length: 12 }, (_, i) => ({ id: i + 1, text: `Tháng ${i + 1}` }))
    ];

    $('<div>').css({ width: 130 }).appendTo(filterBar).dxSelectBox({
      dataSource: monthItems,
      valueExpr: 'id',
      displayExpr: 'text',
      value: selectedPeriodMonth,
      onValueChanged: e => {
        selectedPeriodMonth = e.value;
        loadHistory();
      }
    });

    // 3. Chọn Năm (Chuẩn đồng bộ với Tab 1)
    $('<div>').css({ width: 100 }).appendTo(filterBar).dxNumberBox({
      value: selectedPeriodYear,
      min: 2025,
      max: 2030,
      showClearButton: true,
      placeholder: 'Năm',
      onValueChanged: e => {
        selectedPeriodYear = e.value || null;
        loadHistory();
      }
    });

    // 4. Lọc hình thức
    $('<div>').css({ width: 180 }).appendTo(filterBar).dxSelectBox({
      dataSource: [
        { id: 'ALL', text: 'Tất cả hình thức' },
        { id: 'BANK_TRANSFER', text: 'Chuyển khoản VietQR' },
        { id: 'CASH', text: 'Tiền mặt tại quầy' }
      ],
      valueExpr: 'id',
      displayExpr: 'text',
      value: 'ALL',
      onValueChanged: e => {
        selectedMethod = e.value;
        loadHistory();
      }
    });

    // Header actions
    W().button(headerActions, 'Làm mới', 'refresh', () => loadHistory());
    W().button(headerActions, 'Xuất file', 'export', () => exportHistory(historyRecords));

    function updateHistoryMetrics(records) {
      metricsContainer.empty();
      const totalCount = records.length;
      const totalPaidAmount = records.reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);
      const bankAmount = records.filter(r => r.payout_method === 'BANK_TRANSFER').reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);
      const cashAmount = records.filter(r => r.payout_method === 'CASH').reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);

      W().metrics(metricsContainer, [
        { label: 'Tổng lượt đã chi trả', value: `${totalCount} lượt`, caption: 'Đã quyết toán thành công', tone: 'green' },
        { label: 'Tổng tiền đã giải ngân', value: W().money(totalPaidAmount), caption: 'Hoa hồng thực tế đã chi', tone: 'blue' },
        { label: 'Chi qua VietQR / Ngân hàng', value: W().money(bankAmount), caption: `${records.filter(r => r.payout_method === 'BANK_TRANSFER').length} giao dịch`, tone: 'teal' },
        { label: 'Chi tiền mặt tại quầy', value: W().money(cashAmount), caption: `${records.filter(r => r.payout_method === 'CASH').length} phiếu chi`, tone: 'amber' }
      ]);
    }

    async function loadHistory() {
      W().loading(gridContainer);
      try {
        let url = `/commissions/payout-history?search=${encodeURIComponent(searchVal)}`;
        if (selectedPeriodMonth && selectedPeriodMonth !== 'ALL') url += `&month=${selectedPeriodMonth}`;
        if (selectedPeriodYear) url += `&year=${selectedPeriodYear}`;
        if (selectedMethod !== 'ALL') url += `&payout_method=${selectedMethod}`;

        const res = await api().request(url);
        if (version !== revision) return;
        gridContainer.empty();

        historyRecords = W().rows(res);
        updateHistoryMetrics(historyRecords);

        if (!historyRecords.length) {
          return W().empty(gridContainer, 'Chưa có lịch sử chi trả nào phù hợp với bộ lọc.', 'inbox');
        }

        W().grid(gridContainer, historyRecords, [
          {
            caption: 'Kỳ hoa hồng', width: 120, alignment: 'center',
            cellTemplate: (el, cell) => $('<strong>').css({ color: '#253e30' }).text(`Tháng ${cell.data.month}/${cell.data.year}`).appendTo(el)
          },
          {
            dataField: 'pt_name', caption: 'Huấn luyện viên', minWidth: 180,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<span>').html(`<strong>${W().escape(r.pt_name || '')}</strong> <small style="color:#748078;">(${W().escape(r.pt_code || '')})</small>`).appendTo(el);
            }
          },
          { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 140 },
          { dataField: 'total_pt_sessions_taught', caption: 'Số buổi dạy', width: 100, alignment: 'center', customizeText: e => `${e.value} buổi` },
          { dataField: 'pt_revenue_share', caption: 'Doanh số quy đổi', width: 130, alignment: 'right', customizeText: e => W().money(e.value) },
          { dataField: 'commission_percentage', caption: 'Tỷ lệ', width: 80, alignment: 'center', customizeText: e => `${e.value}%` },
          {
            dataField: 'total_commission_amount', caption: 'Tiền đã chi trả', width: 140, alignment: 'right',
            cellTemplate: (el, cell) => $('<strong>').css({ color: '#237b58', fontSize: '14px' }).text(W().money(cell.value)).appendTo(el)
          },
          {
            dataField: 'payout_method', caption: 'Hình thức', width: 140, alignment: 'center',
            cellTemplate: (el, cell) => {
              const isBank = cell.value === 'BANK_TRANSFER';
              el.html(W().badge(isBank ? 'Chuyển khoản' : 'Tiền mặt', isBank ? 'info' : 'neutral'));
            }
          },
          {
            dataField: 'payout_ref', caption: 'Mã GD / Phiếu chi', minWidth: 140,
            cellTemplate: (el, cell) => {
              const val = cell.value;
              if (val) {
                $('<code>').css({ background: '#f0f3f1', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#333' }).text(val).appendTo(el);
              } else {
                $('<span>').css('color', '#999').text('-').appendTo(el);
              }
            }
          },
          {
            dataField: 'paid_at', caption: 'Thời gian chi trả', width: 140, alignment: 'center',
            cellTemplate: (el, cell) => $('<span>').css({ color: '#555', fontSize: '12px' }).text(formatDateTime(cell.value)).appendTo(el)
          },
          {
            dataField: 'paid_by_name', caption: 'Người chi trả', minWidth: 130,
            customizeText: e => e.value || 'Quản trị viên'
          },
          {
            caption: 'Thao tác', width: 100, alignment: 'center',
            cellTemplate: (el, cell) => {
              W().button(el, 'Chi tiết', 'info', () => openCommissionDetails(cell.data.id)).option('hint', 'Xem chi tiết các buổi dạy và chứng từ chi trả');
            }
          }
        ], {
          columnAutoWidth: true,
          paging: { pageSize: 15 }
        });
      } catch (err) {
        W().error(gridContainer, err, loadHistory);
      }
    }

    await loadHistory();
  }

  async function renderConfigsTab(container, version) {
    container.empty();
    const toolbar = $('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">').appendTo(container);
    $('<h3>').css({ margin: 0, fontSize: '18px', fontWeight: '700' }).text('Danh sách định mức hoa hồng theo chi nhánh / HLV').appendTo(toolbar);
    W().button(toolbar, 'Thêm cấu hình riêng cho PT', 'add', () => openConfigModal({ isNewPtOverride: true, onSuccess: loadConfigs }), true);

    const gridContainer = $('<div>').appendTo(container);

    async function loadConfigs() {
      W().loading(gridContainer);

      try {
        const res = await api().request('/commissions/configs');
        if (version !== revision) return;
        gridContainer.empty();

        const data = res.data || [];
        if (!data.length) {
          return W().empty(gridContainer, 'Chưa có cấu hình hoa hồng nào.', 'preferences');
        }

        W().grid(gridContainer, data, [
          { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 140 },
          {
            caption: 'Áp dụng cho', minWidth: 200,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              if (r.pt_id) {
                $('<span>').html(`<strong>${W().escape(r.pt_name || '')}</strong> <span style="color:#748078;">(${W().escape(r.pt_code || '')})</span>`).appendTo(el);
              } else {
                $('<span>').css({ fontWeight: '600', color: 'inherit' }).text('Toàn bộ HLV (Mặc định chi nhánh)').appendTo(el);
              }
            }
          },
          {
            dataField: 'commission_percentage', caption: 'Tỷ lệ hoa hồng', width: 130, alignment: 'center',
            cellTemplate: (el, cell) => $('<strong>').css({ color: '#237b58', fontSize: '15px' }).text(`${cell.value}%`).appendTo(el)
          },
          {
            dataField: 'is_active', caption: 'Trạng thái', width: 160, alignment: 'center',
            cellTemplate: (el, cell) => {
              const active = cell.value !== false;
              el.html(active ? W().badge('Đang áp dụng', 'success') : W().badge('Đã gỡ (Dùng mặc định)', 'neutral'));
            }
          },
          {
            dataField: 'version', caption: 'Phiên bản', width: 90, alignment: 'center',
            cellTemplate: (el, cell) => $('<span>').css({ color: '#748078', fontWeight: '600' }).text(`v${cell.value}`).appendTo(el)
          },
          {
            dataField: 'effective_from', caption: 'Hiệu lực từ kỳ', width: 140, alignment: 'center',
            cellTemplate: (el, cell) => {
              if (!cell.value) return el.text('—');
              const d = new Date(cell.value);
              const m = d.getMonth() + 1;
              const y = d.getFullYear();
              $('<div>').html(`<strong>Tháng ${m}/${y}</strong><br><small style="color:#748078;">(01/${String(m).padStart(2, '0')}/${y})</small>`).appendTo(el);
            }
          },
          {
            dataField: 'updated_at', caption: 'Cập nhật lần cuối', minWidth: 160,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              const timeStr = formatDateTime(r.updated_at);
              const userStr = r.updated_by_name ? ` bởi ${W().escape(r.updated_by_name)}` : '';
              $('<span>').css('color', '#555').text(`${timeStr}${userStr}`).appendTo(el);
            }
          },
          {
            caption: 'Thao tác', width: 290, minWidth: 290, alignment: 'center',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              const box = $('<div style="display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:nowrap;">').appendTo(el);

              if (!r.pt_id) {
                // Branch Default: Sửa tỷ lệ mặc định & Xem lịch sử (Không có nút gỡ hay xóa)
                W().button(box, 'Sửa', 'edit', () => openConfigModal({ config: r, isBranchDefault: true, onSuccess: loadConfigs })).option('hint', 'Sửa tỷ lệ hoa hồng mặc định chi nhánh');
                W().button(box, 'Lịch sử', 'clock', () => openConfigHistoryModal(r.id)).option('hint', 'Xem lịch sử phiên bản');
              } else {
                // PT Override
                W().button(box, 'Sửa', 'edit', () => openConfigModal({ config: r, isPtOverride: true, onSuccess: loadConfigs })).option('hint', 'Cập nhật tỷ lệ hoa hồng cho HLV');
                W().button(box, 'Lịch sử', 'clock', () => openConfigHistoryModal(r.id)).option('hint', 'Xem lịch sử phiên bản');

                if (r.is_active) {
                  const btnRemove = W().button(box, 'Bỏ riêng', 'revert', () => {
                    DevExpress.ui.dialog.confirm(
                      `Bạn có chắc chắn muốn bỏ cấu hình hoa hồng riêng cho HLV <b>${W().escape(r.pt_name || '')}</b> (${W().escape(r.pt_code || '')})?<br><br>` +
                      `<small style="color:#666;">Sau khi bỏ, HLV này sẽ tự động quay về hưởng tỷ lệ hoa hồng mặc định của chi nhánh. Lịch sử tỷ lệ cũ vẫn được bảo toàn 100%.</small>`,
                      'Xác nhận bỏ cấu hình riêng'
                    ).then(async confirmed => {
                      if (!confirmed) return;
                      try {
                        await api().request(`/commissions/configs/${r.id}/remove-override`, {
                          method: 'POST',
                          body: { note: 'Bỏ cấu hình riêng qua giao diện QTV' }
                        });
                        DevExpress.ui.notify('Đã bỏ cấu hình riêng thành công. HLV chuyển về hưởng mức mặc định chi nhánh.', 'success', 3000);
                        await loadConfigs();
                      } catch (err) {
                        DevExpress.ui.notify(err.message, 'error', 3500);
                      }
                    });
                  });
                  btnRemove.option('hint', 'Bỏ cấu hình riêng (HLV sẽ quay về hưởng mức mặc định chi nhánh)');
                } else {
                  const btnReactivate = W().button(box, 'Kích hoạt', 'check', () => {
                    openConfigModal({ config: r, isReactivate: true, onSuccess: loadConfigs });
                  });
                  btnReactivate.option('hint', 'Kích hoạt lại cấu hình riêng cho HLV này');
                }
              }
            }
          }
        ], { columnAutoWidth: true });

      } catch (err) {
        W().error(gridContainer, err, loadConfigs);
      }
    }

    await loadConfigs();
  }

  function openConfigModal({ config = null, isNewPtOverride = false, isBranchDefault = false, isPtOverride = false, isReactivate = false, onSuccess = null } = {}) {
    let title = 'Cập nhật cấu hình hoa hồng';
    if (isBranchDefault || (config && !config.pt_id)) {
      title = 'Cập nhật tỷ lệ hoa hồng mặc định chi nhánh';
    } else if (isReactivate) {
      title = 'Kích hoạt lại cấu hình hoa hồng riêng cho HLV';
    } else if (config && config.pt_id) {
      title = 'Cập nhật tỷ lệ hoa hồng riêng cho HLV';
    } else if (isNewPtOverride) {
      title = 'Thiết lập tỷ lệ hoa hồng riêng cho HLV';
    }

    const dialog = W().popup(title, content => {
      const now = new Date();
      const vnNow = new Date(now.getTime() + (7 * 3600000 + now.getTimezoneOffset() * 60000));
      const currentYear = vnNow.getFullYear();
      const currentMonth = vnNow.getMonth() + 1; // 1-12

      const minNextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      const minNextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

      const data = {
        branch_id: config ? config.branch_id : (api().getCurrentBranchId() === 'ALL' ? null : api().getCurrentBranchId()),
        pt_id: config ? config.pt_id : null,
        commission_percentage: config ? Number(config.commission_percentage) : 25,
        effective_year: minNextYear,
        effective_month: minNextMonth,
        note: ''
      };

      const yearOptions = [];
      for (let y = currentYear; y <= currentYear + 4; y++) {
        if (y === currentYear && currentMonth === 12) continue;
        yearOptions.push({ value: y, text: `Năm ${y}` });
      }

      function getMonthOptionsForYear(selectedYear) {
        const months = [];
        const startMonth = (selectedYear === currentYear) ? (currentMonth + 1) : 1;
        for (let m = startMonth; m <= 12; m++) {
          months.push({ value: m, text: `Tháng ${m}` });
        }
        return months;
      }

      const formDiv = $('<div>').appendTo(content);

      let branchStore = [], ptStore = [];
      const formItems = [
        {
          dataField: 'branch_id', label: { text: 'Chi nhánh áp dụng' },
          editorType: 'dxSelectBox',
          editorOptions: {
            disabled: !!config,
            dataSource: new DevExpress.data.CustomStore({
              key: 'id', loadMode: 'raw',
              load: async () => {
                const b = await api().request('/branches');
                branchStore = W().rows(b);
                return branchStore;
              }
            }),
            valueExpr: 'id', displayExpr: 'branch_name',
            onValueChanged: async e => {
              data.branch_id = e.value;
              if (!config && form) {
                const ptEditor = form.getEditor('pt_id');
                if (ptEditor) {
                  ptEditor.option('value', null);
                  ptEditor.getDataSource().reload();
                }
              }
            }
          },
          validationRules: [{ type: 'required', message: 'Vui lòng chọn chi nhánh' }]
        }
      ];

      if (isBranchDefault || (config && !config.pt_id)) {
        formItems.push({
          label: { text: 'Đối tượng áp dụng' },
          template: () => $('<div style="padding:6px 0;font-weight:600;color:#26332e;">').text('Toàn bộ HLV trong chi nhánh (Mặc định)')
        });
      } else {
        formItems.push({
          dataField: 'pt_id', label: { text: 'Huấn luyện viên (PT)' },
          editorType: 'dxSelectBox',
          editorOptions: {
            disabled: !!config,
            dataSource: new DevExpress.data.CustomStore({
              key: 'id', loadMode: 'raw',
              load: async () => {
                const selectedBranch = (form ? form.option('formData.branch_id') : null) || data.branch_id || api().getCurrentBranchId();
                const branchParam = selectedBranch && selectedBranch !== 'ALL' ? `?branch_id=${selectedBranch}&status=ACTIVE` : '?status=ACTIVE';
                const p = await api().request(`/pt-bookings/trainers${branchParam}`);
                ptStore = W().rows(p);
                return ptStore;
              }
            }),
            searchEnabled: true,
            searchExpr: ['full_name', 'pt_code', 'phone'],
            valueExpr: 'id',
            displayExpr: r => r ? `${r.full_name} (${r.pt_code})` : '',
            placeholder: '-- Chọn Huấn luyện viên --',
            noDataText: 'Không tìm thấy HLV khả dụng tại chi nhánh'
          },
          validationRules: [{ type: 'required', message: 'Vui lòng chọn Huấn luyện viên' }]
        });
      }

      formItems.push(
        {
          dataField: 'commission_percentage', label: { text: 'Tỷ lệ hoa hồng (%)' },
          editorType: 'dxNumberBox',
          editorOptions: { min: 0, max: 100, step: 0.5, format: '#,##0.0' },
          validationRules: [{ type: 'required', message: 'Vui lòng nhập tỷ lệ %' }]
        },
        {
          itemType: 'group',
          caption: 'Kỳ tháng áp dụng hiệu lực',
          colCount: 2,
          items: [
            {
              dataField: 'effective_year',
              label: { text: 'Năm áp dụng' },
              editorType: 'dxSelectBox',
              editorOptions: {
                dataSource: yearOptions,
                valueExpr: 'value',
                displayExpr: 'text',
                value: data.effective_year,
                onValueChanged: e => {
                  data.effective_year = e.value;
                  const newMonths = getMonthOptionsForYear(e.value);
                  const monthEditor = form ? form.getEditor('effective_month') : null;
                  if (monthEditor) {
                    monthEditor.option('dataSource', newMonths);
                    const curM = monthEditor.option('value');
                    if (!newMonths.some(item => item.value === curM)) {
                      monthEditor.option('value', newMonths[0]?.value);
                      data.effective_month = newMonths[0]?.value;
                    }
                  }
                }
              },
              validationRules: [{ type: 'required', message: 'Vui lòng chọn năm áp dụng' }]
            },
            {
              dataField: 'effective_month',
              label: { text: 'Tháng áp dụng' },
              editorType: 'dxSelectBox',
              editorOptions: {
                dataSource: getMonthOptionsForYear(data.effective_year),
                valueExpr: 'value',
                displayExpr: 'text',
                value: data.effective_month,
                onValueChanged: e => {
                  data.effective_month = e.value;
                }
              },
              validationRules: [
                { type: 'required', message: 'Vui lòng chọn tháng áp dụng' },
                {
                  type: 'custom',
                  validationCallback: e => {
                    const y = data.effective_year;
                    const m = e.value;
                    return (y * 100 + m) > (currentYear * 100 + currentMonth);
                  },
                  message: `Kỳ áp dụng phải lớn hơn kỳ tháng hiện tại (từ Tháng ${minNextMonth}/${minNextYear} trở đi)`
                }
              ]
            }
          ]
        },
        {
          dataField: 'note', label: { text: 'Ghi chú lý do thay đổi' },
          editorType: 'dxTextArea',
          editorOptions: { height: 60, placeholder: 'Nhập lý do điều chỉnh tỷ lệ hoa hồng (tùy chọn)...' }
        }
      );

      const form = formDiv.dxForm({
        formData: data,
        labelLocation: 'top',
        showColonAfterLabel: false,
        items: formItems
      }).dxForm('instance');

      $('<div style="margin-top:20px;display:flex;gap:8px;justify-content:flex-end;">').append(
        $('<div>').dxButton({ text: 'Hủy bỏ', stylingMode: 'outlined', onClick: () => dialog.hide() }),
        $('<div>').dxButton({
          text: isReactivate ? 'Kích hoạt cấu hình riêng' : (config ? 'Cập nhật cấu hình' : 'Lưu cấu hình'),
          type: 'default', stylingMode: 'contained', icon: 'save',
          onClick: async () => {
            if (!form.validate().isValid) return;
            try {
              await api().request('/commissions/configs', {
                method: 'POST',
                body: {
                  branch_id: data.branch_id,
                  pt_id: data.pt_id || null,
                  commission_percentage: data.commission_percentage,
                  effective_year: Number(data.effective_year),
                  effective_month: Number(data.effective_month),
                  note: data.note || null
                }
              });
              DevExpress.ui.notify('Đã lưu cấu hình hoa hồng PT thành công!', 'success', 2500);
              dialog.hide();
              if (typeof onSuccess === 'function') {
                await onSuccess();
              } else {
                await load();
              }
            } catch (err) { DevExpress.ui.notify(err.message, 'error', 3500); }
          }
        })
      ).appendTo(content);
    }, { width: 560 });
  }

  async function openConfigHistoryModal(configId) {
    const dialog = W().popup('Lịch sử phiên bản cấu hình hoa hồng', content => {
      W().loading(content);
      api().request(`/commissions/configs/${configId}/history`).then(res => {
        content.empty();
        const data = res.data || {};
        const config = data.config || {};
        const history = data.history || [];

        const targetDesc = config.pt_id 
          ? `HLV <strong>${W().escape(config.pt_name || '')}</strong> (${W().escape(config.pt_code || '')})`
          : 'Toàn bộ HLV (Mặc định chi nhánh)';

        $('<div style="margin-bottom:14px;padding:12px 16px;background:#f8fbf9;border-radius:6px;border:1px solid #dfe6e2;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">')
          .html(`
            <div>
              <div style="font-size:15px;">Chi nhánh: <strong>${W().escape(config.branch_name || '')}</strong> | Đối tượng: ${targetDesc}</div>
              <div style="margin-top:4px;color:#555;font-size:13px;">Tỷ lệ hiện tại: <strong style="color:#237b58;">${config.commission_percentage}%</strong> (Phiên bản: <strong>v${config.version}</strong>)</div>
            </div>
            <div>
              <span class="badge" style="background:${config.is_active ? '#e8f5e9' : '#fff3e0'};color:${config.is_active ? '#2e7d32' : '#e65100'};padding:5px 12px;border-radius:12px;font-size:12px;font-weight:700;">
                ${config.is_active ? 'Đang áp dụng' : 'Đã gỡ cấu hình riêng'}
              </span>
            </div>
          `).appendTo(content);

        if (!history.length) {
          return W().empty(content, 'Chưa có dữ liệu lịch sử cho cấu hình này', 'clock');
        }

        W().grid(content, history, [
          {
            dataField: 'version', caption: 'Phiên bản', width: 90, alignment: 'center',
            cellTemplate: (el, cell) => $('<span class="badge" style="background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:10px;font-size:12px;font-weight:700;">').text(`v${cell.value}`).appendTo(el)
          },
          {
            dataField: 'action', caption: 'Hành động', width: 140, alignment: 'center',
            cellTemplate: (el, cell) => {
              const act = cell.value;
              let bg = '#e3f2fd', color = '#1565c0', label = 'Khởi tạo';
              if (act === 'UPDATE') { bg = '#e8f5e9'; color = '#2e7d32'; label = 'Cập nhật'; }
              else if (act === 'REMOVE_OVERRIDE') { bg = '#ffebee'; color = '#c62828'; label = 'Bỏ cấu hình riêng'; }
              else if (act === 'REACTIVATE') { bg = '#f3e5f5'; color = '#6a1b9a'; label = 'Kích hoạt lại'; }
              $('<span class="badge" style="padding:3px 8px;border-radius:10px;font-size:12px;font-weight:600;">')
                .css({ background: bg, color: color }).text(label).appendTo(el);
            }
          },
          {
            dataField: 'commission_percentage', caption: 'Tỷ lệ %', width: 90, alignment: 'center',
            cellTemplate: (el, cell) => $('<strong>').css('color', '#237b58').text(`${cell.value}%`).appendTo(el)
          },
          {
            dataField: 'effective_from', caption: 'Hiệu lực từ kỳ', width: 140, alignment: 'center',
            cellTemplate: (el, cell) => {
              if (!cell.value) return el.text('—');
              const d = new Date(cell.value);
              const m = d.getMonth() + 1;
              const y = d.getFullYear();
              $('<div>').html(`<strong>Tháng ${m}/${y}</strong><br><small style="color:#748078;">(01/${String(m).padStart(2, '0')}/${y})</small>`).appendTo(el);
            }
          },
          {
            dataField: 'effective_to', caption: 'Hiệu lực đến', width: 140, alignment: 'center',
            cellTemplate: (el, cell) => {
              if (cell.value) {
                const d = new Date(cell.value);
                const m = d.getMonth() + 1;
                const y = d.getFullYear();
                $('<div>').html(`<strong>Tháng ${m}/${y}</strong><br><small style="color:#748078;">(01/${String(m).padStart(2, '0')}/${y})</small>`).appendTo(el);
              } else {
                $('<span style="color:#2e7d32;font-weight:600;">').text('Đang áp dụng').appendTo(el);
              }
            }
          },
          { dataField: 'note', caption: 'Ghi chú', minWidth: 150 },
          {
            dataField: 'changed_by_name', caption: 'Người thực hiện', width: 130,
            cellTemplate: (el, cell) => $('<span>').text(cell.value || 'Hệ thống').appendTo(el)
          },
          {
            dataField: 'changed_at', caption: 'Thời điểm', width: 140, dataType: 'datetime', format: 'dd/MM/yyyy HH:mm'
          }
        ], { columnAutoWidth: true, paging: { pageSize: 8 } });
      }).catch(err => {
        W().error(content, err);
      });
    }, { width: 920 });
  }

  function openPayoutModal(record, onDone) {
    const amount = Number(record.total_commission_amount || 0);
    let doSubmit = null;
    let popupInstance = null;

    const toolbarItems = [
      {
        widget: 'dxButton',
        location: 'after',
        toolbar: 'bottom',
        options: {
          text: 'Đóng',
          stylingMode: 'outlined',
          onClick: () => popupInstance?.hide()
        }
      },
      {
        widget: 'dxButton',
        location: 'after',
        toolbar: 'bottom',
        options: {
          text: 'Xác nhận chi trả',
          type: 'default',
          stylingMode: 'contained',
          onClick: async () => {
            if (doSubmit) await doSubmit();
          }
        }
      }
    ];

    popupInstance = W().popup('Xác nhận chi trả hoa hồng PT', content => {
      // 1. Thẻ tóm tắt thông tin thanh toán (Phong cách Administrative Forest Clean tối giản, phẳng)
      const summaryBox = $('<div style="background:#fafbfa;border:1px solid var(--border-color);border-radius:4px;padding:10px 14px;margin-bottom:14px;">').appendTo(content);
      summaryBox.html(`
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div>
            <strong style="font-size:13px;color:var(--text-main);">${W().escape(record.pt_name)}</strong>
            <span style="font-size:12px;color:var(--text-muted);margin-left:4px;">(${W().escape(record.pt_code || '')})</span>
            <span style="font-size:12px;color:var(--text-muted);margin-left:8px;">· ${W().escape(record.branch_name || '')}</span>
          </div>
          <span class="status-badge badge-info">Kỳ tháng ${record.month}/${record.year}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px solid #edf1ee;font-size:12px;color:var(--text-main);">
          <div>
            Số buổi: <strong>${record.total_pt_sessions_taught}</strong> · Doanh số: <strong>${W().money(record.pt_revenue_share)}</strong> · Tỷ lệ: <strong>${record.commission_percentage}%</strong>
          </div>
          <div>
            Số tiền chi trả: <strong style="font-size:14px;color:var(--primary);font-variant-numeric:tabular-nums;">${W().money(amount)}</strong>
          </div>
        </div>
      `);

      // 2. Bố cục Form và Khung QR
      const mainContainer = $('<div style="display:flex;gap:16px;align-items:flex-start;">').appendTo(content);
      const formCol = $('<div style="flex:1;min-width:0;">').appendTo(mainContainer);
      const qrCol = $('<div style="flex:0 0 170px;text-align:center;">').appendTo(mainContainer);
      const qrCard = $('<div style="padding:10px;background:#fff;border:1px solid var(--border-color);border-radius:4px;">').appendTo(qrCol);
      const errorsBox = $('<div role="alert" style="margin-top:10px;">').appendTo(content);

      let selectedMethod = 'BANK_TRANSFER';
      const defaultBank = record.bank_name || 'MB Bank';
      const defaultAccount = record.bank_account_no || record.pt_phone || '0900000003';
      const defaultName = record.bank_account_name || record.pt_name || '';

      const formData = {
        payout_method: 'BANK_TRANSFER',
        bank_name: defaultBank,
        bank_account_no: defaultAccount,
        bank_account_name: defaultName,
        payout_ref: '',
        cash_receipt_no: '',
        payout_date: new Date(),
        payout_note: `Chi trả hoa hồng tháng ${record.month}/${record.year} cho HLV ${record.pt_name}`
      };

      function updateQr() {
        if (selectedMethod !== 'BANK_TRANSFER') return;

        const accNo = form ? (form.getEditor('bank_account_no')?.option('value') || formData.bank_account_no) : formData.bank_account_no;
        const accName = form ? (form.getEditor('bank_account_name')?.option('value') || formData.bank_account_name) : formData.bank_account_name;

        if (accNo && accNo.trim()) {
          const memo = encodeURIComponent(`PGYM HOA HONG T${record.month}.${record.year} ${record.pt_code || ''}`);
          const qrUrl = `https://img.vietqr.io/image/970422-${accNo.trim()}-compact2.png?amount=${amount}&addInfo=${memo}&accountName=${encodeURIComponent(accName || record.pt_name)}`;
          qrCard.html(`
            <div style="font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:6px;text-transform:uppercase;">Mã VietQR</div>
            <img src="${qrUrl}" alt="VietQR" style="width:135px;height:135px;display:block;margin:0 auto;border-radius:4px;border:1px solid #edf1ee;">
            <div style="font-size:10px;color:var(--text-muted);margin-top:6px;line-height:1.3;">Quét mã để chuyển khoản nhanh</div>
          `);
        } else {
          qrCard.html('<div style="font-size:11px;color:var(--text-muted);padding:30px 6px;">Nhập số tài khoản để tạo mã QR</div>');
        }
      }

      const form = formCol.dxForm({
        formData,
        labelLocation: 'top',
        showColonAfterLabel: false,
        items: [
          {
            dataField: 'payout_method',
            label: { text: 'Hình thức chi trả' },
            editorType: 'dxSelectBox',
            editorOptions: {
              dataSource: [
                { id: 'BANK_TRANSFER', text: 'Chuyển khoản ngân hàng (VietQR)' },
                { id: 'CASH', text: 'Tiền mặt tại quầy' }
              ],
              valueExpr: 'id',
              displayExpr: 'text',
              onValueChanged: e => {
                selectedMethod = e.value;
                const isBank = e.value === 'BANK_TRANSFER';
                form.itemOption('bank_group', 'visible', isBank);
                form.itemOption('cash_group', 'visible', !isBank);
                if (isBank) {
                  qrCol.show();
                  updateQr();
                } else {
                  qrCol.hide();
                }
              }
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn hình thức chi trả' }]
          },
          {
            itemType: 'group',
            name: 'bank_group',
            caption: 'Tài khoản ngân hàng thụ hưởng',
            colCount: 2,
            items: [
              {
                dataField: 'bank_name',
                label: { text: 'Ngân hàng' },
                editorType: 'dxTextBox',
                editorOptions: { placeholder: 'VD: MB Bank, Vietcombank...', onValueChanged: updateQr },
                validationRules: [{ type: 'required', message: 'Vui lòng nhập tên ngân hàng' }]
              },
              {
                dataField: 'bank_account_no',
                label: { text: 'Số tài khoản' },
                editorType: 'dxTextBox',
                editorOptions: { placeholder: 'Số tài khoản nhận tiền', onValueChanged: updateQr },
                validationRules: [{ type: 'required', message: 'Vui lòng nhập số tài khoản' }]
              },
              {
                dataField: 'bank_account_name',
                label: { text: 'Tên chủ tài khoản' },
                editorType: 'dxTextBox',
                editorOptions: { placeholder: 'Tên chủ tài khoản', onValueChanged: updateQr }
              },
              {
                dataField: 'payout_ref',
                label: { text: 'Mã giao dịch ngân hàng (tùy chọn)' },
                editorType: 'dxTextBox',
                editorOptions: { placeholder: 'VD: FT2609... (để trống nếu không cần)' }
              }
            ]
          },
          {
            itemType: 'group',
            name: 'cash_group',
            visible: false,
            items: [
              {
                dataField: 'cash_receipt_no',
                label: { text: 'Số phiếu chi (tùy chọn)' },
                editorType: 'dxTextBox',
                editorOptions: { placeholder: 'VD: PC-09-001 (để trống nếu không lập phiếu)' }
              }
            ]
          },
          {
            dataField: 'payout_date',
            label: { text: 'Ngày chi trả' },
            editorType: 'dxDateBox',
            editorOptions: { displayFormat: 'dd/MM/yyyy', value: new Date(), readOnly: true }
          },
          {
            dataField: 'payout_note',
            label: { text: 'Ghi chú' },
            editorType: 'dxTextArea',
            editorOptions: { height: 48, placeholder: 'Ghi chú nghiệp vụ (nếu có)...' }
          }
        ]
      }).dxForm('instance');

      updateQr();

      doSubmit = async () => {
        const valRes = form.validate();
        if (!valRes.isValid) return;

        const vals = form.option('formData');
        errorsBox.empty();

        const isBank = vals.payout_method === 'BANK_TRANSFER';
        const refCode = isBank ? vals.payout_ref : vals.cash_receipt_no;

        try {
          await api().request(`/commissions/${record.id}/status`, {
            method: 'PUT',
            body: {
              status: 'PAID',
              payout_method: vals.payout_method,
              payout_ref: (refCode || '').trim() || null,
              payout_note: (vals.payout_note || '').trim() || null,
              bank_name: isBank ? (vals.bank_name || '').trim() : null,
              bank_account_no: isBank ? (vals.bank_account_no || '').trim() : null,
              bank_account_name: isBank ? (vals.bank_account_name || '').trim() : null
            }
          });

          DevExpress.ui.notify(`Đã xác nhận chi trả ${W().money(amount)} cho HLV ${record.pt_name}!`, 'success', 3000);
          popupInstance.hide();
          if (onDone) await onDone();
        } catch (err) {
          W().error(errorsBox, err);
        }
      };

    }, { width: 680, maxHeight: '85vh', toolbarItems });
  }

  async function openCommissionDetails(id) {
    const dialog = W().popup('Chi tiết buổi dạy & hoa hồng', content => {
      W().loading(content);
      api().request(`/commissions/${id}/details`).then(res => {
        content.empty();
        const data = res.data || {};
        const comm = data.commission || {};
        const sessions = data.sessions || [];

        const isPaid = comm.status === 'PAID';
        const isApproved = comm.status === 'APPROVED';
        const statusBadge = isPaid
          ? W().badge('Đã chi trả', 'success')
          : (isApproved ? W().badge('Đã duyệt', 'info') : W().badge('Chờ duyệt', 'warning'));

        $('<div style="margin-bottom:16px;padding:14px 16px;background:#f8fbf9;border-radius:8px;border:1px solid #dfe6e2;">')
          .html(`
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span style="font-size:16px;font-weight:700;color:#1e3a2b;">Tháng ${comm.month}/${comm.year} · HLV ${W().escape(comm.pt_name || '')}</span>
                <span style="font-size:13px;color:#748078;margin-left:6px;">(${W().escape(comm.pt_code || '')})</span>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <span style="color:#237b58;font-weight:700;font-size:14px;">Tỷ lệ: ${comm.commission_percentage}%</span>
                ${statusBadge}
              </div>
            </div>
            <div style="margin-top:8px;display:flex;gap:20px;color:#444;font-size:13px;">
              <span>Số buổi dạy: <strong>${comm.total_pt_sessions_taught != null ? comm.total_pt_sessions_taught : sessions.length} buổi</strong></span>
              <span>Doanh số quy đổi: <strong>${W().money(comm.pt_revenue_share)}</strong></span>
              <span>Tiền hoa hồng: <strong style="color:#237b58;font-size:15px;">${W().money(comm.total_commission_amount)}</strong></span>
            </div>
            ${isPaid ? `
              <div style="margin-top:10px;padding:10px 14px;background:#fafbfa;border-radius:4px;border:1px solid var(--border-color);font-size:12px;display:flex;flex-wrap:wrap;gap:16px;color:var(--text-main);">
                <span>Thời gian chi trả: <strong>${formatDateTime(comm.paid_at)}</strong></span>
                <span>Hình thức: <strong>${comm.payout_method === 'CASH' ? 'Tiền mặt tại quầy' : 'Chuyển khoản ngân hàng'}</strong></span>
                ${comm.payout_ref ? `<span>Mã GD / Số phiếu chi: <strong>${W().escape(comm.payout_ref)}</strong></span>` : ''}
                ${comm.paid_by_name ? `<span>Người thực hiện: <strong>${W().escape(comm.paid_by_name)}</strong></span>` : ''}
                ${comm.payout_note ? `<span style="width:100%;color:var(--text-muted);border-top:1px solid #edf1ee;padding-top:6px;margin-top:2px;">Ghi chú: ${W().escape(comm.payout_note)}</span>` : ''}
              </div>
            ` : ''}
          `).appendTo(content);

        const gridBox = $('<div>').appendTo(content);
        if (!sessions.length) {
          return W().empty(gridBox, 'Chưa có dữ liệu danh sách buổi dạy chi tiết cho kỳ này.', 'calendar-xmark');
        }

        W().grid(gridBox, sessions, [
          { dataField: 'booking_date', caption: 'Ngày tập', dataType: 'date', format: 'dd/MM/yyyy', width: 100 },
          { caption: 'Giờ', width: 100, calculateCellValue: r => `${String(r.start_time).slice(0, 5)} - ${String(r.end_time).slice(0, 5)}` },
          { dataField: 'member_name', caption: 'Học viên', minWidth: 150 },
          { dataField: 'package_name_snapshot', caption: 'Gói tập', minWidth: 140 },
          { dataField: 'session_number', caption: 'Buổi số', width: 80, alignment: 'center' },
          { dataField: 'session_pt_value', caption: 'Giá trị buổi', width: 120, alignment: 'right', calculateCellValue: r => W().money(r.session_pt_value) },
          {
            dataField: 'session_commission', caption: 'Hoa hồng buổi', width: 130, alignment: 'right',
            cellTemplate: (el, cell) => $('<strong>').css('color', '#237b58').text(W().money(cell.value)).appendTo(el)
          }
        ], { columnAutoWidth: true, paging: { pageSize: 8 } });
      }).catch(err => {
        W().error(content, err);
      });
    }, { width: 800 });
  }

  function destroy() { revision++; view = null; }
  return { render, refresh: load, destroy };
})();
