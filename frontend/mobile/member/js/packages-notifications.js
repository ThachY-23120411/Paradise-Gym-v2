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
    if (sub === "requests") sub = "invitations";
    const active = ["sale", "invitations", "history"].includes(sub) ? sub : "mine";
    A.heading(
      root,
      active === "history" ? "Lịch sử thanh toán" : (active === "invitations" ? "Lời mời vào Gói" : "Gói của tôi"),
    );
    A.segments(
      root,
      [
        ["mine", "Gói của tôi"],
        ["sale", "Mua gói"],
        ["invitations", "Lời mời vào Gói"],
      ],
      active,
      (id) => A.navigate("packages", id),
    );
    const pane = document.createElement("div");
    root.append(pane);
    A.loading(pane);
    if (active === "sale") return sale(pane, alive);
    if (active === "invitations") return invitations(pane, alive);
    if (active === "history") return history(pane, alive);
    const regs = await A.request("/registrations");
    if (!alive()) return;
    pane.replaceChildren();

    const getGroup = (r) => {
      if (r.status === "FROZEN" || r.is_frozen) return "FROZEN";
      if (["ACTIVE", "SCHEDULED"].includes(r.status)) return "ACTIVE";
      if (r.status === "PENDING_PAYMENT") return "PENDING";
      if (r.status === "CANCELLED") return "CANCELLED";
      return "EXPIRED";
    };

    const allCount = regs.length;
    const activeCount = regs.filter((r) => getGroup(r) === "ACTIVE").length;
    const frozenCount = regs.filter((r) => getGroup(r) === "FROZEN").length;
    const pendingCount = regs.filter((r) => getGroup(r) === "PENDING").length;
    const expiredCount = regs.filter((r) => getGroup(r) === "EXPIRED").length;
    const cancelledCount = regs.filter((r) => getGroup(r) === "CANCELLED").length;

    const filterItems = [
      ["ALL", `Tất cả (${allCount})`],
      ["ACTIVE", `Đang sử dụng (${activeCount})`],
      ["FROZEN", `Đang đóng băng (${frozenCount})`],
      ["PENDING", `Chờ xử lý (${pendingCount})`],
      ["EXPIRED", `Đã hết hạn (${expiredCount})`],
    ];
    if (cancelledCount > 0) {
      filterItems.push(["CANCELLED", `Đã hủy (${cancelledCount})`]);
    }

    if (!filterItems.some(([id]) => id === S.filter)) {
      S.filter = "ACTIVE";
    }

    A.filters(
      pane,
      filterItems,
      S.filter,
      (id) => {
        S.filter = id;
        A.navigate("packages", "mine");
      },
    );

    const list = document.createElement("div");
    list.className = "list";
    pane.append(list);

    const filtered = S.filter === "ALL"
      ? regs
      : regs.filter((r) => getGroup(r) === S.filter);

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
      const isFrozen = r.is_frozen === true || r.status === "FROZEN";
      const isGroup = (r.package_mode_snapshot === 'GROUP_1_N' || r.package_mode === 'GROUP_1_N');
      const isGroupMember = Boolean(r.is_group_member);
      const groupCountHtml = isGroup
        ? `<p>Số lượng thành viên: <strong>${A.value(r.total_group_members || 1)}/${A.value(r.max_group_members || 3)}</strong>${isGroupMember ? ' <span class="badge info" style="font-size:10px;margin-left:4px;">Thành viên nhóm</span>' : ' <span class="badge success" style="font-size:10px;margin-left:4px;">Trưởng nhóm</span>'}</p>`
        : '';
      const statusBadge = isFrozen
        ? '<span class="badge ice">❄️ Đang đóng băng</span>'
        : (expiring ? A.badge("PENDING", "Sắp hết hạn") : A.badge(r.status));
      card.innerHTML = `<div class="row"><h3>${A.value(r.package_name_snapshot)}</h3>${statusBadge}</div><p class="muted">${A.value(r.reg_code)} · ${A.date(r.start_date)}${r.end_date ? " - " + A.date(r.end_date) : ""}</p>${progress(r)}${hasPt(r) ? `<p>PT: ${r.assigned_pt_id ? A.value(r.assigned_pt_name) : "Chưa chọn (Liên hệ Lễ tân)"}</p>` : ""}${groupCountHtml}`;
      list.append(card);
      const row = document.createElement("div");
      row.className = "actions";
      card.append(row);

      const detailBtn = A.button("Chi tiết gói", "circle-info");
      detailBtn.onclick = () => openPackageDetailModal(r);
      row.append(detailBtn);

      const isPaid = r.is_paid || ["ACTIVE", "SCHEDULED"].includes(r.status);

      if (hasPt(r) && !r.assigned_pt_id && ["ACTIVE", "SCHEDULED"].includes(r.status) && isPaid && !isFrozen) {
        const choose = A.button(
          "Chọn PT phụ trách",
          "user-plus",
          "dark",
        );
        choose.onclick = () => openContactReceptionistModal(r);
        row.append(choose);
      }
      if (hasPt(r) && isGroup && !isGroupMember && ["ACTIVE", "SCHEDULED"].includes(r.status) && isPaid && !isFrozen) {
        const inviteBtn = A.button("Mời bạn vào nhóm", "user-group", "primary");
        inviteBtn.onclick = () => openGroupInviteModal(r);
        row.append(inviteBtn);
      }
      if (isFrozen && !isGroupMember) {
        const unfreezeBtn = A.button("Mở đóng băng trước hạn", "sun", "secondary");
        unfreezeBtn.onclick = () => openUnfreezeModal(r);
        row.append(unfreezeBtn);
      } else if (["ACTIVE", "SCHEDULED"].includes(r.status) && !isFrozen && !isGroupMember && isPaid) {
        const freezeBtn = A.button("Đóng băng", "snowflake");
        freezeBtn.onclick = () => openFreezeModal(r);
        row.append(freezeBtn);
      }
      if (r.status === "PENDING_PAYMENT") {
        const pay = A.button("Tiếp tục thanh toán", "qrcode", "primary");
        pay.onclick = () => openPayment(r);
        row.append(pay);
      }
    }
  }

  function openPackageDetailModal(r) {
    const isGroup = (r.package_mode_snapshot === 'GROUP_1_N' || r.package_mode === 'GROUP_1_N');
    A.dialog("Chi tiết gói tập", async (root, close) => {
      A.loading(root);
      try {
        let groupData = null;
        if (isGroup) {
          try {
            groupData = await A.request(`/registrations/${r.id}/group-members`);
          } catch (e) {
            console.warn("Could not load group members", e);
          }
        }
        if (!root.isConnected) return;

        const isFrozen = r.is_frozen === true || r.status === "FROZEN";
        const expiring =
          r.status === "ACTIVE" &&
          r.end_date &&
          Math.ceil(
            (Date.parse(r.end_date) - Date.parse(A.today())) / 86400000,
          ) <= 7;
        const statusBadge = isFrozen
          ? '<span class="badge ice">❄️ Đang đóng băng</span>'
          : (expiring ? A.badge("PENDING", "Sắp hết hạn") : A.badge(r.status));

        let modeText = 'Gym Tiêu Chuẩn';
        if (type(r) === 'COMBO') modeText = 'Combo Gym + PT';
        else if (hasPt(r)) modeText = isGroup ? 'PT Kèm Nhóm (1-Nhiều)' : 'PT Kèm 1-1 Cá nhân';

        root.innerHTML = `
          <div class="package-detail-modal" style="display:flex;flex-direction:column;gap:12px;">
            <div class="row" style="align-items:flex-start;justify-content:space-between;gap:8px;">
              <h3 style="margin:0;font-size:16px;">${A.value(r.package_name_snapshot)}</h3>
              ${statusBadge}
            </div>
            <p class="muted" style="margin:0;">Mã hợp đồng: <strong>${A.value(r.reg_code)}</strong></p>

            ${isFrozen ? `
              <div style="background:#eaf4f9;border:1px solid #c8e1ee;border-radius:8px;padding:10px 12px;font-size:13px;color:#185775;display:flex;align-items:center;gap:8px;">
                <i class="fa-solid fa-snowflake" style="font-size:16px;"></i>
                <span>Gói tập đang trong thời gian đóng băng bảo lưu (hệ thống sẽ tự động kích hoạt lại khi hết thời hạn đóng băng, hoặc bạn có thể mở sớm bất cứ lúc nào). Không thể gia hạn gói khi đang đóng băng.</span>
              </div>
            ` : ''}

            <div class="summary-list" style="background:#f8faf9;border:1px solid #e1e7e4;border-radius:8px;padding:12px;font-size:13px;display:flex;flex-direction:column;gap:6px;">
              <div><span class="muted">Hình thức:</span> <strong>${modeText}</strong></div>
              <div><span class="muted">Hiệu lực:</span> <strong>${A.date(r.start_date)}${r.end_date ? " - " + A.date(r.end_date) : " (Theo buổi vô thời hạn)"}</strong></div>
              ${r.sold_branch_name ? `<div><span class="muted">Chi nhánh:</span> <strong>${A.value(r.sold_branch_name)}</strong></div>` : ""}
              ${hasPt(r) ? `<div><span class="muted">HLV phụ trách:</span> <strong>${r.assigned_pt_id ? A.value(r.assigned_pt_name) : 'Chưa chỉ định'}</strong>${!r.assigned_pt_id ? ' <button type="button" class="button small secondary" id="btnDetailContactPt" style="margin-left:6px;padding:2px 8px;font-size:11px;"><i class="fa-solid fa-headset"></i> Liên hệ Lễ tân</button>' : ''}</div>` : ""}
              ${isGroup ? `<div><span class="muted">Sĩ số nhóm:</span> <strong>${groupData ? groupData.total_current : (r.total_group_members || 1)}/${groupData ? groupData.max_group_members : (r.max_group_members || 3)} học viên</strong></div>` : ""}
            </div>

            <div>
              <h4 style="margin:0 0 6px 0;font-size:14px;">Tiến độ sử dụng</h4>
              <div style="background:#fff;border:1px solid #e1e7e4;border-radius:8px;padding:10px;">
                ${progress(r)}
              </div>
            </div>

            ${isGroup ? `
              <div>
                <div class="row" style="align-items:center;justify-content:space-between;margin-bottom:8px;">
                  <h4 style="margin:0;font-size:14px;">Thành viên trong nhóm</h4>
                  <span class="badge info" style="font-size:11px;">${groupData ? groupData.total_current : (r.total_group_members || 1)}/${groupData ? groupData.max_group_members : (r.max_group_members || 3)} chỗ</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${groupData && groupData.leader ? `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:#eaf5ed;border:1px solid #cce5d6;padding:8px 12px;border-radius:6px;">
                      <div>
                        <strong style="font-size:13px;display:block;">${A.value(groupData.leader.full_name)}</strong>
                        <small class="muted">${A.value(groupData.leader.phone)} · ${A.value(groupData.leader.member_code)}</small>
                      </div>
                      <span class="badge success" style="font-size:10px;">Trưởng nhóm</span>
                    </div>
                  ` : ''}
                  ${groupData && groupData.members && groupData.members.length ? groupData.members.map(m => `
                    <div style="display:flex;align-items:center;justify-content:space-between;background:#f8faf9;border:1px solid #e1e7e4;padding:8px 12px;border-radius:6px;">
                      <div>
                        <strong style="font-size:13px;display:block;">${A.value(m.full_name)}</strong>
                        <small class="muted">${A.value(m.phone)} · ${A.value(m.member_code)}</small>
                      </div>
                      <span class="badge ${m.invitation_status === 'ACCEPTED' ? 'success' : 'warning'}" style="font-size:10px;">
                        ${m.invitation_status === 'ACCEPTED' ? 'Đã tham gia' : 'Chờ xác nhận'}
                      </span>
                    </div>
                  `).join('') : '<p class="muted" style="font-size:12px;margin:4px 0;">Chưa có thành viên nào khác trong nhóm.</p>'}
                </div>
              </div>
            ` : ''}

            <div class="actions" style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;flex-wrap:wrap;">
              <button type="button" class="btn" id="closeDetailModalBtn">Đóng</button>
              ${isFrozen && !r.is_group_member ? `
                <button type="button" class="btn secondary" id="modalUnfreezeBtn"><i class="fa-solid fa-sun"></i> Mở đóng băng gói</button>
              ` : ''}
              ${!isFrozen && isGroup && !r.is_group_member && (!groupData || groupData.available_slots > 0) ? `
                <button type="button" class="btn dark" id="modalInviteMemberBtn"><i class="fa-solid fa-user-plus"></i> Mời bạn</button>
              ` : ''}
              ${!isFrozen && ["ACTIVE", "SCHEDULED"].includes(r.status) && !r.is_group_member && (r.is_paid || ["ACTIVE", "SCHEDULED"].includes(r.status)) ? `
                <button type="button" class="btn secondary" id="modalFreezeBtn"><i class="fa-solid fa-snowflake"></i> Đóng băng gói</button>
              ` : ''}
              ${!isFrozen ? `
                <button type="button" class="btn primary" id="renewPackageBtn"><i class="fa-solid fa-rotate-right"></i> Gia hạn gói</button>
              ` : ''}
            </div>
          </div>
        `;

        root.querySelector("#closeDetailModalBtn").onclick = close;

        const contactPtBtn = root.querySelector("#btnDetailContactPt");
        if (contactPtBtn) {
          contactPtBtn.onclick = () => {
            close();
            openContactReceptionistModal(r);
          };
        }

        const inviteBtn = root.querySelector("#modalInviteMemberBtn");
        if (inviteBtn) {
          inviteBtn.onclick = () => {
            close();
            openGroupInviteModal(r);
          };
        }

        const unfreezeBtn = root.querySelector("#modalUnfreezeBtn");
        if (unfreezeBtn) {
          unfreezeBtn.onclick = () => {
            close();
            openUnfreezeModal(r);
          };
        }

        const freezeBtn = root.querySelector("#modalFreezeBtn");
        if (freezeBtn) {
          freezeBtn.onclick = () => {
            close();
            openFreezeModal(r);
          };
        }

        const renewBtn = root.querySelector("#renewPackageBtn");
        if (renewBtn) {
          renewBtn.onclick = async () => {
            close();
            await renewPackage(r);
          };
        }
      } catch (err) {
        A.error(root, err);
      }
    });
  }

  function openFreezeModal(r) {
    A.dialog("Đóng băng gói tập", (root, close) => {
      root.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <p style="margin:0 0 4px 0;">Gói tập: <strong>${A.value(r.package_name_snapshot)}</strong></p>
            <p class="muted" style="margin:0;">Mã hợp đồng: <strong>${A.value(r.reg_code)}</strong>${r.end_date ? ` · Hạn cũ: <strong>${A.date(r.end_date)}</strong>` : ''}</p>
          </div>

          <div class="field">
            <label for="freezeDaysInput">Số ngày đóng băng <span class="required">*</span></label>
            <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
              <button type="button" class="btn small secondary freeze-preset" data-days="7">7 ngày</button>
              <button type="button" class="btn small secondary freeze-preset" data-days="14">14 ngày</button>
              <button type="button" class="btn small secondary freeze-preset" data-days="30">30 ngày</button>
              <button type="button" class="btn small secondary freeze-preset" data-days="60">60 ngày</button>
            </div>
            <input type="number" id="freezeDaysInput" min="1" max="180" value="14" required style="width:100%;box-sizing:border-box;" />
            <small class="muted">Hạn gói tập sẽ được tự động lùi tương ứng với số ngày đóng băng thực tế.</small>
          </div>

          <div class="field">
            <label for="freezeReasonInput">Lý do đóng băng</label>
            <input type="text" id="freezeReasonInput" placeholder="Ví dụ: Đi công tác, việc cá nhân, sức khỏe..." value="Hội viên chủ động đóng băng gói trên ứng dụng" maxlength="255" style="width:100%;box-sizing:border-box;" />
          </div>

          <div id="freezeError"></div>

          <div class="actions" style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
            <button type="button" class="btn" id="btnCancelFreeze">Hủy</button>
            <button type="button" class="btn primary" id="btnSubmitFreeze"><i class="fa-solid fa-snowflake"></i> Xác nhận đóng băng</button>
          </div>
        </div>
      `;

      const daysInput = root.querySelector("#freezeDaysInput");
      const reasonInput = root.querySelector("#freezeReasonInput");
      const errBox = root.querySelector("#freezeError");
      const cancelBtn = root.querySelector("#btnCancelFreeze");
      const submitBtn = root.querySelector("#btnSubmitFreeze");

      cancelBtn.onclick = close;

      root.querySelectorAll(".freeze-preset").forEach(btn => {
        btn.onclick = () => {
          daysInput.value = btn.getAttribute("data-days");
        };
      });

      submitBtn.onclick = () => A.mutate(submitBtn, async () => {
        const days = parseInt(daysInput.value, 10);
        if (!days || days <= 0) {
          A.error(errBox, new Error("Vui lòng nhập số ngày đóng băng hợp lệ (lớn hơn 0)"));
          return;
        }
        const reason = reasonInput.value.trim() || "Hội viên chủ động đóng băng gói trên ứng dụng";
        try {
          await A.request(`/registrations/${r.id}/freeze`, {
            method: "POST",
            body: { freeze_days: days, reason }
          });
          close();
          A.toast("Đã đóng băng gói tập thành công!");
          S.filter = "FROZEN";
          A.navigate("packages", "mine");
        } catch (e) {
          A.error(errBox, e);
        }
      });
    });
  }

  function openUnfreezeModal(r) {
    A.dialog("Mở đóng băng gói tập trước hạn", (root, close) => {
      root.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div>
            <p style="margin:0 0 4px 0;">Gói tập: <strong>${A.value(r.package_name_snapshot)}</strong></p>
            <p class="muted" style="margin:0;">Mã hợp đồng: <strong>${A.value(r.reg_code)}</strong></p>
          </div>

          <p style="margin:0;font-size:14px;line-height:1.5;">
            Bạn có chắc chắn muốn mở đóng băng gói tập này sớm hơn dự kiến? Gói tập sẽ lập tức được chuyển lại trạng thái Hoạt động để bạn tiếp tục tập luyện. Hạn sử dụng của gói sẽ được tự động tính toán lại theo đúng số ngày đóng băng thực tế (hoàn trả lại những ngày bạn chưa dùng để bảo toàn trọn vẹn quyền lợi).
          </p>

          <div id="unfreezeError"></div>

          <div class="actions" style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
            <button type="button" class="btn" id="btnCancelUnfreeze">Hủy</button>
            <button type="button" class="btn primary" id="btnSubmitUnfreeze"><i class="fa-solid fa-sun"></i> Xác nhận mở</button>
          </div>
        </div>
      `;

      const errBox = root.querySelector("#unfreezeError");
      const cancelBtn = root.querySelector("#btnCancelUnfreeze");
      const submitBtn = root.querySelector("#btnSubmitUnfreeze");

      cancelBtn.onclick = close;

      submitBtn.onclick = () => A.mutate(submitBtn, async () => {
        try {
          await A.request(`/registrations/${r.id}/unfreeze`, {
            method: "POST"
          });
          close();
          A.toast("Đã mở đóng băng gói tập thành công!");
          S.filter = "ACTIVE";
          A.navigate("packages", "mine");
        } catch (e) {
          A.error(errBox, e);
        }
      });
    });
  }

  async function renewPackage(r) {
    if (r.is_frozen || r.status === "FROZEN") {
      A.toast("Gói tập đang đóng băng, không thể gia hạn! Vui lòng mở đóng băng trước.");
      return;
    }
    try {
      if (r.package_id) {
        const p = await A.request(`/packages/${r.package_id}`);
        if (p && p.status === "ACTIVE") {
          buyPackage(p);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not renew directly, navigating to sale", e);
    }
    A.navigate("packages", "sale");
  }

  function openGroupInviteModal(r) {
    A.dialog("Mời bạn bè vào nhóm PT 1-Nhiều", (root, close) => {
      root.innerHTML = `
        <p>Gói: <strong>${A.value(r.package_name_snapshot)}</strong> (${A.value(r.reg_code)})</p>
        <p class="muted">Nhập số điện thoại của bạn bè để gửi lời mời tham gia cùng tập. Lưu ý: Bạn bè cần có gói Gym còn hiệu lực.</p>
        <div class="field">
          <label for="invitePhone">Số điện thoại bạn bè <span class="required">*</span></label>
          <input type="tel" id="invitePhone" placeholder="09xxxxxxxx" required />
        </div>
        <div id="inviteError"></div>
        <div class="actions" style="margin-top:16px;"></div>
      `;
      const phoneInput = root.querySelector("#invitePhone");
      const errBox = root.querySelector("#inviteError");
      const actions = root.querySelector(".actions");

      const cancelBtn = A.button("Hủy");
      cancelBtn.onclick = close;
      const sendBtn = A.button("Gửi lời mời", "paper-plane", "primary");
      sendBtn.onclick = () => A.mutate(sendBtn, async () => {
        const phone = phoneInput.value.trim();
        if (!phone) { A.error(errBox, new Error("Vui lòng nhập số điện thoại")); return; }
        try {
          await A.request(`/registrations/${r.id}/invite-member`, {
            method: "POST",
            body: { phone }
          });
          close();
          A.toast("Đã gửi lời mời tham gia nhóm PT thành công!");
          A.navigate("packages", "mine");
        } catch (err) {
          A.error(errBox, err);
        }
      });
      actions.append(cancelBtn, sendBtn);
    });
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
  function openAvailableVouchersModal(orderAmount, branchId, onSelect) {
    A.dialog("Kho Voucher & Ưu Đãi", async (root, close) => {
      A.loading(root);
      try {
        const discounts = await A.request("/discounts");
        if (!root.isConnected) return;
        root.replaceChildren();

        const todayStr = A.today();
        const activeDiscounts = (discounts || []).filter(d => {
          if (d.is_active === false) return false;
          if (d.start_date && d.start_date > todayStr) return false;
          if (d.end_date && d.end_date < todayStr) return false;
          if (d.usage_limit != null && d.used_count >= d.usage_limit) return false;
          if (branchId) {
            if (d.branch_id && d.branch_id !== branchId) return false;
            if (Array.isArray(d.branch_ids) && d.branch_ids.length > 0 && !d.branch_ids.includes(branchId)) return false;
          }
          return true;
        });

        if (!activeDiscounts.length) {
          A.empty(root, "Hiện chưa có mã giảm giá nào khả dụng cho bạn.");
          return;
        }

        const list = document.createElement("div");
        list.style.cssText = "display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow-y:auto;padding:4px 0;";

        for (const d of activeDiscounts) {
          const card = document.createElement("article");
          card.className = "record";
          card.style.cssText = "border:1px solid #dfe6e2;border-radius:8px;padding:12px;background:#ffffff;";

          const isEligible = !orderAmount || Number(orderAmount) >= Number(d.min_order_value || 0);
          const discountDesc = d.discount_type === 'PERCENT'
            ? `Giảm ${d.discount_value}%${d.max_discount_amount ? ` (Tối đa ${A.money(d.max_discount_amount)})` : ''}`
            : `Giảm ${A.money(d.discount_value)}`;

          card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <div>
                <span class="badge success" style="font-weight:700;letter-spacing:0.5px;font-size:13px;">${A.value(d.code)}</span>
                <h4 style="margin:6px 0 2px 0;font-size:14px;color:var(--ink);">${A.value(d.title)}</h4>
                <p style="margin:0;font-size:13px;color:var(--primary);font-weight:600;">${discountDesc}</p>
              </div>
              <div>
                <button type="button" class="btn small ${isEligible ? 'primary' : 'secondary'}" ${!isEligible ? 'disabled' : ''} style="white-space:nowrap;">
                  ${isEligible ? 'Dùng mã' : 'Chưa đủ ĐK'}
                </button>
              </div>
            </div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px dashed #e5ebe7;display:flex;justify-content:space-between;font-size:11px;color:var(--muted);">
              <span>Đơn tối thiểu: ${A.money(d.min_order_value || 0)}</span>
              <span>HSD: ${A.date(d.end_date)}</span>
            </div>
          `;

          const useBtn = card.querySelector("button");
          if (isEligible) {
            useBtn.onclick = () => {
              close();
              onSelect(d.code);
            };
          }
          list.append(card);
        }
        root.append(list);
      } catch (err) {
        if (root.isConnected) A.error(root, err);
      }
    });
  }

  function buyPackage(p) {
    A.dialog("Mua gói", (root, close) => {
      let appliedDiscount = null;
      const originalPrice = Number(p.price);

      function renderContent() {
        const payablePrice = appliedDiscount ? appliedDiscount.final_amount : originalPrice;
        root.innerHTML = `
          <h3>${A.value(p.package_name)}</h3>
          <div id="buyPriceSection" style="margin:8px 0 12px 0;">
            ${appliedDiscount ? `
              <div style="display:flex;align-items:baseline;gap:8px;">
                <del style="color:#8c9b94;font-size:15px;">${A.money(originalPrice)}</del>
                <span class="price" style="font-size:22px;color:var(--primary);font-weight:700;">${A.money(payablePrice)}</span>
                <span class="badge success" style="font-size:11px;">Giảm ${A.money(appliedDiscount.discount_amount)}</span>
              </div>
            ` : `
              <p class="price" style="margin:0;">${A.money(originalPrice)}</p>
            `}
          </div>

          <p class="muted" style="margin:0 0 12px 0;font-size:13px;">
            Hình thức thanh toán: <strong>Chuyển khoản Ngân hàng (VietQR)</strong>
          </p>

          <div class="voucher-box" style="margin:12px 0;padding:12px;background:#f7faf8;border:1px dashed #237b58;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <label style="font-weight:600;font-size:13px;margin:0;color:#185740;">
                <i class="fa-solid fa-ticket" style="margin-right:4px;"></i> Mã giảm giá / Voucher
              </label>
              <button type="button" id="btnPickVoucher" class="btn text small" style="padding:2px 6px;color:var(--primary);font-size:12px;cursor:pointer;background:none;border:none;">
                <i class="fa-solid fa-list-check"></i> Chọn voucher
              </button>
            </div>
            ${appliedDiscount ? `
              <div style="background:#eaf4ee;border:1px solid #c0d8cb;border-radius:6px;padding:8px 10px;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <i class="fa-solid fa-circle-check" style="color:var(--primary);margin-right:4px;"></i>
                  <span>Đã áp dụng: <strong>${appliedDiscount.code}</strong> (-${A.money(appliedDiscount.discount_amount)})</span>
                </div>
                <button type="button" id="btnClearVoucher" class="btn text small" style="color:#c0392b;cursor:pointer;padding:2px 6px;background:none;border:none;font-size:12px;">
                  <i class="fa-solid fa-xmark"></i> Bỏ mã
                </button>
              </div>
            ` : `
              <div style="display:flex;gap:6px;">
                <input type="text" id="buyVoucherInput" placeholder="Nhập mã voucher (ví dụ: SUMMER2026)" style="text-transform:uppercase;flex:1;padding:8px 10px;border:1px solid #c8d6cf;border-radius:6px;font-size:13px;" />
                <button type="button" class="btn primary" id="btnApplyVoucher" style="padding:8px 14px;white-space:nowrap;font-size:13px;">Áp dụng</button>
              </div>
            `}
            <div id="buyVoucherMsg" style="margin-top:6px;font-size:12px;"></div>
          </div>

          <div id="buyErrorBox"></div>
          <div style="margin-top:16px;">
            <button type="button" class="btn primary block" id="btnProceedBuy">
              <i class="fa-solid fa-qrcode"></i> Tiếp tục thanh toán (${A.money(payablePrice)})
            </button>
          </div>
        `;

        const vInput = root.querySelector("#buyVoucherInput");
        const applyBtn = root.querySelector("#btnApplyVoucher");
        const pickBtn = root.querySelector("#btnPickVoucher");
        const clearBtn = root.querySelector("#btnClearVoucher");
        const msgBox = root.querySelector("#buyVoucherMsg");
        const errBox = root.querySelector("#buyErrorBox");
        const proceedBtn = root.querySelector("#btnProceedBuy");

        if (pickBtn) {
          pickBtn.onclick = () => {
            openAvailableVouchersModal(originalPrice, A.user?.home_branch_id, (chosenCode) => {
              validateAndApplyVoucher(chosenCode);
            });
          };
        }

        if (applyBtn && vInput) {
          applyBtn.onclick = () => {
            const code = vInput.value.trim().toUpperCase();
            if (!code) {
              msgBox.innerHTML = '<span style="color:#c0392b;">Vui lòng nhập mã giảm giá</span>';
              return;
            }
            validateAndApplyVoucher(code);
          };
        }

        if (clearBtn) {
          clearBtn.onclick = () => {
            appliedDiscount = null;
            renderContent();
          };
        }

        async function validateAndApplyVoucher(code) {
          try {
            msgBox.innerHTML = '<span class="muted"><i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra mã...</span>';
            const val = await A.request("/discounts/validate", {
              method: "POST",
              body: {
                code,
                order_amount: originalPrice,
                branch_id: A.user?.home_branch_id
              }
            });
            appliedDiscount = val;
            renderContent();
            A.toast(`Đã áp dụng mã giảm giá ${code}!`);
          } catch (err) {
            msgBox.innerHTML = `<span style="color:#c0392b;">${err.message || 'Mã giảm giá không hợp lệ'}</span>`;
          }
        }

        proceedBtn.onclick = () => A.mutate(proceedBtn, async () => {
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
            openPayment(reg, appliedDiscount?.code);
          } catch (error) {
            A.error(errBox, error);
          }
        });
      }

      renderContent();
    });
  }

  function openPayment(reg, initialDiscountCode) {
    A.dialog("Thanh toán VietQR", async (root, close) => {
      A.loading(root);

      async function loadInvoice(discountCode, clearDiscount = false) {
        const body = {
          registration_id: reg.id,
          payment_method: "BANK_TRANSFER"
        };
        if (clearDiscount) {
          body.clear_discount = true;
        } else if (discountCode) {
          body.discount_code = discountCode;
        }
        return await A.request("/payments/create-invoice", {
          method: "POST",
          body
        });
      }

      let invoice;
      try {
        invoice = await loadInvoice(initialDiscountCode);
      } catch (err) {
        if (root.isConnected) {
          A.error(root, err, () => {
            close();
            openPayment(reg, initialDiscountCode);
          });
        }
        return;
      }

      function render(inv) {
        if (!root.isConnected) return;
        invoice = inv;
        const qr = invoice.qr_data || invoice.vietqr;
        const pmt = invoice.payment;
        const regSnap = invoice.registration || reg;
        const originalPrice = Number(regSnap.price_snapshot || pmt.amount + (pmt.discount_amount || 0));
        const hasDiscount = Boolean(pmt.discount_id && pmt.discount_amount > 0);

        root.innerHTML = `
          <h3>${A.value(regSnap.package_name_snapshot || reg.package_name_snapshot)}</h3>
          <div style="margin:8px 0;">
            ${hasDiscount ? `
              <div style="display:flex;align-items:baseline;gap:8px;">
                <del style="color:#8c9b94;font-size:15px;">${A.money(originalPrice)}</del>
                <span class="price" style="font-size:24px;color:var(--primary);font-weight:700;">${A.money(pmt.amount)}</span>
                <span class="badge success" style="font-size:12px;">Giảm ${A.money(pmt.discount_amount)}</span>
              </div>
            ` : `
              <p class="price" style="margin:0;font-size:24px;color:var(--primary);font-weight:700;">${A.money(pmt.amount)}</p>
            `}
          </div>

          <p class="muted" style="margin:0 0 10px 0;font-size:13px;">Chuyển khoản Ngân hàng (VietQR)</p>

          <!-- VOUCHER SECTION IN PAYMENT MODAL -->
          <div class="voucher-box" style="margin:10px 0 14px 0;padding:10px 12px;background:#f7faf8;border:1px dashed #237b58;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label style="font-weight:600;font-size:13px;margin:0;color:#185740;">
                <i class="fa-solid fa-ticket" style="margin-right:4px;"></i> ${hasDiscount ? 'Mã giảm giá đã áp dụng' : 'Áp dụng mã giảm giá / Voucher'}
              </label>
              <button type="button" id="btnPickPaymentVoucher" class="btn text small" style="padding:2px 6px;color:var(--primary);font-size:12px;cursor:pointer;background:none;border:none;">
                <i class="fa-solid fa-list-check"></i> Chọn voucher
              </button>
            </div>
            ${hasDiscount ? `
              <div style="background:#eaf4ee;border:1px solid #c0d8cb;border-radius:6px;padding:6px 10px;font-size:13px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <i class="fa-solid fa-circle-check" style="color:var(--primary);margin-right:4px;"></i>
                  <span>Mã: <strong>${pmt.discount_code || 'VOUCHER'}</strong> (-${A.money(pmt.discount_amount)})</span>
                </div>
                <button type="button" id="btnClearPaymentVoucher" class="btn text small" style="color:#c0392b;cursor:pointer;padding:2px 6px;background:none;border:none;font-size:12px;">
                  <i class="fa-solid fa-xmark"></i> Bỏ mã
                </button>
              </div>
            ` : `
              <div style="display:flex;gap:6px;">
                <input type="text" id="paymentVoucherInput" placeholder="Nhập mã voucher (ví dụ: SUMMER2026)" style="text-transform:uppercase;flex:1;padding:8px 10px;border:1px solid #c8d6cf;border-radius:6px;font-size:13px;" />
                <button type="button" class="btn primary" id="btnApplyPaymentVoucher" style="padding:8px 14px;white-space:nowrap;font-size:13px;">Áp dụng</button>
              </div>
            `}
            <div id="paymentVoucherMsg" style="margin-top:6px;font-size:12px;"></div>
          </div>

          <div id="qrContainer"></div>
          <div id="paymentSummary"></div>
          <div id="paymentActions" class="actions" style="margin-top:12px;"></div>
          <div id="paymentStatus" class="notice warning" style="margin-top:12px;">Đang chờ xác nhận thanh toán từ hệ thống.</div>
          <div id="paymentCheckAction" style="margin-top:12px;"></div>
        `;

        // Render QR
        const qrContainer = root.querySelector("#qrContainer");
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
          qrContainer.append(img);
        } else {
          const notice = document.createElement("div");
          notice.className = "notice warning";
          notice.textContent = "Chưa có thông tin VietQR từ máy chủ. Giao dịch đang chờ xử lý.";
          qrContainer.append(notice);
        }

        // Summary details
        const paymentSummary = root.querySelector("#paymentSummary");
        paymentSummary.innerHTML = A.summary([
          ["Ngân hàng", qr?.bankName || qr?.bankBin],
          ["Số tài khoản", qr?.accountNo],
          ["Chủ tài khoản", qr?.accountName],
          ["Số tiền", A.money(pmt.amount)],
          ["Nội dung chuyển khoản", qr?.transferContent],
        ]);

        // Copy actions
        const actions = root.querySelector("#paymentActions");
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

        // Voucher handlers in payment modal
        const pickVoucherBtn = root.querySelector("#btnPickPaymentVoucher");
        const applyVoucherBtn = root.querySelector("#btnApplyPaymentVoucher");
        const clearVoucherBtn = root.querySelector("#btnClearPaymentVoucher");
        const voucherInput = root.querySelector("#paymentVoucherInput");
        const voucherMsg = root.querySelector("#paymentVoucherMsg");

        if (pickVoucherBtn) {
          pickVoucherBtn.onclick = () => {
            openAvailableVouchersModal(originalPrice, regSnap.sold_branch_id || A.user?.home_branch_id, (code) => {
              applyCodeToInvoice(code);
            });
          };
        }

        if (applyVoucherBtn && voucherInput) {
          applyVoucherBtn.onclick = () => {
            const code = voucherInput.value.trim().toUpperCase();
            if (!code) {
              voucherMsg.innerHTML = '<span style="color:#c0392b;">Vui lòng nhập mã giảm giá</span>';
              return;
            }
            applyCodeToInvoice(code);
          };
        }

        if (clearVoucherBtn) {
          clearVoucherBtn.onclick = () => A.mutate(clearVoucherBtn, async () => {
            try {
              const updated = await loadInvoice(null, true);
              A.toast("Đã bỏ mã giảm giá.");
              render(updated);
            } catch (err) {
              voucherMsg.innerHTML = `<span style="color:#c0392b;">${err.message || 'Lỗi khi bỏ mã'}</span>`;
            }
          });
        }

        async function applyCodeToInvoice(code) {
          try {
            voucherMsg.innerHTML = '<span class="muted"><i class="fa-solid fa-spinner fa-spin"></i> Đang áp dụng mã...</span>';
            const updated = await loadInvoice(code);
            A.toast(`Đã áp dụng mã giảm giá ${code}!`);
            render(updated);
          } catch (err) {
            voucherMsg.innerHTML = `<span style="color:#c0392b;">${err.message || 'Mã giảm giá không hợp lệ'}</span>`;
          }
        }

        // Verification check
        const checkAction = root.querySelector("#paymentCheckAction");
        const statusEl = root.querySelector("#paymentStatus");
        const check = A.button("Tôi đã chuyển khoản", "rotate-right", "primary block");
        checkAction.append(check);

        check.onclick = () =>
          A.mutate(check, async () => {
            try {
              // Tự động mô phỏng thanh toán VietQR thành công để phục vụ test tiện lợi
              let p;
              try {
                const sim = await A.request(`/payments/${pmt.id}/simulate-transfer`, { method: "POST" });
                p = sim?.payment;
              } catch (simErr) {
                console.warn("simulate-transfer error:", simErr);
              }
              if (!p) {
                p = await A.request(`/payments/${pmt.id}`);
              }

              if (p && p.status === "COMPLETED") {
                statusEl.className = "notice success";
                statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> <strong>Thanh toán thành công!</strong> Gói tập đã được kích hoạt.';
                check.disabled = true;
                check.style.display = "none";
                const go = A.button("Đến Gói của tôi", "ticket", "primary block");
                go.onclick = () => {
                  close();
                  A.navigate("packages", "mine");
                };
                checkAction.append(go);
                A.toast("Thanh toán thành công! Gói tập đã được kích hoạt.");
              } else {
                statusEl.className = "notice warning";
                statusEl.textContent =
                  p.status === "EXPIRED"
                    ? "Giao dịch đã hết hạn. Vui lòng kiểm tra với lễ tân."
                    : "Giao dịch vẫn đang chờ hệ thống xác nhận. Vui lòng kiểm tra lại sau.";
              }
            } catch (error) {
              A.error(statusEl, error);
            }
          });
      }

      render(invoice);
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
  async function payments(root, sub, alive) {
    const active = ["pending", "history"].includes(sub) ? sub : "history";
    A.heading(root, "Thanh toán");
    A.segments(
      root,
      [
        ["history", "Lịch sử thanh toán"],
        ["pending", "Chờ thanh toán"],
      ],
      active,
      (id) => A.navigate("payments", id),
    );

    const pane = document.createElement("div");
    root.append(pane);
    A.loading(pane);

    if (active === "pending") {
      const regs = await A.request("/registrations?status=PENDING_PAYMENT");
      if (!alive()) return;
      pane.replaceChildren();
      const list = document.createElement("div");
      list.className = "list";
      pane.append(list);
      const pendingRegs = Array.isArray(regs)
        ? regs.filter((r) => r.status === "PENDING_PAYMENT")
        : [];
      if (!pendingRegs.length) {
        A.empty(list, "Bạn không có đơn đăng ký nào đang chờ thanh toán.");
        return;
      }
      for (const r of pendingRegs) {
        const card = document.createElement("article");
        card.className = "record";
        card.innerHTML = `
          <div class="row">
            <h3>${A.value(r.package_name_snapshot)}</h3>
            <strong class="price">${A.money(r.price_snapshot)}</strong>
          </div>
          <p class="muted">Mã ĐK: <strong>${A.value(r.reg_code)}</strong> · Ngày tạo: ${A.date(r.created_at || r.start_date)}</p>
          <p>${A.badge("PENDING_PAYMENT", "Chờ thanh toán 100%")}</p>
        `;
        const actions = document.createElement("div");
        actions.className = "actions";
        const payBtn = A.button("Thanh toán ngay (VietQR)", "qrcode", "primary");
        payBtn.onclick = () => openPayment(r);
        actions.append(payBtn);
        card.append(actions);
        list.append(card);
      }
      return;
    }

    await history(pane, alive, false);
  }
  function openContactReceptionistModal(r) {
    A.dialog("Chọn PT phụ trách", async (root, close) => {
      A.loading(root);
      try {
        const branches = await A.request("/branches?status=ACTIVE");
        if (!root.isConnected) return;
        const branch = (branches || []).find((b) => b.id === r.sold_branch_id) || {
          branch_name: r.sold_branch_name || "Phòng tập Paradise Gym",
          phone: "02838221111",
          address: "Số 123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM",
        };
        const branchPhone = branch.phone || "02838221111";

        root.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:14px;padding:4px 0;">
            <div style="text-align:center;padding:14px;background:#f0f9f4;border:1px solid #cce5d6;border-radius:12px;">
              <div style="width:52px;height:52px;border-radius:50%;background:#237b58;color:#fff;display:inline-grid;place-items:center;font-size:22px;margin:0 auto 8px auto;">
                <i class="fa-solid fa-headset"></i>
              </div>
              <h3 style="margin:0 0 6px 0;font-size:16px;color:#1d2939;">Liên Hệ Lễ Tân Chi Nhánh</h3>
              <p style="margin:0;font-size:13px;color:#475467;line-height:1.5;">
                Để đảm bảo chất lượng huấn luyện và sắp xếp lịch tập phù hợp nhất với thể trạng & mục tiêu của bạn, việc phân công Huấn luyện viên phụ trách sẽ do Lễ tân chi nhánh trực tiếp hỗ trợ.
              </p>
            </div>

            <div style="background:#fff;border:1px solid #e4e7ec;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;font-size:13px;">
              <div><span class="muted">Gói tập:</span> <strong>${A.value(r.package_name_snapshot || r.package_name)}</strong></div>
              <div><span class="muted">Mã hợp đồng:</span> <strong>${A.value(r.reg_code)}</strong></div>
              <div><span class="muted">Cơ sở tập luyện:</span> <strong>${A.value(branch.branch_name)}</strong></div>
              ${branch.address ? `<div><span class="muted">Địa chỉ:</span> <span>${A.value(branch.address)}</span></div>` : ""}
              <div><span class="muted">Số điện thoại Lễ tân:</span> <strong style="color:#237b58;font-size:14px;">${A.value(branchPhone)}</strong></div>
            </div>

            <div style="background:#fcfcfd;border:1px dashed #d0d5dd;border-radius:8px;padding:10px;font-size:12px;color:#475467;">
              <i class="fa-solid fa-circle-info" style="color:#237b58;"></i> Quý hội viên vui lòng liên hệ trực tiếp quầy Lễ tân chi nhánh hoặc gọi vào số điện thoại bên dưới để tiến hành chọn PT phụ trách.
            </div>

            <div class="row" style="gap:8px;margin-top:4px;">
              <a href="tel:${branchPhone}" class="button primary" style="flex:1;text-align:center;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 14px;">
                <i class="fa-solid fa-phone"></i> Gọi Lễ tân (${A.value(branchPhone)})
              </a>
              <button type="button" class="button dark" id="btnCloseContact" style="padding:10px 16px;">Đóng</button>
            </div>
          </div>
        `;
        const btnClose = root.querySelector("#btnCloseContact");
        if (btnClose) btnClose.onclick = () => close();
      } catch (err) {
        if (root.isConnected) A.error(root, err, close);
      }
    });
  }

  async function invitations(root, alive) {
    S.inviteTab = S.inviteTab || "received";
    S.inviteFilter = S.inviteFilter || "ALL";

    root.replaceChildren();

    const switchNav = document.createElement("div");
    switchNav.style.marginBottom = "14px";
    root.append(switchNav);

    A.segments(
      switchNav,
      [
        ["received", "Lời mời tôi nhận"],
        ["sent", "Lời mời tôi gửi"],
      ],
      S.inviteTab,
      (tabId) => {
        S.inviteTab = tabId;
        S.inviteFilter = "ALL";
        invitations(root, alive);
      },
    );

    const contentPane = document.createElement("div");
    root.append(contentPane);
    A.loading(contentPane);

    let list = [];
    try {
      list = await A.request(`/group-invitations?type=${S.inviteTab}`);
    } catch (err) {
      if (!alive()) return;
      A.error(contentPane, err, () => invitations(root, alive));
      return;
    }
    if (!alive()) return;
    contentPane.replaceChildren();

    const isSent = S.inviteTab === "sent";

    const title = document.createElement("h2");
    title.textContent = isSent
      ? `Lời mời đã gửi (${list.length})`
      : `Lời mời nhận được (${list.length})`;
    contentPane.append(title);

    const pendingCount = list.filter((i) => i.invitation_status === "PENDING").length;
    const acceptedCount = list.filter((i) => i.invitation_status === "ACCEPTED").length;
    const rejectedCount = list.filter((i) => i.invitation_status === "REJECTED").length;

    A.filters(
      contentPane,
      [
        ["ALL", `Tất cả (${list.length})`],
        ["PENDING", `${isSent ? "Chờ phản hồi" : "Chờ chấp thuận"} (${pendingCount})`],
        ["ACCEPTED", `Đã tham gia (${acceptedCount})`],
        ["REJECTED", `Đã từ chối (${rejectedCount})`],
      ],
      S.inviteFilter,
      (id) => {
        S.inviteFilter = id;
        invitations(root, alive);
      },
    );

    const container = document.createElement("div");
    container.className = "list";
    contentPane.append(container);

    const filtered = list.filter((i) => {
      if (S.inviteFilter === "ALL") return true;
      return i.invitation_status === S.inviteFilter;
    });

    if (!filtered.length) {
      A.empty(
        container,
        isSent
          ? "Bạn chưa gửi lời mời vào nhóm tập nào ở trạng thái này."
          : "Bạn không có lời mời vào gói tập nào ở trạng thái này.",
      );
      return;
    }

    for (const inv of filtered) {
      const card = document.createElement("article");
      card.className = "record";

      let statusBadge = "";
      if (inv.invitation_status === "PENDING") {
        statusBadge = `<span class="badge warning"><i class="fa-solid fa-clock"></i> ${isSent ? "Chờ phản hồi" : "Chờ chấp thuận"}</span>`;
      } else if (inv.invitation_status === "ACCEPTED") {
        statusBadge = '<span class="badge success"><i class="fa-solid fa-circle-check"></i> Đã tham gia</span>';
      } else {
        statusBadge = '<span class="badge danger"><i class="fa-solid fa-circle-xmark"></i> Đã từ chối</span>';
      }

      if (isSent) {
        card.innerHTML = `
          <div class="row" style="align-items:flex-start;justify-content:space-between;gap:8px;">
            <div>
              <h3 style="margin:0 0 4px 0;">${A.value(inv.package_name_snapshot)}</h3>
              <p class="muted" style="margin:0;font-size:12px;">Mã hợp đồng: <strong>${A.value(inv.reg_code)}</strong> · PT Nhóm (1-N)</p>
            </div>
            ${statusBadge}
          </div>

          <div style="background:#f8faf9;border:1px solid #e1e7e4;border-radius:8px;padding:10px 12px;margin:8px 0;font-size:13px;display:flex;flex-direction:column;gap:5px;">
            <div><span class="muted">Người nhận (Học viên được mời):</span> <strong>${A.value(inv.friend_name)}</strong> (${A.value(inv.friend_phone)}${inv.friend_code ? " · " + A.value(inv.friend_code) : ""})</div>
            <div><span class="muted">Số buổi PT của gói:</span> <strong>${A.value(inv.total_pt_sessions_snapshot || 0)} buổi</strong></div>
            <div><span class="muted">Chi nhánh:</span> <strong>${A.value(inv.branch_name)}</strong></div>
            <div><span class="muted">Thời gian gửi lời mời:</span> <span>${A.time(inv.created_at)}</span></div>
            ${inv.joined_at ? `<div><span class="muted">Thời gian tham gia:</span> <span>${A.time(inv.joined_at)}</span></div>` : ""}
          </div>
        `;

        const actions = document.createElement("div");
        actions.className = "actions";
        card.append(actions);

        if (inv.invitation_status === "PENDING") {
          const revokeBtn = A.button("Thu hồi lời mời", "rotate-left", "dark");
          revokeBtn.onclick = () =>
            A.dialog("Thu hồi lời mời", (body, end) => {
              body.innerHTML = `
                <h3>Thu hồi lời mời</h3>
                <p>Bạn có chắc chắn muốn thu hồi lời mời gửi tới học viên <strong>${A.value(inv.friend_name)}</strong> cho gói <strong>${A.value(inv.package_name_snapshot)}</strong> không?</p>
                <div class="notice">
                  <i class="fa-solid fa-circle-info"></i> Sau khi thu hồi, vị trí trống trong nhóm PT sẽ được giải phóng để bạn có thể mời bạn bè khác.
                </div>
              `;
              const errBox = document.createElement("div");
              body.append(errBox);
              const yesBtn = A.button("Xác nhận thu hồi", "trash", "danger");
              body.append(yesBtn);
              yesBtn.onclick = () =>
                A.mutate(yesBtn, async () => {
                  try {
                    await A.request(`/group-invitations/${inv.id}`, { method: "DELETE" });
                    end();
                    A.toast("Đã thu hồi lời mời thành công.");
                    invitations(root, alive);
                  } catch (error) {
                    A.error(errBox, error);
                  }
                });
            });
          actions.append(revokeBtn);
        } else if (inv.invitation_status === "ACCEPTED") {
          const viewPkgBtn = A.button("Xem gói trong Gói của tôi", "arrow-right", "primary");
          viewPkgBtn.onclick = () => A.navigate("packages", "mine");
          actions.append(viewPkgBtn);
        }
      } else {
        card.innerHTML = `
          <div class="row" style="align-items:flex-start;justify-content:space-between;gap:8px;">
            <div>
              <h3 style="margin:0 0 4px 0;">${A.value(inv.package_name_snapshot)}</h3>
              <p class="muted" style="margin:0;font-size:12px;">Mã hợp đồng: <strong>${A.value(inv.reg_code)}</strong> · PT Nhóm (1-N)</p>
            </div>
            ${statusBadge}
          </div>

          <div style="background:#f8faf9;border:1px solid #e1e7e4;border-radius:8px;padding:10px 12px;margin:8px 0;font-size:13px;display:flex;flex-direction:column;gap:5px;">
            <div><span class="muted">Người mời (Trưởng nhóm):</span> <strong>${A.value(inv.inviter_name)}</strong> (${A.value(inv.inviter_phone)})</div>
            <div><span class="muted">Số buổi PT của gói:</span> <strong>${A.value(inv.total_pt_sessions_snapshot || 0)} buổi</strong></div>
            <div><span class="muted">Chi nhánh:</span> <strong>${A.value(inv.branch_name)}</strong></div>
            ${inv.assigned_pt_name ? `<div><span class="muted">HLV phụ trách:</span> <strong>${A.value(inv.assigned_pt_name)}</strong></div>` : `<div><span class="muted">HLV phụ trách:</span> <span class="muted">Chưa chỉ định</span></div>`}
            <div><span class="muted">Ngày gửi lời mời:</span> <span>${A.time(inv.created_at)}</span></div>
          </div>
        `;

        const actions = document.createElement("div");
        actions.className = "actions";
        card.append(actions);

        if (inv.invitation_status === "PENDING") {
          const acceptBtn = A.button("Chấp thuận", "check", "primary");
          acceptBtn.onclick = () =>
            A.dialog("Xác nhận tham gia nhóm PT", (body, end) => {
              body.innerHTML = `
                <h3>Tham gia gói ${A.value(inv.package_name_snapshot)}</h3>
                <p>Trưởng nhóm: <strong>${A.value(inv.inviter_name)}</strong> (${A.value(inv.inviter_phone)})</p>
                <div class="notice">
                  <i class="fa-solid fa-circle-info"></i> Để tham gia gói tập PT nhóm, bạn cần sở hữu một gói Gym còn hạn sử dụng tại phòng tập. Lịch tập luyện sẽ do Trưởng nhóm đại diện sắp xếp với HLV.
                </div>
              `;
              const errBox = document.createElement("div");
              body.append(errBox);
              const confirmBtn = A.button("Xác nhận tham gia", "check", "primary");
              body.append(confirmBtn);
              confirmBtn.onclick = () =>
                A.mutate(confirmBtn, async () => {
                  try {
                    await A.request(`/group-invitations/${inv.id}/respond`, {
                      method: "POST",
                      body: { action: "ACCEPT" },
                    });
                    end();
                    A.toast("Bạn đã tham gia nhóm PT thành công!");
                    await A.navigate("packages", "mine");
                  } catch (error) {
                    if (error && (error.code === "GYM_REQUIRED" || String(error.message).includes("gói Gym"))) {
                      errBox.innerHTML = `
                        <div class="notice danger" style="margin-top:8px;">
                          <p style="margin:0 0 6px 0;"><strong>Chưa có gói Gym hợp lệ:</strong> Bạn cần có gói Gym đang hoạt động để có thể vào phòng tập cùng nhóm PT.</p>
                          <button type="button" class="button primary" id="btnBuyGymNow" style="padding:6px 12px;font-size:12px;">
                            <i class="fa-solid fa-cart-plus"></i> Xem và mua gói Gym ngay
                          </button>
                        </div>
                      `;
                      const btnBuy = errBox.querySelector("#btnBuyGymNow");
                      if (btnBuy) {
                        btnBuy.onclick = () => {
                          end();
                          A.navigate("packages", "sale");
                        };
                      }
                    } else {
                      A.error(errBox, error);
                    }
                  }
                });
            });
          actions.append(acceptBtn);

          const rejectBtn = A.button("Từ chối", "xmark", "dark");
          rejectBtn.onclick = () =>
            A.dialog("Từ chối lời mời", (body, end) => {
              body.innerHTML = `
                <h3>Từ chối lời mời</h3>
                <p>Bạn có chắc chắn muốn từ chối lời mời tham gia gói <strong>${A.value(inv.package_name_snapshot)}</strong> từ <strong>${A.value(inv.inviter_name)}</strong> không?</p>
              `;
              const errBox = document.createElement("div");
              body.append(errBox);
              const yesBtn = A.button("Xác nhận từ chối", "trash", "danger");
              body.append(yesBtn);
              yesBtn.onclick = () =>
                A.mutate(yesBtn, async () => {
                  try {
                    await A.request(`/group-invitations/${inv.id}/respond`, {
                      method: "POST",
                      body: { action: "REJECT" },
                    });
                    end();
                    A.toast("Đã từ chối lời mời.");
                    invitations(root, alive);
                  } catch (error) {
                    A.error(errBox, error);
                  }
                });
            });
          actions.append(rejectBtn);
        } else if (inv.invitation_status === "ACCEPTED") {
          const viewPkgBtn = A.button("Xem gói của tôi", "arrow-right", "primary");
          viewPkgBtn.onclick = () => A.navigate("packages", "mine");
          actions.append(viewPkgBtn);
        }
      }
      container.append(card);
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
          if (A.updateUnreadNotifications) A.updateUnreadNotifications();
        });
    }
  }
  A.modules.packages = { render: packages };
  A.modules.payments = { render: payments };
  A.modules.notifications = { render: notifications };
})();
