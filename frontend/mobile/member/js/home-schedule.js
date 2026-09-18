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
    if (["COMPLETED", "DONE"].includes(b.status)) return "COMPLETED";
    if (b.status === "CANCELLED") return "CANCELLED";
    if (stamp(b, true) <= new Date()) return "PENDING_COMPLETION";
    if (stamp(b) <= new Date()) return "ONGOING";
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
    const [profile, requests, bookings] = await Promise.all([
      A.request(`/members/${A.user.member_profile_id}`),
      A.request("/pt-bookings/assignment-requests"),
      A.request("/pt-bookings"),
    ]);
    if (!alive()) return;
    A.profile = profile;
    root.innerHTML = `<section class="welcome"><p class="muted">Xin chào, ${A.value(profile.full_name)}</p><h1>Hôm nay bạn muốn làm gì?</h1></section>`;
    const pending = requests.filter((x) => x.status === "PENDING");
    const tasks = document.createElement("section");
    tasks.className = `home-band ${pending.length ? "pending" : ""}`;
    tasks.innerHTML = `<div class="band-icon">${A.icon(pending.length ? "clock" : "circle-check")}</div><h2>${pending.length ? "Yêu cầu PT đang chờ phản hồi" : "Không có việc cần xử lý"}</h2>${pending.map((x) => `<p>${A.value(x.pt_name)} đang xem yêu cầu chọn PT của bạn.</p>`).join("")}`;
    root.append(tasks);
    if (pending.length) {
      const b = A.button("Xem yêu cầu PT", "arrow-right");
      b.onclick = () => A.navigate("packages", "requests");
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
    card.className = "record";
    card.dataset.bookingId = b.id;
    card.innerHTML = `<div class="row"><h3>${A.date(b.booking_date)} · ${e(b.start_time.slice(0, 5))} - ${e(b.end_time.slice(0, 5))}</h3>${A.badge(status, status === "ONGOING" ? "Đang diễn ra" : null)}</div><p>${A.value(b.branch_name)}</p><p><strong>PT: ${A.value(b.pt_name)}</strong></p><p class="muted">${A.value(b.member_name)} · ${A.value(b.package_name_snapshot || b.package_name)}</p>`;
    const actions = document.createElement("div");
    actions.className = "actions";
    card.append(actions);
    if (status === "BOOKED") {
      const cancel = A.button("Hủy lịch", "calendar-xmark");
      cancel.onclick = () => cancelBooking(b);
      actions.append(cancel);
    }
    if (status === "PENDING_COMPLETION") {
      if (b.member_confirmed_at)
        actions.innerHTML =
          '<span class="badge amber">Bạn đã xác nhận · Đang chờ PT</span>';
      else {
        const confirm = A.button("Xác nhận hoàn thành", "check", "primary");
        confirm.onclick = () => confirmBooking(b);
        actions.append(confirm);
      }
    }
    return card;
  }
  async function schedule(root, sub, alive, context) {
    const active = sub === "book" ? "book" : "mine";
    A.heading(root, "Lịch tập");
    A.segments(
      root,
      [
        ["mine", "Lịch của tôi"],
        ["book", "Đặt lịch PT"],
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
    const slots = await A.request(
      `/pt-bookings/available-slots?${new URLSearchParams({ pt_id: selected.assigned_pt_id, date: S.bookingDay })}`,
    );
    if (!alive()) return;
    const trainer = slots.pt;
    const info = document.createElement("div");
    info.className = "profile-heading section";
    info.innerHTML = `${A.avatar(trainer.full_name, trainer.avatar_url)}<div><h3>${A.value(trainer.full_name)}</h3><p class="muted">${A.value(selected.sold_branch_name)} · Mỗi buổi 2 giờ</p></div>`;
    root.append(info);
    calendar(root, S.bookingDay, (day) => {
      if (day) {
        S.bookingDay = day;
        A.navigate("schedule", "book");
      }
    });
    const grid = A.section(root, `Khung giờ · ${A.date(S.bookingDay)}`);
    const list = document.createElement("div");
    list.className = "list";
    grid.append(list);
    for (const slot of slots.slots) {
      const own = bookings.find(
        (b) =>
          b.pt_id === trainer.id &&
          b.booking_date === S.bookingDay &&
          b.start_time.slice(0, 5) === slot.start_time.slice(0, 5) &&
          b.status !== "CANCELLED",
      );
      if (own) {
        list.append(bookingCard(own));
        continue;
      }
      const validDate =
        S.bookingDay >= selected.start_date &&
        (!selected.end_date || S.bookingDay <= selected.end_date);
      const available = slot.is_available && validDate;
      const card = document.createElement("div");
      card.className = `slot ${available ? "" : "unavailable"}`;
      card.innerHTML = `<div><strong>${e(slot.start_time.slice(0, 5))} - ${e(slot.end_time.slice(0, 5))}</strong><p><small>${available ? "Khung giờ trống · Chọn để đặt" : !validDate ? "Ngoài thời hạn gói" : "Đã bận hoặc không khả dụng"}</small></p></div>`;
      list.append(card);
      if (available) {
        const add = A.button("", "plus");
        add.className = "icon-button";
        add.title = "Đặt lịch";
        add.setAttribute("aria-label", `Đặt lịch ${slot.start_time}`);
        card.append(add);
        add.onclick = () =>
          A.mutate(add, async () => {
            await A.request("/pt-bookings", {
              method: "POST",
              body: {
                registration_id: selected.id,
                pt_id: trainer.id,
                booking_date: S.bookingDay,
                start_time: slot.start_time,
                end_time: slot.end_time,
                branch_id: trainer.branch_id,
              },
            });
            A.toast("Đã đặt lịch PT.");
            S.day = S.bookingDay;
            S.filter = "BOOKED";
            await A.navigate("schedule", "mine");
          });
      }
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
      root.innerHTML = `<p>Buổi tập với PT ${A.value(b.pt_name)} lúc ${e(b.start_time.slice(0, 5))} - ${e(b.end_time.slice(0, 5))}, ${A.date(b.booking_date)}.</p><div class="notice">${b.pt_confirmed_at ? "PT đã xác nhận hoàn thành" : "Đang chờ PT xác nhận"}</div><p>Hệ thống sẽ trừ chính xác 1 buổi trong gói tập của bạn sau khi cả bạn và PT cùng hoàn tất xác nhận.</p>`;
      const errors = document.createElement("div");
      root.append(errors);
      const yes = A.button("Xác nhận hoàn thành", "check", "primary");
      root.append(yes);
      yes.onclick = () =>
        A.mutate(yes, async () => {
          try {
            await A.request(`/pt-bookings/${b.id}/member-confirm`, {
              method: "POST",
            });
            close();
            A.toast("Đã ghi nhận xác nhận của bạn.");
            await A.navigate("schedule", A.sub);
          } catch (error) {
            A.error(errors, error);
          }
        });
    });
  }
  A.modules.home = { render: home };
  A.modules.schedule = { render: schedule };
})();
