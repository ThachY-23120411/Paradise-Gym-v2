(function () {
  "use strict";
  const A = window.MemberApp,
    e = A.escape;
  const S = {
    day: null,
    filter: "ALL",
    bookingDay: A.today(),
    registration: null,
  };
  const stamp = (b, end = false) =>
    new Date(
      `${b.booking_date}T${String(end ? b.end_time : b.start_time).slice(0, 5)}:00+07:00`,
    );
  const bookingState = (b) => {
    if (["COMPLETED", "DONE"].includes(b.status) || (b.member_confirmed_at && b.pt_confirmed_at)) return "COMPLETED";
    if (b.status === "CANCELLED") return "CANCELLED";
    if (b.status === "PENDING_COMPLETION" || b.member_confirmed_at || b.pt_confirmed_at) return "PENDING_COMPLETION";
    if (stamp(b) <= new Date() && stamp(b, true) > new Date()) return "ONGOING";
    return "BOOKED";
  };
  const dateKey = (d) =>
    d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      : null;
  function calendar(root, value, onChange, toggle = false) {
    const el = document.createElement("div");
    el.className = "calendar";
    root.append(el);
    const instance = $(el)
      .dxCalendar({
        value: value ? new Date(`${value}T12:00:00`) : null,
        firstDayOfWeek: 1,
        showTodayButton: false,
        zoomLevel: "month",
        minZoomLevel: "month",
        maxZoomLevel: "month",
        onValueChanged: (event) => onChange(dateKey(event.value)),
      })
      .dxCalendar("instance");
    if (toggle)
      el.addEventListener("click", (ev) => {
        const cell = ev.target.closest(".dx-calendar-selected-date");
        if (cell && value && dateKey(instance.option("value")) === value) {
          instance.option("value", null);
        }
      });
    return instance;
  }
  async function home(root, sub, alive) {
    const [profile, invitations, bookings] = await Promise.all([
      A.request(`/members/${A.user.member_profile_id}`),
      A.request("/group-invitations?status=PENDING").catch(() => []),
      A.request("/pt-bookings"),
    ]);
    if (!alive()) return;
    A.profile = profile;
    const initials = (profile.full_name || '?').split(' ').slice(-2).map(x => x[0]).join('');
    const avatarHtml = profile.avatar_url && /^https?:\/\//.test(profile.avatar_url)
      ? `<img src="${profile.avatar_url}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #237b58;">`
      : `<div style="width:48px;height:48px;border-radius:50%;background:#eaf4ee;color:#237b58;font-weight:700;display:grid;place-items:center;">${initials}</div>`;

    root.innerHTML = `<section class="welcome" style="display:flex;align-items:center;gap:12px;">
      ${avatarHtml}
      <div><p class="muted" style="margin:0;">Xin chào, ${A.value(profile.full_name)}</p><h1 style="font-size:17px;margin:0;">Mã HV: ${profile.member_code}</h1></div>
    </section>`;
    const pending = Array.isArray(invitations) ? invitations.filter((x) => x.invitation_status === "PENDING") : [];
    const tasks = document.createElement("section");
    tasks.className = `home-band ${pending.length ? "pending" : ""}`;
    tasks.innerHTML = `<div class="band-icon">${A.icon(pending.length ? "envelope-open-text" : "circle-check")}</div><h2>${pending.length ? "Lời mời vào gói đang chờ phản hồi" : "Không có việc cần xử lý"}</h2>${pending.map((x) => `<p>Bạn có lời mời tham gia gói <strong>${A.value(x.package_name_snapshot)}</strong> từ <strong>${A.value(x.inviter_name)}</strong>.</p>`).join("")}`;
    root.append(tasks);
    if (pending.length) {
      const b = A.button("Xem lời mời vào Gói", "arrow-right");
      b.onclick = () => A.navigate("packages", "invitations");
      tasks.append(b);
    }
    const next = bookings
      .filter((b) => bookingState(b) === "BOOKED")
      .sort((a, b) => stamp(a) - stamp(b))[0];
    const upcoming = document.createElement("section");
    upcoming.className = "home-band";
    upcoming.innerHTML = `<div class="band-icon">${A.icon("calendar-day")}</div><h2>Lịch sắp tới</h2><p>${next ? `${A.date(next.booking_date)} · ${e(next.start_time.slice(0, 5))} - ${e(next.end_time.slice(0, 5))}` : "Chưa có lịch sắp tới"}</p>${next ? `<p>${A.value(next.pt_name)} · ${A.value(next.package_name_snapshot || next.package_name)}</p>` : ""}`;
    root.append(upcoming);
    const view = A.button("Xem lịch của tôi", "calendar");
    view.onclick = () => A.navigate("schedule", "mine");
    upcoming.append(view);
    const quick = document.createElement("section");
    quick.className = "home-band";
    quick.innerHTML = '<h2>Quản lý gói tập</h2><div class="actions"></div>';
    root.append(quick);
    for (const [id, label, icon] of [
      ["sale", "Mua gói", "plus"],
      ["mine", "Gói của tôi", "ticket"],
    ]) {
      const b = A.button(label, icon, id === "sale" ? "primary" : "");
      b.onclick = () => A.navigate("packages", id);
      quick.lastElementChild.append(b);
    }
  }
  function bookingCard(b) {
    const status = bookingState(b),
      card = document.createElement("article");
    card.className = `record status-${status.toLowerCase()}`;
    card.dataset.bookingId = b.id;
    card.innerHTML = `<div class="row"><h3>${A.date(b.booking_date)} · ${e(b.start_time.slice(0, 5))} - ${e(b.end_time.slice(0, 5))}</h3>${A.badge(status, status === "ONGOING" ? "Đang diễn ra" : null)}</div><p>${A.value(b.branch_name)}</p><p><strong>PT: ${A.value(b.pt_name)}</strong></p><p class="muted">${A.value(b.member_name)} · ${A.value(b.package_name_snapshot || b.package_name)}</p>`;
    const actions = document.createElement("div");
    actions.className = "actions";
    card.append(actions);
    const now = new Date();
    const startTime = stamp(b);
    const endTime = stamp(b, true);
    const hasStarted = startTime <= now;
    const hasEnded = endTime <= now;

    if (status === "BOOKED" || status === "ONGOING") {
      // 1. Nút Hủy lịch: chỉ hiển thị khi chưa bắt đầu buổi tập
      if (!hasStarted && b.can_cancel !== false) {
        const cancel = A.button("Hủy lịch", "xmark", "danger");
        cancel.onclick = () => cancelBooking(b);
        actions.append(cancel);
      }

      // 2. Nút Xác nhận hoàn thành:
      // - Nếu chưa qua giờ kết thúc: nút chưa sáng (màu xám, disabled)
      // - Sau khi qua giờ kết thúc: nút sáng lên (màu xanh lá, clickable)
      const confirm = A.button("Xác nhận hoàn thành", hasEnded ? "circle-check" : "check", hasEnded ? "primary" : null);
      if (!hasEnded) {
        confirm.disabled = true;
        confirm.className = "button disabled";
        confirm.style.cssText = "background:#e5e7eb!important;color:#9ca3af!important;border:1px solid #d1d5db!important;cursor:not-allowed!important;opacity:0.75;";
        confirm.title = `Chỉ có thể xác nhận sau khi kết thúc buổi tập (${b.end_time.slice(0, 5)})`;
      } else {
        confirm.disabled = false;
        confirm.style.cssText = "background:#237b58!important;color:#ffffff!important;border:1px solid #185740!important;font-weight:600;";
        confirm.onclick = () => confirmBooking(b);
      }
      actions.append(confirm);
    } else if (status === "PENDING_COMPLETION") {
      if (b.member_confirmed_at) {
        actions.innerHTML =
          '<span class="badge amber" style="background:#fef3c7;color:#92400e;border:1px solid #f59e0b;padding:6px 12px;font-size:12px;border-radius:6px;font-weight:600;"><i class="fa-solid fa-hourglass-half"></i> Bạn đã xác nhận · Đang chờ PT xác nhận</span>';
      } else {
        actions.innerHTML =
          '<span class="badge amber" style="background:#fef3c7;color:#92400e;border:1px solid #f59e0b;padding:6px 10px;font-size:11px;border-radius:6px;margin-right:8px;font-weight:600;"><i class="fa-solid fa-bell"></i> PT đã xác nhận kết quả</span>';
        const confirmNow = A.button("Xác nhận hoàn thành ngay", "circle-check", "primary");
        confirmNow.style.cssText = "background:#237b58!important;color:#ffffff!important;border:1px solid #185740!important;font-weight:600;";
        confirmNow.onclick = () => confirmBooking(b);
        actions.append(confirmNow);
      }
    } else if (status === "COMPLETED") {
      actions.innerHTML =
        '<span class="badge green" style="background:#eaf5ed;color:#185740;border:1px solid #237b58;padding:6px 12px;font-size:12px;border-radius:6px;font-weight:600;"><i class="fa-solid fa-circle-check"></i> Đã hoàn tất xác nhận kép</span>';
    }
    return card;
  }
  async function schedule(root, sub, alive, context) {
    const active = ["book", "community"].includes(sub) ? sub : "mine";
    A.heading(root, "Lịch tập");
    A.segments(
      root,
      [
        ["mine", "Lịch của tôi"],
        ["book", "Đặt lịch PT"],
        ["community", "Lớp cộng đồng"],
      ],
      active,
      (id) => A.navigate("schedule", id),
    );
    const content = document.createElement("div");
    root.append(content);
    A.loading(content);
    if (active === "book") {
      await bookView(content, alive, context);
      return;
    }
    if (active === "community") {
      await communityView(content, alive);
      return;
    }
    const list = await A.request("/pt-bookings");
    if (!alive()) return;
    content.innerHTML =
      '<div class="schedule-layout"><div class="calendar-wrap"></div><div class="schedule-list"></div></div>';
    calendar(
      content.querySelector(".calendar-wrap"),
      S.day,
      (day) => {
        S.day = day;
        A.navigate("schedule", "mine");
      },
      true,
    );
    const pane = content.querySelector(".schedule-list");
    const scoped = list.filter((b) => !S.day || b.booking_date === S.day);
    A.filters(
      pane,
      [
        ["ALL", "Tất cả"],
        ["PENDING_COMPLETION", "Chờ xác nhận"],
        ["BOOKED", "Đã đặt"],
        ["COMPLETED", "Đã hoàn thành"],
        ["CANCELLED", "Đã hủy"],
      ].map(([id, label]) => [
        id,
        `${label} (${scoped.filter((b) => id === "ALL" || bookingState(b) === id).length})`,
      ]),
      S.filter,
      (id) => {
        S.filter = id;
        A.navigate("schedule", "mine");
      },
    );
    const records = document.createElement("div");
    records.className = "list";
    pane.append(records);
    const filtered = scoped
      .filter((b) => S.filter === "ALL" || bookingState(b) === S.filter)
      .sort((a, b) => stamp(b) - stamp(a));
    if (!filtered.length)
      A.empty(records, "Chưa có buổi tập trong ngày hoặc trạng thái này.");
    else filtered.forEach((b) => records.append(bookingCard(b)));
  }
  async function bookView(root, alive, context) {
    const [regs, bookings] = await Promise.all([
      A.request("/registrations"),
      A.request("/pt-bookings"),
    ]);
    if (!alive()) return;
    const usable = regs.filter(
      (r) =>
        r.is_paid &&
        r.assigned_pt_id &&
        r.total_pt_sessions_snapshot > 0 &&
        r.remaining_pt_sessions > 0 &&
        r.status === "ACTIVE" &&
        r.start_date <= A.today() &&
        (!r.end_date || r.end_date >= A.today()),
    );
    root.replaceChildren();
    if (!usable.length) {
      A.empty(root, "Bạn chưa có gói PT nào sẵn sàng để đặt lịch.");
      const go = A.button("Gói của tôi", "ticket", "primary");
      go.onclick = () => A.navigate("packages", "mine");
      root.append(go);
      return;
    }
    const field = document.createElement("div");
    field.className = "field";
    field.innerHTML =
      '<label>Chọn gói muốn sử dụng <span class="required">*</span></label><div></div>';
    root.append(field);
    if (context?.registration_id) S.registration = context.registration_id;
    const selected = usable.find((r) => r.id === S.registration);
    $(field.lastElementChild).dxSelectBox({
      dataSource: usable,
      valueExpr: "id",
      displayExpr: (r) =>
        r
          ? `${r.package_name_snapshot} · ${r.reg_code || "Chưa có mã đăng ký"}`
          : "",
      searchEnabled: true,
      value: selected?.id || null,
      placeholder: "Chọn gói PT/Combo",
      inputAttr: { "aria-label": "Chọn gói muốn sử dụng" },
      onValueChanged: (ev) => {
        S.registration = ev.value;
        A.navigate("schedule", "book");
      },
    });
    if (!selected) {
      const blank = document.createElement("div");
      root.append(blank);
      A.empty(blank, "Chọn gói muốn sử dụng.");
      return;
    }
    const duration = Number(selected.session_duration_minutes || selected.session_duration_minutes_snapshot) || 60;
    const slots = await A.request(
      `/pt-bookings/available-slots?${new URLSearchParams({ pt_id: selected.assigned_pt_id, date: S.bookingDay })}`,
    );
    if (!alive()) return;
    const trainer = slots.pt;

    const pad = (n) => String(n).padStart(2, "0");
    const formatDayVi = (dateStr) => {
      const d = new Date(`${dateStr}T12:00:00`);
      const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      return `${days[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };
    const shiftDate = (dateStr, delta) => {
      const d = new Date(`${dateStr}T12:00:00`);
      d.setDate(d.getDate() + delta);
      return dateKey(d);
    };

    const info = document.createElement("div");
    info.className = "profile-heading section";
    info.innerHTML = `${A.avatar(trainer.full_name, trainer.avatar_url)}<div><h3 style="margin:0 0 4px 0;">${A.value(trainer.full_name)}</h3><p class="muted" style="margin:0;font-size:13px;">${A.value(selected.sold_branch_name)} · Thời lượng: <strong>${duration} phút/buổi</strong></p></div>`;
    root.append(info);

    // Date Navigation Header
    const dateBar = document.createElement("div");
    dateBar.className = "date-nav-bar";
    dateBar.innerHTML = `
      <button type="button" class="date-nav-btn" id="btnPrevDay" title="Ngày trước"><i class="fa-solid fa-chevron-left"></i></button>
      <div class="date-nav-title"><i class="fa-regular fa-calendar-days"></i> <span>${formatDayVi(S.bookingDay)}</span></div>
      <button type="button" class="date-nav-btn" id="btnNextDay" title="Ngày sau"><i class="fa-solid fa-chevron-right"></i></button>
      <button type="button" class="date-nav-btn" id="btnToggleMonth" title="Mở lịch tháng"><i class="fa-solid fa-calendar"></i> Lịch tháng</button>
    `;
    root.append(dateBar);

    const monthCalendarWrap = document.createElement("div");
    monthCalendarWrap.style.display = "none";
    monthCalendarWrap.style.marginBottom = "14px";
    root.append(monthCalendarWrap);

    calendar(monthCalendarWrap, S.bookingDay, (day) => {
      if (day) {
        S.bookingDay = day;
        A.navigate("schedule", "book");
      }
    });

    dateBar.querySelector("#btnPrevDay").onclick = () => {
      S.bookingDay = shiftDate(S.bookingDay, -1);
      A.navigate("schedule", "book");
    };
    dateBar.querySelector("#btnNextDay").onclick = () => {
      S.bookingDay = shiftDate(S.bookingDay, 1);
      A.navigate("schedule", "book");
    };
    dateBar.querySelector("#btnToggleMonth").onclick = () => {
      const isHidden = monthCalendarWrap.style.display === "none";
      monthCalendarWrap.style.display = isHidden ? "block" : "none";
    };

    const isPastDay = S.bookingDay < A.today();
    const isToday = S.bookingDay === A.today();

    if (isPastDay) {
      const pastNotice = document.createElement("div");
      pastNotice.className = "past-day-banner";
      pastNotice.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i><span>Lịch sử ngày đã qua — Chỉ xem danh sách các buổi tập đã diễn ra trong ngày.</span>';
      root.append(pastNotice);
    }

    // Timeline Scheduler Container
    const scheduler = document.createElement("div");
    scheduler.className = "timeline-scheduler";
    scheduler.innerHTML = `
      <div class="timeline-header">
        <span>Lịch biểu trong ngày (06:00 - 22:00)</span>
        <div class="badge-guide">
          ${!isPastDay ? '<span class="guide-item"><span class="guide-dot green"></span> Đang chọn</span>' : ''}
          <span class="guide-item"><span class="guide-dot gray"></span> Lịch học viên khác</span>
          <span class="guide-item"><span class="guide-dot blue"></span> Buổi tập của bạn</span>
        </div>
      </div>
      <div class="timeline-scroll">
        <div class="timeline-body">
          <div class="timeline-time-col"></div>
          <div class="timeline-grid-col"></div>
        </div>
      </div>
    `;
    root.append(scheduler);

    const timeCol = scheduler.querySelector(".timeline-time-col");
    const gridCol = scheduler.querySelector(".timeline-grid-col");
    const scrollContainer = scheduler.querySelector(".timeline-scroll");

    // Populate 32 30-min intervals (06:00 to 22:00, 16 hours)
    for (let i = 0; i < 32; i++) {
      const totalMinutes = 360 + i * 30;
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      const timeStr = `${pad(h)}:${pad(m)}`;

      const timeCell = document.createElement("div");
      timeCell.className = "timeline-time-cell";
      timeCell.textContent = timeStr;
      timeCol.append(timeCell);

      const gridCell = document.createElement("div");
      gridCell.className = "timeline-grid-cell";
      gridCell.dataset.minute = String(i * 30);
      gridCol.append(gridCell);
    }

    // Existing Bookings of this Member on this date
    const ownBookings = bookings.filter(
      (b) => b.booking_date === S.bookingDay && (isPastDay || b.status !== "CANCELLED"),
    );

    // Existing Busy bookings of PT (Lịch học viên khác đã đặt)
    const rawBusySlots = slots.busy_slots || [];
    const busySlots = rawBusySlots.filter((b) => {
      return !ownBookings.some((own) => {
        if (own.status === "CANCELLED") return false;
        const oS = (own.start_time || "").slice(0, 5);
        const oE = (own.end_time || "").slice(0, 5);
        return !(b.end_time <= oS || b.start_time >= oE);
      });
    });

    for (const b of busySlots) {
      const [bSh, bSm] = (b.start_time || "").split(":").map(Number);
      const [bEh, bEm] = (b.end_time || "").split(":").map(Number);
      if (isNaN(bSh) || isNaN(bEh)) continue;
      const bStartMin = Math.max(0, bSh * 60 + bSm - 360);
      const bEndMin = Math.min(960, bEh * 60 + bEm - 360);
      if (bEndMin <= bStartMin) continue;

      const busyCard = document.createElement("div");
      busyCard.className = "timeline-busy-card";
      busyCard.style.top = `${bStartMin * 1.6}px`;
      busyCard.style.height = `${Math.max(34, (bEndMin - bStartMin) * 1.6)}px`;
      busyCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">
          <strong style="color:#991b1b;font-size:11px;"><i class="fa-solid fa-user-clock"></i> Học viên khác đã đặt</strong>
          <span style="background:#ef4444;color:#ffffff;font-size:9px;padding:1px 6px;border-radius:3px;font-weight:600;letter-spacing:0.2px;">Đã kín</span>
        </div>
        <span style="font-size:11px;color:#b91c1c;margin-top:2px;"><strong>${b.start_time} - ${b.end_time}</strong> (HLV bận)</span>
      `;
      gridCol.append(busyCard);
    }

    // Render Own Bookings with US Status Colors
    for (const own of ownBookings) {
      const [oSh, oSm] = (own.start_time || "").slice(0, 5).split(":").map(Number);
      const [oEh, oEm] = (own.end_time || "").slice(0, 5).split(":").map(Number);
      if (isNaN(oSh) || isNaN(oEh)) continue;
      const oStartMin = Math.max(0, oSh * 60 + oSm - 360);
      const oEndMin = Math.min(960, oEh * 60 + oEm - 360);
      if (oEndMin <= oStartMin) continue;

      const st = bookingState(own);
      let stColor = "#0284c7";
      let stBg = "#e0f2fe";
      let stBorder = "#0284c7";
      let stText = "Đã đặt";
      let stIcon = "fa-calendar-check";

      if (st === "COMPLETED") {
        stColor = "#185740";
        stBg = "#eaf5ed";
        stBorder = "#237b58";
        stText = "Đã hoàn thành";
        stIcon = "fa-circle-check";
      } else if (st === "PENDING_COMPLETION") {
        stColor = "#92400e";
        stBg = "#fef3c7";
        stBorder = "#f59e0b";
        stText = "Chờ xác nhận";
        stIcon = "fa-hourglass-half";
      } else if (st === "ONGOING") {
        stColor = "#1e40af";
        stBg = "#eff6ff";
        stBorder = "#3b82f6";
        stText = "Đang diễn ra";
        stIcon = "fa-person-running";
      } else if (st === "CANCELLED") {
        stColor = "#991b1b";
        stBg = "#fef2f2";
        stBorder = "#ef4444";
        stText = "Đã hủy";
        stIcon = "fa-ban";
      }

      const ownCard = document.createElement("div");
      ownCard.className = `timeline-own-card status-${st.toLowerCase()}`;
      ownCard.style.top = `${oStartMin * 1.6}px`;
      ownCard.style.height = `${Math.max(34, (oEndMin - oStartMin) * 1.6)}px`;
      ownCard.style.background = stBg;
      ownCard.style.borderColor = stBorder;
      ownCard.style.color = stColor;
      const now = new Date();
      const startTime = stamp(own);
      const endTime = stamp(own, true);
      const hasStarted = startTime <= now;
      const hasEnded = endTime <= now;

      let actionsHtml = "";
      if (st === "BOOKED" || st === "ONGOING") {
        const cancelBtnHtml = (!hasStarted && own.can_cancel !== false)
          ? `<button type="button" class="own-btn-action own-btn-cancel" id="btnTimelineCancel" title="Hủy lịch tập"><i class="fa-solid fa-xmark"></i> Hủy</button>`
          : `<button type="button" class="own-btn-action own-btn-cancel disabled" disabled title="Không thể hủy buổi tập đã bắt đầu/kết thúc"><i class="fa-solid fa-xmark"></i> Hủy</button>`;

        const confirmBtnHtml = hasEnded
          ? `<button type="button" class="own-btn-action own-btn-confirm-active" id="btnTimelineConfirm" title="Xác nhận hoàn thành kết quả buổi tập"><i class="fa-solid fa-circle-check"></i> Xác nhận hoàn thành</button>`
          : `<button type="button" class="own-btn-action own-btn-confirm-disabled" disabled title="Chỉ có thể xác nhận sau khi kết thúc buổi tập (${own.end_time.slice(0, 5)})"><i class="fa-solid fa-check"></i> Xác nhận hoàn thành</button>`;

        actionsHtml = `<div class="own-card-actions">${cancelBtnHtml}${confirmBtnHtml}</div>`;
      } else if (st === "PENDING_COMPLETION") {
        if (own.member_confirmed_at) {
          actionsHtml = `<div class="own-card-actions"><span class="badge amber" style="background:#f59e0b;color:#fff;font-size:10px;padding:3px 8px;border-radius:4px;font-weight:600;"><i class="fa-solid fa-hourglass-half"></i> Bạn đã xác nhận · Đang chờ PT</span></div>`;
        } else {
          actionsHtml = `<div class="own-card-actions">
            <span class="badge amber" style="background:#f59e0b;color:#fff;font-size:10px;padding:3px 6px;border-radius:4px;"><i class="fa-solid fa-bell"></i> PT đã xác nhận</span>
            <button type="button" class="own-btn-action own-btn-confirm-active" id="btnTimelineConfirm" title="Xác nhận hoàn thành buổi tập"><i class="fa-solid fa-circle-check"></i> Xác nhận ngay</button>
          </div>`;
        }
      } else if (st === "COMPLETED") {
        actionsHtml = `<div class="own-card-actions"><span class="badge green" style="background:#237b58;color:#fff;font-size:10px;padding:3px 8px;border-radius:4px;font-weight:600;"><i class="fa-solid fa-circle-check"></i> Đã hoàn tất xác nhận kép</span></div>`;
      }

      ownCard.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">
          <strong style="color:${stColor};font-size:11px;"><i class="fa-solid ${st === 'CANCELLED' ? 'fa-calendar-xmark' : 'fa-user-check'}"></i> Buổi tập của bạn</strong>
          <span class="badge" style="background:${stBorder};color:#fff;font-size:9px;padding:1px 6px;border-radius:4px;font-weight:600;"><i class="fa-solid ${stIcon}"></i> ${stText}</span>
        </div>
        <div style="font-size:11px;margin-top:2px;">
          <strong>${own.start_time.slice(0, 5)} - ${own.end_time.slice(0, 5)}</strong> · ${A.value(own.package_name_snapshot || own.package_name)}
        </div>
        ${actionsHtml}
      `;

      const btnTimelineCancel = ownCard.querySelector("#btnTimelineCancel");
      if (btnTimelineCancel) {
        btnTimelineCancel.onclick = (e) => {
          e.stopPropagation();
          cancelBooking(own);
        };
      }
      const btnTimelineConfirm = ownCard.querySelector("#btnTimelineConfirm");
      if (btnTimelineConfirm) {
        btnTimelineConfirm.onclick = (e) => {
          e.stopPropagation();
          confirmBooking(own);
        };
      }

      ownCard.style.cursor = "pointer";
      ownCard.title = "Bấm để xem chi tiết hoặc xác nhận buổi tập";
      ownCard.onclick = () => {
        if ((st === "BOOKED" && hasEnded) || (st === "PENDING_COMPLETION" && !own.member_confirmed_at)) {
          confirmBooking(own);
        } else {
          S.day = own.booking_date;
          S.filter = st;
          A.navigate("schedule", "mine");
        }
      };
      gridCol.append(ownCard);
    }

    if (isPastDay) {
      if (ownBookings.length === 0 && busySlots.length === 0) {
        const emptyNote = document.createElement("div");
        emptyNote.style.cssText = "position:absolute;top:80px;left:16px;right:16px;text-align:center;padding:24px 16px;background:#f8faf9;border:1px dashed #cbd6cf;border-radius:8px;color:#748078;font-size:13px;z-index:3;";
        emptyNote.innerHTML = `<i class="fa-regular fa-calendar-xmark" style="font-size:28px;display:block;margin-bottom:8px;color:#a0aba5;"></i>Không có buổi tập nào diễn ra trong ngày ${formatDayVi(S.bookingDay)}.`;
        gridCol.append(emptyNote);
      }
      let scrollTargetMin = 120;
      if (ownBookings.length > 0) {
        const firstOwn = ownBookings[0];
        const [sh, sm] = (firstOwn.start_time || "").slice(0, 5).split(":").map(Number);
        if (!isNaN(sh)) scrollTargetMin = Math.max(0, sh * 60 + sm - 360);
      } else if (busySlots.length > 0) {
        const firstBusy = busySlots[0];
        const [sh, sm] = (firstBusy.start_time || "").split(":").map(Number);
        if (!isNaN(sh)) scrollTargetMin = Math.max(0, sh * 60 + sm - 360);
      }
      setTimeout(() => {
        scrollContainer.scrollTop = Math.max(0, scrollTargetMin * 1.6 - 70);
      }, 100);
    } else {
      // Interactive Draft Card & Booking Bar for Today and Future Days
      const cardHeight = Math.max(38, Math.round(duration * 1.6));
      let currentMinOffset = 120; // Default 08:00 (120 mins from 06:00)

      let startSearchMin = 120; // 08:00
      if (isToday) {
        const now = new Date();
        const nowMinutesFrom6 = now.getHours() * 60 + now.getMinutes() - 360;
        startSearchMin = Math.max(0, Math.ceil((nowMinutesFrom6 + 15) / 15) * 15);
      }

      let foundAvailable = false;
      for (let testMin = startSearchMin; testMin <= 960 - duration; testMin += 15) {
        const absS = 360 + testMin;
        const absE = absS + duration;
        const sH = Math.floor(absS / 60), sM = absS % 60;
        const eH = Math.floor(absE / 60), eM = absE % 60;
        const sStr = `${pad(sH)}:${pad(sM)}`;
        const eStr = `${pad(eH)}:${pad(eM)}`;
        const hitBusy = busySlots.some((x) => x.start_time < eStr && x.end_time > sStr);
        const hitOwn = ownBookings.some((x) => x.status !== "CANCELLED" && x.start_time.slice(0, 5) < eStr && x.end_time.slice(0, 5) > sStr);
        if (!hitBusy && !hitOwn) {
          currentMinOffset = testMin;
          foundAvailable = true;
          break;
        }
      }

      if (!foundAvailable && isToday && startSearchMin > 960 - duration) {
        currentMinOffset = Math.min(startSearchMin, 960 - duration);
      }

      const draftCard = document.createElement("div");
      draftCard.className = `timeline-draft-card${duration <= 45 ? " compact" : ""}`;
      draftCard.style.top = `${currentMinOffset * 1.6}px`;
      draftCard.style.height = `${cardHeight}px`;
      draftCard.innerHTML = `
        <div class="draft-card-header">
          <div class="draft-time-badge" id="draftTimeText">--:-- - --:--</div>
          <div class="draft-duration-tag">${duration} phút</div>
        </div>
        <div class="draft-drag-handle">
          <span id="draftStatusBadge"><i class="fa-solid fa-circle-check"></i> Khung giờ hợp lệ</span>
          <span style="display:flex;align-items:center;gap:3px;"><i class="fa-solid fa-arrows-up-down"></i> Kéo đổi giờ</span>
        </div>
        <div class="draft-fine-tune">
          <button type="button" class="draft-btn-tune" id="btnMinus15" title="Lùi 15 phút"><i class="fa-solid fa-minus"></i> 15p</button>
          <button type="button" class="draft-btn-tune" id="btnPlus15" title="Tăng 15 phút"><i class="fa-solid fa-plus"></i> 15p</button>
          <span style="font-size:10px;opacity:0.85;margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">${A.value(selected.package_name_snapshot)}</span>
        </div>
      `;
      gridCol.append(draftCard);

      // Floating Action Bar at Bottom
      const floatingBar = document.createElement("div");
      floatingBar.className = "floating-booking-bar";
      floatingBar.innerHTML = `
        <div class="floating-booking-summary">
          <strong id="barTimeText">--:-- - --:--</strong>
          <small id="barDateText">${A.date(S.bookingDay)} · ${duration} phút</small>
          <small id="barStatusText" style="color:#237b58;font-weight:600;"><i class="fa-solid fa-circle-check"></i> Khả dụng</small>
        </div>
        <div id="barActionWrap"></div>
      `;
      root.append(floatingBar);

      const confirmBtn = A.button("Xác nhận đặt lịch", "check", "primary");
      floatingBar.querySelector("#barActionWrap").append(confirmBtn);

      let isCurrentValid = true;
      let selectedStartStr = "08:00";
      let selectedEndStr = "09:00";

      function updateDraftState(offsetMin) {
        currentMinOffset = Math.max(0, Math.min(offsetMin, 960 - duration));
        const absStartMin = 360 + currentMinOffset;
        const absEndMin = absStartMin + duration;

        const sh = Math.floor(absStartMin / 60), sm = absStartMin % 60;
        const eh = Math.floor(absEndMin / 60), em = absEndMin % 60;
        selectedStartStr = `${pad(sh)}:${pad(sm)}`;
        selectedEndStr = `${pad(eh)}:${pad(em)}`;

        draftCard.style.top = `${currentMinOffset * 1.6}px`;

        // Realtime Validation Checks
        const isPast = new Date(`${S.bookingDay}T${selectedStartStr}:00+07:00`) <= new Date();
        const isBusy = busySlots.some((b) => b.start_time < selectedEndStr && b.end_time > selectedStartStr);
        const isOwnBusy = ownBookings.some((b) => b.status !== "CANCELLED" && b.start_time.slice(0, 5) < selectedEndStr && b.end_time.slice(0, 5) > selectedStartStr);
        const validDate = S.bookingDay >= selected.start_date && (!selected.end_date || S.bookingDay <= selected.end_date);
        const isWithinHours = absEndMin <= 1320;

        isCurrentValid = !isPast && !isBusy && !isOwnBusy && validDate && isWithinHours;

        let msg = "Khung giờ hợp lệ";
        let icon = "fa-circle-check";
        if (isPast) {
          msg = "Giờ trong quá khứ";
          icon = "fa-circle-exclamation";
        } else if (isBusy) {
          msg = "Trùng lịch học viên khác";
          icon = "fa-user-clock";
        } else if (isOwnBusy) {
          msg = "Trùng lịch của bạn";
          icon = "fa-triangle-exclamation";
        } else if (!validDate) {
          msg = "Ngoài thời hạn gói";
          icon = "fa-clock";
        } else if (!isWithinHours) {
          msg = "Quá giờ đóng cửa (22:00)";
          icon = "fa-door-closed";
        }

        // Update Draft Card Elements
        draftCard.classList.toggle("colliding", !isCurrentValid);
        draftCard.querySelector("#draftTimeText").textContent = `${selectedStartStr} - ${selectedEndStr}`;
        draftCard.querySelector("#draftStatusBadge").innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;

        // Update Floating Bottom Bar
        floatingBar.querySelector("#barTimeText").textContent = `${selectedStartStr} - ${selectedEndStr}`;
        floatingBar.querySelector("#barDateText").textContent = `${A.date(S.bookingDay)} · ${duration} phút`;
        const barStatusEl = floatingBar.querySelector("#barStatusText");
        if (isCurrentValid) {
          barStatusEl.style.color = "#237b58";
          barStatusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Khung giờ khả dụng';
          confirmBtn.disabled = false;
        } else {
          barStatusEl.style.color = "#c43d40";
          barStatusEl.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
          confirmBtn.disabled = true;
        }
      }

      // Initial state trigger
      updateDraftState(currentMinOffset);

      // Auto-scroll to view the draft card
      setTimeout(() => {
        scrollContainer.scrollTop = Math.max(0, currentMinOffset * 1.6 - 70);
      }, 100);

      // Fine-tune buttons event handlers
      draftCard.querySelector("#btnMinus15").onclick = (e) => {
        e.stopPropagation();
        updateDraftState(currentMinOffset - 15);
      };
      draftCard.querySelector("#btnPlus15").onclick = (e) => {
        e.stopPropagation();
        updateDraftState(currentMinOffset + 15);
      };

      // Drag & Drop / Touch Move Interaction
      let isDragging = false;
      let dragStartY = 0;
      let initialTop = 0;

      const onDragStart = (clientY) => {
        isDragging = true;
        dragStartY = clientY;
        initialTop = currentMinOffset * 1.6;
        draftCard.classList.add("dragging");
      };

      const onDragMove = (clientY) => {
        if (!isDragging) return;
        const deltaY = clientY - dragStartY;
        const newTop = initialTop + deltaY;
        const rawOffsetMin = newTop / 1.6;
        const snappedMin = Math.round(rawOffsetMin / 15) * 15;
        updateDraftState(snappedMin);
      };

      const onDragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        draftCard.classList.remove("dragging");
      };

      // Mouse Events on Draft Card
      draftCard.addEventListener("mousedown", (e) => {
        if (e.target.closest(".draft-btn-tune")) return;
        e.preventDefault();
        onDragStart(e.clientY);

        const onMouseMove = (ev) => onDragMove(ev.clientY);
        const onMouseUp = () => {
          onDragEnd();
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      });

      // Touch Events on Draft Card
      draftCard.addEventListener("touchstart", (e) => {
        if (e.target.closest(".draft-btn-tune")) return;
        if (e.touches.length === 1) {
          onDragStart(e.touches[0].clientY);
        }
      }, { passive: true });

      draftCard.addEventListener("touchmove", (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        e.preventDefault();
        onDragMove(e.touches[0].clientY);
      }, { passive: false });

      draftCard.addEventListener("touchend", onDragEnd);
      draftCard.addEventListener("touchcancel", onDragEnd);

      // Click on Timeline Grid to Move Card Directly
      gridCol.addEventListener("click", (e) => {
        if (e.target.closest(".timeline-draft-card") || e.target.closest(".timeline-busy-card") || e.target.closest(".timeline-own-card")) {
          return;
        }
        const rect = gridCol.getBoundingClientRect();
        const clickY = e.clientY - rect.top;
        const rawMin = clickY / 1.6;
        const snappedMin = Math.round(rawMin / 15) * 15;
        updateDraftState(snappedMin);
      });

      // Confirm Booking Action
      confirmBtn.onclick = () =>
        A.mutate(confirmBtn, async () => {
          if (!isCurrentValid) {
            A.toast("Khung giờ không hợp lệ. Vui lòng chọn khung giờ khác.");
            return;
          }
          await A.request("/pt-bookings", {
            method: "POST",
            body: {
              registration_id: selected.id,
              pt_id: trainer.id,
              booking_date: S.bookingDay,
              start_time: selectedStartStr,
              end_time: selectedEndStr,
              session_duration_minutes: duration,
              branch_id: trainer.branch_id,
            },
          });
          A.toast(`Đã đặt lịch tập PT thành công (${selectedStartStr} - ${selectedEndStr})!`);
          S.day = S.bookingDay;
          S.filter = "BOOKED";
          await A.navigate("schedule", "mine");
        });
    }
  }
  function cancelBooking(b) {
    A.dialog("Xác nhận hủy lịch", (root, close) => {
      let late = (stamp(b) - new Date()) / 3600000 < 4;
      root.innerHTML =
        A.summary([
          [
            "Buổi tập",
            `${b.booking_code || "Chưa có mã lịch"} · ${b.start_time.slice(0, 5)} ${A.date(b.booking_date)} · ${b.pt_name}`,
          ],
          ["Gói tập", b.package_name_snapshot || b.package_name],
        ]) +
        `<div class="notice ${late ? "error" : "success"}"><strong>${late ? "Hủy sát giờ (< 4 tiếng): Khấu trừ 1 buổi tập" : "Hủy trước 4 tiếng: Bảo lưu buổi tập"}</strong><p>${late ? "Quá hạn quy định: Bạn sẽ bị trừ 1 buổi tập trong gói." : "Trong hạn: Giữ nguyên số buổi tập."}</p></div>`;
      const form = document.createElement("form");
      root.append(form);
      form.innerHTML =
        '<div class="field"><label for="cancelReason">Lý do hủy <span class="required">*</span></label><select id="cancelReason" required><option value="">Chọn lý do</option><option>Bận công việc đột xuất</option><option>Lý do sức khỏe</option><option>Trùng lịch hẹn khác</option><option>Thay đổi kế hoạch cá nhân</option><option>Khác</option></select></div><div class="field" id="cancelOther" hidden><label for="cancelDetail">Lý do chi tiết <span class="required">*</span></label><textarea id="cancelDetail" maxlength="150"></textarea></div>';
      const reason = form.querySelector("select"),
        other = form.querySelector("textarea"),
        group = form.querySelector("#cancelOther");
      reason.onchange = () => {
        group.hidden = reason.value !== "Khác";
        other.required = !group.hidden;
      };
      const errors = document.createElement("div");
      form.append(errors);
      const row = document.createElement("div");
      row.className = "actions";
      form.append(row);
      const no = A.button("Bỏ qua");
      no.onclick = close;
      const yes = A.button("Xác nhận hủy", "calendar-xmark", "danger");
      yes.type = "submit";
      row.append(no, yes);
      form.onsubmit = (ev) => {
        ev.preventDefault();
        if (!form.reportValidity()) return;
        A.mutate(yes, async () => {
          try {
            const finalReason =
              reason.value === "Khác" ? other.value.trim() : reason.value;
            if (!finalReason) throw new Error("Vui lòng nhập lý do chi tiết.");
            await A.request(`/pt-bookings/${b.id}/cancel`, {
              method: "POST",
              body: { reason: finalReason, accept_late_fee: late },
            });
            close();
            A.toast("Đã hủy lịch PT.");
            await A.navigate("schedule", A.sub);
          } catch (error) {
            if (error.data?.code === "LATE_CANCELLATION_CONFIRMATION_REQUIRED") {
              late = true;
              error.message = "Buổi tập đã vào mốc hủy muộn. Hủy lúc này sẽ khấu trừ 1 buổi. Bấm Xác nhận hủy lần nữa nếu bạn đồng ý.";
            }
            A.error(errors, error);
          }
        });
      };
    });
  }
  function confirmBooking(b) {
    A.dialog("Xác nhận hoàn thành", (root, close) => {
      root.innerHTML = `
        <p style="margin-bottom:8px;">Buổi tập với PT <strong>${A.value(b.pt_name)}</strong> lúc <strong>${e(b.start_time.slice(0, 5))} - ${e(b.end_time.slice(0, 5))}</strong>, ${A.date(b.booking_date)}.</p>
        <div class="notice ${b.pt_confirmed_at ? "success" : "info"}" style="margin-bottom:12px;padding:8px 12px;border-radius:6px;background:${b.pt_confirmed_at ? "#eaf5ed" : "#fef3c7"};color:${b.pt_confirmed_at ? "#185740" : "#92400e"};border:1px solid ${b.pt_confirmed_at ? "#237b58" : "#f59e0b"};">
          <i class="fa-solid ${b.pt_confirmed_at ? "fa-circle-check" : "fa-hourglass-half"}"></i>
          <strong>${b.pt_confirmed_at ? "PT đã xác nhận hoàn thành kết quả" : "Đang chờ PT xác nhận kết quả"}</strong>
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">
          Hệ thống sẽ trừ chính xác 1 buổi trong gói tập của bạn sau khi cả bạn và PT cùng hoàn tất xác nhận kép.
        </p>
      `;
      const errors = document.createElement("div");
      root.append(errors);
      const yes = A.button("Xác nhận hoàn thành", "circle-check", "primary");
      yes.style.cssText = "background:#237b58!important;color:#fff!important;border:1px solid #185740!important;font-weight:600;";
      root.append(yes);
      yes.onclick = () =>
        A.mutate(yes, async () => {
          try {
            const res = await A.request(`/pt-bookings/${b.id}/member-confirm`, {
              method: "POST",
            });
            close();
            if (res?.is_completed) {
              A.toast("Buổi tập đã hoàn thành! Cả bạn và PT đều đã xác nhận.");
            } else {
              A.toast("Đã ghi nhận xác nhận của bạn! Buổi tập chuyển sang Chờ PT xác nhận.");
            }
            await A.navigate("schedule", A.sub);
          } catch (error) {
            A.error(errors, error);
          }
        });
    });
  }

  async function communityView(root, alive) {
    const classes = await A.request(`/community-classes?date=${A.today()}`);
    if (!alive()) return;
    root.replaceChildren();
    const title = document.createElement("h2");
    title.textContent = `Lớp tập cộng đồng (${classes.length})`;
    root.append(title);

    if (!classes.length) {
      A.empty(root, "Hôm nay chưa có lịch lớp tập cộng đồng nào.");
      return;
    }

    const list = document.createElement("div");
    list.className = "list";
    root.append(list);

    classes.forEach(c => {
      const card = document.createElement("article");
      card.className = "record";
      const isFull = c.enrolled_slots >= c.max_slots;
      const isRegistered = c.is_registered === true;

      card.innerHTML = `
        <div class="row">
          <h3>${A.value(c.title)}</h3>
          ${isRegistered ? '<span class="badge success">Đã đăng ký</span>' : (isFull ? '<span class="badge danger">Đã đủ chỗ</span>' : '<span class="badge info">Đang mở</span>')}
        </div>
        <p class="muted">${e(c.start_time.slice(0, 5))} - ${e(c.end_time.slice(0, 5))} · HLV: <strong>${A.value(c.instructor_name)}</strong></p>
        <p>${A.value(c.branch_name)}</p>
        <p>Số lượng: <strong>${c.enrolled_slots}/${c.max_slots} chỗ</strong></p>
        <div class="progress ${isFull ? 'danger' : ''}"><span style="width:${Math.min(100, Math.round((c.enrolled_slots / c.max_slots) * 100))}%"></span></div>
        ${c.description ? `<p class="muted" style="font-size:12px;margin-top:6px;">${A.value(c.description)}</p>` : ''}
      `;

      const actions = document.createElement("div");
      actions.className = "actions";
      card.append(actions);

      if (isRegistered) {
        const cancelBtn = A.button("Hủy đăng ký", "xmark", "danger");
        cancelBtn.onclick = async () => {
          try {
            await A.request(`/community-classes/${c.id}/cancel`, { method: "POST" });
            A.toast("Đã hủy tham gia lớp học thành công");
            await A.navigate("schedule", "community");
          } catch (err) { A.toast(err.message); }
        };
        actions.append(cancelBtn);
      } else if (!isFull) {
        const joinBtn = A.button("Đăng ký tham gia", "check", "primary");
        joinBtn.onclick = async () => {
          try {
            await A.request(`/community-classes/${c.id}/register`, { method: "POST" });
            A.toast("Đăng ký tham gia lớp thành công!");
            await A.navigate("schedule", "community");
          } catch (err) { A.toast(err.message); }
        };
        actions.append(joinBtn);
      }
      list.append(card);
    });
  }

  A.modules.home = { render: home };
  A.modules.schedule = { render: schedule };
})();
