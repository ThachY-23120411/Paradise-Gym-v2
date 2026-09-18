/**
 * PARADISE GYM - MOBILE PT APP (TAB 3: anti-3-PT)
 * MAIN APP CONTROLLER & COORDINATOR
 * Manages: 4-Tab Bottom Nav, Session State, Header & Notifications, Toast System
 */

(function (window, $) {
  'use strict';

  class PtMobileApp {
    constructor() {
      this.currentTab = 'overview';
      this.currentUser = null;
      this.unreadNotificationsCount = 0;
      window.ParadisePTApp = this;
    }

    init() {
      if (window.DevExpress) {
        DevExpress.localization.locale('vi');
      }
      this.bindEvents();
      this.initClock();

      // Initialize sub-controllers
      if (window.ptAuth) window.ptAuth.init();
      if (window.ptProfile) window.ptProfile.init();
      if (window.ParadisePTOverview) window.ParadisePTOverview.init();
      if (window.ParadisePTSchedule) window.ParadisePTSchedule.init();
      if (window.ParadisePTClients) {
        window.ParadisePTClients.init(document.getElementById('clientsViewContainer') || document.getElementById('view-members'));
      }
      if (window.ParadisePTNotifications) {
        window.ParadisePTNotifications.init();
      }

      // Check existing session
      this.checkSession();
    }

    bindEvents() {
      const self = this;

      // Bottom Navigation Tab Switching
      $('#bottomNav .nav-item').attr({role:'button', tabindex:'0'}).on('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $(this).click(); } }).on('click', function () {
        const targetTab = $(this).data('tab');
        self.switchTab(targetTab);
      });

      // Notification Bell Button: Open Bottom Sheet
      $('#btnNotification').on('click', function () {
        self.openNotificationSheet();
      });

      // Close Notification Bottom Sheet
      $('#btnCloseNotificationSheet').on('click', function () {
        self.closeNotificationSheet();
      });

      // Click outside bottom sheet to close
      $('#notificationSheetBackdrop').on('click', function (e) {
        if (e.target === this) {
          self.closeNotificationSheet();
        }
      });

      // Mark All Notifications as Read
      $('#btnMarkAllNotifsRead').on('click', function () {
        self.markAllNotificationsRead();
      });


    }

    // Status bar dynamic clock
    initClock() {
      const updateClock = () => {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const mins = now.getMinutes().toString().padStart(2, '0');
        $('#statusBarClock').text(`${hours}:${mins}`);
      };
      updateClock();
      setInterval(updateClock, 10000);
    }

    // Switch between the 4 primary tabs
    switchTab(tabKey) {
      if (!this.currentUser) return;
      if (tabKey === 'notifications') { this.openNotificationSheet(); return; }
      this.currentTab = tabKey;

      // Update bottom nav active state
      $('#bottomNav .nav-item').removeClass('active');
      $(`#bottomNav .nav-item[data-tab="${tabKey}"]`).addClass('active');

      // Update main content views
      $('.view-section').removeClass('active');
      const targetView = $(`#view-${tabKey}`);
      if (targetView.length) {
        targetView.addClass('active');
      }

      // Refresh overview data if switching to overview
      if (tabKey === 'overview' && window.ParadisePTOverview) {
        window.ParadisePTOverview.refresh();
      }

      // Refresh schedule data if switching to schedule (PT01)
      if (tabKey === 'schedule' && window.ParadisePTSchedule && typeof window.ParadisePTSchedule.refresh === 'function') {
        window.ParadisePTSchedule.refresh();
      }

      // Refresh clients data if switching to members (PT02)
      if (tabKey === 'members' && window.ParadisePTClients && typeof window.ParadisePTClients.refresh === 'function') {
        window.ParadisePTClients.refresh();
      }

      // Refresh profile data if switching to profile (PT04)
      if (tabKey === 'profile' && window.ptProfile && typeof window.ptProfile.loadProfile === 'function') {
        window.ptProfile.loadProfile();
      }

      // Cuộn lên đầu view khi chuyển tab
      $('#mainContent').scrollTop(0);

      // Header cố định toàn cục thuộc layout - Giữ nguyên "Xin chào HLV...", Chi nhánh và Mã PT
      this.refreshPersistentHeader();
    }

    // Header layout cố định cho toàn bộ menu (PT01-PT06)
    refreshPersistentHeader() {
      const user = this.currentUser;
      const coachName = user?.full_name || '';
      const ptCode = user?.pt_code || 'Chưa cập nhật';
      const branch = user?.branch_name || 'Chưa cập nhật';

      $('#headerCoachName').text(`Xin chào, HLV ${coachName}`);
      $('#headerBranchText').text(branch);
      $('#headerPtCodeBadge').text(ptCode);

      $('#headerAvatar').attr('src', user?.avatar_url || '').toggle(!!user?.avatar_url);
    }

    // Session Management & Role Guarding
    async checkSession() {
      const token = apiClient.getAccessToken();

      if (!token || token.startsWith('demo-')) {
        apiClient.clearAuth();
        this.showAuthScreen();
        return;
      }
      try {
        const res = await apiClient.auth.getMe();
        const user = res.data;
        const role = user?.active_role || user?.role || (user?.roles?.includes('PT') ? 'PT' : (user?.roles?.includes('MEMBER') ? 'MEMBER' : null));
        if (role === 'MEMBER') {
          window.location.replace('/mobile/member/');
          return;
        }
        if (role !== 'PT' || !user.pt_profile_id) {
          apiClient.clearAuth();
          this.showAuthScreen();
          return;
        }
        this.initSession(user);
      } catch (err) {
        apiClient.clearAuth();
        this.showAuthScreen();
      }
    }

    initSession(user, defaultTab = 'schedule') {
      const role = user?.active_role || user?.role || (user?.roles?.includes('PT') ? 'PT' : (user?.roles?.includes('MEMBER') ? 'MEMBER' : null));
      if (role === 'MEMBER') {
        window.location.replace('/mobile/member/');
        return;
      }
      if (!user || role !== 'PT' || !user.pt_profile_id) {
        apiClient.clearAuth();
        this.showAuthScreen();
        return;
      }
      this.currentUser = user;
      apiClient.setCurrentBranchId(null);
      $('.app-header').show();

      // Populate header & profile data cố định theo layout chuẩn công ty
      this.refreshPersistentHeader();

      if (window.ptProfile) {
        window.ptProfile.renderProfile(this.currentUser);
      }
      if (window.ParadisePTNotifications && typeof window.ParadisePTNotifications.fetchNotifications === 'function') {
        window.ParadisePTNotifications.fetchNotifications();
      }

      // Hide Auth Screens
      $('#authScreen').hide();
      $('#twoFaScreen').hide();
      $('#activationScreen').hide();

      $('#loginPassword, #loginOtpCode, #actNewPassword, #actConfirmPassword, #actOtpCode, .otp-box').val('');

      // Show bottom nav and navigate to PT01 · Lịch (as per PT05-US01 & PT05-US02)
      $('#bottomNav').show();
      this.switchTab(defaultTab);
    }

    showAuthScreen() {
      this.currentUser = null;
      $('.app-header').hide();
      $('#headerAvatar, #profileAvatarImg').removeAttr('src').hide();
      $('#headerCoachName, #headerBranchText, #headerPtCodeBadge').empty();
      window.ParadisePTSchedule?.reset?.();
      window.ParadisePTClients?.reset?.();
      window.ParadisePTNotifications?.reset?.();
      window.ParadisePTOverview?.reset?.();
      window.ptProfile?.reset?.();
      $('#bottomNav').hide();
      $('.view-section').removeClass('active');
      $('#changePasswordModalBackdrop, #logoutModalBackdrop, #notificationSheetBackdrop').removeClass('active');
      $('#twoFaScreen, #activationScreen').hide();
      $('#loginPassword, #loginOtpCode, #actNewPassword, #actConfirmPassword, #actOtpCode, .otp-box').val('');
      // Chuyển hướng về cổng đăng nhập dùng chung /mobile/
      window.location.replace('/mobile/');
    }

    // Notification Bottom Sheet
    openNotificationSheet() {
      if (window.ParadisePTNotifications && typeof window.ParadisePTNotifications.openModal === 'function') {
        window.ParadisePTNotifications.openModal();
      } else {
        $('#notificationSheetBackdrop').addClass('active');
      }
    }

    closeNotificationSheet() {
      $('#notificationSheetBackdrop').removeClass('active');
    }

    markAllNotificationsRead() {
      return window.ParadisePTNotifications?.markAllAsRead();
    }

    recalcUnreadNotifs() {
      const unreadCount = $('#notificationListContainer .notif-item.unread').length;
      this.unreadNotificationsCount = unreadCount;
      if (unreadCount > 0) {
        $('#notifBadge').show().text(unreadCount);
      } else {
        $('#notifBadge').hide().text('0');
      }
    }

    // Toast Notification Utility
    showToast(message, type = 'info') {
      const container = $('#toastContainer');
      const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
      };

      const iconClass = icons[type] || icons.info;
      const toast = $(`
        <div class="gym-toast ${type}">
          <i class="fa-solid ${iconClass}"></i>
          <span></span>
        </div>
      `);

      toast.find('span').text(message);
      container.append(toast);

      setTimeout(() => {
        toast.fadeOut(300, function () {
          $(this).remove();
        });
      }, 3500);
    }
  }

  // Initialize and attach to window
  $(document).ready(function () {
    window.ptApp = new PtMobileApp();
    window.ptApp.init();
  });

})(window, jQuery);
