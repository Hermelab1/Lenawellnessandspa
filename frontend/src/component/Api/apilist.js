import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT
api.interceptors.request.use(
  (config) => {
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
   3. MEMBERSHIP
   ========================================== */
export const membershipApi = {
  syncNow: async () => (await api.post("/members/sync")).data,
  reset: async () => (await api.post("/members/sync/reset")).data,
  status: async () => (await api.get("/members/sync/status")).data,
  list: async (params) => (await api.get("/members", { params })).data,
  getOne: async (id) => (await api.get(`/members/${id}`)).data,
};

/* ==========================================
   4. SECURITY (Roles, Permissions, Users)
   ========================================== */
export const securityApi = {
  /* ---------- Roles ---------- */
  getRoles: async () => {
    const response = await api.get("/roles");
    return response.data; // { success, data: [...] }
  },

  addRole: async ({ roleName, description }) => {
    const response = await api.post("/roles", {
      RoleName: roleName,
      RoleDescription: description,
    });
    return response.data;
  },

  updateRole: async (id, { roleName, description }) => {
    const response = await api.put(`/roles/${id}`, {
      RoleName: roleName,
      RoleDescription: description,
    });
    return response.data;
  },

  deleteRole: async (id) => (await api.delete(`/roles/${id}`)).data,

  /* ---------- Permissions ---------- */
  getAllPermissions: async () => {
    const response = await api.get("/permissions");
    return response.data; // { success, permissions: [...] }
  },

  getRolePermissions: async (roleId) => {
    const response = await api.get(`/roles/${roleId}/permissions`);
    return response.data; // { success, data: { ..., permissions: [...] } }
  },

  updateRolePermissions: async (roleId, { permissionIds }) => {
    const response = await api.post(`/roles/${roleId}/permissions`, {
      permissionIds,
    });
    return response.data;
  },

  /* ---------- Users ---------- */
  getUsers: async () => {
    const response = await api.get("/users");
    return response.data; // { success, data: [...] }
  },

  addUser: async ({ username, email, password, roleId }) => {
    const response = await api.post("/users", {
      logincode: username,
      userfullname: username,
      email,
      password,
      roleIds: roleId ? [roleId] : [],
    });
    return response.data;
  },

  updateUser: async (id, { username, email, password, roleId }) => {
    const response = await api.put(`/users/${id}`, {
      logincode: username,
      userfullname: username,
      email,
      password: password || undefined,
      roleIds: roleId ? [roleId] : [],
    });
    return response.data;
  },

  deleteUser: async (id) => (await api.delete(`/users/${id}`)).data,

  getUserRoles: async (userId = getStoredUserId()) => {
    const response = await api.get(`/users/${userId}/roles`);
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
};

export default api;
