/**
 * ==========================================================================
 * PARADISE GYM - MOBILE PT APP (TAB 3: anti-3-PT)
 * MODULE PT06: TỔNG QUAN HIỆU SUẤT PT (PERFORMANCE OVERVIEW DASHBOARD)
 * ==========================================================================
 * - PT06-US01: Dashboard tổng quan năng suất huấn luyện của PT trong kỳ
 * - Bộ lọc mốc thời gian: Tuần này / Tháng này (mặc định) / Tháng trước
 * - Cụm 4 thẻ chỉ số KPI hiệu suất:
 *   1) Học viên phụ trách: Tổng số học viên có hợp đồng PT ACTIVE
 *   2) Buổi đã hoàn thành: Số ca tập đạt đủ xác nhận kép DONE trong kỳ
 *   3) Buổi đã được book (sắp dạy): Số ca tập trạng thái UPCOMING trong tương lai
 *   4) Buổi chờ xác nhận: Số ca tập trạng thái AWAITING_CONFIRMATION
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
  let commissionRequest = 0;
  let statsRequest = 0;
  const escapeHtml = value => $('<span>').text(value ?? '').html();
  const OverviewState = {
    currentPeriod: 'this_month', // 'this_week' | 'this_month' (mặc định) | 'last_month'
    isLoading: false,
    hasError: false,
    errorMessage: '',
    kpiData: { this_week: null, this_month: null, last_month: null },
    commMonth: new Date().getMonth() + 1,
    commYear: new Date().getFullYear(),
    commData: null
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
        <h3 class="pt-hero-title">Tổng quan</h3>
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
            <span class="pt-kpi-pill pill-cyan">Đang phụ trách</span>
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
            <span class="pt-kpi-pill pill-emerald">Đã xác nhận</span>
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
            <span class="pt-kpi-pill pill-blue">Sắp dạy</span>
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

        <!-- 5) Lớp học cộng đồng -->
        <div class="pt-kpi-card card-purple card-fullwidth" id="cardKpiCommunity" title="Xem lớp học cộng đồng">
          <div class="pt-kpi-card-header">
            <span class="pt-kpi-label">Lớp học cộng đồng</span>
            <div class="pt-kpi-icon-wrap icon-purple">
              <i class="fa-solid fa-users-rectangle"></i>
            </div>
          </div>
          <div class="pt-kpi-number" id="kpiCommunityClasses">--</div>
          <div class="pt-kpi-footer">
            <span class="pt-kpi-pill pill-purple">Phụ trách</span>
            <i class="fa-solid fa-chevron-right pt-kpi-arrow"></i>
          </div>
        </div>

      </div>

      <!-- Thẻ Thù lao & Hoa hồng tháng (PT06-US02) -->
      <div class="pt-commission-hero-card" id="cardPtCommissions" role="button" tabindex="0">
        <div class="pt-comm-card-badge">
          <i class="fa-solid fa-file-invoice-dollar"></i> Thù lao & hoa hồng
        </div>
        <div class="pt-comm-card-main">
          <div class="pt-comm-card-left" style="flex: 1; min-width: 0;">
            <span class="pt-comm-card-title">Tổng thu nhập ước tính tháng này</span>
            <div class="pt-comm-card-amount" id="overviewCommAmount">-- <small>VNĐ</small></div>
            <div class="pt-comm-card-breakdown" style="margin-top: 6px; font-size: 11.5px; color: #78350f; display: flex; flex-direction: column; gap: 2px;">
              <div>Hoa hồng gói PT/COMBO: <strong id="overviewPtCommAmount">--</strong></div>
              <div>Thù lao lớp cộng đồng: <strong id="overviewCommunityCompAmount">--</strong></div>
            </div>
            <div class="pt-comm-card-sub" id="overviewCommStatus" style="margin-top: 6px;"><span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #996217; font-size: 12px; padding: 2px 8px; border-radius: 999px;">Chờ chi trả</span></div>
          </div>
          <div class="pt-comm-card-right" style="flex-shrink: 0; text-align: right;">
            <div class="pt-comm-btn-circle">
              <i class="fa-solid fa-arrow-right"></i>
            </div>
            <span class="pt-comm-rate-pill" id="overviewCommRate">--% hoa hồng</span>
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
            <div class="pt-quick-btn-icon" style="background: rgba(16, 185, 129, 0.15); color: var(--primary);">
              <i class="fa-solid fa-calendar-days"></i>
            </div>
            <div class="pt-quick-btn-text">
              <strong>Lịch dạy hôm nay</strong>
              <small>Xem lịch ca dạy & điểm danh buổi tập</small>
            </div>
            <i class="fa-solid fa-chevron-right pt-quick-btn-arrow"></i>
          </button>

          <button type="button" class="pt-quick-btn" id="btnQuickBooking">
            <div class="pt-quick-btn-icon" style="background: rgba(245, 158, 11, 0.15); color: var(--accent-gold);">
              <i class="fa-solid fa-user-clock"></i>
            </div>
            <div class="pt-quick-btn-text">
              <strong>Đặt lịch cho học viên</strong>

            </div>
            <i class="fa-solid fa-chevron-right pt-quick-btn-arrow"></i>
          </button>

          <button type="button" class="pt-quick-btn" id="btnQuickCommissions">
            <div class="pt-quick-btn-icon" style="background: rgba(245, 158, 11, 0.15); color: var(--accent-gold);">
              <i class="fa-solid fa-file-invoice-dollar"></i>
            </div>
            <div class="pt-quick-btn-text">
              <strong>Bảng kê thu nhập tháng</strong>
              <small>Chi tiết hoa hồng PT & thù lao lớp cộng đồng</small>
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
    let refreshTouch = null;
    $('#mainContent').off('.ptPullRefresh')
      .on('touchstart.ptPullRefresh', function (event) {
        const touch = event.originalEvent.touches;
        refreshTouch = window.ptApp?.currentTab === 'commissions' && this.scrollTop === 0 && touch.length === 1 ? { x: touch[0].clientX, y: touch[0].clientY } : null;
      }).on('touchend.ptPullRefresh', function (event) {
        const touch = event.originalEvent.changedTouches[0];
        if (refreshTouch && touch && this.scrollTop === 0 && touch.clientY - refreshTouch.y >= 70 && Math.abs(touch.clientX - refreshTouch.x) < 45) {
          loadCommissionDetails(OverviewState.commMonth, OverviewState.commYear);
        }
        refreshTouch = null;
      }).on('touchcancel.ptPullRefresh', () => { refreshTouch = null; });
    $('.pt-kpi-card').attr({ role: 'button', tabindex: '0' });
    $(document).off('keydown.ptOverview').on('keydown.ptOverview', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && $(e.target).is('.pt-kpi-card, #cardPtCommissions')) {
        e.preventDefault();
        $(e.target).trigger('click');
      }
    });
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

    $(document).off('click', '#btnQuickBooking').on('click', '#btnQuickBooking', async function () {
      await window.ptApp.switchTab('schedule');
      window.ParadisePTSchedule.openBookingModal();
    });

    // 6. Chạm thẻ Hoa hồng hoặc Nút nhanh Bảng kê hoa hồng (PT06-US02)
    $(document).off('click', '#cardPtCommissions, #btnQuickCommissions')
      .on('click', '#cardPtCommissions, #btnQuickCommissions', function () {
        openCommissionModal();
      });

    // 7. Chuyển đổi Sub-tab trong Menu Thu nhập
    $(document).off('click', '.pt-income-subtab-btn').on('click', '.pt-income-subtab-btn', function () {
      const subtab = $(this).data('subtab');
      $('.pt-income-subtab-btn').removeClass('active').css({ background: 'transparent', color: 'var(--text-muted)', fontWeight: '600' });
      $(this).addClass('active').css({ background: 'var(--primary)', color: '#FFFFFF', fontWeight: '700' });
      $('.pt-income-subtab-content').hide();
      $(`#subtab-${subtab.replace(/_/g, '-')}`).show();
    });

    // 7.1. Chạm thẻ chuyển sang tab con từ Bảng tóm tắt nguồn thu nhập
    $(document).off('click', '.pt-income-source-card').on('click', '.pt-income-source-card', function () {
      const targetSubtab = $(this).data('target-subtab');
      if (targetSubtab) {
        $(`.pt-income-subtab-btn[data-subtab="${targetSubtab}"]`).trigger('click');
      }
    });

    // 7.2. Chạm thẻ KPI Lớp học cộng đồng trên Tổng quan -> chuyển sang Menu Thu nhập & mở tab Thù lao lớp CĐ
    $(document).off('click', '#cardKpiCommunity').on('click', '#cardKpiCommunity', function () {
      openCommissionModal();
      $('.pt-income-subtab-btn[data-subtab="community_comp"]').trigger('click');
    });

    // 7.3. Chạm vào card lớp CĐ hoặc nút Xem danh sách học viên
    $(document).off('click', '.pt-comm-class-card, .btn-comm-view-members').on('click', '.pt-comm-class-card, .btn-comm-view-members', function (e) {
      e.stopPropagation();
      const classId = $(this).data('class-id');
      openCommunityClassModal(classId);
    });

    // 8. Chuyển đổi kỳ thù lao (Chips: Tháng này / Tháng trước / Tháng khác)
    $(document).off('click', '.pt-comm-chip').on('click', '.pt-comm-chip', function () {
      const filter = $(this).data('filter');
      $('.pt-comm-chip').removeClass('active').css({ background: 'var(--bg-surface)', color: 'var(--text-muted)' });
      $(this).addClass('active').css({ background: 'var(--primary)', color: '#FFFFFF' });

      const now = new Date();
      if (filter === 'this_month') {
        $('#commCustomMonthWrap').hide();
        OverviewState.commMonth = now.getMonth() + 1;
        OverviewState.commYear = now.getFullYear();
        loadCommissionDetails(OverviewState.commMonth, OverviewState.commYear);
      } else if (filter === 'last_month') {
        $('#commCustomMonthWrap').hide();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        OverviewState.commMonth = prev.getMonth() + 1;
        OverviewState.commYear = prev.getFullYear();
        loadCommissionDetails(OverviewState.commMonth, OverviewState.commYear);
      } else if (filter === 'custom') {
        $('#commCustomMonthWrap').show();
        const curM = String(OverviewState.commMonth).padStart(2, '0');
        $('#commMonthInput').val(`${OverviewState.commYear}-${curM}`);
      }
    });

    // 9. Thay đổi Month Input tùy chọn
    $(document).off('change', '#commMonthInput').on('change', '#commMonthInput', function () {
      const val = $(this).val(); // "YYYY-MM"
      if (!val) return;
      const [y, m] = val.split('-').map(Number);
      if (y && m) {
        OverviewState.commMonth = m;
        OverviewState.commYear = y;
        loadCommissionDetails(m, y);
      }
    });

    // 10. Nút Refresh bảng kê hoa hồng
    $(document).off('click', '#btnRefreshCommSheet').on('click', '#btnRefreshCommSheet', function () {
      loadCommissionDetails(OverviewState.commMonth, OverviewState.commYear);
    });
  }

  /**
   * Điều hướng chính xác đến ca tập theo trạng thái được chọn (UPCOMING / AWAITING / DONE)
   */
  async function navigateToTargetBooking(targetStatus) {
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
    await ptApp.switchTab('schedule');

    if (matchedBookings.length > 0) {
      const target = matchedBookings[0];
      const rawDate = target.booking_date || target.date;
      const targetDate = rawDate ? rawDate.split('T')[0] : null;

      if (targetDate && window.ParadisePTSchedule && typeof window.ParadisePTSchedule.selectDate === 'function') {
        window.ParadisePTSchedule.selectDate(targetDate, target.id, targetStatus);
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
    animateCount('kpiCommunityClasses', data.communityClasses || 0);
  }

  /**
   * Hiệu ứng số nhảy mượt mà
   */
  function animateCount(elementId, targetValue) {
    const version = statsRequest;
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
          if (version === statsRequest) $el.text(Math.floor(this.count));
        },
        complete: function () {
          if (version === statsRequest) $el.text(targetValue);
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
    const version = ++statsRequest;
    const selected = OverviewState.currentPeriod;
    const period = { this_week: 'week', this_month: 'month', last_month: 'last_month' }[selected];
    OverviewState.isLoading = true;
    OverviewState.hasError = false;
    hideErrorBanner();
    $('.pt-kpi-number').text('--');
    $('#overviewCommAmount, #overviewPtCommAmount, #overviewCommunityCompAmount, #overviewCommRate').text('--');
    $('#overviewCommStatus').text('Đang tải');
    try {
      const [res, bookings, classesRes] = await Promise.all([
        apiClient.mobile.ptStatistics(period),
        apiClient.pt.listBookings(),
        apiClient.request('/community-classes?instructor_id=' + ptId)
      ]);
      if (version !== statsRequest || window.ptApp?.currentUser?.pt_profile_id !== ptId || OverviewState.currentPeriod !== selected) return;
      const m = res.data.metrics;
      const allCommunityClasses = classesRes.data || classesRes || [];
      const periodClasses = (Array.isArray(allCommunityClasses) ? allCommunityClasses : []).filter(c => {
        const d = (c.class_date || '').split('T')[0];
        return d >= res.data.start_date && d <= res.data.end_date;
      });

      OverviewState.kpiData[selected] = {
        assignedMembers: m.active_students, completedSessions: m.completed_sessions,
        upcomingBookings: m.upcoming_sessions, awaitingConfirmation: m.awaiting_confirmation,
        pendingAssignments: m.pending_requests,
        communityClasses: periodClasses.length
      };
      OverviewState.rawBookings = (bookings.data || []).filter(b => b.pt_id === ptId && b.booking_date >= res.data.start_date && b.booking_date <= res.data.end_date);
      updateKpiNumbers(OverviewState.kpiData[selected]);

      // PT06-US02: Nạp thù lao hoa hồng và lớp cộng đồng tháng này hiển thị lên Overview Hero Card
      try {
        const curDate = new Date();
        const curMonth = curDate.getMonth() + 1;
        const curYear = curDate.getFullYear();
        const curMonthStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;
        const commRes = await apiClient.pt.getMyCommissions({ month: curMonth, year: curYear });
        if (version !== statsRequest || window.ptApp?.currentUser?.pt_profile_id !== ptId || OverviewState.currentPeriod !== selected) return;
        const commSummary = commRes.data?.summary || commRes.summary;
        if (!commSummary) throw new Error('Missing commission summary');

        // Tính thù lao lớp cộng đồng trong tháng này
        const curMonthClasses = (Array.isArray(allCommunityClasses) ? allCommunityClasses : []).filter(c => {
          const d = (c.class_date || '').slice(0, 7);
          return d === curMonthStr;
        });
        const communityComp = curMonthClasses.reduce((sum, c) => {
          const comp = Number(c.total_compensation || ((Number(c.base_price) || 0) + (Number(c.bonus_amount) || 0)));
          return sum + comp;
        }, 0);

        const ptCommAmount = Number(commSummary.total_commission_amount || 0);
        const totalIncome = ptCommAmount + communityComp;

        $('#overviewCommAmount').html(`${formatVnd(totalIncome)} <small>VNĐ</small>`);
        $('#overviewPtCommAmount').text(formatVnd(ptCommAmount) + ' đ');
        $('#overviewCommunityCompAmount').text(formatVnd(communityComp) + ' đ');
        $('#overviewCommRate').text(`${commSummary.commission_percentage || 0}% hoa hồng`);
        const stMap = {
          PENDING: { label: 'Chờ chi trả', bg: 'rgba(245, 158, 11, 0.2)', color: '#996217' },
          APPROVED: { label: 'Chờ chi trả', bg: 'rgba(59, 130, 246, 0.2)', color: '#286aa4' },
          PENDING_CONFIRMATION: { label: 'Chờ bạn xác nhận', bg: 'rgba(2, 132, 199, 0.2)', color: '#0284c7' },
          PAID: { label: 'Đã chi trả', bg: 'rgba(16, 185, 129, 0.2)', color: '#237b58' }
        };
        const curSt = stMap[commSummary.status] || stMap.PENDING;
        $('#overviewCommStatus').html(`<span class="badge" style="background: ${curSt.bg}; color: ${curSt.color}; font-size: 12px; padding: 2px 8px; border-radius: 999px;">${curSt.label}</span>`);
      } catch (cErr) {
        if (version !== statsRequest) return;
        $('#overviewCommAmount, #overviewPtCommAmount, #overviewCommunityCompAmount, #overviewCommRate').text('--');
        $('#overviewCommStatus').text('Không thể tải');
        console.warn('Could not fetch commission summary for overview:', cErr);
      }
    } catch (err) {
      if (version !== statsRequest || window.ptApp?.currentUser?.pt_profile_id !== ptId || OverviewState.currentPeriod !== selected) return;
      $('#overviewCommAmount, #overviewPtCommAmount, #overviewCommunityCompAmount, #overviewCommRate').text('--');
      $('#overviewCommStatus').text('Không thể tải');
      OverviewState.hasError = true;
      $('#kpiAssignedMembers, #kpiCompletedSessions, #kpiUpcomingBookings, #kpiAwaitingConfirmation, #kpiPendingAssignments, #kpiCommunityClasses').text('--');
      showErrorBanner('Không thể nạp dữ liệu thống kê, vui lòng kiểm tra kết nối mạng');
    } finally { if (version === statsRequest) OverviewState.isLoading = false; }
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
   * Định dạng số tiền VNĐ chuẩn Việt Nam
   */
  function formatVnd(val) {
    const n = Math.round(Number(val) || 0);
    return n.toLocaleString('vi-VN');
  }

  /**
   * Existing overview entry points now navigate to the dedicated commission page.
   */
  function openCommissionModal() {
    return window.ptApp.switchTab('commissions');
  }

  /**
   * Compatibility entry point for returning to overview.
   */
  function closeCommissionModal() {
    if (window.ptApp?.currentTab === 'commissions') window.ptApp.switchTab('overview');
  }

  /**
   * Nạp chi tiết Bảng kê hoa hồng từ Backend API (PT06-US02 Main Flow)
   */
  async function loadCommissionDetails(month, year) {
    const version = ++commissionRequest;
    $('#commReconciliationError').hide().empty();
    $('#commTotalAmount, #commRate, #commSessionsCount, #commBaseRevenue, #commListSub').text('--');
    $('#commCommunityTotalComp, #commCommunityBasePrice, #commCommunityBonusAmount, #commCommunityClassesCount, #commCommunitySlots, #commCommunityAvgComp, #commCommunityListSub').text('--');
    $('#summaryTotalIncomeAmount, #summaryPtCommAmount, #summaryCommunityCompAmount, #summaryTotalSessionsCount').text('--');
    $('#summaryPtCommSub, #summaryPtCommVal, #summaryCommunityCompSub, #summaryCommunityCompVal').text('--');
    $('#commStatusBadge, #summaryIncomeStatusBadge').text('Đang tải');
    $('#commPaidDateWrap').hide();
    $('#commConfirmationBox').hide();
    const $list = $('#commSessionsList');
    const $commList = $('#commCommunityCompList');
    $list.html(`
      <div style="text-align: center; padding: 30px 10px; color: var(--text-muted); font-size: 12px;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 20px; margin-bottom: 8px;"></i>
        <div>Đang nạp bảng kê hoa hồng tháng ${month}/${year}...</div>
      </div>
    `);
    $commList.html(`
      <div style="text-align: center; padding: 24px 10px; color: var(--text-muted); font-size: 12px;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 20px; margin-bottom: 8px; color: #7c3aed;"></i>
        <div>Đang nạp thù lao lớp cộng đồng tháng ${month}/${year}...</div>
      </div>
    `);

    try {
      const ptId = window.ptApp?.currentUser?.pt_profile_id;
      const [res, classesRes] = await Promise.all([
        apiClient.pt.getMyCommissions({ month, year }),
        ptId ? apiClient.request(`/community-classes?instructor_id=${ptId}`) : Promise.resolve({ data: [] })
      ]);
      if (version !== commissionRequest) return;
      const summary = res.data?.summary || res.summary;
      const sessions = res.data?.sessions || res.sessions;
      const allCommunityClasses = Array.isArray(classesRes?.data) ? classesRes.data : (Array.isArray(classesRes) ? classesRes : []);

      // -------------------------------------------------------------
      // 1. XỬ LÝ SUBTAB 2: GÓI PT / COMBO (HOA HỒNG)
      // -------------------------------------------------------------
      let totalComm = 0;
      let rate = 0;
      let sessionsCount = 0;
      let baseRev = 0;
      let status = 'PENDING';

      if (!summary) {
        $('#commTotalAmount').text('--');
        $('#commRate').text('--%');
        $('#commSessionsCount, #commBaseRevenue').text('--');
        $('#commStatusBadge').text('Chưa có dữ liệu').css({ background: 'rgba(239, 68, 68, 0.2)', color: '#c43d40' });
        $list.html(`
          <div style="text-align: center; padding: 24px 12px; color: #c43d40; font-size: 12px;">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 24px; margin-bottom: 6px;"></i>
            <p>Chưa nhận được bảng kê hoa hồng. Vui lòng thử lại hoặc liên hệ QTV.</p>
          </div>
        `);
      } else {
        totalComm = Number(summary.total_commission_amount) || 0;
        rate = Number(summary.commission_percentage) || 0;
        sessionsCount = summary.total_pt_sessions_taught || 0;
        baseRev = Number(summary.pt_revenue_share) || 0;
        status = summary.status || 'PENDING';

        $('#commTotalAmount').html(`${formatVnd(totalComm)} <small style="font-size: 14px; color: #996217;">VNĐ</small>`);
        $('#commRate').text(`${rate}%`);
        $('#commSessionsCount').text(`${sessionsCount} buổi`);
        $('#commBaseRevenue').text(`${formatVnd(baseRev)} đ`);

        const statusMap = {
          PENDING: { label: 'Chờ chi trả', bg: 'rgba(245, 158, 11, 0.2)', color: '#996217' },
          APPROVED: { label: 'Chờ chi trả', bg: 'rgba(59, 130, 246, 0.2)', color: '#286aa4' },
          PENDING_CONFIRMATION: { label: 'Chờ bạn xác nhận', bg: 'rgba(2, 132, 199, 0.2)', color: '#0284c7' },
          PAID: { label: 'Đã chi trả', bg: 'rgba(16, 185, 129, 0.2)', color: '#237b58' }
        };
        const st = statusMap[status] || statusMap.PENDING;
        $('#commStatusBadge').text(st.label).css({ background: st.bg, color: st.color });

        const items = Array.isArray(sessions) ? sessions : [];
        if (status === 'PAID' && (res.data?.details_snapshot_available ?? res.details_snapshot_available) === false) {
          $('#commListSub').text('Chưa có bản chốt chi tiết');
          $list.html('<p class="pt-empty-desc">Bảng kê này đã chi trả trước khi hệ thống lưu chi tiết từng buổi. Số tổng đã chốt được giữ nguyên; không có bản chốt chi tiết để đối chiếu.</p>');
        } else {
          $('#commListSub').text(`${items.length} ca tập`);
          const sum = key => items.reduce((total, item) => total + Number(item[key]), 0);
          if (items.length !== Number(sessionsCount) || !Number.isFinite(sum('session_pt_value')) || !Number.isFinite(sum('session_commission')) || Math.abs(sum('session_pt_value') - baseRev) > 0.011 || Math.abs(sum('session_commission') - totalComm) > 0.011) {
            $('#commReconciliationError').text('Chưa đối soát được: số tổng và chi tiết không khớp. Vui lòng làm mới hoặc liên hệ QTV.').show();
          }

          if (items.length === 0) {
            $list.html(`
              <div style="text-align: center; padding: 28px 12px; color: var(--text-muted); font-size: 12px;">
                <i class="fa-solid fa-calendar-xmark" style="font-size: 28px; margin-bottom: 8px; opacity: 0.5;"></i>
                <p style="margin: 0;">Bạn chưa có buổi dạy hoàn thành nào trong tháng này. Hãy tiếp tục cố gắng!</p>
              </div>
            `);
          } else {
            let rowsHtml = '';
            items.forEach((s) => {
              const dateStr = s.booking_date ? new Date(s.booking_date).toLocaleDateString('vi-VN') : '--';
              const timeStr = (s.start_time && s.end_time) ? `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}` : '';
              const sessionVal = formatVnd(s.session_pt_value);
              const sessionComm = formatVnd(s.session_commission);

              // Nhãn phân loại gói PT
              const pkgName = s.package_name_snapshot || s.package_name || '';
              const isCombo = /combo/i.test(pkgName);
              const isGroup = /nhóm|group|1-nhiều/i.test(pkgName);
              const pkgBadge = isCombo 
                ? '<span class="badge" style="background:#e0e7ff;color:#4338ca;font-size:10.5px;padding:1px 6px;margin-right:4px;">Combo PT</span>'
                : isGroup
                  ? '<span class="badge" style="background:#fef3c7;color:#b45309;font-size:10.5px;padding:1px 6px;margin-right:4px;">PT Nhóm</span>'
                  : '<span class="badge" style="background:#ecfdf5;color:#047857;font-size:10.5px;padding:1px 6px;margin-right:4px;">PT 1:1</span>';

              rowsHtml += `
                <div class="pt-comm-session-item" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; flex-wrap: wrap;">
                      <i class="fa-regular fa-clock" style="color: var(--primary);"></i>
                      <span>${timeStr} • ${dateStr}</span>
                      <span class="badge" style="background: rgba(52, 211, 153, 0.15); color: #237b58; font-size: 12px; padding: 1px 6px;">Buổi #${s.session_number ?? '--'}</span>
                    </div>
                    <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${escapeHtml(s.member_name || 'Hội viên')} <small style="color: var(--text-muted); font-weight: 400;">(${escapeHtml(s.member_code || '--')})</small>
                    </div>
                    <div style="font-size: 12px; color: var(--text-sub); margin-top: 2px; display: flex; align-items: center;">
                      ${pkgBadge} <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(pkgName || 'Gói tập PT')}</span>
                    </div>
                  </div>
                  <div style="text-align: right; flex-shrink: 0;">
                    <div style="font-size: 13.5px; font-weight: 800; color: #237b58;">
                      +${sessionComm} đ
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                      Giá trị: ${sessionVal} đ
                    </div>
                  </div>
                </div>
              `;
            });
            $list.html(rowsHtml);
          }
        }
      }

      // -------------------------------------------------------------
      // 2. XỬ LÝ SUBTAB 2: THÙ LAO LỚP CỘNG ĐỒNG (THEO KỲ THÁNG)
      // -------------------------------------------------------------
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const monthClasses = allCommunityClasses.filter(c => (c.class_date || '').slice(0, 7) === monthStr);
      const commTotalComp = monthClasses.reduce((sum, c) => sum + Number(c.total_compensation || ((Number(c.base_price)||0) + (Number(c.bonus_amount)||0))), 0);
      const commBasePrice = monthClasses.reduce((sum, c) => sum + Number(c.base_price || 0), 0);
      const commBonus = monthClasses.reduce((sum, c) => sum + Number(c.bonus_amount || 0), 0);
      const commClassesCount = monthClasses.length;
      const commSlots = monthClasses.reduce((sum, c) => sum + Number(c.enrolled_slots || 0), 0);
      const commAvg = commClassesCount > 0 ? Math.round(commTotalComp / commClassesCount) : 0;

      $('#commCommunityTotalComp').html(`${formatVnd(commTotalComp)} <small style="font-size: 14px; color: #7c3aed;">VNĐ</small>`);
      $('#commCommunityBasePrice').text(formatVnd(commBasePrice) + ' đ');
      $('#commCommunityBonusAmount').text(formatVnd(commBonus) + ' đ');
      $('#commCommunityClassesCount').text(`${commClassesCount} ca`);
      $('#commCommunitySlots').text(`${commSlots}`);
      $('#commCommunityAvgComp').text(formatVnd(commAvg) + ' đ');
      $('#commCommunityListSub').text(`${commClassesCount} ca dạy`);

      if (monthClasses.length === 0) {
        $commList.html(`
          <div style="text-align: center; padding: 28px 12px; color: var(--text-muted); font-size: 12px;">
            <i class="fa-solid fa-users-slash" style="font-size: 28px; margin-bottom: 8px; opacity: 0.5; color: #7c3aed;"></i>
            <p style="margin: 0;">Không có lớp cộng đồng nào được phân công trong tháng ${month}/${year}.</p>
          </div>
        `);
      } else {
        let compRowsHtml = '';
        monthClasses.forEach(c => {
          const comp = Number(c.total_compensation || ((Number(c.base_price)||0) + (Number(c.bonus_amount)||0)));
          const dateStr = c.class_date ? new Date(c.class_date).toLocaleDateString('vi-VN') : '--';
          const timeStr = (c.start_time && c.end_time) ? `${c.start_time.slice(0, 5)} - ${c.end_time.slice(0, 5)}` : '';

          compRowsHtml += `
            <div class="pt-comm-session-item" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 5px;">
                  <i class="fa-regular fa-clock" style="color: #7c3aed;"></i>
                  <span>${timeStr} • ${dateStr}</span>
                  <span class="badge" style="background: rgba(124, 58, 237, 0.12); color: #7c3aed; font-size: 11px; padding: 1px 6px;">${c.discipline_name || 'Lớp CĐ'}</span>
                </div>
                <div style="font-size: 13px; font-weight: 700; color: var(--text-main); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(c.title)}
                </div>
                <div style="font-size: 12px; color: var(--text-sub); margin-top: 2px;">
                  Sĩ số: <strong style="color:#7c3aed;">${c.enrolled_slots || 0}/${c.max_slots || 0} HV</strong> · Cơ bản: ${formatVnd(c.base_price || 0)} đ + Thưởng: ${formatVnd(c.bonus_amount || 0)} đ
                </div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-size: 13.5px; font-weight: 800; color: #7c3aed;">
                  +${formatVnd(comp)} đ
                </div>
                <button type="button" class="btn-comm-view-members" data-class-id="${c.id}" style="margin-top: 4px; border: 1px solid #7c3aed; background: rgba(124, 58, 237, 0.08); color: #7c3aed; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; cursor: pointer;">
                  Xem học viên
                </button>
              </div>
            </div>
          `;
        });
        $commList.html(compRowsHtml);
      }

      // -------------------------------------------------------------
      // 3. XỬ LÝ SUBTAB 1: TỔNG HỢP THU NHẬP & XÁC NHẬN CHI TRẢ GỘP
      // -------------------------------------------------------------
      const totalCombinedIncome = totalComm + commTotalComp;
      const totalSessionsAll = Number(sessionsCount) + commClassesCount;

      $('#summaryTotalIncomeAmount').html(`${formatVnd(totalCombinedIncome)} <small style="font-size: 15px; color: var(--primary);">VNĐ</small>`);
      $('#summaryPtCommAmount').text(`+${formatVnd(totalComm)} đ`);
      $('#summaryCommunityCompAmount').text(`+${formatVnd(commTotalComp)} đ`);
      $('#summaryTotalSessionsCount').text(`${totalSessionsAll} ca`);

      // Cập nhật 2 thẻ nguồn thu nhập
      $('#summaryPtCommSub').text(`${sessionsCount} ca tập đã hoàn thành · Tỷ lệ ${rate}%`);
      $('#summaryPtCommVal').text(`+${formatVnd(totalComm)} đ`);
      $('#summaryCommunityCompSub').text(`${commClassesCount} ca dạy · ${commSlots} lượt HV`);
      $('#summaryCommunityCompVal').text(`+${formatVnd(commTotalComp)} đ`);

      // Cập nhật Badge trạng thái tổng thu nhập
      const incomeStatusMap = {
        PENDING: { label: 'Chờ chi trả', bg: 'rgba(245, 158, 11, 0.2)', color: '#996217' },
        APPROVED: { label: 'Chờ chi trả', bg: 'rgba(59, 130, 246, 0.2)', color: '#286aa4' },
        PENDING_CONFIRMATION: { label: 'Chờ bạn xác nhận', bg: 'rgba(2, 132, 199, 0.2)', color: '#0284c7' },
        PAID: { label: 'Đã chi trả', bg: 'rgba(16, 185, 129, 0.2)', color: '#237b58' }
      };
      const incomeSt = incomeStatusMap[status] || incomeStatusMap.PENDING;
      $('#summaryIncomeStatusBadge').text(incomeSt.label).css({ background: incomeSt.bg, color: incomeSt.color });

      // Trạng thái đã nhận tiền
      if (status === 'PAID' && summary) {
        $('#commPaidDateWrap').show();
        const paidAt = summary.pt_confirmed_at || summary.paid_at;
        const paidDateFormatted = paidAt ? new Date(paidAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Đã nhận đủ';
        $('#commPaidDate').text(paidDateFormatted);
      } else {
        $('#commPaidDateWrap').hide();
      }

      // Khối xác nhận chi trả 2 chiều gộp cho cả 2 khoản (Chống chối nhận tiền)
      if (status === 'PENDING_CONFIRMATION' && summary) {
        $('#commConfirmationBox').show();
        $('#commConfirmationAmount').text(`${formatVnd(totalCombinedIncome)} đ`);
        const methodStr = summary.payment_method === 'BANK_TRANSFER' ? 'Chuyển khoản VietQR' : 'Tiền mặt tại quầy';
        $('#commConfirmationMethod').text(methodStr);

        $('#btnPtConfirmCommission').off('click').on('click', async function () {
          const $btn = $(this);
          if ($btn.prop('disabled')) return;
          $btn.prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin"></i> Đang xác nhận...');

          try {
            await apiClient.pt.confirmCommissionReceipt(summary.id);
            if (typeof DevExpress !== 'undefined' && DevExpress.ui && DevExpress.ui.notify) {
              DevExpress.ui.notify({
                message: 'Đã xác nhận nhận đủ tiền thu nhập tháng ' + month + '/' + year,
                type: 'success',
                displayTime: 3000
              });
            } else {
              alert('Đã xác nhận nhận đủ tiền thu nhập tháng ' + month + '/' + year);
            }
            await loadCommissionDetails(month, year);
            if (window.ptApp?.fetchOverviewData) {
              window.ptApp.fetchOverviewData();
            }
          } catch (confirmErr) {
            console.error('Error confirming commission receipt:', confirmErr);
            const msg = confirmErr.data?.message || confirmErr.message || 'Không thể xác nhận nhận tiền. Vui lòng thử lại.';
            if (typeof DevExpress !== 'undefined' && DevExpress.ui && DevExpress.ui.notify) {
              DevExpress.ui.notify({ message: msg, type: 'error', displayTime: 4000 });
            } else {
              alert(msg);
            }
            $btn.prop('disabled', false).html('<i class="fa-solid fa-check-double"></i> Xác nhận đã nhận tiền');
          }
        });
      } else {
        $('#commConfirmationBox').hide();
      }

    } catch (err) {
      if (version !== commissionRequest) return;
      const missingConfig = err.data?.code === 'BRANCH_DEFAULT_COMMISSION_NOT_CONFIGURED';
      $('#commStatusBadge, #summaryIncomeStatusBadge').text(missingConfig ? 'Chưa có cấu hình' : 'Không thể tải');
      console.error('Error loading commission details:', err);
      $list.html(`
        <div style="text-align: center; padding: 24px 12px; color: #c43d40; font-size: 12px;">
          <i class="fa-solid fa-circle-exclamation" style="font-size: 24px; margin-bottom: 6px;"></i>
          <p>${missingConfig ? 'Chưa có cấu hình tỷ lệ hoa hồng từ quản lý. Vui lòng liên hệ QTV.' : 'Không thể tải bảng kê. Vui lòng bấm Làm mới để thử lại.'}</p>
        </div>
      `);
      $commList.html(`
        <div style="text-align: center; padding: 20px; color: #c43d40; font-size: 12px;">
          Không thể tải dữ liệu thù lao lớp cộng đồng.
        </div>
      `);
    }
  }

  /**
   * Modal xem chi tiết lớp cộng đồng và danh sách hội viên đăng ký (DevExtreme dxPopup)
   */
  let communityClassPopupInstance = null;

  async function openCommunityClassModal(classId) {
    if (!classId) return;
    if (communityClassPopupInstance) {
      communityClassPopupInstance.dispose();
      communityClassPopupInstance = null;
    }

    const $host = $('<div id="ptClassMembersPopupHost">').appendTo('body');
    communityClassPopupInstance = $host.dxPopup({
      title: 'Thông tin lớp học & Danh sách hội viên',
      width: () => Math.min(390, window.innerWidth - 20),
      height: 'auto',
      maxHeight: '88vh',
      shadingColor: 'rgba(0, 0, 0, 0.65)',
      showCloseButton: true,
      dragEnabled: false,
      hideOnOutsideClick: true,
      contentTemplate: function (contentElement) {
        contentElement.html(`
          <div style="text-align: center; padding: 24px; color: var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 8px; color: #7c3aed;"></i>
            <div>Đang tải thông tin lớp và danh sách hội viên...</div>
          </div>
        `);

        apiClient.request(`/community-classes/${encodeURIComponent(classId)}/members`).then(res => {
          const payload = res.data || res;
          const cls = payload.class || {};
          const members = payload.members || [];
          const comp = Number(cls.total_compensation || ((Number(cls.base_price) || 0) + (Number(cls.bonus_amount) || 0)));

          let membersHtml = '';
          if (members.length === 0) {
            membersHtml = `
              <div style="text-align: center; padding: 20px 8px; color: var(--text-muted); font-size: 12px; background: var(--bg-surface); border-radius: 6px;">
                <i class="fa-solid fa-user-xmark" style="font-size: 20px; margin-bottom: 6px; opacity: 0.5;"></i>
                <div>Chưa có hội viên nào đăng ký lớp học này.</div>
              </div>
            `;
          } else {
            membersHtml = members.map((m, idx) => `
              <div style="display: flex; align-items: center; padding: 8px 10px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 6px; font-size: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(124, 58, 237, 0.15); color: #7c3aed; font-weight: 700; display: flex; align-items: center; justify-content: center; font-size: 11px;">
                    ${idx + 1}
                  </div>
                  <div>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 12.5px;">${escapeHtml(m.full_name)}</div>
                    <div style="color: var(--text-muted); font-size: 11px;">${escapeHtml(m.member_code || 'HV')} · ${escapeHtml(m.phone || '')}</div>
                  </div>
                </div>
              </div>
            `).join('');
          }

          contentElement.html(`
            <div class="pt-class-members-modal-body" style="padding: 2px 0;">
              <!-- Thông tin lớp học -->
              <div style="background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%); color: #fff; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px;">
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; color: #d8b4fe; margin-bottom: 4px;">
                  <i class="fa-solid fa-users"></i> Lớp tập cộng đồng
                </div>
                <div style="font-size: 16px; font-weight: 800; margin-bottom: 6px;">
                  ${escapeHtml(cls.title || 'Lớp cộng đồng')}
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; color: #e9d5ff;">
                  <div><i class="fa-regular fa-calendar"></i> ${cls.class_date ? new Date(cls.class_date).toLocaleDateString('vi-VN') : '--'}</div>
                  <div><i class="fa-regular fa-clock"></i> ${(cls.start_time || '').slice(0, 5)} - ${(cls.end_time || '').slice(0, 5)}</div>
                  <div><i class="fa-solid fa-user-group"></i> Sĩ số: <strong>${members.length}/${cls.max_slots || 30} HV</strong></div>
                  <div><i class="fa-solid fa-hand-holding-dollar"></i> Thù lao: <strong style="color: #fef08a;">${formatVnd(comp)} đ</strong></div>
                </div>
              </div>

              <!-- Danh sách hội viên -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong style="font-size: 12.5px; color: var(--text-main);">
                  <i class="fa-solid fa-users-viewfinder"></i> Danh sách học viên (${members.length})
                </strong>
                <span style="font-size: 11px; color: var(--text-muted);">Sắp xếp theo thứ tự đăng ký</span>
              </div>
              <div style="max-height: 260px; overflow-y: auto; padding-right: 2px;">
                ${membersHtml}
              </div>
            </div>
          `);
        }).catch(err => {
          contentElement.html(`
            <div style="text-align: center; padding: 24px; color: #c43d40; font-size: 12px;">
              <i class="fa-solid fa-circle-exclamation" style="font-size: 24px; margin-bottom: 6px;"></i>
              <div>Không thể tải thông tin lớp: ${escapeHtml(err.message || 'Lỗi mạng')}</div>
            </div>
          `);
        });

        return contentElement;
      },
      toolbarItems: [
        {
          widget: 'dxButton',
          toolbar: 'bottom',
          location: 'after',
          options: {
            text: 'Đóng',
            type: 'normal',
            stylingMode: 'outlined',
            onClick: () => communityClassPopupInstance?.hide()
          }
        }
      ],
      onHidden: function () {
        if (communityClassPopupInstance) {
          communityClassPopupInstance.dispose();
          communityClassPopupInstance = null;
        }
        $host.remove();
      }
    }).dxPopup('instance');

    communityClassPopupInstance.show();
  }

  // Đăng ký toàn cục để Schedule module cũng có thể mở popup
  if (typeof window !== 'undefined') {
    window.openPTCommunityClassModal = openCommunityClassModal;
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
        font-size: 12px;
        font-weight: 700;
        color: var(--primary);
        background: rgba(16, 185, 129, 0.18);
        padding: 3px 10px;
        border-radius: var(--radius-full);
        margin-bottom: 8px;
        border: 1px solid rgba(52, 211, 153, 0.2);
      }
      .pt-hero-title {
        font-size: 17px;
        font-weight: 800;
        color: var(--text-main);
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
        color: #c43d40;
        line-height: 1.35;
      }
      .pt-error-icon {
        color: #c43d40;
        font-size: 15px;
        flex-shrink: 0;
      }
      .pt-error-retry-btn {
        background: rgba(239, 68, 68, 0.25);
        border: 1px solid rgba(239, 68, 68, 0.5);
        color: var(--text-main);
        border-radius: var(--radius-sm);
        padding: 5px 10px;
        font-size: 12px;
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
        color: var(--text-main);
        font-weight: 800;
        box-shadow: none;
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
        border-color: var(--border-color);
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
        font-size: 12px;
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
      .icon-cyan { background: rgba(6, 182, 212, 0.15); color: #286aa4; }
      .icon-emerald { background: rgba(16, 185, 129, 0.15); color: #237b58; }
      .icon-blue { background: rgba(59, 130, 246, 0.15); color: #286aa4; }
      .icon-amber { background: rgba(245, 158, 11, 0.15); color: #996217; }
      .icon-gold { background: var(--bg-card); color: #996217; }

      .pt-kpi-number {
        font-size: 26px;
        font-weight: 800;
        color: var(--text-main);
        line-height: 1.1;
        margin-bottom: 8px;
        letter-spacing: 0;
      }

      .pt-kpi-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
      }
      .pt-kpi-pill {
        padding: 2px 7px;
        border-radius: var(--radius-full);
        font-weight: 600;
        font-size: 12px;
      }
      .pill-cyan { background: rgba(6, 182, 212, 0.15); color: #286aa4; }
      .pill-emerald { background: rgba(16, 185, 129, 0.15); color: #237b58; }
      .pill-blue { background: rgba(59, 130, 246, 0.15); color: #286aa4; }
      .pill-amber { background: rgba(245, 158, 11, 0.15); color: #996217; }
      .pill-gold { background: rgba(245, 158, 11, 0.2); color: #996217; font-weight: 700; }

      .pt-kpi-subtext {
        color: var(--text-sub);
        font-size: 12px;
      }
      .pt-kpi-arrow {
        color: var(--text-sub);
        font-size: 12px;
      }
      .pt-kpi-action-link {
        color: var(--accent-gold);
        font-weight: 700;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      /* Card borders with subtle glow */
      .card-cyan { border-left: 3.5px solid #286aa4; }
      .card-emerald { border-left: 3.5px solid #237b58; }
      .card-blue { border-left: 3.5px solid #286aa4; }
      .card-amber { border-left: 3.5px solid #996217; }
      .card-gold {
        border: 1px solid rgba(245, 158, 11, 0.3);
        background: var(--bg-card);
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
        color: var(--text-main);
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
        border-color: var(--border-color);
      }
      .pt-quick-btn-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
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
        color: var(--text-main);
        font-weight: 700;
      }
      .pt-quick-btn-text small {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .pt-quick-btn-arrow {
        color: var(--text-sub);
        font-size: 12px;
      }

      /* Commission Hero Card (PT06-US02) */
      .pt-commission-hero-card {
        background: var(--bg-card);
        border: 1px solid rgba(245, 158, 11, 0.35);
        border-radius: var(--radius-md);
        padding: 14px;
        margin-bottom: 16px;
        cursor: pointer;
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .pt-commission-hero-card:hover {
        transform: translateY(-2px);
        border-color: rgba(245, 158, 11, 0.6);
        box-shadow: none;
      }
      .pt-comm-card-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 700;
        color: #996217;
        background: rgba(245, 158, 11, 0.15);
        padding: 3px 8px;
        border-radius: var(--radius-full);
        margin-bottom: 8px;
      }
      .pt-comm-card-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .pt-comm-card-left {
        display: flex;
        flex-direction: column;
      }
      .pt-comm-card-title {
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 600;
      }
      .pt-comm-card-amount {
        font-size: 22px;
        font-weight: 800;
        color: #996217;
        margin: 2px 0 4px;
        letter-spacing: 0;
      }
      .pt-comm-card-amount small {
        font-size: 13px;
        font-weight: 600;
        color: #996217;
      }
      .pt-comm-card-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      .pt-comm-btn-circle {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(245, 158, 11, 0.2);
        color: #996217;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        transition: transform 0.2s ease;
      }
      .pt-commission-hero-card:hover .pt-comm-btn-circle {
        transform: translateX(3px);
        background: #996217;
        color: #000;
      }
      .pt-comm-rate-pill {
        font-size: 12px;
        color: #237b58;
        font-weight: 700;
      }
      .pt-comm-chip {
        transition: all 0.2s ease;
      }
      .pt-comm-chip.active {
        background: var(--primary) !important;
        color: #ffffff !important;
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
    reset: () => {
      commissionRequest++;
      statsRequest++;
      const now = new Date();
      OverviewState.commMonth = now.getMonth() + 1;
      OverviewState.commYear = now.getFullYear();
      $('.pt-comm-chip').removeClass('active').css({ background: 'var(--bg-surface)', color: 'var(--text-muted)' });
      $('.pt-comm-chip[data-filter="this_month"]').addClass('active');
      $('#commCustomMonthWrap').hide();
      $('#commSessionsList').empty();
      OverviewState.rawBookings = [];
      OverviewState.kpiData = { this_week: null, this_month: null, last_month: null };
      $('#kpiAssignedMembers, #kpiCompletedSessions, #kpiUpcomingBookings, #kpiAwaitingConfirmation, #kpiPendingAssignments').text('--');
      $('#overviewCommAmount').html('-- <small>VNĐ</small>');
      $('#overviewCommRate').text('--% hoa hồng');
      $('#overviewCommStatus').html('<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #996217; font-size: 12px; padding: 2px 8px; border-radius: 999px;">Chờ chi trả</span>');
    },
    setPeriod,
    fetchStats,
    refresh,
    navigateToAssignments,
    openCommissionModal,
    closeCommissionModal,
    loadCommissionDetails,
    refreshCommissions: () => loadCommissionDetails(OverviewState.commMonth, OverviewState.commYear),
    getState: () => OverviewState
  };
});
