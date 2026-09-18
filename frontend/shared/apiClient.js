/**
 * PARADISE GYM - UNIVERSAL REST API CLIENT SDK
 * Shared between Tab 1 (Web Admin), Tab 2 (Mobile Member), Tab 3 (Mobile PT)
 * Compatible with Vanilla JS, jQuery Ajax, DevExtreme CustomStore, and Node.js
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ParadiseApiClient = factory();
    root.apiClient = new root.ParadiseApiClient();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  class ParadiseApiClient {
    constructor(options = {}) {
      this.baseUrl = options.baseUrl || 'http://localhost:5000/api/v1';
      this.tokenKey = options.tokenKey || 'paradise_access_token';
      this.refreshTokenKey = options.refreshTokenKey || 'paradise_refresh_token';
      this.userKey = options.userKey || 'paradise_user';
      this.currentBranchKey = options.currentBranchKey || 'paradise_current_branch_id';
      this.inMemoryStore = {};
    }

    // Token Storage Helpers (supports localStorage & fallback)
    getItem(key) {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
      return this.inMemoryStore[key] || null;
    }

    setItem(key, value) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      } else {
        this.inMemoryStore[key] = value;
      }
    }

    removeItem(key) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      } else {
        delete this.inMemoryStore[key];
      }
    }

    getAccessToken() {
      return this.getItem(this.tokenKey);
    }

    getToken() {
      return this.getAccessToken();
    }

    setTokens(accessToken, refreshToken) {
      if (accessToken) this.setItem(this.tokenKey, accessToken);
      if (refreshToken) this.setItem(this.refreshTokenKey, refreshToken);
    }

    clearAuth() {
      this.removeItem(this.tokenKey);
      this.removeItem(this.refreshTokenKey);
      this.removeItem(this.userKey);
    }

    getUser() {
      const u = this.getItem(this.userKey);
      return u ? JSON.parse(u) : null;
    }

    setUser(user) {
      if (user) this.setItem(this.userKey, JSON.stringify(user));
    }

    getCurrentBranchId() {
      return this.getItem(this.currentBranchKey);
    }

    setCurrentBranchId(branchId) {
      if (branchId && branchId !== 'ALL') this.setItem(this.currentBranchKey, branchId);
      else this.removeItem(this.currentBranchKey);
    }

    // Base HTTP Request Wrapper
    async request(endpoint, options = {}) {
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      };

      const token = this.getAccessToken();
      if (token && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const currentBranchId = this.getCurrentBranchId();
      if (currentBranchId && currentBranchId !== 'ALL' && !headers['x-branch-id']) {
        headers['x-branch-id'] = currentBranchId;
      }
      if (headers['x-branch-id'] === 'ALL') delete headers['x-branch-id'];

      const config = {
        method: options.method || 'GET',
        headers
      };

      if (options.body && typeof options.body === 'object') {
        config.body = JSON.stringify(options.body);
      }

      try {
        const response = await fetch(url, config);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          // Handle 401 token expiry
          if (response.status === 401) {
            // Optional: can trigger refresh token logic or emit event
          }
          const error = new Error(data.message || `HTTP error! status: ${response.status}`);
          error.status = response.status;
          error.data = data;
          throw error;
        }

        return data;
      } catch (err) {
        throw err;
      }
    }

    // ==========================================
    // MODULE: AUTH & 2FA
    // ==========================================
    auth = {
      loginWithPassword: async (login_phone, password, active_role) => {
        const res = await this.request('/auth/login-password', {
          method: 'POST',
          body: { login_phone, password, ...(active_role ? { active_role } : {}) }
        });
        if (res.data && !res.data.requires_2fa) {
          this.setTokens(res.data.access_token, res.data.refresh_token);
          this.setUser(res.data.user);
        }
        return res;
      },

      requestOtp: (login_phone, temp_token, active_role) => {
        return this.request('/auth/request-otp', {
          method: 'POST',
          body: { login_phone, ...(temp_token ? { temp_token } : {}), ...(active_role ? { active_role } : {}) }
        });
      },

      loginWithOtp: async (login_phone, otp_code, password, active_role) => {
        const res = await this.request('/auth/login-otp', {
          method: 'POST',
          body: { login_phone, otp_code, ...(password ? { password } : {}), ...(active_role ? { active_role } : {}) }
        });
        if (res.data && !res.data.requires_2fa) {
          this.setTokens(res.data.access_token, res.data.refresh_token);
          this.setUser(res.data.user);
        }
        return res;
      },

      verify2fa: async (temp_token, otp_code) => {
        const res = await this.request('/auth/verify-2fa', {
          method: 'POST',
          body: { temp_token, otp_code }
        });
        if (res.data) {
          this.setTokens(res.data.access_token, res.data.refresh_token);
          this.setUser(res.data.user);
        }
        return res;
      },

      socialLogin: async (provider, email, full_name) => {
        const res = await this.request('/auth/social-login', {
          method: 'POST',
          body: { provider, email, full_name }
        });
        if (res.data) {
          this.setTokens(res.data.access_token, res.data.refresh_token);
          this.setUser(res.data.user);
        }
        return res;
      },

      getMe: () => this.request('/auth/me'),
      signupOtp: (data) => this.request('/auth/signup-otp', { method: 'POST', body: data }),
      signup: async (data) => {
        const res = await this.request('/auth/signup', { method: 'POST', body: data });
        if (res.data && !res.data.requires_2fa) {
          this.setTokens(res.data.access_token, res.data.refresh_token);
          this.setUser(res.data.user);
        }
        return res;
      },
      activationLookup: (identifier, active_role) => this.request('/auth/activation-lookup', { method: 'POST', body: { identifier, active_role } }),
      requestPhoneChange: (new_phone) => this.request('/auth/request-phone-change', { method: 'POST', body: { new_phone } }),
      confirmPhoneChange: async (new_phone, otp_code, challenge_token) => {
        const res = await this.request('/auth/confirm-phone-change', { method: 'POST', body: { new_phone, otp_code, challenge_token } });
        this.setTokens(res.data.access_token, res.data.refresh_token);
        this.setUser(res.data.user);
        return res;
      },
      getSecurity: () => this.request('/auth/security'),
      updateSecurity: (data) => this.request('/auth/security', { method: 'PUT', body: data }),
      changePassword: async (current_password, new_password) => {
        const res = await this.request('/auth/change-password', { method: 'POST', body: { current_password, new_password } });
        this.setTokens(res.data.access_token, res.data.refresh_token);
        this.setUser(res.data.user);
        return res;
      },

      logout: async () => {
        try {
          await this.request('/auth/logout', { method: 'POST' });
        } finally {
          this.clearAuth();
        }
      },

      getSessions: () => this.request('/auth/sessions'),

      logoutCurrent: async () => {
        try {
          return await this.request('/auth/logout-current', { method: 'POST' });
        } finally {
          this.clearAuth();
        }
      },

      logoutAll: async () => {
        try {
          return await this.request('/auth/logout-all', { method: 'POST' });
        } finally {
          this.clearAuth();
        }
      },

      revokeSession: (sessionId) => this.request(`/auth/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })
    };

    // ==========================================
    // MODULE: MEMBERS (HỘI VIÊN)
    // ==========================================
    members = {
      searchPhone: (phone) => this.request(`/members/search-phone?phone=${encodeURIComponent(phone)}`),
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/members${qs ? '?' + qs : ''}`);
      },
      getById: (id) => this.request(`/members/${id}`),
      create: (data) => this.request('/members', { method: 'POST', body: data }),
      update: (id, data) => this.request(`/members/${id}`, { method: 'PUT', body: data }),
      setStatus: (id, data) => this.request(`/members/${id}/status`, { method: 'PATCH', body: data }),
      consents: (id) => this.request(`/members/${id}/consents`)
    };

    // ==========================================
    // MODULE: PACKAGES & BRANCHES (GÓI TẬP & CHI NHÁNH)
    // ==========================================
    packages = {
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/packages${qs ? '?' + qs : ''}`);
      },
      getById: (id) => this.request(`/packages/${id}`),
      create: (data) => this.request('/packages', { method: 'POST', body: data }),
      update: (id, data) => this.request(`/packages/${id}`, { method: 'PUT', body: data }),
      setStatus: (id, data) => this.request(`/packages/${id}/status`, { method: 'PATCH', body: data })
    };

    branches = {
      list: (status) => this.request(`/branches${status ? '?' + new URLSearchParams(typeof status === 'object' ? status : {status}).toString() : ''}`),
      getById: (id) => this.request(`/branches/${id}`),
      create: (data) => this.request('/branches', { method: 'POST', body: data }),
      update: (id, data) => this.request(`/branches/${id}`, { method: 'PUT', body: data }),
      stats: (id) => this.request(`/branches/${id}/stats`)
    };

    // ==========================================
    // MODULE: REGISTRATIONS & PAYMENTS (BÁN GÓI & THU TIỀN 100%)
    // ==========================================
    registrations = {
      create: (data) => this.request('/registrations', { method: 'POST', body: data }),
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/registrations${qs ? '?' + qs : ''}`);
      },
      getById: (id) => this.request(`/registrations/${id}`),
      renew: (id, data) => this.request(`/registrations/${id}/renew`, { method: 'POST', body: data }),
      assignPt: (id, data) => this.request(`/registrations/${id}/assign-pt`, { method: 'POST', body: data }),
      cancel: (id, data = {}) => this.request(`/registrations/${id}/cancel`, { method: 'POST', body: data })
    };

    payments = {
      list: (params = {}) => this.request('/payments?' + new URLSearchParams(params)),
      stats: (params = {}) => this.request('/payments/stats?' + new URLSearchParams(params)),
      createInvoice: (data) => this.request('/payments/create-invoice', { method: 'POST', body: data }),
      confirm: (paymentId, data = {}) => this.request(`/payments/${paymentId}/confirm`, { method: 'POST', body: data }),
      getReceipt: (paymentId) => this.request(`/payments/${paymentId}/receipt`),
      checkBankStatus: (paymentId) => this.request(`/payments/${paymentId}/check-bank-status`, { method: 'POST' })
    };

    // ==========================================
    // MODULE: PT BOOKINGS (LỊCH TẬP PT & XÁC NHẬN KÉP)
    // ==========================================
    pt = {
      createTrainer: (data) => this.request('/pt-bookings/trainers', { method: 'POST', body: data }),
      updateTrainer: (id, data) => this.request(`/pt-bookings/trainers/${id}`, { method: 'PUT', body: data }),
      setTrainerStatus: (id, data) => this.request(`/pt-bookings/trainers/${id}/status`, { method: 'PATCH', body: data }),
      reconcileBooking: (id) => this.request(`/pt-bookings/${id}/confirm`, { method: 'POST' }),
      listTrainers: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/pt-bookings/trainers${qs ? '?' + qs : ''}`);
      },
      getAvailableSlots: (pt_id, date) => this.request(`/pt-bookings/available-slots?pt_id=${pt_id}&date=${date}`),
      listBookings: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/pt-bookings${qs ? '?' + qs : ''}`);
      },
      createBooking: (data) => this.request('/pt-bookings', { method: 'POST', body: data }),
      cancelBooking: (bookingId, reason, accept_late_fee = false) => this.request(`/pt-bookings/${bookingId}/cancel`, { method: 'POST', body: { reason, accept_late_fee } }),
      ptConfirm: (bookingId, data = {}) => this.request(`/pt-bookings/${bookingId}/pt-confirm`, { method: 'POST', body: data }),
      memberConfirm: (bookingId) => this.request(`/pt-bookings/${bookingId}/member-confirm`, { method: 'POST' }),
      requestAssignment: (data) => this.request('/pt-bookings/assignment-request', { method: 'POST', body: data }),
      listAssignmentRequests: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/pt-bookings/assignment-requests${qs ? '?' + qs : ''}`);
      },
      respondAssignment: (requestId, status, response_note) => this.request(`/pt-bookings/assignment-request/${requestId}/respond`, { method: 'POST', body: { status, response_note } })
    };

    // ==========================================
    // MODULE: ACCESS GATE (KIỂM SOÁT RA VÀO)
    // ==========================================
    gate = {
      searchMembers: (q) => this.request('/access-gate/members?' + new URLSearchParams({q})),
      getMember: (id) => this.request(`/access-gate/member/${id}`),
      getLogs: (params = {}) => this.request('/access-gate/logs?' + new URLSearchParams(params)),
      presence: (member_id) => this.request('/access-gate/presence?' + new URLSearchParams({member_id})),
      checkIn: (data) => this.request('/access-gate/check-in', { method: 'POST', body: data }),
      manualCheckIn: (data) => this.request('/access-gate/manual-checkin', { method: 'POST', body: data }),
      getTodayLogs: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return this.request(`/access-gate/today-logs${qs ? '?' + qs : ''}`);
      }
    };

    notifications = {
      list: (params = {}) => this.request('/notifications?' + new URLSearchParams(params)),
      markAsRead: (id) => this.request(`/notifications/${id}/read`, { method: 'PUT' }),
      markAllAsRead: () => this.request('/notifications/read-all', { method: 'PUT' }),
      history: (params = {}) => this.request('/notifications/history?' + new URLSearchParams(params)),
      templates: () => this.request('/notifications/templates'),
      rules: () => this.request('/notifications/rules'),
      events: () => this.request('/notifications/events')
    };

    dashboard = { get: (params = {}) => this.request('/dashboard?' + new URLSearchParams(params)) };
    mobile = {
      profile: () => this.request('/mobile/profile'),
      updateProfile: (data) => this.request('/mobile/profile', { method: 'PUT', body: data }),
      getPreferences: () => this.request('/mobile/preferences'),
      updatePreferences: (data) => this.request('/mobile/preferences', { method: 'PUT', body: data }),
      uploadAvatar: (data) => this.request('/mobile/avatar', { method: 'POST', body: data }),
      ptStatistics: (period = 'month') => this.request('/mobile/pt/statistics?' + new URLSearchParams({ period }))
    };
    reports = { get: (params = {}) => this.request('/reports?' + new URLSearchParams(params)) };
    devices = {
      list: (params = {}) => this.request('/devices?' + new URLSearchParams(params)),
      create: (data) => this.request('/devices', { method: 'POST', body: data }),
      update: (id, data) => this.request(`/devices/${id}`, { method: 'PUT', body: data }),
      catalog: () => this.request('/devices/catalog')
    };
    accounts = {
      list: (params = {}) => this.request('/accounts?' + new URLSearchParams(params)),
      stats: () => this.request('/accounts/stats'),
      update: (id, data) => this.request(`/accounts/${id}`, { method: 'PUT', body: data })
    };

    // ==========================================
    // DEVEVENT & DEVEEXTREME INTEGRATION HELPER
    // ==========================================
    createDevExtremeCustomStore(endpoint, keyExpr = 'id') {
      const client = this;
      return {
        key: keyExpr,
        load: async function (loadOptions) {
          const params = {};
          if (loadOptions.skip) params.page = Math.floor(loadOptions.skip / (loadOptions.take || 20)) + 1;
          if (loadOptions.take) params.limit = loadOptions.take;
          if (loadOptions.searchValue) params.q = loadOptions.searchValue;

          const res = await client.request(endpoint + '?' + new URLSearchParams(params).toString());
          if (res.data && Array.isArray(res.data.items)) {
            return {
              data: res.data.items,
              totalCount: res.data.total
            };
          }
          return {
            data: Array.isArray(res.data) ? res.data : [],
            totalCount: Array.isArray(res.data) ? res.data.length : 0
          };
        },
        byKey: async function (key) {
          const res = await client.request(`${endpoint}/${key}`);
          return res.data;
        },
        insert: async function (values) {
          const res = await client.request(endpoint, { method: 'POST', body: values });
          return res.data;
        },
        update: async function (key, values) {
          const res = await client.request(`${endpoint}/${key}`, { method: 'PUT', body: values });
          return res.data;
        }
      };
    }
  }

  return ParadiseApiClient;
});
