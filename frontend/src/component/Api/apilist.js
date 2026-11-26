import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT (BUT skip for login/register)
api.interceptors.request.use(
  (config) => {
    // Do NOT attach token to public auth routes
    if (
      config.url.includes("/auth/login") ||
      config.url.includes("/auth/register")
    ) {
      return config;
    }

    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// Helpers
export const getStoredUserId = () => localStorage.getItem("userId");

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("user");
};

/* ==========================================
   1. AUTH
   ========================================== */
export const authApi = {
  login: async ({ identifier, password }) => {
    try {
      const response = await api.post("/auth/login", { identifier, password });
      const data = response.data;

      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", String(data.user.id));
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      return data;
    } catch (error) {
      // Pass the actual error message from the backend if available
      throw error.response ? error.response.data : new Error("Network Error");
    }
  },

  register: async ({ username, email, password, roleId }) => {
    try {
      const response = await api.post("/auth/register", {
        logincode: username,
        userfullname: username,
        email,
        password,
        roleIds: roleId ? [roleId] : [],
      });
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error("Network Error");
    }
  },

  logout: async () => {
    try {
      const response = await api.post("/auth/logout");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error("Network Error");
    } finally {
      clearSession();
    }
  },

  me: async () => {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : new Error("Network Error");
    }
  },
};

/* ==========================================
   2. MODULES
   ========================================== */
export const moduleApi = {
  getByUser: async (userId = getStoredUserId()) => {
    const response = await api.get(`/modules/user/${userId}`);
    return response.data;
  },
  getAll: async () => {
    const response = await api.get("/modules");
    return response.data;
  },
  getOne: async (id) => {
    const response = await api.get(`/modules/${id}`);
    return response.data;
  },
};

/* ==========================================
   3a. MEMBERSHIP / MEMBERSHIP TYPES / SERVICE TYPES
   ========================================== */
const unwrap = (promise) => promise.then((res) => res.data);

export const membershipApi = {
  // members
  list: (params) => unwrap(api.get("/members", { params })),
  create: (body) => unwrap(api.post("/members", body)),
  update: (id, body) => unwrap(api.put(`/members/${id}`, body)),
  deactivate: (id) => unwrap(api.patch(`/members/${id}/deactivate`)),
  imageUrl: (id) => `${BASE_URL}/members/${id}/image`,

  // sync
  syncNow: () => unwrap(api.post("/members/sync")),
  reset: () => unwrap(api.post("/members/sync/reset")),
  status: () => unwrap(api.get("/members/sync/status")),

  // memberships
  getMemberships: (memberId) =>
    unwrap(api.get(`/members/${memberId}/memberships`)),
  createMembership: (memberId, body) =>
    unwrap(api.post(`/members/${memberId}/memberships`, body)),
  updateMembership: (id, body) => unwrap(api.put(`/memberships/${id}`, body)),
  freezeMembership: (id) => unwrap(api.patch(`/memberships/${id}/freeze`)),
  unfreezeMembership: (id) => unwrap(api.patch(`/memberships/${id}/unfreeze`)),
};

export const membershipTypeApi = {
  list: (activeOnly = false) =>
    unwrap(api.get("/membership-types", { params: { activeOnly } })),
  create: (body) => unwrap(api.post("/membership-types", body)),
  update: (id, body) => unwrap(api.put(`/membership-types/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/membership-types/${id}`)),
};

export const serviceTypeApi = {
  list: (activeOnly = false) =>
    unwrap(api.get("/service-types", { params: { activeOnly } })),
  create: (body) => unwrap(api.post("/service-types", body)),
  update: (id, body) => unwrap(api.put(`/service-types/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/service-types/${id}`)),
};

/* ==========================================
   3c. MEMBERSHIP REQUESTS
   ========================================== */
export const membershipRequestApi = {
  list: async (params) =>
    (await api.get("/membership-requests", { params })).data,
  stats: async () => (await api.get("/membership-requests/stats/summary")).data,
  getOne: async (id) => (await api.get(`/membership-requests/${id}`)).data,
  approve: async (id, payload) =>
    (await api.post(`/membership-requests/${id}/approve`, payload)).data,
  reject: async (id, reason) =>
    (await api.patch(`/membership-requests/${id}/reject`, { reason })).data,
  reopen: async (id) =>
    (await api.patch(`/membership-requests/${id}/reopen`)).data,
  remove: async (id) => (await api.delete(`/membership-requests/${id}`)).data,
};

/* ==========================================
   4. SECURITY (Roles, Permissions, Users)
   ========================================== */
