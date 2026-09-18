/**
 * ==========================================================================
 * PARADISE GYM - MOBILE PT APP (TAB 3: anti-3-PT)
 * MODULE PT06: TỔNG QUAN HIỆU SUẤT PT (PERFORMANCE OVERVIEW DASHBOARD)
 * ==========================================================================
 * - PT06-US01: Dashboard tổng quan năng suất huấn luyện của PT trong kỳ
 * - Bộ lọc mốc thời gian: Tuần này / Tháng này (mặc định) / Tháng trước
 * - Cụm 5 thẻ chỉ số KPI hiệu suất theo spec chuẩn hóa:
 *   1) Học viên phụ trách: Tổng số học viên có hợp đồng PT ACTIVE
 *   2) Buổi đã hoàn thành: Số ca tập đạt đủ xác nhận kép DONE trong kỳ
 *   3) Buổi đã được book (sắp dạy): Số ca tập trạng thái UPCOMING trong tương lai
 *   4) Buổi chờ xác nhận: Số ca tập trạng thái AWAITING_CONFIRMATION
 *   5) Yêu cầu phân công mới: Số yêu cầu ghép PT trạng thái PENDING
 * - QUY TẮC BẮT BUỘC: Tuyệt đối KHÔNG hiển thị ca dạy tiếp theo hay doanh thu tại PT06.
 * ==========================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ParadisePTOverview = factory();
    root.ptOverview = root.ParadisePTOverview;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // State quản lý cục bộ của Module PT06
  const OverviewState = {
    currentPeriod: 'this_month', // 'this_week' | 'this_month' (mặc định) | 'last_month'
    isLoading: false,
    hasError: false,
    errorMessage: '',
    kpiData: { this_week: null, this_month: null, last_month: null }

  };

  /**
   * Tính toán dải ngày (Date Range) chuẩn xác cho 3 kỳ thống kê:
   * - this_week: Thứ 2 (00:00:00) đến Chủ nhật (23:59:59)
   * - this_month: Ngày 1 (00:00:00) đến Ngày cuối tháng (23:59:59)
   * - last_month: Ngày 1 tháng trước đến Ngày cuối tháng trước
   */
  function getPeriodRanges(refDate = new Date()) {
    const now = new Date(refDate);
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const curDate = now.getDate();
    const curDay = now.getDay(); // 0: CN, 1: T2, ..., 6: T7

    // Tuần theo chuẩn VN / ISO: Thứ 2 đến Chủ nhật
    const diffToMon = (curDay === 0 ? -6 : 1) - curDay;
    const startOfWeek = new Date(curYear, curMonth, curDate + diffToMon, 0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999);

    // Tháng này: Từ ngày 1 đến ngày cuối tháng
    const startThisMonth = new Date(curYear, curMonth, 1, 0, 0, 0, 0);
    const endThisMonth = new Date(curYear, curMonth + 1, 0, 23, 59, 59, 999);

    // Tháng trước: Từ ngày 1 đến ngày cuối tháng trước
    const startLastMonth = new Date(curYear, curMonth - 1, 1, 0, 0, 0, 0);
    const endLastMonth = new Date(curYear, curMonth, 0, 23, 59, 59, 999);

    return {
      this_week: { start: startOfWeek, end: endOfWeek, label: 'Tuần này' },
      this_month: { start: startThisMonth, end: endThisMonth, label: 'Tháng này' },
      last_month: { start: startLastMonth, end: endLastMonth, label: 'Tháng trước' }
    };
  }

  /**
   * Chuyển đổi an toàn chuỗi ngày/thời gian sang Date Object chuẩn (12:00 trưa tránh lệch múi giờ)
   */
  function parseBookingDate(val) {
    if (!val) return null;
    if (typeof val === 'string') {
      const match = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 12, 0, 0);
      }
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  }

  /**
   * Khởi tạo Module PT06
   */
  function init() {
    renderOverviewContainer();
    bindEvents();
  }

  /**
   * Render giao diện HTML vào #view-overview
   * Tuyệt đối không chứa số liệu hardcoded (Rule 5)
   */
  function renderOverviewContainer() {
    const $container = $('#view-overview');
    if (!$container.length) return;

    const html = `
      <!-- Hero Banner PT06 -->
      <div class="pt-overview-hero">
        <div class="pt-hero-badge">
          <i class="fa-solid fa-chart-line"></i> Báo cáo hiệu suất PT
        </div>
        <h3 class="pt-hero-title">Năng Suất Huấn Luyện</h3>
      </div>

      <!-- Exception Flow: Banner thông báo lỗi kết nối mạng -->
      <div class="pt-overview-error-banner" id="overviewErrorBanner" style="display: none;">
        <div class="pt-error-banner-content">
          <i class="fa-solid fa-triangle-exclamation pt-error-icon"></i>
          <span class="pt-error-text" id="overviewErrorText">Không thể nạp dữ liệu thống kê, vui lòng kiểm tra kết nối mạng</span>
        </div>
        <button type="button" class="pt-error-retry-btn" id="btnRetryStats">
          <i class="fa-solid fa-rotate-right"></i> Thử lại
        </button>
      </div>

      <!-- TRIGGER: Bộ lọc mốc thời gian DevExtreme dxButtonGroup (PT06-US01) -->
      <div class="pt-period-filter-wrapper" style="margin-bottom: 16px; display: flex; justify-content: center;">
        <div id="dxOverviewPeriodButtonGroup"></div>
      </div>

      <!-- Cụm 5 thẻ chỉ số KPI hiệu suất (PT06-US01) -->
      <div class="pt-kpi-grid">
        <!-- 1) Học viên phụ trách -->
        <div class="pt-kpi-card card-cyan" id="cardKpiMembers" title="Xem danh sách học viên">
          <div class="pt-kpi-card-header">
            <span class="pt-kpi-label">Học viên phụ trách</span>
            <div class="pt-kpi-icon-wrap icon-cyan">
              <i class="fa-solid fa-users"></i>
            </div>
          </div>
          <div class="pt-kpi-number" id="kpiAssignedMembers">--</div>
          <div class="pt-kpi-footer">
            <span class="pt-kpi-pill pill-cyan">Hợp đồng PT ACTIVE</span>
            <i class="fa-solid fa-chevron-right pt-kpi-arrow"></i>
          </div>
        </div>

        <!-- 2) Buổi đã hoàn thành (xác nhận kép DONE) -->
        <div class="pt-kpi-card card-emerald" id="cardKpiCompleted" title="Xem lịch dạy">
          <div class="pt-kpi-card-header">
            <span class="pt-kpi-label">Buổi đã hoàn thành</span>
            <div class="pt-kpi-icon-wrap icon-emerald">
              <i class="fa-solid fa-clipboard-check"></i>
            </div>
          </div>
          <div class="pt-kpi-number" id="kpiCompletedSessions">--</div>
          <div class="pt-kpi-footer">
            <span class="pt-kpi-pill pill-emerald">Đủ xác nhận kép (DONE)</span>
            <span class="pt-kpi-subtext">Tính thù lao</span>
          </div>
        </div>

        <!-- 3) Buổi đã được book (sắp dạy) -->
        <div class="pt-kpi-card card-blue" id="cardKpiUpcoming" title="Xem ca dạy sắp tới">
          <div class="pt-kpi-card-header">
            <span class="pt-kpi-label">Buổi đã được book</span>
            <div class="pt-kpi-icon-wrap icon-blue">
              <i class="fa-regular fa-calendar-check"></i>
            </div>
          </div>
          <div class="pt-kpi-number" id="kpiUpcomingBookings">--</div>
          <div class="pt-kpi-footer">
            <span class="pt-kpi-pill pill-blue">Sắp dạy (UPCOMING)</span>
            <i class="fa-solid fa-chevron-right pt-kpi-arrow"></i>
          </div>
        </div>

        <!-- 4) Buổi chờ xác nhận -->
        <div class="pt-kpi-card card-amber" id="cardKpiAwaiting" title="Xem ca tập chờ xác nhận">
          <div class="pt-kpi-card-header">
            <span class="pt-kpi-label">Buổi chờ xác nhận</span>
            <div class="pt-kpi-icon-wrap icon-amber">
              <i class="fa-solid fa-clock-rotate-left"></i>
            </div>
          </div>
          <div class="pt-kpi-number" id="kpiAwaitingConfirmation">--</div>
          <div class="pt-kpi-footer">
            <span class="pt-kpi-pill pill-amber">Chờ xác nhận</span>
            <i class="fa-solid fa-chevron-right pt-kpi-arrow"></i>
          </div>
        </div>

        <!-- 5) Yêu cầu phân công mới (PENDING) -->
        <div class="pt-kpi-card card-gold card-fullwidth" id="cardKpiAssignments" title="Xem yêu cầu phân công">
          <div class="pt-kpi-card-header">
            <span class="pt-kpi-label">Yêu cầu phân công mới</span>
            <div class="pt-kpi-icon-wrap icon-gold">
              <i class="fa-solid fa-user-plus"></i>
            </div>
          </div>
          <div class="pt-kpi-number" id="kpiPendingAssignments">--</div>
          <div class="pt-kpi-footer">
            <span class="pt-kpi-pill pill-gold">Chờ HLV phản hồi (PENDING)</span>
            <span class="pt-kpi-action-link">Xem & duyệt <i class="fa-solid fa-arrow-right"></i></span>
          </div>
        </div>
      </div>

      <!-- Phím tắt điều hướng nhanh -->
      <div class="pt-quick-actions-box">
        <div class="pt-quick-actions-header">
          <i class="fa-solid fa-bolt-lightning" style="color: var(--accent-gold);"></i>
          <span>Thao tác nghiệp vụ nhanh</span>
        </div>
        <div class="pt-quick-actions-grid">
          <button type="button" class="pt-quick-btn" id="btnQuickSchedule">
            <div class="pt-quick-btn-icon" style="background: rgba(16, 185, 129, 0.15); color: var(--primary-light);">
              <i class="fa-solid fa-calendar-days"></i>
            </div>
            <div class="pt-quick-btn-text">
              <strong>Lịch dạy hôm nay</strong>
              <small>Xem lịch ca dạy & điểm danh buổi tập</small>
            </div>
            <i class="fa-solid fa-chevron-right pt-quick-btn-arrow"></i>
          </button>

          <button type="button" class="pt-quick-btn" id="btnQuickAssignments">
            <div class="pt-quick-btn-icon" style="background: rgba(245, 158, 11, 0.15); color: var(--accent-gold);">
              <i class="fa-solid fa-user-clock"></i>
            </div>
            <div class="pt-quick-btn-text">
              <strong>Duyệt phân công</strong>
              <small>Yêu cầu chọn HLV từ Hội viên</small>
            </div>
            <i class="fa-solid fa-chevron-right pt-quick-btn-arrow"></i>
          </button>
        </div>
      </div>
    `;

    $container.html(html);
    renderPeriodButtonGroup();
  }

  /**
   * Khởi tạo DevExtreme dxButtonGroup cho bộ lọc thời gian
   */
  function renderPeriodButtonGroup() {
    const $container = $('#dxOverviewPeriodButtonGroup');
    if (!$container.length) return;
    $container.empty();

    $container.dxButtonGroup({
      items: [
        { text: 'Tuần này', value: 'this_week' },
        { text: 'Tháng này', value: 'this_month' },
        { text: 'Tháng trước', value: 'last_month' }
      ],
      keyExpr: 'value',
      selectedItemKeys: [OverviewState.currentPeriod],
      stylingMode: 'outlined',
      onItemClick: function (e) {
        if (e.itemData && e.itemData.value) {
          setPeriod(e.itemData.value);
        }
      }
    });
  }

  /**
   * Gắn sự kiện chuyển đổi thời gian, điều hướng và thử lại
   */
  function bindEvents() {
    // 1. Chuyển đổi kỳ thống kê (TRIGGER)
    $(document).off('click', '.pt-period-btn').on('click', '.pt-period-btn', function () {
      const period = $(this).data('period');
      setPeriod(period);
    });

    // 2. Thử lại khi nạp lỗi (Exception Flow)
    $(document).off('click', '#btnRetryStats').on('click', '#btnRetryStats', function () {
      fetchStats();
    });

    // 3. Chạm thẻ Học viên -> Tab Học viên (Mở đúng Tab Đang phụ trách)
    $(document).off('click', '#cardKpiMembers').on('click', '#cardKpiMembers', function () {
      if (window.ptApp && typeof ptApp.switchTab === 'function') {
        ptApp.switchTab('members');
        if (window.ParadisePTClients && typeof window.ParadisePTClients.switchTab === 'function') {
          setTimeout(() => {
            window.ParadisePTClients.switchTab('assigned');
          }, 60);
        }
        if (window.ptApp && typeof ptApp.showToast === 'function') {
          ptApp.showToast('Đang mở danh sách học viên đang phụ trách', 'info');
        }
      }
    });

    // 4.1. Chạm thẻ "Buổi đã được book" -> Link ĐÚNG đến ca UPCOMING sắp dạy
    $(document).off('click', '#cardKpiUpcoming').on('click', '#cardKpiUpcoming', function () {
      navigateToTargetBooking('UPCOMING');
    });

    // 4.2. Chạm thẻ "Buổi chờ xác nhận" -> Link ĐÚNG đến ca AWAITING_CONFIRMATION
    $(document).off('click', '#cardKpiAwaiting').on('click', '#cardKpiAwaiting', function () {
      navigateToTargetBooking('AWAITING_CONFIRMATION');
    });

    // 4.3. Chạm thẻ "Buổi đã hoàn thành" -> Link ĐÚNG đến ca DONE đã hoàn thành
    $(document).off('click', '#cardKpiCompleted').on('click', '#cardKpiCompleted', function () {
      navigateToTargetBooking('DONE');
    });

    // 4.4. Nút nhanh "Lịch dạy hôm nay" -> Tab Lịch tập hôm nay
    $(document).off('click', '#btnQuickSchedule').on('click', '#btnQuickSchedule', function () {
      if (window.ptApp && typeof ptApp.switchTab === 'function') {
        ptApp.switchTab('schedule');
      }
    });

    // 5. Chạm thẻ Yêu cầu / Nút nhanh Duyệt phân công -> Tab Học viên (Mở đúng Sub-tab Yêu cầu)
    $(document).off('click', '#cardKpiAssignments, #btnQuickAssignments')
      .on('click', '#cardKpiAssignments, #btnQuickAssignments', function () {
        navigateToAssignments();
      });
  }

  /**
   * Điều hướng chính xác đến ca tập theo trạng thái được chọn (UPCOMING / AWAITING / DONE)
   */
  function navigateToTargetBooking(targetStatus) {
    if (!window.ptApp || typeof ptApp.switchTab !== 'function') return;

    const allBookings = OverviewState.rawBookings || window.ParadisePTSchedule?.getState()?.bookings || [];
    let matchedBookings = [];

    if (targetStatus === 'UPCOMING') {
      matchedBookings = allBookings.filter(b => ['BOOKED','UPCOMING'].includes(b.status) && new Date(b.booking_date + 'T' + b.start_time) > new Date());
      // Sắp xếp theo ngày tăng dần để lấy ca sắp tới gần nhất
      matchedBookings.sort((a, b) => {
        const da = (a.booking_date || a.date || '') + ' ' + (a.start_time || a.slot || '');
        const db = (b.booking_date || b.date || '') + ' ' + (b.start_time || b.slot || '');
        return da.localeCompare(db);
      });
    } else if (targetStatus === 'AWAITING_CONFIRMATION') {
      matchedBookings = allBookings.filter(b => 
        b.status === 'AWAITING_CONFIRMATION' || 
        b.status === 'PENDING_COMPLETION' ||
        (!['CANCELLED', 'NO_SHOW', 'COMPLETED', 'DONE'].includes(b.status) && 
         ((b.pt_confirmed_at && !b.member_confirmed_at) || (!b.pt_confirmed_at && b.member_confirmed_at)))
      );
      matchedBookings.sort((a, b) => {
        const da = (a.booking_date || a.date || '');
        const db = (b.booking_date || b.date || '');
        return da.localeCompare(db);
      });
    } else if (targetStatus === 'DONE') {
      matchedBookings = allBookings.filter(b => b.status === 'COMPLETED' || b.status === 'DONE');
      // Sắp xếp theo ngày giảm dần để lấy ca vừa hoàn thành gần nhất
      matchedBookings.sort((a, b) => {
        const da = (a.booking_date || a.date || '');
        const db = (b.booking_date || b.date || '');
        return db.localeCompare(da);
      });
    }

    // Chuyển sang Tab Lịch
    ptApp.switchTab('schedule');

    if (matchedBookings.length > 0) {
      const target = matchedBookings[0];
      const rawDate = target.booking_date || target.date;
      const targetDate = rawDate ? rawDate.split('T')[0] : null;

      if (targetDate && window.ParadisePTSchedule && typeof window.ParadisePTSchedule.selectDate === 'function') {
        setTimeout(() => {
          window.ParadisePTSchedule.selectDate(targetDate, target.id, targetStatus);
        }, 80);
      }

      const labelMap = {
        UPCOMING: 'ca tập đã đặt (sắp dạy)',
        AWAITING_CONFIRMATION: 'ca tập đang chờ xác nhận',
        DONE: 'buổi tập đã hoàn thành'
      };
      if (window.ptApp && typeof ptApp.showToast === 'function') {
        ptApp.showToast(`Đang mở ${labelMap[targetStatus]} ngày ${formatDateDisplay(targetDate)}`, 'info');
      }
    } else {
      const labelMap = {
        UPCOMING: 'Không có ca tập nào đang chờ dạy trong kỳ',
        AWAITING_CONFIRMATION: 'Không có ca tập nào đang chờ xác nhận',
        DONE: 'Chưa có buổi tập nào hoàn thành trong kỳ'
      };
      if (window.ptApp && typeof ptApp.showToast === 'function') {
        ptApp.showToast(labelMap[targetStatus], 'info');
      }
    }
  }

  /**
   * Đổi kỳ thống kê (TRIGGER: AF-01)
   */
  function setPeriod(period) {
    if (!['this_week', 'this_month', 'last_month'].includes(period)) return;

    OverviewState.currentPeriod = period;

    const bgInstance = $('#dxOverviewPeriodButtonGroup').dxButtonGroup('instance');
    if (bgInstance) {
      bgInstance.option('selectedItemKeys', [period]);
    }
    $('.pt-period-btn').removeClass('active');
    $('.pt-period-btn[data-period="' + period + '"]').addClass('active');

    fetchStats();
  }

  /**
   * Cập nhật các con số thống kê trên giao diện
   */
  function updateKpiNumbers(data) {
    if (!data) return;
    animateCount('kpiAssignedMembers', data.assignedMembers || 0);
    animateCount('kpiCompletedSessions', data.completedSessions || 0);
    animateCount('kpiUpcomingBookings', data.upcomingBookings || 0);
    animateCount('kpiAwaitingConfirmation', data.awaitingConfirmation || 0);
    animateCount('kpiPendingAssignments', data.pendingAssignments || 0);
  }

  /**
   * Hiệu ứng số nhảy mượt mà
   */
  function animateCount(elementId, targetValue) {
    const $el = $('#' + elementId);
    if (!$el.length) return;

    const currentVal = parseInt($el.text(), 10) || 0;
    if (currentVal === targetValue) {
      $el.text(targetValue);
      return;
    }

    $({ count: currentVal }).animate(
      { count: targetValue },
      {
        duration: 350,
        easing: 'swing',
        step: function () {
          $el.text(Math.floor(this.count));
        },
        complete: function () {
          $el.text(targetValue);
        }
      }
    );
  }

  /**
   * Hiển thị banner lỗi kết nối mạng (Exception Flow)
   */
  function showErrorBanner(msg) {
    $('#overviewErrorText').text(msg || 'Không thể nạp dữ liệu thống kê, vui lòng kiểm tra kết nối mạng');
    $('#overviewErrorBanner').slideDown(200);
  }

  /**
   * Ẩn banner lỗi kết nối mạng
   */
  function hideErrorBanner() {
    $('#overviewErrorBanner').slideUp(150);
  }

  /**
   * Tải và tính toán số liệu thống kê động từ Backend PostgreSQL API (PT06-US01 Main Flow)
   */
  async function fetchStats() {
    const ptId = window.ptApp?.currentUser?.pt_profile_id;
    if (!ptId) return;
    const selected = OverviewState.currentPeriod;
    const period = { this_week: 'week', this_month: 'month', last_month: 'last_month' }[selected];
    OverviewState.isLoading = true;
    OverviewState.hasError = false;
    hideErrorBanner();
    $('.pt-kpi-number').text('--');
    try {
      const [res, bookings] = await Promise.all([
        apiClient.mobile.ptStatistics(period),
        apiClient.pt.listBookings()
      ]);
      if (window.ptApp?.currentUser?.pt_profile_id !== ptId || OverviewState.currentPeriod !== selected) return;
      const m = res.data.metrics;
      OverviewState.kpiData[selected] = {
        assignedMembers: m.active_students, completedSessions: m.completed_sessions,
        upcomingBookings: m.upcoming_sessions, awaitingConfirmation: m.awaiting_confirmation,
        pendingAssignments: m.pending_requests
      };
      OverviewState.rawBookings = (bookings.data || []).filter(b => b.pt_id === ptId && b.booking_date >= res.data.start_date && b.booking_date <= res.data.end_date);
      updateKpiNumbers(OverviewState.kpiData[selected]);
    } catch (err) {
      OverviewState.hasError = true;
      $('#kpiAssignedMembers, #kpiCompletedSessions, #kpiUpcomingBookings, #kpiAwaitingConfirmation, #kpiPendingAssignments').text('--');
      showErrorBanner('Không thể nạp dữ liệu thống kê, vui lòng kiểm tra kết nối mạng');
    } finally { OverviewState.isLoading = false; }
  }

  /**
   * Hàm gọi từ các module khác (như Schedule khi hoàn thành ca tập hoặc Clients khi duyệt yêu cầu)
   */
  function refresh() {
    return fetchStats();
  }

  /**
   * Hàm điều hướng sang Tab Học viên và mở Sub-tab Yêu cầu phân công
   */
  function navigateToAssignments() {
    if (window.ptApp && typeof ptApp.switchTab === 'function') {
      ptApp.switchTab('members');
      if (window.ParadisePTClients && typeof window.ParadisePTClients.switchTab === 'function') {
        setTimeout(() => {
          window.ParadisePTClients.switchTab('requests');
        }, 100);
      }
    }
  }

  /**
   * Tự động inject CSS cho Module PT06
   */
  function injectOverviewStyles() {
    if (document.getElementById('pt-overview-custom-styles')) return;

    const style = document.createElement('style');
    style.id = 'pt-overview-custom-styles';
    style.textContent = `
      .pt-overview-hero {
        border-bottom: 1px solid var(--border-color);
        padding: 4px 0 14px;
        margin-bottom: 14px;
        position: relative;
        overflow: hidden;
      }
      .pt-hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 700;
        color: var(--primary-light);
        background: rgba(16, 185, 129, 0.18);
        padding: 3px 10px;
        border-radius: var(--radius-full);
        margin-bottom: 8px;
        border: 1px solid rgba(52, 211, 153, 0.2);
      }
      .pt-hero-title {
        font-size: 17px;
        font-weight: 800;
        color: #FFFFFF;
        margin-bottom: 4px;
      }
      .pt-hero-subtitle {
        font-size: 12px;
        color: var(--text-muted);
        line-height: 1.45;
        margin: 0;
      }

      /* Exception Flow: Error Banner */
      .pt-overview-error-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.35);
        border-radius: var(--radius-md);
        padding: 10px 12px;
        margin-bottom: 12px;
        gap: 8px;
      }
      .pt-error-banner-content {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: #fca5a5;
        line-height: 1.35;
      }
      .pt-error-icon {
        color: #ef4444;
        font-size: 15px;
        flex-shrink: 0;
      }
      .pt-error-retry-btn {
        background: rgba(239, 68, 68, 0.25);
        border: 1px solid rgba(239, 68, 68, 0.5);
        color: #FFFFFF;
        border-radius: var(--radius-sm);
        padding: 5px 10px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        white-space: nowrap;
        transition: background 0.2s ease;
      }
      .pt-error-retry-btn:hover {
        background: rgba(239, 68, 68, 0.4);
      }

      /* Segmented Period Tabs */
      .pt-period-filter-wrapper {
        margin-bottom: 14px;
      }
      .pt-period-tabs {
        display: flex;
        background: var(--bg-input);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 3px;
        gap: 4px;
      }
      .pt-period-btn {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 600;
        padding: 8px 4px;
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }
      .pt-period-btn.active {
        background: var(--primary);
        color: #FFFFFF;
        font-weight: 800;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
      }

      /* 5 KPI Stat Cards Grid */
      .pt-kpi-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 16px;
      }
      .pt-kpi-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 13px;
        position: relative;
        cursor: pointer;
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .pt-kpi-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.16);
      }
      .pt-kpi-card.card-fullwidth {
        grid-column: span 2;
      }
      .pt-kpi-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 6px;
        margin-bottom: 8px;
      }
      .pt-kpi-label {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--text-muted);
        line-height: 1.3;
      }
      .pt-kpi-icon-wrap {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        flex-shrink: 0;
      }
      .icon-cyan { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
      .icon-emerald { background: rgba(16, 185, 129, 0.15); color: #10b981; }
      .icon-blue { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
      .icon-amber { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
      .icon-gold { background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.2)); color: #fbbf24; }

      .pt-kpi-number {
        font-size: 26px;
        font-weight: 800;
        color: #FFFFFF;
        line-height: 1.1;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
      }

      .pt-kpi-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 10px;
      }
      .pt-kpi-pill {
        padding: 2px 7px;
        border-radius: var(--radius-full);
        font-weight: 600;
        font-size: 10px;
      }
      .pill-cyan { background: rgba(6, 182, 212, 0.15); color: #38bdf8; }
      .pill-emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }
      .pill-blue { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
      .pill-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
      .pill-gold { background: rgba(245, 158, 11, 0.2); color: #fef08a; font-weight: 700; }

      .pt-kpi-subtext {
        color: var(--text-sub);
        font-size: 10px;
      }
      .pt-kpi-arrow {
        color: var(--text-sub);
        font-size: 11px;
      }
      .pt-kpi-action-link {
        color: var(--accent-gold);
        font-weight: 700;
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      /* Card borders with subtle glow */
      .card-cyan { border-left: 3.5px solid #06b6d4; }
      .card-emerald { border-left: 3.5px solid #10b981; }
      .card-blue { border-left: 3.5px solid #3b82f6; }
      .card-amber { border-left: 3.5px solid #f59e0b; }
      .card-gold {
        border: 1px solid rgba(245, 158, 11, 0.3);
        background: linear-gradient(145deg, rgba(20, 20, 20, 0.9), rgba(30, 25, 10, 0.6));
      }

      /* Quick Actions Box */
      .pt-quick-actions-box {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-md);
        padding: 14px;
      }
      .pt-quick-actions-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 700;
        color: #FFFFFF;
        margin-bottom: 12px;
      }
      .pt-quick-actions-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pt-quick-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        background: var(--bg-surface);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-sm);
        padding: 10px 12px;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s ease;
      }
      .pt-quick-btn:hover {
        background: var(--bg-card-hover);
        border-color: rgba(255, 255, 255, 0.15);
      }
      .pt-quick-btn-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
      }
      .pt-quick-btn-text {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .pt-quick-btn-text strong {
        font-size: 13px;
        color: #FFFFFF;
        font-weight: 700;
      }
      .pt-quick-btn-text small {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .pt-quick-btn-arrow {
        color: var(--text-sub);
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  // Tự động gắn CSS khi nạp script
  if (typeof document !== 'undefined') {
    injectOverviewStyles();
  }

  return {
    init,
    reset: () => { OverviewState.rawBookings = []; OverviewState.kpiData = {this_week:null,this_month:null,last_month:null}; $('#kpiAssignedMembers, #kpiCompletedSessions, #kpiUpcomingBookings, #kpiAwaitingConfirmation, #kpiPendingAssignments').text('--'); },
    setPeriod,
    fetchStats,
    refresh,
    navigateToAssignments,
    getState: () => OverviewState
  };
});
