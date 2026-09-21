/**
 * PARADISE GYM - MOBILE PT APP (TAB 3: anti-3-PT)
 * MODULE: PT04 - TÀI KHOẢN & HỒ SƠ NĂNG LỰC HLV (PROFILE CONTROLLER)
 * Includes: PT04-US01 (Coach Profile, Competency, Preferences, Change Password, Logout)
 *           PT04-US02 (Edit Profile, Cloud Avatar Upload, Specialties & Bio, Contact Email)
 */

(function (window, $) {
  'use strict';

  const escapeAttribute = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  class PtProfileController {
    fieldError(selector, message) {
      const field = $(selector).attr('aria-invalid', 'true');
      $('<div class="pt-field-error" role="alert">').css({color:'var(--danger, #c43d40)',fontSize:'12px',marginTop:'4px'}).text(message).insertAfter(field);
      field.trigger('focus');
      ptApp.showToast(message, 'warning');
    }

    constructor() {
      this.coachData = null;
      this.trainerProfile = null;
      this.loading = false;
      this.initialPreferences = null;
      this.pendingAvatarFile = null;
    }

    init() {
      this.bindEvents();
    }

    bindEvents() {
      const self = this;

      $('#btnRetryProfile').on('click', () => this.loadProfile());
      $('#btnOpenSessions').on('click', () => this.openSessions());
      $('#btnLogoutAll').on('click', async () => {
        if (!await DevExpress.ui.dialog.confirm('Đăng xuất tất cả thiết bị, bao gồm thiết bị hiện tại?', 'Đăng xuất tất cả')) return;
        try {
          await apiClient.auth.logoutAll();
          ptApp.showAuthScreen();
        } catch (err) {
          ptApp.showToast('Chưa xác nhận thu hồi các phiên trên máy chủ. Vui lòng đăng nhập lại để kiểm tra.', 'error');
          ptApp.showAuthScreen();
        }
      });

      // Save Preferences Button (PT04-US01 Main Flow Step 4)
      $('#btnSavePreferences').on('click', function () {
        if ($(this).prop('disabled')) return;
        self.savePreferences();
      });

      // DYNAMIC: Enable [ Lưu cài đặt ] button when any switch value differs from initialPreferences
      $('#toggleNotifSchedule, #toggleNotifResult, #toggleShowPhone, #toggle2FA').on('change', function () {
        self.updateSaveButtonState();
      });

      // Open Edit Profile Modal (PT04-US02)
      $('#btnOpenEditProfile').on('click', function () {
        self.openEditProfileModal();
      });

      // Close Edit Profile Modal
      $('#btnCloseEditProfileModal, #btnCancelEditProfile').on('click', function () {
        self.closeEditProfileModal();
      });

      $('#editProfileModalBackdrop').on('click', function (e) {
        if (e.target === this) {
          self.closeEditProfileModal();
        }
      });

      // Pick Avatar
      $('#btnPickAvatar').on('click', function () {
        $('#inputAvatarFile').trigger('click');
      });

      $('#inputAvatarFile').on('change', function (e) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation EF-01: format & size
        const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          ptApp.showToast('Ảnh đại diện phải thuộc định dạng PNG, JPEG hoặc WebP.', 'error');
          $(this).val('');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          ptApp.showToast('Ảnh đại diện phải có dung lượng tối đa 5MB.', 'error');
          $(this).val('');
          return;
        }

        self.pendingAvatarFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
          $('#editAvatarPreview').attr('src', ev.target.result).show();
          $('#editAvatarFallback').hide();
        };
        reader.readAsDataURL(file);
      });

      // Form Submit: Edit Profile (PT04-US02)
      $('#formEditProfile').on('submit', function (e) {
        e.preventDefault();
        self.handleEditProfile();
      });

      // Open Change Password Modal (PT04-US01)
      $('#btnOpenChangePassword').on('click', function () {
        self.openChangePasswordModal();
      });

      // Close Change Password Modal (Cancel button or X button)
      $('#btnCloseChangePasswordModal, #btnCancelChangePassword').on('click', function () {
        self.closeChangePasswordModal();
      });

      // Close Change Password Modal on clicking backdrop outside modal box
      $('#changePasswordModalBackdrop').on('click', function (e) {
        if (e.target === this) {
          self.closeChangePasswordModal();
        }
      });

      // Form Submit: Change Password
      $('#formChangePassword').on('submit', function (e) {
        e.preventDefault();
        self.handleChangePassword();
      });

      // Trigger Logout Confirmation Popup (PT04-US01 AF-01 -> PT05-US03 Step 1)
      $('#btnLogoutTrigger').on('click', function () {
        self.openLogoutModal();
      });

      // Cancel Logout: Button Click (PT05-US03 AF-01)
      $('#btnCancelLogout').on('click', function () {
        self.closeLogoutModal();
      });

      // Cancel Logout: Click backdrop outside modal box (PT05-US03 AF-01)
      $('#logoutModalBackdrop').on('click', function (e) {
        if (e.target === this) {
          self.closeLogoutModal();
        }
      });

      // Confirm Logout: Button Click (PT05-US03 Main Flow Step 3-5)
      $('#btnConfirmLogout').on('click', function () {
        self.handleLogout();
      });
    }

    // Load or refresh PT profile when navigating to PT04 tab
    async openSessions() {
      if (this.sessionsPopup) this.sessionsPopup.dispose();
      $('#ptSessionsPopup').remove();
      const host = $('<div id="ptSessionsPopup">').appendTo(document.body);
      const load = async target => {
        target.text('Đang tải thiết bị...');
        try {
          const res = await apiClient.auth.getSessions();
          const sessions = (res.data || []).filter(s => !s.is_revoked && new Date(s.expires_at) > new Date());
          target.empty();
          if (!sessions.length) target.text('Không có phiên thiết bị đang hoạt động.');
          sessions.forEach(session => {
            const row = $('<div class="pt-session-device">').css({padding:'12px 0',borderBottom:'1px solid var(--border-color)'}).appendTo(target);
            $('<strong>').text(session.device_name || 'Thiết bị không xác định').appendTo(row);
            if (session.is_current) $('<span>').text(' · Thiết bị hiện tại').appendTo(row);
            $('<p>').text('Hoạt động gần nhất: ' + new Date(session.last_active_at).toLocaleString('vi-VN')).appendTo(row);
            $('<button type="button" class="btn btn-secondary">').text(session.is_current ? 'Đăng xuất thiết bị hiện tại' : 'Đăng xuất thiết bị').on('click', async event => {
              if (!await DevExpress.ui.dialog.confirm('Thu hồi phiên đăng nhập trên thiết bị này?', 'Xác nhận')) return;
              const button = $(event.currentTarget).prop('disabled',true);
              try {
                if (session.is_current) { await this.handleLogout(); return; }
                await apiClient.auth.revokeSession(session.id);
                await load(target);
              } catch (err) { ptApp.showToast(err.message || 'Không thể thu hồi phiên.', 'error'); }
              finally { button.prop('disabled',false); }
            }).appendTo(row);
          });
        } catch (err) {
          target.text('Không thể tải thiết bị. ');
          $('<button type="button" class="btn btn-secondary">').text('Thử lại').on('click', () => load(target)).appendTo(target);
        }
      };
      this.sessionsPopup = host.dxPopup({title:'Thiết bị đăng nhập',visible:true,showCloseButton:true,
        width:() => Math.min(window.innerWidth-24,520),height:'auto',maxHeight:'85vh',
        contentTemplate:container => { const target=$('<div>').appendTo(container); load(target); }
      }).dxPopup('instance');
    }

    async loadProfile() {
      const user = window.ptApp?.currentUser;
      if (user) {
        await this.renderProfile(user);
      }
    }

    // Render coach profile into PT04 View from Database via API
    async renderProfile(user) {
      this.coachData = user;
      $('#profileLoadError').hide();
      $('#btnOpenEditProfile, #toggleNotifSchedule, #toggleNotifResult, #toggleShowPhone, #toggle2FA, #btnSavePreferences').prop('disabled', true);
      this.initialPreferences = null;

      let trainer;
      try {
        const res = await apiClient.mobile.profile();
        trainer = res.data;
        if (window.ptApp?.currentUser?.account_id !== user.account_id) return;
      } catch (err) {
        $('#profileLoadError').show();
        $('#profileSpecialtiesList').text('Không thể tải dữ liệu');
        $('#btnSavePreferences').prop('disabled', true);
        return;
      }
      this.trainerProfile = trainer;
      $('#btnOpenEditProfile').prop('disabled', false);

      // Populate personal info (Field-level specification)
      const fullName = trainer?.full_name || user?.full_name || 'Huấn luyện viên';
      const phone = trainer?.phone || user?.phone || 'Chưa cập nhật';
      const email = trainer?.email || user?.email || 'Chưa cập nhật';
      const ptCode = trainer?.pt_code || user?.pt_code || 'Chưa cập nhật';
      const branchName = trainer?.branch_name || user?.branch_name || 'Chưa cập nhật';

      $('#profileFullName').text(fullName);
      $('#profilePtCode').text(ptCode);
      $('#profileBranch').text(branchName);
      $('#profilePhone').text(phone);
      $('#profileEmail').text(email);

      $('#profileWorkShift').text('Chưa cập nhật');
      // Work shift / Fixed schedule
      if (trainer?.work_start_time && trainer?.work_end_time) {
        const start = trainer.work_start_time.slice(0, 5);
        const end = trainer.work_end_time.slice(0, 5);
        const days = trainer.work_days === 'MON_TO_FRI' ? 'Thứ 2 - Thứ 6' : trainer.work_days === 'MON_TO_SAT' ? 'Thứ 2 - Thứ 7' : trainer.work_days === 'ALL_WEEK' ? 'Cả tuần' : Array.isArray(trainer.work_days) ? trainer.work_days.map(d => d === 0 ? 'CN' : `Thứ ${d + 1}`).join(', ') : 'Chưa cập nhật ngày làm việc';
        $('#profileWorkShift').text(`${start} - ${end} (${days})`);
      }

      // Avatar
      const avatarUrl = trainer?.avatar_url || user?.avatar_url;
      $('#profileAvatarImg, #headerAvatar').attr('src', avatarUrl || '').toggle(!!avatarUrl);
      $('#profileAvatarFallback').toggle(!avatarUrl);
      Object.assign(user, { pt_code: trainer.pt_code, branch_name: trainer.branch_name, avatar_url: avatarUrl });
      window.ptApp.refreshPersistentHeader();

      // Render dynamic specialties tags from DB
      this.renderSpecialties(trainer?.specialties);
      $('#profileBio').text(trainer?.bio || 'Chưa cập nhật');

      // Refresh dynamic assigned member count if available
      this.refreshMemberCount(user.pt_profile_id);
      await this.loadPreferences();
    }

    // Render dynamic specialties tags
    renderSpecialties(specialtiesStr) {
      const $container = $('#profileSpecialtiesList');
      if (!$container.length) return;

      if (!specialtiesStr) { $container.text('Chưa cập nhật'); return; }

      const list = specialtiesStr.split(',').map(s => s.trim()).filter(Boolean);
      $container.empty();

      const getIcon = (item) => {
        const lower = item.toLowerCase();
        if (lower.includes('mỡ') || lower.includes('siết') || lower.includes('cardio')) return 'fa-fire';
        if (lower.includes('cơ') || lower.includes('hypertrophy') || lower.includes('gym')) return 'fa-dumbbell';
        if (lower.includes('box') || lower.includes('muay') || lower.includes('võ')) return 'fa-hand-fist';
        if (lower.includes('phục hồi') || lower.includes('trị liệu') || lower.includes('chấn thương')) return 'fa-heart-pulse';
        if (lower.includes('bền') || lower.includes('chạy') || lower.includes('thể lực')) return 'fa-person-running';
        return 'fa-medal';
      };

      list.forEach(spec => {
        const icon = getIcon(spec);
        $container.append(`<span class="gym-tag"><i class="fa-solid ${icon}"></i> ${$('<span>').text(spec).html()}</span>`);
      });
    }

    // Fetch and update assigned member count dynamically
    async refreshMemberCount(ptId) {
      if (!ptId || !window.apiClient || !window.apiClient.registrations) return;
      try {
        const res = await window.apiClient.registrations.list();
        if (window.ptApp?.currentUser?.pt_profile_id !== ptId) return;
        if (res && res.data && Array.isArray(res.data)) {
          const myRegs = res.data.filter(r => r.assigned_pt_id === ptId && ['ACTIVE', 'SCHEDULED'].includes(r.status));
          $('#profileMembersKpi').text(new Set(myRegs.map(r => r.member_id)).size);
        }
      } catch (e) {
        $('#profileMembersKpi').text('--');
      }
    }

    // Load saved notification & 2FA preferences (Main Flow Step 2)
    async loadPreferences() {
      const accountId = window.ptApp?.currentUser?.account_id;
      try {
        const res = await apiClient.mobile.getPreferences();
        if (window.ptApp?.currentUser?.account_id !== accountId) return;
        this.initialPreferences = res.data;
        this.revertPreferences();
      } catch (err) {
        $('#toggleNotifSchedule, #toggleNotifResult, #toggleShowPhone, #toggle2FA, #btnSavePreferences').prop('disabled', true);
        ptApp.showToast('Không thể tải cài đặt tài khoản.', 'error');
      }
    }

    currentPreferences() {
      return {
        notify_new_bookings: $('#toggleNotifSchedule').is(':checked'),
        notify_result_reminders: $('#toggleNotifResult').is(':checked'),
        show_phone_to_members: $('#toggleShowPhone').is(':checked'),
        is_two_factor_enabled: $('#toggle2FA').is(':checked')
      };
    }

    updateSaveButtonState() {
      const current = this.currentPreferences();
      const changed = this.initialPreferences && Object.keys(current).some(key => current[key] !== this.initialPreferences[key]);
      $('#btnSavePreferences').prop('disabled', !changed || this.loading);
    }

    async savePreferences() {
      if (this.loading || !this.initialPreferences) return;
      this.loading = true;
      this.updateSaveButtonState();
      try {
        const res = await apiClient.mobile.updatePreferences(this.currentPreferences());
        this.initialPreferences = res.data;
        this.revertPreferences();
        ptApp.showToast('Đã lưu cài đặt.', 'success');
      } catch (err) {
        this.revertPreferences();
        ptApp.showToast(err.message || 'Không thể lưu cài đặt. Giữ nguyên trạng thái cũ.', 'error');
      } finally {
        this.loading = false;
        this.updateSaveButtonState();
      }
    }

    revertPreferences() {
      const pref = this.initialPreferences;
      if (!pref) return;
      $('#toggleNotifSchedule').prop('checked', !!pref.notify_new_bookings);
      $('#toggleNotifResult').prop('checked', !!pref.notify_result_reminders);
      $('#toggleShowPhone').prop('checked', !!pref.show_phone_to_members);
      $('#toggle2FA').prop('checked', !!pref.is_two_factor_enabled);
      $('#toggleNotifSchedule, #toggleNotifResult, #toggleShowPhone, #toggle2FA').prop('disabled', false);
      this.updateSaveButtonState();
    }

    // Modal helpers: Edit Profile with DevExtreme dxPopup (PT04-US02)
    openEditProfileModal() {
      const self = this;
      const trainer = this.trainerProfile || this.coachData || {};
      const fullName = trainer.full_name || '';
      const ptCode = trainer.pt_code || '';
      const branchName = trainer.branch_name || '';
      const phone = trainer.phone || '';
      const email = trainer.email || '';
      const specialties = trainer.specialties || '';
      const bio = trainer.bio || '';
      const avatarUrl = trainer.avatar_url;

      this.pendingAvatarFile = null;

      if (this.editPopupInstance) {
        this.editPopupInstance.dispose();
        this.editPopupInstance = null;
      }

      const $host = $('<div id="ptEditProfileDxPopupHost">').appendTo('body');
      this.editPopupInstance = $host.dxPopup({
        title: 'Chỉnh sửa hồ sơ HLV',
        width: () => Math.min(520, window.innerWidth - 24),
        height: 'auto',
        maxHeight: '90vh',
        shadingColor: 'rgba(0, 0, 0, 0.65)',
        showCloseButton: true,
        dragEnabled: false,
        hideOnOutsideClick: true,
        contentTemplate: function () {
          return $(`
            <div class="pt-dx-editprofile-content" style="padding: 4px 0;">
              <!-- Avatar Picker -->
              <div style="text-align: center; margin-bottom: 14px;">
                <div style="position: relative; display: inline-block; cursor: pointer;" id="dxBtnPickAvatar">
                  <img id="dxEditAvatarPreview" style="${avatarUrl ? '' : 'display:none;'} width: 72px; height: 72px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-light, #237b58);" src="${escapeAttribute(avatarUrl)}" alt="Avatar preview">
                  <div id="dxEditAvatarFallback" class="coach-avatar-lg" style="display: ${avatarUrl ? 'none' : 'flex'}; width: 72px; height: 72px; border-radius: 50%; background: var(--primary-light); color: var(--primary); align-items: center; justify-content: center; font-size: 24px; margin: 0 auto; border: 2px solid var(--border-color);">
                    <i class="fa-solid fa-user"></i>
                  </div>
                  <div style="position: absolute; bottom: 0; right: 0; background: var(--primary-light, #237b58); color: var(--text-main); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; box-shadow: none;">
                    <i class="fa-solid fa-camera"></i>
                  </div>
                </div>
                <input type="file" id="dxInputAvatarFile" accept="image/png,image/jpeg,image/webp" style="display: none;">
                <div style="font-size: 12px; color: var(--text-muted, #65736d); margin-top: 4px;">Chạm vào ảnh để đổi avatar (PNG, JPG, WebP &le; 5MB)</div>
              </div>

              <!-- Readonly info -->
              <div class="form-group" style="margin-bottom: 8px;">
                <label class="form-label" style="font-size: 12px; color: var(--text-muted, #65736d); display: block; margin-bottom: 2px;">Họ và tên HLV (Cố định)</label>
                <input type="text" class="form-control" value="${escapeAttribute(fullName)}" readonly style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); opacity: 0.8; padding: 6px 8px; border-radius: 6px; font-size: 12px;">
              </div>

              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <div style="flex: 1;">
                  <label class="form-label" style="font-size: 12px; color: var(--text-muted, #65736d); display: block; margin-bottom: 2px;">Mã PT</label>
                  <input type="text" class="form-control" value="${escapeAttribute(ptCode)}" readonly style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); opacity: 0.8; padding: 6px 8px; border-radius: 6px; font-size: 12px;">
                </div>
                <div style="flex: 1;">
                  <label class="form-label" style="font-size: 12px; color: var(--text-muted, #65736d); display: block; margin-bottom: 2px;">Chi nhánh</label>
                  <input type="text" class="form-control" value="${escapeAttribute(branchName)}" readonly style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); opacity: 0.8; padding: 6px 8px; border-radius: 6px; font-size: 12px;">
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 8px;">
                <label class="form-label" style="font-size: 12px; color: var(--text-muted, #65736d); display: block; margin-bottom: 2px;">Số điện thoại (Cố định)</label>
                <input type="text" class="form-control" value="${escapeAttribute(phone)}" readonly style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); opacity: 0.8; padding: 6px 8px; border-radius: 6px; font-size: 12px;">
              </div>

              <!-- Editable fields -->
              <div class="form-group" style="margin-bottom: 8px;">
                <label class="form-label" for="dxEditEmail" style="font-size: 12px; color: var(--text-main); display: block; margin-bottom: 2px;">Email liên hệ</label>
                <input type="email" class="form-control" id="dxEditEmail" maxlength="150" value="${escapeAttribute(email)}" placeholder="Nhập email liên hệ" style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 8px; border-radius: 6px; font-size: 12px;">
              </div>

              <div class="form-group" style="margin-bottom: 8px;">
                <label class="form-label" for="dxEditSpecialties" style="font-size: 12px; color: var(--text-main); display: block; margin-bottom: 2px;">Chuyên môn huấn luyện</label>
                <input type="text" class="form-control" id="dxEditSpecialties" maxlength="500" value="${escapeAttribute(specialties)}" placeholder="Ví dụ: Tăng cơ giảm mỡ, Boxing..." style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 8px; border-radius: 6px; font-size: 12px;">
              </div>

              <div class="form-group" style="margin-bottom: 8px;">
                <label class="form-label" for="dxEditBio" style="font-size: 12px; color: var(--text-main); display: block; margin-bottom: 2px;">Giới thiệu bản thân (Tối đa 1.000 ký tự)</label>
                <textarea class="form-control" id="dxEditBio" rows="3" maxlength="1000" placeholder="Mô tả kinh nghiệm, thế mạnh huấn luyện..." style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); padding: 6px 8px; border-radius: 6px; font-size: 12px; resize: vertical;">${$('<span>').text(bio).html()}</textarea>
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
              text: 'Hủy',
              stylingMode: 'outlined',
              type: 'normal',
              onClick: function () {
                self.closeEditProfileModal();
              }
            }
          },
          {
            widget: 'dxButton',
            toolbar: 'bottom',
            location: 'after',
            options: {
              text: 'Lưu thay đổi',
              type: 'default',
              icon: 'save',
              onClick: function (btnEvent) {
                self.handleEditProfileDx(btnEvent);
              }
            }
          }
        ],
        onShown: function () {
          // Bind avatar picker inside popup
          $('#dxBtnPickAvatar').on('click', function () {
            $('#dxInputAvatarFile').trigger('click');
          });

          $('#dxInputAvatarFile').on('change', function (e) {
            const file = e.target.files?.[0];
            if (!file) return;

            const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
            if (!validTypes.includes(file.type)) {
              ptApp.showToast('Ảnh đại diện phải thuộc định dạng PNG, JPEG hoặc WebP.', 'error');
              $(this).val('');
              return;
            }
            if (file.size > 5 * 1024 * 1024) {
              ptApp.showToast('Ảnh đại diện phải có dung lượng tối đa 5MB.', 'error');
              $(this).val('');
              return;
            }

            self.pendingAvatarFile = file;
            const reader = new FileReader();
            reader.onload = (ev) => {
              $('#dxEditAvatarPreview').attr('src', ev.target.result).show();
              $('#dxEditAvatarFallback').hide();
            };
            reader.readAsDataURL(file);
          });
        },
        onHidden: function () {
          if (self.editPopupInstance) {
            self.editPopupInstance.dispose();
            self.editPopupInstance = null;
          }
          $host.remove();
          self.pendingAvatarFile = null;
        }
      }).dxPopup('instance');

      this.editPopupInstance.show();
    }

    closeEditProfileModal() {
      if (this.editPopupInstance) {
        this.editPopupInstance.hide();
      }
      $('#editProfileModalBackdrop').removeClass('active');
      this.pendingAvatarFile = null;
    }

    async handleEditProfileDx(btnEvent) {
      $('.pt-field-error').remove();
      $('#dxEditEmail, #dxEditBio, #dxEditSpecialties').removeAttr('aria-invalid');
      const email = $('#dxEditEmail').val()?.trim() || '';
      const specialties = $('#dxEditSpecialties').val()?.trim() || '';
      const bio = $('#dxEditBio').val()?.trim() || '';

      if (email.length > 150 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        this.fieldError('#dxEditEmail', 'Email liên hệ không hợp lệ hoặc vượt quá 150 ký tự.');
        return;
      }
      if (bio.length > 1000) {
        this.fieldError('#dxEditBio', 'Giới thiệu bản thân không được vượt quá 1.000 ký tự.');
        return;
      }
      if (specialties.length > 500) {
        this.fieldError('#dxEditSpecialties', 'Chuyên môn không được vượt quá 500 ký tự.');
        return;
      }

      btnEvent.component.option('disabled', true);
      btnEvent.component.option('text', 'Đang lưu...');
      let avatarSaved = false;
      try {
        if (this.pendingAvatarFile) {
          const file = this.pendingAvatarFile;
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result;
              const base64 = res.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const avatarRes = await apiClient.mobile.uploadAvatar({
            content_base64: base64Data,
            mime_type: file.type
          });

          if (avatarRes.data?.avatar_url) {
            avatarSaved = true;
            this.pendingAvatarFile = null;
            if (this.trainerProfile) this.trainerProfile.avatar_url = avatarRes.data.avatar_url;
            if (this.coachData) this.coachData.avatar_url = avatarRes.data.avatar_url;
            if (window.ptApp?.currentUser) window.ptApp.currentUser.avatar_url = avatarRes.data.avatar_url;
            $('#profileAvatarImg').attr('src', avatarRes.data.avatar_url).show();
            $('#profileAvatarFallback').hide();
            window.ptApp?.refreshPersistentHeader();
          } else {
            throw new Error('Máy chủ chưa xác nhận ảnh đã được lưu.');
          }
        }

        const updateRes = await apiClient.mobile.updateProfile({
          email: email || null,
          specialties: specialties || null,
          bio: bio || null
        });

        if (updateRes.data) {
          Object.assign(this.trainerProfile, updateRes.data);
        }

        this.closeEditProfileModal();
        ptApp.showToast('Cập nhật hồ sơ thành công!', 'success');
        await this.loadProfile();
      } catch (err) {
        ptApp.showToast(avatarSaved ? 'Ảnh đã cập nhật; thông tin hồ sơ chưa lưu được. Vui lòng thử lại.' : err.message || 'Không thể lưu thay đổi hồ sơ, vui lòng kiểm tra kết nối mạng.', 'error');
      } finally {
        if (this.editPopupInstance) {
          btnEvent.component.option('disabled', false);
          btnEvent.component.option('text', 'Lưu thay đổi');
        }
      }
    }

    async handleEditProfile() {
      // Fallback
      this.openEditProfileModal();
    }

    // Modal helpers: Change Password with DevExtreme dxPopup (PT04-US01)
    openChangePasswordModal() {
      const self = this;
      if (this.changePassPopupInstance) {
        this.changePassPopupInstance.dispose();
        this.changePassPopupInstance = null;
      }

      const $host = $('<div id="ptChangePasswordDxPopupHost">').appendTo('body');
      this.changePassPopupInstance = $host.dxPopup({
        title: 'Đổi mật khẩu',
        width: () => Math.min(360, window.innerWidth - 24),
        height: 'auto',
        maxHeight: '80vh',
        shadingColor: 'rgba(0, 0, 0, 0.65)',
        showCloseButton: true,
        dragEnabled: false,
        hideOnOutsideClick: true,
        contentTemplate: function () {
          return $(`
            <div class="pt-dx-changepass-content" style="padding: 4px 0;">
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" for="dxCpCurrentPassword" style="display: block; font-size: 12px; margin-bottom: 4px; font-weight: 600;">Mật khẩu hiện tại</label>
                <input type="password" class="form-control" id="dxCpCurrentPassword" placeholder="Nhập mật khẩu hiện tại" style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px; border-radius: 6px; font-size: 13px;">
              </div>
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" for="dxCpNewPassword" style="display: block; font-size: 12px; margin-bottom: 4px; font-weight: 600;">Mật khẩu mới</label>
                <input type="password" class="form-control" id="dxCpNewPassword" placeholder="Tối thiểu 8 ký tự" style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px; border-radius: 6px; font-size: 13px;">
              </div>
              <div class="form-group" style="margin-bottom: 12px;">
                <label class="form-label" for="dxCpConfirmPassword" style="display: block; font-size: 12px; margin-bottom: 4px; font-weight: 600;">Xác nhận mật khẩu mới</label>
                <input type="password" class="form-control" id="dxCpConfirmPassword" placeholder="Nhập lại mật khẩu mới" style="width: 100%; box-sizing: border-box; background: var(--border-color); border: 1px solid var(--border-color); color: var(--text-main); padding: 8px; border-radius: 6px; font-size: 13px;">
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
              text: 'Hủy',
              stylingMode: 'outlined',
              type: 'normal',
              onClick: function () {
                self.closeChangePasswordModal();
              }
            }
          },
          {
            widget: 'dxButton',
            toolbar: 'bottom',
            location: 'after',
            options: {
              text: 'Cập nhật',
              type: 'default',
              icon: 'check',
              onClick: function (btnEvent) {
                self.handleChangePasswordDx(btnEvent);
              }
            }
          }
        ],
        onHidden: function () {
          if (self.changePassPopupInstance) {
            self.changePassPopupInstance.dispose();
            self.changePassPopupInstance = null;
          }
          $host.remove();
        }
      }).dxPopup('instance');

      this.changePassPopupInstance.show();
    }

    closeChangePasswordModal() {
      if (this.changePassPopupInstance) {
        this.changePassPopupInstance.hide();
      }
      $('#changePasswordModalBackdrop').removeClass('active');
    }

    async handleChangePasswordDx(btnEvent) {
      $('.pt-field-error').remove();
      $('#dxCpCurrentPassword, #dxCpNewPassword, #dxCpConfirmPassword').removeAttr('aria-invalid');
      const currentPass = $('#dxCpCurrentPassword').val();
      const newPass = $('#dxCpNewPassword').val();
      const confirmPass = $('#dxCpConfirmPassword').val();

      if (!currentPass || !newPass || !confirmPass) {
        this.fieldError(!currentPass ? '#dxCpCurrentPassword' : !newPass ? '#dxCpNewPassword' : '#dxCpConfirmPassword', 'Vui lòng điền đầy đủ các trường mật khẩu');
        return;
      }

      if (newPass.length < 8 || new TextEncoder().encode(newPass).length > 72 || !/[A-Z]/.test(newPass) || !/[a-z]/.test(newPass) || !/[0-9\W]/.test(newPass)) {
        this.fieldError('#dxCpNewPassword', 'Mật khẩu cần ít nhất 8 ký tự, tối đa 72 byte, gồm chữ hoa, chữ thường và số hoặc ký tự đặc biệt.');
        return;
      }

      if (newPass === currentPass) {
        this.fieldError('#dxCpNewPassword', 'Mật khẩu mới không được trùng với mật khẩu hiện tại');
        return;
      }

      if (newPass !== confirmPass) {
        this.fieldError('#dxCpConfirmPassword', 'Mật khẩu xác nhận không trùng khớp!');
        return;
      }

      btnEvent.component.option('disabled', true);
      btnEvent.component.option('text', 'Đang xử lý...');

      try {
        const res = await apiClient.auth.changePassword(currentPass, newPass);
        if (res.data?.access_token) apiClient.setTokens(res.data.access_token, res.data.refresh_token);
        if (res.data?.user) { apiClient.setUser(res.data.user); window.ptApp.currentUser = res.data.user; }
        this.closeChangePasswordModal();
        ptApp.showToast('Đã đổi mật khẩu thành công.', 'success');
      } catch (err) {
        ptApp.showToast(err.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.', 'error');
      } finally {
        if (this.changePassPopupInstance) {
          btnEvent.component.option('disabled', false);
          btnEvent.component.option('text', 'Cập nhật');
        }
      }
    }

    // Handle Change Password Form Submission (fallback)
    async handleChangePassword() {
      this.openChangePasswordModal();
    }

    // Modal helpers: Logout Confirmation (PT05-US03)
    reset() {
      this.coachData = null;
      this.trainerProfile = null;
      this.initialPreferences = null;
      this.loading = false;
      $('#profileFullName, #profilePtCode, #profileBranch, #profilePhone, #profileEmail, #profileWorkShift, #profileMembersKpi').text('--');
      $('#profileSpecialtiesList').empty();
      $('#profileBio').text('--');
      if (this.sessionsPopup) {
        this.sessionsPopup.dispose();
        this.sessionsPopup = null;
        $('#ptSessionsPopup').remove();
      }
      $('#toggleNotifSchedule, #toggleNotifResult, #toggleShowPhone, #toggle2FA').prop({checked:false, disabled:true});
      $('#btnSavePreferences').prop('disabled',true);
      this.closeChangePasswordModal();
      this.closeEditProfileModal();
    }

    openLogoutModal() {
      const self = this;
      if (window.DevExpress && DevExpress.ui && DevExpress.ui.dialog) {
        DevExpress.ui.dialog.confirm(
          'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng PT Paradise Gym không? Phiên làm việc hiện tại trên thiết bị này sẽ kết thúc.',
          'Xác nhận đăng xuất'
        ).done(function (dialogResult) {
          if (dialogResult) {
            self.handleLogout();
          }
        });
      } else {
        $('#logoutModalBackdrop').addClass('active');
      }
    }

    closeLogoutModal() {
      $('#logoutModalBackdrop').removeClass('active');
    }

    // PT05-US03: Handle Safe Logout
    async handleLogout() {
      this.closeLogoutModal();
      if (window.ptApp) ptApp.showToast('Đang đăng xuất khỏi ứng dụng...', 'info');

      let serverRevoked = false;
      try {
        if (window.apiClient && window.apiClient.auth && typeof window.apiClient.auth.logoutCurrent === 'function') {
          await window.apiClient.auth.logoutCurrent();
          serverRevoked = true;
        } else if (window.apiClient) {
          window.apiClient.clearAuth();
        }
      } catch (err) {
        console.warn('[PT05-US03] Exception on server logout (clearing local token):', err);
        if (window.apiClient) {
          window.apiClient.clearAuth();
        }
      }

      // Reset to login screen (PT05-US01)
      setTimeout(() => {
        if (window.ptApp) {
          ptApp.showAuthScreen();
          ptApp.showToast(serverRevoked
            ? 'Đã đăng xuất tài khoản.'
            : 'Đã xóa phiên trên thiết bị. Chưa xác nhận thu hồi phiên trên máy chủ.', serverRevoked ? 'success' : 'warning');
        }
      }, 400);
    }
  }

  window.PtProfileController = PtProfileController;
  window.ptProfile = new PtProfileController();

})(window, jQuery);
