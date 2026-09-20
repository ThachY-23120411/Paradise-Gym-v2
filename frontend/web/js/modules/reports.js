window.ReportsModule = (function () {
  'use strict';
  let period = 'month', currentTab = 'revenue', revision = 0, data = null;
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

  function fillCompleteTimeline(rawRevenue, p, year, month, quarter) {
    const map = new Map();
    (rawRevenue || []).forEach(item => {
      if (item && item.period) map.set(item.period, item);
    });

    const result = [];
    if (p === 'month') {
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const periodKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const existing = map.get(periodKey);
        if (existing) {
          result.push(existing);
        } else {
          result.push({
            period: periodKey,
            packages_sold: 0,
            cash_received: 0,
            gym: 0,
            pt: 0,
            combo: 0,
            service_breakdown: 'Gym: 0 | PT: 0 | Combo: 0',
            service_counts: { gym: 0, pt: 0, combo: 0 }
          });
        }
      }
    } else if (p === 'quarter') {
      const firstM = (quarter - 1) * 3 + 1;
      for (let m = firstM; m < firstM + 3; m++) {
        const periodKey = `${year}-${String(m).padStart(2, '0')}`;
        const existing = map.get(periodKey);
        if (existing) {
          result.push(existing);
        } else {
          result.push({
            period: periodKey,
            packages_sold: 0,
            cash_received: 0,
            gym: 0,
            pt: 0,
            combo: 0,
            service_breakdown: 'Gym: 0 | PT: 0 | Combo: 0',
            service_counts: { gym: 0, pt: 0, combo: 0 }
          });
        }
      }
    } else if (p === 'year') {
      for (let m = 1; m <= 12; m++) {
        const periodKey = `${year}-${String(m).padStart(2, '0')}`;
        const existing = map.get(periodKey);
        if (existing) {
          result.push(existing);
        } else {
          result.push({
            period: periodKey,
            packages_sold: 0,
            cash_received: 0,
            gym: 0,
            pt: 0,
            combo: 0,
            service_breakdown: 'Gym: 0 | PT: 0 | Combo: 0',
            service_counts: { gym: 0, pt: 0, combo: 0 }
          });
        }
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
        data.revenue = fillCompleteTimeline(data.revenue, period, currentYear, currentMonth, currentQuarter);
      }
      const metrics = data.metrics || {};
      target.empty();

      // TẦNG 1: 4 THẺ HERO METRIC CARDS
      WebUI.metrics(target, [
        { label: 'Tiền thực thu', value: WebUI.money(metrics.cash_received || 0), caption: 'Tính đến ' + WebUI.date(data.end_date || new Date()), icon: 'wallet', tone: 'green' },
        { label: 'Giá trị gói đã bán', value: WebUI.money(metrics.package_value || 0), caption: 'Tổng giá trị niêm yết', icon: 'boxes-stacked', tone: 'blue' },
        { label: 'Gói đã bán', value: metrics.packages_sold || 0, caption: `${periodNames[period]} ${period === 'month' ? currentMonth + '/' + currentYear : period === 'quarter' ? 'Q' + currentQuarter + '/' + currentYear : currentYear}`, icon: 'file-circle-check', tone: 'amber' },
        { label: 'Buổi PT đã dạy', value: metrics.completed_pt || 0, caption: 'Đã ghi kết quả', icon: 'dumbbell', tone: 'coral' }
      ]);

      // Scope Banner
      $('<div class="report-scope" style="display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--text-muted);font-size:11px;margin:16px 0 20px;flex-wrap:wrap;">')
        .append(
          $(WebUI.badge(`Tiền thực thu · ${ParadiseApp.getBranchName()}`, 'success')),
          $('<span>').text(`${WebUI.date(data.start_date)} - ${WebUI.date(data.end_date)}`)
        )
        .appendTo(target);

      // TẦNG 2: THANH TAB PHÂN TÍCH CHUYÊN SÂU
      const tabContainer = $('<div class="report-tabs" style="margin-bottom:20px;">').appendTo(target);
      const tabs = [
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

    if (currentTab === 'revenue') {
      renderRevenueTab(container);
    } else if (currentTab === 'packages') {
      renderPackagesTab(container);
    } else if (currentTab === 'pt') {
      renderPtTab(container);
    }
  }

  // ==========================================
  // TAB 1: DOANH THU & DÒNG TIỀN
  // ==========================================
  function renderRevenueTab(container) {
    const revenueList = data.revenue || [];
    const comparisonList = data.comparison || [];

    // 1. Grid 2 biểu đồ
    const chartsRow = $('<div class="report-charts" style="display:grid;grid-template-columns:1.4fr 1fr;gap:20px;margin-bottom:24px;">').appendTo(container);

    // Chart 1.1: Xu hướng thực thu (Spline Area)
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

    // Chart 1.2: So sánh 3 kỳ gần nhất (Bar Chart)
    const compSection = WebUI.section(chartsRow, 'So sánh 3 kỳ gần nhất');
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
  // TAB 2: CƠ CẤU GÓI & DỊCH VỤ
  // ==========================================
  function renderPackagesTab(container) {
    const distList = data.distribution || [];
    const revenueList = data.revenue || [];

    // 1. Grid 2 biểu đồ
    const chartsRow = $('<div class="report-charts" style="display:grid;grid-template-columns:1.2fr 1.3fr;gap:20px;margin-bottom:24px;">').appendTo(container);

    // Chart 2.1: Doughnut Chart Cơ cấu gói tập bán chạy
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

    // Chart 2.2: Stacked Bar Chart Phân rã dịch vụ theo thời gian
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
  // TAB 3: HIỆU SUẤT ĐÀO TẠO PT
  // ==========================================
  function renderPtTab(container) {
    const ptList = data.pt_performance || [];

    // 1. Grid 2 cột (Chart xếp hạng & Bảng chi tiết)
    const row = $('<div class="report-charts" style="display:grid;grid-template-columns:1.2fr 1.3fr;gap:20px;margin-bottom:24px;">').appendTo(container);

    // Chart 3.1: Xếp hạng số buổi dạy HLV
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

    // Chart 3.2 / Summary Cards: Chỉ số đào tạo
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
  // XUẤT BÁO CÁO EXCELJS ĐA SHEET
  // ==========================================
  async function exportReport() {
    if (!data) return;
    exportButton.option('disabled', true);
    try {
      if (!window.ExcelJS) throw new Error('Không thể tải công cụ xuất Excel. Vui lòng kiểm tra kết nối và tải lại trang.');
      const snapshot = data, selectedPeriod = period, branchName = ParadiseApp.getBranchName(), workbook = new ExcelJS.Workbook();
      workbook.creator = 'Paradise Gym';

      // Sheet 1: Tổng hợp
      const summary = workbook.addWorksheet('Tong hop');
      summary.addRows([
        ['PARADISE GYM', 'BÁO CÁO TỔNG HỢP QUẢN TRỊ (BI REPORT)'],
        ['Kỳ báo cáo', periodNames[selectedPeriod]],
        ['Thời gian chi tiết', selectedPeriod === 'month' ? `Tháng ${currentMonth}/${currentYear}` : selectedPeriod === 'quarter' ? `Quý ${currentQuarter}/${currentYear}` : `Năm ${currentYear}`],
        ['Chi nhánh', branchName],
        ['Từ ngày', WebUI.date(snapshot.start_date)],
        ['Đến ngày', WebUI.date(snapshot.end_date)],
        ['Tiền thực thu (VND)', Number(snapshot.metrics.cash_received || 0)],
        ['Giá trị gói đã bán (VND)', Number(snapshot.metrics.package_value || 0)],
        ['Gói đã bán', Number(snapshot.metrics.packages_sold || 0)],
        ['Buổi PT đã dạy', Number(snapshot.metrics.completed_pt || 0)]
      ]);

      // Sheet 2: Doanh thu & Dòng tiền
      const revenue = workbook.addWorksheet('Doanh thu & Dong tien');
      revenue.addRow([selectedPeriod === 'month' ? 'Ngày' : 'Tháng', 'Tổng số gói bán', 'Phân rã dịch vụ', 'Thực thu (VND)']);
      (snapshot.revenue || []).forEach(row => {
        revenue.addRow([row.period, Number(row.packages_sold || 0), breakdown(row.service_breakdown), Number(row.cash_received || 0)]);
      });
      revenue.addRow(['Tổng cộng', Number(snapshot.metrics.packages_sold || 0), '', Number(snapshot.metrics.cash_received || 0)]);
      revenue.getColumn(4).numFmt = '#,##0';

      // Sheet 3: Cơ cấu gói tập
      const mix = workbook.addWorksheet('Co cau goi tap');
      mix.addRow(['Gói tập', 'Phân loại', 'Số lượng bán', 'Tỷ trọng (%)', 'Doanh thu (VND)']);
      (snapshot.distribution || []).forEach(row => {
        mix.addRow([row.package_name, row.package_type || 'GYM', Number(row.count || 0), Number(row.percentage || 0), Number(row.revenue || 0)]);
      });
      mix.getColumn(5).numFmt = '#,##0';

      // Sheet 4: Hiệu suất Đào tạo PT
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
      anchor.download = `BaoCao_BI_${periodNames[selectedPeriod]}_${branchName.replace(/[^\p{L}\p{N}]+/gu, '_')}_${WebUI.dateKey(new Date()).replaceAll('-', '')}.xlsx`;
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
