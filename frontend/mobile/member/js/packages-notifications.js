(function () {
  "use strict";
  const A = window.MemberApp,
    e = A.escape;
  const S = {
    filter: "ACTIVE",
    catalog: "ALL",
    unread: false,
    expanded: new Set(),
  };
  const type = (p) => p.package_type_snapshot || p.package_type;
  const hasPt = (p) => ["PT_SESSION", "COMBO"].includes(type(p));
  const scope = (p, branches) => {
    const ids = p.allowed_branch_ids || p.branch_ids;
    if (Array.isArray(p.allowed_branches))
      return p.allowed_branches.map((b) => b.branch_name).join(", ");
    if (!Array.isArray(ids)) return "Chưa có dữ liệu";
    return (
      ids
        .map(
          (id) =>
            branches.find((b) => b.id === id)?.branch_name ||
            "Chi nhánh chưa có tên",
        )
        .join(", ") || "Chưa có chi nhánh áp dụng"
    );
  };
  function rights(p) {
    const days = p.duration_days_snapshot ?? p.duration_days,
      pt = p.total_pt_sessions_snapshot ?? p.total_pt_sessions,
      gym = p.total_gym_sessions_snapshot ?? p.total_gym_sessions;
    const items = [];
    if (days != null) items.push(`${days} ngày`);
    if (["GYM_TIME", "GYM_SESSION", "COMBO"].includes(type(p)))
      items.push(gym == null ? "Gym không giới hạn lượt" : `${gym} lượt Gym`);
    if (hasPt(p) && pt != null) items.push(`${pt} buổi PT`);
    return items.join(" · ") || "Chưa có dữ liệu quyền lợi";
  }
  function progress(r) {
    const rows = [];
    const days = r.duration_days_snapshot;
    if (type(r) !== "PT_SESSION" && days > 0 && r.start_date) {
      const used = Math.max(
        0,
        Math.min(
          days,
          Math.floor(
            (Date.parse(A.today()) - Date.parse(r.start_date)) / 86400000,
          ),
        ),
      );
      rows.push(
        `<p>Gym: đã dùng ${used}/${days} ngày</p><div class="progress"><span style="width:${(100 * used) / days}%"></span></div>`,
      );
    }
    if (hasPt(r) && r.total_pt_sessions_snapshot > 0) {
      const used = r.used_pt_sessions,
        remaining = r.remaining_pt_sessions;
      if (used != null && remaining != null) {
        rows.push(
          `<p>PT: đã dùng ${used}/${r.total_pt_sessions_snapshot} buổi · Còn ${remaining} buổi</p><div class="progress blue"><span style="width:${Math.max(0, Math.min(100, (100 * used) / r.total_pt_sessions_snapshot))}%"></span></div><small>Đang giữ chỗ: ${A.value(r.booked_pt_sessions)} buổi</small>`,
        );
      }
    }
    if (type(r) === "GYM_SESSION")
      rows.push(
        `<p>Gym: còn ${A.value(r.remaining_gym_sessions)}/${A.value(r.total_gym_sessions_snapshot)} lượt</p>`,
      );
    return rows.join("");
  }
  async function packages(root, sub, alive) {
    const active = ["sale", "requests", "history"].includes(sub) ? sub : "mine";
    A.heading(
      root,
      active === "history" ? "Lịch sử thanh toán" : "Gói của tôi",
    );
    A.segments(
      root,
      [
        ["mine", "Gói của tôi"],
        ["sale", "Mua gói"],
        ["requests", "Yêu cầu PT"],
      ],
      active,
      (id) => A.navigate("packages", id),
    );
    const pane = document.createElement("div");
    root.append(pane);
    A.loading(pane);
    if (active === "sale") return sale(pane, alive);
    if (active === "requests") return requests(pane, alive);
    if (active === "history") return history(pane, alive);
    const [regs, reqs] = await Promise.all([
      A.request("/registrations"),
      A.request("/pt-bookings/assignment-requests"),
    ]);
    if (!alive()) return;
    pane.replaceChildren();
    const group = (r) =>
      ["ACTIVE", "SCHEDULED"].includes(r.status)
        ? "ACTIVE"
        : r.status === "PENDING_PAYMENT"
          ? "PENDING"
          : "EXPIRED";
    const title = document.createElement("h2");
    title.textContent = `Gói của tôi (${regs.length})`;
    pane.append(title);
    A.filters(
      pane,
      [
        ["ACTIVE", "Đang sử dụng"],
        ["PENDING", "Chờ xử lý"],
        ["EXPIRED", "Đã hết hạn"],
      ].map(([id, label]) => [
        id,
        `${label} (${regs.filter((r) => group(r) === id).length})`,
      ]),
      S.filter,
      (id) => {
        S.filter = id;
        A.navigate("packages", "mine");
      },
    );
    const list = document.createElement("div");
    list.className = "list";
    pane.append(list);
    const filtered = regs.filter((r) => group(r) === S.filter);
    if (!filtered.length)
      A.empty(list, "Bạn chưa có gói tập nào ở trạng thái này.");
    for (const r of filtered) {
      const card = document.createElement("article");
      card.className = "record";
      const expiring =
        r.status === "ACTIVE" &&
        r.end_date &&
        Math.ceil(
          (Date.parse(r.end_date) - Date.parse(A.today())) / 86400000,
        ) <= 7;
      card.innerHTML = `<div class="row"><h3>${A.value(r.package_name_snapshot)}</h3>${expiring ? A.badge("PENDING", "Sắp hết hạn") : A.badge(r.status)}</div><p class="muted">${A.value(r.reg_code)} · ${A.date(r.start_date)}${r.end_date ? " - " + A.date(r.end_date) : ""}</p>${progress(r)}${hasPt(r) ? `<p>PT: ${r.assigned_pt_id ? A.value(r.assigned_pt_name) : "Chưa chọn"}</p>` : ""}`;
      list.append(card);
      const row = document.createElement("div");
      row.className = "actions";
      card.append(row);
      if (hasPt(r) && !r.assigned_pt_id && r.status === "ACTIVE" && r.is_paid) {
        const pending = reqs.some(
          (q) => q.registration_id === r.id && q.status === "PENDING",
        );
        const choose = A.button(
          pending ? "Xem yêu cầu PT" : "Chọn PT phụ trách",
          pending ? "clock" : "user-plus",
          "dark",
        );
        choose.onclick = () =>
          pending ? A.navigate("packages", "requests") : selectPt(r);
        row.append(choose);
      }
      if (r.status === "PENDING_PAYMENT") {
        const pay = A.button("Tiếp tục thanh toán", "qrcode", "primary");
        pay.onclick = () => openPayment(r);
        row.append(pay);
      }
    }
    const hist = A.section(pane, "Lịch sử thanh toán");
    await history(hist, alive, true);
  }
  async function sale(root, alive) {
    const [catalog, branches] = await Promise.all([
      A.request("/packages?status=ACTIVE"),
      A.request("/branches"),
    ]);
    if (!alive()) return;
    root.replaceChildren();
    A.filters(
      root,
      [
        ["ALL", "Tất cả"],
        ["GYM", "Gym"],
        ["PT", "PT"],
        ["COMBO", "Combo"],
      ],
      S.catalog,
      (id) => {
        S.catalog = id;
        A.navigate("packages", "sale");
      },
    );
    const items = catalog.filter(
      (p) =>
        p.status === "ACTIVE" &&
        (S.catalog === "ALL" ||
          (type(p) === "COMBO" ? "COMBO" : hasPt(p) ? "PT" : "GYM") ===
            S.catalog),
    );
    const list = document.createElement("div");
    list.className = "list";
    root.append(list);
    if (!items.length) A.empty(list, "Chưa có gói tập đang mở bán.");
    for (const p of items) {
      const card = document.createElement("article");
      card.className = "record";
      card.innerHTML = `<h3>${A.value(p.package_name)}</h3><p class="price">${A.money(p.price)}</p><p class="muted">${e(rights(p))}</p><div class="actions"></div>`;
      list.append(card);
      const detail = A.button("Xem chi tiết", "circle-info");
      detail.onclick = () => detailPackage(p.id, branches);
      const buy = A.button("Mua gói", "qrcode", "primary");
      buy.onclick = () => buyPackage(p);
      card.lastElementChild.append(detail, buy);
    }
  }
  function detailPackage(id, branches) {
    A.dialog("Chi tiết gói tập", async (root, close) => {
      A.loading(root);
      try {
        const p = await A.request(`/packages/${id}`);
        if (!root.isConnected) return;
        root.innerHTML = `<h3>${A.value(p.package_name)}</h3><p class="price">${A.money(p.price)}</p>${A.summary(
          [
            ["Thời hạn / Số buổi", rights(p)],
            ["Phạm vi chi nhánh", scope(p, branches)],
          ],
        )}${hasPt(p) ? '<div class="notice">Được tự chọn HLV cá nhân sau khi thanh toán.</div>' : ""}${p.description ? `<p>${e(p.description)}</p>` : ""}`;
        const buy = A.button("Mua gói", "qrcode", "primary block");
        root.append(buy);
        buy.onclick = () => {
          close();
          buyPackage(p);
        };
      } catch (error) {
        if (root.isConnected)
          A.error(root, error, () => {
            close();
            detailPackage(id, branches);
          });
      }
    });
  }
  function buyPackage(p) {
    A.dialog("Mua gói", (root, close) => {
      root.innerHTML = `<h3>${A.value(p.package_name)}</h3><p class="price">${A.money(p.price)}</p><p>Chuyển khoản Ngân hàng (VietQR)</p>`;
      const errorBox = document.createElement("div");
      root.append(errorBox);
      const buy = A.button("Tiếp tục thanh toán", "qrcode", "primary block");
      root.append(buy);
      buy.onclick = () =>
        A.mutate(buy, async () => {
          try {
            const reg = await A.request("/registrations", {
              method: "POST",
              body: {
                member_id: A.user.member_profile_id,
                package_id: p.id,
                start_date: A.today(),
              },
            });
            close();
            openPayment(reg);
          } catch (error) {
            A.error(errorBox, error);
          }
        });
    });
  }
  function openPayment(reg) {
    A.dialog("Thanh toán VietQR", async (root, close) => {
      A.loading(root);
      try {
        const invoice = await A.request("/payments/create-invoice", {
          method: "POST",
          body: { registration_id: reg.id, payment_method: "BANK_TRANSFER" },
        });
        if (!root.isConnected) return;
        const qr = invoice.qr_data || invoice.vietqr;
        root.innerHTML = `<h3>${A.value(reg.package_name_snapshot || invoice.registration?.package_name_snapshot)}</h3><p class="price">${A.money(invoice.payment.amount)}</p><p>Chuyển khoản Ngân hàng (VietQR)</p>`;
        if (qr?.qrImageUrl && /^https?:\/\//i.test(qr.qrImageUrl)) {
          const img = document.createElement("img");
          img.className = "qr-image";
          img.src = qr.qrImageUrl;
          img.alt = "Mã VietQR chuyển khoản";
          img.onerror = () => {
            img.replaceWith(
              Object.assign(document.createElement("p"), {
                textContent: "Không tải được mã QR. Vui lòng thử lại.",
              }),
            );
          };
          root.append(img);
        } else {
          const notice = document.createElement("div");
          notice.className = "notice warning";
          notice.textContent =
            "Chưa có thông tin VietQR từ máy chủ. Giao dịch đang chờ xử lý.";
          root.append(notice);
        }
        root.insertAdjacentHTML(
          "beforeend",
          A.summary([
            ["Ngân hàng", qr?.bankName || qr?.bankBin],
            ["Số tài khoản", qr?.accountNo],
            ["Chủ tài khoản", qr?.accountName],
            ["Nội dung chuyển khoản", qr?.transferContent],
          ]),
        );
        const actions = document.createElement("div");
        actions.className = "actions";
        root.append(actions);
        for (const [label, value] of [
          ["Sao chép số tài khoản", qr?.accountNo],
          ["Sao chép nội dung", qr?.transferContent],
        ]) {
          const b = A.button(label, "copy");
          b.disabled = !value;
          b.onclick = () =>
            A.mutate(b, async () => {
              await navigator.clipboard.writeText(value);
              A.toast("Đã sao chép.");
            });
          actions.append(b);
        }
        if (qr?.qrImageUrl) {
          const a = document.createElement("a");
          a.className = "button";
          a.textContent = "Lưu mã QR";
          a.href = qr.qrImageUrl;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.download = "vietqr.png";
          actions.append(a);
        }
        const status = document.createElement("div");
        status.className = "notice warning";
        status.textContent = "Đang chờ xác nhận thanh toán từ hệ thống.";
        root.append(status);
        const check = A.button(
          "Tôi đã chuyển khoản",
          "rotate-right",
          "primary block",
        );
        root.append(check);
        check.onclick = () =>
          A.mutate(check, async () => {
            try {
              const p = await A.request(`/payments/${invoice.payment.id}`);
              if (p.status === "COMPLETED") {
                status.className = "notice success";
                status.textContent = "Thanh toán đã được hệ thống xác nhận.";
                check.disabled = true;
                const go = A.button("Gói của tôi", "ticket");
                go.onclick = () => {
                  close();
                  A.navigate("packages", "mine");
                };
                root.append(go);
              } else {
                status.className = "notice warning";
                status.textContent =
                  p.status === "EXPIRED"
                    ? "Giao dịch đã hết hạn. Vui lòng kiểm tra với lễ tân."
                    : "Giao dịch vẫn đang chờ hệ thống xác nhận. Vui lòng kiểm tra lại sau.";
              }
            } catch (error) {
              A.error(status, error);
            }
          });
      } catch (error) {
        if (root.isConnected)
          A.error(root, error, () => {
            close();
            openPayment(reg);
          });
      }
    });
  }
  async function history(root, alive, append = false) {
    const records = [];
    let page = 1;
    let total = Infinity;
    while (records.length < total) {
      const response = await A.request(`/payments?limit=1000&page=${page}`);
      const items = Array.isArray(response) ? response : response.items || [];
      records.push(...items);
      total = Array.isArray(response) ? records.length : response.total;
      if (!items.length || !alive()) break;
      page++;
    }
    if (!alive()) return;
    if (!append) root.replaceChildren();
    const payments = records
      .filter((p) => p.status === "COMPLETED")
      .sort((a, b) => new Date(b.confirmed_at) - new Date(a.confirmed_at));
    const list = document.createElement("div");
    list.className = "list";
    root.append(list);
    if (!payments.length) {
      A.empty(list, "Bạn chưa có giao dịch thanh toán nào.");
      return;
    }
    for (const p of payments) {
      const card = document.createElement("article");
      card.className = "record";
      card.innerHTML = `<div class="row"><h3>${A.value(p.receipt_code || p.payment_code)}</h3><strong class="price">${A.money(p.amount)}</strong></div><p>${A.value(p.package_name_snapshot)}</p><p class="muted">${A.time(p.confirmed_at)} · ${p.payment_method === "CASH" ? "Tiền mặt" : p.payment_method === "BANK_TRANSFER" ? "Chuyển khoản Ngân hàng (VietQR)" : A.value(p.payment_method)}</p>${A.badge("COMPLETED", "Đã thanh toán")}`;
      list.append(card);
      const view = A.button("Xem phiếu thu", "receipt");
      view.onclick = () => receipt(p.id);
      card.append(view);
    }
  }
  function receipt(id) {
    A.dialog("Phiếu thu", async (root, close) => {
      A.loading(root);
      try {
        const r = await A.request(`/payments/${id}/receipt`);
        if (!root.isConnected) return;
        root.innerHTML = A.summary([
          ["Mã phiếu thu", r.receipt_code],
          ["Tên hội viên", r.payer_name || r.member_name],
          ["Gói tập", r.package_name || r.package_name_snapshot],
          ["Số tiền", A.money(r.amount)],
          [
            "Ngày thanh toán",
            A.time(r.confirmed_at || r.issued_at || r.created_at),
          ],
        ]);
      } catch (error) {
        if (root.isConnected)
          A.error(root, error, () => {
            close();
            receipt(id);
          });
      }
    });
  }
  function selectPt(reg) {
    A.dialog("Chọn PT phụ trách", async (root, close) => {
      A.loading(root);
      try {
        const [r, trainers, reqs] = await Promise.all([
          A.request(`/registrations/${reg.id}`),
          A.request("/pt-bookings/trainers?status=ACTIVE"),
          A.request("/pt-bookings/assignment-requests"),
        ]);
        if (!root.isConnected) return;
        root.innerHTML = `<h3>${A.value(r.package_name_snapshot)}</h3><p class="muted">${e(rights(r))} · ${A.value(reg.sold_branch_name)}</p>`;
        if (
          r.assigned_pt_id ||
          r.status !== "ACTIVE" ||
          reqs.some((q) => q.registration_id === r.id && q.status === "PENDING")
        ) {
          root.insertAdjacentHTML(
            "beforeend",
            '<div class="notice">Gói này đã có PT hoặc yêu cầu đang chờ xử lý.</div>',
          );
          return;
        }
        const eligible = trainers.filter(
          (t) => t.status === "ACTIVE" && t.branch_id === r.sold_branch_id,
        );
        const list = document.createElement("div");
        list.className = "list section";
        root.append(list);
        if (!eligible.length)
          A.empty(list, "Chưa có PT hoạt động tại chi nhánh của gói.");
        for (const t of eligible) {
          const card = document.createElement("article");
          card.className = "record";
          card.innerHTML = `<div class="profile-heading">${A.avatar(t.full_name, t.avatar_url)}<div><h3>${A.value(t.full_name)}</h3><p>${A.value(t.specialties)} · ${A.value(t.branch_name)}</p></div></div>`;
          const send = A.button("Gửi yêu cầu", "user-plus", "primary");
          card.append(send);
          list.append(card);
          send.onclick = () =>
            A.dialog("Xác nhận chọn PT", (body, end) => {
              body.innerHTML = `<h3>HLV ${A.value(t.full_name)}</h3><p>${A.value(t.specialties)}</p><p>${A.value(r.package_name_snapshot)}</p><div class="notice">Bạn có chắc chắn muốn gửi yêu cầu phân công HLV này không? Yêu cầu sẽ được gửi tới HLV để xác nhận.</div>`;
              const errorBox = document.createElement("div");
              body.append(errorBox);
              const yes = A.button("Xác nhận", "check", "primary");
              body.append(yes);
              yes.onclick = () =>
                A.mutate(yes, async () => {
                  try {
                    await A.request("/pt-bookings/assignment-request", {
                      method: "POST",
                      body: { registration_id: r.id, pt_id: t.id },
                    });
                    end();
                    close();
                    A.toast("Đã gửi yêu cầu phân công PT.");
                    await A.navigate("packages", "requests");
                  } catch (error) {
                    A.error(errorBox, error);
                  }
                });
            });
        }
      } catch (error) {
        if (root.isConnected)
          A.error(root, error, () => {
            close();
            selectPt(reg);
          });
      }
    });
  }
  async function requests(root, alive) {
    const list = await A.request("/pt-bookings/assignment-requests");
    if (!alive()) return;
    root.replaceChildren();
    if (!list.length) {
      A.empty(root, "Bạn chưa có yêu cầu phân công PT nào.");
      return;
    }
    root.className = "list";
    for (const r of list) {
      const card = document.createElement("article");
      card.className = "record";
      card.innerHTML = `<div class="row"><h3>${A.value(r.package_name || r.package_name_snapshot)}</h3>${A.badge(r.status)}</div><p>PT: ${A.value(r.pt_name)}</p><p class="muted">${A.time(r.requested_at || r.created_at)}</p>${r.response_note ? `<p>${e(r.response_note)}</p>` : ""}`;
      root.append(card);
      if (r.status === "REJECTED") {
        const choose = A.button("Chọn PT khác", "user-plus", "dark");
        choose.onclick = () => selectPt({ id: r.registration_id });
        card.append(choose);
      }
      if (r.status === "ACCEPTED") {
        const book = A.button("Đặt lịch PT", "calendar-plus", "primary");
        book.onclick = () =>
          A.navigate("schedule", "book", {
            registration_id: r.registration_id,
          });
        card.append(book);
      }
    }
  }
  async function notifications(root, sub, alive) {
    const data = await A.request("/notifications");
    if (!alive()) return;
    A.heading(root, "Thông báo");
    const list = Array.isArray(data) ? data : data.items || [];
    A.filters(
      root,
      [
        ["ALL", `Tất cả (${list.length})`],
        ["UNREAD", `Chưa đọc (${list.filter((n) => !n.is_read).length})`],
      ],
      S.unread ? "UNREAD" : "ALL",
      (id) => {
        S.unread = id === "UNREAD";
        A.navigate("notifications");
      },
    );
    const records = document.createElement("div");
    records.className = "list";
    root.append(records);
    const filtered = list
      .filter((n) => !S.unread || !n.is_read)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!filtered.length) A.empty(records, "Chưa có thông báo ở bộ lọc này.");
    for (const n of filtered) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = `record notification ${n.is_read ? "" : "unread"}`;
      card.setAttribute("aria-expanded", S.expanded.has(n.id));
      card.innerHTML = `<div class="row"><h3>${A.value(n.title)}</h3>${!n.is_read ? '<span class="badge blue">Chưa đọc</span>' : ""}</div><small>${A.time(n.created_at)}</small><p class="${S.expanded.has(n.id) ? "body" : "preview"}">${A.value(n.body || n.message)}</p>`;
      records.append(card);
      card.onclick = () =>
        A.mutate(card, async () => {
          if (!n.is_read)
            await A.request(`/notifications/${n.id}/read`, { method: "PUT" });
          S.expanded.has(n.id) ? S.expanded.delete(n.id) : S.expanded.add(n.id);
          card.classList.remove("unread");
          card.querySelector(".badge")?.remove();
          const body = card.querySelector("p");
          body.className = S.expanded.has(n.id) ? "body" : "preview";
          card.setAttribute("aria-expanded", S.expanded.has(n.id));
          n.is_read = true;
        });
    }
  }
  A.modules.packages = { render: packages };
  A.modules.notifications = { render: notifications };
})();
