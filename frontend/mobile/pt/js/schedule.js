/**
 * ==========================================================================
 * PARADISE GYM - MOBILE PT APP (TAB 3: anti-3-PT)
 * MODULE PT01: LỊCH DẠY PT & GHI NHẬN KẾT QUẢ BUỔI HỌC
 * ==========================================================================
 * - PT01-US01: Lịch dạy theo ngày của HLV trong khung giờ làm việc cố định
 *              08:00 - 18:00 Thứ 2 - Thứ 6.
 *              Calendar Horizontal Strip cuộn ngang chọn ngày (kèm bộ chọn tháng).
 *              Lưới 5 khung giờ cố định trong ngày (08-10, 10-12, 12-14, 14-16, 16-18).
 *              5 loại Thẻ khung giờ: Khung giờ trống, Đã đặt (UPCOMING),
 *              Chờ xác nhận (AWAITING_CONFIRMATION), Hoàn thành (DONE), Đã hủy (CANCELLED).
 *              PT không có quyền hủy lịch.
 * - PT01-US02: Bottom Sheet Ghi nhận kết quả buổi PT khi bấm [ Xác nhận hoàn thành ]
 *              tại ca tập đến giờ hoặc chờ xác nhận; Nhập kết quả 'Hoàn thành'
 *              và ghi chú đánh giá thể lực, gọi API /api/v1/pt-bookings/:id/pt-confirm
 *              để phối hợp xác nhận kép trừ 1 buổi của học viên.
 * ==========================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ParadisePTSchedule = factory();
    root.ptSchedule = root.ParadisePTSchedule;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const escapeHtml = value => $('<span>').text(value ?? '').html();

  // Định nghĩa 5 khung giờ làm việc cố định tiêu chuẩn (PT01-US01)
  const STANDARD_SLOTS = [
    { start: '08:00', end: '10:00', label: '08:00 - 10:00' },
    { start: '10:00', end: '12:00', label: '10:00 - 12:00' },
    { start: '12:00', end: '14:00', label: '12:00 - 14:00' },
    { start: '14:00', end: '16:00', label: '14:00 - 16:00' },
    { start: '16:00', end: '18:00', label: '16:00 - 18:00' }
  ];

  /**
   * Helper lấy chuỗi ngày hiện tại định dạng YYYY-MM-DD
   */
  function getTodayDateStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // State quản lý lịch dạy
  const ScheduleState = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-indexed
    selectedDateStr: getTodayDateStr(), // YYYY-MM-DD (mặc định ngày hiện tại theo PT01-US01 Main Flow)
    isCalendarExpanded: false, // false: Thu gọn (Strip cuộn ngang), true: Mở rộng (Full Month Grid)
    activeBookingForConfirm: null,
    isLoading: false,

    // Danh sách lịch tập (tải động 100% từ Database PostgreSQL qua Backend REST API)
    bookings: []
  };

  /**
   * Khởi tạo Module PT01
   */
  function init() {
    const today = getTodayDateStr();
    ScheduleState.selectedDateStr = today;
    ScheduleState.currentYear = new Date().getFullYear();
    ScheduleState.currentMonth = new Date().getMonth();

    renderScheduleContainer();
    bindEvents();
  }

  /**
   * Render khung cấu trúc Tab Lịch PT01
   */
  function renderScheduleContainer() {
    const $container = $('#view-schedule');
    if (!$container.length) return;

    const html = `
      <!-- Header Module PT01 -->
      <div class="pt-schedule-topbar">
        <div class="pt-schedule-title-wrap">
          <h3 class="pt-schedule-main-title">
            <i class="fa-solid fa-calendar-days" style="color: var(--primary);"></i> Lịch Huấn Luyện
          </h3>
          <span class="pt-schedule-badge-hours">Khung cố định: 08:00 - 18:00 (T2 - T6)</span>
        </div>
      </div>

      <!-- Month Selector & Expandable / Collapsible Calendar (PT01-US01) -->
      <div class="pt-calendar-strip-card" id="ptCalendarCard">
        <!-- Header tháng & nút điều hướng -->
        <div class="pt-month-picker-row">
          <div class="pt-month-title-wrap" id="btnToggleCalendarMode" title="Chạm để mở rộng hoặc thu gọn lịch tháng">
            <span class="pt-month-display" id="displayMonthYear"></span>
            <span class="pt-calendar-toggle-badge" id="calendarToggleBadge">
              <i class="fa-solid fa-chevron-down" id="calendarToggleIcon"></i>
            </span>
          </div>

          <div class="pt-month-nav-group">
            <button type="button" class="pt-month-nav-btn" id="btnPrevMonth" title="Tháng trước">
              <i class="fa-solid fa-chevron-left"></i>
            </button>
            <button type="button" class="pt-month-nav-btn" id="btnNextMonth" title="Tháng sau">
              <i class="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>

        <!-- 1. CHẾ ĐỘ THU GỌN: Horizontal Scrollable Date Strip (Ảnh 1) -->
        <div class="pt-date-strip-scroll" id="dateStripContainer">
          <!-- Rendered dynamically by renderDateStrip() -->
        </div>

        <!-- 2. CHẾ ĐỘ MỞ RỘNG: Full Month Grid Calendar (Ảnh 2) -->
        <div class="pt-full-month-container" id="fullMonthContainer" style="display: none;">
          <!-- Rendered dynamically by renderFullMonthGrid() -->
        </div>

        <!-- Thanh Toggle Mode dưới đáy card -->
        <div class="pt-calendar-toggle-bar" id="btnToggleBar">
          <span class="pt-toggle-bar-text" id="toggleBarText">
            <i class="fa-regular fa-calendar-days"></i> Mở rộng lịch cả tháng
          </span>
          <i class="fa-solid fa-chevron-down" id="toggleBarIcon"></i>
        </div>
      </div>

      <!-- Section Tiêu đề ngày được chọn & Thông báo cuối tuần nếu có -->
      <div class="pt-selected-day-header">
        <div class="pt-selected-day-left">
          <span class="pt-selected-date-text" id="selectedDateText">
            
          </span>
        </div>
        <div class="pt-slots-counter-badge" id="slotsCounterBadge">
          5 Khung Giờ
        </div>
      </div>

      <div class="pt-weekend-alert" id="weekendAlertBox" style="display: none;">
        <i class="fa-solid fa-mug-hot"></i>
        <span>Hôm nay là ngày nghỉ cuối tuần. HLV làm việc theo khung giờ cố định từ Thứ 2 đến Thứ 6.</span>
      </div>

      <!-- Lưới 5 khung giờ làm việc cố định trong ngày (PT01-US01) -->
      <div class="pt-slots-grid" id="slotsGridContainer">
        <!-- Rendered dynamically by renderSlots() -->
      </div>

      <!-- BOTTOM SHEET: Ghi nhận kết quả buổi PT (PT01-US02) -->
      <div class="pt-modal-overlay" id="confirmModalOverlay" style="display: none;">
        <div class="pt-bottom-sheet" id="confirmBottomSheet">
          <div class="pt-sheet-handle"></div>
          
          <div class="pt-sheet-header">
            <div class="pt-sheet-title">
              <i class="fa-solid fa-clipboard-check" style="color: var(--primary);"></i>
              Ghi nhận kết quả buổi PT
            </div>
            <button type="button" class="pt-sheet-close-btn" id="btnCloseConfirmModal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="pt-sheet-body">
            <!-- Thông tin ca tập (READONLY / PREFILL) -->
            <div class="pt-prefill-box">
              <div class="pt-prefill-row">
                <span class="pt-prefill-label">Mã buổi & Khung giờ:</span>
                <span class="pt-prefill-value" id="modalSessionInfo"></span>
              </div>
              <div class="pt-prefill-row">
                <span class="pt-prefill-label">Học viên & Gói tập:</span>
                <span class="pt-prefill-value text-highlight" id="modalMemberInfo"></span>
              </div>
              <div class="pt-prefill-row">
                <span class="pt-prefill-label">Chi nhánh huấn luyện:</span>
                <span class="pt-prefill-value" id="modalBranchInfo"></span>
              </div>
            </div>

            <!-- Form Ghi nhận kết quả -->
            <form id="formConfirmSession">
              <!-- Trường 1: Kết quả buổi tập (USER-INPUT + PREFILL mặc định Hoàn thành) -->
              <div class="pt-form-group">
                <label class="pt-form-label">
                  Kết quả buổi tập <span class="required-star">*</span>
                </label>
                <div class="pt-result-static-choice">
                  <div class="pt-result-radio active">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>Hoàn thành (Đạt chỉ tiêu buổi tập)</span>
                  </div>
                </div>
              </div>

              <!-- Trường 2: Ghi chú buổi tập (USER-INPUT) -->
              <div class="pt-form-group">
                <label class="pt-form-label" for="modalFitnessNotes">
                  Ghi chú đánh giá thể lực & nội dung rèn luyện
                </label>
                <textarea 
                  class="pt-textarea" 
                  id="modalFitnessNotes" maxlength="2000" 
                  rows="3" 
                  placeholder="Nhập nội dung bài tập, thể trạng học viên, dặn dò dinh dưỡng... (Ví dụ: Thể lực tốt, hoàn thành trọn vẹn giáo án cơ chân)"></textarea>
                <span class="pt-form-hint">
                  <i class="fa-solid fa-circle-info"></i> Ghi chú này sẽ được lưu vào lịch sử tập luyện của học viên.
                </span>
              </div>

              <!-- Thông tin cơ chế xác nhận kép -->
              <div class="pt-dual-confirm-notice">
                <i class="fa-solid fa-shield-halved"></i>
                <div class="pt-dual-confirm-text">
                  <strong>Cơ chế xác nhận kép:</strong> Khi cả HLV và Hội viên cùng xác nhận, hệ thống sẽ chuyển buổi tập sang trạng thái <code>DONE</code> và tự động trừ 1 buổi khả dụng trong gói.
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="pt-sheet-actions">
                <button type="button" class="btn btn-secondary" id="btnCancelConfirm">
                  Hủy bỏ
                </button>
                <button type="submit" class="btn btn-primary" id="btnSubmitConfirm">
                  <i class="fa-solid fa-check"></i> Lưu kết quả
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    $container.html(html);

    // Render Strip và Slots lần đầu
    renderDateStrip();
    renderSlots();
  }

  /**
   * Render dải ngày cuộn ngang quanh ngày đang chọn (Chế độ Thu gọn - Ảnh 1)
   */
  function renderDateStrip() {
    const $strip = $('#dateStripContainer');
    if (!$strip.length) return;

    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    $('#displayMonthYear').text(`${monthNames[ScheduleState.currentMonth]} Năm ${ScheduleState.currentYear}`);

    const daysInMonth = new Date(ScheduleState.currentYear, ScheduleState.currentMonth + 1, 0).getDate();
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    let stripHtml = '';
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(ScheduleState.currentYear, ScheduleState.currentMonth, day);
      const dayOfWeek = d.getDay();
      const dateStr = `${ScheduleState.currentYear}-${String(ScheduleState.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = dateStr === ScheduleState.selectedDateStr;
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

      // Kiểm tra có lịch không để hiện chấm status
      const bookingsOnDate = ScheduleState.bookings.filter(b => b.date === dateStr);
      let dotHtml = '';
      if (bookingsOnDate.length > 0) {
        const hasAwaiting = bookingsOnDate.some(b => b.status === 'AWAITING_CONFIRMATION');
        const hasUpcoming = bookingsOnDate.some(b => b.status === 'UPCOMING');
        const hasDone = bookingsOnDate.some(b => b.status === 'DONE');

        if (hasAwaiting) {
          dotHtml = '<span class="pt-date-dot dot-amber" title="Có ca chờ xác nhận"></span>';
        } else if (hasUpcoming) {
          dotHtml = '<span class="pt-date-dot dot-blue" title="Có ca sắp dạy"></span>';
        } else if (hasDone) {
          dotHtml = '<span class="pt-date-dot dot-emerald" title="Có ca đã hoàn thành"></span>';
        }
      }

      stripHtml += `
        <div class="pt-date-chip ${isSelected ? 'active' : ''} ${isWeekend ? 'is-weekend' : ''}" 
             data-date="${dateStr}">
          <span class="pt-chip-day">${dayNames[dayOfWeek]}</span>
          <span class="pt-chip-num">${String(day).padStart(2, '0')}</span>
          ${dotHtml}
        </div>
      `;
    }

    $strip.html(stripHtml);

    // Cuộn nhẹ đến ngày đang active
    setTimeout(() => {
      const $activeChip = $strip.find('.pt-date-chip.active');
      if ($activeChip.length) {
        const scrollLeft = $activeChip.position().left + $strip.scrollLeft() - ($strip.width() / 2) + ($activeChip.width() / 2);
        $strip.animate({ scrollLeft: Math.max(0, scrollLeft) }, 200);
      }
    }, 50);
  }

  /**
   * Render lưới cả tháng dạng DevExtreme dxCalendar (PT01-US01 Chế độ Mở rộng)
   */
  function renderFullMonthGrid() {
    const $monthContainer = $('#fullMonthContainer');
    if (!$monthContainer.length) return;

    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    $('#displayMonthYear').text(`${monthNames[ScheduleState.currentMonth]} Năm ${ScheduleState.currentYear}`);

    $monthContainer.empty();
    const $calDiv = $('<div>').addClass('pt-dx-calendar-instance').appendTo($monthContainer);

    $calDiv.dxCalendar({
      value: ScheduleState.selectedDateStr ? new Date(`${ScheduleState.selectedDateStr}T12:00:00`) : new Date(),
      firstDayOfWeek: 1,
      showTodayButton: true,
      zoomLevel: 'month',
      minZoomLevel: 'month',
      maxZoomLevel: 'month',
      cellTemplate: function (itemData, itemIndex, itemElement) {
        const d = itemData.date;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${day}`;
        const dayNum = d.getDate();

        const bookingsOnDate = ScheduleState.bookings.filter(b => b.date === dateStr);
        let dotHtml = '';
        if (bookingsOnDate.length > 0) {
          const hasAwaiting = bookingsOnDate.some(b => b.status === 'AWAITING_CONFIRMATION');
          const hasUpcoming = bookingsOnDate.some(b => b.status === 'UPCOMING');
          const hasDone = bookingsOnDate.some(b => b.status === 'DONE');

          if (hasAwaiting) {
            dotHtml = '<span class="pt-grid-dot dot-amber" title="Có ca chờ xác nhận"></span>';
          } else if (hasUpcoming) {
            dotHtml = '<span class="pt-grid-dot dot-blue" title="Có ca sắp dạy"></span>';
          } else if (hasDone) {
            dotHtml = '<span class="pt-grid-dot dot-emerald" title="Có ca đã hoàn thành"></span>';
          }
        }

        itemElement.html(`
          <div class="pt-cal-cell-inner" data-date="${dateStr}">
            <span class="pt-day-number">${dayNum}</span>
            ${dotHtml}
          </div>
        `);
      },
      onValueChanged: function (e) {
        if (e.value) {
          const y = e.value.getFullYear();
          const m = String(e.value.getMonth() + 1).padStart(2, '0');
          const d = String(e.value.getDate()).padStart(2, '0');
          const newDate = `${y}-${m}-${d}`;
          ScheduleState.selectedDateStr = newDate;
          ScheduleState.currentYear = y;
          ScheduleState.currentMonth = e.value.getMonth();

          // Cập nhật text tháng năm
          $('#displayMonthYear').text(`${monthNames[ScheduleState.currentMonth]} Năm ${ScheduleState.currentYear}`);

          // Đồng bộ sang ngày trên Date Strip
          $('.pt-date-chip').removeClass('active');
          $(`.pt-date-chip[data-date="${newDate}"]`).addClass('active');

          renderSlots();
        }
      }
    });
  }

  /**
   * Chuyển đổi linh hoạt giữa Chế độ Thu gọn (Strip cuộn ngang) và Chế độ Mở rộng (Lưới cả tháng)
   */
  function toggleCalendarMode() {
    ScheduleState.isCalendarExpanded = !ScheduleState.isCalendarExpanded;

    const $strip = $('#dateStripContainer');
    const $month = $('#fullMonthContainer');
    const $toggleIcon = $('#calendarToggleIcon');
    const $barText = $('#toggleBarText');
    const $barIcon = $('#toggleBarIcon');

    if (ScheduleState.isCalendarExpanded) {
      // Mở rộng sang Lưới cả tháng (Ảnh 2)
      $strip.hide();
      renderFullMonthGrid();
      $month.fadeIn(150);

      $toggleIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
      $barText.html('<i class="fa-solid fa-compress"></i> Thu gọn dải ngày');
      $barIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    } else {
      // Thu gọn về Dải cuộn ngang (Ảnh 1)
      $month.hide();
      renderDateStrip();
      $strip.fadeIn(150);

      $toggleIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
      $barText.html('<i class="fa-regular fa-calendar-days"></i> Mở rộng lịch cả tháng');
      $barIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    }
  }

  /**
   * Kiểm tra ca tập đã đến giờ hoặc qua giờ tập hay chưa (PT01-US01 & PT01-US02)
   */
  function isSlotStartedOrPassed(dateStr, slotStart) {
    if (!dateStr) return false;
    const todayStr = getTodayDateStr();

    // Ngày trước hôm nay: Đã qua giờ tập
    if (dateStr < todayStr) return true;
    // Ngày sau hôm nay: Chưa đến ngày tập
    if (dateStr > todayStr) return false;

    // Đúng ngày hôm nay: So sánh giờ bắt đầu ca tập
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const [startHour, startMin] = (slotStart || '08:00').split(':').map(Number);

    if (currentHour > startHour) return true;
    if (currentHour === startHour && currentMin >= (startMin || 0)) return true;
    return false;
  }

  /**
   * Render lưới 5 khung giờ trong ngày (PT01-US01)
   */
  function renderSlots() {
    if (ScheduleState.hasError) {
      $('#slotsGridContainer').html('<div class="pt-empty-schedule-banner">Không thể nạp dữ liệu lịch tập. <button type="button" class="btn btn-secondary btn-sm" id="btnRetrySchedule" title="Thử lại"><i class="fa-solid fa-rotate-right"></i></button></div>');
      return;
    }
    const $grid = $('#slotsGridContainer');
    if (!$grid.length) return;

    if (ScheduleState.isLoading) {
      $grid.html(`
        <div class="pt-schedule-loading">
          <i class="fa-solid fa-spinner fa-spin"></i> Đang nạp danh sách ca tập...
        </div>
      `);
      return;
    }

    // Cập nhật tiêu đề ngày
    const selectedDateParts = ScheduleState.selectedDateStr.split('-');
    const formattedDate = `${selectedDateParts[2]}/${selectedDateParts[1]}/${selectedDateParts[0]}`;
    $('#selectedDateText').text(`${formattedDate} - Khung làm việc cố định: 08:00 - 18:00`);

    const selDateObj = new Date(ScheduleState.selectedDateStr);
    const isWeekend = (selDateObj.getDay() === 0 || selDateObj.getDay() === 6);
    if (isWeekend) {
      $('#weekendAlertBox').show();
    } else {
      $('#weekendAlertBox').hide();
    }

    const dayBookings = ScheduleState.bookings.filter(b => b.date === ScheduleState.selectedDateStr);

    let html = '';

    // PT01-US01 Exception Flow: PT chưa được phân công học viên nào
    if (ScheduleState.bookings.length === 0) {
      html += `
        <div class="pt-empty-schedule-banner">
          <i class="fa-solid fa-circle-info"></i>
          <span>Bạn chưa có buổi tập nào được phân công.</span>
        </div>
      `;
    }

    STANDARD_SLOTS.forEach((slot, index) => {
      const matches = dayBookings.filter(b => 
        b.slot === slot.label || 
        b.startTime === slot.start || 
        (b.slot && b.slot.startsWith(slot.start))
      );
      (matches.length ? matches : [null]).forEach(booking => {
      if (!booking) {
        // 1. THẺ KHUNG GIỜ TRỐNG (Chỉ đọc, KHÔNG có nút đặt lịch)
        html += `
          <div class="pt-slot-card slot-empty">
            <div class="pt-slot-time-col">
              <span class="pt-slot-time-text">${slot.label}</span>
              <span class="pt-slot-index">Slot ${index + 1}</span>
            </div>
            <div class="pt-slot-info-col">
              <div class="pt-empty-badge">
                <i class="fa-regular fa-clock"></i> Khung giờ trống
              </div>
              <p class="pt-empty-hint">Chưa có học viên đặt lịch trong khung giờ này</p>
            </div>
          </div>
        `;
      } else if (booking.status === 'UPCOMING') {
        // 2. THẺ CA TẬP - ĐÃ ĐẶT (UPCOMING)
        // Đến giờ hoặc qua giờ tập, hiển thị nút màu xanh [ Xác nhận hoàn thành ] (PT01-US01 & PT01-US02)
        const canConfirm = !booking.ptConfirmed && isSlotStartedOrPassed(booking.date, slot.start);
        html += `
          <div class="pt-slot-card slot-upcoming" data-booking-id="${booking.id}" data-status="UPCOMING">
            <div class="pt-slot-time-col">
              <span class="pt-slot-time-text">${slot.label}</span>
              <span class="pt-slot-index">Slot ${index + 1}</span>
            </div>
            <div class="pt-slot-info-col">
              <div class="pt-slot-header-row">
                <span class="pt-slot-status-badge badge-blue">
                  <i class="fa-regular fa-calendar-check"></i> Đã đặt
                </span>
                <span class="pt-slot-id">${booking.id}</span>
              </div>
              <h4 class="pt-slot-member-name">${escapeHtml(booking.memberName)}</h4>
              <div class="pt-slot-meta-row">
                <span><i class="fa-solid fa-box"></i> ${escapeHtml(booking.packageName)}</span>
                <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(booking.branchName)}</span>
              </div>
              <div class="pt-slot-actions">
                ${canConfirm ? `
                  <button type="button" class="btn btn-primary btn-sm btn-confirm-trigger" 
                          data-booking-id="${booking.id}">
                    <i class="fa-solid fa-circle-check"></i> Xác nhận hoàn thành
                  </button>
                ` : `
                  <span class="pt-status-pill pill-blue">
                    <i class="fa-regular fa-clock"></i> Chưa đến giờ tập
                  </span>
                `}
              </div>
            </div>
          </div>
        `;
      } else if (booking.status === 'AWAITING_CONFIRMATION') {
        // 3. THẺ CA TẬP - CHỜ XÁC NHẬN (AWAITING_CONFIRMATION)
        const isPtConfirmed = booking.ptConfirmed;
        html += `
          <div class="pt-slot-card slot-awaiting" data-booking-id="${booking.id}" data-status="AWAITING_CONFIRMATION">
            <div class="pt-slot-time-col">
              <span class="pt-slot-time-text">${slot.label}</span>
              <span class="pt-slot-index">Slot ${index + 1}</span>
            </div>
            <div class="pt-slot-info-col">
              <div class="pt-slot-header-row">
                <span class="pt-slot-status-badge badge-amber">
                  <i class="fa-solid fa-clock-rotate-left"></i> Chờ xác nhận
                </span>
                <span class="pt-slot-id">${booking.id}</span>
              </div>
              <h4 class="pt-slot-member-name">${escapeHtml(booking.memberName)}</h4>
              <div class="pt-slot-meta-row">
                <span><i class="fa-solid fa-box"></i> ${escapeHtml(booking.packageName)}</span>
                <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(booking.branchName)}</span>
              </div>
              <div class="pt-slot-actions">
                ${!isPtConfirmed ? `
                  <button type="button" class="btn btn-primary btn-sm btn-confirm-trigger" 
                          data-booking-id="${booking.id}">
                    <i class="fa-solid fa-circle-check"></i> Xác nhận hoàn thành
                  </button>
                ` : `
                  <span class="pt-status-pill pill-amber">
                    <i class="fa-solid fa-hourglass-half"></i> Chờ Hội viên xác nhận
                  </span>
                `}
              </div>
            </div>
          </div>
        `;
      } else if (booking.status === 'DONE' || booking.status === 'COMPLETED') {
        // 4. THẺ CA TẬP - HOÀN THÀNH (DONE)
        html += `
          <div class="pt-slot-card slot-done" data-booking-id="${booking.id}" data-status="DONE">
            <div class="pt-slot-time-col">
              <span class="pt-slot-time-text">${slot.label}</span>
              <span class="pt-slot-index">Slot ${index + 1}</span>
            </div>
            <div class="pt-slot-info-col">
              <div class="pt-slot-header-row">
                <span class="pt-slot-status-badge badge-emerald">
                  <i class="fa-solid fa-clipboard-check"></i> ${booking.sessionNumber ? `Buổi ${booking.sessionNumber} · Đã hoàn thành` : 'Đã ghi nhận'}
                </span>
                <span class="pt-slot-id">${booking.id}</span>
              </div>
              <h4 class="pt-slot-member-name">${escapeHtml(booking.memberName)}</h4>
              <div class="pt-slot-meta-row">
                <span><i class="fa-solid fa-box"></i> ${escapeHtml(booking.packageName)}</span>
                <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(booking.branchName)}</span>
              </div>
              ${booking.workoutNotes ? `
                <div class="pt-slot-workout-notes" style="font-size: 11px; color: #cbd5e1; margin-top: 5px; line-height: 1.4;">
                  <i class="fa-solid fa-clipboard-list" style="color: var(--primary);"></i> <strong>Bài tập:</strong> ${escapeHtml(booking.workoutNotes)}
                </div>
              ` : ''}
              ${booking.fitnessNotes ? `
                <div class="pt-slot-fitness-notes">
                  <i class="fa-solid fa-dumbbell"></i> "${escapeHtml(booking.fitnessNotes)}"
                </div>
              ` : ''}
              <div class="pt-slot-done-footer">
                <i class="fa-solid fa-check-double"></i> Đã đủ 2 chiều xác nhận • Đã trừ 1 buổi
              </div>
            </div>
          </div>
        `;
      } else if (booking.status === 'CANCELLED') {
        // 5. THẺ CA TẬP - ĐÃ HỦY (CANCELLED)
        html += `
          <div class="pt-slot-card slot-cancelled" data-booking-id="${booking.id}" data-status="CANCELLED">
            <div class="pt-slot-time-col">
              <span class="pt-slot-time-text">${slot.label}</span>
              <span class="pt-slot-index">Slot ${index + 1}</span>
            </div>
            <div class="pt-slot-info-col">
              <div class="pt-slot-header-row">
                <span class="pt-slot-status-badge badge-gray">
                  <i class="fa-solid fa-ban"></i> Đã hủy
                </span>
                <span class="pt-slot-id">${booking.id}</span>
              </div>
              <h4 class="pt-slot-member-name text-muted">${escapeHtml(booking.memberName)}</h4>
              <div class="pt-slot-meta-row">
                <span><i class="fa-solid fa-box"></i> ${escapeHtml(booking.packageName)}</span>
              </div>
              <div class="pt-slot-cancel-reason">
                Lý do: ${escapeHtml(booking.cancelReason || 'Buổi tập đã bị hủy')}
              </div>
            </div>
          </div>
        `;
      }
      });
    });

    $grid.html(html);
  }

  /**
   * Gắn sự kiện tương tác
   */
  function bindEvents() {
    $(document).off('click', '#btnRetrySchedule').on('click', '#btnRetrySchedule', syncWithBackend);
    // 1. Chọn ngày trên Horizontal Strip (Chế độ Thu gọn)
    $(document).off('click', '.pt-date-chip').on('click', '.pt-date-chip', function () {
      const newDate = $(this).data('date');
      if (!newDate) return;

      ScheduleState.selectedDateStr = newDate;
      $('.pt-date-chip').removeClass('active');
      $(this).addClass('active');

      renderSlots();
    });

    // 1.1. Chọn ngày trên Full Month Grid (Chế độ Mở rộng - Ảnh 2)
    $(document).off('click', '.pt-month-day-cell:not(.is-empty)').on('click', '.pt-month-day-cell:not(.is-empty)', function () {
      const newDate = $(this).data('date');
      if (!newDate) return;

      ScheduleState.selectedDateStr = newDate;
      $('.pt-month-day-cell').removeClass('active');
      $(this).addClass('active');

      // Đồng bộ sang ngày trên Date Strip
      $('.pt-date-chip').removeClass('active');
      $(`.pt-date-chip[data-date="${newDate}"]`).addClass('active');

      renderSlots();
    });

    // 1.2. Toggle chuyển đổi Mở rộng / Thu gọn bộ chọn ngày
    $(document).off('click', '#btnToggleCalendarMode, #btnToggleBar').on('click', '#btnToggleCalendarMode, #btnToggleBar', function () {
      toggleCalendarMode();
    });

    // 2. Chuyển tháng trước / sau (hỗ trợ cả 2 chế độ)
    $(document).off('click', '#btnPrevMonth').on('click', '#btnPrevMonth', function () {
      if (ScheduleState.currentMonth === 0) {
        ScheduleState.currentMonth = 11;
        ScheduleState.currentYear -= 1;
      } else {
        ScheduleState.currentMonth -= 1;
      }

      const now = new Date();
      if (ScheduleState.currentYear === now.getFullYear() && ScheduleState.currentMonth === now.getMonth()) {
        ScheduleState.selectedDateStr = getTodayDateStr();
      } else {
        ScheduleState.selectedDateStr = `${ScheduleState.currentYear}-${String(ScheduleState.currentMonth + 1).padStart(2, '0')}-01`;
      }

      if (ScheduleState.isCalendarExpanded) {
        renderFullMonthGrid();
      } else {
        renderDateStrip();
      }
      renderSlots();
    });

    $(document).off('click', '#btnNextMonth').on('click', '#btnNextMonth', function () {
      if (ScheduleState.currentMonth === 11) {
        ScheduleState.currentMonth = 0;
        ScheduleState.currentYear += 1;
      } else {
        ScheduleState.currentMonth += 1;
      }

      const now = new Date();
      if (ScheduleState.currentYear === now.getFullYear() && ScheduleState.currentMonth === now.getMonth()) {
        ScheduleState.selectedDateStr = getTodayDateStr();
      } else {
        ScheduleState.selectedDateStr = `${ScheduleState.currentYear}-${String(ScheduleState.currentMonth + 1).padStart(2, '0')}-01`;
      }

      if (ScheduleState.isCalendarExpanded) {
        renderFullMonthGrid();
      } else {
        renderDateStrip();
      }
      renderSlots();
    });

    // 2.1. Tự động đồng bộ lịch khi PT chuyển sang Tab Lịch (PT01)
    $(document).off('click', '#bottomNav .nav-item[data-tab="schedule"]').on('click', '#bottomNav .nav-item[data-tab="schedule"]', function () {
      syncWithBackend();
    });

    // 3. Mở Bottom Sheet [ Xác nhận hoàn thành ] (PT01-US02)
    $(document).off('click', '.btn-confirm-trigger').on('click', '.btn-confirm-trigger', function () {
      const bookingId = $(this).data('booking-id');
      openConfirmModal(bookingId);
    });

    // 4. Đóng Bottom Sheet
    $(document).off('click', '#btnCloseConfirmModal, #btnCancelConfirm').on('click', '#btnCloseConfirmModal, #btnCancelConfirm', function () {
      closeConfirmModal();
    });

    // Đóng khi click backdrop
    $(document).off('click', '#confirmModalOverlay').on('click', '#confirmModalOverlay', function (e) {
      if (e.target === this) {
        closeConfirmModal();
      }
    });

    // 5. Submit form xác nhận hoàn thành (PT01-US02)
    $(document).off('submit', '#formConfirmSession').on('submit', '#formConfirmSession', function (e) {
      e.preventDefault();
      executeConfirmSession();
    });
  }

  let confirmPopupInstance = null;

  /**
   * Mở DevExtreme dxPopup xác nhận kết quả buổi PT (PT01-US02)
   */
  function openConfirmModal(bookingId) {
    const booking = ScheduleState.bookings.find(b => b.id === bookingId);
    if (!booking || booking.ptConfirmed || ['DONE', 'CANCELLED', 'NO_SHOW'].includes(booking.status)) return;
    if (new Date(booking.date + 'T' + booking.startTime) > new Date()) return;

    ScheduleState.activeBookingForConfirm = booking;

    const sessionLabel = booking.sessionNumber ? `Buổi ${booking.sessionNumber} (${booking.id.slice(0, 8)})` : booking.id;
    const sessionInfo = `${sessionLabel} · ${booking.slot}, ${formatDateDisplay(booking.date)}`;
    const memberInfo = `${escapeHtml(booking.memberName)} (${booking.memberCode || 'HV'}) · ${escapeHtml(booking.packageName)}`;
    const branchInfo = booking.branchName || 'Paradise Gym';
    const currentNotes = booking.workoutNotes || '';

    if (confirmPopupInstance) {
      confirmPopupInstance.dispose();
      confirmPopupInstance = null;
    }

    const $popupHost = $('<div id="ptConfirmDxPopupHost">').appendTo('body');
    confirmPopupInstance = $popupHost.dxPopup({
      title: 'Ghi nhận kết quả buổi PT',
      width: () => Math.min(360, window.innerWidth - 24),
      height: 'auto',
      maxHeight: '88vh',
      shadingColor: 'rgba(0, 0, 0, 0.65)',
      showCloseButton: true,
      dragEnabled: false,
      hideOnOutsideClick: true,
      contentTemplate: function () {
        return $(`
          <div class="pt-dx-confirm-content" style="padding: 4px 0;">
            <div class="pt-prefill-box" style="margin-bottom: 12px; background: rgba(255,255,255,0.04); padding: 10px; border-radius: 8px; font-size: 12px; line-height: 1.5;">
              <div style="margin-bottom: 4px;"><strong>Ca tập:</strong> ${sessionInfo}</div>
              <div style="margin-bottom: 4px;"><strong>Học viên:</strong> <span style="color: var(--primary-light, #34d399); font-weight: 600;">${memberInfo}</span></div>
              <div><strong>Chi nhánh:</strong> ${escapeHtml(branchInfo)}</div>
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 6px;">
                Kết quả buổi tập <span style="color: #ef4444;">*</span>
              </label>
              <div style="padding: 8px 12px; background: rgba(16, 185, 129, 0.12); border: 1px solid #10b981; border-radius: 6px; color: #34d399; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-circle-check"></i> Hoàn thành (Đạt chỉ tiêu buổi tập)
              </div>
            </div>

            <div style="margin-bottom: 12px;">
              <label for="dxFitnessNotesInput" style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 6px;">
                Ghi chú đánh giá thể lực & bài tập
              </label>
              <textarea 
                id="dxFitnessNotesInput" 
                class="pt-textarea" 
                rows="3" 
                maxlength="2000" 
                placeholder="Nhập nội dung bài tập, thể trạng học viên, dặn dò dinh dưỡng..." 
                style="width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 8px; font-size: 12px; resize: vertical;"
              >${escapeHtml(currentNotes)}</textarea>
            </div>

            <div style="font-size: 11px; color: #94a3b8; background: rgba(255,255,255,0.03); padding: 8px; border-radius: 6px; line-height: 1.4;">
              <i class="fa-solid fa-shield-halved" style="color: #10b981;"></i> <strong>Cơ chế xác nhận kép:</strong> Khi cả HLV và Hội viên cùng xác nhận, hệ thống sẽ chuyển buổi tập sang DONE và trừ 1 buổi khả dụng.
            </div>
          </div>
        `);
      },
      toolbarItems: [
        {
          widget: 'dxButton',
          toolbar: 'bottom',
          location: 'after',
          options: {
            text: 'Hủy bỏ',
            stylingMode: 'outlined',
            type: 'normal',
            onClick: function () {
              closeConfirmModal();
            }
          }
        },
        {
          widget: 'dxButton',
          toolbar: 'bottom',
          location: 'after',
          options: {
            text: 'Lưu kết quả',
            type: 'default',
            icon: 'check',
            onClick: async function (btnEvent) {
              const fitnessNotes = $('#dxFitnessNotesInput').val()?.trim() || '';
              btnEvent.component.option('disabled', true);
              btnEvent.component.option('text', 'Đang lưu...');

              try {
                const res = await apiClient.pt.ptConfirm(booking.id, { workout_notes: fitnessNotes });
                if (!res?.data) throw new Error('Máy chủ chưa xác nhận lưu kết quả.');
                const saved = res.data.booking || res.data;
                const toastMessage = saved.status === 'COMPLETED' || saved.completed === true
                  ? 'Buổi tập đã đủ xác nhận hai bên.'
                  : 'Đã lưu kết quả của PT. Đang chờ hội viên xác nhận.';

                closeConfirmModal();

                renderSlots();
                renderDateStrip();
                if (ScheduleState.isCalendarExpanded) {
                  renderFullMonthGrid();
                }

                if (window.ptApp && typeof ptApp.showToast === 'function') {
                  ptApp.showToast(toastMessage, 'success');
                }

                if (window.ParadisePTOverview && typeof window.ParadisePTOverview.refresh === 'function') {
                  window.ParadisePTOverview.refresh();
                }

                if (window.ParadisePTNotifications && typeof window.ParadisePTNotifications.markAsReadByReference === 'function') {
                  window.ParadisePTNotifications.markAsReadByReference(booking.id);
                }

                syncWithBackend();
              } catch (err) {
                btnEvent.component.option('disabled', false);
                btnEvent.component.option('text', 'Lưu kết quả');
                if (window.ptApp && typeof ptApp.showToast === 'function') {
                  ptApp.showToast('Không thể lưu kết quả, vui lòng kiểm tra kết nối mạng: ' + (err.message || ''), 'error');
                }
              }
            }
          }
        }
      ],
      onHidden: function () {
        if (confirmPopupInstance) {
          confirmPopupInstance.dispose();
          confirmPopupInstance = null;
        }
        $popupHost.remove();
        ScheduleState.activeBookingForConfirm = null;
      }
    }).dxPopup('instance');

    confirmPopupInstance.show();
  }

  /**
   * Đóng Popup xác nhận kết quả
   */
  function closeConfirmModal() {
    if (confirmPopupInstance) {
      confirmPopupInstance.hide();
    }
    $('#confirmBottomSheet').removeClass('active');
    $('#confirmModalOverlay').fadeOut(150);
    ScheduleState.activeBookingForConfirm = null;
  }

  /**
   * Thực thi xác nhận hoàn thành ca tập (fallback cũ)
   */
  async function executeConfirmSession() {
    closeConfirmModal();
  }

  /**
   * Đồng bộ dữ liệu lịch từ Backend Database PostgreSQL
   */
  async function syncWithBackend() {
    if (!window.apiClient || typeof apiClient.pt?.listBookings !== 'function') return;

    const currentPt = window.ptApp?.currentUser;
    const currentPtId = currentPt?.pt_profile_id;
    if (!currentPtId) return;

    ScheduleState.isLoading = true;
    ScheduleState.hasError = false;
    renderSlots();

    try {
      const res = await apiClient.pt.listBookings(currentPtId ? { pt_id: currentPtId } : {});
      if (window.ptApp?.currentUser?.pt_profile_id !== currentPtId) return;
      ScheduleState.isLoading = false;

      if (res && res.data && Array.isArray(res.data)) {
        let rawBookings = res.data;
        if (currentPtId) {
          rawBookings = rawBookings.filter(b => b.pt_id === currentPtId);
        }

        ScheduleState.bookings = rawBookings.map((item, idx) => {
          let dateStr = '';
          if (item.booking_date) {
            if (typeof item.booking_date === 'string') {
              dateStr = item.booking_date.split('T')[0];
            } else if (item.booking_date instanceof Date) {
              const y = item.booking_date.getFullYear();
              const m = String(item.booking_date.getMonth() + 1).padStart(2, '0');
              const d = String(item.booking_date.getDate()).padStart(2, '0');
              dateStr = `${y}-${m}-${d}`;
            }
          }

          const startTime = item.start_time ? item.start_time.slice(0, 5) : '';
          const endTime = item.end_time ? item.end_time.slice(0, 5) : '';

          return {
            id: item.id,
            sessionNumber: item.session_number || null,
            date: dateStr,
            startTime: startTime,
            endTime: endTime,
            slot: `${startTime} - ${endTime}`,
            memberName: item.member_name || 'Hội viên',
            memberCode: item.member_code || 'HV',
            packageName: item.package_name || item.package_name_snapshot || 'Chưa cập nhật',
            branchName: item.branch_name || 'Chưa cập nhật',
            status: item.status === 'COMPLETED' ? 'DONE' : (item.status === 'PENDING_COMPLETION' ? 'AWAITING_CONFIRMATION' : (item.status === 'BOOKED' ? 'UPCOMING' : item.status)),
            ptConfirmed: !!item.pt_confirmed_at || !!item.pt_confirmed,
            memberConfirmed: !!item.member_confirmed_at || !!item.member_confirmed,
            isDeducted: !!item.is_deducted,
            workoutNotes: item.workout_notes || item.notes || '',
            fitnessNotes: item.fitness_assessment || '',
            cancelReason: item.cancel_reason || ''
          };
        });

        renderSlots();
        renderDateStrip();
        if (ScheduleState.isCalendarExpanded) {
          renderFullMonthGrid();
        }
      }
    } catch (e) {
      ScheduleState.isLoading = false;
      ScheduleState.hasError = true;
      renderSlots();
      console.warn('Schedule sync with backend error:', e.message);
      // PT01-US01 Exception Flow: Lỗi kết nối mạng
      if (window.ptApp && typeof ptApp.showToast === 'function') {
        ptApp.showToast('Không thể nạp dữ liệu lịch tập, vui lòng kiểm tra kết nối mạng và thử lại', 'error');
      }
    }
  }

  /**
   * Helper format date DD/MM/YYYY
   */
  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  /**
   * Trả về thống kê các buổi tập cho Module Overview (PT06)
   */
  function getScheduleStats() {
    const completed = ScheduleState.bookings.filter(b => b.status === 'DONE' || b.status === 'COMPLETED').length;
    const upcoming = ScheduleState.bookings.filter(b => b.status === 'UPCOMING' || b.status === 'BOOKED').length;
    const awaiting = ScheduleState.bookings.filter(b => b.status === 'AWAITING_CONFIRMATION' || b.status === 'PENDING_COMPLETION').length;
    return { completed, upcoming, awaiting };
  }

  /**
   * Inject CSS riêng cho Module PT01
   */
  function injectScheduleStyles() {
    if (document.getElementById('pt-schedule-custom-styles')) return;

    const style = document.createElement('style');
    style.id = 'pt-schedule-custom-styles';
    style.textContent = `
      .pt-schedule-topbar {
        margin-bottom: 12px;
      }
      .pt-schedule-main-title {
        font-size: 17px;
        font-weight: 800;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pt-schedule-badge-hours {
        display: inline-block;
        font-size: 11px;
        font-weight: 600;
        color: var(--primary-light);
        background: rgba(16, 185, 129, 0.12);
        padding: 2px 8px;
        border-radius: var(--radius-full);
        margin-top: 4px;
        border: 1px solid rgba(16, 185, 129, 0.2);
      }

      /* Calendar Strip & Expandable Full Month Card (PT01-US01) */
      .pt-calendar-strip-card {
        background: #0f172a;
        background: linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(6, 78, 59, 0.4));
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        padding: 14px 12px 10px;
        margin-bottom: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
      }
      .pt-month-picker-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        padding: 0 4px;
      }
      .pt-month-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 8px;
        transition: background 0.2s ease;
      }
      .pt-month-title-wrap:hover {
        background: rgba(255, 255, 255, 0.08);
      }
      .pt-month-display {
        font-size: 14px;
        font-weight: 800;
        color: #FFFFFF;
      }
      .pt-calendar-toggle-badge {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: var(--primary-light);
      }
      .pt-month-nav-group {
        display: flex;
        gap: 6px;
      }
      .pt-month-nav-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.2s ease;
      }
      .pt-month-nav-btn:hover {
        background: var(--primary);
        border-color: var(--primary);
        color: #022016;
      }

      /* Date Strip Horizontal Scroll */
      .pt-date-strip-scroll {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding: 4px 2px 8px;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .pt-date-strip-scroll::-webkit-scrollbar {
        display: none;
      }
      .pt-date-chip {
        flex: 0 0 52px;
        height: 68px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        padding: 4px;
      }
      .pt-date-chip.is-weekend {
        opacity: 0.55;
      }
      .pt-date-chip:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
      }
      .pt-date-chip.active {
        background: linear-gradient(135deg, var(--primary-dark), var(--primary));
        border-color: var(--primary-light);
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);
        transform: translateY(-2px);
      }
      .pt-chip-day {
        font-size: 10.5px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
      }
      .pt-date-chip.active .pt-chip-day {
        color: #FFFFFF;
      }
      .pt-chip-num {
        font-size: 17px;
        font-weight: 800;
        color: #FFFFFF;
        margin-top: 2px;
      }
      .pt-date-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        margin-top: 4px;
      }
      .dot-amber { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
      .dot-blue { background: #3b82f6; box-shadow: 0 0 6px #3b82f6; }
      .dot-emerald { background: #10b981; box-shadow: 0 0 6px #10b981; }

      /* Full Month Grid Container */
      .pt-full-month-container {
        padding-top: 4px;
      }
      .pt-month-weekdays-row {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        margin-bottom: 6px;
        text-align: center;
      }
      .pt-weekday-col {
        font-size: 10.5px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        padding: 4px 0;
      }
      .pt-month-days-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 5px;
      }
      .pt-month-day-cell {
        aspect-ratio: 1;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        transition: all 0.2s ease;
      }
      .pt-month-day-cell.is-empty {
        background: transparent;
        border: none;
        cursor: default;
      }
      .pt-month-day-cell.is-weekend {
        opacity: 0.45;
      }
      .pt-month-day-cell:not(.is-empty):hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
      }
      .pt-month-day-cell.active {
        background: linear-gradient(135deg, var(--primary-dark), var(--primary));
        border-color: var(--primary-light);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.45);
      }
      .pt-day-number {
        font-size: 12.5px;
        font-weight: 700;
        color: #FFFFFF;
      }
      .pt-grid-dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        margin-top: 2px;
      }

      /* Toggle Bar at bottom of card */
      .pt-calendar-toggle-bar {
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 11.5px;
        font-weight: 600;
        color: var(--primary-light);
        cursor: pointer;
        transition: color 0.2s ease;
      }
      .pt-calendar-toggle-bar:hover {
        color: #FFFFFF;
      }

      /* Selected Day Header */
      .pt-selected-day-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 14px 0 10px;
        padding: 0 4px;
      }
      .pt-selected-date-text {
        font-size: 14.5px;
        font-weight: 800;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pt-today-tag {
        font-size: 10px;
        background: var(--primary);
        color: #022016;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 800;
      }
      .pt-slots-counter-badge {
        font-size: 11px;
        color: var(--text-muted);
        background: rgba(255, 255, 255, 0.06);
        padding: 3px 8px;
        border-radius: 6px;
      }

      /* Weekend Alert Box */
      .pt-weekend-alert {
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.35);
        border-radius: var(--radius-sm);
        padding: 10px 14px;
        font-size: 12px;
        color: #fef08a;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }
      .pt-weekend-alert i {
        font-size: 16px;
        color: #f59e0b;
        flex-shrink: 0;
      }

      /* Slots Grid (5 Standard Slots) */
      .pt-slots-grid {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 18px;
      }
      .pt-slot-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        display: flex;
        overflow: hidden;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }
      .pt-slot-time-col {
        width: 86px;
        flex-shrink: 0;
        background: rgba(255, 255, 255, 0.02);
        border-right: 1px solid var(--border-color);
        padding: 14px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .pt-slot-time-text {
        font-size: 11.5px;
        font-weight: 800;
        color: #FFFFFF;
        line-height: 1.3;
      }
      .pt-slot-index {
        font-size: 9.5px;
        font-weight: 700;
        color: var(--text-sub);
        margin-top: 4px;
        text-transform: uppercase;
      }
      .pt-slot-info-col {
        flex: 1;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      /* 1. Slot Trống */
      .pt-slot-card.slot-empty {
        border-style: dashed;
        border-color: rgba(255, 255, 255, 0.1);
        opacity: 0.75;
      }
      .pt-slot-card.slot-empty:hover {
        opacity: 1;
        border-color: rgba(255, 255, 255, 0.2);
      }
      .pt-empty-badge {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-muted);
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .pt-empty-hint {
        font-size: 10px;
        color: var(--text-sub);
        margin-top: 4px;
      }

      /* 2. Slot UPCOMING */
      .pt-slot-card.slot-upcoming {
        border-left: 4px solid #3b82f6;
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, var(--bg-card) 60%);
      }
      .pt-slot-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .pt-slot-status-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .badge-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
      .badge-amber { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
      .badge-emerald { background: rgba(16, 185, 129, 0.2); color: #34d399; }
      .badge-gray { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }

      .pt-slot-id {
        font-size: 10px;
        color: var(--text-sub);
        font-family: monospace;
      }
      .pt-slot-member-name {
        font-size: 14px;
        font-weight: 800;
        color: #FFFFFF;
        margin-bottom: 4px;
      }
      .pt-slot-meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 11px;
        color: var(--text-muted);
        margin-bottom: 6px;
      }
      .pt-slot-actions {
        margin-top: 6px;
      }
      .btn-confirm-trigger {
        width: 100%;
        background: linear-gradient(135deg, #065f46, var(--primary));
        color: #FFFFFF;
        border: none;
        border-radius: 6px;
        padding: 7px 12px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
        transition: filter 0.2s ease;
      }
      .btn-confirm-trigger:hover {
        filter: brightness(1.1);
      }
      .pt-locked-hint {
        font-size: 10px;
        color: var(--text-sub);
        font-style: italic;
      }

      /* 3. Slot AWAITING CONFIRMATION */
      .pt-slot-card.slot-awaiting {
        border-left: 4px solid #f59e0b;
        background: linear-gradient(90deg, rgba(245, 158, 11, 0.08) 0%, var(--bg-card) 60%);
      }
      .pt-awaiting-notice {
        font-size: 10.5px;
        color: #fef08a;
        background: rgba(245, 158, 11, 0.12);
        padding: 4px 8px;
        border-radius: 4px;
        margin: 4px 0 6px;
        display: flex;
        align-items: center;
        gap: 5px;
      }

      /* 4. Slot DONE */
      .pt-slot-card.slot-done {
        border-left: 4px solid #10b981;
        background: linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 60%);
      }
      .pt-slot-fitness-notes {
        font-size: 11px;
        color: #cbd5e1;
        background: rgba(255, 255, 255, 0.04);
        padding: 5px 8px;
        border-radius: 4px;
        margin-top: 4px;
        border-left: 2px solid var(--primary);
      }
      .pt-slot-done-footer {
        font-size: 10px;
        color: var(--primary-light);
        margin-top: 6px;
        display: flex;
        align-items: center;
        gap: 5px;
        font-weight: 700;
      }

      /* 5. Slot CANCELLED */
      .pt-slot-card.slot-cancelled {
        border-left: 4px solid #64748b;
        opacity: 0.65;
      }
      .pt-slot-cancel-reason {
        font-size: 10px;
        color: #f87171;
        margin-top: 3px;
      }

      /* Bottom Sheet Modal Confirmation */
      .pt-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        z-index: 120;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .pt-bottom-sheet {
        width: 100%;
        max-width: 410px;
        background: #111827;
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        padding: 16px 18px 24px;
        box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.8);
        animation: sheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes sheetSlideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      .pt-sheet-handle {
        width: 40px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        margin: 0 auto 12px;
      }
      .pt-sheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
      }
      .pt-sheet-title {
        font-size: 15px;
        font-weight: 800;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pt-sheet-close-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 13px;
      }
      .pt-sheet-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .pt-prefill-box {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pt-prefill-row {
        display: flex;
        justify-content: space-between;
        font-size: 11.5px;
        gap: 8px;
      }
      .pt-prefill-label {
        color: var(--text-muted);
        flex-shrink: 0;
      }
      .pt-prefill-value {
        color: #FFFFFF;
        font-weight: 600;
        text-align: right;
      }
      .pt-prefill-value.text-highlight {
        color: var(--primary-light);
      }
      .pt-form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pt-form-label {
        font-size: 12px;
        font-weight: 700;
        color: #FFFFFF;
      }
      .required-star {
        color: var(--accent-danger);
      }
      .pt-result-static-choice {
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 8px;
        padding: 10px 12px;
      }
      .pt-result-radio {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--primary-light);
        font-size: 12.5px;
        font-weight: 700;
      }
      .pt-textarea {
        width: 100%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        padding: 10px 12px;
        color: #FFFFFF;
        font-size: 12.5px;
        font-family: inherit;
        resize: none;
      }
      .pt-textarea:focus {
        outline: none;
        border-color: var(--primary);
        background: rgba(255, 255, 255, 0.08);
      }
      .pt-form-hint {
        font-size: 10px;
        color: var(--text-sub);
      }
      .pt-dual-confirm-notice {
        background: rgba(6, 182, 212, 0.12);
        border: 1px solid rgba(6, 182, 212, 0.25);
        border-radius: 8px;
        padding: 9px 12px;
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      .pt-dual-confirm-notice i {
        color: #06b6d4;
        font-size: 14px;
        margin-top: 2px;
        flex-shrink: 0;
      }
      .pt-dual-confirm-text {
        font-size: 10.5px;
        color: #cffafe;
        line-height: 1.4;
      }
      .pt-sheet-actions {
        display: flex;
        gap: 10px;
      }
      .pt-sheet-actions .btn {
        flex: 1;
      }

      .pill-blue {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: var(--radius-sm);
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .pt-schedule-loading {
        text-align: center;
        padding: 24px;
        font-size: 13px;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .pt-empty-schedule-banner {
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.25);
        border-radius: var(--radius-sm);
        padding: 10px 14px;
        font-size: 12px;
        color: #93c5fd;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Chọn ngày trên Lịch và cuộn đến ca tập tương ứng (dùng khi link từ Overview KPI hoặc Notification)
   */
  function selectDate(dateStr, highlightBookingId, highlightStatus) {
    if (!dateStr) return;

    ScheduleState.selectedDateStr = dateStr;

    // Phân tích năm/tháng
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      ScheduleState.currentYear = parseInt(parts[0], 10);
      ScheduleState.currentMonth = parseInt(parts[1], 10) - 1;
    }

    renderDateStrip();
    renderSlots();

    if (ScheduleState.isCalendarExpanded) {
      renderFullMonthGrid();
    }

    // Cuộn tới chip ngày được chọn trên horizontal strip
    setTimeout(() => {
      const $activeChip = $(`.pt-date-chip[data-date="${dateStr}"]`);
      if ($activeChip.length) {
        $('.pt-date-chip').removeClass('active');
        $activeChip.addClass('active');
        const strip = document.getElementById('ptDateStrip');
        if (strip && $activeChip[0]) {
          const scrollLeft = $activeChip[0].offsetLeft - (strip.clientWidth / 2) + ($activeChip[0].clientWidth / 2);
          strip.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
        }
      }

      // Highlight slot tương ứng
      let $targetSlot = null;
      if (highlightBookingId) {
        $targetSlot = $(`[data-booking-id="${highlightBookingId}"]`);
      }
      if ((!$targetSlot || !$targetSlot.length) && highlightStatus) {
        $targetSlot = $(`.pt-slot-card[data-status="${highlightStatus}"]`);
      }

      if ($targetSlot && $targetSlot.length) {
        $targetSlot.addClass('is-slot-highlighted');
        $targetSlot[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          $targetSlot.removeClass('is-slot-highlighted');
        }, 3500);
      }
    }, 150);
  }

  // Tự động inject style khi nạp script
  if (typeof document !== 'undefined') {
    injectScheduleStyles();
  }

  return {
    init,
    reset: () => { ScheduleState.bookings = []; ScheduleState.hasError = false; ScheduleState.isLoading = false; closeConfirmModal(); renderSlots(); },
    refresh: syncWithBackend,
    syncWithBackend,
    selectDate,
    navigateToDate: selectDate,
    openConfirmModal,
    closeConfirmModal,
    getScheduleStats,
    getState: () => ScheduleState
  };
});
