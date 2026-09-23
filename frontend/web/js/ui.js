window.WebUI = (function () {
  const escape = value => $('<span>').text(value == null ? '' : String(value)).html();
  const rows = response => Array.isArray(response?.data) ? response.data : response?.data?.items || [];
  const money = value => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(value) || 0);
  const dateKey = value => {
    const d = value instanceof Date ? value : new Date(value || Date.now());
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const date = value => value ? new Date(value).toLocaleDateString('vi-VN') : '-';
  const time = value => value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-';
  function badge(text, tone = 'neutral') { return `<span class="status-badge badge-${escape(tone)}">${escape(text)}</span>`; }
  function page(containerId, title, subtitle = '') {
    const root = $('<section class="page-content">');
    const header = $('<div class="view-header">').appendTo(root);
    $('<div class="view-header-title">').append($('<h1>').text(title), $('<p>').text(subtitle)).appendTo(header);
    const actions = $('<div class="view-actions">').appendTo(header);
    const body = $('<div class="page-body">').appendTo(root);
    $('#' + containerId).empty().append(root);
    return { root, header, actions, body };
  }
  const DX_BUILTIN_ICONS = new Set([
    'add', 'airplane', 'bookmark', 'box', 'car', 'card', 'cart', 'chart', 'check', 'clear',
    'clock', 'close', 'coffee', 'comment', 'copy', 'doc', 'download', 'edit', 'email', 'event',
    'export', 'favorites', 'field', 'file', 'filter', 'find', 'folder', 'food', 'gift', 'globe',
    'group', 'help', 'home', 'image', 'info', 'key', 'like', 'lock', 'map', 'message', 'money',
    'music', 'options', 'parentfolder', 'percent', 'photo', 'pin', 'plus', 'preferences', 'print',
    'product', 'refresh', 'remove', 'rename', 'repeat', 'revert', 'runner', 'save', 'search',
    'share', 'sun', 'tag', 'tel', 'tips', 'trash', 'trophy', 'upload', 'user', 'video', 'warning',
    'warninghex', 'xlsfile', 'xlsxfile'
  ]);
  function sanitizeButtonIcon(icon) {
    if (!icon || typeof icon !== 'string') return undefined;
    const trimmed = icon.trim();
    if (!trimmed || trimmed === 'none') return undefined;
    if (trimmed.startsWith('fa-') || trimmed.startsWith('fa ') || trimmed.startsWith('fas ') || trimmed.startsWith('far ')) return trimmed;
    const lower = trimmed.toLowerCase();
    if (DX_BUILTIN_ICONS.has(lower)) return lower;
    const faMap = {
      calculator: 'fa-solid fa-calculator',
      'cake-candles': 'fa-solid fa-cake-candles',
      eye: 'fa-solid fa-eye'
    };
    return faMap[lower] || undefined;
  }
  function button(container, text, icon, action, primary = false) {
    const opts = { text, type: primary ? 'default' : 'normal', stylingMode: primary ? 'contained' : 'outlined', onClick: action };
    const validIcon = sanitizeButtonIcon(icon);
    if (validIcon) opts.icon = validIcon;
    return $('<div>').appendTo(container).dxButton(opts).dxButton('instance');
  }
  function empty(container, message, icon = 'inbox') {
    $(container).empty().append($('<div class="empty-state">').append($(`<i class="fa-solid fa-${icon}" aria-hidden="true">`), $('<p>').text(message)));
  }
  function error(container, err, retry) {
    const el = $('<div class="error-state" role="alert">').append($('<i class="fa-solid fa-circle-exclamation">'), $('<div>').append($('<strong>').text('Không thể tải dữ liệu'), $('<p>').text(err?.message || 'Kết nối bị gián đoạn. Vui lòng thử lại.')));
    if (retry) button(el, 'Thử lại', 'refresh', retry);
    $(container).empty().append(el);
  }
  function loading(container) { $(container).empty().append('<div class="loading-state" role="status"><span class="loading-spinner"></span>Đang tải dữ liệu...</div>'); }
  function grid(container, dataSource, columns, options = {}) {
    return $('<div>').appendTo(container).dxDataGrid({
      dataSource, columns, keyExpr: 'id', showBorders: false, showRowLines: true, showColumnLines: false,
      hoverStateEnabled: true, rowAlternationEnabled: false, columnAutoWidth: true, columnMinWidth: 90,
      allowColumnResizing: true, wordWrapEnabled: true, noDataText: 'Không có dữ liệu phù hợp',
      paging: { pageSize: 15 }, pager: { visible: true, showInfo: true, showPageSizeSelector: true, allowedPageSizes: [15, 30, 50] },
      sorting: { mode: 'multiple' }, scrolling: { mode: 'standard' }, loadPanel: { enabled: true }, ...options
    }).dxDataGrid('instance');
  }
  function metrics(container, items) {
    const row = $('<div class="metrics-row">').appendTo(container);
    for (const item of items) {
      const el = $('<article class="metric-card">').addClass(`metric-${item.tone || 'green'}`).appendTo(row);
      $('<div class="metric-label">').append($('<span>').text(item.label), $(`<i class="fa-solid fa-${item.icon || 'chart-simple'}" aria-hidden="true">`)).appendTo(el);
      $('<strong class="metric-value">').text(item.value ?? '-').appendTo(el);
      if (item.amount) $('<div class="metric-amount-row">').html(item.amount).appendTo(el);
      $('<span class="metric-caption">').text(item.caption || '').appendTo(el);
      if (item.onClick) {
        el.addClass('metric-clickable').attr({ role: 'button', tabindex: '0' });
        el.on('click', item.onClick);
        el.on('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.onClick(); } });
      }
    }
    return row;
  }
  function section(container, title, action) {
    const el = $('<section class="data-section">').appendTo(container);
    const header = $('<div class="section-heading">').append($('<h2>').text(title)).appendTo(el);
    if (action) action(header);
    const body = $('<div class="section-body">').appendTo(el);
    return { el, header, body };
  }
  function popup(title, content, toolbarItems = [], width = 620) {
    let maxHeight = '86vh';
    if (typeof toolbarItems === 'number') {
      width = toolbarItems;
      toolbarItems = [];
    } else if (toolbarItems && typeof toolbarItems === 'object' && !Array.isArray(toolbarItems)) {
      width = toolbarItems.width || width;
      maxHeight = toolbarItems.maxHeight || maxHeight;
      toolbarItems = toolbarItems.toolbarItems || [];
    }
    if (typeof content === 'number') {
      width = content;
      content = undefined;
    }
    const el = $('<div>').appendTo(document.body);
    const instance = el.dxPopup({
      title,
      width: () => Math.min(width, innerWidth - 24),
      height: 'auto',
      maxHeight: () => maxHeight,
      shadingColor: 'rgba(24, 45, 34, 0.3)',
      showCloseButton: true,
      dragEnabled: false,
      hideOnOutsideClick: false,
      contentTemplate: content,
      toolbarItems: Array.isArray(toolbarItems) ? toolbarItems : [],
      onHidden: () => { instance.dispose(); el.remove(); }
    }).dxPopup('instance');
    instance.show();
    return instance;
  }
  function memberStore() {
    return new DevExpress.data.CustomStore({ key: 'id', loadMode: 'raw', load: async () => {
      const members = [];
      for (let page = 1; ; page++) {
        const response = await apiClient.members.list({ page, limit: 100 });
        const batch = rows(response); members.push(...batch);
        if (Array.isArray(response.data) || !batch.length || members.length >= response.data.total || batch.length < 100) break;
      }
      return members;
    }, byKey: async id => (await apiClient.members.getById(id)).data });
  }
  function dispose(container) {
    $(container).find('.dx-widget').each(function () {
      for (const name of ['dxScheduler', 'dxDataGrid', 'dxChart', 'dxForm', 'dxPopup']) {
        const component = DevExpress.ui[name]?.getInstance(this);
        if (component) component.dispose();
      }
    });
  }
  function registrationNearExpiry(registration) {
    if (!registration || registration.is_frozen) return false;
    const state = registration.registration_status || registration.status;
    if (state && !['ACTIVE', 'EXPIRING', 'ALLOWED', 'VALID'].includes(state)) return false;
    return registration.is_expiring === true;
  }
  return { escape, rows, money, dateKey, date, time, badge, page, button, empty, error, loading, grid, metrics, section, popup, memberStore, dispose, registrationNearExpiry };
})();
