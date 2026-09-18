/**
 * ==========================================================================
 * PARADISE GYM - MOBILE PT APP (TAB 3: anti-3-PT)
 * MODULE PT03: THÔNG BÁO IN-APP (NOTIFICATIONS SYSTEM)
 * ==========================================================================
 * - PT03-US01: Hộp thư thông báo in-app cho Huấn luyện viên (PT)
 *   + Mở khi chạm vào biểu tượng chuông trên Header (#btnNotification) hoặc từ điều hướng
 *   + 5 nhóm sự kiện vận hành theo spec PT03-US01 (100% động từ PostgreSQL Backend):
 *     1. Yêu cầu phân công PT mới (-> PT02-US03 / PT02-US02)
 *     2. Đặt lịch PT mới (-> PT01-US01)
 *     3. Hủy lịch buổi PT (-> PT01-US01)
 *     4. Xác nhận hoàn thành từ Học viên / Cần xác nhận kết quả (-> PT01-US02)
 *     5. Nhắc lịch dạy sắp tới (-> PT01-US01)
 *     (Kèm: Học viên mới tiếp nhận thành công -> PT02-US02)
 *   + Lọc theo tab: [Tất cả] và [Chưa đọc] (AF-01)
 *   + Đánh dấu đã đọc từng tin khi chạm vào
 *   + Đánh dấu tất cả là đã đọc (Mark all as read)
 *   + Tự động đồng bộ badge đỏ trên icon chuông Header & modal tabs
 *   + Chạm vào thông báo để điều hướng trực tiếp đến màn hình/modal tương ứng (PT01 / PT02)
 *   + Exception Flow: Hiển thị lỗi mạng nếu không kết nối được backend
 * ==========================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ParadisePTNotifications = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const READ_STORAGE_PREFIX = 'paradise_pt_notifs_read_';

  // State cục bộ của module Notifications
  const NotificationsState = {
    isOpen: false,
    activeFilter: 'all', // 'all' | 'unread'
    notifications: [],
    isLoading: false
  };

  /**
   * Helper lấy danh sách ID thông báo đã đọc được lưu trữ theo tài khoản PT
   */
  function getReadSet() {
    const user = window.apiClient?.getUser() || window.ptApp?.currentUser;
    const userId = user?.pt_profile_id || user?.account_id || user?.id || 'default_pt';
    try {
      const raw = localStorage.getItem(READ_STORAGE_PREFIX + userId);
      if (raw) return new Set(JSON.parse(raw));
    } catch (e) {
      console.warn('Cannot read notification read set from localStorage', e);
    }
    return new Set();
  }

  /**
   * Helper đánh dấu ID thông báo đã đọc vào lưu trữ cục bộ
   */
  function markIdAsReadInStorage(id) {
    if (!id) return;
    const user = window.apiClient?.getUser() || window.ptApp?.currentUser;
    const userId = user?.pt_profile_id || user?.account_id || user?.id || 'default_pt';
    const set = getReadSet();
    set.add(id);
    try {
      localStorage.setItem(READ_STORAGE_PREFIX + userId, JSON.stringify([...set]));
    } catch (e) {
      console.warn('Cannot save notification read set to localStorage', e);
    }
  }

  /**
   * Kiểm tra thông báo đã đọc chưa
   */
  function isNotificationRead(id) {
    const set = getReadSet();
    return set.has(id);
  }

  /**
   * Helper format date DD/MM/YYYY
   */
  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2].slice(0, 2)}/${parts[1]}/${parts[0]}`;
      }
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('vi-VN');
      }
    } catch (e) {}
    return dateStr;
  }

  /**
   * Helper format thời gian hiển thị thân thiện (giờ:phút hoặc ngày)
   */
  function formatTimeOrDate(dateVal) {
    if (!dateVal) return 'Vừa xong';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return 'Vừa xong';

      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch (e) {
      return 'Vừa xong';
    }
  }

  /**
   * Toast helper: Ưu tiên dùng ptApp.showToast nếu có
   */
  function showToast(message, type = 'info') {
    if (window.ptApp && typeof window.ptApp.showToast === 'function') {
      window.ptApp.showToast(message, type);
      return;
    }
    const toast = document.getElementById('appToast');
    const textEl = document.getElementById('toastText');
    if (toast && textEl) {
      textEl.textContent = message;
      toast.className = `toast-msg show toast-${type}`;
      setTimeout(() => {
        toast.className = 'toast-msg';
      }, 2800);
    } else {
      console.log(`[PT03 Toast ${type}]: ${message}`);
    }
  }

  /**
   * Tải và đồng bộ thông báo từ Backend Database PostgreSQL (Dữ liệu động 100%, tuân thủ Rule 5)
   * Bao gồm cả bảng notifications và 5 nhóm sự kiện vận hành thời gian thực của HLV
   */
  async function fetchNotifications() {
    if (!window.apiClient) return;

    NotificationsState.isLoading = true;
    const dynamicItems = [];
    const readSet = getReadSet();

    try {
      const currentUser = window.apiClient.getUser() || window.ptApp?.currentUser;
      const currentPtId = currentUser?.pt_profile_id || currentUser?.id;

      // 1. Tải thông báo từ bảng notifications (REST API GET /notifications)
      if (typeof window.apiClient.notifications?.list === 'function') {
        const notifRes = await window.apiClient.notifications.list();
        if (notifRes && notifRes.data && Array.isArray(notifRes.data)) {
          notifRes.data.forEach(item => {
            const isRead = !!item.read_at || !!item.is_read || !!item.isRead || readSet.has(item.id);
            const content = item.body || item.message || item.content || '';
            const title = item.title || 'Thông báo hệ thống';

            // Phân loại targetScreen và icon dựa theo sự kiện
            let targetScreen = 'PT01_SCHEDULE';
            let icon = 'fa-bell';
            let iconBg = 'rgba(59, 130, 246, 0.15)';
            let iconColor = '#3B82F6';

            if (item.reference_type === 'PT_ASSIGNMENT' || title.includes('phân công') || content.includes('phân công')) {
              targetScreen = 'PT02_REQUESTS';
              icon = 'fa-user-plus';
              iconBg = 'rgba(245, 158, 11, 0.15)';
              iconColor = '#F59E0B';
            } else if (item.reference_type === 'PT_CONFIRMATION' || title.includes('xác nhận') || content.includes('xác nhận')) {
              targetScreen = 'PT01_RESULT_MODAL';
              icon = 'fa-clipboard-check';
              iconBg = 'rgba(139, 92, 246, 0.15)';
              iconColor = '#8B5CF6';
            } else if (title.includes('hủy') || content.includes('hủy')) {
              targetScreen = 'PT01_SCHEDULE';
              icon = 'fa-calendar-xmark';
              iconBg = 'rgba(239, 68, 68, 0.15)';
              iconColor = '#EF4444';
            } else if (title.includes('Nhắc') || content.includes('Nhắc')) {
              targetScreen = 'PT01_SCHEDULE';
              icon = 'fa-clock';
              iconBg = 'rgba(16, 185, 129, 0.15)';
              iconColor = '#10B981';
            }

            dynamicItems.push({
              id: item.id,
              type: item.reference_type || item.type || 'SYSTEM',
              title,
              content,
              targetScreen: item.target_screen || targetScreen,
              referenceId: item.reference_id || item.id,
              createdAt: formatTimeOrDate(item.created_at),
              timestamp: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
              isRead,
              icon,
              iconBg,
              iconColor
            });
          });
        }
      }

      // 2. Tải động 5 nhóm sự kiện vận hành từ Database thực tế của HLV
      // 2.1. Nhóm 1: Yêu cầu phân công PT mới (HV03-US04)
      if (typeof window.apiClient.pt?.listAssignmentRequests === 'function') {
        try {
          const reqRes = await window.apiClient.pt.listAssignmentRequests();
          if (reqRes && reqRes.data && Array.isArray(reqRes.data)) {
            reqRes.data.forEach(req => {
              // Lọc đúng cho PT hiện hành và trạng thái PENDING
              const isMatchPt = !currentPtId || req.pt_id === currentPtId || (currentUser?.full_name && req.pt_name === currentUser.full_name);
              if (isMatchPt && req.status === 'PENDING') {
                const notifId = `NOTIF-REQ-${req.id}`;
                dynamicItems.push({
                  id: notifId,
                  type: 'ASSIGNMENT_REQUEST',
                  title: 'Yêu cầu phân công PT mới',
                  content: `Bạn có yêu cầu phân công PT mới từ Học viên ${req.studentName || req.member_name || 'Học viên'} - Gói ${req.packageName || req.package_name || 'Gói tập'}`,
                  targetScreen: 'PT02_REQUESTS',
                  referenceId: req.id,
                  createdAt: formatTimeOrDate(req.requested_at),
                  timestamp: req.requested_at ? new Date(req.requested_at).getTime() : Date.now(),
                  isRead: readSet.has(notifId),
                  icon: 'fa-user-plus',
                  iconBg: 'rgba(245, 158, 11, 0.15)',
                  iconColor: '#F59E0B'
                });
              }
            });
          }
        } catch (reqErr) {
          console.warn('Fetch assignment requests for notifs fallback:', reqErr.message);
        }
      }

      // 2.2. Nhóm 2, 3, 4, 5 từ Lịch tập pt_bookings (Đặt lịch, Hủy lịch, Xác nhận kết quả, Nhắc lịch)
      if (typeof window.apiClient.pt?.listBookings === 'function') {
        try {
          const bookingsRes = await window.apiClient.pt.listBookings(currentPtId ? { pt_id: currentPtId } : {});
          if (bookingsRes && bookingsRes.data && Array.isArray(bookingsRes.data)) {
            const bookings = bookingsRes.data;
            const todayStr = new Date().toISOString().slice(0, 10);

            bookings.forEach(b => {
              const isMatchPt = !currentPtId || b.pt_id === currentPtId || (currentUser?.full_name && b.pt_name === currentUser.full_name);
              if (!isMatchPt) return;

              const memberName = b.memberName || b.member_name || 'Học viên';
              const timeSlot = b.slot || `${b.start_time ? b.start_time.slice(0, 5) : '08:00'} - ${b.end_time ? b.end_time.slice(0, 5) : '10:00'}`;
              const dateDisplay = formatDateDisplay(b.booking_date || b.date);
              const isToday = (b.booking_date || b.date) === todayStr;

              // Nhóm 4: Thông báo Xác nhận hoàn thành từ Học viên (HV02-US04 / PT01-US02)
              if (b.status === 'AWAITING_CONFIRMATION' || b.status === 'PENDING_COMPLETION') {
                const notifId = `NOTIF-CONFIRM-${b.id}`;
                dynamicItems.push({
                  id: notifId,
                  type: 'CONFIRM_COMPLETION',
                  title: 'Cần xác nhận kết quả',
                  content: `Học viên ${memberName} đã bấm xác nhận hoàn thành buổi tập [${timeSlot}] ngày [${dateDisplay}]. Vui lòng xác nhận kết quả`,
                  targetScreen: 'PT01_RESULT_MODAL',
                  referenceId: b.id,
                  createdAt: formatTimeOrDate(b.member_confirmed_at || b.booking_date),
                  timestamp: b.member_confirmed_at ? new Date(b.member_confirmed_at).getTime() : Date.now(),
                  isRead: readSet.has(notifId),
                  icon: 'fa-clipboard-check',
                  iconBg: 'rgba(139, 92, 246, 0.15)',
                  iconColor: '#8B5CF6'
                });
              }

              // Nhóm 3: Thông báo Hủy lịch buổi PT (HV02-US03)
              if (b.status === 'CANCELLED') {
                const notifId = `NOTIF-CANCEL-${b.id}`;
                dynamicItems.push({
                  id: notifId,
                  type: 'CANCEL_BOOKING',
                  title: 'Lịch dạy bị hủy',
                  content: `Lịch dạy bị hủy: Buổi tập với Học viên ${memberName} lúc [${timeSlot}] ngày [${dateDisplay}] đã bị hủy`,
                  targetScreen: 'PT01_SCHEDULE',
                  referenceId: b.id,
                  createdAt: formatTimeOrDate(b.updated_at || b.booking_date),
                  timestamp: b.updated_at ? new Date(b.updated_at).getTime() : Date.now(),
                  isRead: readSet.has(notifId),
                  icon: 'fa-calendar-xmark',
                  iconBg: 'rgba(239, 68, 68, 0.15)',
                  iconColor: '#EF4444'
                });
              }

              // Nhóm 5: Thông báo Nhắc lịch dạy sắp tới (Trước ca dạy hôm nay)
              if ((b.status === 'BOOKED' || b.status === 'UPCOMING') && isToday) {
                const notifId = `NOTIF-REMIND-${b.id}`;
                dynamicItems.push({
                  id: notifId,
                  type: 'UPCOMING_REMINDER',
                  title: 'Nhắc lịch dạy sắp tới',
                  content: `Nhắc lịch dạy: Bạn có buổi tập với Học viên ${memberName} vào lúc [${timeSlot}] hôm nay`,
                  targetScreen: 'PT01_SCHEDULE',
                  referenceId: b.id,
                  createdAt: 'Hôm nay',
                  timestamp: Date.now() - 15 * 60 * 1000,
                  isRead: readSet.has(notifId),
                  icon: 'fa-clock',
                  iconBg: 'rgba(16, 185, 129, 0.15)',
                  iconColor: '#10B981'
                });
              }

              // Nhóm 2: Thông báo Đặt lịch PT mới (HV02-US02)
              if (b.status === 'BOOKED' || b.status === 'UPCOMING') {
                const notifId = `NOTIF-BOOKED-${b.id}`;
                dynamicItems.push({
                  id: notifId,
                  type: 'NEW_BOOKING',
                  title: 'Đặt lịch PT mới',
                  content: `Lịch dạy mới: Học viên ${memberName} đã đặt lịch tập vào [${timeSlot}] ngày [${dateDisplay}]`,
                  targetScreen: 'PT01_SCHEDULE',
                  referenceId: b.id,
                  createdAt: formatTimeOrDate(b.created_at || b.booking_date),
                  timestamp: b.created_at ? new Date(b.created_at).getTime() : Date.now(),
                  isRead: readSet.has(notifId),
                  icon: 'fa-calendar-plus',
                  iconBg: 'rgba(59, 130, 246, 0.15)',
                  iconColor: '#3B82F6'
                });
              }
            });
          }
        } catch (bErr) {
          console.warn('Fetch bookings for notifs fallback:', bErr.message);
        }
      }

      // Khử trùng lặp ID và sắp xếp mới nhất lên đầu
      const uniqueMap = new Map();
      dynamicItems.forEach(item => {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });

      NotificationsState.notifications = Array.from(uniqueMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Cập nhật giao diện an toàn
      updateBellBadge();
      const listScroll = document.getElementById('notifListScroll');
      if (listScroll) {
        listScroll.innerHTML = renderNotificationList();
      }
    } catch (e) {
      console.warn('Error fetching PT notifications from backend:', e.message);
      // Exception Flow: Lỗi kết nối mạng
      showToast('Không thể nạp danh sách thông báo, vui lòng kiểm tra kết nối mạng', 'error');
    } finally {
      NotificationsState.isLoading = false;
    }
  }

  /**
   * Khởi tạo module Notifications & gắn vào container
   */
  async function init(containerEl) {
    injectNotificationStyles();
    bindGlobalBell();
    updateBellBadge();
    await fetchNotifications();
  }

  /**
   * Tự động gắn sự kiện click cho nút chuông trên Topbar Header (#btnNotification)
   */
  function bindGlobalBell() {
    const bellBtn = document.getElementById('btnNotification') ||
                    document.getElementById('btnHeaderNotifications') ||
                    document.querySelector('.topbar-notif-btn');
    if (bellBtn) {
      // Gỡ listener cũ để tránh trùng lặp
      bellBtn.replaceWith(bellBtn.cloneNode(true));
      const freshBtn = document.getElementById('btnNotification') ||
                       document.getElementById('btnHeaderNotifications') ||
                       document.querySelector('.topbar-notif-btn');
      if (freshBtn) {
        freshBtn.addEventListener('click', (e) => {
          e.preventDefault();
          openModal();
        });
      }
    }
  }

  /**
   * Tính số lượng thông báo chưa đọc
   */
  function getUnreadCount() {
    return NotificationsState.notifications.filter(n => !n.isRead).length;
  }

  /**
   * Cập nhật badge đỏ trên icon chuông ở Topbar Header & modal
   */
  function updateBellBadge() {
    const unread = getUnreadCount();
    const badgeEls = [
      document.getElementById('notifBadge'),
      document.getElementById('topbarNotifBadge'),
      document.getElementById('headerNotifBadge'),
      document.querySelector('.topbar-badge'),
      document.querySelector('.badge-dot-count')
    ];

    badgeEls.forEach(badgeEl => {
      if (badgeEl) {
        badgeEl.textContent = unread;
        badgeEl.style.display = unread > 0 ? 'inline-flex' : 'none';
      }
    });

    // Cập nhật tab unread count nếu modal đang mở
    const unreadTabBadge = document.getElementById('notifUnreadBadge');
    if (unreadTabBadge) {
      unreadTabBadge.textContent = unread;
      unreadTabBadge.style.display = unread > 0 ? 'inline-flex' : 'none';
    }

    const bgInstance = $('#dxNotifFilterTabs').dxButtonGroup('instance');
    if (bgInstance) {
      bgInstance.option('items', [
        { text: 'Tất cả', value: 'all' },
        { text: unread > 0 ? `Chưa đọc (${unread})` : 'Chưa đọc', value: 'unread' }
      ]);
    }

    // Cập nhật badge trên header drawer
    const headerBadge = document.getElementById('ptNotifHeaderBadge');
    if (headerBadge) {
      headerBadge.textContent = `${unread} mới`;
      headerBadge.style.display = unread > 0 ? 'inline-block' : 'none';
    }
  }

  /**
   * Mở modal/drawer Thông báo in-app
   */
  async function openModal() {
    let modalEl = document.getElementById('ptNotificationsModal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'ptNotificationsModal';
      modalEl.className = 'pt-notif-modal-wrapper';
      document.body.appendChild(modalEl);
    }

    renderModalContent(modalEl);
    modalEl.style.display = 'flex';
    NotificationsState.isOpen = true;
    updateBellBadge();

    // Đồng thời đồng bộ dữ liệu mới nhất từ backend database
    await fetchNotifications();
  }

  /**
   * Đóng modal Thông báo
   */
  function closeModal() {
    const modalEl = document.getElementById('ptNotificationsModal');
    if (modalEl) {
      modalEl.style.display = 'none';
    }
    NotificationsState.isOpen = false;
  }

  /**
   * Vẽ nội dung bên trong modal Thông báo
   */
  function renderModalContent(containerEl) {
    const unreadCount = getUnreadCount();

    containerEl.innerHTML = `
      <div class="pt-notif-backdrop" id="notifBackdrop"></div>
      <div class="pt-notif-drawer">
        <!-- Header -->
        <div class="pt-notif-header">
          <div class="pt-notif-title-wrap">
            <i class="fa-solid fa-bell pt-notif-title-icon"></i>
            <span class="pt-notif-title">Thông báo PT</span>
            <span class="pt-notif-header-badge" id="ptNotifHeaderBadge" style="display: ${unreadCount > 0 ? 'inline-block' : 'none'};">
              ${unreadCount} mới
            </span>
          </div>
          <button type="button" class="pt-notif-close-btn" id="btnCloseNotif" title="Đóng">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Toolbar: Bộ lọc Tất cả / Chưa đọc DevExtreme dxButtonGroup + Nút Đánh dấu tất cả đã đọc -->
        <div class="pt-notif-toolbar" style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <div id="dxNotifFilterTabs"></div>
          ${unreadCount > 0 ? `
            <button type="button" class="pt-notif-mark-all-btn" id="btnMarkAllRead">
              <i class="fa-solid fa-check-double"></i> Đọc tất cả
            </button>
          ` : ''}
        </div>

        <!-- Danh sách thông báo -->
        <div class="pt-notif-list-scroll" id="notifListScroll">
          ${renderNotificationList()}
        </div>
      </div>
    `;

    bindModalEvents(containerEl);
    initDxNotifButtonGroup(containerEl, unreadCount);
  }

  /**
   * Khởi tạo DevExtreme dxButtonGroup cho thanh lọc thông báo
   */
  function initDxNotifButtonGroup(containerEl, unreadCount) {
    const $tabs = $(containerEl).find('#dxNotifFilterTabs');
    if (!$tabs.length) return;

    $tabs.dxButtonGroup({
      items: [
        { text: 'Tất cả', value: 'all' },
        { text: unreadCount > 0 ? `Chưa đọc (${unreadCount})` : 'Chưa đọc', value: 'unread' }
      ],
      keyExpr: 'value',
      selectedItemKeys: [NotificationsState.activeFilter],
      stylingMode: 'outlined',
      onItemClick: function (e) {
        if (e.itemData?.value) {
          NotificationsState.activeFilter = e.itemData.value;
          const listScroll = containerEl.querySelector('#notifListScroll');
          if (listScroll) listScroll.innerHTML = renderNotificationList();
        }
      }
    });
  }

  /**
   * Render danh sách thông báo theo bộ lọc
   */
  function renderNotificationList() {
    let list = NotificationsState.notifications;
    if (NotificationsState.activeFilter === 'unread') {
      list = list.filter(n => !n.isRead);
    }

    if (list.length === 0) {
      return `
        <div class="pt-notif-empty">
          <div class="pt-notif-empty-icon">
            <i class="fa-regular fa-bell-slash"></i>
          </div>
          <div class="pt-notif-empty-title">
            ${NotificationsState.activeFilter === 'unread' ? 'Không có thông báo chưa đọc' : 'Bạn chưa có thông báo nào'}
          </div>
          <div class="pt-notif-empty-desc">
            Các cập nhật về yêu cầu phân công, đặt lịch dạy, hủy lịch và nhắc nhở ca dạy sẽ xuất hiện tại đây khi có phát sinh.
          </div>
        </div>
      `;
    }

    return `
      <div class="pt-notif-items">
        ${list.map(item => `
          <div class="pt-notif-card ${item.isRead ? 'read' : 'unread'}" onclick="ParadisePTNotifications.handleItemClick('${item.id}')">
            <div class="pt-notif-icon-col">
              <div class="pt-notif-type-icon" style="background: ${item.iconBg}; color: ${item.iconColor};">
                <i class="fa-solid ${item.icon}"></i>
              </div>
            </div>

            <div class="pt-notif-content-col">
              <div class="pt-notif-card-header">
                <div class="pt-notif-card-title">${item.title}</div>
                <div class="pt-notif-card-time">${item.createdAt}</div>
              </div>
              <div class="pt-notif-card-text">${item.content}</div>
              <div class="pt-notif-action-tag">
                <span>Chạm để xử lý</span>
                <i class="fa-solid fa-arrow-right"></i>
              </div>
            </div>

            ${!item.isRead ? `<div class="pt-notif-unread-dot"></div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Xử lý khi chạm vào một thông báo cụ thể (Đánh dấu đã đọc & tự động điều hướng PT01/PT02)
   */
  async function handleItemClick(notificationId) {
    const item = NotificationsState.notifications.find(n => n.id === notificationId);
    if (!item) return;

    // 1. Đánh dấu đã đọc
    if (!item.isRead) {
      item.isRead = true;
      markIdAsReadInStorage(item.id);
      updateBellBadge();

      // Gọi API qua apiClient nếu có (đối với bản ghi bảng notifications)
      if (window.apiClient && window.apiClient.notifications && typeof window.apiClient.notifications.markAsRead === 'function' && !item.id.startsWith('NOTIF-')) {
        try {
          await window.apiClient.notifications.markAsRead(notificationId);
        } catch (err) {
          console.warn('API mark as read fallback:', err);
        }
      }
    }

    // Đóng drawer thông báo
    closeModal();

    // 2. Điều hướng thông minh đến màn hình xử lý tương ứng (PT01 / PT02) theo Main Flow
    navigateByTarget(item);
  }

  /**
   * Điều hướng thông minh theo mục tiêu thông báo theo chuẩn Main Flow PT03-US01:
   * - Yêu cầu phân công -> PT02 (Học viên & Lộ trình / Yêu cầu phân công)
   * - Đặt lịch / Hủy lịch / Nhắc lịch -> PT01 (Lịch tập PT theo ngày)
   * - Xác nhận hoàn thành -> PT01 (Mở modal Ghi nhận kết quả buổi PT)
   */
  function navigateByTarget(item) {
    const app = window.ParadisePTApp || window.ptApp;

    switch (item.targetScreen) {
      // Nhóm PT02: Yêu cầu phân công mới -> chuyển tab Học viên (#view-members), chọn subtab Yêu cầu phân công
      case 'PT02_REQUESTS':
        if (app && typeof app.switchTab === 'function') {
          app.switchTab('members');
        }
        setTimeout(() => {
          if (window.ParadisePTClients && typeof window.ParadisePTClients.switchTab === 'function') {
            window.ParadisePTClients.switchTab('requests');
          }
        }, 150);
        break;

      // Nhóm PT02: Xem chi tiết học viên mới & lộ trình tập luyện (PT02-US02)
      case 'PT02_CLIENT_DETAIL':
        if (app && typeof app.switchTab === 'function') {
          app.switchTab('members');
        }
        setTimeout(() => {
          if (window.ParadisePTClients && typeof window.ParadisePTClients.openClientDetail === 'function') {
            window.ParadisePTClients.openClientDetail(item.referenceId);
          }
        }, 150);
        break;

      // Nhóm PT01: Mở modal ghi nhận kết quả buổi PT (PT01-US02)
      case 'PT01_RESULT_MODAL':
        if (app && typeof app.switchTab === 'function') {
          app.switchTab('schedule');
        }
        setTimeout(() => {
          const schedule = window.ParadisePTSchedule;
          if (schedule) {
            if (typeof schedule.openConfirmModal === 'function') {
              schedule.openConfirmModal(item.referenceId);
            } else if (typeof schedule.openResultModal === 'function') {
              schedule.openResultModal(item.referenceId);
            }
          }
        }, 150);
        break;

      // Nhóm PT01: Điều hướng đến màn hình Lịch dạy PT theo ngày (PT01-US01)
      case 'PT01_SCHEDULE':
      default:
        if (app && typeof app.switchTab === 'function') {
          app.switchTab('schedule');
        }
        break;
    }
  }

  /**
   * Đánh dấu tất cả thông báo là đã đọc
   */
  async function markAllAsRead() {
    NotificationsState.notifications.forEach(n => {
      n.isRead = true;
      markIdAsReadInStorage(n.id);
      if (window.apiClient?.notifications?.markAsRead && !n.id.startsWith('NOTIF-')) {
        window.apiClient.notifications.markAsRead(n.id).catch(() => {});
      }
    });

    updateBellBadge();

    const listScroll = document.getElementById('notifListScroll');
    if (listScroll) {
      listScroll.innerHTML = renderNotificationList();
    }

    const unreadTabBadge = document.getElementById('notifUnreadBadge');
    if (unreadTabBadge) unreadTabBadge.style.display = 'none';

    const btnMarkAll = document.getElementById('btnMarkAllRead');
    if (btnMarkAll) btnMarkAll.remove();

    showToast('Đã đánh dấu tất cả thông báo là đã đọc.', 'success');
  }

  /**
   * Đánh dấu đã đọc theo referenceId (Đồng bộ khi schedule.js xác nhận kết quả hoặc clients.js xử lý yêu cầu)
   */
  function markAsReadByReference(referenceId) {
    if (!referenceId) return;
    let changed = false;
    NotificationsState.notifications.forEach(n => {
      if (n.referenceId === referenceId || n.id === referenceId || n.id.includes(referenceId)) {
        if (!n.isRead) {
          n.isRead = true;
          markIdAsReadInStorage(n.id);
          changed = true;
          if (window.apiClient?.notifications?.markAsRead && !n.id.startsWith('NOTIF-')) {
            window.apiClient.notifications.markAsRead(n.id).catch(() => {});
          }
        }
      }
    });

    if (changed) {
      updateBellBadge();
      const listScroll = document.getElementById('notifListScroll');
      if (listScroll) {
        listScroll.innerHTML = renderNotificationList();
      }
    }
  }

  /**
   * Đăng ký sự kiện trong modal
   */
  function bindModalEvents(containerEl) {
    const btnClose = containerEl.querySelector('#btnCloseNotif');
    const backdrop = containerEl.querySelector('#notifBackdrop');
    const tabAll = containerEl.querySelector('#notifTabAll');
    const tabUnread = containerEl.querySelector('#notifTabUnread');
    const btnMarkAll = containerEl.querySelector('#btnMarkAllRead');

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    if (tabAll) {
      tabAll.addEventListener('click', () => {
        NotificationsState.activeFilter = 'all';
        tabAll.classList.add('active');
        if (tabUnread) tabUnread.classList.remove('active');
        const listScroll = containerEl.querySelector('#notifListScroll');
        if (listScroll) listScroll.innerHTML = renderNotificationList();
      });
    }

    if (tabUnread) {
      tabUnread.addEventListener('click', () => {
        NotificationsState.activeFilter = 'unread';
        tabUnread.classList.add('active');
        if (tabAll) tabAll.classList.remove('active');
        const listScroll = containerEl.querySelector('#notifListScroll');
        if (listScroll) listScroll.innerHTML = renderNotificationList();
      });
    }

    if (btnMarkAll) {
      btnMarkAll.addEventListener('click', markAllAsRead);
    }
  }

  /**
   * Callback khi một yêu cầu phân công được chấp nhận hoặc từ chối từ PT02
   */
  function notifyAssignmentHandled(requestId, status, studentName) {
    const notifIndex = NotificationsState.notifications.findIndex(n => n.referenceId === requestId || n.id.includes(requestId));
    if (notifIndex !== -1) {
      NotificationsState.notifications[notifIndex].isRead = true;
      markIdAsReadInStorage(NotificationsState.notifications[notifIndex].id);
    }

    // Thêm thông báo phản hồi nếu được chấp nhận
    if (status === 'ACCEPTED') {
      const newNotifId = 'NOTIF-ACCEPTED-' + Date.now();
      NotificationsState.notifications.unshift({
        id: newNotifId,
        type: 'NEW_STUDENT',
        title: 'Đã tiếp nhận học viên',
        content: `Bạn đã tiếp nhận học viên ${studentName}. Học viên đã được thêm vào danh sách quản lý của bạn.`,
        targetScreen: 'PT02_CLIENT_DETAIL',
        referenceId: requestId,
        createdAt: 'Vừa xong',
        isRead: false,
        icon: 'fa-user-check',
        iconBg: 'rgba(16, 185, 129, 0.15)',
        iconColor: '#10B981'
      });
    }

    updateBellBadge();
    const listScroll = document.getElementById('notifListScroll');
    if (listScroll) {
      listScroll.innerHTML = renderNotificationList();
    }
  }

  /**
   * Chèn styles cho Thông báo
   */
  function injectNotificationStyles() {
    if (document.getElementById('ptNotifInjectedStyles')) return;

    const style = document.createElement('style');
    style.id = 'ptNotifInjectedStyles';
    style.textContent = `
      .pt-notif-modal-wrapper {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        display: none;
        align-items: flex-end;
        justify-content: center;
      }
      .pt-notif-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
      }
      .pt-notif-drawer {
        position: relative;
        width: 100%;
        max-width: 410px;
        height: 85%;
        max-height: 720px;
        background: var(--bg-surface, #131D2E);
        border-top-left-radius: 28px;
        border-top-right-radius: 28px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: drawerSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.8);
      }
      @keyframes drawerSlideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      .pt-notif-header {
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 18px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        flex-shrink: 0;
      }
      .pt-notif-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pt-notif-title-icon {
        color: var(--primary, #10B981);
        font-size: 16px;
      }
      .pt-notif-title {
        font-size: 17px;
        font-weight: 700;
        color: #F8FAFC;
      }
      .pt-notif-header-badge {
        background: rgba(239, 68, 68, 0.2);
        color: #EF4444;
        border: 1px solid rgba(239, 68, 68, 0.35);
        font-size: 11px;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 20px;
      }
      .pt-notif-close-btn {
        background: rgba(255, 255, 255, 0.06);
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        color: #94A3B8;
        font-size: 14px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .pt-notif-close-btn:active {
        background: rgba(255, 255, 255, 0.12);
        color: #FFFFFF;
      }
      .pt-notif-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 18px;
        background: rgba(0, 0, 0, 0.15);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        flex-shrink: 0;
      }
      .pt-notif-filter-tabs {
        display: flex;
        gap: 6px;
      }
      .pt-notif-tab {
        background: transparent;
        border: none;
        color: #94A3B8;
        font-size: 13px;
        font-weight: 600;
        padding: 6px 12px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
      }
      .pt-notif-tab.active {
        background: rgba(16, 185, 129, 0.15);
        color: var(--primary, #10B981);
      }
      .pt-notif-tab-count {
        background: #EF4444;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 8px;
        line-height: 1.2;
      }
      .pt-notif-mark-all-btn {
        background: transparent;
        border: none;
        color: #CBD5E1;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 4px 6px;
      }
      .pt-notif-mark-all-btn:active {
        color: var(--primary, #10B981);
      }
      .pt-notif-list-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 12px 18px 24px;
      }
      .pt-notif-items {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .pt-notif-card {
        display: flex;
        gap: 12px;
        padding: 14px;
        border-radius: 14px;
        background: var(--bg-surface-elevated, #1E293B);
        border: 1px solid rgba(255, 255, 255, 0.06);
        cursor: pointer;
        position: relative;
        transition: all 0.2s ease;
      }
      .pt-notif-card:active {
        transform: scale(0.99);
      }
      .pt-notif-card.unread {
        background: rgba(16, 185, 129, 0.05);
        border-color: rgba(16, 185, 129, 0.25);
      }
      .pt-notif-card.read {
        opacity: 0.85;
      }
      .pt-notif-icon-col {
        flex-shrink: 0;
      }
      .pt-notif-type-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
      }
      .pt-notif-content-col {
        flex: 1;
        min-width: 0;
      }
      .pt-notif-card-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 8px;
        margin-bottom: 4px;
      }
      .pt-notif-card-title {
        font-size: 14px;
        font-weight: 700;
        color: #F8FAFC;
        line-height: 1.3;
      }
      .pt-notif-card-time {
        font-size: 11px;
        color: #64748B;
        white-space: nowrap;
      }
      .pt-notif-card-text {
        font-size: 12px;
        color: #CBD5E1;
        line-height: 1.45;
        margin-bottom: 8px;
      }
      .pt-notif-action-tag {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 600;
        color: var(--primary, #10B981);
      }
      .pt-notif-unread-dot {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #10B981;
        box-shadow: 0 0 8px #10B981;
      }
      .pt-notif-empty {
        padding: 60px 20px;
        text-align: center;
      }
      .pt-notif-empty-icon {
        font-size: 40px;
        color: #475569;
        margin-bottom: 12px;
      }
      .pt-notif-empty-title {
        font-size: 15px;
        font-weight: 700;
        color: #E2E8F0;
        margin-bottom: 6px;
      }
      .pt-notif-empty-desc {
        font-size: 12px;
        color: #94A3B8;
        line-height: 1.4;
      }
    `;
    document.head.appendChild(style);
  }

  if (typeof document !== 'undefined') {
    injectNotificationStyles();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  return {
    init,
    openModal,
    closeModal,
    fetchNotifications,
    getUnreadCount,
    updateBellBadge,
    handleItemClick,
    markAllAsRead,
    markAsReadByReference,
    notifyAssignmentHandled,
    getState: () => NotificationsState
  };
});
