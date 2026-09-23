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
    const headers = ['Kỳ tháng', 'Huấn luyện viên', 'Mã HLV', 'Chi nhánh', 'Số buổi dạy', 'Doanh số quy đổi', 'Tỷ lệ %', 'Tiền hoa hồng', 'Hình thức chi trả', 'Trạng thái', 'Mã giao dịch / Phiếu chi', 'Thời gian chi trả', 'Người thực hiện'];
    const rows = records.map(r => {
      const statusLabel = r.status === 'PAID' ? 'Đã chi trả' : (r.status === 'PENDING_CONFIRMATION' ? 'Chờ PT xác nhận' : (r.status || ''));
      return [
        `Tháng ${r.month}/${r.year}`,
        `"${(r.pt_name || '').replace(/"/g, '""')}"`,
        `"${r.pt_code || ''}"`,
        `"${(r.branch_name || '').replace(/"/g, '""')}"`,
        r.total_pt_sessions_taught || 0,
        r.pt_revenue_share || 0,
        `${r.commission_percentage}%`,
        r.total_commission_amount || 0,
        r.payout_method === 'CASH' ? 'Tiền mặt tại quầy' : 'Chuyển khoản VietQR',
        `"${statusLabel}"`,
        `"${(r.payout_ref || '').replace(/"/g, '""')}"`,
        formatDateTime(r.paid_at),
        `"${(r.paid_by_name || '').replace(/"/g, '""')}"`
      ];
    });

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

  function exportPtSessions(records = [], month, year, ptName = 'Tat_ca_HLV') {
    if (!records.length) {
      return DevExpress.ui.notify('Không có dữ liệu để xuất file.', 'warning', 2500);
    }
    const headers = ['STT', 'Kỳ tháng', 'Ngày tập', 'Khung giờ', 'Huấn luyện viên', 'Mã HLV', 'Chi nhánh', 'Học viên', 'Mã HV', 'Số điện thoại', 'Gói tập', 'Mã hợp đồng', 'Buổi số', 'Tổng số buổi', 'Doanh số buổi quy đổi', 'Tỷ lệ hoa hồng (%)', 'Tiền hoa hồng buổi', 'Trạng thái'];
    const rows = records.map((r, i) => [
      i + 1,
      `Tháng ${month}/${year}`,
      r.booking_date ? new Date(r.booking_date).toLocaleDateString('vi-VN') : '',
      `"${String(r.start_time || '').slice(0, 5)} - ${String(r.end_time || '').slice(0, 5)}"`,
      `"${(r.pt_name || '').replace(/"/g, '""')}"`,
      `"${r.pt_code || ''}"`,
      `"${(r.branch_name || '').replace(/"/g, '""')}"`,
      `"${(r.member_name || '').replace(/"/g, '""')}"`,
      `"${r.member_code || ''}"`,
      `"${r.member_phone || ''}"`,
      `"${(r.package_name_snapshot || '').replace(/"/g, '""')}"`,
      `"${r.reg_code || ''}"`,
      r.session_number || 1,
      r.total_pt_sessions_snapshot || '',
      r.session_pt_value || 0,
      `${r.commission_percentage || 0}%`,
      r.session_commission || 0,
      'Đã hoàn thành'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Doanh_thu_goi_PT_COMBO_T${month}_${year}_${ptName.replace(/[^a-zA-Z0-9_]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    DevExpress.ui.notify('Đã xuất file doanh thu gói PT/COMBO thành công!', 'success', 3000);
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
      { id: 'monthly', text: 'Bảng kê thu nhập tháng' },
      { id: 'pt_packages', text: 'Doanh thu gói PT/COMBO' },
      { id: 'community', text: 'Thù lao lớp cộng đồng' },
      { id: 'history', text: 'Lịch sử chi trả' },
      { id: 'configs', text: 'Cấu hình tỷ lệ hoa hồng' }
    ];

    const tabIndices = { monthly: 0, pt_packages: 1, community: 2, history: 3, configs: 4 };

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
    } else if (currentTab === 'pt_packages') {
      await renderPtPackagesRevenueTab(container, version);
    } else if (currentTab === 'community') {
      await renderCommunityTab(container, version);
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
        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const [resComm, resClasses] = await Promise.all([
          api().request(`/commissions/monthly?month=${selectedMonth}&year=${selectedYear}`),
          api().request(`/community-classes?date_from=${startDate}&date_to=${endDate}`)
        ]);

        if (version !== revision) return;
        gridContainer.empty();
        summaryBox.empty();

        const data = resComm.data || [];
        const rawClasses = Array.isArray(resClasses) ? resClasses : (resClasses.data || []);

        // Tổng hợp lớp cộng đồng theo HLV
        const commByPt = {};
        rawClasses.forEach(c => {
          const ptId = c.instructor_id;
          if (!ptId) return;
          if (!commByPt[ptId]) {
            commByPt[ptId] = { count: 0, comp: 0, slots: 0, items: [] };
          }
          commByPt[ptId].count++;
          commByPt[ptId].comp += Number(c.total_compensation || 0);
          commByPt[ptId].slots += Number(c.enrolled_slots || 0);
          commByPt[ptId].items.push(c);
        });

        // Bổ sung dữ liệu lớp cộng đồng vào bảng kê tháng
        data.forEach(item => {
          const commInfo = commByPt[item.pt_id] || { count: 0, comp: 0, slots: 0, items: [] };
          item.community_classes_count = commInfo.count;
          item.community_compensation = commInfo.comp;
          item.community_slots = commInfo.slots;
          item.community_items = commInfo.items;
          item.total_monthly_income = Number(item.total_commission_amount || 0) + commInfo.comp;
        });

        const totalPtCommission = data.reduce((sum, item) => sum + Number(item.total_commission_amount || 0), 0);
        const totalCommPayout = data.reduce((sum, item) => sum + Number(item.community_compensation || 0), 0);
        const totalCombinedPayout = totalPtCommission + totalCommPayout;
        const totalPtSessions = data.reduce((sum, item) => sum + Number(item.total_pt_sessions_taught || 0), 0);
        const totalCommSessions = data.reduce((sum, item) => sum + Number(item.community_classes_count || 0), 0);
        const totalRevenue = data.reduce((sum, item) => sum + Number(item.pt_revenue_share || 0), 0);
        const totalPaid = data.filter(item => item.status === 'PAID').reduce((sum, item) => sum + Number(item.total_monthly_income || item.total_commission_amount || 0), 0);
        const totalUnpaid = Math.max(0, totalCombinedPayout - totalPaid);
        const paidCount = data.filter(item => item.status === 'PAID' && Number(item.total_monthly_income || item.total_commission_amount || 0) > 0).length;
        const payableCount = data.filter(item => Number(item.total_monthly_income || item.total_commission_amount || 0) > 0).length;

        function updateKpis() {
          summaryBox.empty();
          const selected = selectedPtRecordId ? data.find(item => item.id === selectedPtRecordId) : null;
          const statusMap = {
            PENDING: 'Chờ chi trả',
            APPROVED: 'Chờ chi trả',
            PENDING_CONFIRMATION: 'Chờ PT xác nhận',
            PAID: 'Đã chi trả'
          };

          const kpis = selected ? [
            {
              label: 'Tổng buổi dạy của HLV',
              value: (selected.total_pt_sessions_taught || 0) + (selected.community_classes_count || 0),
              caption: `HLV: ${selected.pt_name} · Dạy PT (1:1, nhóm, combo): ${selected.total_pt_sessions_taught || 0} · Lớp CĐ: ${selected.community_classes_count || 0}`,
              icon: 'dumbbell',
              tone: 'blue'
            },
            {
              label: 'Doanh số dịch vụ PT',
              value: W().money(selected.pt_revenue_share),
              caption: `Gói PT 1:1, nhóm & combo · Tỷ lệ hoa hồng: ${selected.commission_percentage}%`,
              icon: 'chart-line',
              tone: 'amber'
            },
            {
              label: 'Hoa hồng dạy PT',
              value: W().money(selected.total_commission_amount),
              caption: `Hưởng theo tỷ lệ hoa hồng ${selected.commission_percentage}% của HLV`,
              icon: 'coins',
              tone: 'coral'
            },
            {
              label: 'Thù lao lớp cộng đồng',
              value: W().money(selected.community_compensation || 0),
              caption: `Định mức bộ môn + thưởng sĩ số (${selected.community_classes_count || 0} ca)`,
              icon: 'users',
              tone: 'teal'
            },
            {
              label: 'Tổng thu nhập của HLV',
              value: W().money(selected.total_monthly_income),
              caption: selected.status === 'PAID'
                ? (selected.paid_at ? `Đã chi trả ngày ${formatDateTime(selected.paid_at)}` : 'Đã thanh toán thù lao')
                : (selected.status === 'PENDING_CONFIRMATION'
                    ? 'Đang chờ PT bấm xác nhận trên app'
                    : (Number(selected.total_monthly_income) > 0 ? `Cần chi trả: ${W().money(selected.total_monthly_income)}` : 'Không phát sinh chi trả')),
              icon: selected.status === 'PAID' ? 'check-circle' : 'money-bill-wave',
              tone: selected.status === 'PAID' ? 'teal' : (selected.status === 'PENDING_CONFIRMATION' ? 'blue' : (Number(selected.total_monthly_income) > 0 ? 'green' : 'neutral'))
            }
          ] : [
            {
              label: 'Tổng số buổi dạy',
              value: totalPtSessions + totalCommSessions,
              caption: `Dạy PT (1:1, nhóm, combo): ${totalPtSessions} buổi · Lớp CĐ: ${totalCommSessions} ca`,
              icon: 'dumbbell',
              tone: 'blue'
            },
            {
              label: 'Doanh số dịch vụ PT',
              value: W().money(totalRevenue),
              caption: 'Doanh số hoàn thành từ các gói PT 1:1, nhóm & combo',
              icon: 'chart-line',
              tone: 'amber'
            },
            {
              label: 'Hoa hồng dạy PT',
              value: W().money(totalPtCommission),
              caption: `Tổng hoa hồng dạy PT (${data.length} HLV)`,
              icon: 'coins',
              tone: 'coral'
            },
            {
              label: 'Thù lao lớp cộng đồng',
              value: W().money(totalCommPayout),
              caption: `Định mức bộ môn + thưởng sĩ số (${totalCommSessions} ca)`,
              icon: 'users',
              tone: 'teal'
            },
            {
              label: 'Tổng thu nhập tháng',
              value: W().money(totalCombinedPayout),
              caption: totalCombinedPayout > 0
                ? `Đã chi: ${W().money(totalPaid)} (${payableCount ? Math.round((paidCount / payableCount) * 100) : 0}%) · Chờ chi: ${W().money(totalUnpaid)}`
                : 'Chưa phát sinh khoản cần chi',
              icon: 'money-bill-wave',
              tone: 'green'
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
            caption: 'Huấn luyện viên', minWidth: 180,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<div>')
                .append($('<strong>').text(r.pt_name))
                .append($('<small style="display:block;color:#748078;">').text(r.pt_code + (r.pt_phone ? ' · ' + r.pt_phone : '')))
                .appendTo(el);
            }
          },
          { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 120 },
          {
            caption: 'Dạy kèm PT', width: 145, alignment: 'right',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<div>')
                .append($('<strong>').text(`${r.total_pt_sessions_taught || 0} buổi`))
                .append($('<small style="display:block;color:#748078;">').text(`Doanh số: ${W().money(r.pt_revenue_share)}`))
                .append($('<small style="display:block;color:#94a3b8;font-size:10.5px;">').text('1:1 · nhóm · combo'))
                .appendTo(el);
            }
          },
          {
            caption: 'Hoa hồng PT', width: 130, alignment: 'right',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<div>')
                .append($('<strong style="color:#237b58;">').text(W().money(r.total_commission_amount)))
                .append($('<small style="display:block;color:#748078;">').text(`Tỷ lệ: ${r.commission_percentage}%`))
                .appendTo(el);
            }
          },
          {
            caption: 'Lớp cộng đồng', width: 120, alignment: 'center',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<div>')
                .append($('<strong style="color:#7c3aed;">').text(`${r.community_classes_count || 0} lớp`))
                .append($('<small style="display:block;color:#748078;">').text(`${r.community_slots || 0} học viên`))
                .appendTo(el);
            }
          },
          {
            caption: 'Thù lao lớp CĐ', width: 130, alignment: 'right',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<strong>').css({ color: '#7c3aed', fontSize: '13.5px' }).text(W().money(r.community_compensation || 0)).appendTo(el);
            }
          },
          {
            caption: 'Tổng thu nhập tháng', width: 155, alignment: 'right',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<strong>').css({ color: '#237b58', fontSize: '14.5px', fontVariantNumeric: 'tabular-nums' }).text(W().money(r.total_monthly_income)).appendTo(el);
            }
          },
          {
            dataField: 'status', caption: 'Trạng thái', width: 130,
            cellTemplate: (el, cell) => {
              const map = {
                PENDING: ['Chờ chi trả', 'warning'],
                APPROVED: ['Chờ chi trả', 'warning'],
                PENDING_CONFIRMATION: ['Chờ PT xác nhận', 'info'],
                PAID: ['Đã chi trả', 'success']
              };
              const [label, tone] = map[cell.value] || [cell.value, 'neutral'];
              el.append(W().badge(label, tone));
            }
          },
          {
            caption: 'Thao tác', width: 175, fixed: true, fixedPosition: 'right',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              const box = $('<div style="display:flex;gap:6px;align-items:center;">').appendTo(el);
              box.on('click', e => e.stopPropagation());

              W().button(box, 'Chi tiết', null, () => openCommissionDetails(r.id, r));

              if (r.status === 'PENDING' || r.status === 'APPROVED') {
                // Có thu nhập tháng > 0đ: hiển thị trực tiếp nút Chi trả
                if (Number(r.total_monthly_income || r.total_commission_amount || 0) > 0) {
                  W().button(box, 'Chi trả', 'money', () => openPayoutModal(r, reloadGrid), true);
                }
              } else if (r.status === 'PENDING_CONFIRMATION') {
                $('<span class="status-badge badge-info" style="font-size:11px;padding:3px 7px;">')
                  .text('Chờ PT duyệt')
                  .appendTo(box);
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

  async function renderPtPackagesRevenueTab(container, version) {
    container.empty();

    let ptMonth = selectedMonth;
    let ptYear = selectedYear;
    let selectedPtId = 'ALL';
    let cachedCommissions = [];
    let allSessions = [];

    // 1. Toolbar Filter Bar
    const toolbar = $('<div class="filter-bar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">').appendTo(container);

    // Month SelectBox
    $('<div>').css({ width: 130 }).appendTo(toolbar).dxSelectBox({
      dataSource: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, text: `Tháng ${i + 1}` })),
      valueExpr: 'id', displayExpr: 'text', value: ptMonth,
      label: 'Tháng', labelMode: 'floating',
      onValueChanged: e => { ptMonth = e.value; loadData(); }
    });

    // Year NumberBox
    $('<div>').css({ width: 100 }).appendTo(toolbar).dxNumberBox({
      value: ptYear, min: 2025, max: 2030,
      label: 'Năm', labelMode: 'floating',
      onValueChanged: e => { ptYear = e.value; loadData(); }
    });

    // PT Trainer SelectBox (Dynamic dropdown)
    let ptSelectBoxInstance = null;
    const ptSelectBoxDiv = $('<div>').css({ minWidth: 260 }).appendTo(toolbar);
    ptSelectBoxInstance = ptSelectBoxDiv.dxSelectBox({
      dataSource: [{ id: 'ALL', text: 'Tất cả huấn luyện viên' }],
      valueExpr: 'id', displayExpr: 'text', value: 'ALL',
      label: 'Huấn luyện viên', labelMode: 'floating',
      searchEnabled: true,
      onValueChanged: e => {
        selectedPtId = e.value;
        renderDynamicContent();
      }
    }).dxSelectBox('instance');

    // Button Refresh / Tải lại
    W().button(toolbar, 'Tải lại', 'refresh', () => loadData()).option('hint', 'Tải lại dữ liệu doanh thu gói PT/Combo');

    // Button Export CSV
    W().button(toolbar, 'Xuất CSV', 'export', () => {
      const filtered = getFilteredSessions();
      if (!filtered.length) {
        return DevExpress.ui.notify('Không có dữ liệu để xuất file.', 'warning', 2500);
      }
      const ptObj = selectedPtId !== 'ALL' ? cachedCommissions.find(c => c.pt_id === selectedPtId) : null;
      exportPtSessions(filtered, ptMonth, ptYear, ptObj ? ptObj.pt_name : 'Tat_ca_HLV');
    });

    // 2. Summary KPI Box & Grid Container
    const summaryBox = $('<div class="commissions-kpis" style="margin-bottom:20px;">').appendTo(container);
    const gridContainer = $('<div>').appendTo(container);

    function getFilteredSessions() {
      if (selectedPtId === 'ALL') return allSessions;
      return allSessions.filter(s => s.pt_id === selectedPtId);
    }

    function renderDynamicContent() {
      summaryBox.empty();
      gridContainer.empty();

      const filtered = getFilteredSessions();
      const selectedPtObj = selectedPtId !== 'ALL' ? cachedCommissions.find(c => c.pt_id === selectedPtId) : null;

      const totalSessions = filtered.length;
      const totalPtRevenue = filtered.reduce((sum, s) => sum + Number(s.session_pt_value || 0), 0);
      const totalPtCommission = filtered.reduce((sum, s) => sum + Number(s.session_commission || 0), 0);
      const uniquePackages = new Set(filtered.map(s => s.package_name_snapshot)).size;
      const uniqueMembers = new Set(filtered.map(s => s.member_code)).size;

      // 4 KPI Cards
      const kpis = [
        {
          label: 'Tổng số buổi dạy',
          value: totalSessions,
          caption: selectedPtObj
            ? `Kỳ: Tháng ${ptMonth}/${ptYear} · HLV: ${selectedPtObj.pt_name} (${selectedPtObj.pt_code})`
            : `Kỳ: Tháng ${ptMonth}/${ptYear} · Tất cả HLV (${cachedCommissions.length} HLV) · 1:1, nhóm & combo`,
          icon: 'dumbbell',
          tone: 'blue'
        },
        {
          label: 'Doanh số dịch vụ PT',
          value: W().money(totalPtRevenue),
          caption: selectedPtObj
            ? `Doanh số hoàn thành của HLV: ${selectedPtObj.pt_name}`
            : 'Doanh số quy đổi hoàn thành từ các gói PT 1:1, nhóm & combo',
          icon: 'chart-line',
          tone: 'amber'
        },
        {
          label: 'Hoa hồng PT',
          value: W().money(totalPtCommission),
          caption: selectedPtObj
            ? `Hoa hồng thực nhận theo tỷ lệ ${selectedPtObj.commission_percentage}% của HLV`
            : `Tổng hoa hồng thực nhận của tất cả HLV (${cachedCommissions.length} HLV)`,
          icon: 'coins',
          tone: 'coral'
        },
        {
          label: 'Gói tập phục vụ',
          value: `${uniquePackages} gói`,
          caption: `Đang giảng dạy cho ${uniqueMembers} học viên trong kỳ`,
          icon: 'users',
          tone: 'teal'
        }
      ];

      W().metrics(summaryBox, kpis);

      if (!filtered.length) {
        return W().empty(gridContainer, `Không có buổi dạy PT/Combo nào trong tháng ${ptMonth}/${ptYear}${selectedPtObj ? ' của ' + selectedPtObj.pt_name : ''}.`, 'dumbbell');
      }

      // DataGrid (dgv)
      W().grid(gridContainer, filtered, [
        { caption: 'STT', width: 55, alignment: 'center', cellTemplate: (el, cell) => el.text(cell.rowIndex + 1) },
        { dataField: 'booking_date', caption: 'Ngày tập', dataType: 'date', format: 'dd/MM/yyyy', width: 105, alignment: 'center' },
        {
          caption: 'Khung giờ', width: 110, alignment: 'center',
          calculateCellValue: r => `${String(r.start_time || '').slice(0, 5)} - ${String(r.end_time || '').slice(0, 5)}`
        },
        {
          caption: 'Huấn luyện viên', minWidth: 170,
          cellTemplate: (el, cell) => {
            const r = cell.data;
            $('<div>')
              .append($('<strong>').text(r.pt_name || '--'))
              .append($('<small style="display:block;color:#748078;">').text(`${r.pt_code || ''} · ${r.branch_name || ''}`))
              .appendTo(el);
          }
        },
        {
          caption: 'Học viên', minWidth: 170,
          cellTemplate: (el, cell) => {
            const r = cell.data;
            $('<div>')
              .append($('<strong>').text(r.member_name || '--'))
              .append($('<small style="display:block;color:#748078;">').text(`${r.member_code || ''}${r.member_phone ? ' · ' + r.member_phone : ''}`))
              .appendTo(el);
          }
        },
        {
          dataField: 'package_name_snapshot', caption: 'Gói tập', minWidth: 200
        },
        {
          caption: 'Buổi số', width: 95, alignment: 'center',
          calculateCellValue: r => `Buổi ${r.session_number || 1}/${r.total_pt_sessions_snapshot || '?'}`
        },
        {
          dataField: 'session_pt_value', caption: 'Doanh số buổi', width: 130, alignment: 'right',
          cellTemplate: (el, cell) => $('<strong>').css({ fontVariantNumeric: 'tabular-nums' }).text(W().money(cell.value)).appendTo(el)
        },
        {
          dataField: 'commission_percentage', caption: 'Tỷ lệ %', width: 85, alignment: 'center',
          cellTemplate: (el, cell) => el.text(`${cell.value || 0}%`)
        },
        {
          dataField: 'session_commission', caption: 'Hoa hồng buổi', width: 140, alignment: 'right',
          cellTemplate: (el, cell) => $('<strong>').css({ color: '#237b58', fontVariantNumeric: 'tabular-nums' }).text(W().money(cell.value)).appendTo(el)
        },
        {
          dataField: 'status', caption: 'Trạng thái', width: 130, alignment: 'center',
          cellTemplate: el => el.html(W().badge('Đã hoàn thành', 'success'))
        }
      ], {
        columnAutoWidth: true,
        paging: { pageSize: 15 },
        pager: {
          visible: true,
          allowedPageSizes: [10, 15, 30, 50],
          showPageSizeSelector: true,
          showInfo: true,
          showNavigationButtons: true
        },
        searchPanel: {
          visible: true,
          highlightCaseSensitive: false,
          placeholder: 'Tìm kiếm học viên, HLV, gói tập...'
        },
        summary: {
          totalItems: [
            { column: 'booking_date', summaryType: 'count', displayFormat: 'Tổng: {0} buổi' },
            { column: 'session_pt_value', summaryType: 'sum', valueFormat: '#,##0 đ', displayFormat: 'Tổng doanh số: {0}' },
            { column: 'session_commission', summaryType: 'sum', valueFormat: '#,##0 đ', displayFormat: 'Tổng hoa hồng: {0}' }
          ]
        }
      });
    }

    async function loadData() {
      W().loading(gridContainer);
      try {
        let resComm = await api().request(`/commissions/monthly?month=${ptMonth}&year=${ptYear}`);
        let commList = resComm.data || [];

        // Nếu kỳ chưa được tính toán hoa hồng, tự động kích hoạt tính toán
        if (!commList.length) {
          try {
            await api().request('/commissions/calculate', {
              method: 'POST',
              body: { month: ptMonth, year: ptYear, branch_id: api().getCurrentBranchId() }
            });
            resComm = await api().request(`/commissions/monthly?month=${ptMonth}&year=${ptYear}`);
            commList = resComm.data || [];
          } catch (_) {}
        }

        if (version !== revision) return;
        cachedCommissions = commList;

        // Cập nhật danh sách HLV vào dropdown
        const ptOptions = [
          { id: 'ALL', text: 'Tất cả huấn luyện viên' },
          ...commList.map(c => ({ id: c.pt_id, text: `${c.pt_name} (${c.pt_code} - ${c.branch_name})` }))
        ];
        ptSelectBoxInstance.option('dataSource', ptOptions);
        if (!ptOptions.some(o => o.id === selectedPtId)) {
          selectedPtId = 'ALL';
          ptSelectBoxInstance.option('value', 'ALL');
        }

        // Tải chi tiết các buổi dạy của tất cả HLV trong kỳ
        const detailPromises = commList.map(c =>
          api().request(`/commissions/${c.id}/details`).then(res => {
            const sess = res.data?.sessions || [];
            return sess.map(s => ({
              ...s,
              pt_id: c.pt_id,
              pt_name: c.pt_name,
              pt_code: c.pt_code,
              pt_phone: c.pt_phone,
              branch_name: c.branch_name,
              commission_percentage: s.commission_percentage || c.commission_percentage
            }));
          }).catch(() => [])
        );

        const results = await Promise.all(detailPromises);
        if (version !== revision) return;

        allSessions = results.flat().sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date) || String(a.start_time).localeCompare(String(b.start_time)));

        renderDynamicContent();
      } catch (err) {
        W().error(gridContainer, err, loadData);
      }
    }

    await loadData();
  }

  function openCommunityClassMembersModal(classId, classTitle, enrolledSlots, maxSlots, instructorName, disciplineName) {
    const dialog = W().popup(`Danh sách học viên: ${classTitle || 'Lớp cộng đồng'}`, content => {
      const banner = $('<div style="background:linear-gradient(135deg,#2e1065 0%,#4c1d95 100%);color:#fff;border-radius:8px;padding:12px 16px;margin-bottom:14px;">').appendTo(content);
      banner.html(`
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-size:11px;font-weight:700;color:#ddd6fe;text-transform:uppercase;letter-spacing:0.5px;">LỚP HỌC CỘNG ĐỒNG · ${W().escape(disciplineName || 'BỘ MÔN NHÓM')}</span>
            <h4 style="margin:3px 0 0;font-size:16px;font-weight:700;color:#fff;">${W().escape(classTitle || '--')}</h4>
            <div style="margin-top:4px;font-size:12px;color:#c4b5fd;">HLV phụ trách: <strong>${W().escape(instructorName || '--')}</strong></div>
          </div>
          <span style="background:rgba(255,255,255,0.2);padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;color:#fff;font-family:Manrope,monospace;">
            ${enrolledSlots || 0}/${maxSlots || 40} HỌC VIÊN
          </span>
        </div>
      `);

      const gridDiv = $('<div>').appendTo(content);
      W().loading(gridDiv);

      api().request(`/community-classes/${encodeURIComponent(classId)}/members`).then(res => {
        gridDiv.empty();
        const data = res.data || res;
        const members = data?.members || [];
        if (!members.length) {
          return W().empty(gridDiv, 'Chưa có học viên nào đăng ký tham gia lớp học này.', 'user-group');
        }

        W().grid(gridDiv, members, [
          { caption: 'STT', width: 50, alignment: 'center', cellTemplate: (el, cell) => el.text(cell.rowIndex + 1) },
          {
            dataField: 'member_code', caption: 'Mã HV', width: 100, alignment: 'center',
            cellTemplate: (el, cell) => $('<span class="status-badge badge-success" style="font-family:monospace;font-weight:700;">').text(cell.value || '--').appendTo(el)
          },
          {
            dataField: 'full_name', caption: 'Họ và tên', minWidth: 150,
            cellTemplate: (el, cell) => $('<strong>').text(cell.value || '--').appendTo(el)
          },
          { dataField: 'phone', caption: 'Số điện thoại', width: 120, alignment: 'center' },
          { dataField: 'registration_date', caption: 'Thời điểm đăng ký', width: 150, alignment: 'center', calculateCellValue: r => formatDateTime(r.registration_date) },
          {
            dataField: 'status', caption: 'Trạng thái', width: 120, alignment: 'center',
            cellTemplate: el => el.html(W().badge('Đã đăng ký', 'success'))
          }
        ], { columnAutoWidth: true, paging: { pageSize: 6 } });
      }).catch(err => {
        W().error(gridDiv, err);
      });
    }, { width: 750 });
  }

  async function renderCommunityTab(container, version) {
    container.empty();

    // 1. Toolbar Filter Bar
    const filterBar = $('<div class="filter-bar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;">').appendTo(container);

    let commMonth = selectedMonth;
    let commYear = selectedYear;
    let commBranch = api().getCurrentBranchId() || 'ALL';
    let commPtId = 'ALL';

    // Filter Month
    $('<div>').css({ width: 130 }).appendTo(filterBar).dxSelectBox({
      dataSource: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, text: `Tháng ${i + 1}` })),
      valueExpr: 'id', displayExpr: 'text', value: commMonth,
      label: 'Tháng', labelMode: 'floating',
      onValueChanged: e => { commMonth = e.value; loadCommunityGrid(); }
    });

    // Filter Year
    $('<div>').css({ width: 100 }).appendTo(filterBar).dxNumberBox({
      value: commYear, min: 2025, max: 2030,
      label: 'Năm', labelMode: 'floating',
      onValueChanged: e => { commYear = e.value; loadCommunityGrid(); }
    });

    // Filter Branch
    let branchStore = [];
    const branchBox = $('<div>').css({ width: 220 }).appendTo(filterBar).dxSelectBox({
      dataSource: new DevExpress.data.CustomStore({
        key: 'id', loadMode: 'raw',
        load: async () => {
          const b = await api().request('/branches');
          branchStore = [{ id: 'ALL', branch_name: 'Toàn bộ chi nhánh' }, ...W().rows(b)];
          return branchStore;
        }
      }),
      valueExpr: 'id', displayExpr: 'branch_name', value: commBranch,
      label: 'Chi nhánh', labelMode: 'floating',
      onValueChanged: e => { commBranch = e.value; loadCommunityGrid(); }
    }).dxSelectBox('instance');

    // Filter Instructor
    let ptStore = [];
    const ptBox = $('<div>').css({ width: 240 }).appendTo(filterBar).dxSelectBox({
      dataSource: new DevExpress.data.CustomStore({
        key: 'id', loadMode: 'raw',
        load: async () => {
          const p = await api().request('/pt-bookings/trainers?status=ACTIVE');
          ptStore = [{ id: 'ALL', full_name: 'Toàn bộ HLV' }, ...W().rows(p)];
          return ptStore;
        }
      }),
      valueExpr: 'id',
      displayExpr: r => r.id === 'ALL' ? 'Toàn bộ HLV' : `${r.full_name || ''} (${r.pt_code || ''})`,
      value: commPtId,
      label: 'Huấn luyện viên', labelMode: 'floating',
      onValueChanged: e => { commPtId = e.value; loadCommunityGrid(); }
    }).dxSelectBox('instance');

    // Button Refresh
    W().button(filterBar, 'Tải lại', 'refresh', () => loadCommunityGrid()).option('hint', 'Tải lại dữ liệu thù lao lớp cộng đồng');

    // 2. Metrics Container
    const metricsContainer = $('<div class="commissions-kpis commissions-community-kpis" style="margin-bottom:20px;">').appendTo(container);

    // 3. Grid Container
    const gridContainer = $('<div>').appendTo(container);

    async function loadCommunityGrid() {
      W().loading(gridContainer);
      metricsContainer.empty();

      try {
        const startDate = `${commYear}-${String(commMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(commYear, commMonth, 0).getDate();
        const endDate = `${commYear}-${String(commMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const reqHeaders = {};
        if (commBranch === 'ALL') {
          reqHeaders['x-branch-id'] = 'ALL';
        } else if (commBranch) {
          reqHeaders['x-branch-id'] = commBranch;
        }

        const res = await api().request(`/community-classes?date_from=${startDate}&date_to=${endDate}`, { headers: reqHeaders });
        if (version !== revision) return;
        gridContainer.empty();

        let rawClasses = Array.isArray(res) ? res : (res.data || []);
        // Lọc theo chi nhánh nếu có
        if (commBranch && commBranch !== 'ALL') {
          rawClasses = rawClasses.filter(c => c.branch_id === commBranch);
        }
        // Lọc theo HLV nếu có
        if (commPtId && commPtId !== 'ALL') {
          rawClasses = rawClasses.filter(c => c.instructor_id === commPtId);
        }

        const totalClasses = rawClasses.length;
        const totalCompensation = rawClasses.reduce((sum, c) => sum + Number(c.total_compensation || 0), 0);
        const totalBasePrice = rawClasses.reduce((sum, c) => sum + Number(c.base_price || 0), 0);
        const totalBonus = rawClasses.reduce((sum, c) => sum + Number(c.bonus_amount || 0), 0);
        const totalSlots = rawClasses.reduce((sum, c) => sum + Number(c.enrolled_slots || 0), 0);
        const avgComp = totalClasses > 0 ? Math.round(totalCompensation / totalClasses) : 0;

        // Render KPI Metrics (Administrative Forest Clean - 6 Cards cân đối)
        W().metrics(metricsContainer, [
          {
            label: 'Tổng số buổi lớp CĐ',
            value: `${totalClasses} buổi`,
            caption: `Tháng ${commMonth}/${commYear} · Đã tổ chức`,
            icon: 'users',
            tone: 'blue'
          },
          {
            label: 'Tổng thù lao lớp CĐ',
            value: W().money(totalCompensation),
            caption: 'Định mức bộ môn + thưởng sĩ số',
            icon: 'money-bill-wave',
            tone: 'green'
          },
          {
            label: 'Tổng thù lao cơ bản',
            value: W().money(totalBasePrice),
            caption: 'Định mức theo giá sàn bộ môn',
            icon: 'wallet',
            tone: 'purple'
          },
          {
            label: 'Tổng thưởng',
            value: W().money(totalBonus),
            caption: 'Thưởng thêm khích lệ HLV',
            icon: 'award',
            tone: 'coral'
          },
          {
            label: 'Tổng lượt học viên',
            value: `${totalSlots} lượt`,
            caption: totalClasses > 0 ? `Bình quân ${(totalSlots / totalClasses).toFixed(1)} HV / lớp` : 'Chưa có lượt tham gia',
            icon: 'user-group',
            tone: 'amber'
          },
          {
            label: 'Thù lao bình quân / buổi',
            value: W().money(avgComp),
            caption: 'Mức chi phí thù lao bình quân mỗi ca',
            icon: 'coins',
            tone: 'teal'
          }
        ]);

        if (!rawClasses.length) {
          return W().empty(gridContainer, `Không có buổi tập cộng đồng nào trong tháng ${commMonth}/${commYear} phù hợp với bộ lọc.`, 'users');
        }

        // Render DataGrid
        W().grid(gridContainer, rawClasses, [
          { caption: 'STT', width: 50, alignment: 'center', cellTemplate: (el, cell) => el.text(cell.rowIndex + 1) },
          {
            caption: 'Ngày & Giờ', width: 150,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              const dStr = r.class_date ? new Date(r.class_date).toLocaleDateString('vi-VN') : '--';
              const tStr = `${String(r.start_time || '').slice(0, 5)} - ${String(r.end_time || '').slice(0, 5)}`;
              $('<div>')
                .append($('<strong>').text(dStr))
                .append($('<small style="display:block;color:#748078;">').text(tStr))
                .appendTo(el);
            }
          },
          {
            caption: 'Lớp học & Bộ môn', minWidth: 180,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<div>')
                .append($('<strong style="color:#1e293b;">').text(r.title || '--'))
                .append($('<small style="display:block;color:#7c3aed;font-weight:600;">').text(r.discipline_name || 'Bộ môn nhóm'))
                .appendTo(el);
            }
          },
          {
            caption: 'Huấn luyện viên', minWidth: 160,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<div>')
                .append($('<strong>').text(r.instructor_name || '--'))
                .append($('<small style="display:block;color:#748078;">').text(r.pt_code ? `${r.pt_code}${r.instructor_phone ? ' · ' + r.instructor_phone : ''}` : ''))
                .appendTo(el);
            }
          },
          { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 140 },
          {
            caption: 'Sĩ số', width: 110, alignment: 'center',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              const enrolled = Number(r.enrolled_slots || 0);
              const max = Number(r.max_slots || 40);
              $('<span class="status-badge badge-info" style="font-family:Manrope,monospace;font-weight:600;">')
                .text(`${enrolled}/${max} HV`)
                .appendTo(el);
            }
          },
          {
            dataField: 'base_price', caption: 'Thù lao cơ bản', width: 120, alignment: 'right',
            calculateCellValue: r => W().money(r.base_price)
          },
          {
            dataField: 'bonus_amount', caption: 'Thưởng sĩ số', width: 110, alignment: 'right',
            calculateCellValue: r => W().money(r.bonus_amount)
          },
          {
            dataField: 'total_compensation', caption: 'Tổng thù lao', width: 130, alignment: 'right',
            cellTemplate: (el, cell) => $('<strong>').css({ color: '#237b58', fontSize: '14px' }).text(W().money(cell.value)).appendTo(el)
          },
          {
            caption: 'Thao tác', width: 120, fixed: true, fixedPosition: 'right', alignment: 'center',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              const btn = W().button(el, 'Học viên', 'fa-solid fa-list-check', () => {
                openCommunityClassMembersModal(r.id, r.title, r.enrolled_slots, r.max_slots, r.instructor_name, r.discipline_name);
              });
              btn.option('hint', 'Xem danh sách hội viên đã đăng ký');
            }
          }
        ], { columnAutoWidth: true, paging: { pageSize: 12 } });

      } catch (err) {
        W().error(gridContainer, err, loadCommunityGrid);
      }
    }

    await loadCommunityGrid();
  }

  async function renderHistoryTab(container, version) {
    const headerRow = $('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">').appendTo(container);
    $('<h3>').css({ margin: 0, fontSize: '18px', fontWeight: '700' }).text('Lịch sử chi trả hoa hồng PT').appendTo(headerRow);

    const headerActions = $('<div style="display:flex;gap:8px;align-items:center;">').appendTo(headerRow);

    // Filter Bar
    const filterBar = $('<div class="filter-bar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px;padding:0 0 12px 0;">').appendTo(container);

    // Metrics Row
    const metricsContainer = $('<div class="commissions-history-kpis" style="margin-bottom:20px;">').appendTo(container);

    // DataGrid Container
    const gridContainer = $('<div>').appendTo(container);

    let searchVal = '';
    let selectedPeriodMonth = 'ALL';
    let selectedPeriodYear = 2026;
    let selectedMethod = 'ALL';
    let selectedStatus = 'ALL';
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

    // 5. Lọc trạng thái chi trả
    $('<div>').css({ width: 180 }).appendTo(filterBar).dxSelectBox({
      dataSource: [
        { id: 'ALL', text: 'Tất cả trạng thái' },
        { id: 'PAID', text: 'Đã chi trả' },
        { id: 'PENDING_CONFIRMATION', text: 'Chờ PT xác nhận' }
      ],
      valueExpr: 'id',
      displayExpr: 'text',
      value: 'ALL',
      onValueChanged: e => {
        selectedStatus = e.value;
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
      const paidCount = records.filter(r => r.status === 'PAID').length;
      const pendingCount = records.filter(r => r.status === 'PENDING_CONFIRMATION').length;

      const paidTotalAmount = records.filter(r => r.status === 'PAID').reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);
      const pendingTotalAmount = records.filter(r => r.status === 'PENDING_CONFIRMATION').reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);

      const bankRecords = records.filter(r => r.payout_method === 'BANK_TRANSFER');
      const bankAmount = bankRecords.reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);
      const paidBankAmount = bankRecords.filter(r => r.status === 'PAID').reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);
      const pendingBankAmount = bankRecords.filter(r => r.status === 'PENDING_CONFIRMATION').reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);

      const cashRecords = records.filter(r => r.payout_method === 'CASH');
      const cashAmount = cashRecords.reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);
      const paidCashAmount = cashRecords.filter(r => r.status === 'PAID').reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);
      const pendingCashAmount = cashRecords.filter(r => r.status === 'PENDING_CONFIRMATION').reduce((acc, r) => acc + Number(r.total_commission_amount || 0), 0);

      W().metrics(metricsContainer, [
        {
          label: 'Tổng lượt chi trả',
          value: `${totalCount} lượt`,
          caption: pendingCount > 0 ? `${paidCount} đã thành công · ${pendingCount} chờ xác nhận` : `${paidCount} đã thành công (100%)`,
          tone: pendingCount > 0 ? 'teal' : 'green',
          icon: 'receipt'
        },
        {
          label: 'Tổng tiền chi trả',
          value: W().money(totalPaidAmount),
          caption: `Đã thành công: ${W().money(paidTotalAmount)} · Chờ xác nhận: ${W().money(pendingTotalAmount)}`,
          tone: 'blue',
          icon: 'money-bill-wave'
        },
        {
          label: 'Tổng thanh toán thành công',
          value: W().money(paidTotalAmount),
          caption: `VietQR: ${W().money(paidBankAmount)} · Tiền mặt: ${W().money(paidCashAmount)}`,
          tone: 'green',
          icon: 'circle-check'
        },
        {
          label: 'Tổng chờ xác nhận',
          value: W().money(pendingTotalAmount),
          caption: `VietQR: ${W().money(pendingBankAmount)} · Tiền mặt: ${W().money(pendingCashAmount)}`,
          tone: 'amber',
          icon: 'clock'
        },
        {
          label: 'Chi qua VietQR / Ngân hàng',
          value: W().money(bankAmount),
          caption: `Đã thành công: ${W().money(paidBankAmount)} · Chờ xác nhận: ${W().money(pendingBankAmount)}`,
          tone: 'teal',
          icon: 'qrcode'
        },
        {
          label: 'Chi tiền mặt tại quầy',
          value: W().money(cashAmount),
          caption: `Đã thành công: ${W().money(paidCashAmount)} · Chờ xác nhận: ${W().money(pendingCashAmount)}`,
          tone: 'coral',
          icon: 'hand-holding-dollar'
        }
      ]);
    }

    async function loadHistory() {
      W().loading(gridContainer);
      try {
        let url = `/commissions/payout-history?search=${encodeURIComponent(searchVal)}`;
        if (selectedPeriodMonth && selectedPeriodMonth !== 'ALL') url += `&month=${selectedPeriodMonth}`;
        if (selectedPeriodYear) url += `&year=${selectedPeriodYear}`;
        if (selectedMethod !== 'ALL') url += `&payout_method=${selectedMethod}`;
        if (selectedStatus && selectedStatus !== 'ALL') url += `&status=${selectedStatus}`;

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
            dataField: 'total_commission_amount', caption: 'Tiền hoa hồng', width: 140, alignment: 'right',
            cellTemplate: (el, cell) => $('<strong>').css({ color: '#237b58', fontSize: '14px' }).text(W().money(cell.value)).appendTo(el)
          },
          {
            dataField: 'payout_method', caption: 'Hình thức', width: 130, alignment: 'center',
            cellTemplate: (el, cell) => {
              const isBank = cell.value === 'BANK_TRANSFER';
              el.html(W().badge(isBank ? 'Chuyển khoản' : 'Tiền mặt', isBank ? 'info' : 'neutral'));
            }
          },
          {
            dataField: 'status', caption: 'Trạng thái', width: 150, alignment: 'center',
            cellTemplate: (el, cell) => {
              if (cell.value === 'PAID') {
                el.html(W().badge('Đã chi trả', 'success'));
              } else if (cell.value === 'PENDING_CONFIRMATION') {
                el.html(W().badge('Chờ PT xác nhận', 'info'));
              } else {
                el.html(W().badge(cell.value || '-', 'neutral'));
              }
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
    const ptCommAmount = Number(record.total_commission_amount || 0);
    const commClassPayout = Number(record.community_compensation || 0);
    const amount = Number(record.total_monthly_income || (ptCommAmount + commClassPayout));
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
          text: 'Xác nhận đã chi trả',
          type: 'default',
          stylingMode: 'contained',
          icon: 'check',
          onClick: async () => {
            if (doSubmit) await doSubmit();
          }
        }
      }
    ];

    popupInstance = W().popup('Xác nhận chi trả thu nhập & hoa hồng PT', content => {
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
            PT 1:1: <strong>${record.total_pt_sessions_taught || 0} buổi (${W().money(ptCommAmount)})</strong> · Lớp CĐ: <strong>${record.community_classes_count || 0} lớp (${W().money(commClassPayout)})</strong>
          </div>
          <div>
            Tổng chi trả: <strong style="font-size:15px;color:var(--primary);font-variant-numeric:tabular-nums;">${W().money(amount)}</strong>
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
        payout_date: new Date(),
        payout_note: `Chi trả thu nhập tháng ${record.month}/${record.year} cho HLV ${record.pt_name}`
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
                colSpan: 2,
                editorType: 'dxTextBox',
                editorOptions: { placeholder: 'Tên chủ tài khoản', onValueChanged: updateQr }
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

        try {
          await api().request(`/commissions/${record.id}/status`, {
            method: 'PUT',
            body: {
              status: 'PENDING_CONFIRMATION',
              payout_method: vals.payout_method,
              payout_note: (vals.payout_note || '').trim() || null,
              bank_name: isBank ? (vals.bank_name || '').trim() : null,
              bank_account_no: isBank ? (vals.bank_account_no || '').trim() : null,
              bank_account_name: isBank ? (vals.bank_account_name || '').trim() : null
            }
          });

          DevExpress.ui.notify(`Đã phát lệnh chi trả ${W().money(amount)}. Đang chờ HLV ${record.pt_name} xác nhận trên App!`, 'success', 3500);
          popupInstance.hide();
          if (onDone) await onDone();
        } catch (err) {
          W().error(errorsBox, err);
        }
      };

    }, { width: 680, maxHeight: '85vh', toolbarItems });
  }

  async function openCommissionDetails(id, commRecord = null) {
    const dialog = W().popup('Chi tiết buổi dạy & thu nhập HLV', content => {
      W().loading(content);
      api().request(`/commissions/${id}/details`).then(async res => {
        content.empty();
        const data = res.data || {};
        const comm = data.commission || commRecord || {};
        const sessions = data.sessions || [];

        // Nạp thêm danh sách lớp cộng đồng của HLV trong cùng kỳ tháng
        let commClasses = [];
        try {
          const startDate = `${comm.year}-${String(comm.month).padStart(2, '0')}-01`;
          const lastDay = new Date(comm.year, comm.month, 0).getDate();
          const endDate = `${comm.year}-${String(comm.month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
          const resCls = await api().request(`/community-classes?instructor_id=${comm.pt_id}&date_from=${startDate}&date_to=${endDate}`);
          const rawCls = Array.isArray(resCls) ? resCls : (resCls.data || []);
          commClasses = rawCls.filter(c => c.instructor_id === comm.pt_id);
        } catch (_) {}

        const ptCommAmount = Number(comm.total_commission_amount || 0);
        const commClassPayout = commClasses.reduce((sum, c) => sum + Number(c.total_compensation || 0), 0);
        const totalIncome = ptCommAmount + commClassPayout;

        const isPaid = comm.status === 'PAID';
        const isPendingConfirmation = comm.status === 'PENDING_CONFIRMATION';
        const isApproved = comm.status === 'APPROVED';
        const statusBadge = isPaid
          ? W().badge('Đã chi trả', 'success')
          : (isPendingConfirmation
              ? W().badge('Chờ PT xác nhận', 'info')
              : (isApproved ? W().badge('Đã duyệt', 'info') : W().badge('Chờ chi trả', 'warning')));

        $('<div style="margin-bottom:16px;padding:14px 16px;background:#f8fbf9;border-radius:8px;border:1px solid #dfe6e2;">')
          .html(`
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <span style="font-size:16px;font-weight:700;color:#1e3a2b;">Tháng ${comm.month}/${comm.year} · HLV ${W().escape(comm.pt_name || '')}</span>
                <span style="font-size:13px;color:#748078;margin-left:6px;">(${W().escape(comm.pt_code || '')})</span>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <span style="color:#237b58;font-weight:700;font-size:14px;">Tỷ lệ hoa hồng PT: ${comm.commission_percentage}%</span>
                ${statusBadge}
              </div>
            </div>
            <div style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;padding:10px 12px;background:#fff;border-radius:6px;border:1px solid #edf1ee;font-size:13px;">
              <div>
                <span style="color:#64748b;font-size:11.5px;display:block;">HOA HỒNG DẠY KÈM PT (1:1, NHÓM, COMBO)</span>
                <strong>${comm.total_pt_sessions_taught != null ? comm.total_pt_sessions_taught : sessions.length} buổi</strong> · <span style="color:#237b58;font-weight:700;">${W().money(ptCommAmount)}</span>
              </div>
              <div>
                <span style="color:#64748b;font-size:11.5px;display:block;">THÙ LAO LỚP CỘNG ĐỒNG</span>
                <strong>${commClasses.length} lớp</strong> · <span style="color:#7c3aed;font-weight:700;">${W().money(commClassPayout)}</span>
              </div>
              <div>
                <span style="color:#64748b;font-size:11.5px;display:block;">TỔNG THU NHẬP THỰC NHẬN</span>
                <strong style="color:#237b58;font-size:16px;font-variant-numeric:tabular-nums;">${W().money(totalIncome)}</strong>
              </div>
            </div>
            ${(isPaid || isPendingConfirmation) ? `
              <div style="margin-top:10px;padding:10px 14px;background:#fafbfa;border-radius:4px;border:1px solid var(--border-color);font-size:12px;display:flex;flex-wrap:wrap;gap:16px;color:var(--text-main);">
                <span>Thời gian phát lệnh: <strong>${formatDateTime(comm.paid_at)}</strong></span>
                <span>Hình thức: <strong>${comm.payout_method === 'CASH' ? 'Tiền mặt tại quầy' : 'Chuyển khoản VietQR'}</strong></span>
                ${comm.paid_by_name ? `<span>Người phát lệnh: <strong>${W().escape(comm.paid_by_name)}</strong></span>` : ''}
                ${comm.pt_confirmed_at ? `<span style="color:#237b58;">PT xác nhận nhận tiền: <strong>${formatDateTime(comm.pt_confirmed_at)}</strong></span>` : '<span style="color:#0284c7;"><em>Chờ HLV bấm xác nhận trên app</em></span>'}
                ${comm.payout_note ? `<span style="width:100%;color:var(--text-muted);border-top:1px solid #edf1ee;padding-top:6px;margin-top:2px;">Ghi chú: ${W().escape(comm.payout_note)}</span>` : ''}
              </div>
            ` : ''}
          `).appendTo(content);

        // Sub Tabs inside Details Modal
        const subTabContainer = $('<div class="commission-details-tabs">').appendTo(content);
        const subTabs = [
          { id: 'pt', text: `Dạy kèm PT (1:1, nhóm, combo) (${sessions.length})` },
          { id: 'comm', text: `Lớp dạy cộng đồng (${commClasses.length})` }
        ];

        let currentSubTab = 'pt';
        const subContentArea = $('<div style="margin-top:12px;">').appendTo(content);

        subTabContainer.dxTabs({
          dataSource: subTabs,
          selectedIndex: 0,
          onSelectionChanged: e => {
            currentSubTab = e.addedItems[0]?.id || 'pt';
            renderSubContent();
          },
          onItemClick: e => {
            currentSubTab = e.itemData.id;
            renderSubContent();
          }
        });

        function renderSubContent() {
          subContentArea.empty();
          if (currentSubTab === 'pt') {
            if (!sessions.length) {
              return W().empty(subContentArea, 'Không có buổi dạy kèm PT nào trong kỳ này.', 'dumbbell');
            }
            W().grid(subContentArea, sessions, [
              { dataField: 'booking_date', caption: 'Ngày tập', dataType: 'date', format: 'dd/MM/yyyy', width: 100 },
              { caption: 'Giờ', width: 100, calculateCellValue: r => `${String(r.start_time).slice(0, 5)} - ${String(r.end_time).slice(0, 5)}` },
              { dataField: 'member_name', caption: 'Học viên', minWidth: 140 },
              { dataField: 'package_name_snapshot', caption: 'Gói tập', minWidth: 160 },
              { dataField: 'session_number', caption: 'Buổi số', width: 75, alignment: 'center' },
              { dataField: 'session_pt_value', caption: 'Giá trị buổi', width: 110, alignment: 'right', calculateCellValue: r => W().money(r.session_pt_value) },
              {
                dataField: 'session_commission', caption: 'Hoa hồng buổi', width: 120, alignment: 'right',
                cellTemplate: (el, cell) => $('<strong>').css('color', '#237b58').text(W().money(cell.value)).appendTo(el)
              }
            ], { columnAutoWidth: true, paging: { pageSize: 6 } });
          } else {
            if (!commClasses.length) {
              return W().empty(subContentArea, 'Không có ca dạy lớp cộng đồng nào trong kỳ này.', 'users');
            }
            W().grid(subContentArea, commClasses, [
              { dataField: 'class_date', caption: 'Ngày dạy', dataType: 'date', format: 'dd/MM/yyyy', width: 100 },
              { caption: 'Giờ', width: 100, calculateCellValue: r => `${String(r.start_time).slice(0, 5)} - ${String(r.end_time).slice(0, 5)}` },
              { dataField: 'title', caption: 'Tên lớp học', minWidth: 150 },
              { dataField: 'discipline_name', caption: 'Bộ môn', width: 100 },
              {
                caption: 'Sĩ số', width: 90, alignment: 'center',
                cellTemplate: (el, cell) => $('<span class="status-badge badge-info" style="font-family:monospace;">').text(`${cell.data.enrolled_slots || 0}/${cell.data.max_slots || 40}`).appendTo(el)
              },
              { dataField: 'base_price', caption: 'Định mức', width: 100, alignment: 'right', calculateCellValue: r => W().money(r.base_price) },
              { dataField: 'bonus_amount', caption: 'Thưởng', width: 90, alignment: 'right', calculateCellValue: r => W().money(r.bonus_amount) },
              {
                dataField: 'total_compensation', caption: 'Tổng thù lao', width: 120, alignment: 'right',
                cellTemplate: (el, cell) => $('<strong>').css({ color: '#7c3aed' }).text(W().money(cell.value)).appendTo(el)
              },
              {
                caption: '', width: 80, alignment: 'center',
                cellTemplate: (el, cell) => {
                  W().button(el, '', 'fa-solid fa-list-check', () => {
                    openCommunityClassMembersModal(cell.data.id, cell.data.title, cell.data.enrolled_slots, cell.data.max_slots, comm.pt_name, cell.data.discipline_name);
                  }).option('hint', 'Xem danh sách học viên');
                }
              }
            ], { columnAutoWidth: true, paging: { pageSize: 6 } });
          }
        }

        renderSubContent();
      }).catch(err => {
        W().error(content, err);
      });
    }, { width: 860 });
  }

  function destroy() { revision++; view = null; }
  return { render, refresh: load, destroy };
})();
