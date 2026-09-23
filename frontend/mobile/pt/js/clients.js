/**
 * ==========================================================================
 * PARADISE GYM - MOBILE PT APP
 * MODULE PT02: QUẢN LÝ HỌC VIÊN (CLIENTS MANAGEMENT)
 * ==========================================================================
 * - PT02-US01: Danh sách học viên phụ trách, tìm kiếm realtime, thẻ học viên,
 *              tiến độ buổi tập (Progress Bar). Tuyệt đối không hiển thị công nợ.
 * - PT02-US02: Màn hình Chi tiết lộ trình & Lịch sử tập luyện của học viên,
 *              thanh tiến độ, timeline buổi tập kèm ghi chú & đánh giá thể lực PT.
 * - PT02-US03: Lịch sử yêu cầu phân công chỉ đọc.
 * ==========================================================================
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ParadisePTClients = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const escapeHtml = value => $('<span>').text(value ?? '').html();
  const readRows = res => Array.isArray(res?.data) ? res.data : (res?.data?.items || []);
  // State cục bộ của module Clients (PT02)
  const ClientsState = {
    currentTab: 'members', // 'members' (Học viên phụ trách) | 'packages' (Gói đang phụ trách) | 'community_classes' (Lớp tập CĐ phụ trách)
    searchQuery: '',
    selectedClientId: null,
    selectedMemberId: null,
    navigationSource: 'members', // 'members' | 'packages'
    isLoading: false,
    hasError: false,

    // Dữ liệu hợp đồng gói tập phụ trách & Lớp cộng đồng (tải động 100% từ Database PostgreSQL)
    clients: [],
    assignmentRequests: [],
    communityClasses: []
  };

  /**
   * Helper trích xuất danh sách Học viên duy nhất (Unique Members)
   * CHỈ chứa các gói mà PT hiện tại phụ trách
   */
  function getUniqueAssignedMembers() {
    const currentPtId = window.ptApp?.currentUser?.pt_profile_id;
    const map = new Map();
    ClientsState.clients.forEach(pkg => {
      if (pkg.assignedPtId && currentPtId && pkg.assignedPtId !== currentPtId) return;
      const memberId = pkg.memberId || pkg.id;
      if (!map.has(memberId)) {
        map.set(memberId, {
          id: memberId,
          memberId: memberId,
          code: pkg.code,
          fullName: pkg.fullName,
          phone: pkg.phone,
          branchName: pkg.branchName,
          avatarBg: pkg.avatarBg || 'var(--primary-light)',
          registrationStatus: pkg.registrationStatus,
          packages: []
        });
      }
      const member = map.get(memberId);
      member.packages.push(pkg);
      if (pkg.registrationStatus === 'ACTIVE') {
        member.registrationStatus = 'ACTIVE';
      }
    });

    return Array.from(map.values()).map(m => {
      const totalRemaining = m.packages.reduce((sum, p) => sum + (p.remainingSessions || 0), 0);
      const totalSessions = m.packages.reduce((sum, p) => sum + (p.totalSessions || 0), 0);
      const totalCompleted = m.packages.reduce((sum, p) => sum + (p.completedSessions || 0), 0);
      const hasExpiring = m.packages.some(p => p.isExpiring);
      return {
        ...m,
        totalRemainingSessions: totalRemaining,
        totalSessions: totalSessions,
        completedSessions: totalCompleted,
        isExpiring: hasExpiring
      };
    });
  }

  /**
   * Helper trích xuất 2 chữ cái đầu của họ tên làm Avatar
   */
  function registrationLabel(status) {
    return {ACTIVE:'Đang hoạt động',SCHEDULED:'Chưa bắt đầu',FROZEN:'Đang đóng băng',EXPIRED:'Đã kết thúc'}[status] || status || 'Chưa xác định';
  }

  function getInitials(fullName) {
    if (!fullName) return 'HV';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Helper định dạng số điện thoại theo nhóm dễ đọc.
   */
  function formatPhone(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 10) {
      return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
    }
    return phone;
  }

  /**
   * Dùng cùng kết quả sắp hết hạn từ API với Web và Hội viên.
   */
  function isExpiringSoon(client) {
    return client.isExpiring === true;
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  /**
   * Helper định dạng ngày giờ DD/MM/YYYY HH:mm
   */
  function formatDateTimeDisplay(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${mins}`;
      }
    } catch (e) {}
    return dateStr;
  }

  /**
   * Helper định dạng số tiền VNĐ
   */
  function formatVnd(val) {
    const n = Math.round(Number(val) || 0);
    return n.toLocaleString('vi-VN');
  }

  /**
   * Tải danh sách học viên phụ trách từ Backend Database PostgreSQL
   */
  async function fetchClientsData() {
    if (!window.apiClient || !window.ptApp?.currentUser?.pt_profile_id) return;

    try {
      ClientsState.isLoading = true;
      ClientsState.hasError = false;
      renderContentList();

      const currentPtId = window.ptApp.currentUser.pt_profile_id;

      // 1. Fetch Registrations, Bookings, Assignment Requests, Members & Community Classes từ PostgreSQL
      const [regsRes, bookingsRes, requestsRes, membersRes, classesRes] = await Promise.all([
        window.apiClient.registrations?.list(),
        window.apiClient.pt?.listBookings(currentPtId ? { pt_id: currentPtId } : {}),
        window.apiClient.pt?.listAssignmentRequests?.(currentPtId ? { pt_id: currentPtId } : {}),
        window.apiClient.members?.list({limit:1000}),
        currentPtId ? window.apiClient.request(`/community-classes?instructor_id=${currentPtId}`) : Promise.resolve({ data: [] })
      ]);

      if (window.ptApp?.currentUser?.pt_profile_id !== currentPtId) return;
      const regs = readRows(regsRes);
      const bookings = readRows(bookingsRes);
      const rawRequests = readRows(requestsRes);
      const membersList = readRows(membersRes);
      const rawClasses = readRows(classesRes);
      ClientsState.communityClasses = Array.isArray(rawClasses) ? rawClasses : (Array.isArray(classesRes?.data) ? classesRes.data : (Array.isArray(classesRes) ? classesRes : []));

      // Filter các đăng ký có buổi PT thuộc quyền phụ trách của PT hiện tại
      const ptRegs = regs.filter(r => {
        const hasPt = (r.total_pt_sessions && r.total_pt_sessions > 0) ||
                      (r.total_pt_sessions_snapshot && r.total_pt_sessions_snapshot > 0) ||
                      r.package_type === 'PT' || r.package_type === 'COMBO' ||
                      r.package_type_snapshot === 'PT_SESSION' || r.package_type_snapshot === 'COMBO';
        const isAssigned = r.assigned_pt_id === currentPtId;
        return hasPt && isAssigned && ['ACTIVE', 'SCHEDULED', 'FROZEN', 'EXPIRED'].includes(r.status);
      });

      const clientMap = new Map();

      ptRegs.forEach(reg => {
        const memberId = reg.member_id || reg.id;
        const memberObj = membersList.find(m => m.id === memberId);
        const memberBookings = bookings.filter(b => b.registration_id === reg.id && b.pt_id === currentPtId);

        // Lọc CHỈ các buổi tập đã hoàn thành (COMPLETED hoặc DONE) cho timeline lộ trình
        const completedBookings = memberBookings.filter(b => b.status === 'COMPLETED' || b.status === 'DONE');
        completedBookings.sort((a, b) => new Date(b.booking_date) - new Date(a.booking_date));

        const completedCount = completedBookings.length;
        const total = reg.total_pt_sessions_snapshot ?? reg.total_pt_sessions ?? 0;
        const used = reg.used_pt_sessions !== undefined ? reg.used_pt_sessions : completedCount;
        const remaining = reg.remaining_pt_sessions !== undefined ? reg.remaining_pt_sessions : Math.max(0, total - used - (reg.booked_pt_sessions || 0));
        
        // Buổi tập hoàn thành gần nhất
        const lastCompletedBooking = completedBookings[0];

        const memberCode = reg.member_code || memberObj?.member_code || (memberBookings.find(b => b.member_code)?.member_code) || 'HV';
        const memberPhone = reg.member_phone || memberObj?.phone || '';
        const memberName = reg.member_name || memberObj?.full_name || 'Hội viên';
        const branchName = reg.sold_branch_name || memberObj?.home_branch_name || reg.branch_name || 'Chưa cập nhật';

        const clientObj = {
          id: memberId,
          code: memberCode,
          fullName: memberName,
          phone: memberPhone,
          branchName: branchName,
          packageName: reg.package_name || reg.package_name_snapshot || 'Chưa cập nhật',
          expiryDate: reg.end_date ? formatDateDisplay(reg.end_date) : 'Không giới hạn',
          registrationStatus: reg.status,
          isExpiring: reg.is_expiring === true,
          bookedSessions: reg.booked_pt_sessions,
          totalSessions: total,
          completedSessions: used,
          remainingSessions: remaining,
          lastSessionDate: lastCompletedBooking ? formatDateDisplay(lastCompletedBooking.booking_date) : '-',
          avatarBg: 'var(--primary-light)',
          assignedPtId: reg.assigned_pt_id,
          sessions: completedBookings.map((b, bIdx) => ({
            sessionNumber: b.session_number || '-',
            date: formatDateDisplay(b.booking_date),
            timeSlot: `${b.start_time ? b.start_time.slice(0, 5) : '--'} - ${b.end_time ? b.end_time.slice(0, 5) : '--'}`,
            status: 'DONE',
            notes: b.workout_notes || b.notes || 'Chưa có ghi chú',
            fitnessAssessment: b.fitness_assessment || 'Chưa có đánh giá'
          }))
        };

        clientMap.set(reg.id, { ...clientObj, id: reg.id, memberId });
      });

      ClientsState.clients = Array.from(clientMap.values());

      // 2. Map Assignment Requests cho PT
      ClientsState.assignmentRequests = rawRequests.filter(r => r.pt_id === currentPtId).map(r => {
        const reg = regs.find(rg => rg.id === r.registration_id);
        const member = membersList.find(m => m.id === r.member_id);
        return {
          id: r.id,
          registrationId: r.registration_id,
          studentName: r.member_name || member?.full_name || 'Hội viên',
          studentCode: r.member_code || member?.member_code || 'HV',
          phone: r.member_phone || member?.phone || '',
          branchName: reg?.sold_branch_name || member?.home_branch_name || r.branch_name || 'Chưa cập nhật',
          packageName: r.package_name || r.package_name_snapshot || reg?.package_name_snapshot || reg?.package_name || 'Chưa cập nhật',
          requestedAt: r.requested_at ? formatDateTimeDisplay(r.requested_at) : 'Chưa cập nhật',
          requestDate: r.requested_at ? formatDateDisplay(r.requested_at) : 'Chưa cập nhật',
          note: r.request_note || '',
          notes: r.request_note || '',
          status: r.status,
          avatarBg: 'var(--accent-warning-bg)'
        };
      });

      ClientsState.isLoading = false;
      renderContentList();
      updateBadges();
    } catch (err) {
      console.warn('Error loading PT clients from backend:', err);
      ClientsState.isLoading = false;
      ClientsState.hasError = true;
      renderContentList();
      showToast('Lỗi kết nối mạng: Không thể nạp danh sách học viên. Vui lòng thử lại.', 'error');
    }
  }

  /**
   * Khởi tạo giao diện phân hệ PT02 vào vùng container
   */
  async function init(containerEl) {
    if (!containerEl) {
      containerEl = document.getElementById('clientsViewContainer') || document.getElementById('viewClients');
    }
    if (!containerEl) return;

    renderLayout(containerEl);
    bindEvents(containerEl);
    updateBadges();
  }

  /**
   * Vẽ khung layout chính cho màn hình PT02
   */
  /**
   * Vẽ khung layout chính cho màn hình PT02 - Gói phụ trách
   */
  function renderLayout(containerEl) {
    const uniqueMembers = getUniqueAssignedMembers();
    const membersCount = uniqueMembers.length;
    const packagesCount = ClientsState.clients.length;
    const communityClassesCount = ClientsState.communityClasses.length;

    const searchPlaceholder = ClientsState.currentTab === 'members'
      ? 'Tìm học viên được phân công...'
      : (ClientsState.currentTab === 'packages' ? 'Tìm gói tập, học viên phụ trách...' : 'Tìm lớp tập cộng đồng phụ trách...');

    containerEl.innerHTML = `
      <div class="pt-clients-module">
        <!-- Header Thanh tìm kiếm realtime (PT02-US01) -->
        <div class="pt-clients-search-bar">
          <div class="pt-search-input-wrap">
            <i class="fa-solid fa-magnifying-glass search-icon"></i>
            <input 
              type="text" 
              id="ptClientsSearchInput" 
              class="pt-search-input" 
              placeholder="${searchPlaceholder}" 
              value="${escapeHtml(ClientsState.searchQuery)}"
              autocomplete="off"
            />
            <button type="button" id="ptClientsSearchClear" class="pt-search-clear-btn" style="display: ${ClientsState.searchQuery ? 'flex' : 'none'};">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        <!-- Bộ chuyển phân loại 3 tab: Học viên phụ trách, Gói đang phụ trách & Lớp tập CĐ phụ trách -->
        <div class="pt-clients-tabs">
          <button type="button" class="pt-tab-btn ${ClientsState.currentTab === 'members' ? 'active' : ''}" data-tab="members" id="tabBtnMembers">
            <span>Học viên phụ trách</span>
            <span class="pt-tab-count" id="membersCountBadge">(${membersCount})</span>
          </button>
          <button type="button" class="pt-tab-btn ${ClientsState.currentTab === 'packages' || ClientsState.currentTab === 'assigned' ? 'active' : ''}" data-tab="packages" id="tabBtnPackages">
            <span>Gói đang phụ trách</span>
            <span class="pt-tab-count" id="packagesCountBadge">(${packagesCount})</span>
          </button>
          <button type="button" class="pt-tab-btn ${ClientsState.currentTab === 'community_classes' ? 'active' : ''}" data-tab="community_classes" id="tabBtnCommunityClasses">
            <span>Lớp tập CĐ phụ trách</span>
            <span class="pt-tab-count" id="communityClassesCountBadge">(${communityClassesCount})</span>
          </button>
          <!-- Nút tương thích ngược cho test automation cũ -->
          <button type="button" id="tabBtnAssigned" style="display:none;" data-tab="packages"></button>
        </div>

        <!-- Vùng danh sách nội dung thay đổi theo Tab -->
        <div class="pt-clients-content" id="ptClientsContentList">
          ${renderContentListHtml()}
        </div>

        <!-- Màn hình phụ 1: Danh sách các gói của học viên (Tab 1 drill-down) -->
        <div class="pt-subscreen" id="memberPackagesSubscreen" style="display: none;"></div>

        <!-- Màn hình phụ 2: Chi tiết lộ trình & Lịch sử tập luyện (PT02-US02) -->
        <div class="pt-subscreen" id="clientDetailSubscreen" style="display: none;"></div>

      </div>
    `;
  }

  /**
   * Helper render một thẻ gói tập chi tiết (Dùng cho cả Tab Gói đang phụ trách và Màn hình Gói của học viên)
   */
  function renderPackageCard(client, source) {
    const initials = getInitials(client.fullName);
    const isExpiring = isExpiringSoon(client);
    const percent = client.totalSessions > 0 ? Math.round((client.completedSessions / client.totalSessions) * 100) : 0;

    return `
      <div class="pt-client-card" role="button" tabindex="0" onclick="ParadisePTClients.openClientDetail('${client.id}', '${source}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
        <!-- Top Row: Avatar, Tên, Mã & Phone, Badge trạng thái -->
        <div class="pt-card-top">
          <div class="pt-avatar" style="background: ${client.avatarBg};">
            ${escapeHtml(initials)}
          </div>
          <div class="pt-client-meta">
            <div class="pt-client-name">${escapeHtml(client.fullName)}</div>
            <div class="pt-client-subinfo">
              <span class="pt-badge-code">${escapeHtml(client.code)}</span>
              <span class="pt-divider-dot">·</span>
              <span class="pt-phone-text">${formatPhone(client.phone)}</span>
            </div>
          </div>
          <div class="pt-status-badge-wrap">
            ${isExpiring ? `
              <span class="pt-badge-warning">
                <i class="fa-solid fa-triangle-exclamation"></i> Sắp hết hạn
              </span>
            ` : `
              <span class="pt-badge-active">
                <i class="fa-solid fa-circle-check"></i> ${escapeHtml(registrationLabel(client.registrationStatus))}
              </span>
            `}
          </div>
        </div>

        <!-- Package info -->
        <div class="pt-card-package">
          <i class="fa-solid fa-cube pt-pkg-icon"></i>
          <span class="pt-pkg-name">${escapeHtml(client.packageName)}</span>
          <span class="pt-divider-dot">·</span>
          <span class="pt-pkg-exp">HSD: ${client.expiryDate}</span>
        </div>

        <!-- Key Metrics Row: Buổi PT còn lại | Lần cuối -->
        <div class="pt-card-stats-grid">
          <div class="pt-stat-box">
            <div class="pt-stat-label">Buổi PT còn lại</div>
            <div class="pt-stat-val highlight">
              <strong>${client.remainingSessions}</strong> <span class="unit">Buổi PT</span>
            </div>
          </div>
          <div class="pt-stat-box">
            <div class="pt-stat-label">Lần cuối</div>
            <div class="pt-stat-val">${client.lastSessionDate || '-'}</div>
          </div>
        </div>

        <!-- Progress Bar (Lộ trình tập luyện) -->
        <div class="pt-card-progress-wrap">
          <div class="pt-progress-header">
            <span class="pt-progress-text">Đã tập <strong>${client.completedSessions} / ${client.totalSessions}</strong> buổi</span>
            <span class="pt-progress-percent">${percent}%</span>
          </div>
          <div class="pt-progress-track">
            <div class="pt-progress-fill" style="width: ${percent}%;"></div>
          </div>
          <div class="pt-booked-tag">
            Đã đặt: ${client.bookedSessions ?? '--'} buổi
          </div>
        </div>

        <!-- Footer action link -->
        <div class="pt-card-footer">
          <span class="pt-view-roadmap-link">
            Xem lộ trình & lịch sử tập
            <i class="fa-solid fa-chevron-right link-icon"></i>
          </span>
        </div>
      </div>
    `;
  }

  /**
   * TAB 1: Render danh sách Học viên phụ trách (Unique Members)
   * Mỗi học viên chỉ xuất hiện đúng 1 dòng dù có nhiều gói PT
   */
  function renderAssignedMembersList() {
    let uniqueMembers = getUniqueAssignedMembers();
    const query = ClientsState.searchQuery.trim().toLowerCase();

    if (query) {
      uniqueMembers = uniqueMembers.filter(m => {
        const nameMatch = m.fullName.toLowerCase().includes(query);
        const phoneMatch = m.phone.includes(query) || formatPhone(m.phone).includes(query);
        const codeMatch = m.code.toLowerCase().includes(query);
        return nameMatch || phoneMatch || codeMatch;
      });
    }

    if (uniqueMembers.length === 0) {
      return `
        <div class="pt-empty-state">
          <div class="pt-empty-icon">
            <i class="fa-solid fa-users-slash"></i>
          </div>
          <div class="pt-empty-title">${query ? 'Không tìm thấy học viên phù hợp' : 'Chưa có học viên nào được phân công'}</div>
          <div class="pt-empty-desc">${query ? 'Thử tìm kiếm với tên hoặc số điện thoại khác.' : 'Khi có học viên mới được phân công, thông tin sẽ hiển thị tại đây.'}</div>
        </div>
      `;
    }

    return `
      <div class="pt-client-cards-list">
        ${uniqueMembers.map(member => {
          const initials = getInitials(member.fullName);
          const pkgCount = member.packages.length;
          const isExpiring = member.isExpiring;

          return `
            <div class="pt-client-card pt-member-summary-card" role="button" tabindex="0" onclick="ParadisePTClients.openMemberPackages('${member.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click();}">
              <!-- Top Row: Avatar, Tên, Mã & Phone, Badge trạng thái -->
              <div class="pt-card-top">
                <div class="pt-avatar" style="background: ${member.avatarBg};">
                  ${escapeHtml(initials)}
                </div>
                <div class="pt-client-meta">
                  <div class="pt-client-name">${escapeHtml(member.fullName)}</div>
                  <div class="pt-client-subinfo">
                    <span class="pt-badge-code">${escapeHtml(member.code)}</span>
                    <span class="pt-divider-dot">·</span>
                    <span class="pt-phone-text">${formatPhone(member.phone)}</span>
                  </div>
                </div>
                <div class="pt-status-badge-wrap">
                  ${isExpiring ? `
                    <span class="pt-badge-warning">
                      <i class="fa-solid fa-triangle-exclamation"></i> Sắp hết hạn
                    </span>
                  ` : `
                    <span class="pt-badge-active">
                      <i class="fa-solid fa-circle-check"></i> ${escapeHtml(registrationLabel(member.registrationStatus))}
                    </span>
                  `}
                </div>
              </div>

              <!-- Package count & summary -->
              <div class="pt-card-package" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <span class="pt-pkg-pill-badge">
                  <i class="fa-solid fa-boxes-stacked"></i> ${pkgCount} gói PT đang phụ trách
                </span>
                <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">
                  Tổng còn: <strong style="color: #237b58;">${member.totalRemainingSessions} buổi</strong>
                </span>
              </div>

              <!-- Footer action link -->
              <div class="pt-card-footer" style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px dashed var(--border-color); margin-top: 10px;">
                <span style="font-size: 12px; color: #237b58; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;">
                  <i class="fa-solid fa-list-ul"></i> Xem danh sách các gói đang tập
                </span>
                <i class="fa-solid fa-chevron-right" style="color: #237b58; font-size: 12px;"></i>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * TAB 2: Render danh sách Gói đang phụ trách (Danh sách từng hợp đồng)
   */
  function renderAssignedPackagesList() {
    let filtered = ClientsState.clients;
    const query = ClientsState.searchQuery.trim().toLowerCase();

    if (query) {
      filtered = filtered.filter(c => {
        const nameMatch = c.fullName.toLowerCase().includes(query);
        const phoneMatch = c.phone.includes(query) || formatPhone(c.phone).includes(query);
        const codeMatch = c.code.toLowerCase().includes(query);
        const pkgMatch = (c.packageName || '').toLowerCase().includes(query);
        return nameMatch || phoneMatch || codeMatch || pkgMatch;
      });
    }

    if (filtered.length === 0) {
      return `
        <div class="pt-empty-state">
          <div class="pt-empty-icon">
            <i class="fa-solid fa-boxes-stacked"></i>
          </div>
          <div class="pt-empty-title">${query ? 'Không tìm thấy gói tập phù hợp' : 'Chưa có gói tập nào được phân công'}</div>
          <div class="pt-empty-desc">${query ? 'Thử tìm kiếm với tên học viên hoặc tên gói khác.' : 'Khi có hợp đồng gói tập mới được phân công, thông tin sẽ hiển thị tại đây.'}</div>
        </div>
      `;
    }

    return `
      <div class="pt-client-cards-list">
        ${filtered.map(client => renderPackageCard(client, 'packages')).join('')}
      </div>
    `;
  }

  /**
   * Mở Màn hình Danh sách các gói của một Học viên (Drill-down từ Tab 1)
   * CHỈ liệt kê các gói của học viên đó mà PT hiện tại đang phụ trách
   */
  function openMemberPackages(memberId) {
    const uniqueMembers = getUniqueAssignedMembers();
    const member = uniqueMembers.find(m => m.id === memberId || m.memberId === memberId);
    if (!member) {
      window.ptApp?.showToast('Học viên không còn trong phạm vi phụ trách.', 'warning');
      return;
    }
    ClientsState.selectedMemberId = memberId;
    ClientsState.navigationSource = 'members';

    const subscreen = document.getElementById('memberPackagesSubscreen');
    if (!subscreen) return;

    renderMemberPackagesSubscreen(subscreen, member);
    subscreen.style.display = 'flex';
  }

  /**
   * Đóng Màn hình Danh sách các gói của Học viên
   */
  function closeMemberPackages() {
    const subscreen = document.getElementById('memberPackagesSubscreen');
    if (subscreen) {
      subscreen.style.display = 'none';
      subscreen.innerHTML = '';
    }
    ClientsState.selectedMemberId = null;
    ClientsState.navigationSource = null;
  }

  /**
   * Vẽ nội dung Màn hình Danh sách các gói của Học viên
   */
  function renderMemberPackagesSubscreen(subscreen, member) {
    const initials = getInitials(member.fullName);
    subscreen.innerHTML = `
      <div class="pt-detail-view-inner">
        <!-- Top Navigation Bar: Nút Quay lại [←] và Tiêu đề -->
        <div class="pt-subscreen-header">
          <button type="button" class="pt-back-btn" title="Quay lại danh sách học viên" aria-label="Quay lại danh sách học viên" onclick="ParadisePTClients.closeMemberPackages()">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div class="pt-subscreen-title">Gói tập của học viên</div>
          <div class="pt-subscreen-action">
            <a href="tel:${member.phone}" class="pt-phone-call-btn" title="Gọi điện cho học viên">
              <i class="fa-solid fa-phone"></i>
            </a>
          </div>
        </div>

        <div class="pt-subscreen-scrollable">
          <!-- Mini Profile Card của Học viên -->
          <div class="pt-member-info-banner" style="background: var(--bg-card); padding: 14px 16px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 14px; display: flex; align-items: center; gap: 14px;">
            <div class="pt-avatar large" style="background: ${member.avatarBg}; width: 46px; height: 46px; font-size: 17px; font-weight: 700; flex-shrink: 0;">
              ${escapeHtml(initials)}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 800; font-size: 16px; color: var(--text-main); line-height: 1.3;">${escapeHtml(member.fullName)}</div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 3px; display: flex; gap: 8px; align-items: center;">
                <span class="pt-badge-code">${escapeHtml(member.code)}</span>
                <span>·</span>
                <span>${formatPhone(member.phone)}</span>
              </div>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                <i class="fa-solid fa-building-circle-check" style="color: #237b58;"></i> ${escapeHtml(member.branchName)}
              </div>
            </div>
          </div>

          <!-- Section title -->
          <div style="margin-bottom: 12px; padding: 0 2px;">
            <div style="font-size: 14px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-boxes-stacked" style="color: #237b58;"></i> Các gói PT đang phụ trách (${member.packages.length})
            </div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
              Bấm vào từng gói để xem lộ trình & tiến độ chi tiết
            </div>
          </div>

          <!-- Danh sách các gói tập mà PT này phụ trách cho học viên -->
          <div class="pt-client-cards-list">
            ${member.packages.map(pkg => renderPackageCard(pkg, 'members')).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render danh sách Thẻ yêu cầu phân công PT (PT02-US03)
   */
  function renderAssignmentRequestsList() {
    let requests = ClientsState.assignmentRequests || [];
    const query = ClientsState.searchQuery.trim().toLowerCase();

    if (query) {
      requests = requests.filter(req => {
        const nameMatch = (req.studentName || '').toLowerCase().includes(query);
        const phoneMatch = (req.phone || '').includes(query) || formatPhone(req.phone || '').includes(query);
        const codeMatch = (req.studentCode || '').toLowerCase().includes(query);
        const pkgMatch = (req.packageName || '').toLowerCase().includes(query);
        const branchMatch = (req.branchName || '').toLowerCase().includes(query);
        return nameMatch || phoneMatch || codeMatch || pkgMatch || branchMatch;
      });
    }

    if (requests.length === 0) {
      return `
        <div class="pt-empty-state">
          <div class="pt-empty-icon success-glow">
            <i class="fa-solid fa-clipboard-check"></i>
          </div>
          <div class="pt-empty-title">${query ? 'Không tìm thấy yêu cầu phù hợp' : 'Chưa có yêu cầu phụ trách nào'}</div>
          <div class="pt-empty-desc">${query ? 'Thử tìm kiếm với từ khóa khác.' : 'Khi có yêu cầu phụ trách mới hoặc lịch sử phân công, thông tin sẽ hiển thị tại đây.'}</div>
        </div>
      `;
    }

    return `
      <div class="pt-request-cards-list">
        ${requests.map(req => {
          const initials = getInitials(req.studentName);
          return `
            <div class="pt-request-card" id="req-card-${req.id}">
              <div class="pt-card-top">
                <div class="pt-avatar" style="background: ${req.avatarBg};">
                  ${escapeHtml(initials)}
                </div>
                <div class="pt-client-meta">
                  <div class="pt-client-name">${escapeHtml(req.studentName)}</div>
                  <div class="pt-client-subinfo">
                    <span class="pt-badge-code">${escapeHtml(req.studentCode)}</span>
                    <span class="pt-divider-dot">·</span>
                    <span class="pt-phone-text">${formatPhone(req.phone)}</span>
                  </div>
                </div>
                <span class="pt-badge-pending">${escapeHtml({PENDING:'Yêu cầu cũ chưa xử lý',ACCEPTED:'Đã tiếp nhận',REJECTED:'Đã từ chối',CANCELLED:'Đã hủy'}[req.status] || req.status)}</span>
              </div>

              <div class="pt-req-detail-rows">
                <div class="pt-req-row">
                  <i class="fa-solid fa-location-dot pt-row-icon"></i>
                  <span>${escapeHtml(req.branchName)}</span>
                </div>
                <div class="pt-req-row">
                  <i class="fa-solid fa-dumbbell pt-row-icon"></i>
                  <span class="pt-highlight-text">${escapeHtml(req.packageName)}</span>
                </div>
                <div class="pt-req-row">
                  <i class="fa-regular fa-clock pt-row-icon"></i>
                  <span class="pt-time-text">Gửi lúc: ${req.requestedAt}</span>
                </div>
                ${req.note ? `
                  <div class="pt-req-note-box">
                    <i class="fa-solid fa-quote-left"></i>
                    <span>${escapeHtml(req.note)}</span>
                  </div>
                ` : ''}
              </div>

            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Mở Màn hình Chi tiết lộ trình & Lịch sử tập luyện của học viên (PT02-US02)
   */
  function openClientDetail(clientId, source) {
    if (source) {
      ClientsState.navigationSource = source;
    }
    const client = ClientsState.clients.find(c => c.id === clientId || c.memberId === clientId);
    if (!client) { window.ptApp?.showToast('Hồ sơ không còn trong phạm vi phụ trách.', 'warning'); return; }

    ClientsState.selectedClientId = clientId;
    const subscreen = document.getElementById('clientDetailSubscreen');
    if (!subscreen) return;

    if (ClientsState.navigationSource === 'members') {
      const pkgSubscreen = document.getElementById('memberPackagesSubscreen');
      if (pkgSubscreen) pkgSubscreen.style.display = 'none';
    }

    const initials = getInitials(client.fullName);
    const percent = client.totalSessions > 0 ? Math.round((client.completedSessions / client.totalSessions) * 100) : 0;
    const isExpiring = isExpiringSoon(client);

    subscreen.innerHTML = `
      <div class="pt-detail-view-inner">
        <!-- Top Navigation Bar: Nút Quay lại [←] và Tiêu đề -->
        <div class="pt-subscreen-header">
          <button type="button" class="pt-back-btn" title="Quay lại danh sách" aria-label="Quay lại danh sách" onclick="ParadisePTClients.closeClientDetail()">
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <div class="pt-subscreen-title">Lộ trình tập luyện</div>
          <div class="pt-subscreen-action">
            <a href="tel:${client.phone}" class="pt-phone-call-btn" title="Gọi điện cho học viên">
              <i class="fa-solid fa-phone"></i>
            </a>
          </div>
        </div>

        <div class="pt-subscreen-scrollable">
          <!-- Khối thông tin hồ sơ học viên & gói tập -->
          <div class="pt-detail-profile-card">
            <div class="pt-profile-header">
              <div class="pt-avatar large" style="background: ${client.avatarBg};">
                ${escapeHtml(initials)}
              </div>
              <div class="pt-profile-info">
                <div class="pt-profile-name">${escapeHtml(client.fullName)}</div>
                <div class="pt-profile-meta">
                  <span>${escapeHtml(client.code)}</span>
                  <span class="pt-divider-dot">·</span>
                  <span>${formatPhone(client.phone)}</span>
                </div>
                <div class="pt-profile-branch">
                  <i class="fa-solid fa-building-circle-check"></i> ${escapeHtml(client.branchName)}
                </div>
              </div>
            </div>

            <div class="pt-profile-package-box">
              <div class="pt-pkg-title-row">
                <span class="pt-pkg-badge-title">${escapeHtml(client.packageName)}</span>
                ${isExpiring ? `<span class="pt-badge-warning-mini">Sắp hết hạn</span>` : `<span class="pt-badge-active-mini" >${escapeHtml(registrationLabel(client.registrationStatus))}</span>`}
              </div>
              <div class="pt-pkg-stats-row">
                <div class="pt-pkg-stat">
                  <span class="label">Tổng số buổi:</span>
                  <span class="val">${client.totalSessions} buổi</span>
                </div>
                <div class="pt-pkg-stat">
                  <span class="label">Hạn sử dụng:</span>
                  <span class="val">${client.expiryDate}</span>
                </div>
              </div>
            </div>

            <!-- THANH TIẾN ĐỘ LỘ TRÌNH TẬP LUYỆN (Progress Bar) -->
            <div class="pt-roadmap-progress-wrap">
              <div class="pt-roadmap-labels">
                <span class="pt-roadmap-summary">Đã tập <strong>${client.completedSessions} / ${client.totalSessions}</strong> buổi</span>
                <span class="pt-roadmap-remain">Còn lại <strong>${client.remainingSessions}</strong> buổi</span>
              </div>
              <div class="pt-progress-track large">
                <div class="pt-progress-fill" style="width: ${percent}%;"></div>
              </div>
              <div class="pt-roadmap-percent-indicator">Tiến độ hoàn thành: <strong>${percent}%</strong> · Đã đặt: ${client.bookedSessions ?? '--'} buổi</div>
            </div>
          </div>

          <!-- Dải thẻ lịch sử từng buổi tập đã hoàn thành (Session History Timeline) -->
          <div class="pt-history-section">
            <div class="pt-history-header">
              <div class="pt-history-title">
                <i class="fa-solid fa-list-check"></i>
                <span>Lịch sử các buổi đã hoàn thành (${client.sessions ? client.sessions.length : 0})</span>
              </div>
            </div>

            ${(!client.sessions || client.sessions.length === 0) ? `
              <!-- Empty state khi học viên mới chưa hoàn thành buổi nào -->
              <div class="pt-empty-history-card">
                <div class="empty-hist-icon">
                  <i class="fa-regular fa-calendar-xmark"></i>
                </div>
                <div class="empty-hist-title">Học viên chưa có buổi tập hoàn thành nào trong lộ trình</div>
                <div class="empty-hist-desc">Tiến độ hiện tại là 0 / ${client.totalSessions} buổi. Khi bạn và học viên hoàn tất buổi tập đầu tiên, đánh giá của PT sẽ được ghi nhận tại đây.</div>
              </div>
            ` : `
              <div class="pt-session-timeline">
                ${client.sessions.map((sess, idx) => `
                  <div class="pt-timeline-item">
                    <div class="pt-timeline-marker">
                      <div class="pt-marker-dot"></div>
                      ${idx < client.sessions.length - 1 ? `<div class="pt-marker-line"></div>` : ''}
                    </div>
                    <div class="pt-timeline-card">
                      <div class="pt-timeline-card-head">
                        <div class="pt-session-badge">Buổi ${sess.sessionNumber}</div>
                        <div class="pt-session-time">
                          <i class="fa-regular fa-calendar"></i> ${sess.date}
                          <span class="pt-divider-dot">·</span>
                          <i class="fa-regular fa-clock"></i> ${sess.timeSlot}
                        </div>
                        <span class="pt-session-status-done">
                          <i class="fa-solid fa-check"></i> Hoàn thành
                        </span>
                      </div>

                      <div class="pt-timeline-card-body">
                        <div class="pt-assessment-block">
                          <div class="block-title">
                            <i class="fa-solid fa-user-check"></i> Đánh giá của PT:
                          </div>
                          <div class="block-content">${escapeHtml([sess.notes, sess.fitnessAssessment].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') || 'Chưa có đánh giá')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    subscreen.style.display = 'flex';
  }

  /**
   * Đóng Màn hình Chi tiết lộ trình (Hỗ trợ điều hướng ngược về đúng màn hình trước đó)
   */
  function closeClientDetail() {
    const subscreen = document.getElementById('clientDetailSubscreen');
    if (subscreen) {
      subscreen.style.display = 'none';
      subscreen.innerHTML = '';
    }
    ClientsState.selectedClientId = null;
    // Nếu mở từ danh sách gói của học viên (Tab 1), quay lại màn hình danh sách gói của học viên đó
    if (ClientsState.navigationSource === 'members') {
      const pkgSubscreen = document.getElementById('memberPackagesSubscreen');
      if (pkgSubscreen) {
        pkgSubscreen.style.display = 'flex';
      }
    }
  }

  /**
   * Lọc danh sách lớp học cộng đồng theo từ khóa tìm kiếm
   */
  function getFilteredCommunityClasses() {
    let list = ClientsState.communityClasses || [];
    const q = ClientsState.searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(c => {
      const title = (c.title || '').toLowerCase();
      const disc = (c.discipline_name || '').toLowerCase();
      const branch = (c.branch_name || '').toLowerCase();
      const date = (c.class_date || '').toLowerCase();
      return title.includes(q) || disc.includes(q) || branch.includes(q) || date.includes(q);
    });
  }

  /**
   * Render danh sách lớp tập cộng đồng do HLV phụ trách (Tab 3: Lớp tập CĐ phụ trách)
   */
  function renderAssignedCommunityClassesList() {
    const list = getFilteredCommunityClasses();

    if (list.length === 0) {
      if (ClientsState.searchQuery) {
        return `
          <div class="pt-empty-state">
            <div class="pt-empty-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
            <div class="pt-empty-title">Không tìm thấy lớp học nào</div>
            <div class="pt-empty-desc">Không có lớp cộng đồng nào khớp với từ khóa "${escapeHtml(ClientsState.searchQuery)}".</div>
          </div>
        `;
      }
      return `
        <div class="pt-empty-state">
          <div class="pt-empty-icon"><i class="fa-solid fa-users-slash"></i></div>
          <div class="pt-empty-title">Chưa có lớp cộng đồng nào</div>
          <div class="pt-empty-desc">Bạn chưa được phân công phụ trách lớp tập cộng đồng nào.</div>
        </div>
      `;
    }

    // Sắp xếp ngày giảm dần để xem lớp gần nhất trước
    const sorted = [...list].sort((a, b) => (b.class_date || '').localeCompare(a.class_date || '') || (b.start_time || '').localeCompare(a.start_time || ''));

    let html = `
      <div style="padding: 10px 16px 6px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; color: var(--text-muted); font-weight: 600;">
          <i class="fa-solid fa-users"></i> ${list.length} lớp tập cộng đồng
        </span>
        <span style="font-size: 11.5px; color: var(--text-muted);">
          Chạm vào lớp để xem hội viên
        </span>
      </div>
      <div class="pt-community-classes-list" style="display: flex; flex-direction: column; gap: 10px; padding: 0 16px 24px;">
    `;

    sorted.forEach(c => {
      const comp = Number(c.total_compensation || ((Number(c.base_price) || 0) + (Number(c.bonus_amount) || 0)));
      const dateParts = (c.class_date || '').split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : (c.class_date || '');
      const timeStr = (c.start_time && c.end_time) ? `${c.start_time.slice(0, 5)} - ${c.end_time.slice(0, 5)}` : '';
      const enrolled = Number(c.enrolled_slots) || 0;
      const maxSlots = Number(c.max_slots) || 0;
      const pct = maxSlots > 0 ? Math.min(100, Math.round((enrolled / maxSlots) * 100)) : 0;

      // Status badge
      const todayStr = new Date().toISOString().slice(0, 10);
      const isPast = c.class_date < todayStr;
      const isToday = c.class_date === todayStr;
      const statusBadge = isToday
        ? '<span class="badge" style="background: rgba(35, 123, 88, 0.15); color: #237b58; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Hôm nay</span>'
        : isPast
          ? '<span class="badge" style="background: rgba(100, 116, 139, 0.15); color: #64748b; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Đã diễn ra</span>'
          : '<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: #2563eb; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600;">Sắp diễn ra</span>';

      html += `
        <div class="pt-community-class-card" data-class-id="${c.id}" role="button" tabindex="0"
             style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
          
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="badge" style="background: rgba(124, 58, 237, 0.12); color: #7c3aed; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">
                <i class="fa-solid fa-medal" style="font-size: 10px; margin-right: 2px;"></i> ${escapeHtml(c.discipline_name || 'Lớp CĐ')}
              </span>
              ${statusBadge}
            </div>
            <div style="font-size: 13.5px; font-weight: 800; color: #7c3aed;">
              +${formatVnd(comp)} đ
            </div>
          </div>

          <div style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 6px; line-height: 1.3;">
            ${escapeHtml(c.title)}
          </div>

          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <i class="fa-regular fa-clock" style="color: var(--primary); width: 14px;"></i>
              <span>${timeStr} · <strong>${formattedDate}</strong></span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <i class="fa-solid fa-location-dot" style="color: var(--text-muted); width: 14px;"></i>
              <span>${escapeHtml(c.branch_name || 'Paradise Gym')}</span>
            </div>
          </div>

          <!-- Sĩ số học viên & Progress bar -->
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 5px;">
              <span style="color: var(--text-muted);"><i class="fa-solid fa-users"></i> Sĩ số đăng ký</span>
              <span style="font-weight: 700; color: #7c3aed;">${enrolled} / ${maxSlots} HV (${pct}%)</span>
            </div>
            <div style="height: 5px; background: rgba(0,0,0,0.06); border-radius: 3px; overflow: hidden;">
              <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, #7c3aed, #a855f7); border-radius: 3px;"></div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed var(--border-color);">
            <div style="font-size: 11.5px; color: var(--text-muted);">
              Cơ bản: ${formatVnd(c.base_price || 0)} đ + Thưởng: ${formatVnd(c.bonus_amount || 0)} đ
            </div>
            <button type="button" class="btn-view-community-class-detail" data-class-id="${c.id}"
                    style="background: rgba(124, 58, 237, 0.08); border: 1px solid #7c3aed; color: #7c3aed; border-radius: 6px; font-size: 11.5px; font-weight: 700; padding: 4px 10px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
              <i class="fa-solid fa-list-ul"></i> Xem danh sách hội viên
            </button>
          </div>

        </div>
      `;
    });

    html += `</div>`;
    return html;
  }

  /**
   * Sinh mã HTML danh sách nội dung theo Tab đang kích hoạt
   */
  function renderContentListHtml() {
    if (ClientsState.hasError) {
      return '<div class="pt-empty-state">Không thể tải danh sách. <button type="button" class="btn btn-secondary" id="btnRetryClients" title="Thử lại"><i class="fa-solid fa-rotate-right"></i> Thử lại</button></div>';
    }
    if (ClientsState.isLoading && ClientsState.clients.length === 0 && ClientsState.communityClasses.length === 0) {
      return `
        <div class="pt-empty-state">
          <div class="pt-empty-icon" style="color: var(--primary, #237b58);">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
          </div>
          <div class="pt-empty-title">Đang nạp dữ liệu...</div>
        </div>
      `;
    }

    if (ClientsState.currentTab === 'members') {
      return renderAssignedMembersList();
    } else if (ClientsState.currentTab === 'community_classes') {
      return renderAssignedCommunityClassesList();
    } else {
      return renderAssignedPackagesList();
    }
  }

  /**
   * Cập nhật vùng hiển thị nội dung
   */
  function renderContentList() {
    const contentList = document.getElementById('ptClientsContentList');
    if (!contentList) return;
    contentList.innerHTML = renderContentListHtml();
  }

  /**
   * Cập nhật badges số lượng trên các tab
   */
  function updateBadges() {
    const uniqueMembers = getUniqueAssignedMembers();
    const membersCount = uniqueMembers.length;
    const packagesCount = ClientsState.clients.length;
    const communityClassesCount = ClientsState.communityClasses.length;

    const membersBadge = document.getElementById('membersCountBadge');
    if (membersBadge) {
      membersBadge.textContent = `(${membersCount})`;
    }
    const assignedBadge = document.getElementById('assignedCountBadge');
    if (assignedBadge) {
      assignedBadge.textContent = `(${membersCount})`;
    }

    const packagesBadge = document.getElementById('packagesCountBadge');
    if (packagesBadge) {
      packagesBadge.textContent = `(${packagesCount})`;
    }

    const communityBadge = document.getElementById('communityClassesCountBadge');
    if (communityBadge) {
      communityBadge.textContent = `(${communityClassesCount})`;
    }

    // Cập nhật tab bar badge của ứng dụng tổng thể nếu có
    const appClientsTabBadge = document.getElementById('bottomNavClientsBadge');
    if (appClientsTabBadge) {
      if (packagesCount > 0) {
        appClientsTabBadge.textContent = String(packagesCount);
        appClientsTabBadge.style.display = 'inline-flex';
      } else {
        appClientsTabBadge.style.display = 'none';
      }
    }
  }

  /**
   * Chuyển tab trực tiếp từ bên ngoài (hoặc khi người dùng click tab)
   */
  function switchTab(tabKey) {
    if (tabKey === 'assigned') tabKey = 'packages';
    if (tabKey !== 'members' && tabKey !== 'packages' && tabKey !== 'community_classes') return;
    ClientsState.currentTab = tabKey;
    
    const tabMembers = document.getElementById('tabBtnMembers');
    const tabPackages = document.getElementById('tabBtnPackages');
    const tabAssigned = document.getElementById('tabBtnAssigned');
    const tabCommunity = document.getElementById('tabBtnCommunityClasses');

    if (tabMembers) tabMembers.classList.toggle('active', tabKey === 'members');
    if (tabPackages) tabPackages.classList.toggle('active', tabKey === 'packages');
    if (tabAssigned) tabAssigned.classList.toggle('active', tabKey === 'packages');
    if (tabCommunity) tabCommunity.classList.toggle('active', tabKey === 'community_classes');

    const searchInput = document.getElementById('ptClientsSearchInput');
    if (searchInput) {
      searchInput.placeholder = tabKey === 'members'
        ? 'Tìm học viên được phân công...'
        : (tabKey === 'packages' ? 'Tìm gói tập, học viên phụ trách...' : 'Tìm lớp tập cộng đồng phụ trách...');
    }

    renderContentList();
  }

  /**
   * Lắng nghe các sự kiện DOM trong module
   */
  function bindEvents(containerEl) {
    $(containerEl).off('click', '#btnRetryClients').on('click', '#btnRetryClients', fetchClientsData);
    
    // 1. Chuyển Tab
    const tabMembers = containerEl.querySelector('#tabBtnMembers');
    const tabPackages = containerEl.querySelector('#tabBtnPackages');
    const tabAssigned = containerEl.querySelector('#tabBtnAssigned');
    const tabCommunity = containerEl.querySelector('#tabBtnCommunityClasses');

    if (tabMembers) {
      tabMembers.addEventListener('click', () => switchTab('members'));
    }
    if (tabPackages) {
      tabPackages.addEventListener('click', () => switchTab('packages'));
    }
    if (tabAssigned) {
      tabAssigned.addEventListener('click', () => switchTab('packages'));
    }
    if (tabCommunity) {
      tabCommunity.addEventListener('click', () => switchTab('community_classes'));
    }

    // 1.1. Click xem chi tiết lớp cộng đồng & danh sách hội viên
    $(containerEl).off('click', '.pt-community-class-card, .btn-view-community-class-detail')
      .on('click', '.pt-community-class-card, .btn-view-community-class-detail', function (e) {
        e.stopPropagation();
        const classId = $(this).data('class-id');
        if (classId && typeof window.openPTCommunityClassModal === 'function') {
          window.openPTCommunityClassModal(classId);
        }
      });

    // 2. Tìm kiếm realtime
    const searchInput = containerEl.querySelector('#ptClientsSearchInput');
    const clearBtn = containerEl.querySelector('#ptClientsSearchClear');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        ClientsState.searchQuery = e.target.value;
        if (clearBtn) {
          clearBtn.style.display = ClientsState.searchQuery ? 'flex' : 'none';
        }
        renderContentList();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        ClientsState.searchQuery = '';
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        clearBtn.style.display = 'none';
        renderContentList();
      });
    }
  }

  /**
   * Helper hiển thị toast thông báo
   */
  function showToast(message, type = 'info') {
    const toast = document.getElementById('appToast');
    const textEl = document.getElementById('toastText');
    if (!toast || !textEl) {
      alert(message);
      return;
    }

    textEl.textContent = message;
    toast.className = `toast-msg show toast-${type}`;
    setTimeout(() => {
      toast.className = 'toast-msg';
    }, 2800);
  }

    // Tự động chèn CSS chuyên dụng cho PT02 để giao diện luôn hoàn chỉnh và nhất quán
  function injectClientsStyles() {
    if (document.getElementById('ptClientsInjectedStyles')) return;

    const style = document.createElement('style');
    style.id = 'ptClientsInjectedStyles';
    style.textContent = `
      .pt-clients-module {
        display: flex;
        flex-direction: column;
        height: 100%;
        position: relative;
        background-color: var(--bg-card);
        color: var(--text-main, #F8FAFC);
        font-family: var(--font-family, 'Inter', sans-serif);
      }

      /* Search Bar */
      .pt-clients-search-bar {
        padding: 12px 16px 8px;
        background: var(--bg-card);
      }
      .pt-search-input-wrap {
        position: relative;
        display: flex;
        align-items: center;
        width: 100%;
      }
      .pt-search-icon {
        position: absolute;
        left: 12px;
        color: #65736d;
        font-size: 13px;
        pointer-events: none;
      }
      .pt-search-input {
        width: 100%;
        height: 38px;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 0 34px 0 34px;
        color: var(--text-main);
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
      }
      .pt-search-input:focus {
        border-color: var(--primary, #237b58);
        box-shadow: none;
      }
      .pt-search-input::placeholder {
        color: #65736d;
      }
      .pt-search-clear-btn {
        position: absolute;
        right: 10px;
        background: transparent;
        border: none;
        color: #65736d;
        font-size: 13px;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pt-search-clear-btn:hover {
        color: var(--text-main);
      }

      /* Navigation Tabs */
      .pt-clients-tabs-bar {
        display: flex;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-card);
        padding: 0 16px;
      }
      .pt-tab-btn {
        flex: 1;
        height: 44px;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #65736d;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
        padding: 0 8px;
      }
      .pt-tab-btn.active {
        color: var(--primary, #237b58);
        border-bottom-color: var(--primary, #237b58);
      }
      .pt-badge-count {
        background: var(--border-color);
        color: var(--text-main);
        font-size: 12px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 8px;
      }
      .pt-badge-pending-count {
        background: #c43d40;
        color: var(--text-main);
        font-size: 12px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 8px;
      }

      /* Scrollable List */
      .pt-clients-scroll-area {
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px 80px;
        -webkit-overflow-scrolling: touch;
      }

      /* Card Học Viên (PT02-US01) */
      .pt-client-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 14px;
        margin-bottom: 12px;
        cursor: pointer;
        transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .pt-client-card:active {
        transform: scale(0.99);
      }
      .pt-client-card:hover {
        border-color: rgba(16, 185, 129, 0.3);
      }
      .pt-card-top-row {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 10px;
      }
      .pt-avatar-circle {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        color: var(--text-main);
        flex-shrink: 0;
      }
      .pt-card-info-col {
        flex: 1;
        min-width: 0;
      }
      .pt-card-name-line {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pt-card-name {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-main);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .pt-badge-expiring {
        background: rgba(245, 158, 11, 0.15);
        color: #996217;
        border: 1px solid rgba(245, 158, 11, 0.3);
        font-size: 12px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 6px;
        flex-shrink: 0;
      }
      .pt-card-code-line {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
        font-size: 12px;
        color: #65736d;
      }
      .pt-status-pill-active {
        color: #237b58;
        font-weight: 600;
      }
      .pt-card-phone-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: var(--border-color);
        color: #65736d;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        font-size: 12px;
        flex-shrink: 0;
      }
      .pt-card-phone-btn:hover {
        background: rgba(16, 185, 129, 0.15);
        color: #237b58;
      }

      /* Package Info Row */
      .pt-card-pkg-row {
        background: var(--border-color);
        border-radius: 8px;
        padding: 8px 10px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
      }
      .pt-pkg-name {
        color: var(--text-main);
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pt-pkg-expiry {
        color: #65736d;
      }

      /* Metrics Row */
      .pt-card-metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 10px;
      }
      .pt-metric-box {
        background: var(--border-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 6px 10px;
      }
      .pt-metric-label {
        font-size: 12px;
        color: #65736d;
        margin-bottom: 2px;
      }
      .pt-metric-value {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-main);
      }
      .pt-metric-value.highlight {
        color: var(--primary, #237b58);
      }

      /* Progress Bar */
      .pt-card-progress-wrap {
        margin-top: 6px;
      }
      .pt-progress-header {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #65736d;
        margin-bottom: 4px;
      }
      .pt-progress-text {
        color: var(--text-main);
        font-weight: 600;
      }
      .pt-progress-bar-bg {
        height: 6px;
        background: var(--border-color);
        border-radius: 6px;
        overflow: hidden;
      }
      .pt-progress-bar-fill {
        height: 100%;
        background: var(--bg-card);
        border-radius: 6px;
        transition: width 0.3s ease;
      }

      /* Card Yêu Cầu Phân Công (PT02-US03) */
      .pt-request-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 14px;
        box-shadow: none;
      }
      .pt-badge-pending {
        background: rgba(59, 130, 246, 0.15);
        color: #286aa4;
        border: 1px solid rgba(59, 130, 246, 0.3);
        font-size: 12px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 8px;
      }
      .pt-req-detail-rows {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 12px;
        color: var(--text-main);
        margin-bottom: 12px;
        background: var(--border-color);
        padding: 10px;
        border-radius: 8px;
      }
      .pt-req-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pt-row-icon {
        color: var(--primary, #237b58);
        width: 14px;
        text-align: center;
      }
      .pt-highlight-text {
        color: var(--text-main);
        font-weight: 600;
      }
      .pt-time-text {
        color: #65736d;
      }
      .pt-req-note-box {
        margin-top: 4px;
        padding-top: 6px;
        border-top: 1px dashed var(--border-color);
        font-style: italic;
        color: var(--text-main);
        display: flex;
        gap: 6px;
      }
      .pt-req-actions {
        display: flex;
        gap: 10px;
      }
      .pt-btn-reject {
        flex: 1;
        height: 38px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #c43d40;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s ease;
      }
      .pt-btn-reject:active {
        background: rgba(239, 68, 68, 0.2);
      }
      .pt-btn-accept {
        flex: 1.3;
        height: 38px;
        background: var(--bg-card);
        border: none;
        color: var(--text-main);
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        box-shadow: none;
      }
      .pt-btn-accept:active {
        transform: scale(0.98);
      }

      /* Subscreen (PT02-US02) */
      .pt-subscreen {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--bg-card);
        z-index: 50;
        display: flex;
        flex-direction: column;
      }
      .pt-detail-view-inner {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--bg-card);
      }
      .pt-subscreen-header {
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        background: var(--brand-header-footer, #084736);
        border-bottom: 1px solid var(--border-color);
      }
      .pt-back-btn {
        background: transparent;
        border: none;
        color: var(--text-main);
        font-size: 18px;
        cursor: pointer;
        padding: 6px;
      }
      .pt-subscreen-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-main);
      }
      .pt-phone-call-btn {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: var(--border-color);
        color: #237b58;
        display: flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        font-size: 13px;
      }
      .pt-subscreen-scrollable {
        flex: 1;
        overflow-y: auto;
        padding: 16px 16px 24px;
        background: var(--bg-card);
      }
      .pt-detail-profile-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .pt-profile-header {
        display: flex;
        gap: 14px;
        align-items: center;
        margin-bottom: 14px;
      }
      .pt-profile-name {
        font-size: 17px;
        font-weight: 800;
        color: var(--text-main);
      }
      .pt-profile-meta {
        font-size: 13px;
        color: #65736d;
        margin-top: 2px;
      }
      .pt-profile-branch {
        font-size: 12px;
        color: #65736d;
        margin-top: 4px;
      }
      .pt-profile-package-box {
        background: var(--bg-card);
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 14px;
      }
      .pt-pkg-title-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .pt-pkg-badge-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--primary, #237b58);
      }
      .pt-badge-active-mini {
        background: rgba(16, 185, 129, 0.2);
        color: #237b58;
        font-size: 12px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .pt-badge-warning-mini {
        background: rgba(245, 158, 11, 0.2);
        color: #996217;
        font-size: 12px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: 600;
      }
      .pt-detail-stat-cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 12px;
      }
      .pt-stat-col {
        background: var(--border-color);
        border-radius: 8px;
        padding: 8px 10px;
      }
      .pt-stat-col-label {
        font-size: 12px;
        color: #65736d;
        margin-bottom: 2px;
      }
      .pt-stat-col-val {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-main);
      }

      /* Timeline Sessions */
      .pt-timeline-header-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pt-timeline-list {
        position: relative;
        padding-left: 14px;
      }
      .pt-timeline-list::before {
        content: '';
        position: absolute;
        top: 8px;
        bottom: 8px;
        left: 5px;
        width: 2px;
        background: var(--border-color);
      }
      .pt-timeline-item {
        position: relative;
        margin-bottom: 16px;
      }
      .pt-timeline-dot {
        position: absolute;
        left: -13px;
        top: 6px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--primary, #237b58);
        border: 2px solid #000000;
        box-shadow: none;
      }
      .pt-session-bubble {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 12px;
        margin-left: 8px;
      }
      .pt-session-meta-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .pt-session-num {
        font-weight: 700;
        font-size: 13px;
        color: var(--text-main);
      }
      .pt-session-date {
        font-size: 12px;
        color: #65736d;
      }
      .pt-session-status-done {
        color: #237b58;
        font-weight: 600;
        background: rgba(16, 185, 129, 0.15);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .pt-assessment-block {
        margin-bottom: 8px;
        font-size: 12px;
        background: var(--border-color);
        padding: 8px 10px;
        border-radius: 8px;
      }
      .pt-assessment-block.fitness {
        background: rgba(8, 71, 54, 0.2);
        border-left: 3px solid #237b58;
      }
      .pt-assessment-block .block-title {
        font-weight: 600;
        color: #65736d;
        margin-bottom: 3px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .pt-assessment-block.fitness .block-title {
        color: #237b58;
      }
      .pt-assessment-block .block-content {
        color: var(--text-main);
        line-height: 1.4;
      }
      .pt-empty-history-card {
        background: var(--bg-card);
        border: 1px dashed var(--border-color);
        border-radius: 8px;
        padding: 24px 16px;
        text-align: center;
      }
      .empty-hist-icon {
        font-size: 32px;
        color: #65736d;
        margin-bottom: 8px;
      }
      .empty-hist-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-main);
        margin-bottom: 4px;
      }
      .empty-hist-desc {
        font-size: 12px;
        color: #65736d;
        line-height: 1.4;
      }

      /* Bottom Sheet / Modal (PT02-US03) */
      .pt-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(4px);
        z-index: 100;
        display: flex;
        align-items: flex-end;
      }
      .pt-bottom-sheet {
        width: 100%;
        background: var(--bg-card);
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        border-top: 1px solid var(--border-color);
        padding: 12px 16px 24px;
        animation: slideUp 0.25s ease-out;
      }
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      .pt-sheet-handle {
        width: 36px;
        height: 4px;
        background: var(--border-color);
        border-radius: 4px;
        margin: 0 auto 12px;
      }
      .pt-sheet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
      }
      .pt-sheet-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-main);
      }
      .pt-sheet-close {
        background: transparent;
        border: none;
        color: #65736d;
        font-size: 16px;
        cursor: pointer;
      }
      .pt-reject-summary-card {
        background: rgba(239, 68, 68, 0.08);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 8px;
        padding: 10px 12px;
        margin-bottom: 14px;
        font-size: 13px;
      }
      .summary-name {
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 2px;
      }
      .summary-code {
        font-weight: 400;
        color: #65736d;
      }
      .summary-pkg, .summary-branch {
        font-size: 12px;
        color: var(--text-main);
        margin-top: 2px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pt-form-group {
        margin-bottom: 14px;
      }
      .pt-form-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-main);
        margin-bottom: 8px;
        display: block;
      }
      .required-star {
        color: #c43d40;
      }
      .pt-reason-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .pt-radio-option {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--bg-surface-elevated, #1E293B);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 10px 12px;
        cursor: pointer;
        font-size: 13px;
        color: var(--text-main);
      }
      .pt-radio-option input[type="radio"] {
        accent-color: #c43d40;
      }
      .pt-textarea {
        width: 100%;
        background: var(--bg-surface-elevated, #1E293B);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 10px;
        color: var(--text-main);
        font-size: 13px;
        font-family: inherit;
        outline: none;
        resize: none;
      }
      .pt-textarea:focus {
        border-color: #c43d40;
      }
      .char-count {
        text-align: right;
        font-size: 12px;
        color: #65736d;
        margin-top: 4px;
      }
      .pt-sheet-actions {
        display: flex;
        gap: 10px;
        margin-top: 16px;
      }
      .pt-btn-secondary {
        flex: 1;
        height: 42px;
        background: var(--border-color);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-main);
        font-weight: 600;
        cursor: pointer;
      }
      .pt-btn-danger {
        flex: 1.5;
        height: 42px;
        background: #c43d40;
        border: none;
        border-radius: 8px;
        color: var(--text-main);
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        box-shadow: none;
      }

      /* Empty State chung */
      .pt-empty-state {
        padding: 40px 20px;
        text-align: center;
      }
      .pt-empty-icon {
        font-size: 44px;
        color: #475569;
        margin-bottom: 12px;
      }
      .pt-empty-icon.success-glow {
        color: #237b58;
      }
      .pt-empty-title {
        font-size: 15px;
        font-weight: 700;
        color: var(--text-main);
        margin-bottom: 6px;
      }
      .pt-empty-desc {
        font-size: 13px;
        color: #65736d;
        line-height: 1.4;
      }
      .pt-section-hint {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #65736d;
        margin-bottom: 10px;
      }
      .pt-btn-accept { background: var(--primary); color: #fff; }
      .pt-subscreen-header { background: var(--bg-card); color: var(--text-main); }
      .pt-badge-pending-count { color: #fff; }
      .pt-progress-bar-fill { background: var(--primary); }
      .pt-back-btn, .pt-subscreen-title { color: var(--text-main); }
      
      /* Thẻ học viên tóm tắt (Tab 1: Học viên phụ trách) */
      .pt-member-summary-card {
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
      }
      .pt-member-summary-card:hover {
        border-color: #237b58;
        box-shadow: 0 4px 12px rgba(35, 123, 88, 0.08);
      }
      .pt-pkg-pill-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(35, 123, 88, 0.12);
        color: #185740;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
      }
      .pt-member-info-banner {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
      }
  `;
    document.head.appendChild(style);
  }

  // Tự khởi tạo style khi nạp
  if (typeof document !== 'undefined') {
    injectClientsStyles();
  }

  return {
    init,
    reset: () => { 
      ClientsState.clients = []; 
      ClientsState.assignmentRequests = []; 
      ClientsState.communityClasses = [];
      ClientsState.hasError = false; 
      ClientsState.isLoading = false; 
      closeClientDetail(); 
      closeMemberPackages(); 
      renderContentList(); 
      updateBadges(); 
    },
    refresh: fetchClientsData,
    openClientDetail,
    closeClientDetail,
    openMemberPackages,
    closeMemberPackages,
    switchTab,
    getPendingRequestsCount: () => 0,
    getClientsCount: () => new Set(ClientsState.clients.map(c => c.memberId)).size,
    getPackagesCount: () => ClientsState.clients.length,
    getCommunityClassesCount: () => ClientsState.communityClasses.length,
    getState: () => ClientsState
  };
});
