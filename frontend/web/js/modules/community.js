/**
 * W16: Lớp tập cộng đồng (Community Classes Module)
 * Biểu diễn thời khóa biểu bằng DevExtreme dxScheduler chuẩn hóa giống menu Lịch tập & buổi PT (W06).
 * Lưới 15 phút/ô, chiều cao card co giãn theo thời lượng cấu hình trong bộ môn,
 * click ô trống để tạo lớp nhanh, và mở khóa thời lượng bộ môn cho QTV tùy ý cấu hình.
 */
window.CommunityModule = (function () {
  'use strict';
  let view = null, revision = 0;
  let selectedDate = new Date();
  let filterBranch = 'ALL';
  let filterDiscipline = 'ALL';
  let loadedClasses = [];
  let schedulerInstance = null;
  let cachedBranches = [];
  let cachedDisciplines = [];
  let cachedTrainers = [];
  let draftClass = null;

  const W = () => window.WebUI;
  const api = () => window.apiClient;

  const TIME_OPTIONS = [];
  for (let h = 6; h <= 21; h++) {
    const hh = String(h).padStart(2, '0');
    TIME_OPTIONS.push(`${hh}:00`, `${hh}:15`, `${hh}:30`, `${hh}:45`);
  }
  TIME_OPTIONS.push('22:00');

  const DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function getWeekDays(monday) {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  }

  function detectDisciplineTheme(cls) {
    const text = `${cls.title || ''} ${cls.discipline_name || ''} ${cls.description || ''}`.toLowerCase();
    if (/dance|zumba|aerobic|step|tiktok|freestyle|shuffle/i.test(text)) {
      if (/múa|cổ trang|sexy/i.test(text)) {
        return {
          themeClass: 'theme-dance-female',
          badgeText: 'MÚA / DANCE',
          category: 'dance_female',
          bgColor: '#fce7f3',
          borderColor: '#db2777',
          textColor: '#9d174d'
        };
      }
      return {
        themeClass: 'theme-dance',
        badgeText: 'DANCE / AEROBIC',
        category: 'dance',
        bgColor: '#fef9c3',
        borderColor: '#ca8a04',
        textColor: '#854d0e'
      };
    }
    if (/múa|cổ trang|sexy/i.test(text)) {
      return {
        themeClass: 'theme-dance-female',
        badgeText: 'MÚA / DANCE',
        category: 'dance_female',
        bgColor: '#fce7f3',
        borderColor: '#db2777',
        textColor: '#9d174d'
      };
    }
    if (/yoga|pilates|stretch|dẻo/i.test(text)) {
      return {
        themeClass: 'theme-yoga',
        badgeText: 'YOGA / PILATES',
        category: 'yoga',
        bgColor: '#dcfce7',
        borderColor: '#16a34a',
        textColor: '#166534'
      };
    }
    if (/pump|hiit|cardio|t45|sức mạnh|strength|burn|core/i.test(text)) {
      return {
        themeClass: 'theme-pump',
        badgeText: 'BODYPUMP / HIIT',
        category: 'pump',
        bgColor: '#ffedd5',
        borderColor: '#ea580c',
        textColor: '#9a3412'
      };
    }
    if (/kickfit|boxing|muay|võ|cycling|rpm|đạp xe/i.test(text)) {
      return {
        themeClass: 'theme-boxing',
        badgeText: 'KICKFIT / CYCLING',
        category: 'boxing',
        bgColor: '#e0f2fe',
        borderColor: '#0284c7',
        textColor: '#075985'
      };
    }
    return {
      themeClass: 'theme-default',
      badgeText: cls.discipline_name || 'CỘNG ĐỒNG',
      category: 'other',
      bgColor: '#eaf4ee',
      borderColor: '#237b58',
      textColor: '#185740'
    };
  }

  function calculateEndTime(startTimeStr, durationMinutes) {
    if (!startTimeStr || !startTimeStr.includes(':')) return '19:00';
    const [h, m] = startTimeStr.split(':').map(Number);
    const totalMins = h * 60 + m + (durationMinutes || 60);
    const endH = Math.min(22, Math.floor(totalMins / 60));
    const endM = Math.min(59, totalMins % 60);
    const nearestM = Math.round(endM / 15) * 15;
    const finalH = nearestM === 60 ? Math.min(22, endH + 1) : endH;
    const finalM = nearestM === 60 ? 0 : nearestM;
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
  }

  // Khởi tạo và render module
  async function render(containerId, context = {}) {
    destroy();
    selectedDate = context.date ? new Date(context.date) : new Date();

    // Đồng bộ filterBranch với chi nhánh đang chọn hiện tại nếu có
    const curBranch = api().getCurrentBranchId();
    if (curBranch && curBranch !== 'ALL' && cachedBranches.some(b => b.id === curBranch)) {
      filterBranch = curBranch;
    } else {
      filterBranch = cachedBranches[0]?.id || null;
    }

    // Nạp danh sách chi nhánh & bộ môn
    try {
      const [bRes, dRes] = await Promise.all([
        api().request('/branches', { headers: { 'x-branch-id': 'ALL' } }),
        api().request('/class-disciplines')
      ]);
      cachedBranches = W().rows(bRes);
      cachedDisciplines = W().rows(dRes);
      if (!filterBranch || filterBranch === 'ALL') {
        filterBranch = cachedBranches[0]?.id || null;
      }
    } catch (err) {
      console.warn('Lỗi nạp danh sách chi nhánh / bộ môn:', err);
    }

    view = W().page(containerId, 'Lớp tập cộng đồng', ParadiseApp.getBranchName());

    renderTopActions();
    await load();
  }

  function renderTopActions() {
    if (!view) return;
    const actions = view.actions;
    actions.empty();

    // 1. Bộ lọc Chi nhánh (Chỉ chọn 1 chi nhánh cụ thể, không có option Tất cả chi nhánh)
    const branchItems = cachedBranches.map(b => ({ id: b.id, branch_name: b.branch_name }));

    $('<div style="display:flex;align-items:center;gap:6px;margin-right:6px;">').append(
      $('<span style="font-size:12px;color:#748078;font-weight:500;">').html('<i class="fa-solid fa-location-dot" style="color:#237b58;"></i> Chi nhánh:'),
      $('<div id="communityBranchFilter">').dxSelectBox({
        items: branchItems,
        value: filterBranch || (branchItems[0] ? branchItems[0].id : null),
        valueExpr: 'id',
        displayExpr: 'branch_name',
        width: 230,
        searchEnabled: branchItems.length > 5,
        inputAttr: { 'aria-label': 'Lọc chi nhánh' },
        onValueChanged: e => {
          if (!e.value) return;
          filterBranch = e.value;
          updateSchedulerDataSource();
        }
      })
    ).appendTo(actions);

    // 2. Bộ lọc bộ môn
    $('<div style="display:flex;align-items:center;gap:6px;margin-right:4px;">').append(
      $('<span style="font-size:12px;color:#748078;font-weight:500;">').text('Bộ môn:'),
      $('<div>').dxSelectBox({
        items: [
          { id: 'ALL', text: 'Tất cả bộ môn' },
          { id: 'dance', text: 'Dance / Aerobic / Zumba' },
          { id: 'yoga', text: 'Yoga / Pilates' },
          { id: 'pump', text: 'BodyPump / HIIT' },
          { id: 'dance_female', text: 'Múa / Cổ trang' },
          { id: 'boxing', text: 'Kickfit / Boxing / Cycling' }
        ],
        value: filterDiscipline,
        valueExpr: 'id',
        displayExpr: 'text',
        width: 185,
        inputAttr: { 'aria-label': 'Lọc bộ môn' },
        onValueChanged: e => {
          filterDiscipline = e.value;
          updateSchedulerDataSource();
        }
      })
    ).appendTo(actions);

    if (ParadiseApp.isAdmin()) {
      W().button(actions, 'Cấu hình bộ môn', 'preferences', () => openDisciplineManagementModal());
      W().button(actions, 'Tạo lớp mới', 'add', () => openCreateClassModal(), true);
    }
    W().button(actions, '', 'refresh', () => load()).option('hint', 'Làm mới lịch lớp');
  }

  async function load() {
    if (!view) return;
    const target = view.body, version = ++revision;
    W().loading(target);

    try {
      const monday = getMonday(selectedDate);
      const weekDays = getWeekDays(monday);

      // Nạp dữ liệu các ngày trong tuần được chọn với header x-branch-id: ALL để client lọc nhanh theo chi nhánh
      const results = await Promise.all(
        weekDays.map(d => api().request('/community-classes?date=' + W().dateKey(d), { headers: { 'x-branch-id': 'ALL' } }))
      );
      if (version !== revision || !document.contains(target[0])) return;
      loadedClasses = results.flatMap(r => r.data || []);

      target.empty();

      // Render Scheduler Container
      const schedulerPanel = $('<div class="card-panel" style="position:relative;min-height:800px;background:#ffffff;border-radius:8px;border:1px solid #dfe6e2;padding:12px 14px;">').appendTo(target);
      const schedulerDiv = $('<div id="communityScheduler">').appendTo(schedulerPanel);

      const appointments = getSchedulerAppointments();

      schedulerInstance = schedulerDiv.dxScheduler({
        dataSource: appointments,
        views: [
          { type: 'day', name: 'Ngày', intervalCount: 1, cellDuration: 15, maxAppointmentsPerCell: 'unlimited' },
          { type: 'workWeek', name: 'Tuần (T2-T6)', cellDuration: 15, maxAppointmentsPerCell: 'unlimited' },
          { type: 'week', name: 'Toàn tuần', cellDuration: 15, maxAppointmentsPerCell: 'unlimited' }
        ],
        currentView: 'workWeek',
        currentDate: selectedDate,
        firstDayOfWeek: 1,
        startDayHour: 6,
        endDayHour: 22,
        cellDuration: 15, // Lưới 15 phút chuẩn hóa giống PT Scheduler
        maxAppointmentsPerCell: 'unlimited',
        showAllDayPanel: false,
        height: Math.max(680, window.innerHeight - 200),
        onContentReady: event => {
          // Kích hoạt thanh cuộn dọc cố định và kéo thả thumb trên dxScheduler
          const dateTableScrollable = schedulerDiv.find('.dx-scheduler-date-table-scrollable').dxScrollable('instance');
          if (dateTableScrollable) {
            dateTableScrollable.option('showScrollbar', 'always');
            dateTableScrollable.option('scrollByThumb', true);
            dateTableScrollable.option('scrollByContent', true);
          }
        },
        editing: {
          allowAdding: false,
          allowDeleting: false,
          allowDragging: true, // KÉO THẢ THẺ LỊCH TẬP DỰ KIẾN
          allowResizing: true, // ĐIỀU CHỈNH THỜI LƯỢNG
          allowUpdating: true
        },
        showCurrentTimeIndicator: true,
        appointmentTemplate: (appointmentData, appointmentIndex, element) => {
          renderAppointmentContent(appointmentData, element);
        },
        onAppointmentRendered: event => {
          applyAppointmentStyling(event);
        },
        onAppointmentClick: event => {
          event.cancel = true;
          const raw = event.appointmentData || {};
          const item = raw.appointmentData || raw;
          const cls = item.originalClass || item;
          if (item.is_draft || cls.is_draft) return;
          openClassDetailModal(cls);
        },
        onAppointmentUpdating: event => {
          handleAppointmentUpdating(event);
        },
        onAppointmentUpdated: event => {
          handleAppointmentUpdated(event);
        },
        onCellClick: event => {
          event.cancel = true;
          if (!ParadiseApp.isAdmin()) return;
          const clickedStart = new Date(event.cellData.startDate);
          const dateStr = W().dateKey(clickedStart);
          const h = String(clickedStart.getHours()).padStart(2, '0');
          const m = String(clickedStart.getMinutes()).padStart(2, '0');
          const startStr = `${h}:${m}`;

          if (draftClass) {
            const duration = Number(draftClass.duration) || 60;
            const clickedEnd = new Date(clickedStart.getTime() + duration * 60000);
            const endH = String(clickedEnd.getHours()).padStart(2, '0');
            const endM = String(clickedEnd.getMinutes()).padStart(2, '0');
            const endStr = `${endH}:${endM}`;

            if (startStr < '06:00' || endStr > '22:00') {
              DevExpress.ui.notify('Thời gian lớp học phải nằm trong khung giờ hoạt động (06:00 - 22:00).', 'warning', 2500);
              return;
            }

            const hasCollision = checkCommunityCollision(dateStr, startStr, endStr, draftClass.id);
            if (hasCollision) {
              DevExpress.ui.notify(`⚠️ Khung giờ ${startStr} - ${endStr} đã có lịch lớp từ trước. Không thể di chuyển thẻ dự kiến tới đây!`, 'warning', 2500);
              return;
            }

            draftClass.class_date = dateStr;
            draftClass.start_time = startStr;
            draftClass.end_time = endStr;
            draftClass.startDate = clickedStart;
            draftClass.endDate = clickedEnd;
            updateSchedulerDataSource();
            DevExpress.ui.notify(`Đã chuyển thẻ lịch dự kiến sang ${dateStr} ${startStr} - ${endStr}.`, 'info', 2000);
            return;
          }

          openCreateClassModal(dateStr, startStr);
        },
        onOptionChanged: e => {
          if (e.name === 'currentDate' && e.value) {
            const newDate = new Date(e.value);
            const oldMonday = W().dateKey(getMonday(selectedDate));
            const newMonday = W().dateKey(getMonday(newDate));
            selectedDate = newDate;
            if (oldMonday !== newMonday) {
              load();
            }
          }
        }
      }).dxScheduler('instance');

      // Chuyển tiếp sự kiện mousewheel trên toàn bộ container Scheduler (gồm cột giờ, tiêu đề, và ô lưới) để cuộn lịch tuần mượt mà
      schedulerDiv.off('wheel.communityScroll').on('wheel.communityScroll', function (e) {
        const dateTableEl = schedulerDiv.find('.dx-scheduler-date-table-scrollable');
        const scrollable = dateTableEl.dxScrollable('instance');
        if (!scrollable) return;
        const delta = e.originalEvent?.deltaY || e.deltaY;
        if (!delta) return;
        e.preventDefault();
        const curScroll = scrollable.scrollTop();
        scrollable.scrollTo({ top: curScroll + delta });
      });

      // Chú thích phân loại bộ môn (Legend Bar)
      renderLegendBar(target);

    } catch (err) {
      if (version === revision) W().error(target, err, load);
    }
  }

  function getSchedulerAppointments() {
    let filtered = loadedClasses;

    // 1. Lọc theo Chi nhánh
    if (filterBranch && filterBranch !== 'ALL') {
      filtered = filtered.filter(c => c.branch_id === filterBranch);
    }

    // 2. Lọc theo Bộ môn
    if (filterDiscipline && filterDiscipline !== 'ALL') {
      filtered = filtered.filter(c => detectDisciplineTheme(c).category === filterDiscipline);
    }

    const list = filtered.map(c => {
      const dateStr = W().dateKey(c.class_date);
      const startH = String(c.start_time).slice(0, 5);
      const endH = String(c.end_time).slice(0, 5);
      const startDate = new Date(`${dateStr}T${startH}:00`);
      const endDate = new Date(`${dateStr}T${endH}:00`);
      const duration = Math.max(15, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
      const theme = detectDisciplineTheme(c);

      return {
        id: c.id,
        text: c.title,
        startDate,
        endDate,
        duration,
        theme,
        originalClass: c,
        is_draft: false,
        ...c
      };
    });

    if (draftClass) {
      list.push({
        ...draftClass,
        id: 'draft-community-class',
        text: draftClass.title || 'Lịch lớp dự kiến',
        startDate: draftClass.startDate,
        endDate: draftClass.endDate,
        is_draft: true
      });
    }

    return list;
  }

  function updateSchedulerDataSource() {
    if (!schedulerInstance) return;
    const appointments = getSchedulerAppointments();
    schedulerInstance.option('dataSource', appointments);
  }

  function checkCommunityCollision(dateStr, startStr, endStr, excludeId = null, branchIds = null, instructorId = null) {
    const s = String(startStr).slice(0, 5);
    const e = String(endStr).slice(0, 5);
    return loadedClasses.some(c => {
      if (c.id === excludeId || c.id === 'draft-community-class' || c.is_draft) return false;
      const cDate = W().dateKey(c.class_date);
      if (cDate !== dateStr) return false;
      const cs = String(c.start_time).slice(0, 5);
      const ce = String(c.end_time).slice(0, 5);
      // Hai khoảng [s, e] và [cs, ce] giao nhau khi cs < e và ce > s
      const timeOverlap = cs < e && ce > s;
      if (!timeOverlap) return false;

      // Va chạm xảy ra khi:
      // 1. Cùng chi nhánh (trùng phòng học / khung giờ của chi nhánh)
      // HOẶC
      // 2. Cùng huấn luyện viên (HLV không thể dạy 2 nơi cùng 1 giờ)
      const targetBranches = branchIds?.length
        ? branchIds
        : (draftClass?.branch_ids?.length ? draftClass.branch_ids : (filterBranch !== 'ALL' ? [filterBranch] : []));

      const sameBranch = !targetBranches.length || targetBranches.includes(c.branch_id);
      const targetTrainer = instructorId || draftClass?.instructor_id;
      const sameInstructor = targetTrainer && c.instructor_id === targetTrainer;

      return sameBranch || sameInstructor;
    });
  }

  function handleAppointmentUpdating(event) {
    const oldItem = event.oldData || event.appointmentData;
    const rawOld = oldItem.appointmentData || oldItem;
    const item = rawOld.originalClass || rawOld;

    if (!item?.is_draft) {
      event.cancel = true;
      DevExpress.ui.notify('Chỉ thẻ lịch tập dự kiến mới có thể kéo đổi giờ và điều chỉnh thời lượng.', 'warning', 2000);
      return;
    }

    const oldStart = new Date(rawOld.startDate);
    const oldEnd = new Date(rawOld.endDate);
    let newStart = new Date(event.newData?.startDate || rawOld.startDate);
    let newEnd = new Date(event.newData?.endDate || rawOld.endDate);

    const oldDur = Math.max(15, Math.round((oldEnd.getTime() - oldStart.getTime()) / 60000));
    let newDur = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);

    const isResizeTop = Math.abs(newEnd.getTime() - oldEnd.getTime()) < 60000 && Math.abs(newStart.getTime() - oldStart.getTime()) >= 60000;
    const isResizeBottom = Math.abs(newStart.getTime() - oldStart.getTime()) < 60000 && Math.abs(newEnd.getTime() - oldEnd.getTime()) >= 60000;
    const isMove = !isResizeTop && !isResizeBottom;

    const minDuration = 15;
    const disc = cachedDisciplines.find(d => d.id === (item.discipline_id || draftClass?.discipline_id));
    const disciplineMaxDuration = Number(item.max_duration_minutes || draftClass?.max_duration_minutes || disc?.max_duration_minutes || 60);
    const maxDuration = disciplineMaxDuration;

    if (isResizeBottom || isResizeTop) {
      if (newDur < minDuration) {
        newDur = minDuration;
        if (isResizeBottom) newEnd = new Date(newStart.getTime() + minDuration * 60000);
        else newStart = new Date(newEnd.getTime() - minDuration * 60000);
      } else if (newDur > maxDuration) {
        newDur = maxDuration;
        if (isResizeBottom) newEnd = new Date(newStart.getTime() + maxDuration * 60000);
        else newStart = new Date(newEnd.getTime() - maxDuration * 60000);
      }
    } else if (isMove) {
      const moveDur = Math.min(oldDur, disciplineMaxDuration);
      newEnd = new Date(newStart.getTime() + moveDur * 60000);
      newDur = moveDur;
    }

    if (event.newData) {
      event.newData.startDate = newStart;
      event.newData.endDate = newEnd;
    }

    const newDateStr = W().dateKey(newStart);
    const h = String(newStart.getHours()).padStart(2, '0');
    const m = String(newStart.getMinutes()).padStart(2, '0');
    const eh = String(newEnd.getHours()).padStart(2, '0');
    const em = String(newEnd.getMinutes()).padStart(2, '0');
    const newStartStr = `${h}:${m}`;
    const newEndStr = `${eh}:${em}`;

    // 1. Kiểm tra khung giờ hoạt động 06:00 - 22:00
    if (newStartStr < '06:00' || newEndStr > '22:00') {
      event.cancel = true;
      DevExpress.ui.notify('Thời gian lớp học phải nằm trong khung giờ 06:00 - 22:00.', 'warning', 2500);
      setTimeout(() => updateSchedulerDataSource(), 0);
      return;
    }

    // 2. KIỂM TRA VA CHẠM (COLLISION) - Trùng lịch đã có từ trước tại chi nhánh hoặc trùng lịch HLV -> HỦY VÀ QUAY VỀ VỊ TRÍ CŨ
    const targetBranches = item.branch_ids || (item.branch_id ? [item.branch_id] : null);
    const hasCollision = checkCommunityCollision(newDateStr, newStartStr, newEndStr, item.id, targetBranches, item.instructor_id);
    if (hasCollision) {
      event.cancel = true;
      DevExpress.ui.notify(`⚠️ Khung giờ ${newStartStr} - ${newEndStr} đã có lịch lớp từ trước tại chi nhánh này hoặc trùng lịch dạy của HLV. Thẻ lịch tự động quay về vị trí cũ!`, 'warning', 2500);
      setTimeout(() => {
        updateSchedulerDataSource();
      }, 0);
      return;
    }

    if (draftClass) {
      draftClass.startDate = newStart;
      draftClass.endDate = newEnd;
      draftClass.class_date = newDateStr;
      draftClass.start_time = newStartStr;
      draftClass.end_time = newEndStr;
      draftClass.duration = newDur;
      draftClass.max_duration_minutes = disciplineMaxDuration;
    }
  }

  function handleAppointmentUpdated(event) {
    const raw = event.appointmentData || event.newData || draftClass;
    const item = raw?.appointmentData || raw;
    if (!item || !item.is_draft) return;

    let newStart = new Date(item.startDate);
    let newEnd = new Date(item.endDate);
    let duration = Math.max(15, Math.round((newEnd.getTime() - newStart.getTime()) / 60000));

    const disc = cachedDisciplines.find(d => d.id === (item.discipline_id || draftClass?.discipline_id));
    const disciplineMaxDuration = Number(item.max_duration_minutes || draftClass?.max_duration_minutes || disc?.max_duration_minutes || 60);

    let snappedBack = false;
    if (duration > disciplineMaxDuration) {
      duration = disciplineMaxDuration;
      newEnd = new Date(newStart.getTime() + disciplineMaxDuration * 60000);
      snappedBack = true;
    }

    const newDateStr = W().dateKey(newStart);
    const h = String(newStart.getHours()).padStart(2, '0');
    const m = String(newStart.getMinutes()).padStart(2, '0');
    const eh = String(newEnd.getHours()).padStart(2, '0');
    const em = String(newEnd.getMinutes()).padStart(2, '0');
    const newStartStr = `${h}:${m}`;
    const newEndStr = `${eh}:${em}`;

    // Safeguard va chạm
    const targetBranches = item.branch_ids || (item.branch_id ? [item.branch_id] : null);
    const hasCollision = checkCommunityCollision(newDateStr, newStartStr, newEndStr, item.id, targetBranches, item.instructor_id);
    if (hasCollision) {
      updateSchedulerDataSource();
      return;
    }

    if (draftClass) {
      draftClass.startDate = newStart;
      draftClass.endDate = newEnd;
      draftClass.class_date = newDateStr;
      draftClass.start_time = newStartStr;
      draftClass.end_time = newEndStr;
      draftClass.duration = duration;
      draftClass.max_duration_minutes = disciplineMaxDuration;
    }

    if (snappedBack) {
      DevExpress.ui.notify(`⚠️ Thời lượng tối đa của bộ môn "${draftClass?.discipline_name || 'này'}" là ${disciplineMaxDuration} phút. Thẻ lịch tự động trở về thời lượng tối đa!`, 'warning', 3000);
    } else {
      DevExpress.ui.notify(`⏰ Đã điều chỉnh lịch lớp: ${newStartStr} - ${newEndStr} (${duration} phút)`, 'success', 2000);
    }
    setTimeout(() => updateSchedulerDataSource(), 0);
  }

  async function confirmCreateDraftClass(draft) {
    if (!draft) return;
    try {
      const branchId = draft.branch_id || (draft.branch_ids && draft.branch_ids[0]) || (filterBranch && filterBranch !== 'ALL' ? filterBranch : api().getCurrentBranchId());
      if (!branchId || branchId === 'ALL') {
        DevExpress.ui.notify('Vui lòng chọn một chi nhánh tổ chức cụ thể.', 'warning', 2500);
        return;
      }

      await api().request('/community-classes', {
        method: 'POST',
        body: {
          branch_id: branchId,
          branch_ids: [branchId],
          discipline_id: draft.discipline_id,
          title: draft.title,
          instructor_id: draft.instructor_id,
          instructor_name: draft.instructor_name,
          bonus_amount: draft.bonus_amount || 0,
          base_price: draft.base_price || 0,
          class_date: draft.class_date,
          start_time: draft.start_time,
          end_time: draft.end_time,
          max_slots: draft.max_slots || 40,
          description: draft.description || ''
        }
      });

      DevExpress.ui.notify(`Đã đặt lịch lớp "${draft.title}" thành công!`, 'success', 3000);
      draftClass = null;
      await load();
    } catch (err) {
      DevExpress.ui.notify(err.message || 'Lỗi khi đặt lịch lớp học', 'error', 3500);
    }
  }

  function clockFromDate(d) {
    if (!d) return '00:00';
    const dt = new Date(d);
    return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
  }

  function renderAppointmentContent(model, element) {
    const raw = model?.appointmentData || model?.targetedAppointmentData || model || {};
    const c = raw.originalClass || raw;

    // NẾU LÀ THẺ DỰ KIẾN KÉO THẢ (DRAFT CARD)
    if (c.is_draft || raw.is_draft) {
      const draft = draftClass || c;
      const draftBox = $('<div class="pt-draft-inner">').appendTo(element);
      $('<div class="pt-draft-handle">').html('<i class="fa-solid fa-arrows-up-down"></i> KÉO ĐỔI GIỜ').appendTo(draftBox);
      const timeRow = $('<div class="pt-draft-time">').appendTo(draftBox);

      const startH = draft.startDate ? clockFromDate(draft.startDate) : String(draft.start_time || '09:00').slice(0, 5);
      const dur = draft.duration || (draft.startDate && draft.endDate ? Math.round((draft.endDate - draft.startDate) / 60000) : 60);
      const endH = draft.endDate ? clockFromDate(draft.endDate) : calculateEndTime(startH, dur);

      draft.start_time = startH;
      draft.end_time = endH;
      draft.duration = dur;

      $('<strong>').text(`${startH} - ${endH}`).appendTo(timeRow);
      $('<span class="pt-duration-tag">').text(`${dur}p`).appendTo(timeRow);

      const desc = $('<div class="pt-draft-desc">').appendTo(draftBox);
      desc.text(`${draft.title || draft.discipline_name || 'Bộ môn'} · ${draft.instructor_name || 'HLV'}`);

      // Dòng chi nhánh cho thẻ dự kiến
      const draftBranchesText = (draft.branch_names && draft.branch_names.length)
        ? draft.branch_names.join(', ')
        : (draft.branch_name || (cachedBranches.find(b => draft.branch_ids?.includes(b.id))?.branch_name) || 'Chi nhánh tổ chức');
      $('<div class="pt-draft-branch">')
        .html(`<i class="fa-solid fa-location-dot"></i> ${draftBranchesText}`)
        .attr('title', draftBranchesText)
        .appendTo(draftBox);

      const btnRow = $('<div class="pt-draft-btn-row">').appendTo(draftBox);
      $('<button type="button" class="pt-draft-btn-confirm">').html('<i class="fa-solid fa-check"></i> Đặt lịch').appendTo(btnRow)
        .on('click', async e => {
          e.stopPropagation();
          await confirmCreateDraftClass(draft);
        });
      $('<button type="button" class="pt-draft-btn-cancel">').html('<i class="fa-solid fa-xmark"></i> Hủy').appendTo(btnRow)
        .on('click', e => {
          e.stopPropagation();
          draftClass = null;
          updateSchedulerDataSource();
          DevExpress.ui.notify('Đã hủy thẻ lịch dự kiến.', 'info', 2000);
        });

      draftBox.css('cursor', 'pointer').on('click', e => {
        if ($(e.target).closest('button').length) return;
        openCreateClassModal(draft.class_date, draft.start_time, draft);
      });
      return;
    }

    // THẺ LỚP HỌC CHÍNH THỨC
    const theme = raw.theme || detectDisciplineTheme(c);
    const enrolled = Number(c.enrolled_slots || 0);
    const max = Number(c.max_slots || 40);
    const pct = Math.min(100, Math.round((enrolled / max) * 100));
    const isFull = enrolled >= max;
    const startH = (c.start_time ? String(c.start_time) : (raw.startDate ? clockFromDate(raw.startDate) : '00:00')).slice(0, 5);
    const endH = (c.end_time ? String(c.end_time) : (raw.endDate ? clockFromDate(raw.endDate) : '00:00')).slice(0, 5);
    const titleText = c.title || raw.text || c.discipline_name || 'LỚP CỘNG ĐỒNG';

    const container = $('<div class="community-card-content">').appendTo(element);

    // Hàng 1: Giờ tập + Huy hiệu bộ môn + Nút Xóa nhanh (nếu QTV)
    const topRow = $('<div class="community-card-top-row">').appendTo(container);
    $('<div class="community-card-time">')
      .html(`<i class="fa-regular fa-clock"></i> ${startH}-${endH}`)
      .appendTo(topRow);

    $('<span class="community-card-badge">')
      .text(theme.badgeText)
      .appendTo(topRow);

    if (ParadiseApp.isAdmin()) {
      $('<button type="button" class="btn-card-delete-mini">')
        .html('<i class="fa-solid fa-xmark"></i>')
        .attr('title', 'Xóa lớp tập này')
        .appendTo(topRow)
        .on('click', e => {
          e.preventDefault(); e.stopPropagation();
          confirmDeleteClass(c);
        });
    }

    // Hàng 2: Tên lớp học in hoa đậm
    $('<strong class="community-card-title">')
      .text(titleText)
      .attr('title', titleText)
      .appendTo(container);

    // Hàng 3: HLV phụ trách
    $('<div class="community-card-instructor">')
      .html(`<i class="fa-solid fa-user-ninja" style="font-size:10px;"></i> ${c.instructor_name || 'Chưa phân công'}`)
      .appendTo(container);

    // Hàng 3b: Chi nhánh tổ chức
    $('<div class="community-card-branch">')
      .html(`<i class="fa-solid fa-location-dot"></i> ${c.branch_name || 'Chi nhánh'}`)
      .attr('title', c.branch_name || '')
      .appendTo(container);

    // Hàng 4: Chỗ trống & vạch tiến độ
    const footer = $('<div class="community-card-footer">').appendTo(container);
    const slotsRow = $('<div class="community-card-slots-row">').appendTo(footer);
    slotsRow.append($('<span>').text(`${enrolled}/${max} chỗ`));

    if (isFull) {
      $('<span class="badge-full">HẾT CHỖ</span>').appendTo(slotsRow);
    } else {
      $('<span style="font-weight:600;font-size:10px;">').text(`Còn ${max - enrolled}`).appendTo(slotsRow);
    }

    const progBar = $('<div class="community-card-prog-bar">').appendTo(footer);
    $('<div class="community-card-prog-fill">')
      .css({ width: `${pct}%`, background: isFull ? '#ef4444' : '#10b981' })
      .appendTo(progBar);
  }

  function applyAppointmentStyling(event) {
    const raw = event.appointmentData || {};
    const item = raw.appointmentData || raw;
    const c = item.originalClass || item;
    const el = $(event.appointmentElement);

    if (item.is_draft || c.is_draft) {
      el.addClass('pt-draft-appointment community-draft-appointment');
      el.css({
        'background': 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(5, 150, 105, 0.12) 100%)',
        'border': '2px dashed #059669',
        'border-radius': '8px',
        'box-shadow': '0 4px 16px rgba(5, 150, 105, 0.3)',
        'color': '#065f46'
      });
      return;
    }

    const theme = item.theme || detectDisciplineTheme(c);
    el.addClass(`community-appointment-${theme.category}`);
    el.css({
      'background': theme.bgColor,
      'background-color': theme.bgColor,
      'border-left': `5px solid ${theme.borderColor}`,
      'color': theme.textColor,
      'border-radius': '6px',
      'box-shadow': `0 2px 8px ${theme.borderColor}33`
    });
  }

  function renderLegendBar(container) {
    const legend = $('<div class="community-legend-bar">').appendTo(container);

    $('<div class="community-legend-title">')
      .html('<i class="fa-solid fa-palette"></i> Phân loại bộ môn:')
      .appendTo(legend);

    const items = [
      { dot: 'dot-dance', label: 'Dance / Aerobic / Zumba' },
      { dot: 'dot-yoga', label: 'Yoga / Pilates / Dẻo' },
      { dot: 'dot-pump', label: 'BodyPump / HIIT / Sức mạnh' },
      { dot: 'dot-dance-female', label: 'Múa / Cổ trang / Sexy Dance' },
      { dot: 'dot-boxing', label: 'Kickfit / Boxing / Cycling' }
    ];

    items.forEach(it => {
      $('<div class="community-legend-item">')
        .html(`<span class="community-legend-dot ${it.dot}"></span> ${it.label}`)
        .appendTo(legend);
    });
  }

  // ==========================================================================
  // POPUP CHI TIẾT LỚP HỌC (CLASS DETAIL MODAL) & GÁN LẠI HLV PHỤ TRÁCH
  // ==========================================================================
  function isClassSessionPassed(cls) {
    if (!cls || !cls.class_date) return false;
    if (cls.status === 'CANCELLED') return true;
    try {
      const dateStr = typeof cls.class_date === 'string' ? cls.class_date.split('T')[0] : W().dateKey(cls.class_date);
      const timeStr = cls.end_time ? String(cls.end_time).slice(0, 8) : (cls.start_time ? String(cls.start_time).slice(0, 8) : '23:59:59');
      const [y, m, d] = dateStr.split('-').map(Number);
      const [h, min, s] = timeStr.split(':').map(Number);
      const sessionEnd = new Date(y, m - 1, d, h || 0, min || 0, s || 0);
      return new Date() > sessionEnd;
    } catch (e) {
      return false;
    }
  }

  function openClassDetailModal(cls) {
    const theme = detectDisciplineTheme(cls);
    const enrolled = Number(cls.enrolled_slots || 0);
    const max = Number(cls.max_slots || 40);
    const isFull = enrolled >= max;
    const isPassed = isClassSessionPassed(cls);
    const pct = Math.min(100, Math.round((enrolled / max) * 100));

    const popup = W().popup(`Chi tiết lớp tập: ${cls.title}`, content => {
      const topInfo = $('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #dfe6e2;">').appendTo(content);

      $('<div>')
        .html(`
          <div style="font-size:18px;font-weight:700;color:#185740;">${cls.title}</div>
          <div style="font-size:13px;color:#748078;margin-top:2px;">Bộ môn: <strong>${cls.discipline_name || theme.badgeText}</strong> · Chi nhánh: <strong>${cls.branch_name || ''}</strong></div>
        `)
        .appendTo(topInfo);

      const badgeText = cls.status === 'CANCELLED' ? 'ĐÃ HỦY' : (isPassed ? 'ĐÃ KẾT THÚC' : (isFull ? 'ĐÃ ĐỦ CHỖ' : 'ĐANG MỞ ĐĂNG KÝ'));
      const badgeTone = cls.status === 'CANCELLED' ? 'danger' : (isPassed ? 'neutral' : (isFull ? 'warning' : 'success'));
      $('<div>')
        .html(W().badge(badgeText, badgeTone))
        .appendTo(topInfo);

      // Lưới thông số chi tiết
      const grid = $('<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;background:#f8fbf9;border:1px solid #dfe6e2;border-radius:8px;padding:14px;">').appendTo(content);

      grid.append(`
        <div><span style="color:#748078;font-size:12px;">Ngày học:</span><div style="font-weight:600;font-size:14px;color:#1e293b;">${DAY_NAMES[new Date(cls.class_date).getDay()]}, ${W().date(cls.class_date)}</div></div>
        <div><span style="color:#748078;font-size:12px;">Khung giờ:</span><div style="font-weight:600;font-size:14px;color:#185740;">${String(cls.start_time).slice(0, 5)} - ${String(cls.end_time).slice(0, 5)}</div></div>
        <div><span style="color:#748078;font-size:12px;">Huấn luyện viên phụ trách:</span><div style="font-weight:600;font-size:14px;color:#1e293b;">${cls.instructor_name || 'Chưa phân công'} ${cls.pt_code ? `(${cls.pt_code})` : ''}</div></div>
        <div><span style="color:#748078;font-size:12px;">Số điện thoại HLV:</span><div style="font-weight:600;font-size:14px;color:#1e293b;">${cls.instructor_phone || 'Chưa cập nhật'}</div></div>
      `);

      if (ParadiseApp.isAdmin() && cls.base_price !== undefined) {
        const base = Number(cls.base_price || 0);
        const bonus = Number(cls.bonus_amount || 0);
        const total = base + bonus;
        grid.append(`
          <div style="grid-column: span 2;"><span style="color:#748078;font-size:12px;">Thù lao giảng dạy:</span><div style="font-weight:700;font-size:14px;color:#237b58;">${total.toLocaleString('vi-VN')} ₫ <span style="font-size:12px;font-weight:normal;color:#748078;">(Sàn: ${base.toLocaleString('vi-VN')} ₫ + Thưởng: ${bonus.toLocaleString('vi-VN')} ₫)</span></div></div>
        `);
      }

      // Thanh tiến độ chỗ trống
      const slotsCard = $('<div style="background:#ffffff;border:1px solid #dfe6e2;border-radius:8px;padding:12px;margin-bottom:16px;">').appendTo(content);
      $('<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">')
        .html(`<span>Tiến độ giữ chỗ: <strong>${enrolled}/${max} chỗ</strong></span> <strong style="color:${isFull ? '#d84848' : '#237b58'};">${isFull ? 'ĐÃ ĐỦ CHỖ' : `Còn lại ${max - enrolled} chỗ trống`}</strong>`)
        .appendTo(slotsCard);

      $('<div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">')
        .append($(`<div style="width:${pct}%;height:100%;background:${isFull ? '#d84848' : '#237b58'};transition:width 0.3s;">`))
        .appendTo(slotsCard);

      // Ghi chú
      if (cls.description) {
        $('<div style="font-size:12.5px;color:#475569;margin-bottom:18px;background:#ffffff;border:1px solid #dfe6e2;border-radius:6px;padding:10px;">')
          .html(`<strong>Ghi chú:</strong> ${cls.description}`)
          .appendTo(content);
      }

      // Thanh nút hành động
      const btnBar = $('<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:16px;flex-wrap:wrap;">').appendTo(content);

      if (ParadiseApp.isAdmin()) {
        const delBtn = W().button(btnBar, 'Xóa lớp', 'trash', () => {
          popup.hide();
          confirmDeleteClass(cls);
        });
        delBtn.option('stylingMode', 'outlined');
        delBtn.option('type', 'danger');
      }

      // NÚT GÁN LẠI PT: Chỉ hiển thị khi CHƯA QUA thời gian kết thúc buổi tập
      if (!isPassed && (ParadiseApp.isAdmin() || ParadiseApp.isStaff())) {
        const reassignBtn = W().button(btnBar, 'Gán lại PT', 'user', () => {
          popup.hide();
          openReassignInstructorModal(cls);
        });
        reassignBtn.option('stylingMode', 'outlined');
      }

      W().button(btnBar, `Danh sách học viên (${enrolled})`, 'group', () => {
        popup.hide();
        openClassMembersModal(cls);
      });

      if (!isFull && !isPassed) {
        W().button(btnBar, 'Ghi danh hội viên', 'add', () => {
          popup.hide();
          openRegisterMemberModal(cls);
        }, true);
      }

      W().button(btnBar, 'Đóng', '', () => popup.hide()).option('stylingMode', 'outlined');

    }, [], 720);
  }

  function openReassignInstructorModal(cls) {
    if (isClassSessionPassed(cls)) {
      DevExpress.ui.notify('Không thể gán lại PT vì buổi tập đã qua thời gian diễn ra', 'warning', 3500);
      return;
    }

    const popup = W().popup(`Gán lại HLV: ${cls.title}`, async content => {
      const $content = $(content);
      W().loading($content);

      const dateStr = typeof cls.class_date === 'string' ? cls.class_date.split('T')[0] : W().dateKey(cls.class_date);
      const startTime = String(cls.start_time).slice(0, 5);
      const endTime = String(cls.end_time).slice(0, 5);

      let availableTrainers = [];
      try {
        const url = `/community-classes/available-instructors?branch_id=${cls.branch_id}&class_date=${dateStr}&start_time=${startTime}&end_time=${endTime}&exclude_class_id=${cls.id}`;
        const res = await api().request(url);
        availableTrainers = W().rows(res);
      } catch (err) {
        console.warn('Lỗi tải danh sách HLV khả dụng:', err);
      }

      $content.empty();

      // Hộp thông tin tóm tắt lớp học
      const infoBox = $('<div style="background:#f8fbf9;border:1px solid #dfe6e2;border-radius:8px;padding:12px 14px;margin-bottom:16px;">').appendTo($content);
      infoBox.html(`
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
          <div><span style="color:#748078;font-size:11px;">Chi nhánh:</span><div style="font-weight:600;color:#185740;">${cls.branch_name || ''}</div></div>
          <div><span style="color:#748078;font-size:11px;">Bộ môn:</span><div style="font-weight:600;color:#1e293b;">${cls.discipline_name || cls.title}</div></div>
          <div><span style="color:#748078;font-size:11px;">Thời gian học:</span><div style="font-weight:600;color:#1e293b;">${DAY_NAMES[new Date(cls.class_date).getDay()]}, ${W().date(cls.class_date)} (${startTime} - ${endTime})</div></div>
          <div><span style="color:#748078;font-size:11px;">HLV hiện tại:</span><div style="font-weight:600;color:#2563eb;">${cls.instructor_name || 'Chưa phân công'} ${cls.pt_code ? `(${cls.pt_code})` : ''}</div></div>
        </div>
      `);

      const model = {
        instructor_id: cls.instructor_id || (availableTrainers[0]?.id || null),
        note: ''
      };

      const formDiv = $('<div>').appendTo($content);
      const form = formDiv.dxForm({
        formData: model,
        labelLocation: 'top',
        showColonAfterLabel: false,
        items: [
          {
            dataField: 'instructor_id',
            label: { text: 'Huấn luyện viên phụ trách mới' },
            editorType: 'dxSelectBox',
            editorOptions: {
              items: availableTrainers,
              valueExpr: 'id',
              displayExpr: p => p ? `${p.full_name} (${p.pt_code}) · ${p.phone || ''}` : '',
              value: model.instructor_id,
              searchEnabled: true,
              placeholder: availableTrainers.length > 0 ? 'Chọn HLV thay thế phụ trách lớp...' : 'Không có HLV nào khác thuộc chi nhánh rảnh trong khung giờ này',
              noDataText: 'Không tìm thấy HLV khả dụng tại chi nhánh trong khung giờ này'
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn HLV phụ trách' }]
          },
          {
            dataField: 'note',
            label: { text: 'Lý do gán lại / Ghi chú điều chuyển' },
            editorType: 'dxTextArea',
            editorOptions: {
              maxLength: 255,
              height: 75,
              placeholder: 'Ví dụ: HLV bận việc đột xuất, đổi ca dạy thay...'
            }
          }
        ]
      }).dxForm('instance');

      // Thanh nút lưu
      const btnRow = $('<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;">').appendTo($content);

      W().button(btnRow, 'Hủy', '', () => {
        popup.hide();
        openClassDetailModal(cls);
      }).option('stylingMode', 'outlined');

      const saveBtn = W().button(btnRow, 'Xác nhận gán lại PT', 'save', async () => {
        if (!form.validate().isValid) return;

        saveBtn.option('disabled', true);
        try {
          const res = await api().request(`/community-classes/${cls.id}/instructor`, {
            method: 'PUT',
            body: {
              instructor_id: model.instructor_id,
              note: model.note
            }
          });

          DevExpress.ui.notify(res.message || 'Đã gán lại HLV phụ trách thành công!', 'success', 2500);
          popup.hide();
          await load();

          // Cập nhật lại cls và mở lại popup chi tiết với thông tin mới
          if (res.data) {
            Object.assign(cls, res.data);
            openClassDetailModal(cls);
          }
        } catch (err) {
          DevExpress.ui.notify(err.message || 'Lỗi khi gán lại HLV', 'error', 3500);
          saveBtn.option('disabled', false);
        }
      }, true);

    }, [], 560);
  }

  // ==========================================================================
  // CÁC MODAL NGHIỆP VỤ: QUẢN LÝ BỘ MÔN (EDITABLE DURATION), TẠO LỚP, GHI DANH
  // ==========================================================================
  function confirmDeleteClass(cls) {
    DevExpress.ui.dialog.confirm(
      `Bạn có chắc chắn muốn xóa lớp tập "<strong>${cls.title}</strong>" (${String(cls.start_time).slice(0, 5)} - ${String(cls.end_time).slice(0, 5)}) tại chi nhánh <strong>${cls.branch_name || ''}</strong>?<br><br><span style="color:#d84848;font-size:12px;">⚠️ Toàn bộ ${cls.enrolled_slots || 0} học viên đã đăng ký sẽ bị hủy theo lớp này.</span>`,
      'Xác nhận xóa lớp tập cộng đồng'
    ).then(async ok => {
      if (!ok) return;
      try {
        await api().request(`/community-classes/${cls.id}`, { method: 'DELETE' });
        DevExpress.ui.notify(`Đã xóa lớp tập "${cls.title}" thành công!`, 'success', 2500);
        await load();
      } catch (err) {
        DevExpress.ui.notify(err.message || 'Không thể xóa lớp tập', 'error', 3500);
      }
    });
  }

  function openDisciplineManagementModal() {
    W().popup('Cấu hình danh mục bộ môn', content => {
      const topBar = $('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">').appendTo(content);
      $('<div style="font-weight:600;font-size:14px;color:#253e30;">Danh mục bộ môn tập luyện cộng đồng</div>').appendTo(topBar);

      let gridInstance = null;
      async function reloadGrid() {
        if (gridInstance) {
          const res = await api().request('/class-disciplines');
          gridInstance.option('dataSource', W().rows(res));
        }
      }

      W().button(topBar, 'Thêm bộ môn', 'add', () => {
        openDisciplineFormModal(null, reloadGrid);
      }, true);

      const gridDiv = $('<div>').appendTo(content);
      api().request('/class-disciplines').then(res => {
        const disciplines = W().rows(res);
        cachedDisciplines = disciplines;
        gridInstance = W().grid(gridDiv, disciplines, [
          { dataField: 'name', caption: 'Tên bộ môn', minWidth: 160 },
          { dataField: 'description', caption: 'Mô tả', minWidth: 200 },
          {
            dataField: 'base_price', caption: 'Giá sàn 1 buổi', width: 140, alignment: 'right',
            calculateCellValue: r => Number(r.base_price || 0),
            cellTemplate: (el, cell) => {
              el.text(Number(cell.value || 0).toLocaleString('vi-VN') + ' ₫');
            }
          },
          {
            dataField: 'max_duration_minutes', caption: 'Thời lượng', width: 130, alignment: 'center',
            calculateCellValue: r => r.max_duration_minutes ? `${r.max_duration_minutes} phút` : '60 phút'
          },
          {
            dataField: 'status', caption: 'Trạng thái', width: 120,
            cellTemplate: (el, cell) => {
              const active = cell.data.status === 'ACTIVE';
              el.append(W().badge(active ? 'Hoạt động' : 'Tạm dừng', active ? 'success' : 'neutral'));
            }
          },
          {
            caption: 'Thao tác', width: 150, fixed: true, fixedPosition: 'right',
            cellTemplate: (el, cell) => {
              const r = cell.data;
              const box = $('<div style="display:flex;gap:6px;align-items:center;">').appendTo(el);
              W().button(box, 'Sửa', 'edit', () => openDisciplineFormModal(r, reloadGrid));
              const delBtn = W().button(box, 'Xóa', 'trash', () => {
                DevExpress.ui.dialog.confirm(
                  `Bạn có chắc chắn muốn xóa bộ môn "<strong>${r.name}</strong>"?<br><span style="font-size:12px;color:#748078;">Nếu bộ môn đã gắn với lớp học cộng đồng, hệ thống sẽ tự động chuyển sang trạng thái Tạm dừng thay vì xóa dữ liệu.</span>`,
                  'Xác nhận thao tác bộ môn'
                ).then(async ok => {
                  if (!ok) return;
                  try {
                    const delRes = await api().request(`/class-disciplines/${r.id}`, { method: 'DELETE' });
                    DevExpress.ui.notify(delRes.message || 'Thao tác bộ môn thành công', 'success', 2500);
                    await reloadGrid();
                  } catch (err) {
                    DevExpress.ui.notify(err.message || 'Lỗi khi xóa bộ môn', 'error', 3500);
                  }
                });
              });
              delBtn.option('stylingMode', 'text');
              delBtn.option('type', 'danger');
            }
          }
        ], { columnAutoWidth: true, paging: { pageSize: 8 } });
      }).catch(err => {
        DevExpress.ui.notify(err.message || 'Lỗi nạp danh mục bộ môn', 'error');
      });
    }, [], 880);
  }

  function openDisciplineFormModal(item, onSaved) {
    const isEdit = !!item;
    const formDialog = W().popup(isEdit ? `Chỉnh sửa bộ môn: ${item.name}` : 'Thêm mới bộ môn', content => {
      const formDiv = $('<div>').appendTo(content);
      const data = {
        name: item?.name || '',
        base_price: item ? Number(item.base_price || 0) : 200000,
        max_duration_minutes: item ? Number(item.max_duration_minutes || 60) : 60,
        status: item?.status || 'ACTIVE',
        description: item?.description || ''
      };

      const form = formDiv.dxForm({
        formData: data, labelLocation: 'top', showColonAfterLabel: false, colCount: 2,
        items: [
          {
            dataField: 'name', label: { text: 'Tên bộ môn' }, colSpan: 2,
            editorType: 'dxTextBox',
            editorOptions: { placeholder: 'Ví dụ: Yoga Flow, Zumba Dance, BodyPump...' },
            validationRules: [{ type: 'required', message: 'Vui lòng nhập tên bộ môn' }]
          },
          {
            dataField: 'base_price', label: { text: 'Giá sàn 1 buổi dạy (₫)' },
            editorType: 'dxNumberBox',
            editorOptions: {
              min: 0, step: 20000, format: '#,##0 ₫',
              placeholder: 'Ví dụ: 200,000'
            },
            validationRules: [{ type: 'required', message: 'Vui lòng nhập giá sàn buổi dạy' }]
          },
          {
            dataField: 'max_duration_minutes', label: { text: 'Thời lượng 1 buổi (phút)' },
            editorType: 'dxNumberBox',
            editorOptions: {
              min: 15, max: 240, step: 15,
              placeholder: '60'
            },
            validationRules: [{ type: 'required', message: 'Vui lòng nhập thời lượng buổi tập' }]
          },
          {
            dataField: 'status', label: { text: 'Trạng thái hoạt động' }, colSpan: 2,
            editorType: 'dxSelectBox',
            editorOptions: {
              items: [
                { id: 'ACTIVE', text: 'Hoạt động (Cho phép lập lịch lớp)' },
                { id: 'INACTIVE', text: 'Tạm dừng (Không nhận lập lịch mới)' }
              ],
              valueExpr: 'id', displayExpr: 'text'
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn trạng thái' }]
          },
          {
            dataField: 'description', label: { text: 'Mô tả bộ môn' }, colSpan: 2,
            editorType: 'dxTextArea',
            editorOptions: { height: 75, placeholder: 'Giới thiệu về bộ môn, lợi ích sức khỏe, trang bị...' }
          }
        ]
      }).dxForm('instance');

      $('<div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">').append(
        $('<div>').dxButton({ text: 'Hủy', stylingMode: 'outlined', onClick: () => formDialog.hide() }),
        $('<div>').dxButton({
          text: isEdit ? 'Lưu thay đổi' : 'Thêm bộ môn',
          type: 'default', stylingMode: 'contained', icon: 'save',
          onClick: async () => {
            if (!form.validate().isValid) return;
            try {
              if (isEdit) {
                await api().request(`/class-disciplines/${item.id}`, {
                  method: 'PUT',
                  body: data
                });
                DevExpress.ui.notify(`Đã cập nhật bộ môn "${data.name}" thành công!`, 'success', 2500);
              } else {
                await api().request('/class-disciplines', {
                  method: 'POST',
                  body: data
                });
                DevExpress.ui.notify(`Đã thêm bộ môn "${data.name}" thành công!`, 'success', 2500);
              }
              formDialog.hide();
              if (onSaved) await onSaved();
            } catch (err) {
              DevExpress.ui.notify(err.message || 'Lỗi khi lưu bộ môn', 'error', 3500);
            }
          }
        })
      ).appendTo(content);
    }, [], 580);
  }

  function openCreateClassModal(prefillDateKey = null, prefillStartTime = null, existingDraft = null) {
    const dialog = W().popup('Thêm lịch lớp tập cộng đồng', async content => {
      const $content = $(content);
      W().loading($content);
      let activeDisciplines = [];
      let allTrainers = [];

      try {
        const [discRes, trainerRes] = await Promise.all([
          api().request('/class-disciplines?status=ACTIVE'),
          api().request('/pt-bookings/trainers?status=ACTIVE', { headers: { 'x-branch-id': 'ALL' } })
        ]);
        activeDisciplines = W().rows(discRes);
        allTrainers = W().rows(trainerRes);
        cachedDisciplines = activeDisciplines;
        cachedTrainers = allTrainers;
      } catch (err) {
        console.warn('Lỗi nạp dữ liệu lập lớp:', err);
      }
      $content.empty();

      const formDiv = $('<div>').appendTo($content);
      const defaultBranchId = (filterBranch && filterBranch !== 'ALL') ? filterBranch : (cachedBranches[0]?.id || api().getCurrentBranchId());

      const targetClassDate = existingDraft?.class_date || prefillDateKey || W().dateKey(selectedDate);
      const targetStartTime = existingDraft?.start_time || prefillStartTime || '18:00';
      const targetEndTime = existingDraft?.end_time || calculateEndTime(targetStartTime, existingDraft?.duration || 60);

      const data = {
        branch_id: existingDraft?.branch_id || (existingDraft?.branch_ids && existingDraft.branch_ids[0]) || defaultBranchId,
        branch_ids: [existingDraft?.branch_id || (existingDraft?.branch_ids && existingDraft.branch_ids[0]) || defaultBranchId],
        discipline_id: existingDraft?.discipline_id || null,
        title: existingDraft?.title || '',
        instructor_id: existingDraft?.instructor_id || null,
        instructor_name: existingDraft?.instructor_name || '',
        base_price: existingDraft?.base_price || 0,
        bonus_amount: existingDraft?.bonus_amount || 0,
        class_date: targetClassDate,
        start_time: targetStartTime,
        end_time: targetEndTime,
        max_slots: existingDraft?.max_slots || 40,
        description: existingDraft?.description || ''
      };

      let calendarDragBtn = null;

      async function reloadAvailableTrainers() {
        const instEditor = form ? form.getEditor('instructor_id') : null;
        if (!data.branch_id) {
          if (instEditor) instEditor.option({ items: [], placeholder: 'Vui lòng chọn chi nhánh trước' });
          return;
        }

        const dateVal = data.class_date || W().dateKey(selectedDate);
        const startVal = data.start_time || '18:00';
        const endVal = data.end_time || '19:00';

        try {
          const url = `/community-classes/available-instructors?branch_id=${data.branch_id}&class_date=${dateVal}&start_time=${startVal}&end_time=${endVal}`;
          const res = await api().request(url);
          const available = W().rows(res);
          cachedTrainers = available;
          if (instEditor) {
            instEditor.option({
              items: available,
              placeholder: available.length > 0
                ? `Chọn HLV phụ trách (Có ${available.length} HLV rảnh)...`
                : 'Không có HLV nào thuộc chi nhánh rảnh trong khung giờ này'
            });
            const currentVal = instEditor.option('value');
            if (currentVal && !available.some(t => t.id === currentVal)) {
              instEditor.option('value', null);
              data.instructor_id = null;
              data.instructor_name = '';
              DevExpress.ui.notify('HLV đã chọn không còn rảnh trong khung giờ mới hoặc không thuộc chi nhánh. Vui lòng chọn lại.', 'warning', 3500);
            }
          }
        } catch (err) {
          console.warn('Lỗi kiểm tra HLV khả dụng:', err);
        }
      }

      function updateCompensationDisplay() {
        const base = Number(data.base_price || 0);
        const bonus = Number(data.bonus_amount || 0);
        const total = base + bonus;
        const txt = `${total.toLocaleString('vi-VN')} ₫ (${base.toLocaleString('vi-VN')} ₫ sàn + ${bonus.toLocaleString('vi-VN')} ₫ thưởng)`;
        form.getEditor('total_compensation_display')?.option('value', txt);
      }

      const form = formDiv.dxForm({
        formData: data, labelLocation: 'top', showColonAfterLabel: false, colCount: 2,
        items: [
          {
            dataField: 'branch_id', label: { text: 'Chi nhánh tổ chức' }, colSpan: 2,
            editorType: 'dxSelectBox',
            editorOptions: {
              items: cachedBranches.map(b => ({ id: b.id, branch_name: b.branch_name })),
              value: data.branch_id,
              valueExpr: 'id',
              displayExpr: 'branch_name',
              searchEnabled: cachedBranches.length > 5,
              placeholder: 'Chọn chi nhánh tổ chức...',
              onValueChanged: e => {
                data.branch_id = e.value;
                data.branch_ids = e.value ? [e.value] : [];
                reloadAvailableTrainers();
              }
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn chi nhánh tổ chức' }]
          },
          {
            dataField: 'discipline_id', label: { text: 'Tên lớp học (Bộ môn)' }, colSpan: 1,
            editorType: 'dxSelectBox',
            editorOptions: {
              items: activeDisciplines,
              valueExpr: 'id',
              displayExpr: 'name',
              value: data.discipline_id,
              itemTemplate: item => {
                const price = Number(item.base_price || 0).toLocaleString('vi-VN');
                const dur = item.max_duration_minutes || 60;
                return $(`<div style="padding:2px 0;"><strong>${item.name}</strong> <span style="color:#748078;font-size:11px;">(Sàn: ${price} ₫ · ${dur}p)</span></div>`);
              },
              searchEnabled: true,
              placeholder: 'Chọn bộ môn (Yoga, Zumba, BodyPump...)...',
              onValueChanged: e => {
                const disc = activeDisciplines.find(d => d.id === e.value);
                if (!disc) {
                  data.discipline_id = null;
                  if (calendarDragBtn) calendarDragBtn.option('disabled', true);
                  return;
                }
                data.discipline_id = disc.id;
                data.title = disc.name;
                data.base_price = Number(disc.base_price) || 0;

                const descEditor = form.getEditor('description');
                if (descEditor && !descEditor.option('value')) {
                  descEditor.option('value', disc.description || '');
                  data.description = disc.description || '';
                }

                // Tự động tính toán giờ kết thúc dựa trên thời lượng bộ môn QTV đã cấu hình
                const currentStart = form.getEditor('start_time')?.option('value') || data.start_time;
                const dur = disc.max_duration_minutes || 60;
                if (currentStart) {
                  const calculatedEnd = calculateEndTime(currentStart, dur);
                  form.getEditor('end_time')?.option('value', calculatedEnd);
                  data.end_time = calculatedEnd;
                }

                updateCompensationDisplay();
                reloadAvailableTrainers();

                if (calendarDragBtn) {
                  calendarDragBtn.option('disabled', !data.discipline_id || !data.instructor_id);
                }
              }
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn bộ môn lớp học' }]
          },
          {
            dataField: 'instructor_id', label: { text: 'Huấn luyện viên / Giáo viên (Chỉ hiện HLV rảnh)' }, colSpan: 1,
            editorType: 'dxSelectBox',
            editorOptions: {
              items: [],
              valueExpr: 'id',
              value: data.instructor_id,
              displayExpr: item => item ? `${item.full_name} (${item.pt_code || 'PT'})` : '',
              searchEnabled: true,
              placeholder: 'Đang nạp danh sách HLV rảnh...',
              onValueChanged: e => {
                data.instructor_id = e.value;
                const trainer = cachedTrainers.find(t => t.id === e.value);
                data.instructor_name = trainer ? trainer.full_name : '';

                if (calendarDragBtn) {
                  calendarDragBtn.option('disabled', !data.discipline_id || !data.instructor_id);
                }
              }
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn huấn luyện viên' }]
          },
          {
            dataField: 'bonus_amount', label: { text: 'Thưởng thêm HLV (₫)' }, colSpan: 1,
            editorType: 'dxNumberBox',
            editorOptions: {
              min: 0, step: 10000, format: '#,##0 ₫', value: data.bonus_amount,
              placeholder: '0 ₫',
              onValueChanged: e => {
                data.bonus_amount = Number(e.value) || 0;
                updateCompensationDisplay();
              }
            }
          },
          {
            dataField: 'total_compensation_display', label: { text: 'Tổng thù lao HLV (Giá sàn + Thưởng)' }, colSpan: 1,
            editorType: 'dxTextBox',
            editorOptions: {
              readOnly: true,
              value: '0 ₫',
              inputAttr: { style: 'font-weight: 600; color: #237b58;' }
            }
          },
          {
            dataField: 'class_date', label: { text: 'Ngày học' }, colSpan: 1,
            editorType: 'dxDateBox',
            editorOptions: {
              type: 'date', displayFormat: 'dd/MM/yyyy', dateSerializationFormat: 'yyyy-MM-dd', value: targetClassDate,
              onValueChanged: e => {
                data.class_date = e.value;
                reloadAvailableTrainers();
              }
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn ngày học' }]
          },
          {
            dataField: 'max_slots', label: { text: 'Số lượng chỗ tối đa' }, colSpan: 1,
            editorType: 'dxNumberBox', editorOptions: { min: 5, max: 100, value: data.max_slots },
            validationRules: [{ type: 'required', message: 'Nhập số chỗ tối đa' }]
          },
          {
            dataField: 'start_time', label: { text: 'Giờ bắt đầu' }, colSpan: 1,
            editorType: 'dxSelectBox',
            editorOptions: {
              items: TIME_OPTIONS,
              value: targetStartTime,
              searchEnabled: true,
              placeholder: 'Chọn giờ bắt đầu...',
              onValueChanged: e => {
                data.start_time = e.value;
                if (e.value) {
                  const disc = activeDisciplines.find(d => d.id === data.discipline_id);
                  const dur = disc ? (disc.max_duration_minutes || 60) : 60;
                  const newEnd = calculateEndTime(e.value, dur);
                  form.getEditor('end_time')?.option('value', newEnd);
                  data.end_time = newEnd;
                }
                reloadAvailableTrainers();
              }
            },
            validationRules: [{ type: 'required', message: 'Chọn giờ bắt đầu' }]
          },
          {
            dataField: 'end_time', label: { text: 'Giờ kết thúc' }, colSpan: 1,
            editorType: 'dxSelectBox',
            editorOptions: {
              items: TIME_OPTIONS,
              value: targetEndTime,
              searchEnabled: true,
              placeholder: 'Chọn giờ kết thúc...',
              onValueChanged: e => {
                data.end_time = e.value;
                reloadAvailableTrainers();
              }
            },
            validationRules: [
              { type: 'required', message: 'Chọn giờ kết thúc' },
              {
                type: 'custom',
                message: 'Giờ kết thúc phải sau giờ bắt đầu',
                validationCallback: e => {
                  const start = form.getEditor('start_time')?.option('value');
                  const end = e.value;
                  if (!start || !end) return true;
                  return end > start;
                }
              }
            ]
          },
          {
            dataField: 'description', label: { text: 'Mô tả lớp học & lưu ý' }, colSpan: 2,
            editorType: 'dxTextArea', editorOptions: { height: 75, placeholder: 'Mang theo thảm tập cá nhân, khăn lau...', value: data.description }
          }
        ]
      }).dxForm('instance');

      reloadAvailableTrainers();

      // Nút điều khiển phía dưới: Nút [Kéo chọn giờ trên Calendar] bên trái, [Hủy] và [Tạo lớp học] bên phải
      const btnRow = $('<div style="margin-top:16px;display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;">').appendTo($content);
      const leftBtns = $('<div style="display:flex;gap:8px;">').appendTo(btnRow);
      const rightBtns = $('<div style="display:flex;gap:8px;">').appendTo(btnRow);

      calendarDragBtn = $('<div>').dxButton({
        text: 'Kéo chọn giờ trên Calendar',
        icon: 'event',
        type: 'default',
        stylingMode: 'outlined',
        disabled: !data.discipline_id || !data.instructor_id,
        onClick: () => {
          if (!data.discipline_id || !data.instructor_id) {
            DevExpress.ui.notify('Vui lòng chọn bộ môn và huấn luyện viên trước khi kéo chọn giờ trên lịch.', 'warning', 2500);
            return;
          }

          const disc = activeDisciplines.find(d => d.id === data.discipline_id);
          const dur = disc ? (disc.max_duration_minutes || 60) : 60;
          const dateStr = W().dateKey(data.class_date || targetClassDate);
          const startStr = data.start_time || targetStartTime;
          const endStr = data.end_time || calculateEndTime(startStr, dur);
          const branchId = data.branch_id || (data.branch_ids && data.branch_ids[0]);
          const selectedBranch = cachedBranches.find(b => b.id === branchId);
          const branchName = selectedBranch ? selectedBranch.branch_name : 'Chi nhánh tổ chức';

          dialog.hide();

          draftClass = {
            id: 'draft-community-class',
            is_draft: true,
            branch_id: branchId,
            branch_ids: [branchId],
            branch_names: [branchName],
            branch_name: branchName,
            discipline_id: data.discipline_id,
            discipline_name: disc?.name || 'Bộ môn',
            max_duration_minutes: dur,
            title: data.title || disc?.name || 'Lớp cộng đồng',
            instructor_id: data.instructor_id,
            instructor_name: data.instructor_name || 'HLV',
            bonus_amount: Number(data.bonus_amount || 0),
            base_price: Number(data.base_price || 0),
            class_date: dateStr,
            start_time: startStr,
            end_time: endStr,
            duration: dur,
            max_slots: Number(data.max_slots || 40),
            description: data.description || '',
            startDate: (() => {
              const [yr, mo, dy] = dateStr.split('-').map(Number);
              const [sh, sm] = startStr.split(':').map(Number);
              return new Date(yr, mo - 1, dy, sh, sm, 0);
            })(),
            endDate: (() => {
              const [yr, mo, dy] = dateStr.split('-').map(Number);
              const [eh, em] = endStr.split(':').map(Number);
              return new Date(yr, mo - 1, dy, eh, em, 0);
            })(),
            theme: detectDisciplineTheme({ title: disc?.name, discipline_name: disc?.name })
          };

          // Tự động chuyển bộ lọc sang chi nhánh của thẻ dự kiến nếu đang ở chi nhánh khác
          if (filterBranch !== branchId) {
            filterBranch = branchId;
            const branchSelectBox = $('#communityBranchFilter').dxSelectBox('instance');
            if (branchSelectBox) branchSelectBox.option('value', filterBranch);
          }

          updateSchedulerDataSource();
          DevExpress.ui.notify('Đã tạo thẻ lịch dự kiến. Kéo thả thẻ để chọn khung giờ và bấm [Đặt lịch] để hoàn tất.', 'info', 4000);
        }
      }).dxButton('instance');
      leftBtns.append(calendarDragBtn.element());

      $('<div>').dxButton({ text: 'Hủy', stylingMode: 'outlined', onClick: () => dialog.hide() }).appendTo(rightBtns);
      $('<div>').dxButton({
        text: 'Tạo lớp học', type: 'default', stylingMode: 'contained', icon: 'save',
        onClick: async () => {
          if (!form.validate().isValid) return;
          const branchId = data.branch_id || (data.branch_ids && data.branch_ids[0]);
          if (!branchId) {
            DevExpress.ui.notify('Vui lòng chọn chi nhánh tổ chức', 'warning');
            return;
          }
          try {
            await api().request('/community-classes', {
              method: 'POST',
              body: {
                branch_id: branchId,
                branch_ids: [branchId],
                discipline_id: data.discipline_id,
                title: data.title,
                instructor_id: data.instructor_id,
                instructor_name: data.instructor_name,
                bonus_amount: data.bonus_amount || 0,
                base_price: data.base_price || 0,
                class_date: data.class_date,
                start_time: data.start_time,
                end_time: data.end_time,
                max_slots: data.max_slots || 40,
                description: data.description || ''
              }
            });
            DevExpress.ui.notify(`Đã tạo lớp tập cộng đồng "${data.title}" thành công!`, 'success', 2500);
            draftClass = null;
            dialog.hide();
            await load();
          } catch (err) { DevExpress.ui.notify(err.message, 'error', 3500); }
        }
      }).appendTo(rightBtns);
    }, [], 720);
  }

  function openRegisterMemberModal(cls) {
    const dialog = W().popup(`Đăng ký lớp: ${cls.title}`, content => {
      const formDiv = $('<div>').appendTo(content);
      const data = { member_id: null };

      $('<div style="margin-bottom:12px;padding:10px;background:#f8fbf9;border:1px solid #dfe6e2;border-radius:4px;font-size:12px;">')
        .html(`
          <div><strong>Lớp:</strong> ${cls.title} (${String(cls.start_time).slice(0, 5)} - ${String(cls.end_time).slice(0, 5)})</div>
          <div><strong>HLV:</strong> ${cls.instructor_name} | <strong>Chỗ:</strong> ${cls.enrolled_slots}/${cls.max_slots}</div>
          <div style="color:#237b58;margin-top:4px;">* Yêu cầu: Hội viên có gói Gym còn hiệu lực sử dụng.</div>
        `).appendTo(formDiv);

      const form = formDiv.dxForm({
        formData: data, labelLocation: 'top',
        items: [
          {
            dataField: 'member_id', label: { text: 'Chọn hội viên tham gia' },
            editorType: 'dxSelectBox',
            editorOptions: {
              dataSource: new DevExpress.data.CustomStore({
                key: 'id', loadMode: 'processed',
                load: async opts => {
                  const q = String(opts.searchValue || '').trim();
                  if (q.length < 2) return [];
                  const res = await api().request(`/access-gate/members?q=${encodeURIComponent(q)}`);
                  return W().rows(res);
                },
                byKey: async id => (await api().request(`/members/${id}`)).data
              }),
              minSearchLength: 2, searchEnabled: true,
              valueExpr: 'id',
              displayExpr: item => item ? `${item.member_code} · ${item.full_name} · ${item.phone}` : '',
              placeholder: 'Tìm theo mã HV, họ tên hoặc SĐT...'
            },
            validationRules: [{ type: 'required', message: 'Vui lòng chọn hội viên' }]
          }
        ]
      }).dxForm('instance');

      $('<div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;">').append(
        $('<div>').dxButton({ text: 'Hủy', onClick: () => dialog.hide() }),
        $('<div>').dxButton({
          text: 'Xác nhận ghi danh', type: 'default', stylingMode: 'contained', icon: 'check',
          onClick: async () => {
            if (!form.validate().isValid) return;
            try {
              await api().request(`/community-classes/${cls.id}/register`, {
                method: 'POST',
                body: { member_id: data.member_id }
              });
              DevExpress.ui.notify('Đã đăng ký hội viên vào lớp thành công!', 'success', 2500);
              dialog.hide();
              await load();
            } catch (err) { DevExpress.ui.notify(err.message, 'error', 3500); }
          }
        })
      ).appendTo(content);
    });
  }

  async function openClassMembersModal(cls) {
    const dialog = W().popup(`Danh sách học viên: ${cls.title}`, content => {
      W().loading(content);
      api().request(`/community-classes/${cls.id}/members`).then(res => {
        content.empty();
        const members = res.data?.members || [];

        $('<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">')
          .html(`<div><strong>${cls.title}</strong> (${String(cls.start_time).slice(0, 5)} - ${String(cls.end_time).slice(0, 5)}) - HLV: ${cls.instructor_name}</div><strong style="color:#237b58;">${members.length}/${cls.max_slots} học viên</strong>`)
          .appendTo(content);

        if (!members.length) {
          return W().empty(content, 'Lớp học hiện chưa có học viên nào đăng ký', 'users');
        }

        W().grid(content, members, [
          { dataField: 'member_code', caption: 'Mã HV', width: 110 },
          { dataField: 'full_name', caption: 'Họ và tên', minWidth: 160 },
          { dataField: 'phone', caption: 'Số điện thoại', width: 120 },
          { dataField: 'registration_date', caption: 'Thời điểm đăng ký', dataType: 'datetime', format: 'dd/MM/yyyy HH:mm', width: 150 },
          {
            caption: 'Hủy đăng ký', width: 120,
            cellTemplate: (el, cell) => {
              const btn = W().button(el, 'Hủy', 'trash', () => {
                DevExpress.ui.dialog.confirm(
                  `Bạn có chắc muốn hủy đăng ký lớp của học viên <strong>${cell.data.full_name}</strong> (${cell.data.member_code}) không?`,
                  'Xác nhận hủy đăng ký'
                ).then(async ok => {
                  if (!ok) return;
                  try {
                    await api().request(`/community-classes/${cls.id}/cancel`, {
                      method: 'POST',
                      body: { member_id: cell.data.member_id }
                    });
                    DevExpress.ui.notify('Đã hủy đăng ký học viên khỏi lớp', 'success', 2500);
                    dialog.hide();
                    await load();
                  } catch (err) { DevExpress.ui.notify(err.message, 'error', 3500); }
                });
              });
              btn.option('stylingMode', 'outlined');
              btn.option('type', 'danger');
            }
          }
        ], { columnAutoWidth: true, paging: { pageSize: 8 } });
      }).catch(err => W().error(content, err));
    }, [], 750);
  }

  function destroy() { revision++; view = null; schedulerInstance = null; draftClass = null; filterBranch = 'ALL'; cachedBranches = []; }
  return { render, refresh: load, destroy };
})();
