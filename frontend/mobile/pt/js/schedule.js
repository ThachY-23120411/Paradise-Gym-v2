/**
 * ==========================================================================
 * PARADISE GYM - MOBILE PT APP (TAB 3: anti-3-PT)
 * MODULE PT01: LỊCH DẠY PT & GHI NHẬN KẾT QUẢ BUỔI HỌC
 * ==========================================================================
 * - PT01-US01: Lịch dạy theo giờ thực tế từ API và đặt lịch cho chính PT.
 *              Calendar Horizontal Strip cuộn ngang chọn ngày (kèm bộ chọn tháng).
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

  let trainerProfile = null;
  let bookingPopup = null;
  let syncSequence = 0;

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

  function isNonWorkingDay(date, trainer = trainerProfile) {
    const day = new Date(`${date}T12:00:00`).getDay();
    return trainer?.work_days === 'MON_TO_FRI' ? day === 0 || day === 6
      : trainer?.work_days === 'MON_TO_SAT' ? day === 0
      : Array.isArray(trainer?.work_days) && !trainer.work_days.map(Number).includes(day);
  }

  function showWorkHours() {
    const p = trainerProfile;
    const days = p?.work_days === 'MON_TO_FRI' ? 'Thứ 2 - Thứ 6'
      : p?.work_days === 'MON_TO_SAT' ? 'Thứ 2 - Thứ 7'
        : ['ALL_DAYS', 'ALL_WEEK'].includes(p?.work_days) ? 'Cả tuần'
        : Array.isArray(p?.work_days) ? p.work_days.map(d => Number(d) === 0 ? 'CN' : `Thứ ${Number(d) + 1}`).join(', ') : p?.work_days;
    $('#ptWorkHours').text(p?.work_start_time && p?.work_end_time
      ? `${p.work_start_time.slice(0, 5)} - ${p.work_end_time.slice(0, 5)}${days ? ` (${days})` : ''}`
      : days || 'Chưa có giờ làm việc');
  }

  function apiRows(response) {
    if (!Array.isArray(response?.data)) throw new Error('Dữ liệu máy chủ không hợp lệ.');
    return response.data;
  }

  async function ownTrainer(id) {
    const trainer = apiRows(await apiClient.pt.listTrainers()).find(p => p.id === id);
    if (!trainer?.branch_id) throw new Error('Không tìm thấy hồ sơ HLV và chi nhánh phụ trách.');
    return trainer;
  }

  function bookingDuration(registration) {
    // POST validates against the current package duration exposed by registrations.
    const duration = Number(Object.prototype.hasOwnProperty.call(registration || {}, 'session_duration_minutes')
      ? registration.session_duration_minutes : registration?.session_duration_minutes_snapshot);
    return Number.isInteger(duration) && duration > 0 ? duration : null;
  }

  function bookingEnd(start, duration) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start || '') || !duration) return '';
    const [hour, minute] = start.split(':').map(Number);
    const total = hour * 60 + minute + duration;
    return total < 1440 ? `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` : '';
  }

  function bookingDate(value) {
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) return '';
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
    return typeof value === 'string' ? value.slice(0, 10) : '';
  }

  function eligibleRegistration(r, trainer, date) {
    return r.assigned_pt_id === trainer.id && ['ACTIVE', 'SCHEDULED'].includes(r.status)
      && !r.is_frozen && Number(r.remaining_pt_sessions) > 0
      && (!r.start_date || r.start_date.slice(0, 10) <= date)
      && (!r.end_date || r.end_date.slice(0, 10) >= date)
      && (!Array.isArray(r.allowed_branch_ids) || r.allowed_branch_ids.includes(trainer.branch_id));
  }

  function openBookingPopup() {
    if (bookingPopup) { bookingPopup.show(); return; }
    const ptId = window.ptApp?.currentUser?.pt_profile_id;
    if (!ptId || !window.apiClient) return;
    let closed = false, busy = false, ready = false, updating = false, sequence = 0;
    let trainer = null, registrations = [], form, saveButton, retryButton;
    let participantSequence = 0, participantsReady = false, participantIds = [];
    const data = { pt_name: '', branch_name: '', member_id: null, registration_id: null,
      date: ScheduleState.selectedDateStr, start_time: '', duration_display: '', end_time: '',
      contract_rights: 'Chưa chọn hợp đồng', participants: 'Chưa chọn hợp đồng', note: '' };
    const $host = $('<div>').appendTo('body');
    const $error = $('<div class="pt-booking-message" role="alert" aria-live="polite">');
    const alive = () => !closed && window.ptApp?.currentUser?.pt_profile_id === ptId;
    const selected = () => registrations.find(r => r.id === data.registration_id && r.member_id === data.member_id);
    function derived() {
      const registration = selected();
      const duration = bookingDuration(registration);
      form.updateData('contract_rights', registration
        ? `Từ ${registration.start_date ? formatDateDisplay(bookingDate(registration.start_date)) : 'Chưa cập nhật'} · ${registration.end_date === null ? 'Không giới hạn' : registration.end_date ? `Đến ${formatDateDisplay(bookingDate(registration.end_date))}` : 'Chưa cập nhật hạn dùng'} · ${registration.remaining_pt_sessions == null ? 'Chưa cập nhật số buổi' : `${registration.remaining_pt_sessions} buổi khả dụng`}`
        : 'Chưa chọn hợp đồng');
      form.updateData('duration_display', duration ? `${duration} phút` : selected() ? 'Gói chưa có thời lượng hợp lệ' : '');
      form.updateData('end_time', bookingEnd(data.start_time, duration));
      if (data.start_time) form.getEditor('start_time').element().dxValidator('instance')?.validate();
      saveButton?.option('disabled', busy || !ready || !participantsReady || !selected() || !data.end_time);
    }
    async function loadParticipants() {
      const ticket = ++participantSequence;
      const registration = selected();
      participantsReady = false;
      participantIds = [];
      form.updateData('participants', registration ? 'Đang tải thành viên...' : 'Chưa chọn hợp đồng');
      derived();
      if (!registration) return;
      const group = ['GROUP_1_N', 'GROUP_PT'].includes(registration.package_mode_snapshot || registration.package_mode);
      try {
        let participants;
        if (group) {
          const response = await apiClient.request(`/registrations/${encodeURIComponent(registration.id)}/group-members`);
          if (!alive() || ticket !== participantSequence || selected()?.id !== registration.id) return;
          const payload = response?.data;
          if (payload?.registration_id !== registration.id || !payload?.leader?.id || !Array.isArray(payload.members)) {
            throw new Error('Không tải được đầy đủ thành viên nhóm.');
          }
          participants = [
            { ...payload.leader, member_id: payload.leader.id, isLeader: true },
            ...payload.members.filter(member => member.invitation_status === 'ACCEPTED' && member.member_id !== payload.leader.id)
          ];
        } else {
          participants = [{ member_id: registration.member_id, full_name: registration.member_name, member_code: registration.member_code }];
        }
        if (!alive() || ticket !== participantSequence) return;
        if (participants.some(member => !member.member_id || !member.full_name)) throw new Error('Thông tin thành viên chưa đầy đủ.');
        participantIds = [...new Set(participants.map(member => member.member_id))].sort();
        form.updateData('participants', participants.map(member => `${member.full_name}${member.member_code ? ` · ${member.member_code}` : ''}${member.isLeader ? ' · Trưởng nhóm' : ''}`).join('\n'));
        participantsReady = true;
        derived();
      } catch (error) {
        if (!alive() || ticket !== participantSequence) return;
        form.updateData('participants', 'Không thể tải thành viên');
        $error.text(error.message || 'Không thể tải thành viên nhóm.');
      }
    }
    function options() {
      updating = true;
      const available = registrations.filter(r => eligibleRegistration(r, trainer, data.date));
      const members = [...new Map(available.map(r => [r.member_id, {
        id: r.member_id, label: [r.member_name, r.member_code, r.member_phone].filter(Boolean).join(' · ')
      }])).values()];
      if (!members.some(m => m.id === data.member_id)) form.updateData('member_id', null);
      form.getEditor('member_id').option({ dataSource: members, disabled: busy || !ready,
        noDataText: 'Không có học viên có gói khả dụng' });
      const packages = available.filter(r => r.member_id === data.member_id);
      if (!packages.some(r => r.id === data.registration_id)) form.updateData('registration_id', null);
      form.getEditor('registration_id').option({ dataSource: packages, disabled: busy || !ready || !data.member_id,
        noDataText: 'Không có gói PT khả dụng' });
      derived();
      updating = false;
      return available;
    }
    async function reload() {
      const ticket = ++sequence;
      participantSequence++;
      participantsReady = false;
      ready = false;
      form.option('disabled', true);
      saveButton?.option('disabled', true);
      retryButton?.option('disabled', true);
      $error.text('Đang tải học viên và gói tập...');
      try {
        const results = await Promise.allSettled([ownTrainer(ptId), apiClient.registrations.list({ pt_id: ptId })]);
        if (!alive() || ticket !== sequence) return false;
        const failed = results.find(r => r.status === 'rejected');
        if (failed) throw failed.reason;
        trainer = results[0].value;
        registrations = apiRows(results[1].value).filter(r => r.assigned_pt_id === ptId);
        trainerProfile = trainer;
        showWorkHours();
        form.updateData('pt_name', [trainer.full_name, trainer.pt_code].filter(Boolean).join(' · '));
        form.updateData('branch_name', trainer.branch_name || '');
        ready = trainer.status === 'ACTIVE';
        form.option('disabled', busy);
        const available = options();
        $error.text(!ready ? 'HLV không ở trạng thái hoạt động.' : available.length ? '' : 'Không có gói PT khả dụng trong ngày đã chọn.');
        await loadParticipants();
        return ready && (!selected() || participantsReady);
      } catch (error) {
        if (alive() && ticket === sequence) $error.text(error.message || 'Không thể tải dữ liệu đặt lịch.');
        return false;
      } finally {
        if (alive() && ticket === sequence) retryButton?.option('disabled', busy);
      }
    }
    const required = [{ type: 'required', message: 'Vui lòng chọn hoặc nhập giá trị.' }];
    const field = (name, label, type, extra = {}) => ({ dataField: name, label: { text: label }, editorType: type,
      editorOptions: { inputAttr: { 'aria-label': label }, ...extra } });
    const popup = $host.dxPopup({
      title: 'Đặt lịch PT', width: () => Math.min(520, window.innerWidth - 24), height: 'auto', maxHeight: '90vh',
      showCloseButton: true, dragEnabled: false, hideOnOutsideClick: false,
      wrapperAttr: { class: 'pt-booking-popup' },
      onHiding: e => { if (busy && alive()) e.cancel = true; },
      onHidden: () => { closed = true; sequence++; participantSequence++; bookingPopup = null; popup.dispose(); $host.remove(); },
      contentTemplate: container => {
        const $content = $('<div class="pt-booking-content">').appendTo(container);
        $error.appendTo($content);
        form = $('<div>').appendTo($content).dxForm({ formData: data, labelLocation: 'top', colCount: 1,
          items: [
            field('pt_name', 'PT phụ trách', 'dxTextBox', { readOnly: true }),
            field('branch_name', 'Chi nhánh phục vụ', 'dxTextBox', { readOnly: true }),
            { ...field('date', 'Ngày tập', 'dxDateBox', { type: 'date', displayFormat: 'dd/MM/yyyy',
              dateSerializationFormat: 'yyyy-MM-dd', min: getTodayDateStr(), useMaskBehavior: true }), validationRules: required },
            { ...field('member_id', 'Hội viên', 'dxSelectBox', { dataSource: [], valueExpr: 'id', displayExpr: 'label', searchEnabled: true, showClearButton: true }), validationRules: required },
            { ...field('registration_id', 'Gói PT sử dụng', 'dxSelectBox', { dataSource: [], valueExpr: 'id', searchEnabled: true,
              displayExpr: r => r ? `${r.reg_code || r.registration_code || ''} · ${r.package_name_snapshot || r.package_name || ''} · ${r.remaining_pt_sessions} buổi` : '' }), validationRules: required },
            field('contract_rights', 'Thời hạn và số buổi khả dụng', 'dxTextArea', { readOnly: true, height: 76 }),
            field('participants', 'Thành viên tham gia', 'dxTextArea', { readOnly: true, autoResizeEnabled: true, minHeight: 76, maxHeight: 160 }),
            { ...field('start_time', 'Giờ bắt đầu', 'dxTextBox', { mode: 'time', valueChangeEvent: 'input change' }),
              validationRules: [...required, {
                type: 'custom', reevaluate: true,
                message: 'Giờ bắt đầu phải hợp lệ và buổi tập phải kết thúc trong cùng ngày.',
                validationCallback: e => !e.value || !bookingDuration(selected()) || !!bookingEnd(e.value, bookingDuration(selected()))
              }] },
            field('duration_display', 'Thời lượng buổi tập', 'dxTextBox', { readOnly: true }),
            field('end_time', 'Giờ kết thúc', 'dxTextBox', { readOnly: true }),
            field('note', 'Ghi chú cho buổi (không bắt buộc)', 'dxTextArea', { maxLength: 2000, height: 80 })
          ],
          onFieldDataChanged: e => {
            if (!ready || busy || updating) return;
            if (e.dataField === 'date') {
              updating = true;
              form.updateData('date', bookingDate(e.value));
              updating = false;
              reload();
            } else if (e.dataField === 'member_id') {
              updating = true;
              form.updateData('registration_id', null);
              form.getEditor('registration_id').option('dataSource', []);
              participantSequence++;
              participantsReady = false;
              form.updateData('participants', 'Chưa chọn hợp đồng');
              derived();
              updating = false;
              reload();
            }
            else if (e.dataField === 'registration_id') { $error.empty(); loadParticipants(); }
            else if (e.dataField === 'start_time') derived();
          }
        }).dxForm('instance');
      },
      toolbarItems: [
        { widget: 'dxButton', toolbar: 'bottom', location: 'before', options: { icon: 'refresh', hint: 'Tải lại lựa chọn',
          onInitialized: e => { retryButton = e.component; }, onClick: reload } },
        { widget: 'dxButton', toolbar: 'bottom', location: 'after', options: { text: 'Đặt lịch', icon: 'plus', type: 'default', disabled: true,
          onInitialized: e => { saveButton = e.component; }, onClick: async () => {
            if (busy || !ready || !participantsReady || !form.validate().isValid) return;
            const requestedId = data.registration_id;
            const previousDuration = bookingDuration(selected());
            const previousParticipants = participantIds.join(',');
            busy = true;
            saveButton.option({ disabled: true, text: 'Đang lưu...' });
            try {
              if (!await reload()) return;
              const reg = selected();
              if (!reg || reg.id !== requestedId || bookingDuration(reg) !== previousDuration) throw new Error('Gói tập đã thay đổi. Vui lòng chọn lại gói và giờ tập.');
              if (participantIds.join(',') !== previousParticipants) throw new Error('Thành viên tham gia đã thay đổi. Vui lòng kiểm tra lại trước khi đặt lịch.');
              const duration = bookingDuration(reg), end = bookingEnd(data.start_time, duration);
              if (!end) throw new Error('Giờ bắt đầu hoặc thời lượng không hợp lệ; buổi tập phải kết thúc trong ngày.');
              if (!data.date || data.date < getTodayDateStr() || new Date(`${data.date}T${data.start_time}:00+07:00`) <= new Date()) throw new Error('Vui lòng chọn thời gian trong tương lai.');
              if (isNonWorkingDay(data.date, trainer)) throw new Error('Ngày tập nằm ngoài ngày làm việc của HLV.');
              const response = await apiClient.pt.createBooking({ registration_id: reg.id, member_id: reg.member_id,
                pt_id: ptId, branch_id: trainer.branch_id, booking_date: data.date, start_time: data.start_time,
                end_time: end, session_duration_minutes: duration, workout_notes: data.note.trim() });
              if (!response?.data) throw new Error('Chưa nhận được xác nhận từ máy chủ. Hãy tải lại lịch trước khi thử lại.');
              if (!alive()) return;
              busy = false;
              closed = true;
              popup.hide();
              selectDate(data.date);
              await syncWithBackend();
              window.ParadisePTOverview?.refresh?.();
              window.ParadisePTClients?.refresh?.();
              window.ptApp?.showToast?.('Đã đặt lịch PT.', 'success');
            } catch (error) {
              if (alive()) $error.text(error.message || 'Không thể đặt lịch.');
            } finally {
              busy = false;
              if (alive()) {
                form.option('disabled', !ready);
                retryButton.option('disabled', false);
                saveButton.option('text', 'Đặt lịch');
                options();
              }
            }
          } } }
      ],
      onShown: () => { if (!trainer) reload(); }
    }).dxPopup('instance');
    bookingPopup = popup;
    popup.show();
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
          <span class="pt-schedule-badge-hours" id="ptWorkHours">Đang tải giờ làm việc...</span>
        </div>
        <button type="button" class="btn btn-primary" id="ptCreateBooking" aria-label="Đặt lịch PT"><i class="fa-solid fa-plus" aria-hidden="true"></i> Đặt lịch</button>
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
          0 buổi
        </div>
      </div>

      <div class="pt-weekend-alert" id="weekendAlertBox" style="display: none;">
        <i class="fa-solid fa-mug-hot"></i>
        <span>Ngày nghỉ theo lịch làm việc của HLV.</span>
      </div>

      <!-- Danh sách lịch tập thực tế trong ngày -->
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
                  Đánh giá của PT
                </label>
                <textarea 
                  class="pt-textarea" 
                  id="modalFitnessNotes" maxlength="2000" 
                  rows="3" 
                  placeholder="Nhập đánh giá buổi học, thể trạng học viên, dặn dò..."></textarea>
                <span class="pt-form-hint">
                  <i class="fa-solid fa-circle-info"></i> Đánh giá này sẽ được lưu vào lịch sử tập luyện của học viên.
                </span>
              </div>

              <!-- Thông tin cơ chế xác nhận kép -->
              <div class="pt-dual-confirm-notice">
                <i class="fa-solid fa-shield-halved"></i>
                <div class="pt-dual-confirm-text">
                  <strong>Trạng thái:</strong> Chờ xác nhận của PT và hội viên. Không trừ thêm buổi đã giữ khi đặt lịch.
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
      const isWeekend = isNonWorkingDay(dateStr);

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
        <div role="button" tabindex="0" aria-label="${dateStr}" aria-pressed="${isSelected}" class="pt-date-chip ${isSelected ? 'active' : ''} ${isWeekend ? 'is-weekend' : ''}"
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
    return !!dateStr && !!slotStart && new Date(`${dateStr}T${slotStart}:00+07:00`) <= new Date();
  }

  function isSlotEndedOrPassed(dateStr, slotEnd) {
    return !!dateStr && !!slotEnd && new Date(`${dateStr}T${slotEnd}:00+07:00`) <= new Date();
  }

  /**
   * Render lịch tập theo thời gian thực tế (PT01-US01)
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
    $('#selectedDateText').text(formattedDate);

    const isWeekend = isNonWorkingDay(ScheduleState.selectedDateStr);
    if (isWeekend) {
      $('#weekendAlertBox').show().find('span').text('Ngày nghỉ theo lịch làm việc của HLV.');
    } else {
      $('#weekendAlertBox').hide();
    }

    const dayBookings = ScheduleState.bookings.filter(b => b.date === ScheduleState.selectedDateStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
    $('#slotsCounterBadge').text(`${dayBookings.length} buổi`);

    let html = '';

    // PT01-US01 Exception Flow: PT chưa được phân công học viên nào
    if (dayBookings.length === 0) {
      html += `
        <div class="pt-empty-schedule-banner">
          <i class="fa-solid fa-circle-info"></i>
          <span>Không có lịch tập trong ngày này.</span>
        </div>
      `;
    }

    dayBookings.forEach(booking => {
      const slot = { start: booking.startTime, label: escapeHtml(booking.slot) };
      const [sh, sm] = (booking.startTime || '').split(':').map(Number);
      const [eh, em] = (booking.endTime || '').split(':').map(Number);
      const durationMin = (!isNaN(sh) && !isNaN(eh)) ? (eh * 60 + em) - (sh * 60 + sm) : (booking.durationMinutes || 60);

      const hasEnded = isSlotEndedOrPassed(booking.date, booking.endTime);

      let stateClass = 'upcoming';
      let statusPillText = 'Đã đặt';
      let buttonsHtml = '';

      if (booking.status === 'UPCOMING') {
        stateClass = 'upcoming';
        statusPillText = 'Đã đặt';
        if (!booking.ptConfirmed) {
          if (hasEnded) {
            buttonsHtml = `<button type="button" class="pt-btn-card-complete is-ended btn-confirm-trigger" data-booking-id="${booking.id}"><i class="fa-solid fa-check"></i> Xác nhận hoàn thành</button>`;
          } else {
            buttonsHtml = `<button type="button" class="pt-btn-card-complete is-waiting" disabled title="Chỉ có thể xác nhận sau khi kết thúc buổi tập (${booking.endTime})"><i class="fa-solid fa-check"></i> Xác nhận hoàn thành</button>`;
          }
        }
      } else if (booking.status === 'AWAITING_CONFIRMATION') {
        stateClass = 'awaiting';
        statusPillText = 'Chờ xác nhận hoàn thành';
        buttonsHtml = `<span class="pt-card-status-pill" style="background:rgba(255,255,255,0.25);"><i class="fa-solid fa-hourglass-half"></i> ${booking.ptConfirmed ? 'Chờ Hội viên xác nhận' : 'Chờ xác nhận'}</span>`;
      } else if (booking.status === 'DONE' || booking.status === 'COMPLETED') {
        stateClass = 'done';
        statusPillText = 'Hoàn thành';
        buttonsHtml = `<span class="pt-card-status-pill" style="background:rgba(255,255,255,0.25);"><i class="fa-solid fa-check-double"></i> Đã hoàn thành</span>`;
      } else if (booking.status === 'CANCELLED') {
        stateClass = 'cancelled';
        statusPillText = 'Đã hủy';
        buttonsHtml = '';
      } else {
        stateClass = 'cancelled';
        statusPillText = booking.status === 'NO_SHOW' ? 'Vắng mặt' : booking.status;
        buttonsHtml = '';
      }

      html += `
        <div class="pt-slot-card pt-appointment-card slot-${stateClass} pt-status-${stateClass}" 
             data-booking-id="${booking.id}" data-status="${booking.status}"
             style="min-height: ${Math.max(68, Math.round(durationMin * 0.85))}px;">
          <div class="pt-card-top-row">
            <div class="pt-card-top-left">
              <span class="pt-card-time"><i class="fa-regular fa-clock"></i> <strong>${slot.start} - ${booking.endTime}</strong></span>
              <span class="pt-card-dur-tag">${durationMin}p</span>
              <span class="pt-card-status-pill">${statusPillText}</span>
            </div>
            <div class="pt-card-top-right">
              ${buttonsHtml}
            </div>
          </div>
          <div class="pt-card-bottom-row pt-slot-meta-row">
            <strong class="pt-card-member-name"><i class="fa-regular fa-user"></i> ${escapeHtml(booking.memberName)}</strong>
            <span class="pt-card-divider">·</span>
            <span class="pt-card-pkg-name">${escapeHtml([booking.memberCode, booking.packageName].filter(Boolean).join(' - '))}</span>
          </div>
          ${booking.status === 'CANCELLED' ? (
            booking.cancelReason ? `
              <div class="pt-card-notes-row" style="font-size: 11.5px; color: rgba(255,255,255,0.88); margin-top: 3px; display: flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-circle-exclamation" style="margin-right: 4px;"></i> <span>Lý do hủy: ${escapeHtml(booking.cancelReason)}</span>
              </div>
            ` : ''
          ) : `
            ${(booking.workoutNotes || booking.fitnessNotes) ? `
              <div class="pt-card-notes-row" style="font-size: 11.5px; color: rgba(255,255,255,0.88); margin-top: 3px; display: flex; align-items: center; gap: 4px;">
                <i class="fa-solid fa-clipboard-user" style="margin-right: 4px;"></i> <span>Đánh giá của PT: ${escapeHtml([booking.workoutNotes, booking.fitnessNotes].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · '))}</span>
              </div>
            ` : ''}
          `}
        </div>
      `;
    });

    $grid.html(html);
    dayBookings.filter(b => b.participants.length > 1 || b.participantSource === 'LEGACY_OWNER_ONLY').forEach(booking => {
      const card = $grid.find('.pt-slot-card').filter(function () { return $(this).attr('data-booking-id') === booking.id; });
      const detail = $('<div class="pt-slot-participants pt-slot-fitness-notes">');
      if (booking.participantSource === 'LEGACY_OWNER_ONLY') {
        detail.text('Lịch cũ chưa lưu danh sách người tham gia.');
      } else {
        $('<strong>').text('Thành viên tham gia: ').appendTo(detail);
        $('<span>').text(booking.participants.map(member => [member.member_name, member.member_code].filter(Boolean).join(' · ')).join('; ')).appendTo(detail);
      }
      detail.insertAfter(card.find('.pt-slot-meta-row').first());
    });
    dayBookings.filter(b => b.workoutNotes && b.status !== 'DONE' && b.status !== 'COMPLETED').forEach(booking => {
      const $card = $grid.find('[data-booking-id]').filter(function () { return $(this).attr('data-booking-id') === booking.id; });
      $('<div class="pt-slot-fitness-notes">').text(booking.workoutNotes).appendTo($card.find('.pt-slot-info-col'));
    });
  }

  /**
   * Gắn sự kiện tương tác
   */
  function bindEvents() {
    $(document).off('click', '#ptCreateBooking').on('click', '#ptCreateBooking', openBookingPopup);
    $(document).off('keydown.ptSchedule').on('keydown.ptSchedule', '.pt-date-chip, #btnToggleCalendarMode, #btnToggleBar', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $(this).trigger('click'); }
    });
    $('#btnToggleCalendarMode, #btnToggleBar').attr({ role: 'button', tabindex: '0', 'aria-label': 'Mở rộng hoặc thu gọn lịch' });
    $(document).off('click', '#btnRetrySchedule').on('click', '#btnRetrySchedule', syncWithBackend);
    // 1. Chọn ngày trên Horizontal Strip (Chế độ Thu gọn)
    $(document).off('click', '.pt-date-chip').on('click', '.pt-date-chip', function () {
      const newDate = $(this).data('date');
      if (!newDate) return;

      ScheduleState.selectedDateStr = newDate;
      $('.pt-date-chip').removeClass('active').attr('aria-pressed', 'false');
      $(this).addClass('active').attr('aria-pressed', 'true');

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
    if (!booking || booking.ptConfirmed || !['UPCOMING', 'AWAITING_CONFIRMATION'].includes(booking.status)) return;
    if (!isSlotStartedOrPassed(booking.date, booking.startTime)) return;

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
            <div class="pt-prefill-box" style="margin-bottom: 12px; background: var(--border-color); padding: 10px; border-radius: 8px; font-size: 12px; line-height: 1.5;">
              <div style="margin-bottom: 4px;"><strong>Ca tập:</strong> ${sessionInfo}</div>
              <div style="margin-bottom: 4px;"><strong>Học viên:</strong> <span style="color: var(--primary); font-weight: 600;">${memberInfo}</span></div>
              <div><strong>Chi nhánh:</strong> ${escapeHtml(branchInfo)}</div>
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 6px;">
                Kết quả buổi tập <span style="color: #c43d40;">*</span>
              </label>
              <div style="padding: 8px 12px; background: rgba(16, 185, 129, 0.12); border: 1px solid #237b58; border-radius: 6px; color: #237b58; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid fa-circle-check"></i> Hoàn thành (Đạt chỉ tiêu buổi tập)
              </div>
            </div>

            <div style="margin-bottom: 12px;">
              <label for="dxFitnessNotesInput" style="display: block; font-weight: 600; font-size: 12px; margin-bottom: 6px;">
                Đánh giá của PT
              </label>
              <textarea 
                id="dxFitnessNotesInput" 
                class="pt-textarea" 
                rows="3" 
                maxlength="2000" 
                placeholder="Nhập đánh giá buổi học, thể trạng học viên..." 
                style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 6px; padding: 8px; font-size: 12px; resize: vertical;"
              >${escapeHtml(currentNotes)}</textarea>
            </div>

            <div style="font-size: 12px; color: #65736d; background: var(--border-color); padding: 8px; border-radius: 6px; line-height: 1.4;">
              <i class="fa-solid fa-shield-halved" style="color: #237b58;"></i> <strong>Trạng thái:</strong> Chờ xác nhận của PT và hội viên. Không trừ thêm buổi đã giữ khi đặt lịch.
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
                const res = await apiClient.pt.ptConfirm(booking.id, { workout_notes: fitnessNotes, fitness_assessment: fitnessNotes });
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
    const sequence = ++syncSequence;

    ScheduleState.isLoading = true;
    ScheduleState.hasError = false;
    renderSlots();

    try {
      const results = await Promise.allSettled([apiClient.pt.listBookings({ pt_id: currentPtId }), ownTrainer(currentPtId)]);
      if (sequence !== syncSequence || window.ptApp?.currentUser?.pt_profile_id !== currentPtId) return;
      if (results[1].status === 'fulfilled') { trainerProfile = results[1].value; showWorkHours(); }
      else { trainerProfile = null; $('#ptWorkHours').text('Không tải được giờ làm việc'); }
      if (results[0].status === 'rejected') throw results[0].reason;
      const res = results[0].value;
      apiRows(res);
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

          const duration = startTime && endTime ? (Date.parse(`2000-01-01T${endTime}:00Z`) - Date.parse(`2000-01-01T${startTime}:00Z`)) / 60000 : null;
          return {
            id: item.id,
            sessionNumber: item.session_number || null,
            date: dateStr,
            startTime: startTime,
            endTime: endTime,
            durationLabel: duration > 0 ? `${duration} phút` : '',
            slot: `${startTime} - ${endTime}`,
            memberName: item.member_name || 'Hội viên',
            participants: Array.isArray(item.participants) ? item.participants : [],
            participantSource: item.participant_source,
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
      if (sequence !== syncSequence || window.ptApp?.currentUser?.pt_profile_id !== currentPtId) return;
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
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .pt-booking-content { max-height: 65vh; overflow-y: auto; padding: 0 4px 12px; }
      .pt-booking-message { color: var(--accent-danger, #c43d40); font-size: 13px; white-space: normal; overflow-wrap: anywhere; margin-bottom: 12px; }
      .pt-booking-popup .dx-popup-content { padding: 14px; }
      .pt-booking-popup .dx-button-mode-contained.dx-button-default { background: var(--primary); color: #fff; }
      #view-schedule .pt-slot-info-col { min-width: 0; overflow-wrap: anywhere; }
      #view-schedule .pt-slot-header-row { flex-wrap: wrap; gap: 6px; }
      #view-schedule .pt-slot-id { max-width: 100%; overflow-wrap: anywhere; }
      .pt-schedule-main-title {
        font-size: 17px;
        font-weight: 800;
        color: var(--text-main);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pt-schedule-badge-hours {
        display: inline-block;
        font-size: 12px;
        font-weight: 600;
        color: var(--primary);
        background: rgba(16, 185, 129, 0.12);
        padding: 2px 8px;
        border-radius: var(--radius-full);
        margin-top: 4px;
        border: 1px solid rgba(16, 185, 129, 0.2);
      }

      /* Calendar Strip & Expandable Full Month Card (PT01-US01) */
      .pt-calendar-strip-card {
        background: var(--bg-card);
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 14px 12px 10px;
        margin-bottom: 12px;
        box-shadow: none;
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
        background: var(--border-color);
      }
      .pt-month-display {
        font-size: 14px;
        font-weight: 800;
        color: var(--text-main);
      }
      .pt-calendar-toggle-badge {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--border-color);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: var(--primary);
      }
      .pt-month-nav-group {
        display: flex;
        gap: 6px;
      }
      .pt-month-nav-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: var(--border-color);
        border: 1px solid var(--border-color);
        color: var(--text-main);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 12px;
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
        background: var(--border-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
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
        background: var(--border-color);
        border-color: var(--border-color);
      }
      .pt-date-chip.active {
        background: var(--bg-card);
        border-color: var(--primary-light);
        box-shadow: none;
        transform: translateY(-2px);
      }
      .pt-chip-day {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
      }
      .pt-date-chip.active .pt-chip-day {
        color: var(--text-main);
      }
      .pt-chip-num {
        font-size: 17px;
        font-weight: 800;
        color: var(--text-main);
        margin-top: 2px;
      }
      .pt-date-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        margin-top: 4px;
      }
      .dot-amber { background: #996217; box-shadow: none; }
      .dot-blue { background: #286aa4; box-shadow: none; }
      .dot-emerald { background: #237b58; box-shadow: none; }

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
        font-size: 12px;
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
        background: var(--border-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
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
        background: var(--border-color);
        border-color: var(--border-color);
      }
      .pt-month-day-cell.active {
        background: var(--bg-card);
        border-color: var(--primary-light);
        box-shadow: none;
      }
      .pt-day-number {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--text-main);
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
        border-top: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 600;
        color: var(--primary);
        cursor: pointer;
        transition: color 0.2s ease;
      }
      .pt-calendar-toggle-bar:hover {
        color: var(--text-main);
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
        color: var(--text-main);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pt-today-tag {
        font-size: 12px;
        background: var(--primary);
        color: #022016;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 800;
      }
      .pt-slots-counter-badge {
        font-size: 12px;
        color: var(--text-muted);
        background: var(--border-color);
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
        color: #996217;
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
      }
      .pt-weekend-alert i {
        font-size: 16px;
        color: #996217;
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
      .pt-slot-card.pt-appointment-card {
        width: 100%;
        box-sizing: border-box;
        border-radius: 8px;
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 6px;
        color: #ffffff;
        position: relative;
        overflow: hidden;
        margin-bottom: 10px;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .pt-slot-card.slot-upcoming {
        background: #1e40af !important;
        border-left: 5px solid #60a5fa !important;
        box-shadow: 0 2px 8px rgba(30, 64, 175, 0.35) !important;
        border-top: none !important;
        border-right: none !important;
        border-bottom: none !important;
      }
      .pt-slot-card.slot-awaiting {
        background: #b45309 !important;
        border-left: 5px solid #fbbf24 !important;
        box-shadow: 0 2px 8px rgba(180, 83, 9, 0.35) !important;
        border-top: none !important;
        border-right: none !important;
        border-bottom: none !important;
      }
      .pt-slot-card.slot-done {
        background: #047857 !important;
        border-left: 5px solid #34d399 !important;
        box-shadow: 0 2px 8px rgba(4, 120, 87, 0.35) !important;
        border-top: none !important;
        border-right: none !important;
        border-bottom: none !important;
      }
      .pt-slot-card.slot-cancelled {
        background: #991b1b !important;
        border-left: 5px solid #f87171 !important;
        box-shadow: 0 2px 8px rgba(153, 27, 27, 0.35) !important;
        border-top: none !important;
        border-right: none !important;
        border-bottom: none !important;
      }
      .pt-card-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 8px;
        flex-wrap: wrap;
      }
      .pt-card-top-left {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: nowrap;
      }
      .pt-card-top-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: nowrap;
        flex-shrink: 0;
      }
      .pt-card-time {
        font-size: 13px;
        font-weight: 700;
        color: #ffffff !important;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
        white-space: nowrap;
      }
      .pt-card-dur-tag {
        background: rgba(255, 255, 255, 0.22);
        color: #ffffff !important;
        padding: 1.5px 7px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }
      .pt-card-status-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 10.5px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.22);
        color: #ffffff !important;
        border: 1px solid rgba(255, 255, 255, 0.45);
        white-space: nowrap;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
      .pt-card-bottom-row {
        display: flex;
        align-items: center;
        gap: 6px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        line-height: 1.35;
        color: #ffffff;
      }
      .pt-card-member-name {
        font-size: 13px;
        font-weight: 800;
        color: #ffffff !important;
        white-space: nowrap;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .pt-card-divider {
        color: rgba(255, 255, 255, 0.5);
        font-weight: 700;
      }
      .pt-card-pkg-name {
        font-size: 12px;
        font-weight: 500;
        color: rgba(255, 255, 255, 0.92) !important;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      }
      .pt-btn-card-complete {
        border-radius: 4px;
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        white-space: nowrap;
        transition: all 0.15s ease-in-out;
        border: 1px solid;
        outline: none;
      }
      .pt-btn-card-complete.is-ended {
        background: #10b981 !important;
        color: #ffffff !important;
        border-color: #059669 !important;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      }
      .pt-btn-card-complete.is-ended:hover {
        background: #059669 !important;
        transform: translateY(-1px);
      }
      .pt-btn-card-complete.is-waiting {
        background: #94a3b8 !important;
        color: #ffffff !important;
        border-color: #64748b !important;
        cursor: not-allowed;
        opacity: 0.88;
      }
      .pt-btn-card-cancel {
        background: #dc2626 !important;
        color: #ffffff !important;
        border: 1px solid #ef4444 !important;
        border-radius: 4px;
        padding: 3px 9px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        transition: all 0.15s ease-in-out;
        white-space: nowrap;
        outline: none;
      }
      .pt-btn-card-cancel:hover {
        background: #b91c1c !important;
        transform: translateY(-1px);
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
        background: var(--bg-card);
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        border-top: 1px solid var(--border-color);
        padding: 16px 18px 24px;
        box-shadow: none;
        animation: sheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes sheetSlideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      .pt-sheet-handle {
        width: 40px;
        height: 4px;
        background: var(--border-color);
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
        color: var(--text-main);
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pt-sheet-close-btn {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--border-color);
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
        background: var(--border-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pt-prefill-row {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        gap: 8px;
      }
      .pt-prefill-label {
        color: var(--text-muted);
        flex-shrink: 0;
      }
      .pt-prefill-value {
        color: var(--text-main);
        font-weight: 600;
        text-align: right;
      }
      .pt-prefill-value.text-highlight {
        color: var(--primary);
      }
      .pt-form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .pt-form-label {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-main);
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
        color: var(--primary);
        font-size: 12.5px;
        font-weight: 700;
      }
      .pt-textarea {
        width: 100%;
        background: var(--border-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 10px 12px;
        color: var(--text-main);
        font-size: 12.5px;
        font-family: inherit;
        resize: none;
      }
      .pt-textarea:focus {
        outline: none;
        border-color: var(--primary);
        background: var(--border-color);
      }
      .pt-form-hint {
        font-size: 12px;
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
        color: #286aa4;
        font-size: 14px;
        margin-top: 2px;
        flex-shrink: 0;
      }
      .pt-dual-confirm-text {
        font-size: 12px;
        color: #286aa4;
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
        color: #286aa4;
        font-size: 12px;
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
        color: #286aa4;
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
      .pt-date-chip.active, .pt-month-day-cell.active { background: var(--primary); color: #fff; box-shadow: none; }
      .pt-date-chip.active .pt-chip-num, .pt-date-chip.active .pt-chip-day,
      .pt-month-day-cell.active .pt-day-number { color: #fff; }
      .pt-month-nav-btn:hover, .pt-today-tag { color: #fff; }
      .btn-confirm-trigger { background: var(--primary); color: #fff; }
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
    reset: () => { syncSequence++; trainerProfile = null; bookingPopup?.hide(); ScheduleState.bookings = []; ScheduleState.hasError = false; ScheduleState.isLoading = false; closeConfirmModal(); renderSlots(); },
    openBookingModal: openBookingPopup,
    openBookingFromNotification: async (referenceId, shouldOpenResult) => {
      if (!ScheduleState.bookings.some(b => b.id === referenceId)) await syncWithBackend();
      const booking = ScheduleState.bookings.find(b => b.id === referenceId);
      if (!booking || ScheduleState.hasError) {
        window.ptApp?.showToast?.('Không tìm thấy buổi tập trong lịch của bạn.', 'error');
        return false;
      }
      selectDate(booking.date, booking.id);
      if (shouldOpenResult) openConfirmModal(booking.id);
      return true;
    },
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
