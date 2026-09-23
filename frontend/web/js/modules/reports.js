window.ReportsModule = (function () {
  'use strict';
  let period = 'month', currentTab = 'profit', revision = 0, data = null;
  let currentProfitTableTab = 'reconciliation';
  const now = new Date();
  let currentYear = now.getFullYear() >= 2025 ? now.getFullYear() : 2026;
  let currentMonth = now.getMonth() + 1;
  let currentQuarter = Math.ceil(currentMonth / 3);

  let view = null, exportButton = null, subFilterBox = null;
  const periodNames = { month: 'Tháng', quarter: 'Quý', year: 'Năm' };

  function breakdown(value) {
    if (typeof value === 'string') return value;
    if (!value) return '-';
    return [['gym', 'Gói Gym'], ['pt', 'Gói PT'], ['combo', 'Combo']]
      .filter(([key]) => Number(value[key]) > 0)
      .map(([key, label]) => `${value[key]} ${label}`)
      .join(' · ') || '-';
  }

  function formatPeriodAxis(val, p) {
    if (!val) return '';
    const parts = String(val).split('-');
    if (p === 'month' && parts.length >= 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    if (parts.length >= 2) {
      return `T${parseInt(parts[1], 10)}`;
    }
    return val;
  }

  function formatPeriodGrid(val, p) {
    if (!val) return '';
    const parts = String(val).split('-');
    if (p === 'month' && parts.length >= 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (parts.length >= 2) {
      return `Tháng ${parts[1]}/${parts[0]}`;
    }
    return val;
  }

  function fillCompleteTimeline(rawRevenue, classTimeline, ptTimeline, p, year, month, quarter) {
    const map = new Map();
    (rawRevenue || []).forEach(item => {
      if (item && item.period) map.set(item.period, { ...item });
    });

    const classMap = new Map();
    (classTimeline || []).forEach(item => {
      if (item && item.period) classMap.set(item.period, Number(item.class_cost || 0));
    });

    const ptMap = new Map();
    (ptTimeline || []).forEach(item => {
      if (item && item.period) ptMap.set(item.period, Number(item.pt_cost || 0));
    });

    const result = [];
    const buildItem = (periodKey) => {
      const existing = map.get(periodKey);
      const classCost = classMap.get(periodKey) || 0;
      const ptCost = ptMap.get(periodKey) || 0;
      const cashReceived = existing ? Number(existing.cash_received || 0) : 0;
      const voucherDiscount = existing ? Number(existing.voucher_discount || 0) : 0;
      const grossRevenue = existing ? Number(existing.gross_package_revenue ?? (cashReceived + voucherDiscount)) : 0;
      const totalExpense = classCost + ptCost + voucherDiscount;
      const netProfit = grossRevenue - totalExpense;

      if (existing) {
        existing.gross_package_revenue = grossRevenue;
        existing.voucher_discount = voucherDiscount;
        existing.community_class_cost = classCost;
        existing.pt_commission_cost = ptCost;
        existing.total_expense = totalExpense;
        existing.net_profit = netProfit;
        return existing;
      }
      return {
        period: periodKey,
        packages_sold: 0,
        gross_package_revenue: 0,
        cash_received: 0,
        voucher_discount: 0,
        gym: 0,
        pt: 0,
        combo: 0,
        service_breakdown: 'Gym: 0 | PT: 0 | Combo: 0',
        service_counts: { gym: 0, pt: 0, combo: 0 },
        community_class_cost: classCost,
        pt_commission_cost: ptCost,
        total_expense: totalExpense,
        net_profit: netProfit
      };
    };

    if (p === 'month') {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const periodKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        result.push(buildItem(periodKey));
      }
    } else if (p === 'quarter') {
      const firstM = (quarter - 1) * 3 + 1;
      for (let m = firstM; m < firstM + 3; m++) {
        const periodKey = `${year}-${String(m).padStart(2, '0')}`;
        result.push(buildItem(periodKey));
      }
    } else if (p === 'year') {
      for (let m = 1; m <= 12; m++) {
        const periodKey = `${year}-${String(m).padStart(2, '0')}`;
        result.push(buildItem(periodKey));
      }
    } else {
      return rawRevenue || [];
    }
    return result;
  }

  async function render(containerId) {
    destroy();
    view = WebUI.page(containerId, 'Báo cáo tổng hợp', ParadiseApp.getBranchName());

    const toolbar = $('<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">').appendTo(view.actions);

    // 1. Period Button Group
    $('<div>').appendTo(toolbar).dxButtonGroup({
      items: Object.entries(periodNames).map(([id, text]) => ({ id, text })),
      keyExpr: 'id',
      selectionMode: 'single',
      selectedItemKeys: [period],
      onItemClick: e => {
        if (period !== e.itemData.id) {
          period = e.itemData.id;
          updateSubFilterOptions();
          load();
        }
      }
    });

    // 2. Year Selector
    $('<div>').appendTo(toolbar).dxSelectBox({
      dataSource: [2025, 2026, 2027],
      value: currentYear,
      width: 90,
      stylingMode: 'outlined',
      onValueChanged: e => {
        if (currentYear !== e.value) {
          currentYear = e.value;
          load();
        }
      }
    });

    // 3. Sub-period Selector (Month or Quarter)
    subFilterBox = $('<div>').appendTo(toolbar).dxSelectBox({
      width: 110,
      stylingMode: 'outlined',
      displayExpr: 'text',
      valueExpr: 'id',
      onValueChanged: e => {
        if (period === 'month' && e.value && currentMonth !== e.value) {
          currentMonth = e.value;
          load();
        } else if (period === 'quarter' && e.value && currentQuarter !== e.value) {
          currentQuarter = e.value;
          load();
        }
      }
    }).dxSelectBox('instance');

    updateSubFilterOptions();

    // 4. Export Button
    exportButton = WebUI.button(view.actions, 'Xuất báo cáo', 'xlsxfile', exportReport, true);
    exportButton.option('disabled', true);

    await load();
  }

  function updateSubFilterOptions() {
    if (!subFilterBox) return;
    if (period === 'month') {
      const months = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, text: `Tháng ${i + 1}` }));
      subFilterBox.option({ dataSource: months, value: currentMonth, visible: true });
    } else if (period === 'quarter') {
      const quarters = [1, 2, 3, 4].map(q => ({ id: q, text: `Quý ${q}` }));
      subFilterBox.option({ dataSource: quarters, value: currentQuarter, visible: true });
    } else {
      subFilterBox.option({ visible: false });
    }
  }

  async function load() {
    if (!view) return;
    const version = ++revision, target = view.body;
    data = null;
    if (exportButton) exportButton.option('disabled', true);
    WebUI.loading(target);

    try {
      const url = `/reports?period=${period}&year=${currentYear}&month=${currentMonth}&quarter=${currentQuarter}`;
      const response = await apiClient.request(url);
      if (version !== revision || !document.contains(target[0])) return;
      data = response.data;
      if (data) {
        data.revenue = fillCompleteTimeline(
          data.revenue,
          data.class_timeline,
          data.pt_timeline,
          period,
          currentYear,
          currentMonth,
          currentQuarter
        );
      }
      const metrics = data.metrics || {};
      target.empty();

      // TẦNG 1: 4 THẺ HERO METRIC CARDS TÀI CHÍNH TINH GỌN
      WebUI.metrics(target, [
        { 
          label: 'Doanh số bán gói', 
          value: WebUI.money(metrics.gross_package_revenue || (Number(metrics.cash_received || 0) + Number(metrics.voucher_discount || 0))), 
          caption: 'Tổng tiền gói chưa tính voucher', 
          icon: 'tags', 
          tone: 'blue' 
        },
        { 
          label: 'Tiền thực thu', 
          value: WebUI.money(metrics.cash_received || 0), 
          caption: 'Tổng thực thu các hợp đồng', 
          icon: 'wallet', 
          tone: 'green' 
        },
        { 
          label: 'Tổng chi phí', 
          value: WebUI.money(metrics.total_expense || (Number(metrics.community_class_cost || 0) + Number(metrics.pt_commission_cost || 0) + Number(metrics.voucher_discount || 0))), 
          caption: `Lớp CĐ: ${WebUI.money(metrics.community_class_cost || 0)} · Hoa hồng PT: ${WebUI.money(metrics.pt_commission_cost || 0)} · Giảm giá: ${WebUI.money(metrics.voucher_discount || 0)}`, 
          icon: 'money-bill-transfer', 
          tone: 'amber' 
        },
        { 
          label: 'Lợi nhuận thực tế', 
          value: WebUI.money(metrics.net_profit || 0), 
          caption: 'Doanh thu thực tế trừ chi phí', 
          icon: 'chart-line', 
          tone: (metrics.net_profit || 0) >= 0 ? 'green' : 'coral' 
        }
      ]);

      // Scope Banner
      $('<div class="report-scope" style="display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--text-muted);font-size:11px;margin:16px 0 20px;flex-wrap:wrap;">')
        .append(
          $(WebUI.badge(`Báo cáo tài chính & vận hành · ${ParadiseApp.getBranchName()}`, 'success')),
          $('<span>').text(`${WebUI.date(data.start_date)} - ${WebUI.date(data.end_date)}`)
        )
        .appendTo(target);

      // TẦNG 2: THANH TAB PHÂN TÍCH CHUYÊN SÂU (4 TABS)
      const tabContainer = $('<div class="report-tabs" style="margin-bottom:20px;">').appendTo(target);
      const tabs = [
        { id: 'profit', text: '📊 Lợi nhuận & Chi phí' },
        { id: 'revenue', text: '💰 Doanh thu & Dòng tiền' },
        { id: 'packages', text: '📦 Cơ cấu Gói & Dịch vụ' },
        { id: 'pt', text: '🏋️‍♂️ Hiệu suất Đào tạo PT' }
      ];

      const activeIndex = Math.max(0, tabs.findIndex(t => t.id === currentTab));
      $('<div>').appendTo(tabContainer).dxTabs({
        dataSource: tabs,
        selectedIndex: activeIndex,
        onItemClick: e => {
          currentTab = e.itemData.id;
          renderCurrentTab(contentArea);
        }
      });

      const contentArea = $('<div class="report-tab-content">').appendTo(target);
      renderCurrentTab(contentArea);

      if (exportButton) exportButton.option('disabled', false);

    } catch (err) {
      if (version === revision) WebUI.error(target, err, load);
    }
  }

  function renderCurrentTab(container) {
    container.empty();
    if (!data) return;

    if (currentTab === 'profit') {
      renderProfitTab(container);
    } else if (currentTab === 'revenue') {
      renderRevenueTab(container);
    } else if (currentTab === 'packages') {
      renderPackagesTab(container);
    } else if (currentTab === 'pt') {
      renderPtTab(container);
    }
  }

  // ==========================================
  // TAB 1: LỢI NHUẬN & QUẢN LÝ CHI PHÍ (THU - CHI)
  // ==========================================
  function renderProfitTab(container) {
    const revenueList = data.revenue || [];
    const comparisonList = data.comparison || [];
    const metrics = data.metrics || {};
    const ptCommList = data.pt_commission_list || [];
    const classList = data.community_class_list || [];

    // 1. Grid 2 biểu đồ
    const chartsRow = $('<div class="report-charts" style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px;margin-bottom:24px;">').appendTo(container);

    // Chart 1.1: So sánh Thu - Chi & Lợi nhuận 3 kỳ gần nhất (Hỗ trợ trực quan khi BỊ LỖ)
    let compChartMode = 'bar'; // 'bar' | 'combo'
    const compSection = WebUI.section(chartsRow, 'Đối chiếu Thu - Chi & Lợi nhuận 3 kỳ gần nhất', header => {
      if (comparisonList.length) {
        const toggleBox = $('<div>').css({ marginLeft: 'auto' }).appendTo(header);
        $('<div>').appendTo(toggleBox).dxButtonGroup({
          items: [
            { text: 'Cột phân kỳ', value: 'bar', hint: 'Biểu đồ cột (Lỗ cắm xuống màu đỏ)' },
            { text: 'Cột & Đường', value: 'combo', hint: 'Biểu đồ kết hợp cột thu-chi & đường lợi nhuận' }
          ],
          keyExpr: 'value',
          selectedItemKeys: [compChartMode],
          stylingMode: 'outlined',
          onItemClick: e => {
            compChartMode = e.itemData.value;
            renderCompChart();
          }
        });
      }
    });

    function renderCompChart() {
      compSection.body.empty();
      if (!comparisonList.length) {
        return WebUI.empty(compSection.body, 'Chưa có dữ liệu so sánh các kỳ', 'chart-column');
      }

      const chartSeries = compChartMode === 'combo' ? [
        { type: 'bar', valueField: 'cash_received', name: 'Thực thu', color: '#237b58', barPadding: 0.3 },
        { type: 'bar', valueField: 'total_expense', name: 'Chi phí', color: '#f59e0b', barPadding: 0.3 },
        {
          type: 'spline',
          valueField: 'net_profit',
          name: 'Lợi nhuận ròng',
          color: '#0d9488',
          width: 3,
          point: {
            visible: true,
            size: 9,
            color: '#0d9488',
            border: { color: '#ffffff', width: 2 }
          }
        }
      ] : [
        { type: 'bar', valueField: 'cash_received', name: 'Thực thu', color: '#237b58' },
        { type: 'bar', valueField: 'total_expense', name: 'Chi phí', color: '#f59e0b' },
        { type: 'bar', valueField: 'net_profit', name: 'Lợi nhuận ròng', color: '#0d9488' }
      ];

      $('<div>').appendTo(compSection.body).dxChart({
        dataSource: comparisonList,
        size: { height: 290 },
        commonSeriesSettings: {
          argumentField: 'period',
          barPadding: 0.25
        },
        series: chartSeries,
        customizePoint: function(p) {
          if (p.seriesName === 'Lợi nhuận ròng') {
            if (p.value < 0) {
              return {
                color: '#ef4444',
                hoverStyle: { color: '#dc2626' },
                point: { color: '#ef4444', border: { color: '#ffffff', width: 2 } }
              };
            }
          }
        },
        legend: {
          orientation: 'horizontal',
          horizontalAlignment: 'center',
          verticalAlignment: 'bottom',
          font: { family: 'Be Vietnam Pro', size: 11 },
          margin: { top: 12 },
          customizeItems: items => {
            const pItem = items.find(i => i.text === 'Lợi nhuận ròng');
            if (pItem) {
              pItem.text = compChartMode === 'combo' ? 'Lợi nhuận (Đường xu hướng)' : 'Lợi nhuận (Lãi xanh / Lỗ đỏ)';
            }
            return items;
          }
        },
        valueAxis: {
          label: {
            font: { family: 'Be Vietnam Pro', size: 11 },
            customizeText: p => {
              if (p.value === 0) return '0';
              const isNeg = p.value < 0;
              const abs = Math.abs(p.value);
              const formatted = new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(abs);
              return isNeg ? '-' + formatted : formatted;
            }
          },
          grid: { color: '#edf1ee' },
          constantLines: [{
            value: 0,
            color: '#64748b',
            dashStyle: 'solid',
            width: 1.5,
            label: {
              text: '0đ (Hòa vốn)',
              position: 'inside',
              horizontalAlignment: 'right',
              font: { family: 'Be Vietnam Pro', size: 10, color: '#64748b', weight: 600 }
            }
          }]
        },
        argumentAxis: {
          position: 'bottom',
          label: { font: { family: 'Be Vietnam Pro', size: 11, weight: 600 } },
          tick: { visible: false }
        },
        tooltip: {
          enabled: true,
          customizeTooltip: p => {
            const isProfit = p.seriesName === 'Lợi nhuận ròng';
            const isLoss = isProfit && p.value < 0;
            const title = isProfit ? (isLoss ? 'Lợi nhuận ròng (LỖ)' : 'Lợi nhuận ròng (LÃI)') : p.seriesName;
            const color = isLoss ? '#ef4444' : (isProfit ? '#0d9488' : (p.seriesName === 'Chi phí' ? '#f59e0b' : '#237b58'));
            return {
              html: `
                <div style="padding:4px 6px;font-size:12px;font-family:'Be Vietnam Pro',sans-serif;">
                  <strong style="color:#64748b;">Kỳ ${p.argumentText}</strong>
                  <div style="margin-top:4px;display:flex;align-items:center;gap:6px;">
                    <span style="width:8px;height:8px;border-radius:2px;background:${color};display:inline-block;"></span>
                    <span>${title}:</span>
                    <strong style="color:${color};font-family:'Manrope',sans-serif;">${WebUI.money(p.value)}</strong>
                  </div>
                </div>
              `
            };
          }
        }
      });
    }

    renderCompChart();

    // Chart 1.2: Doughnut Cơ cấu Chi phí phòng gym
    const costPieSection = WebUI.section(chartsRow, 'Cơ cấu các khoản Chi phí phòng gym');
    const costBreakdown = [
      { name: 'Thù lao lớp cộng đồng', value: Number(metrics.community_class_cost || 0), color: '#f59e0b' },
      { name: 'Chi hoa hồng PT', value: Number(metrics.pt_commission_cost || 0), color: '#3b82f6' },
      { name: 'Chi phí giảm giá voucher', value: Number(metrics.voucher_discount || 0), color: '#ec4899' }
    ].filter(c => c.value > 0);

    if (!costBreakdown.length) {
      WebUI.empty(costPieSection.body, 'Chưa phát sinh khoản chi phí nào trong kỳ', 'money-bill-transfer');
    } else {
      $('<div>').appendTo(costPieSection.body).dxPieChart({
        dataSource: costBreakdown,
        size: { height: 290 },
        type: 'doughnut',
        innerRadius: 0.65,
        series: [{
          argumentField: 'name',
          valueField: 'value',
          label: { visible: false }
        }],
        customizePoint: p => ({
          color: costBreakdown.find(c => c.name === p.argument)?.color || '#237b58'
        }),
        centerTemplate: (_, host) => {
          $(`<div style="text-align:center;pointer-events:none;transform:translateY(-2px);">
            <span style="font-size:10px;color:#748078;text-transform:uppercase;font-weight:600;display:block;">Tổng chi phí</span>
            <strong style="font-size:22px;font-family:'Manrope',sans-serif;color:#253e30;line-height:1.2;display:block;font-weight:700;">${new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(metrics.total_expense || 0)}</strong>
            <span style="font-size:11px;color:#d97706;font-weight:600;">VND</span>
          </div>`).appendTo(host);
        },
        legend: {
          orientation: 'horizontal',
          horizontalAlignment: 'center',
          verticalAlignment: 'bottom',
          itemTextPosition: 'right',
          margin: { top: 12 },
          font: { family: 'Be Vietnam Pro', size: 11 },
          customizeText: p => {
            const item = costBreakdown.find(d => d.name === p.pointName);
            const total = Number(metrics.total_expense || 1);
            const pct = item ? Math.round((item.value / total) * 1000) / 10 : 0;
            return item ? `${p.pointName} (${pct}%)` : p.pointName;
          }
        },
        tooltip: {
          enabled: true,
          customizeTooltip: p => ({
            text: `<strong>${p.argumentText}</strong><br/>Số tiền: <b>${WebUI.money(p.value)}</b> (${p.percentText})`
          })
        }
      });
    }

    // 2. TỔ CHỨC 3 TAB CHI TIẾT BẢNG DỮ LIỆU ĐỐI SOÁT & CHI PHÍ
    const tableSubTabsContainer = $('<div class="profit-subtabs-bar" style="margin-top:24px;margin-bottom:16px;">').appendTo(container);
    const tableContentArea = $('<div class="profit-subtab-content">').appendTo(container);

    const tableSubTabs = [
      { id: 'reconciliation', text: 'Bảng đối soát Thu – Chi và Lợi nhuận theo mốc thời gian' },
      { id: 'pt_commissions', text: `Chi tiết chi trả hoa hồng Huấn luyện viên (${ptCommList.length})` },
      { id: 'community_classes', text: `Chi tiết thù lao giáo viên lớp cộng đồng (${classList.length})` }
    ];

    const currentSubIdx = Math.max(0, tableSubTabs.findIndex(t => t.id === currentProfitTableTab));

    $('<div>').appendTo(tableSubTabsContainer).dxTabs({
      dataSource: tableSubTabs,
      selectedIndex: currentSubIdx,
      scrollByContent: true,
      showNavButtons: true,
      onSelectionChanged: e => {
        if (e.addedItems && e.addedItems[0] && currentProfitTableTab !== e.addedItems[0].id) {
          currentProfitTableTab = e.addedItems[0].id;
          renderSelectedProfitTable();
        }
      },
      onItemClick: e => {
        if (currentProfitTableTab !== e.itemData.id) {
          currentProfitTableTab = e.itemData.id;
          renderSelectedProfitTable();
        }
      }
    });

    function renderSelectedProfitTable() {
      tableContentArea.empty();
      if (currentProfitTableTab === 'reconciliation') {
        renderReconciliationTable(tableContentArea);
      } else if (currentProfitTableTab === 'pt_commissions') {
        renderPtCommTable(tableContentArea);
      } else if (currentProfitTableTab === 'community_classes') {
        renderClassCompTable(tableContentArea);
      }
    }

    // Bảng 1: Đối soát Thu - Chi & Lợi nhuận theo mốc thời gian
    function renderReconciliationTable(targetArea) {
      const tableSection = WebUI.section(targetArea, 'Bảng đối soát doanh thu, chi phí và lợi nhuận theo mốc thời gian');
      WebUI.grid(tableSection.body, revenueList.map(r => ({ ...r, id: r.period })), [
        {
          dataField: 'period',
          caption: period === 'month' ? 'Ngày' : 'Tháng',
          minWidth: 110,
          alignment: 'center',
          calculateCellValue: r => formatPeriodGrid(r.period, period)
        },
        {
          dataField: 'gross_package_revenue',
          caption: 'Doanh số bán gói',
          alignment: 'right',
          minWidth: 140,
          cellTemplate: (el, cell) => {
            $('<strong style="font-family:Manrope,sans-serif;color:#1e293b;font-size:13px;">')
              .text(WebUI.money(cell.value || 0))
              .appendTo(el);
          }
        },
        {
          dataField: 'cash_received',
          caption: 'Thực thu (VND)',
          alignment: 'right',
          minWidth: 140,
          cellTemplate: (el, cell) => {
            $('<strong style="font-family:Manrope,sans-serif;color:#237b58;font-size:13px;">')
              .text(WebUI.money(cell.value || 0))
              .appendTo(el);
          }
        },
        {
          dataField: 'voucher_discount',
          caption: 'Tiền giảm voucher',
          alignment: 'right',
          minWidth: 130,
          cellTemplate: (el, cell) => {
            const val = Number(cell.value || 0);
            $('<span>')
              .css({ color: val > 0 ? '#ec4899' : '#8b978f', fontWeight: val > 0 ? '600' : 'normal', fontSize: '13px' })
              .text(WebUI.money(val))
              .appendTo(el);
          }
        },
        {
          dataField: 'pt_commission_cost',
          caption: 'Chi hoa hồng PT',
          alignment: 'right',
          minWidth: 130,
          cellTemplate: (el, cell) => {
            const val = Number(cell.value || 0);
            $('<span>')
              .css({ color: val > 0 ? '#2563eb' : '#8b978f', fontWeight: val > 0 ? '600' : 'normal', fontSize: '13px' })
              .text(WebUI.money(val))
              .appendTo(el);
          }
        },
        {
          dataField: 'community_class_cost',
          caption: 'Thù lao lớp CĐ',
          alignment: 'right',
          minWidth: 130,
          cellTemplate: (el, cell) => {
            const val = Number(cell.value || 0);
            $('<span>')
              .css({ color: val > 0 ? '#d97706' : '#8b978f', fontWeight: val > 0 ? '600' : 'normal', fontSize: '13px' })
              .text(WebUI.money(val))
              .appendTo(el);
          }
        },
        {
          dataField: 'total_expense',
          caption: 'Tổng chi phí',
          alignment: 'right',
          minWidth: 140,
          cellTemplate: (el, cell) => {
            const val = Number(cell.value || 0);
            $('<strong style="font-family:Manrope,sans-serif;font-size:13px;">')
              .css({ color: val > 0 ? '#dc2626' : '#8b978f' })
              .text(WebUI.money(val))
              .appendTo(el);
          }
        },
        {
          dataField: 'net_profit',
          caption: 'Lợi nhuận thực tế',
          alignment: 'right',
          minWidth: 150,
          cellTemplate: (el, cell) => {
            const val = Number(cell.value || 0);
            const isPos = val >= 0;
            $(`<strong style="font-family:Manrope,sans-serif;color:${isPos ? (val > 0 ? '#185740' : '#8b978f') : '#dc2626'};font-size:13px;">`)
              .text((isPos && val > 0 ? '+' : '') + WebUI.money(val))
              .appendTo(el);
          }
        }
      ], {
        paging: { pageSize: 31 },
        pager: { visible: true, showInfo: true, showPageSizeSelector: true, allowedPageSizes: [15, 31, 50] },
        summary: {
          totalItems: [
            { column: 'gross_package_revenue', summaryType: 'sum', customizeText: p => WebUI.money(p.value) },
            { column: 'cash_received', summaryType: 'sum', customizeText: p => WebUI.money(p.value) },
            { column: 'voucher_discount', summaryType: 'sum', customizeText: p => WebUI.money(p.value) },
            { column: 'pt_commission_cost', summaryType: 'sum', customizeText: p => WebUI.money(p.value) },
            { column: 'community_class_cost', summaryType: 'sum', customizeText: p => WebUI.money(p.value) },
            { column: 'total_expense', summaryType: 'sum', customizeText: p => WebUI.money(p.value) },
            { column: 'net_profit', summaryType: 'sum', customizeText: p => WebUI.money(p.value) }
          ]
        }
      });
    }

    // Bảng 2: Chi tiết chi trả hoa hồng Huấn luyện viên
    function renderPtCommTable(targetArea) {
      const ptCommSection = WebUI.section(targetArea, 'Chi tiết chi trả hoa hồng Huấn luyện viên');
      if (!ptCommList.length) {
        WebUI.empty(ptCommSection.body, 'Không có bảng kê hoa hồng PT trong kỳ', 'money-bill-transfer');
      } else {
        WebUI.grid(ptCommSection.body, ptCommList.map((c, i) => ({ ...c, id: i })), [
          {
            caption: 'Huấn luyện viên', minWidth: 180,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<div>')
                .append($('<strong style="font-size:13px;color:#185740;">').text(r.pt_name), $('<small style="display:block;color:#748078;font-size:11px;font-family:Manrope,monospace;">').text(r.pt_code))
                .appendTo(el);
            }
          },
          {
            caption: 'Chi nhánh', minWidth: 150,
            calculateCellValue: r => r.branch_name || '--'
          },
          {
            dataField: 'total_pt_sessions_taught', caption: 'Số buổi', width: 100, alignment: 'center',
            cellTemplate: (el, cell) => {
              $('<span>').css({ color: '#26332e', fontSize: '13px', fontWeight: 600 }).text(`${cell.value || 0} b`).appendTo(el);
            }
          },
          {
            dataField: 'total_commission_amount', caption: 'Hoa hồng (VND)', alignment: 'right', minWidth: 150,
            cellTemplate: (el, cell) => {
              $('<strong style="font-family:Manrope,sans-serif;color:#2563eb;font-size:13px;">')
                .text(WebUI.money(cell.value || 0))
                .appendTo(el);
            }
          },
          {
            dataField: 'status', caption: 'Trạng thái', width: 140, alignment: 'center',
            cellTemplate: (el, cell) => {
              const st = cell.value;
              const badgeTone = st === 'PAID' ? 'success' : st === 'PENDING_CONFIRMATION' ? 'warning' : 'neutral';
              const badgeText = st === 'PAID' ? 'Đã chi trả' : st === 'PENDING_CONFIRMATION' ? 'Chờ xác nhận' : 'Chưa chi trả';
              $(WebUI.badge(badgeText, badgeTone)).appendTo(el);
            }
          }
        ], {
          summary: {
            totalItems: [
              { column: 'total_pt_sessions_taught', summaryType: 'sum', displayFormat: 'Tổng: {0} b' },
              { column: 'total_commission_amount', summaryType: 'sum', customizeText: p => WebUI.money(p.value) }
            ]
          }
        });
      }
    }

    // Bảng 3: Chi tiết thù lao giáo viên lớp cộng đồng
    function renderClassCompTable(targetArea) {
      const classCompSection = WebUI.section(targetArea, 'Chi tiết thù lao giáo viên lớp cộng đồng');
      if (!classList.length) {
        WebUI.empty(classCompSection.body, 'Không có lớp cộng đồng nào trong kỳ', 'calendar');
      } else {
        WebUI.grid(classCompSection.body, classList.map((c, i) => ({ ...c, id: i })), [
          {
            caption: 'Lớp học & Bộ môn', minWidth: 200,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              $('<div>')
                .append($('<strong style="font-size:13px;color:#185740;">').text(r.title), $('<small style="display:block;color:#748078;font-size:11px;">').text(r.discipline_name || 'Lớp cộng đồng'))
                .appendTo(el);
            }
          },
          {
            dataField: 'instructor_name', caption: 'Giáo viên', minWidth: 150,
            cellTemplate: (el, cell) => {
              $('<span>').css({ color: '#26332e', fontSize: '13px', fontWeight: 600 }).text(cell.value || '-').appendTo(el);
            }
          },
          {
            caption: 'Chi nhánh', minWidth: 150,
            calculateCellValue: r => r.branch_name || '--'
          },
          {
            dataField: 'class_date', caption: 'Ngày dạy', width: 110, alignment: 'center',
            cellTemplate: (el, cell) => {
              $('<span>').css({ color: '#26332e', fontSize: '13px' }).text(WebUI.date(cell.value)).appendTo(el);
            }
          },
          {
            dataField: 'total_compensation', caption: 'Tổng thù lao', alignment: 'right', minWidth: 150,
            cellTemplate: (el, cell) => {
              const r = cell.data;
              const wrap = $('<div style="text-align:right;">').appendTo(el);
              $('<strong style="font-family:Manrope,sans-serif;color:#d97706;font-size:13px;display:block;">')
                .text(WebUI.money(cell.value || 0))
                .appendTo(wrap);
              if (Number(r.bonus_amount) > 0) {
                $('<small style="color:#748078;font-size:11px;">')
                  .text(`(Gốc: ${WebUI.money(r.base_price)} + Thưởng: ${WebUI.money(r.bonus_amount)})`)
                  .appendTo(wrap);
              }
            }
          }
        ], {
          summary: {
            totalItems: [
              { column: 'total_compensation', summaryType: 'sum', customizeText: p => WebUI.money(p.value) }
            ]
          }
        });
      }
    }

    renderSelectedProfitTable();
  }

  // ==========================================
  // TAB 2: DOANH THU & DÒNG TIỀN
  // ==========================================
  function renderRevenueTab(container) {
    const revenueList = data.revenue || [];
    const comparisonList = data.comparison || [];

    // 1. Grid 2 biểu đồ
    const chartsRow = $('<div class="report-charts" style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px;margin-bottom:24px;">').appendTo(container);

    // Chart 2.1: Xu hướng thực thu (Spline Area)
    const trendSection = WebUI.section(chartsRow, period === 'month' ? 'Xu hướng thực thu theo ngày' : 'Xu hướng thực thu theo tháng');
    if (!revenueList.some(r => Number(r.cash_received) > 0)) {
      WebUI.empty(trendSection.body, 'Chưa có dữ liệu thực thu trong kỳ này', 'chart-line');
    } else {
      const chartData = revenueList.map(r => ({
        ...r,
        formatted_period: formatPeriodAxis(r.period, period)
      }));

      $('<div>').appendTo(trendSection.body).dxChart({
        dataSource: chartData,
        size: { height: 280 },
        palette: ['#237b58'],
        commonSeriesSettings: {
          argumentField: 'formatted_period',
          type: 'splinearea',
          color: '#237b58',
          border: { color: '#185740', width: 2, visible: true },
          point: { visible: true, size: period === 'month' ? 4 : 7, color: '#237b58', border: { color: '#ffffff', width: 1.5 } }
        },
        series: [{ valueField: 'cash_received', name: 'Thực thu' }],
        legend: { visible: false },
        valueAxis: {
          label: {
            font: { family: 'Be Vietnam Pro', size: 11 },
            customizeText: p => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(p.value)
          },
          grid: { color: '#edf1ee' }
        },
        argumentAxis: {
          label: {
            font: { family: 'Be Vietnam Pro', size: period === 'month' ? 9 : 11 },
            overlappingBehavior: 'rotate',
            rotationAngle: period === 'month' ? -45 : 0
          },
          tick: { visible: false }
        },
        tooltip: {
          enabled: true,
          customizeTooltip: point => ({
            text: `<strong>${formatPeriodGrid(point.point.data.period, period)}</strong><br/>Thực thu: <b>${WebUI.money(point.value)}</b><br/>Gói bán: ${point.point.data.packages_sold || 0} gói`
          })
        }
      });
    }

    // Chart 2.2: So sánh doanh thu 3 kỳ gần nhất (Bar Chart)
    const compSection = WebUI.section(chartsRow, 'So sánh doanh thu 3 kỳ gần nhất');
    const compCount = comparisonList.length || 0;
    if (!comparisonList.some(c => Number(c.cash_received) > 0)) {
      WebUI.empty(compSection.body, 'Chưa có doanh thu so sánh các kỳ', 'chart-column');
    } else {
      $('<div>').appendTo(compSection.body).dxChart({
        dataSource: comparisonList,
        size: { height: 280 },
        commonSeriesSettings: {
          type: 'bar',
          argumentField: 'period',
          valueField: 'cash_received',
          barPadding: 0.45
        },
        series: [{ name: 'Thực thu' }],
        legend: { visible: false },
        valueAxis: {
          label: {
            font: { family: 'Be Vietnam Pro', size: 11 },
            customizeText: p => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(p.value)
          },
          grid: { color: '#edf1ee' }
        },
        argumentAxis: {
          label: { font: { family: 'Be Vietnam Pro', size: 11 } },
          tick: { visible: false }
        },
        tooltip: {
          enabled: true,
          customizeTooltip: p => ({ text: `Kỳ ${p.argumentText}: <b>${WebUI.money(p.value)}</b>` })
        },
        customizePoint: p => ({
          color: p.index === compCount - 1 ? '#237b58' : '#bad9c6'
        })
      });
    }

    // 2. DataGrid tổng hợp dòng tiền
    const tableSection = WebUI.section(container, 'Bảng tổng hợp dòng tiền theo mốc thời gian');
    WebUI.grid(tableSection.body, revenueList.map(r => ({ ...r, id: r.period })), [
      {
        dataField: 'period',
        caption: period === 'month' ? 'Ngày' : 'Tháng',
        minWidth: 140,
        alignment: 'center',
        calculateCellValue: r => formatPeriodGrid(r.period, period)
      },
      {
        dataField: 'packages_sold',
        caption: 'Tổng số gói bán',
        dataType: 'number',
        width: 150,
        alignment: 'center',
        cellTemplate: (el, cell) => {
          $('<span>')
            .css({ color: '#26332e', fontSize: '13px' })
            .text(`${cell.value || 0} gói`)
            .appendTo(el);
        }
      },
      {
        dataField: 'service_breakdown',
        caption: 'Phân rã theo dịch vụ',
        minWidth: 260,
        cellTemplate: (el, cell) => {
          const counts = cell.data.service_counts || {};
          const parts = [];
          if (counts.gym > 0) parts.push(`Gym: ${counts.gym}`);
          if (counts.pt > 0) parts.push(`PT: ${counts.pt}`);
          if (counts.combo > 0) parts.push(`Combo: ${counts.combo}`);
          if (parts.length > 0) {
            $('<span>')
              .css({ color: '#26332e', fontSize: '13px' })
              .text(parts.join(', '))
              .appendTo(el);
          } else {
            $('<span style="color:#8b978f;font-size:13px;">').text('--').appendTo(el);
          }
        }
      },
      {
        dataField: 'cash_received',
        caption: 'Thực thu (100%)',
        alignment: 'right',
        minWidth: 170,
        cellTemplate: (el, cell) => {
          $('<strong style="font-family:Manrope,sans-serif;color:#237b58;font-size:13px;">')
            .text(WebUI.money(cell.value))
            .appendTo(el);
        }
      }
    ], {
      summary: {
        totalItems: [
          { column: 'packages_sold', summaryType: 'sum', displayFormat: 'Tổng: {0} gói' },
          { column: 'cash_received', summaryType: 'sum', customizeText: p => WebUI.money(p.value) }
        ]
      }
    });
  }

  // ==========================================
  // TAB 3: CƠ CẤU GÓI & DỊCH VỤ
  // ==========================================
  function renderPackagesTab(container) {
    const distList = data.distribution || [];
    const revenueList = data.revenue || [];

    // 1. Grid 2 biểu đồ
    const chartsRow = $('<div class="report-charts" style="display:grid;grid-template-columns:1.2fr 1.3fr;gap:20px;margin-bottom:24px;">').appendTo(container);

    // Chart 3.1: Doughnut Chart Cơ cấu gói tập bán chạy
    const pieSection = WebUI.section(chartsRow, 'Tỷ trọng gói tập bán chạy');
    if (!distList.length) {
      WebUI.empty(pieSection.body, 'Chưa có gói tập nào bán ra trong kỳ', 'boxes-stacked');
    } else {
      $('<div>').appendTo(pieSection.body).dxPieChart({
        dataSource: distList,
        size: { height: 300 },
        type: 'doughnut',
        innerRadius: 0.65,
        palette: ['#237b58', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#6366f1'],
        series: [{
          argumentField: 'package_name',
          valueField: 'count',
          label: { visible: false }
        }],
        centerTemplate: (_, host) => {
          $(`<div style="text-align:center;pointer-events:none;transform:translateY(-2px);">
            <span style="font-size:10px;color:#748078;text-transform:uppercase;font-weight:600;display:block;">Tổng cộng</span>
            <strong style="font-size:26px;font-family:'Manrope',sans-serif;color:#253e30;line-height:1.2;display:block;font-weight:700;">${data.metrics?.packages_sold || 0}</strong>
            <span style="font-size:11px;color:#237b58;font-weight:600;">Gói đã bán</span>
          </div>`).appendTo(host);
        },
        legend: {
          orientation: 'horizontal',
          horizontalAlignment: 'center',
          verticalAlignment: 'bottom',
          itemTextPosition: 'right',
          margin: { top: 12 },
          font: { family: 'Be Vietnam Pro', size: 11 },
          customizeText: p => {
            const item = distList.find(d => d.package_name === p.pointName);
            return item ? `${p.pointName} (${item.percentage}%)` : p.pointName;
          }
        },
        tooltip: {
          enabled: true,
          customizeTooltip: p => ({
            text: `<strong>${p.argumentText}</strong><br/>Số lượng: <b>${p.value} gói</b> (${p.percentText})`
          })
        }
      });
    }

    // Chart 3.2: Stacked Bar Chart Phân rã sản lượng theo nhóm dịch vụ
    const stackSection = WebUI.section(chartsRow, 'Phân rã sản lượng theo nhóm dịch vụ');
    if (!revenueList.some(r => Number(r.packages_sold) > 0)) {
      WebUI.empty(stackSection.body, 'Chưa có dữ liệu sản lượng trong kỳ', 'chart-column');
    } else {
      const stackData = revenueList.map(r => ({
        ...r,
        formatted_period: formatPeriodAxis(r.period, period)
      }));

      $('<div>').appendTo(stackSection.body).dxChart({
        dataSource: stackData,
        size: { height: 300 },
        commonSeriesSettings: {
          argumentField: 'formatted_period',
          type: 'stackedBar',
          barPadding: period === 'month' ? 0.15 : 0.35
        },
        series: [
          { valueField: 'gym', name: 'Gói Gym', color: '#237b58' },
          { valueField: 'pt', name: 'Gói PT', color: '#3b82f6' },
          { valueField: 'combo', name: 'Combo VIP', color: '#f59e0b' }
        ],
        legend: {
          orientation: 'horizontal',
          horizontalAlignment: 'center',
          verticalAlignment: 'bottom',
          font: { family: 'Be Vietnam Pro', size: 11 },
          margin: { top: 12 }
        },
        valueAxis: {
          label: { font: { family: 'Be Vietnam Pro', size: 11 } },
          grid: { color: '#edf1ee' }
        },
        argumentAxis: {
          label: {
            font: { family: 'Be Vietnam Pro', size: period === 'month' ? 9 : 11 },
            overlappingBehavior: 'rotate',
            rotationAngle: period === 'month' ? -45 : 0
          },
          tick: { visible: false }
        },
        tooltip: {
          enabled: true,
          customizeTooltip: p => ({
            text: `<strong>${formatPeriodGrid(p.point.data.period, period)}</strong><br/>${p.seriesName}: <b>${p.value} gói</b>`
          })
        }
      });
    }

    // 2. DataGrid thống kê chi tiết từng gói
    const tableSection = WebUI.section(container, 'Bảng thống kê chi tiết từng gói tập');
    WebUI.grid(tableSection.body, distList.map((d, idx) => ({ ...d, id: idx })), [
      { dataField: 'package_name', caption: 'Tên gói tập', minWidth: 220 },
      {
        dataField: 'package_type', caption: 'Phân loại', width: 130, alignment: 'center',
        cellTemplate: (el, cell) => {
          const type = String(cell.value || '').toUpperCase();
          const label = type.includes('COMBO') ? 'Combo VIP' : type.includes('PT') ? 'Gói PT' : 'Gói Gym';
          $('<span>')
            .css({ color: '#26332e', fontSize: '13px' })
            .text(label)
            .appendTo(el);
        }
      },
      {
        dataField: 'count', caption: 'Số lượng bán', width: 130, alignment: 'center',
        cellTemplate: (el, cell) => {
          $('<span>')
            .css({ color: '#26332e', fontSize: '13px' })
            .text(`${cell.value || 0} gói`)
            .appendTo(el);
        }
      },
      {
        dataField: 'percentage', caption: 'Tỷ trọng (%)', width: 180,
        cellTemplate: (el, cell) => {
          const pct = Math.max(0, Math.min(100, Number(cell.value || 0)));
          const wrap = $('<div style="display:flex;align-items:center;gap:8px;">').appendTo(el);
          $('<div style="flex:1;background:#edf1ee;border-radius:3px;height:7px;overflow:hidden;">')
            .append($('<div style="height:100%;border-radius:3px;background:#237b58;">').css('width', `${pct}%`))
            .appendTo(wrap);
          $('<span style="font-size:11px;font-weight:600;min-width:42px;text-align:right;">').text(`${pct}%`).appendTo(wrap);
        }
      },
      {
        dataField: 'revenue', caption: 'Doanh thu thu về', alignment: 'right', minWidth: 160,
        cellTemplate: (el, cell) => {
          $('<strong style="font-family:Manrope,sans-serif;color:#237b58;font-size:13px;">')
            .text(WebUI.money(cell.value || 0))
            .appendTo(el);
        }
      }
    ], {
      summary: {
        totalItems: [
          { column: 'count', summaryType: 'sum', displayFormat: 'Tổng: {0} gói' },
          { column: 'revenue', summaryType: 'sum', customizeText: p => WebUI.money(p.value) }
        ]
      }
    });
  }

  // ==========================================
  // TAB 4: HIỆU SUẤT ĐÀO TẠO PT
  // ==========================================
  function renderPtTab(container) {
    const ptList = data.pt_performance || [];

    // 1. Grid 2 cột (Chart xếp hạng & Bảng chi tiết)
    const row = $('<div class="report-charts" style="display:grid;grid-template-columns:1.2fr 1.3fr;gap:20px;margin-bottom:24px;">').appendTo(container);

    // Chart 4.1: Xếp hạng số buổi dạy HLV
    const chartSection = WebUI.section(row, 'Bảng xếp hạng số buổi dạy của Huấn luyện viên');
    if (!ptList.some(p => Number(p.completed_sessions) > 0)) {
      WebUI.empty(chartSection.body, 'Chưa có buổi dạy PT nào được ghi nhận hoàn thành trong kỳ', 'dumbbell');
    } else {
      $('<div>').appendTo(chartSection.body).dxChart({
        dataSource: ptList,
        size: { height: 300 },
        palette: ['#237b58'],
        commonSeriesSettings: {
          argumentField: 'pt_name',
          type: 'bar',
          valueField: 'completed_sessions',
          barPadding: 0.4
        },
        series: [{ name: 'Số buổi dạy hoàn thành' }],
        legend: { visible: false },
        valueAxis: {
          label: {
            font: { family: 'Be Vietnam Pro', size: 11 },
            customizeText: p => `${p.value} buổi`
          },
          grid: { color: '#edf1ee' }
        },
        argumentAxis: {
          label: { font: { family: 'Be Vietnam Pro', size: 11 } },
          tick: { visible: false }
        },
        tooltip: {
          enabled: true,
          customizeTooltip: p => ({
            text: `<strong>${p.argumentText}</strong><br/>Đã hoàn thành: <b>${p.value} buổi PT</b><br/>Học viên phục vụ: ${p.point.data.unique_students || 0} người`
          })
        }
      });
    }

    // Chart 4.2 / Summary Cards: Chỉ số đào tạo
    const summarySection = WebUI.section(row, 'Tổng quan chỉ số đào tạo PT');
    const activePts = ptList.filter(p => Number(p.completed_sessions) > 0).length;
    const totalStudents = ptList.reduce((acc, p) => acc + Number(p.unique_students || 0), 0);
    const avgSessions = activePts > 0 ? (Number(data.metrics?.completed_pt || 0) / activePts).toFixed(1) : 0;

    const cardsGrid = $('<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:8px 0;">').appendTo(summarySection.body);

    const miniCard = (title, val, sub, tone) => {
      const c = $('<div style="background:#fff;border:1px solid #e1e8e3;border-radius:6px;padding:16px;">').appendTo(cardsGrid);
      $('<div style="font-size:11px;color:#748078;font-weight:500;margin-bottom:6px;">').text(title).appendTo(c);
      $('<div style="font-size:24px;font-weight:700;font-family:Manrope,sans-serif;color:#253e30;margin-bottom:4px;">').text(val).appendTo(c);
      $('<div style="font-size:10px;color:#8b978f;">').text(sub).appendTo(c);
    };

    miniCard('Tổng buổi PT hoàn thành', `${data.metrics?.completed_pt || 0} buổi`, 'Đã xác nhận kép', 'green');
    miniCard('HLV tham gia giảng dạy', `${activePts} / ${ptList.length} HLV`, 'Có phát sinh ca dạy', 'blue');
    miniCard('Học viên được phục vụ', `${totalStudents} hội viên`, 'Trong kỳ báo cáo', 'amber');
    miniCard('Năng suất trung bình', `${avgSessions} buổi/HLV`, 'Hiệu suất bình quân', 'coral');

    // 2. DataGrid chi tiết HLV
    const tableSection = WebUI.section(container, 'Chi tiết kết quả đào tạo theo Huấn luyện viên');
    WebUI.grid(tableSection.body, ptList, [
      {
        caption: 'Huấn luyện viên', minWidth: 220,
        cellTemplate: (el, cell) => {
          const row = cell.data;
          const initials = (row.pt_name || '?').split(' ').slice(-2).map(x => x[0]).join('');
          const avatarHtml = row.avatar_url && /^https?:\/\//.test(row.avatar_url)
            ? `<img src="${row.avatar_url}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;">`
            : `<div style="width:34px;height:34px;border-radius:50%;background:#eaf4ee;color:#237b58;font-weight:700;display:grid;place-items:center;font-size:12px;">${initials}</div>`;

          $('<div style="display:flex;align-items:center;gap:10px;">')
            .append($(avatarHtml))
            .append($('<div>').append($('<strong>').text(row.pt_name), $('<small style="display:block;color:#748078;font-size:10px;">').text(row.pt_code + (row.phone ? ' · ' + row.phone : ''))))
            .appendTo(el);
        }
      },
      {
        dataField: 'completed_sessions', caption: 'Số buổi dạy hoàn thành', width: 190, alignment: 'center',
        cellTemplate: (el, cell) => {
          $('<span>')
            .css({ color: '#26332e', fontSize: '13px' })
            .text(`${cell.value || 0} buổi`)
            .appendTo(el);
        }
      },
      {
        dataField: 'unique_students', caption: 'Học viên phục vụ', width: 170, alignment: 'center',
        cellTemplate: (el, cell) => {
          $('<span>')
            .css({ color: '#26332e', fontSize: '13px' })
            .text(`${cell.value || 0} người`)
            .appendTo(el);
        }
      },
      {
        caption: 'Tỷ trọng đóng góp', width: 180, alignment: 'center',
        calculateCellValue: r => {
          const total = Number(data.metrics?.completed_pt || 0);
          return total > 0 ? Math.round((Number(r.completed_sessions || 0) / total) * 1000) / 10 : 0;
        },
        cellTemplate: (el, cell) => {
          const pct = cell.value;
          const wrap = $('<div style="display:flex;align-items:center;gap:8px;">').appendTo(el);
          $('<div style="flex:1;background:#edf1ee;border-radius:3px;height:7px;overflow:hidden;">')
            .append($('<div style="height:100%;border-radius:3px;background:#237b58;">').css('width', `${Math.min(100, pct)}%`))
            .appendTo(wrap);
          $('<span style="font-size:11px;font-weight:600;min-width:40px;text-align:right;">').text(`${pct}%`).appendTo(wrap);
        }
      },
      {
        caption: 'Trạng thái', width: 130, alignment: 'center',
        cellTemplate: el => {
          $('<span>')
            .css({ color: '#26332e', fontSize: '13px' })
            .text('Đang công tác')
            .appendTo(el);
        }
      }
    ], {
      summary: {
        totalItems: [
          { column: 'completed_sessions', summaryType: 'sum', displayFormat: 'Tổng: {0} buổi' },
          { column: 'unique_students', summaryType: 'sum', displayFormat: 'Tổng: {0} lượt' }
        ]
      }
    });
  }

  // ==========================================
  // XUẤT BÁO CÁO EXCELJS 5 SHEETS ĐA CHIỀU
  // ==========================================
  async function exportReport() {
    if (!data) return;
    exportButton.option('disabled', true);
    try {
      if (!window.ExcelJS) throw new Error('Không thể tải công cụ xuất Excel. Vui lòng kiểm tra kết nối và tải lại trang.');
      const snapshot = data, selectedPeriod = period, branchName = ParadiseApp.getBranchName(), workbook = new ExcelJS.Workbook();
      workbook.creator = 'Paradise Gym';

      // Sheet 1: Tổng hợp & Lợi nhuận
      const summary = workbook.addWorksheet('Tong hop & Loi nhuan');
      summary.addRows([
        ['PARADISE GYM', 'BÁO CÁO TÀI CHÍNH & VẬN HÀNH (BI REPORT)'],
        ['Kỳ báo cáo', periodNames[selectedPeriod]],
        ['Thời gian chi tiết', selectedPeriod === 'month' ? `Tháng ${currentMonth}/${currentYear}` : selectedPeriod === 'quarter' ? `Quý ${currentQuarter}/${currentYear}` : `Năm ${currentYear}`],
        ['Chi nhánh', branchName],
        ['Từ ngày', WebUI.date(snapshot.start_date)],
        ['Đến ngày', WebUI.date(snapshot.end_date)],
        [''],
        ['CHỈ SỐ TÀI CHÍNH', 'GIÁ TRỊ (VND)'],
        ['1. Doanh số bán gói (trước giảm giá)', Number(snapshot.metrics.gross_package_revenue || (Number(snapshot.metrics.cash_received || 0) + Number(snapshot.metrics.voucher_discount || 0)))],
        ['2. Tiền thực thu (Doanh thu)', Number(snapshot.metrics.cash_received || 0)],
        ['3. Tiền giảm giá voucher', Number(snapshot.metrics.voucher_discount || 0)],
        ['4. Chi hoa hồng Huấn luyện viên', Number(snapshot.metrics.pt_commission_cost || 0)],
        ['5. Chi thù lao giáo viên lớp cộng đồng', Number(snapshot.metrics.community_class_cost || 0)],
        ['6. Tổng chi phí (Giảm giá + Hoa hồng PT + Thù lao CĐ)', Number(snapshot.metrics.total_expense || 0)],
        ['7. Lợi nhuận thực tế (Lãi/Lỗ)', Number(snapshot.metrics.net_profit || 0)],
        ['8. Tỷ suất lợi nhuận ròng (%)', `${snapshot.metrics.profit_margin || 0}%`],
        [''],
        ['CHỈ SỐ SẢN LƯỢNG & ĐÀO TẠO', 'SỐ LƯỢNG'],
        ['Tổng giá trị niêm yết gói bán', Number(snapshot.metrics.package_value || 0)],
        ['Số lượng hợp đồng/gói đã bán', Number(snapshot.metrics.packages_sold || 0)],
        ['Số buổi tập PT hoàn thành', Number(snapshot.metrics.completed_pt || 0)],
        ['Số buổi lớp cộng đồng tổ chức', Number(snapshot.metrics.community_class_count || 0)]
      ]);
      summary.getColumn(2).numFmt = '#,##0';

      // Sheet 2: Doanh thu & Dòng tiền
      const revenue = workbook.addWorksheet('Doanh thu & Dong tien');
      revenue.addRow([selectedPeriod === 'month' ? 'Ngày' : 'Tháng', 'Doanh số bán gói (VND)', 'Thực thu (VND)', 'Tiền giảm voucher (VND)', 'Chi hoa hồng PT (VND)', 'Thù lao lớp CĐ (VND)', 'Tổng chi phí (VND)', 'Lợi nhuận thực tế (VND)']);
      (snapshot.revenue || []).forEach(row => {
        revenue.addRow([
          row.period,
          Number(row.gross_package_revenue || 0),
          Number(row.cash_received || 0),
          Number(row.voucher_discount || 0),
          Number(row.pt_commission_cost || 0),
          Number(row.community_class_cost || 0),
          Number(row.total_expense || 0),
          Number(row.net_profit || 0)
        ]);
      });
      revenue.addRow([
        'Tổng cộng',
        Number(snapshot.metrics.gross_package_revenue || (Number(snapshot.metrics.cash_received || 0) + Number(snapshot.metrics.voucher_discount || 0))),
        Number(snapshot.metrics.cash_received || 0),
        Number(snapshot.metrics.voucher_discount || 0),
        Number(snapshot.metrics.pt_commission_cost || 0),
        Number(snapshot.metrics.community_class_cost || 0),
        Number(snapshot.metrics.total_expense || 0),
        Number(snapshot.metrics.net_profit || 0)
      ]);
      for (let col = 2; col <= 8; col++) {
        revenue.getColumn(col).numFmt = '#,##0';
      }

      // Sheet 3: Quản lý Chi phí (PT & Lớp CĐ)
      const expenseSheet = workbook.addWorksheet('Quan ly Chi phi');
      expenseSheet.addRow(['BẢNG KÊ CHI PHÍ HOA HỒNG HUẤN LUYỆN VIÊN (PT)']);
      expenseSheet.addRow(['Mã HLV', 'Họ tên HLV', 'Chi nhánh', 'Kỳ tháng/năm', 'Số buổi dạy', 'Doanh thu PT mang lại', 'Hoa hồng thực nhận (VND)', 'Trạng thái']);
      (snapshot.pt_commission_list || []).forEach(c => {
        expenseSheet.addRow([
          c.pt_code, c.pt_name, c.branch_name, `${c.month}/${c.year}`,
          Number(c.total_pt_sessions_taught || 0), Number(c.pt_revenue_share || 0),
          Number(c.total_commission_amount || 0), c.status === 'PAID' ? 'Đã chi trả' : c.status === 'PENDING_CONFIRMATION' ? 'Chờ xác nhận' : 'Chưa chi trả'
        ]);
      });
      expenseSheet.addRow(['Tổng chi hoa hồng PT', '', '', '', '', '', Number(snapshot.metrics.pt_commission_cost || 0), '']);
      expenseSheet.addRow(['']);
      expenseSheet.addRow(['BẢNG KÊ CHI THÙ LAO GIÁO VIÊN LỚP CỘNG ĐỒNG']);
      expenseSheet.addRow(['Tên lớp học', 'Bộ môn', 'Giáo viên', 'Chi nhánh', 'Ngày dạy', 'Thù lao cơ bản (VND)', 'Thưởng thêm (VND)', 'Tổng thù lao (VND)']);
      (snapshot.community_class_list || []).forEach(cl => {
        expenseSheet.addRow([
          cl.title, cl.discipline_name || 'Cộng đồng', cl.instructor_name, cl.branch_name,
          WebUI.date(cl.class_date), Number(cl.base_price || 0), Number(cl.bonus_amount || 0),
          Number(cl.total_compensation || 0)
        ]);
      });
      expenseSheet.addRow(['Tổng chi thù lao lớp CĐ', '', '', '', '', '', '', Number(snapshot.metrics.community_class_cost || 0)]);

      // Sheet 4: Cơ cấu gói tập
      const mix = workbook.addWorksheet('Co cau goi tap');
      mix.addRow(['Gói tập', 'Phân loại', 'Số lượng bán', 'Tỷ trọng (%)', 'Doanh thu (VND)']);
      (snapshot.distribution || []).forEach(row => {
        mix.addRow([row.package_name, row.package_type || 'GYM', Number(row.count || 0), Number(row.percentage || 0), Number(row.revenue || 0)]);
      });
      mix.getColumn(5).numFmt = '#,##0';

      // Sheet 5: Hiệu suất Đào tạo PT
      const ptSheet = workbook.addWorksheet('Hieu suat PT');
      ptSheet.addRow(['Mã HLV', 'Họ tên HLV', 'Số điện thoại', 'Số buổi dạy hoàn thành', 'Học viên phục vụ']);
      (snapshot.pt_performance || []).forEach(pt => {
        ptSheet.addRow([pt.pt_code, pt.pt_name, pt.phone || '', Number(pt.completed_sessions || 0), Number(pt.unique_students || 0)]);
      });

      // Format headers
      workbook.eachSheet(sheet => {
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF185740' } };
        sheet.columns.forEach(column => { column.width = 26; });
      });

      const file = new Blob([await workbook.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `BaoCao_BI_LoiNhuan_${periodNames[selectedPeriod]}_${branchName.replace(/[^\p{L}\p{N}]+/gu, '_')}_${WebUI.dateKey(new Date()).replaceAll('-', '')}.xlsx`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (err) {
      DevExpress.ui.notify(err.message, 'error', 5000);
    } finally {
      if (exportButton) exportButton.option('disabled', !data);
    }
  }

  function destroy() {
    revision++;
    view = null;
    data = null;
    exportButton = null;
    subFilterBox = null;
  }

  return { render, refresh: load, destroy };
})();
