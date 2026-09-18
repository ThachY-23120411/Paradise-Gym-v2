window.ReportsModule = (function () {
  let period = 'month', view = null, revision = 0, data = null, exportButton;
  const periodNames = { month: 'Tháng', quarter: 'Quý', year: 'Năm' };
  function breakdown(value) {
    if (typeof value === 'string') return value;
    if (!value) return '-';
    return [['gym', 'Gói Gym'], ['pt', 'Gói PT'], ['combo', 'Combo']].filter(([key]) => Number(value[key]) > 0).map(([key, label]) => value[key] + ' ' + label).join(' · ') || '-';
  }
  async function render(containerId) {
    view = WebUI.page(containerId, 'Báo cáo tổng hợp', ParadiseApp.getBranchName());
    $('<div>').appendTo(view.actions).dxButtonGroup({ items: Object.entries(periodNames).map(([id, text]) => ({ id, text })), keyExpr: 'id', selectionMode: 'single', selectedItemKeys: [period], onItemClick: e => { if (period !== e.itemData.id) { period = e.itemData.id; load(); } } });
    exportButton = WebUI.button(view.actions, 'Xuất báo cáo', 'xlsxfile', exportReport, true);
    exportButton.option('disabled', true);
    await load();
  }
  async function load() {
    const version = ++revision, target = view.body;
    data = null; exportButton.option('disabled', true); WebUI.loading(target);
    try {
      const response = await apiClient.request('/reports?period=' + period);
      if (version !== revision || !document.contains(target[0])) return;
      data = response.data;
      const metrics = data.metrics;
      target.empty();
      WebUI.metrics(target, [
        { label: 'Tiền thực thu', value: WebUI.money(metrics.cash_received), caption: 'Tính đến ' + WebUI.date(new Date()), icon: 'wallet' },
        { label: 'Giá trị gói đã bán', value: WebUI.money(metrics.package_value), caption: 'Tổng giá trị niêm yết', icon: 'boxes-stacked', tone: 'blue' },
        { label: 'Gói đã bán', value: metrics.packages_sold, caption: periodNames[period] + ' hiện tại', icon: 'file-circle-check', tone: 'amber' },
        { label: 'Buổi PT đã dạy', value: metrics.completed_pt, caption: 'Đã ghi kết quả', icon: 'dumbbell', tone: 'coral' }
      ]);
      $('<div class="report-scope">').append($(WebUI.badge('Tiền thực thu · ' + ParadiseApp.getBranchName(), 'success')), $('<span>').text(WebUI.date(data.start_date) + ' - ' + WebUI.date(data.end_date))).appendTo(target);
      const charts = $('<div class="report-charts">').appendTo(target);
      const chart = WebUI.section(charts, 'Doanh thu 3 kỳ gần nhất');
      const comparisonCount = data.comparison?.length || 0;
      if (!data.comparison?.some(item => Number(item.cash_received) > 0)) WebUI.empty(chart.body, 'Chưa có doanh thu trong các kỳ này', 'chart-column');
      else $('<div>').appendTo(chart.body).dxChart({
        dataSource: data.comparison, size: { height: 270 }, palette: ['#9ac8ad'], commonSeriesSettings: { type: 'bar', argumentField: 'period', valueField: 'cash_received', barPadding: .5 },
        series: [{ name: 'Thực thu' }], legend: { visible: false }, valueAxis: { label: { customizeText: point => new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(point.value) }, grid: { color: '#eaf0ec' } },
        argumentAxis: { label: { font: { family: 'Be Vietnam Pro', size: 11 } }, tick: { visible: false } },
        tooltip: { enabled: true, customizeTooltip: point => ({ text: point.argumentText + ': ' + WebUI.money(point.value) }) },
        customizePoint: point => ({ color: point.index === comparisonCount - 1 ? '#237b58' : '#bad9c6' }),
        loadingIndicator: { show: false }
      });
      const distribution = WebUI.section(charts, 'Cơ cấu gói tập đã bán');
      if (!data.distribution?.length) WebUI.empty(distribution.body, 'Chưa có gói tập bán ra trong kỳ', 'boxes-stacked');
      else data.distribution.forEach(item => {
        const row = $('<div class="distribution-item">').appendTo(distribution.body);
        $('<div>').append($('<strong>').text(item.package_name), $('<span>').text(item.count + ' · ' + Number(item.percentage).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + '%')).appendTo(row);
        $('<div class="distribution-track">').append($('<span>').css('width', Math.max(0, Math.min(100, Number(item.percentage))) + '%')).appendTo(row);
      });
      const section = WebUI.section(target, 'Bảng tổng hợp doanh thu');
      WebUI.grid(section.body, (data.revenue || []).map(row => ({ ...row, id: row.period })), [
        { dataField: 'period', caption: period === 'month' ? 'Ngày' : 'Tháng', minWidth: 150, calculateCellValue: row => period === 'month' ? WebUI.date(row.period) : formatMonth(row.period) },
        { dataField: 'packages_sold', caption: 'Tổng số gói bán', dataType: 'number', minWidth: 140 },
        { dataField: 'service_breakdown', caption: 'Phân rã theo dịch vụ', minWidth: 220, calculateCellValue: row => breakdown(row.service_breakdown) },
        { dataField: 'cash_received', caption: 'Thực thu (100%)', alignment: 'right', minWidth: 170, customizeText: point => WebUI.money(point.value) }
      ], { summary: { totalItems: [{ column: 'packages_sold', summaryType: 'sum', displayFormat: '{0} gói' }, { column: 'cash_received', summaryType: 'sum', customizeText: point => WebUI.money(point.value) }] } });
      exportButton.option('disabled', false);
    } catch (err) { if (version === revision) WebUI.error(target, err, load); }
  }
  function formatMonth(value) {
    const parts = String(value).split('-');
    return parts.length >= 2 ? 'Tháng ' + parts[1] + '/' + parts[0] : value;
  }
  async function exportReport() {
    if (!data) return;
    exportButton.option('disabled', true);
    try {
      if (!window.ExcelJS) throw new Error('Không thể tải công cụ xuất Excel. Vui lòng kiểm tra kết nối và tải lại trang.');
      const snapshot = data, selectedPeriod = period, branchName = ParadiseApp.getBranchName(), workbook = new ExcelJS.Workbook();
      workbook.creator = 'Paradise Gym';
      const summary = workbook.addWorksheet('Tong hop');
      summary.addRows([
        ['PARADISE GYM', 'BÁO CÁO TỔNG HỢP'],
        ['Kỳ báo cáo', periodNames[selectedPeriod]], ['Chi nhánh', branchName],
        ['Từ ngày', WebUI.date(snapshot.start_date)], ['Đến ngày', WebUI.date(snapshot.end_date)],
        ['Tiền thực thu', Number(snapshot.metrics.cash_received)], ['Giá trị gói đã bán', Number(snapshot.metrics.package_value)],
        ['Gói đã bán', Number(snapshot.metrics.packages_sold)], ['Buổi PT đã dạy', Number(snapshot.metrics.completed_pt)]
      ]);
      const revenue = workbook.addWorksheet('Doanh thu');
      revenue.addRow([selectedPeriod === 'month' ? 'Ngày' : 'Tháng', 'Tổng số gói bán', 'Phân rã dịch vụ', 'Thực thu (VND)']);
      snapshot.revenue.forEach(row => revenue.addRow([row.period, Number(row.packages_sold), breakdown(row.service_breakdown), Number(row.cash_received)]));
      revenue.addRow(['Tổng cộng', Number(snapshot.metrics.packages_sold), '', Number(snapshot.metrics.cash_received)]);
      revenue.getColumn(4).numFmt = '#,##0';
      const mix = workbook.addWorksheet('Co cau goi');
      mix.addRow(['Gói tập', 'Số lượng', 'Tỷ trọng (%)']);
      snapshot.distribution.forEach(row => mix.addRow([row.package_name, Number(row.count), Number(row.percentage)]));
      const comparison = workbook.addWorksheet('So sanh ky');
      comparison.addRow(['Kỳ', 'Thực thu (VND)']);
      snapshot.comparison.forEach(row => comparison.addRow([row.period, Number(row.cash_received)]));
      workbook.eachSheet(sheet => {
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF185740' } };
        sheet.columns.forEach(column => { column.width = 28; });
      });
      revenue.getColumn(3).width = 55;
      const file = new Blob([await workbook.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'BaoCao_TongHop_' + periodNames[selectedPeriod] + '_' + branchName.replace(/[^\p{L}\p{N}]+/gu, '_') + '_' + WebUI.dateKey(new Date()).replaceAll('-', '') + '.xlsx';
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { DevExpress.ui.notify(err.message, 'error', 5000); }
    finally { exportButton?.option('disabled', !data); }
  }
  return { render, refresh: load, destroy: () => { revision++; view = null; data = null; } };
})();
