window.RevenueHandoversModule = (function () {
  'use strict';

  let current = null;
  const api = () => window.apiClient;
  const W = () => window.WebUI;
  const dataOf = response => response?.data ?? response;
  const branch = () => {
    const id = api().getCurrentBranchId();
    return id && id !== 'ALL' ? id : null;
  };
  const alive = s => current === s && s.view.root[0].isConnected && s.branch === branch();
  const accountLabel = a => a ? [a.bank_bin, a.account_no, a.account_name].filter(Boolean).join(' · ') : '';
  const bankTransfer = item => ['BANK_TRANSFER', 'BANK_TRANSFER_VIETQR'].includes(item.payment_method);
  const calendarKey = value => {
    if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  };
  const calendarDate = value => {
    const key = calendarKey(value);
    return key ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${key}T00:00:00Z`)) : '-';
  };
  const branchToday = timezone => {
    if (!timezone) throw new Error('Chi nhánh chưa có múi giờ hợp lệ.');
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(part => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  const dateTime = (value, timezone) => value ? (timezone ? new Date(value).toLocaleString('vi-VN', { timeZone: timezone }) : 'Thiếu múi giờ') : '-';
  const notify = (text, type = 'warning') => DevExpress.ui.notify(text, type, 5000);
  const post = async (path, body) => dataOf(await api().request(path, { method: 'POST', body }));
  const canConfirm = s => alive(s) && s.branch && !s.busy && s.preview?.preview_token
    && Number(s.preview.count) > 0 && Number(s.preview.unresolved_count) === 0;

  function invalidate(s) {
    s.generation++;
    s.preview = null;
    s.previewBody = null;
    s.confirm.option('disabled', true);
  }

  function modal(s, title, build, width = 760) {
    if (!alive(s)) return null;
    if (s.dialogs.size) return s.dialogs.values().next().value;
    const host = $('<div>').appendTo(document.body);
    const d = { closed: false, busy: false, popup: null };
    d.popup = host.dxPopup({
      title, width: () => Math.min(width, innerWidth - 24), height: 'auto', maxHeight: '86vh',
      showCloseButton: true, dragEnabled: false, hideOnOutsideClick: false,
      contentTemplate: container => {
        $(container).empty();
        const scroll = $('<div>').appendTo(container).dxScrollView({ height: 'auto' }).dxScrollView('instance');
        build($(scroll.content()), d);
      },
      onHiding: e => { if (d.busy && alive(s)) e.cancel = true; },
      onHidden: () => {
        d.closed = true;
        s.dialogs.delete(d);
        d.popup.dispose();
        host.remove();
      }
    }).dxPopup('instance');
    s.dialogs.add(d);
    d.popup.show();
    return d;
  }

  function summary(container, data, batch = false) {
    const record = batch ? data.batch : data;
    W().metrics(container, [
      { label: 'Tổng tiền', value: W().money(record.total_amount), icon: 'wallet', tone: 'green' },
      { label: 'Giao dịch', value: record.count ?? record.payment_count ?? data.items.length, icon: 'receipt', tone: 'blue' },
      ...(!batch ? [{ label: 'Chưa xác định', value: data.unresolved_count, icon: 'circle-exclamation', tone: 'amber' }] : [])
    ]);
    W().grid(W().section(container, 'Tổng hợp theo nơi nhận tiền').body, data.groups, [
      { dataField: 'label', caption: 'Tiền mặt / tài khoản / chưa xác định', minWidth: 280 },
      { dataField: 'count', caption: 'Giao dịch', width: 110 },
      { dataField: 'amount', caption: 'Số tiền', width: 180, customizeText: e => W().money(e.value) }
    ], { keyExpr: 'key', paging: { enabled: false }, pager: { visible: false } });
  }

  function itemGrid(container, items, s, editable = false, timezone = s.timezone) {
    return W().grid(container, items, [
      { dataField: 'payment_code', caption: 'Mã thanh toán', width: 160 },
      { dataField: 'receipt_code', caption: 'Phiếu thu', width: 150 },
      { dataField: 'confirmed_at', caption: 'Ngày thu', width: 170, customizeText: e => dateTime(e.value, timezone) },
      { dataField: 'member_name', caption: 'Khách hàng', minWidth: 190, cellTemplate: (el, info) => {
        $('<strong>').text(info.data.member_name || '-').appendTo(el);
        $('<div class="text-muted">').text([info.data.member_code, info.data.member_phone].filter(Boolean).join(' · ')).appendTo(el);
      } },
      { dataField: 'registration_code', caption: 'Hợp đồng', width: 150 },
      { dataField: 'amount', caption: 'Số tiền', width: 160, customizeText: e => W().money(e.value) },
      { dataField: 'payment_method', caption: 'Phương thức', width: 150, cellTemplate: (el, info) => {
        const cash = info.value === 'CASH', transfer = bankTransfer(info.data);
        $('<i aria-hidden="true">').addClass(`fa-solid ${cash ? 'fa-money-bill-wave' : transfer ? 'fa-building-columns' : 'fa-circle-question'}`).appendTo(el);
        $('<span>').text(` ${cash ? 'Tiền mặt' : transfer ? 'Chuyển khoản' : info.value || 'Chưa xác định'}`).appendTo(el);
      } },
      { caption: 'Tài khoản nhận tiền', minWidth: 290, cellTemplate: (el, info) => {
        const item = info.data;
        if (editable && bankTransfer(item) && (!item.bank_account_id || s.allocations.has(item.payment_id))) {
          $('<div>').appendTo(el).dxSelectBox({
            dataSource: s.accounts, valueExpr: 'id', displayExpr: accountLabel,
            searchEnabled: true, searchExpr: ['bank_bin', 'account_no', 'account_name'],
            value: s.allocations.get(item.payment_id) || item.bank_account_id || null,
            label: 'Tài khoản nhận tiền', labelMode: 'static', placeholder: 'Chưa xác định',
            showClearButton: true,
            onValueChanged: e => {
              if (!e.event || !alive(s)) return;
              if (e.value) s.allocations.set(item.payment_id, e.value);
              else s.allocations.delete(item.payment_id);
              load(s);
            }
          });
        } else $('<span>').text(item.payment_method === 'CASH' ? 'Tiền mặt' : accountLabel(item) || 'Chưa xác định').appendTo(el);
      } }
    ], { keyExpr: 'payment_id', searchPanel: { visible: true, placeholder: 'Tìm khách hàng, mã...' } });
  }

  async function render(containerId, context = {}) {
    destroy();
    const s = {
      view: W().page(containerId, 'Bàn giao & tất toán doanh thu'), branch: branch(),
      tab: context.tab === 'history' ? 'history' : 'pending', generation: 0,
      from: null, to: null, timezone: null,
      allocations: new Map(), accounts: [], dialogs: new Set(), busy: false, preview: null
    };
    current = s;
    if (s.branch) {
      W().loading(s.view.body);
      try {
        const branches = dataOf(await api().request('/branches'));
        if (!alive(s)) return;
        const location = branches.find(item => item.id === s.branch);
        s.timezone = location?.timezone;
        s.from = s.to = branchToday(s.timezone);
        s.view.body.empty();
      } catch (err) {
        if (alive(s)) W().error(s.view.body, err, () => render(containerId, context));
        return;
      }
    }
    W().button(s.view.actions, 'Tài khoản nhận tiền', 'fa-solid fa-building-columns', () => openAccounts(s));
    s.confirm = W().button(s.view.actions, 'Xác nhận bàn giao', 'check', () => openConfirmation(s), true);
    s.confirm.option('disabled', true);
    W().button(s.view.actions, '', 'refresh', () => load(s)).option('hint', 'Làm mới');
    $('<div>').appendTo(s.view.body).dxTabs({
      items: [{ id: 'pending', text: 'Chưa bàn giao' }, { id: 'history', text: 'Lịch sử bàn giao' }],
      selectedIndex: s.tab === 'history' ? 1 : 0,
      onItemClick: e => { s.tab = e.itemData.id; load(s); }
    });
    const filters = $('<div class="filter-bar">').appendTo(s.view.body);
    for (const [field, label] of [['from', 'Từ ngày'], ['to', 'Đến ngày']]) {
      $('<div>').appendTo(filters).dxDateBox({
        type: 'date', label, labelMode: 'static', displayFormat: 'dd/MM/yyyy',
        dateSerializationFormat: 'yyyy-MM-dd', value: s[field], showClearButton: true, width: 180,
        onValueChanged: e => {
          s[field] = calendarKey(e.value);
          s.allocations.clear();
          load(s);
        }
      });
    }
    s.content = $('<div>').appendTo(s.view.body);
    await load(s);
  }

  async function load(s) {
    if (!alive(s)) return;
    invalidate(s);
    const generation = s.generation;
    const fresh = () => alive(s) && generation === s.generation;
    s.confirm.option('visible', s.tab === 'pending');
    if (s.from && s.to && s.from > s.to) {
      W().error(s.content, new Error('Đến ngày phải bằng hoặc sau Từ ngày.'));
      return;
    }
    if (s.tab === 'pending' && !s.branch) {
      W().empty(s.content, 'Chọn một chi nhánh để xem giao dịch chưa bàn giao.', 'building');
      return;
    }
    if (s.tab === 'pending' && (!s.from || !s.to || /NaN/.test(s.from + s.to))) {
      W().error(s.content, new Error('Chọn đầy đủ Từ ngày và Đến ngày để lập bàn giao.'));
      return;
    }
    W().loading(s.content);
    try {
      if (s.tab === 'history') {
        const query = new URLSearchParams();
        if (s.from) query.set('date_from', s.from);
        if (s.to) query.set('date_to', s.to);
        const store = new DevExpress.data.CustomStore({
          key: 'id', load: async options => {
            const params = new URLSearchParams(query);
            params.set('page', String(Math.floor((options.skip || 0) / (options.take || 15)) + 1));
            params.set('limit', String(options.take || 15));
            const result = dataOf(await api().request(`/revenue-handovers?${params}`));
            return { data: fresh() ? result.items : [], totalCount: fresh() ? Number(result.total) : 0 };
          }
        });
        s.content.empty();
        W().grid(W().section(s.content, 'Lịch sử bàn giao').body, store, [
          { dataField: 'handover_code', caption: 'Mã bàn giao', minWidth: 190 },
          { dataField: 'branch_name', caption: 'Chi nhánh', minWidth: 160 },
          { dataField: 'date_from', caption: 'Từ ngày', width: 125, customizeText: e => calendarDate(e.value) },
          { dataField: 'date_to', caption: 'Đến ngày', width: 125, customizeText: e => calendarDate(e.value) },
          { dataField: 'total_amount', caption: 'Tổng tiền', width: 180, customizeText: e => W().money(e.value) },
          { dataField: 'confirmed_by_name', caption: 'Người xác nhận', width: 180 },
          { dataField: 'confirmed_at', caption: 'Ngày bàn giao', width: 175, cellTemplate: (el, info) => $('<span>').text(dateTime(info.value, info.data.timezone)).appendTo(el) },
          { caption: 'Chi tiết', width: 110, alignment: 'center', cellTemplate: (el, info) => {
            W().button(el, '', 'eye', () => openDetail(s, info.data.id)).option('hint', 'Xem bàn giao');
          } }
        ], {
          remoteOperations: { paging: true }, sorting: { mode: 'none' },
          onDataErrorOccurred: e => {
            if (fresh()) W().error(s.content, e.error, () => load(s));
          }
        });
        return;
      }
      const body = { date_from: s.from, date_to: s.to, allocations: Array.from(s.allocations, ([payment_id, bank_account_id]) => ({ payment_id, bank_account_id })) };
      const [accounts, preview] = await Promise.all([
        api().request('/revenue-bank-accounts').then(dataOf), post('/revenue-handovers/preview', body)
      ]);
      if (!fresh()) return;
      s.accounts = accounts;
      s.preview = preview;
      s.previewBody = body;
      s.content.empty();
      summary(s.content, preview);
      itemGrid(W().section(s.content, 'Giao dịch chưa bàn giao').body, preview.items, s, true);
      s.confirm.option('disabled', !canConfirm(s));
    } catch (err) {
      if (fresh()) W().error(s.content, err, () => load(s));
    }
  }

  function openConfirmation(s) {
    if (!canConfirm(s)) return;
    const preview = s.preview, body = s.previewBody, generation = s.generation;
    modal(s, 'Xác nhận bàn giao doanh thu', (container, d) => {
      summary(container, preview);
      let checked = false;
      const note = $('<div>').appendTo(container).dxTextArea({ label: 'Ghi chú', labelMode: 'static', height: 80, maxLength: 1000 }).dxTextArea('instance');
      const checkbox = $('<div>').appendTo(container).dxCheckBox({
        text: 'Xác nhận đã bàn giao đầy đủ', value: false,
        onValueChanged: e => { checked = e.value === true; submit.option('disabled', !checked || d.busy); }
      }).dxCheckBox('instance');
      const error = $('<div class="form-error" role="alert">').hide().appendTo(container);
      const actions = $('<div class="view-actions">').appendTo(container);
      const cancel = W().button(actions, 'Hủy', 'close', () => d.popup.hide());
      const submit = W().button(actions, 'Xác nhận bàn giao', 'save', async () => {
        if (d.busy || !checked || !canConfirm(s) || generation !== s.generation) return;
        d.busy = s.busy = true;
        submit.option('disabled', true);
        cancel.option('disabled', true);
        checkbox.option('disabled', true);
        note.option('disabled', true);
        error.hide();
        try {
          const result = await post('/revenue-handovers', { ...body, preview_token: preview.preview_token, confirmed: true, ...(note.option('value')?.trim() ? { note: note.option('value').trim() } : {}) });
          d.busy = s.busy = false;
          if (!alive(s) || d.closed) return;
          await d.popup.hide();
          s.allocations.clear();
          notify('Đã xác nhận bàn giao doanh thu.', 'success');
          await load(s);
          if (alive(s)) showDetail(s, result);
        } catch (err) {
          d.busy = s.busy = false;
          if (!alive(s) || d.closed) return;
          if (err.status === 409) {
            await d.popup.hide();
            s.allocations.clear();
            notify('Dữ liệu đã thay đổi. Đang tải lại bản xem trước; vui lòng kiểm tra và xác nhận lại.');
            await load(s);
            return;
          }
          error.text(err.message || 'Không thể xác nhận bàn giao.').show();
          // A failed response may follow a committed transaction. Require a new preview.
          invalidate(s);
          cancel.option({ disabled: false, text: 'Đóng và tải lại', onClick: () => { d.popup.hide(); load(s); } });
        }
      }, true);
      submit.option('disabled', true);
    }, 850);
  }

  function detailContent(container, data, s) {
    const batch = data.batch;
    $('<h2>').text(batch.handover_code || batch.id).appendTo(container);
    const metadata = $('<dl>').appendTo(container);
    $('<dt>').text('Chi nhánh').appendTo(metadata);
    $('<dd>').text(batch.branch_name || '-').appendTo(metadata);
    $('<dt>').text('Người xác nhận').appendTo(metadata);
    $('<dd>').text(batch.confirmed_by_name || '-').appendTo(metadata);
    $('<p>').text(`${calendarDate(batch.date_from)} - ${calendarDate(batch.date_to)} · ${dateTime(batch.confirmed_at, batch.timezone)}`).appendTo(container);
    if (batch.note) $('<p>').text(batch.note).appendTo(container);
    summary(container, data, true);
    itemGrid(W().section(container, 'Chi tiết khách hàng & tài khoản nhận tiền').body, data.items, s, false, batch.timezone);
  }

  function showDetail(s, data) {
    modal(s, 'Chi tiết bàn giao', container => detailContent(container, data, s), 1150);
  }

  function openDetail(s, id) {
    if (!alive(s)) return;
    modal(s, 'Chi tiết bàn giao', (container, d) => {
      async function fetchDetail() {
        W().loading(container);
        try {
          const result = dataOf(await api().request(`/revenue-handovers/${encodeURIComponent(id)}`));
          if (!alive(s) || d.closed) return;
          container.empty();
          detailContent(container, result, s);
        } catch (err) {
          if (alive(s) && !d.closed) W().error(container, err, fetchDetail);
        }
      }
      fetchDetail();
    }, 1150);
  }

  function openAccounts(s) {
    if (!alive(s)) return;
    modal(s, 'Tài khoản nhận tiền', (container, d) => {
      const list = $('<div>').appendTo(container);
      async function fetchAccounts() {
        W().loading(list);
        try {
          const accounts = dataOf(await api().request('/revenue-bank-accounts'));
          if (!alive(s) || d.closed) return;
          s.accounts = accounts;
          list.empty();
          W().grid(list, accounts, [
            { dataField: 'bank_bin', caption: 'BIN ngân hàng', width: 135 },
            { dataField: 'account_no', caption: 'Số tài khoản', minWidth: 180 },
            { dataField: 'account_name', caption: 'Tên tài khoản', minWidth: 210 }
          ]);
        } catch (err) {
          if (alive(s) && !d.closed) W().error(list, err, fetchAccounts);
        }
      }
      fetchAccounts();
      if (!s.branch) return;
      const model = { bank_bin: '', account_no: '', account_name: '' };
      const form = $('<div>').appendTo(container).dxForm({
        formData: model, labelLocation: 'top', showColonAfterLabel: false,
        items: [
          { dataField: 'bank_bin', label: { text: 'BIN ngân hàng' }, editorOptions: { maxLength: 6, inputAttr: { inputmode: 'numeric' } }, validationRules: [
            { type: 'required', message: 'Nhập BIN ngân hàng.' }, { type: 'pattern', pattern: /^\d{6}$/, message: 'BIN phải gồm đúng 6 chữ số.' }
          ] },
          { dataField: 'account_no', label: { text: 'Số tài khoản' }, editorOptions: { maxLength: 30, inputAttr: { inputmode: 'numeric' } }, validationRules: [
            { type: 'required', message: 'Nhập số tài khoản.' }, { type: 'pattern', pattern: /^\d{1,30}$/, message: 'Số tài khoản phải gồm 1 đến 30 chữ số.' }
          ] },
          { dataField: 'account_name', label: { text: 'Tên tài khoản' }, editorOptions: { maxLength: 150 }, validationRules: [
            { type: 'required', message: 'Nhập tên tài khoản.' }, { type: 'stringLength', max: 150, message: 'Tên tài khoản tối đa 150 ký tự.' }
          ] }
        ]
      }).dxForm('instance');
      const error = $('<div class="form-error" role="alert">').hide().appendTo(container);
      const actions = $('<div class="view-actions">').appendTo(container);
      W().button(actions, 'Đóng', 'close', () => d.popup.hide());
      const save = W().button(actions, 'Thêm tài khoản', 'save', async () => {
        if (d.busy || !alive(s) || !s.branch || !form.validate().isValid) return;
        d.busy = true;
        save.option('disabled', true);
        form.option('disabled', true);
        error.hide();
        try {
          const values = form.option('formData');
          await post('/revenue-bank-accounts', { bank_bin: values.bank_bin, account_no: values.account_no, account_name: values.account_name.trim() });
          if (!alive(s) || d.closed) return;
          form.option('formData', { bank_bin: '', account_no: '', account_name: '' });
          notify('Đã thêm tài khoản nhận tiền.', 'success');
          await fetchAccounts();
          if (alive(s)) await load(s);
        } catch (err) {
          if (alive(s) && !d.closed) error.text(err.message || 'Không thể thêm tài khoản.').show();
        } finally {
          d.busy = false;
          if (alive(s) && !d.closed) {
            save.option('disabled', false);
            form.option('disabled', false);
          }
        }
      }, true);
    }, 850);
  }

  function destroy() {
    const s = current;
    current = null;
    if (!s) return;
    s.generation++;
    for (const d of s.dialogs) { d.busy = false; d.popup.hide(); }
  }

  return { render, destroy, refresh: () => current && load(current) };
})();