export const securityApi = {
  getRoles: async () => {
    const response = await api.get("/allroles");
    return response.data;
  },
  getactiveRoles: async () => {
    const response = await api.get("/activeroles");
    return response.data;
  },

  addRole: async ({ roleName, description }) => {
    const response = await api.post("/addrole", {
      RoleName: roleName,
      RoleDescription: description,
    });
    return response.data;
  },
  updateRole: async (id, { roleName, description }) => {
    const response = await api.put(`/updaterole/${id}`, {
      RoleName: roleName,
      RoleDescription: description,
    });
    return response.data;
  },
  deleteRole: async (id) => (await api.delete(`/deleterole/${id}`)).data,
  getAllPermissions: async () => {
    const response = await api.get("/permissions");
    return response.data;
  },
  getRolePermissions: async (roleId) => {
    const response = await api.get(`/roles/${roleId}/permissions`);
    return response.data;
  },
  updateRolePermissions: async (roleId, { permissionIds }) => {
    const response = await api.post(`/roles/${roleId}/permissions`, {
      permissionIds,
    });
    return response.data;
  },
  // Get all users
  getUsers: async () => {
    const response = await api.get("/users");
    return response.data;
  },

  // Register a new user
  addUser: async (data) => {
    const payload = {
      logincode: data.logincode,
      userfullname: data.userfullname,
      email: data.email,
      password: data.password,
      roleIds: data.roleIds || [],
      isActive: data.isActive ?? true,
    };

    console.log("Sending user registration:", payload);

    const response = await api.post("/users", payload);

    return response.data;
  },

  // Update an existing user
  updateUser: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  // Deactivate a user
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // Get user roles
  getUserRoles: async (userId) => {
    const response = await api.get(`/users/${userId}/roles`);
    return response.data;
  },

  getUserReport: async () => {
    const response = await api.get("/userreport");
    return response.data;
  },

  getRoleReports: async () => {
    const response = await api.get("/rolereports");
    return response.data;
  },
};

/* ==========================================
   5. WEB CONTENT
   ========================================== */
export const webApi = {
  getPages: async () => (await api.get("/pages")).data,
  addPage: async (data) => (await api.post("/pages", data)).data,
  updatePage: async (id, data) => (await api.put(`/pages/${id}`, data)).data,
  deletePage: async (id) => (await api.delete(`/pages/${id}`)).data,
  addSection: async (data) => (await api.post("/sections", data)).data,
  getSectionsByPage: async (pageId) =>
    (await api.get(`/sections/page/${pageId}`)).data,
  updateSection: async (id, data) =>
    (await api.put(`/sections/${id}`, data)).data,
  deleteSection: async (id) => (await api.delete(`/sections/${id}`)).data,
  getAllContent: async () => (await api.get("/contents")).data,
  getContentBySection: async (sectionId) =>
    (await api.get(`/contents/section/${sectionId}`)).data,
  addContent: async (data) => (await api.post("/contents", data)).data,
  updateContent: async (id, data) =>
    (await api.put(`/contents/${id}`, data)).data,
  deleteContent: async (id) => (await api.delete(`/contents/${id}`)).data,
  createReservation: async (payload) =>
    (await api.post("/reservations", payload)).data,
  createMembershipRequest: async (payload) =>
    (await api.post("/membership-requests", payload)).data,
};

/* ==========================================
   6. SMS (GeezSMS)
   ========================================== */
export const smsApi = {
  getConfig: async () => (await api.get("/sms/config")).data,
  updateConfig: async (payload) => (await api.put("/sms/config", payload)).data,
  getBalance: async () => (await api.get("/sms/balance")).data,
  sendTest: async ({ phone, message }) =>
    (await api.post("/sms/test", { phone, message })).data,
  send: async ({ phone, message }) =>
    (await api.post("/sms/send", { phone, message })).data,
  sendBulk: async ({ contacts, message }) =>
    (await api.post("/sms/send/bulk", { contacts, message })).data,
  sendOtp: async ({ phone }) => (await api.post("/sms/otp", { phone })).data,
  synclog: async () => (await api.get("/sms/synclog")).data,
};

/* ==========================================
   7. RESERVATIONS (Spa + Beauty Salon)
   ========================================== */
export const reservationApi = {
  list: async (params) => (await api.get("/reservations", { params })).data,
  stats: async (params) =>
    (await api.get("/reservations/stats/summary", { params })).data,
  getOne: async (id) => (await api.get(`/reservations/${id}`)).data,
  create: async (payload) => (await api.post("/reservations", payload)).data,
  updateStatus: async (id, status) =>
    (await api.patch(`/reservations/${id}/status`, { status })).data,
  approve: async (id) => reservationApi.updateStatus(id, "confirmed"),
  complete: async (id) => reservationApi.updateStatus(id, "completed"),
  cancel: async (id) => reservationApi.updateStatus(id, "cancelled"),
  reopen: async (id) => reservationApi.updateStatus(id, "pending"),
  remove: async (id) => (await api.delete(`/reservations/${id}`)).data,
};

export const smsTemplateApi = {
  list: (params = {}) => api.get("/sms/templates", { params }),
  get: (id) => api.get(`/sms/templates/${id}`),
  create: (data) => api.post("/sms/templates", data),
  update: (id, data) => api.put(`/sms/templates/${id}`, data),
  toggle: (id) => api.patch(`/sms/templates/${id}/toggle`),
  remove: (id) => api.delete(`/sms/templates/${id}`),
  preview: (body, values = {}) =>
    api.post("/sms/templates/preview", { body, values }),
  sendTest: (id, phone, values = {}) =>
    api.post(`/sms/templates/${id}/send-test`, { phone, values }),
};

export default api;
