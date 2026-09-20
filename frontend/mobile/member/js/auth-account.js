(function () {
  "use strict";
  const A = window.MemberApp,
    e = A.escape;
  function field(
    form,
    label,
    name,
    type = "text",
    value = "",
    required = false,
  ) {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const id = `field-${name}`;
    wrap.innerHTML = `<label for="${id}">${e(label)}${required ? ' <span class="required">*</span>' : ""}</label><input id="${id}" name="${e(name)}" type="${type}" value="${e(value ?? "")}" ${required ? "required" : ""}>`;
    form.append(wrap);
    return wrap.querySelector("input");
  }
  function password(form, label, name, min = 6) {
    const input = field(form, label, name, "password", "", true);
    input.minLength = min;
    input.autocomplete =
      name === "current_password" ? "current-password" : "new-password";
    const box = document.createElement("div");
    box.className = "password-wrap";
    input.replaceWith(box);
    box.append(input);
    const toggle = A.button("", "eye");
    toggle.className = "icon-button";
    toggle.title = "Hiện hoặc ẩn mật khẩu";
    toggle.setAttribute("aria-label", toggle.title);
    toggle.onclick = () => {
      input.type = input.type === "password" ? "text" : "password";
    };
    box.append(toggle);
    return input;
  }
  function otpControl(form, label) {
    const group = document.createElement("div");
    group.className = "field";
    group.innerHTML = `<label>${e(label)}</label><div class="otp-inputs"></div>`;
    form.append(group);
    const grid = group.lastElementChild;
    const inputs = Array.from({ length: 6 }, (_, i) => {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.inputMode = "numeric";
      inp.maxLength = 1;
      inp.required = true;
      inp.setAttribute("aria-label", `${label}, chữ số ${i + 1}`);
      inp.autocomplete = i === 0 ? "one-time-code" : "off";
      grid.append(inp);
      return inp;
    });
    inputs.forEach((inp, i) => {
      inp.oninput = () => {
        inp.value = inp.value.replace(/\D/g, "").slice(-1);
        if (inp.value && inputs[i + 1]) inputs[i + 1].focus();
      };
      inp.onkeydown = (ev) => {
        if (ev.key === "Backspace" && !inp.value && inputs[i - 1])
          inputs[i - 1].focus();
      };
      inp.onpaste = (ev) => {
        const code = ev.clipboardData.getData("text").trim();
        if (/^\d{6}$/.test(code)) {
          ev.preventDefault();
          inputs.forEach((x, j) => (x.value = code[j]));
          inputs[5].focus();
          form.dispatchEvent(new Event("input", { bubbles: true }));
        }
      };
    });
    return {
      group,
      value: () => inputs.map((i) => i.value).join(""),
      clear: () => inputs.forEach((i) => (i.value = "")),
    };
  }
  function challengeStatus(root, data, button) {
    root.textContent =
      data.delivery === "DEVELOPMENT_ONLY"
        ? `Mã phát triển: ${data.dev_otp}. Không phải SMS thật.`
        : "Mã xác thực đã được gửi tới số điện thoại của bạn.";
    const end = Date.now() + Number(data.ttl_seconds || 60) * 1000;
    const timer = setInterval(() => {
      if (!root.isConnected) {
        clearInterval(timer);
        return;
      }
      const sec = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      button.dataset.keepDisabled = String(sec > 0);
      button.disabled = sec > 0;
      button.textContent = sec ? `Gửi lại sau ${sec}s` : "Gửi lại mã OTP";
      if (!sec) clearInterval(timer);
    }, 1000);
    button.dataset.keepDisabled = "true";
    button.disabled = true;
  }
  function acceptTokens(data) {
    if (!data?.access_token)
      throw new Error("Máy chủ chưa tạo phiên đăng nhập.");
    A.sessionVersion++;
    A.api.setTokens(data.access_token, data.refresh_token);
    A.api.setUser(data.user);
  }
  async function completeLogin(data, root, phone) {
    if (data.requires_2fa) {
      render2fa(root, phone, data);
      return;
    }
    acceptTokens(data);
    try {
      await A.start();
    } catch (error) {
      A.api.clearAuth();
      throw error;
    }
  }
  function render2fa(root, phone, data) {
    root.innerHTML =
      '<section class="auth"><h1>Xác thực 2 bước (2FA)</h1></section>';
    const panel = root.firstElementChild;
    const hint = document.createElement("p");
    hint.className = "muted";
    hint.textContent = `Xác thực số điện thoại ${phone.slice(0, 3)}****${phone.slice(-3)}`;
    panel.append(hint);
    const form = document.createElement("form");
    panel.append(form);
    const otp = otpControl(form, "Mã OTP 2FA");
    const status = document.createElement("div");
    status.className = "otp-status";
    form.append(status);
    const resend = A.button("Gửi lại mã OTP", "rotate-right");
    form.append(resend);
    challengeStatus(status, data, resend);
    let resends = 0;
    resend.onclick = () =>
      A.mutate(resend, async () => {
        if (resends >= 3)
          throw new Error("Đã hết lượt gửi lại. Vui lòng đăng nhập lại.");
        const next = await A.request("/auth/request-otp", {
          method: "POST",
          body: {
            login_phone: phone,
            temp_token: data.temp_token,
            active_role: "MEMBER",
          },
        });
        resends++;
        otp.clear();
        challengeStatus(status, next, resend);
      });
    const submit = A.button("Xác nhận 2FA", "shield-halved", "primary block");
    submit.type = "submit";
    submit.disabled = true;
    form.append(submit);
    form.oninput = () => {
      submit.disabled = otp.value().length !== 6;
    };
    const errorBox = document.createElement("div");
    form.append(errorBox);
    form.onsubmit = (ev) => {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      A.mutate(submit, async () => {
        try {
          const result = await A.request("/auth/verify-2fa", {
            method: "POST",
            body: { temp_token: data.temp_token, otp_code: otp.value() },
          });
          if (panel.isConnected) await completeLogin(result, root, phone);
        } catch (error) {
          A.error(errorBox, error);
        }
      });
    };
    const back = A.button("Quay lại đăng nhập", "arrow-left", "link");
    back.onclick = () => render(root);
    panel.append(back);
  }
  function render(root, view = "login", message = "") {
    root.innerHTML = '<section class="auth"></section>';
    const panel = root.firstElementChild;
    A.heading(
      panel,
      {
        login: "Đăng nhập",
        activate: "Kích hoạt tài khoản",
        register: "Tạo tài khoản mới",
      }[view],
      "Hội viên",
    );
    if (message) {
      const notice = document.createElement("div");
      notice.className = "notice error";
      notice.textContent = message;
      panel.append(notice);
    }
    let method = "password",
      sentPhone = null,
      challenge = null,
      signupToken = null,
      resends = 0,
      lookup = null;
    const methodRoot = document.createElement("div");
    if (view === "login") panel.append(methodRoot);
    const form = document.createElement("form");
    panel.append(form);
    const phone = field(form, "Số điện thoại", "login_phone", "tel", "", true);
    phone.pattern = "0[0-9]{9}";
    phone.maxLength = 10;
    phone.autocomplete = "tel";
    const summary = document.createElement("div");
    summary.hidden = true;
    form.append(summary);
    let fullName, branchSelect, email;
    if (view === "register") {
      fullName = field(form, "Họ và tên", "full_name", "text", "", true);
      fullName.maxLength = 150;

      const branchWrap = document.createElement("div");
      branchWrap.className = "field";
      branchWrap.innerHTML =
        '<label for="field-home_branch_id">Chi nhánh sinh hoạt chính <span class="required">*</span></label><select id="field-home_branch_id" name="home_branch_id" required><option value="">-- Chọn phòng tập sinh hoạt chính --</option></select>';
      form.append(branchWrap);
      branchSelect = branchWrap.querySelector("select");

      email = field(form, "Email", "email", "email");

      A.request("/branches?status=ACTIVE")
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.items || [];
          list.forEach((b) => {
            const opt = document.createElement("option");
            opt.value = b.id;
            opt.textContent = `${b.branch_name}${b.address ? ` - ${b.address}` : ""}`;
            branchSelect.append(opt);
          });
        })
        .catch((err) => {
          A.error(
            errorBox,
            new Error("Không thể tải danh sách chi nhánh: " + err.message),
          );
        });
    }
    const pass = password(
      form,
      view === "login" ? "Mật khẩu" : "Mật khẩu mới",
      "password",
      view === "login" ? 1 : 6,
    );
    pass.autocomplete = view === "login" ? "current-password" : "new-password";
    const confirm =
      view !== "login"
        ? password(form, "Xác nhận mật khẩu", "confirm_password")
        : null;
    const otp = otpControl(form, "Mã xác thực OTP");
    otp.group.hidden = true;
    otp.group.querySelectorAll("input").forEach((x) => (x.required = false));
    const request = A.button(
      view === "activate" ? "Tra cứu hồ sơ" : "Nhận mã OTP",
      "comment-sms",
    );
    request.hidden = view === "login";
    form.append(request);
    const status = document.createElement("div");
    status.className = "otp-status";
    form.append(status);
    const errorBox = document.createElement("div");
    form.append(errorBox);
    const submit = A.button(
      {
        login: "Đăng nhập",
        activate: "Kích hoạt & Đăng nhập",
        register: "Hoàn tất tạo tài khoản",
      }[view],
      "arrow-right",
      "primary block",
    );
    submit.type = "submit";
    form.append(submit);
    function validity() {
      submit.disabled =
        !phone.validity.valid ||
        (view === "login" && method === "password"
          ? !pass.value
          : !sentPhone ||
            sentPhone !== phone.value ||
            otp.value().length !== 6) ||
        (view !== "login" &&
          (pass.value.length < 6 || confirm.value !== pass.value)) ||
        (view === "register" && (!fullName?.value.trim() || !branchSelect?.value));
    }
    function methods() {
      methodRoot.replaceChildren();
      A.segments(
        methodRoot,
        [
          ["password", "Bằng mật khẩu"],
          ["otp", "Bằng mã OTP"],
        ],
        method,
        (id) => {
          method = id;
          pass.closest(".field").hidden = id === "otp";
          pass.required = id === "password";
          request.hidden = id === "password";
          otp.group.hidden = id === "otp" || !sentPhone;
          otp.group
            .querySelectorAll("input")
            .forEach((x) => (x.required = id === "otp" && !!sentPhone));
          methods();
          validity();
        },
      );
    }
    if (view === "login") methods();
    phone.addEventListener("input", () => {
      if (sentPhone !== phone.value) {
        sentPhone = null;
        challenge = null;
        signupToken = null;
        lookup = null;
        summary.hidden = true;
        otp.group.hidden = true;
        otp.clear();
        request.textContent =
          view === "activate" ? "Tra cứu hồ sơ" : "Nhận mã OTP";
        request.disabled = false;
      }
    });
    request.onclick = () =>
      A.mutate(request, async () => {
        errorBox.replaceChildren();
        if (!phone.reportValidity()) return;
        try {
          if (view === "register") {
            if (
              !fullName.reportValidity() ||
              !branchSelect.reportValidity() ||
              !pass.reportValidity() ||
              !confirm.reportValidity()
            )
              return;
            if (pass.value !== confirm.value)
              throw new Error("Mật khẩu xác nhận không khớp.");
            if (resends >= 4)
              throw new Error(
                "Đã hết 3 lượt gửi lại. Vui lòng bắt đầu phiên mới.",
              );
            challenge = await A.request("/auth/signup-otp", {
              method: "POST",
              body: {
                login_phone: phone.value,
                full_name: fullName.value.trim(),
                home_branch_id: branchSelect.value,
                email: email?.value.trim() || undefined,
                password: pass.value,
              },
            });
            signupToken = challenge.signup_token;
            resends++;
            sentPhone = phone.value;
            otp.group.hidden = false;
            otp.group
              .querySelectorAll("input")
              .forEach((x) => (x.required = true));
            challengeStatus(status, challenge, request);
            validity();
            return;
          }
          if (view === "activate" && !lookup) {
            lookup = await A.request("/auth/activation-lookup", {
              method: "POST",
              body: { login_phone: phone.value, active_role: "MEMBER" },
            });
            if (!lookup.can_activate)
              throw new Error(
                "Tài khoản đã hoạt động. Vui lòng quay lại đăng nhập.",
              );
            summary.hidden = false;
            summary.className = "notice";
            summary.innerHTML = A.summary([
              ["Họ tên", lookup.masked_name],
              ["Mã hội viên", lookup.masked_code],
              ["Chi nhánh", lookup.branch_name],
            ]);
            request.textContent = "Nhận mã OTP";
            return;
          }
          if (resends >= 4)
            throw new Error(
              "Đã hết 3 lượt gửi lại. Vui lòng bắt đầu phiên mới.",
            );
          challenge = await A.request("/auth/request-otp", {
            method: "POST",
            body: { login_phone: phone.value, active_role: "MEMBER" },
          });
          resends++;
          sentPhone = phone.value;
          otp.group.hidden = false;
          otp.group
            .querySelectorAll("input")
            .forEach((x) => (x.required = true));
          challengeStatus(status, challenge, request);
          validity();
        } catch (error) {
          A.error(errorBox, error);
        }
      });
    form.addEventListener("input", validity);
    validity();
    form.onsubmit = (ev) => {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      A.mutate(submit, async () => {
        errorBox.replaceChildren();
        try {
          let data;
          if (view === "register") {
            data = await A.request("/auth/signup", {
              method: "POST",
              body: {
                signup_token: signupToken,
                otp_code: otp.value(),
              },
            });
          } else {
            data = await A.request(
              view === "login" && method === "password"
                ? "/auth/login-password"
                : "/auth/login-otp",
              {
                method: "POST",
                body: {
                  login_phone: phone.value,
                  active_role: "MEMBER",
                  ...(view === "login" && method === "password"
                    ? { password: pass.value }
                    : {
                        otp_code: otp.value(),
                        ...(view === "activate" ? { password: pass.value } : {}),
                      }),
                },
              },
            );
          }
          pass.value = "";
          if (confirm) confirm.value = "";
          if (panel.isConnected) await completeLogin(data, root, phone.value);
        } catch (error) {
          A.error(errorBox, error);
          validity();
        }
      });
    };
    const links = document.createElement("div");
    links.className = "auth-links";
    panel.append(links);
    for (const [id, label] of [
      ["login", "Quay lại đăng nhập"],
      ["activate", "Đã có hồ sơ tại quầy? Kích hoạt tài khoản"],
      ["register", "Tạo tài khoản mới"],
    ])
      if (id !== view) {
        const b = A.button(label, id === "login" ? "arrow-left" : null, "link");
        b.onclick = () => render(root, id);
        links.append(b);
      }
  }
  async function account(root, sub, alive) {
    const p = await A.request(`/members/${A.user.member_profile_id}`);
    if (!alive()) return;
    A.profile = p;
    A.heading(root, "Tài khoản", "Hồ sơ hội viên");
    const headingEl = root.querySelector(".page-heading");
    if (headingEl) {
      headingEl.classList.add("text-center");
      headingEl.style.textAlign = "center";
      const eyebrow = headingEl.querySelector(".eyebrow");
      if (eyebrow) eyebrow.style.textAlign = "center";
    }

    const header = document.createElement("div");
    header.className = "account-profile-card";
    header.innerHTML = `
      <div class="account-avatar-wrap">
        ${A.avatar(p.full_name, p.avatar_url)}
      </div>
      <h2 class="account-profile-name">${A.value(p.full_name)}</h2>
      <p class="account-profile-meta">
        <span class="badge info">${A.value(p.member_code)}</span>
        <span class="dot">·</span>
        <span>${A.value(p.phone)}</span>
      </p>
    `;
    root.append(header);
    const active = sub === "settings" ? "settings" : "profile";
    A.segments(
      root,
      [
        ["profile", "Hồ sơ cá nhân"],
        ["settings", "Cài đặt & bảo mật"],
      ],
      active,
      (id) => A.navigate("account", id),
    );
    const body = document.createElement("section");
    root.append(body);
    if (active === "settings") await settings(body, alive);
    else profileForm(body, p);
    const actions = document.createElement("div");
    actions.className = "section actions";
    root.append(actions);
    const history = A.button("Lịch sử thanh toán", "receipt");
    history.onclick = () => A.navigate("packages", "history");
    actions.append(history);
    const logout = A.button("Đăng xuất", "right-from-bracket");
    actions.append(logout);
    logout.onclick = () =>
      A.dialog("Xác nhận đăng xuất", (content, close) => {
        content.innerHTML =
          "<p>Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng Paradise Gym trên thiết bị này không? Phiên đăng nhập hiện tại sẽ kết thúc.</p>";
        const row = document.createElement("div");
        row.className = "actions";
        content.append(row);
        const cancel = A.button("Hủy");
        cancel.onclick = close;
        const ok = A.button(
          "Xác nhận đăng xuất",
          "right-from-bracket",
          "danger",
        );
        ok.onclick = () =>
          A.mutate(ok, async () => {
            try {
              await A.api.auth.logoutCurrent();
            } finally {
              close();
              A.expire();
            }
          });
        row.append(cancel, ok);
      });
  }
  function profileForm(root, p) {
    const form = document.createElement("form");
    root.append(form);
    const avatar = field(form, "Ảnh đại diện", "avatar", "file");
    avatar.accept = "image/jpeg,image/png,image/webp";
    const name = field(
      form,
      "Họ và tên",
      "full_name",
      "text",
      p.full_name,
      true,
    );
    name.maxLength = 150;
    const phone = field(form, "Số điện thoại", "phone", "tel", p.phone, true);
    phone.pattern = "0[0-9]{9}";
    phone.maxLength = 10;
    const phoneArea = document.createElement("div");
    phoneArea.hidden = true;
    form.append(phoneArea);
    const send = A.button("Gửi OTP tới số mới", "comment-sms");
    phoneArea.append(send);
    const otp = otpControl(phoneArea, "Mã OTP đổi số điện thoại");
    otp.group.querySelectorAll("input").forEach((x) => (x.required = false));
    const status = document.createElement("div");
    status.className = "otp-status";
    phoneArea.append(status);
    let challenge = null,
      sentTo = null,
      avatarFile = null;
    const email = field(form, "Email", "email", "email", p.email);
    const birth = field(
      form,
      "Ngày sinh",
      "date_of_birth",
      "date",
      p.date_of_birth,
    );
    birth.max = A.today();
    const genderWrap = document.createElement("div");
    genderWrap.className = "field";
    genderWrap.innerHTML =
      '<label for="profileGender">Giới tính</label><select id="profileGender"><option value="">Chưa cung cấp</option value="NAM">Nam</option><option value="NU">Nữ</option><option value="KHAC">Khác</option></select>';
    form.append(genderWrap);
    const gender = genderWrap.querySelector("select");
    const initialGender = {MALE:"NAM",FEMALE:"NU",OTHER:"KHAC"}[p.gender] || p.gender || "";
    gender.value = initialGender;
    const errors = document.createElement("div");
    form.append(errors);
    const save = A.button("Lưu thay đổi", "floppy-disk", "primary");
    save.type = "submit";
    save.disabled = true;
    form.append(save);
    function dirty() {
      const changed =
        name.value !== p.full_name ||
        phone.value !== p.phone ||
        email.value !== (p.email || "") ||
        birth.value !== (p.date_of_birth || "") ||
        gender.value !== initialGender ||
        !!avatarFile;
      phoneArea.hidden = phone.value === p.phone;
      otp.group
        .querySelectorAll("input")
        .forEach((x) => (x.required = !phoneArea.hidden));
      save.disabled = !changed;
      save.dataset.keepDisabled = String(!changed);
    }
    form.addEventListener("input", dirty);
    form.addEventListener("change", dirty);
    phone.oninput = () => {
      if (phone.value !== sentTo) {
        challenge = null;
        otp.clear();
        status.textContent = "";
      }
      dirty();
    };
    send.onclick = () =>
      A.mutate(send, async () => {
        if (!phone.reportValidity()) return;
        try {
          const targetPhone = phone.value;
          challenge = await A.request("/auth/request-phone-change", {
            method: "POST",
            body: { new_phone: targetPhone },
          });
          sentTo = targetPhone;
          challengeStatus(status, challenge, send);
        } catch (error) {
          A.error(errors, error);
        }
      });
    avatar.onchange = () => {
      avatarFile = avatar.files[0] || null;
      if (
        avatarFile &&
        (!["image/jpeg", "image/png", "image/webp"].includes(avatarFile.type) ||
          avatarFile.size > 5 * 1024 * 1024)
      ) {
        A.error(
          errors,
          new Error("Chọn ảnh PNG, JPEG hoặc WebP không quá 5 MB."),
        );
        avatarFile = null;
        avatar.value = "";
      }
      dirty();
    };
    form.onsubmit = (ev) => {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      A.mutate(save, async () => {
        errors.replaceChildren();
        const completed = [];
        try {
          if (phone.value !== p.phone) {
            if (!challenge || sentTo !== phone.value)
              throw new Error(
                "Vui lòng gửi OTP tới số mới và xác thực trước khi lưu.",
              );
            const result = await A.request("/auth/confirm-phone-change", {
              method: "POST",
              body: {
                new_phone: phone.value,
                otp_code: otp.value(),
                challenge_token: challenge.challenge_token,
              },
            });
            acceptTokens(result);
            p.phone = phone.value;
            A.user = result.user;
            challenge = null;
            completed.push("số điện thoại");
          }
          await A.request(`/members/${p.id}`, {
            method: "PUT",
            body: {
              full_name: name.value.trim(),
              email: email.value || null,
              date_of_birth: birth.value || null,
              gender: gender.value === initialGender ? p.gender : gender.value || null,
            },
          });
          completed.push("thông tin hồ sơ");
          if (avatarFile) {
            const dataUrl = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = () =>
                reject(new Error("Không đọc được ảnh đã chọn."));
              reader.readAsDataURL(avatarFile);
            });
            await A.request("/mobile/avatar", {
              method: "POST",
              body: {
                content_base64: dataUrl.split(",")[1],
                mime_type: avatarFile.type,
              },
            });
          }
          A.toast("Đã lưu hồ sơ cá nhân.");
          await A.navigate("account", "profile");
        } catch (error) {
          if (completed.length) error.message = `Đã lưu ${completed.join(", ")}. Phần còn lại chưa lưu: ${error.message}`;
          A.error(errors, error);
          dirty();
        }
      });
    };
  }
  async function settings(root, alive) {
    const p = await A.request("/mobile/preferences");
    if (!alive()) return;
    const form = document.createElement("form");
    root.append(form);
    const controls = {};
    for (const [key, label] of [
      ["notify_in_app", "Nhận thông báo in-app"],
      ["notify_pt_reminders", "Nhắc lịch PT tự động"],
      ["is_two_factor_enabled", "Xác thực 2 lớp (2FA khi đăng nhập)"],
    ]) {
      if (typeof p[key] !== "boolean")
        throw new Error("Máy chủ chưa cung cấp đầy đủ cài đặt tài khoản.");
      const row = document.createElement("div");
      row.className = "switch-row";
      row.innerHTML = `<label for="${key}">${e(label)}</label><input type="checkbox" role="switch" id="${key}">`;
      controls[key] = row.querySelector("input");
      controls[key].checked = p[key];
      form.append(row);
    }
    const errors = document.createElement("div");
    form.append(errors);
    const save = A.button("Lưu cài đặt", "floppy-disk", "primary");
    save.type = "submit";
    save.disabled = true;
    form.append(save);
    form.onchange = () => {
      save.disabled = !Object.keys(controls).some(
        (k) => controls[k].checked !== p[k],
      );
      save.dataset.keepDisabled = String(save.disabled);
    };
    form.onsubmit = (ev) => {
      ev.preventDefault();
      A.mutate(save, async () => {
        try {
          const body = Object.fromEntries(
            Object.keys(controls).map((k) => [k, controls[k].checked]),
          );
          const stored = await A.request("/mobile/preferences", {
            method: "PUT",
            body,
          });
          Object.assign(p, stored);
          A.toast("Đã lưu cài đặt.");
          save.dataset.keepDisabled = "true";
          save.disabled = true;
        } catch (error) {
          Object.keys(controls).forEach((k) => (controls[k].checked = p[k]));
          save.dataset.keepDisabled = "true";
          A.error(errors, error, () => A.navigate("account", "settings"));
        }
      });
    };
    const change = A.button("Đổi mật khẩu tài khoản", "key");
    change.onclick = changePassword;
    root.append(change);

    const deviceSection = document.createElement("div");
    deviceSection.className = "settings-section device-registry";
    deviceSection.innerHTML =
      '<h3><i class="fa-solid fa-mobile-screen"></i> Thiết bị đã đăng nhập</h3><p class="muted">Danh sách các thiết bị hiện đang duy trì phiên đăng nhập vào tài khoản của bạn.</p><div class="device-list"></div>';
    root.append(deviceSection);
    const deviceList = deviceSection.querySelector(".device-list");

    async function loadSessions() {
      if (!alive()) return;
      try {
        const res = await A.api.auth.getSessions();
        const list = Array.isArray(res?.data) ? res.data : [];
        deviceList.replaceChildren();
        if (!list.length) {
          deviceList.innerHTML =
            '<p class="muted">Chưa có thông tin phiên thiết bị.</p>';
          return;
        }
        list.forEach((s) => {
          const item = document.createElement("div");
          item.className = `device-item ${s.is_current ? "current" : ""}`;
          const icon = /Apple|iPhone|iPad/i.test(s.device_name)
            ? "mobile-screen-button"
            : /Android/i.test(s.device_name)
              ? "mobile"
              : /Windows|Macintosh|Linux/i.test(s.device_name)
                ? "laptop"
                : "globe";
          item.innerHTML = `
            <div class="device-info">
              <div class="device-header">
                <i class="fa-solid fa-${icon}"></i>
                <strong>${e(s.device_name || "Thiết bị không xác định")}</strong>
                ${s.is_current ? '<span class="badge green">Thiết bị hiện tại</span>' : ""}
              </div>
              <p class="muted">
                ${s.ip_address ? `IP: ${e(s.ip_address)} · ` : ""}
                Hoạt động: ${A.time(s.last_active_at)}
              </p>
            </div>
            <div class="device-actions"></div>
          `;
          const actBox = item.querySelector(".device-actions");
          if (s.is_current) {
            const btnCurrent = A.button(
              "Đăng xuất",
              "right-from-bracket",
              "small outline danger",
            );
            btnCurrent.onclick = () =>
              A.dialog("Xác nhận đăng xuất", (content, close) => {
                content.innerHTML =
                  "<p>Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng Paradise Gym trên thiết bị này không? Phiên đăng nhập hiện tại sẽ kết thúc.</p>";
                const row = document.createElement("div");
                row.className = "actions";
                content.append(row);
                const cancel = A.button("Hủy");
                cancel.onclick = close;
                const ok = A.button(
                  "Xác nhận đăng xuất",
                  "right-from-bracket",
                  "danger",
                );
                ok.onclick = () =>
                  A.mutate(ok, async () => {
                    try {
                      await A.api.auth.logoutCurrent();
                    } finally {
                      close();
                      A.expire();
                    }
                  });
                row.append(cancel, ok);
              });
            actBox.append(btnCurrent);
          } else {
            const btnRevoke = A.button(
              "Thu hồi",
              "trash-can",
              "small outline danger",
            );
            btnRevoke.onclick = () =>
              A.dialog("Thu hồi phiên đăng nhập", (content, close) => {
                content.innerHTML = `<p>Bạn có chắc chắn muốn đăng xuất tài khoản khỏi thiết bị <strong>${e(s.device_name || "này")}</strong> không?</p>`;
                const row = document.createElement("div");
                row.className = "actions";
                content.append(row);
                const cancel = A.button("Hủy");
                cancel.onclick = close;
                const ok = A.button("Thu hồi phiên", "trash-can", "danger");
                ok.onclick = () =>
                  A.mutate(ok, async () => {
                    try {
                      await A.api.auth.revokeSession(s.id);
                      close();
                      A.toast("Đã thu hồi phiên thiết bị thành công.");
                      await loadSessions();
                    } catch (err) {
                      A.toast(
                        err.message || "Không thể thu hồi phiên thiết bị.",
                        true,
                      );
                    }
                  });
                row.append(cancel, ok);
              });
            actBox.append(btnRevoke);
          }
          deviceList.append(item);
        });

        const otherSessions = list.filter((s) => !s.is_current);
        if (otherSessions.length > 0) {
          const logoutAllRow = document.createElement("div");
          logoutAllRow.className = "logout-all-wrap";
          const btnLogoutAll = A.button(
            "Đăng xuất khỏi tất cả thiết bị khác",
            "shield-halved",
            "outline danger block",
          );
          btnLogoutAll.onclick = () =>
            A.dialog("Đăng xuất khỏi tất cả thiết bị khác", (content, close) => {
              content.innerHTML =
                "<p>Thao tác này sẽ thu hồi toàn bộ các phiên đăng nhập trên mọi thiết bị (bao gồm thiết bị hiện tại). Bạn sẽ cần đăng nhập lại. Tiếp tục?</p>";
              const row = document.createElement("div");
              row.className = "actions";
              content.append(row);
              const cancel = A.button("Hủy");
              cancel.onclick = close;
              const ok = A.button(
                "Đăng xuất tất cả",
                "right-from-bracket",
                "danger",
              );
              ok.onclick = () =>
                A.mutate(ok, async () => {
                  try {
                    await A.api.auth.logoutAll();
                  } finally {
                    close();
                    A.expire();
                  }
                });
              row.append(cancel, ok);
            });
          logoutAllRow.append(btnLogoutAll);
          deviceList.append(logoutAllRow);
        }
      } catch (err) {
        deviceList.innerHTML = `<p class="muted error">${e(err.message || "Không thể tải danh sách thiết bị.")}</p>`;
      }
    }

    await loadSessions();
  }
  function changePassword() {
    A.dialog("Đổi mật khẩu", (root, close) => {
      const form = document.createElement("form");
      root.append(form);
      const current = password(
          form,
          "Mật khẩu hiện tại",
          "current_password",
          1,
        ),
        next = password(form, "Mật khẩu mới", "new_password"),
        confirm = password(form, "Xác nhận mật khẩu mới", "confirm_password");
      const errors = document.createElement("div");
      form.append(errors);
      const save = A.button("Đổi mật khẩu", "key", "primary");
      save.type = "submit";
      form.append(save);
      form.onsubmit = (ev) => {
        ev.preventDefault();
        if (!form.reportValidity()) return;
        A.mutate(save, async () => {
          try {
            if (next.value !== confirm.value)
              throw new Error("Mật khẩu xác nhận không khớp.");
            acceptTokens(
              await A.request("/auth/change-password", {
                method: "POST",
                body: {
                  current_password: current.value,
                  new_password: next.value,
                },
              }),
            );
            current.value = next.value = confirm.value = "";
            close();
            A.toast("Đã đổi mật khẩu.");
          } catch (error) {
            A.error(errors, error);
          }
        });
      };
    });
  }
  A.modules.auth = { render };
  A.modules.account = { render: account };
  A.authHelpers = { acceptTokens, field, otpControl, challengeStatus };
})();
