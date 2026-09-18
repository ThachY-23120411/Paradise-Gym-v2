(function () {
  "use strict";
  const sdk = window.apiClient || new ParadiseApiClient();
  const rawRequest = sdk.request.bind(sdk);
  sdk.request = (path, options = {}) =>
    rawRequest(path, {
      ...options,
      headers: { ...options.headers, "x-active-role": "MEMBER" },
    });
  window.apiClient = sdk;
  const A = (window.MemberApp = {
    api: sdk,
    user: null,
    profile: null,
    route: "home",
    sub: null,
    version: 0,
    sessionVersion: 0,
    modules: {},
    dialogs: new Set(),
    pending: new WeakSet(),
  });
  A.escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  A.rows = (response) =>
    Array.isArray(response?.data) ? response.data : response?.data?.items || [];
  A.today = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  A.date = (value) =>
    value
      ? new Date(
          String(value).length === 10 ? `${value}T12:00:00+07:00` : value,
        ).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
      : "Chưa có dữ liệu";
  A.time = (value) =>
    value
      ? new Date(value).toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
        })
      : "Chưa có dữ liệu";
  A.money = (value) =>
    value == null
      ? "Chưa có dữ liệu"
      : Number(value).toLocaleString("vi-VN") + " đ";
  A.value = (value) =>
    A.escape(value == null || value === "" ? "Chưa có dữ liệu" : value);
  A.icon = (name) => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;
  A.button = (label, icon, kind = "") => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `button ${kind}`;
    b.innerHTML = `${icon ? A.icon(icon) : ""}<span>${A.escape(label)}</span>`;
    return b;
  };
  A.empty = (root, message) => {
    root.innerHTML = `<div class="state">${A.icon("inbox")}<p>${A.escape(message)}</p></div>`;
  };
  A.loading = (root) => {
    root.innerHTML =
      '<div class="state" role="status">Đang tải dữ liệu...</div>';
  };
  A.error = (root, error, retry) => {
    if (error.status === 401 && A.user) {
      A.expire();
      return;
    }
    root.innerHTML = `<div class="notice error" role="alert">${A.escape(error.message || "Không thể kết nối máy chủ.")}</div>`;
    if (retry) {
      const b = A.button("Thử lại", "rotate-right");
      b.onclick = retry;
      root.append(b);
    }
  };
  A.toast = (message, error = false) => {
    const el = document.getElementById("toast");
    clearTimeout(A.toastTimer);
    el.textContent = message;
    el.className = error ? "error" : "";
    el.hidden = false;
    A.toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 4000);
  };
  A.request = async (path, options) => {
    const sessionVersion = A.sessionVersion;
    try {
      const result = await sdk.request(path, options);
      if (sessionVersion !== A.sessionVersion) throw new Error("Phiên làm việc đã thay đổi. Vui lòng tải lại.");
      return result.data;
    } catch (error) {
      if (error.status === 401 && A.user && sessionVersion === A.sessionVersion) A.expire();
      throw error;
    }
  };
  A.mutate = async (button, operation) => {
    if (button.disabled || A.pending.has(button)) return;
    A.pending.add(button);
    button.disabled = true;
    try {
      await operation();
    } catch (error) {
      if (error.status === 401 && A.user) A.expire();
      else A.toast(error.message || "Không thể lưu thay đổi.", true);
    } finally {
      A.pending.delete(button);
      if (button.isConnected)
        button.disabled = button.dataset.keepDisabled === "true";
    }
  };
  A.heading = (root, title, eyebrow) => {
    root.innerHTML = `<div class="page-heading">${eyebrow ? `<p class="eyebrow">${A.escape(eyebrow)}</p>` : ""}<h1>${A.escape(title)}</h1></div>`;
  };
  A.segments = (root, items, selected, change) => {
    const nav = document.createElement("div");
    nav.className = "segments";
    nav.setAttribute("role", "tablist");
    for (const [id, label] of items) {
      const b = A.button(label);
      b.className = id === selected ? "active" : "";
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", id === selected);
      b.onclick = () => change(id);
      nav.append(b);
    }
    root.append(nav);
    return nav;
  };
  A.filters = (root, items, selected, change) => {
    const nav = document.createElement("div");
    nav.className = "filters";
    for (const [id, label] of items) {
      const b = A.button(label);
      b.className = id === selected ? "active" : "";
      b.setAttribute("aria-pressed", id === selected);
      b.onclick = () => change(id);
      nav.append(b);
    }
    root.append(nav);
    return nav;
  };
  A.section = (root, title) => {
    const section = document.createElement("section");
    section.className = "section";
    if (title)
      section.innerHTML = `<div class="section-heading"><h2>${A.escape(title)}</h2></div>`;
    root.append(section);
    return section;
  };
  A.badge = (status, label) =>
    `<span class="badge ${{ ACTIVE: "green", COMPLETED: "green", ACCEPTED: "green", SCHEDULED: "blue", BOOKED: "blue", PENDING: "amber", PENDING_PAYMENT: "amber", PENDING_COMPLETION: "amber", REJECTED: "red", CANCELLED: "red", EXPIRED: "red" }[status] || ""}">${A.escape(label || { ACTIVE: "Đang hoạt động", COMPLETED: "Đã hoàn thành", ACCEPTED: "Đã chấp nhận", SCHEDULED: "Chờ kích hoạt", BOOKED: "Đã đặt", PENDING: "Đang chờ phản hồi", PENDING_PAYMENT: "Chờ thanh toán", PENDING_COMPLETION: "Chờ xác nhận", REJECTED: "Đã từ chối", CANCELLED: "Đã hủy", EXPIRED: "Đã hết hạn" }[status] || status)}</span>`;
  A.avatar = (name, url) => {
    const initials = String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((x) => x[0])
      .join("")
      .toUpperCase();
    return `<div class="avatar">${url && /^https?:\/\//i.test(url) ? `<img src="${A.escape(url)}" alt="Ảnh đại diện">` : A.escape(initials || "?")}</div>`;
  };
  A.summary = (pairs) =>
    `<dl class="summary">${pairs.map(([k, v]) => `<dt>${A.escape(k)}</dt><dd>${A.value(v)}</dd>`).join("")}</dl>`;
  A.dialog = (title, render) => {
    const d = document.createElement("dialog");
    d.innerHTML = `<div class="dialog-heading"><h2>${A.escape(title)}</h2><button type="button" class="icon-button" title="Đóng" aria-label="Đóng">${A.icon("xmark")}</button></div><div class="dialog-body"></div>`;
    document.body.append(d);
    A.dialogs.add(d);
    const close = () => d.close();
    d.querySelector("button").onclick = close;
    d.addEventListener("click", (e) => {
      if (e.target === d) {
        const r = d.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          close();
      }
    });
    d.addEventListener("close", () => {
      A.dispose(d);
      A.dialogs.delete(d);
      d.remove();
    });
    d.showModal();
    render(d.querySelector(".dialog-body"), close, d);
    return d;
  };
  A.dispose = (root) => {
    if (!window.jQuery) return;
    $(root)
      .find(".dx-widget")
      .each(function () {
        for (const name of ["dxCalendar", "dxSelectBox", "dxDateBox"]) {
          const instance = $(this).data(name);
          if (instance) instance.dispose();
        }
      });
  };
  A.clearDialogs = () => {
    for (const d of A.dialogs) d.close();
  };
  A.expire = () => {
    A.sessionVersion++;
    A.version++;
    A.clearDialogs();
    A.user = null;
    A.profile = null;
    sdk.clearAuth();
    document.getElementById("bottomNav").hidden = true;
    document.getElementById("refreshPage").hidden = true;
    window.location.replace("/mobile/");
  };
  A.navigate = async (route = "home", sub = null, context = null) => {
    if (!A.user) {
      window.location.replace("/mobile/");
      return;
    }
    const version = ++A.version;
    A.route = route;
    A.sub = sub;
    A.clearDialogs();
    const root = document.getElementById("main");
    A.dispose(root);
    A.loading(root);
    document
      .querySelectorAll("[data-route]")
      .forEach((b) => b.classList.toggle("active", b.dataset.route === route));
    history.replaceState(null, "", `#${route}${sub ? "/" + sub : ""}`);
    try {
      await A.modules[route].render(
        root,
        sub,
        () => version === A.version,
        context,
      );
    } catch (error) {
      if (version === A.version)
        A.error(root, error, () => A.navigate(route, sub, context));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  A.start = async () => {
    const token = sdk.getAccessToken();
    if (!token) {
      window.location.replace("/mobile/");
      return;
    }
    const u = await A.request("/auth/me");
    const role = u.active_role || u.role || (u.roles?.includes("PT") ? "PT" : "MEMBER");
    if (role === "PT") {
      window.location.replace("/mobile/pt/");
      return;
    }
    if (role !== "MEMBER" || !u.member_profile_id) {
      sdk.clearAuth();
      window.location.replace("/mobile/");
      return;
    }
    const p = await A.request(`/members/${u.member_profile_id}`);
    A.user = u;
    A.profile = p;
    document.getElementById("bottomNav").hidden = false;
    document.getElementById("refreshPage").hidden = false;
    const [r, s] = location.hash.slice(1).split("/");
    await A.navigate(
      ["home", "schedule", "packages", "notifications", "account"].includes(r)
        ? r
        : "home",
      s,
    );
  };
  document.addEventListener("DOMContentLoaded", async () => {
    DevExpress.localization.locale("vi");
    document
      .querySelectorAll("[data-route]")
      .forEach((b) => (b.onclick = () => A.navigate(b.dataset.route)));
    document.getElementById("refreshPage").onclick = () =>
      A.navigate(A.route, A.sub);
    document.querySelector(".brand").onclick = (e) => {
      e.preventDefault();
      A.navigate("home");
    };
    if (!sdk.getAccessToken()) {
      window.location.replace("/mobile/");
      return;
    }
    try {
      await A.start();
    } catch (error) {
      sdk.clearAuth();
      window.location.replace("/mobile/");
    }
  });
})();
