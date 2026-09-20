/**
 * W14: Chăm sóc khách hàng (Customer Care Module)
 * Quản lý sinh nhật hôm nay, cảnh báo gói sắp hết hạn (<= 4 ngày), nhắc gia hạn và đăng ký mới.
 */
window.CustomerCareModule = (function () {
  'use strict';
  let view = null, currentTab = 'birthdays', revision = 0;
  const W = () => window.WebUI;
  const api = () => window.apiClient;

  async function render(containerId, context = {}) {
    destroy();
    view = W().page(containerId, 'Chăm sóc khách hàng', ParadiseApp.getBranchName());
    W().button(view.actions, '', 'refresh', () => load()).option('hint', 'Làm mới dữ liệu');

    currentTab = context.tab || 'birthdays';
    await load();
  }

  async function load() {
    if (!view) return;
    const target = view.body, version = ++revision;
    W().loading(target);

    try {
      // 1. Fetch summary KPIs
      const summaryRes = await api().request('/customer-care/summary');
      if (version !== revision || !document.contains(target[0])) return;
      target.empty();

      const summary = summaryRes.data || {};

      // 2. Tab Navigation setup
      const tabs = [
        { id: 'birthdays', text: `🎂 Sinh nhật hôm nay (${summary.birthdays_today || 0})` },
        { id: 'expiring', text: `⚠️ Sắp hết hạn <= 4 ngày (${summary.expiring_soon_4days || 0})` },
        { id: 'pending-renewals', text: `⏳ Chờ nhắc gia hạn (${summary.pending_renewals || 0})` },
        { id: 'today-regs', text: `📝 Đăng ký mới hôm nay (${summary.new_registrations_today || 0})` }
      ];

      let tabsInstance = null;
      const contentArea = $('<div class="customer-care-content">');

      function switchTab(tabId) {
        currentTab = tabId;
        const idx = tabs.findIndex(t => t.id === tabId);
        if (tabsInstance && idx >= 0) {
          tabsInstance.option('selectedIndex', idx);
        }
        renderCurrentTab(contentArea, version);
      }

      const kpis = [
        {
          label: 'Sinh nhật hôm nay',
          value: summary.birthdays_today || 0,
          caption: 'Hội viên có sinh nhật',
          icon: 'cake-candles',
          tone: 'coral',
          onClick: () => switchTab('birthdays')
        },
        {
          label: 'Sắp hết hạn (<= 4 ngày)',
          value: summary.expiring_soon_4days || 0,
          caption: (summary.expiring_soon_4days || 0) > 0 ? 'Cần gọi điện nhắc nhở' : 'Không có gói cận hạn',
          icon: 'triangle-exclamation',
          tone: (summary.expiring_soon_4days || 0) > 0 ? 'danger' : 'amber',
          onClick: () => switchTab('expiring')
        },
        {
          label: 'Chờ nhắc gia hạn (14 ngày qua)',
          value: summary.pending_renewals || 0,
          caption: 'Gói hết hạn chưa gia hạn lại',
          icon: 'hourglass-half',
          tone: 'amber',
          onClick: () => switchTab('pending-renewals')
        },
        {
          label: 'Đăng ký mới hôm nay',
          value: summary.new_registrations_today || 0,
          caption: 'Hợp đồng phát sinh trong ngày',
          icon: 'file-signature',
          tone: 'blue',
          onClick: () => switchTab('today-regs')
        }
      ];
      W().metrics(target, kpis);

      // 3. Tab Bar
      const tabContainer = $('<div class="customer-care-tabs" style="margin-bottom: 16px;">').appendTo(target);
      const activeIndex = Math.max(0, tabs.findIndex(t => t.id === currentTab));
      tabsInstance = $('<div>').appendTo(tabContainer).dxTabs({
        dataSource: tabs,
        selectedIndex: activeIndex,
        onItemClick: e => {
          currentTab = e.itemData.id;
          renderCurrentTab(contentArea, version);
        }
      }).dxTabs('instance');

      contentArea.appendTo(target);
      await renderCurrentTab(contentArea, version);

    } catch (err) {
      if (version === revision) W().error(target, err, load);
    }
  }

  async function renderCurrentTab(container, version) {
    container.empty();
    W().loading(container);

    try {
      if (currentTab === 'birthdays') {
        const res = await api().request('/customer-care/birthdays');
        if (version !== revision) return;
        container.empty();
        renderBirthdaysGrid(container, res.data || []);
      } else if (currentTab === 'expiring') {
        const res = await api().request('/customer-care/expiring');
        if (version !== revision) return;
        container.empty();
        renderExpiringGrid(container, res.data || []);
      } else if (currentTab === 'pending-renewals') {
        const res = await api().request('/customer-care/pending-renewals');
        if (version !== revision) return;
        container.empty();
        renderPendingRenewalsGrid(container, res.data || []);
      } else if (currentTab === 'today-regs') {
        const res = await api().request('/customer-care/today-registrations');
        if (version !== revision) return;
        container.empty();
        renderTodayRegistrationsGrid(container, res.data || []);
      }
    } catch (err) {
      if (version === revision) W().error(container, err, () => renderCurrentTab(container, version));
    }
  }

  function renderBirthdaysGrid(container, data) {
    if (!data.length) {
      return W().empty(container, 'Hôm nay không có hội viên nào có ngày sinh nhật', 'cake-candles');
    }
    W().grid(container, data, [
      {
        caption: 'Hội viên', minWidth: 200,
        cellTemplate: (el, cell) => {
          const row = cell.data;
          const initials = (row.full_name || '?').split(' ').slice(-2).map(x => x[0]).join('');
          const avatarHtml = row.avatar_url && /^https?:\/\//.test(row.avatar_url)
            ? `<img src="${row.avatar_url}" class="member-avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
            : `<div class="member-avatar" style="width:36px;height:36px;border-radius:50%;background:#eaf4ee;color:#237b58;font-weight:700;display:grid;place-items:center;">${initials}</div>`;
          $('<div style="display:flex;align-items:center;gap:12px;">')
            .append($(avatarHtml))
            .append($('<div>').append($('<strong>').text(row.full_name), $('<small style="display:block;color:#748078;">').text(row.member_code + ' · ' + row.phone)))
            .appendTo(el);
        }
      },
      { dataField: 'date_of_birth', caption: 'Ngày sinh', dataType: 'date', format: 'dd/MM/yyyy', width: 110 },
      { dataField: 'active_package_name', caption: 'Gói tập hiện tại', minWidth: 160, calculateCellValue: r => r.active_package_name || 'Chưa kích hoạt gói' },
      { dataField: 'branch_name', caption: 'Chi nhánh', width: 160, alignment: 'center' },
      {
        caption: 'Thao tác CSKH', width: 220, fixed: true, fixedPosition: 'right',
        cellTemplate: (el, cell) => {
          const row = cell.data;
          const box = $('<div style="display:flex;gap:6px;">').appendTo(el);
          W().button(box, 'Chúc mừng', 'bell', async () => {
            try {
              await api().request('/customer-care/send-greeting', { method: 'POST', body: { member_id: row.id } });
              DevExpress.ui.notify('Đã gửi thông báo chúc mừng sinh nhật đến ứng dụng hội viên!', 'success', 3000);
            } catch (err) {
              DevExpress.ui.notify(err.message, 'error', 3500);
            }
          }, true);
          W().button(box, 'Gọi', 'tel', () => openCallLogModal(row));
        }
      }
    ], { columnAutoWidth: true, paging: { pageSize: 10 } });
  }

  function renderExpiringGrid(container, data) {
    if (!data.length) {
      return W().empty(container, 'Không có gói tập nào sắp hết hạn trong 4 ngày tới', 'check-double');
    }
    W().grid(container, data, [
      { dataField: 'reg_code', caption: 'Mã HĐ', width: 110, alignment: 'center' },
      {
        caption: 'Hội viên', minWidth: 200,
        cellTemplate: (el, cell) => {
          const row = cell.data;
          $('<div>')
            .append($('<strong>').text(row.member_name))
            .append($('<small style="display:block;color:#748078;">').text(row.member_code + ' · ' + row.member_phone))
            .appendTo(el);
        }
      },
      { dataField: 'package_name_snapshot', caption: 'Gói tập', minWidth: 200 },
      { dataField: 'end_date', caption: 'Hết hạn ngày', dataType: 'date', format: 'dd/MM/yyyy', width: 120, alignment: 'center' },
      {
        dataField: 'days_left', caption: 'Còn lại', width: 110, alignment: 'center',
        cellTemplate: (el, cell) => {
          const days = cell.value;
          const badge = days === 0 ? W().badge('Hôm nay', 'danger') : W().badge(`Còn ${days} ngày`, days <= 2 ? 'danger' : 'warning');
          el.append(badge);
        }
      },
      { dataField: 'pt_name', caption: 'HLV phụ trách', width: 150, alignment: 'center', calculateCellValue: r => r.pt_name || '--' },
      {
        caption: 'Thao tác nhắc hạn', width: 230, fixed: true, fixedPosition: 'right',
        cellTemplate: (el, cell) => {
          const row = cell.data;
          const box = $('<div style="display:flex;gap:6px;">').appendTo(el);
          W().button(box, 'Nhắc hạn', 'email', async () => {
            try {
              await api().request('/customer-care/send-renewal-reminder', { method: 'POST', body: { registration_id: row.id } });
              DevExpress.ui.notify('Đã gửi thông báo nhắc gia hạn đến hội viên!', 'success', 3000);
            } catch (err) {
              DevExpress.ui.notify(err.message, 'error', 3500);
            }
          });
          W().button(box, 'Gia hạn', 'folder', () => {
            ParadiseApp.navigateTo('registrations', { action: 'renew', registration_id: row.id, member_id: row.member_id });
          }, true);
        }
      }
    ], { columnAutoWidth: true, paging: { pageSize: 10 } });
  }

  function renderPendingRenewalsGrid(container, data) {
    if (!data.length) {
      return W().empty(container, 'Không có gói tập nào quá hạn trong 14 ngày qua', 'calendar-check');
    }
    W().grid(container, data, [
      { dataField: 'reg_code', caption: 'Mã HĐ', width: 120 },
      {
        caption: 'Hội viên', minWidth: 190,
        cellTemplate: (el, cell) => {
          const row = cell.data;
          $('<div>')
            .append($('<strong>').text(row.member_name))
            .append($('<small style="display:block;color:#748078;">').text(row.member_code + ' · ' + row.member_phone))
            .appendTo(el);
        }
      },
      { dataField: 'package_name_snapshot', caption: 'Gói đã tập', minWidth: 160 },
      { dataField: 'end_date', caption: 'Ngày hết hạn', dataType: 'date', format: 'dd/MM/yyyy', width: 120, alignment: 'center' },
      {
        dataField: 'days_expired', caption: 'Quá hạn', width: 120, alignment: 'center',
        cellTemplate: (el, cell) => {
          const days = cell.value;
          const badge = days === 0 ? W().badge('Hôm nay', 'warning') : W().badge(`${days} ngày trước`, days <= 7 ? 'warning' : 'danger');
          el.append(badge);
        }
      },
      {
        caption: 'Thao tác CSKH', width: 190, fixed: true, fixedPosition: 'right',
        cellTemplate: (el, cell) => {
          const row = cell.data;
          const box = $('<div style="display:flex;gap:6px;">').appendTo(el);
          W().button(box, 'Tái ký gói', 'add', () => {
            ParadiseApp.navigateTo('registrations', { action: 'create', member_id: row.member_id });
          }, true);
          W().button(box, 'Gọi', 'tel', () => openCallLogModal({ id: row.member_id, full_name: row.member_name, phone: row.member_phone }));
        }
      }
    ], { columnAutoWidth: true, paging: { pageSize: 10 } });
  }

  function renderTodayRegistrationsGrid(container, data) {
    if (!data.length) {
      return W().empty(container, 'Hôm nay chưa phát sinh lượt đăng ký gói nào', 'file-invoice');
    }
    W().grid(container, data, [
      { dataField: 'reg_code', caption: 'Mã ĐK', width: 110, alignment: 'center' },
      {
        caption: 'Hội viên', minWidth: 220,
        cellTemplate: (el, cell) => {
          const row = cell.data;
          $('<div>')
            .append($('<strong>').text(row.member_name))
            .append($('<small style="display:block;color:#748078;">').text(row.member_code + ' · ' + row.member_phone))
            .appendTo(el);
        }
      },
      { dataField: 'package_name_snapshot', caption: 'Gói đăng ký', minWidth: 220 },
      { dataField: 'price_snapshot', caption: 'Giá trị gói', width: 130, alignment: 'right', calculateCellValue: r => W().money(r.price_snapshot) },
      {
        dataField: 'is_paid', caption: 'Thanh toán', width: 130, alignment: 'center',
        cellTemplate: (el, cell) => el.append(W().badge(cell.value ? 'Đã thu tiền' : 'Chờ thu tiền', cell.value ? 'success' : 'warning'))
      },
      { dataField: 'created_by_name', caption: 'Nhân viên tạo', width: 150, alignment: 'center' },
      {
        caption: 'Chi tiết', width: 110, alignment: 'center', fixed: true, fixedPosition: 'right',
        cellTemplate: (el, cell) => {
          W().button(el, 'Xem', null, () => ParadiseApp.navigateTo('registrations', { registration_id: cell.data.id }));
        }
      }
    ], { columnAutoWidth: true, paging: { pageSize: 10 } });
  }

  function openCallLogModal(member) {
    const dialog = W().popup(`CSKH: ${member.full_name} (${member.phone})`, content => {
      const formDiv = $('<div>').appendTo(content);
      const data = { action_type: 'CALL_CUSTOMER', note: '' };

      const form = formDiv.dxForm({
        formData: data,
        labelLocation: 'top',
        showColonAfterLabel: false,
        items: [
          {
            dataField: 'action_type', label: { text: 'Hình thức tương tác' },
            editorType: 'dxSelectBox',
            editorOptions: {
              items: [
                { id: 'CALL_CUSTOMER', text: 'Gọi điện thoại' },
                { id: 'SMS_OR_ZALO', text: 'Nhắn tin Zalo / SMS' },
                { id: 'FRONT_DESK', text: 'Gặp trao đổi trực tiếp tại quầy' }
              ],
              valueExpr: 'id', displayExpr: 'text'
            }
          },
          {
            dataField: 'note', label: { text: 'Ghi chú nội dung trao đổi' },
            editorType: 'dxTextArea',
            editorOptions: { height: 100, placeholder: 'Ghi lại phản hồi của hội viên, hẹn ngày tới gia hạn, nhu cầu tập luyện...' },
            validationRules: [{ type: 'required', message: 'Vui lòng nhập ghi chú' }]
          }
        ]
      }).dxForm('instance');

      $('<div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">').append(
        $('<div>').dxButton({ text: 'Hủy bỏ', stylingMode: 'outlined', onClick: () => dialog.hide() }),
        $('<div>').dxButton({
          text: 'Lưu ghi chú CSKH', type: 'default', stylingMode: 'contained', icon: 'save',
          onClick: async () => {
            if (!form.validate().isValid) return;
            try {
              await api().request('/customer-care/log-action', {
                method: 'POST',
                body: { member_id: member.id, action_type: data.action_type, note: data.note }
              });
              DevExpress.ui.notify('Đã lưu nhật ký chăm sóc khách hàng', 'success', 2500);
              dialog.hide();
            } catch (err) {
              DevExpress.ui.notify(err.message, 'error', 3500);
            }
          }
        })
      ).appendTo(content);
    });
  }

  function destroy() { revision++; view = null; }
  return { render, refresh: load, destroy };
})();
