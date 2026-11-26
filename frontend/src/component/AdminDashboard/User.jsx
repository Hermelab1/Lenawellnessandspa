import React, { useState, useEffect, useCallback } from "react";
import { securityApi } from "../Api/apilist";
import { UserPlus, Trash2, Edit2, Search, X } from "lucide-react";

const EMPTY_FORM = {
  logincode: "",
  userfullname: "",
  email: "",
  password: "",
  roleId: "",
  isActive: true,
};

const roleLabel = (r) => r?.RoleName ?? r?.roleName ?? "N/A";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [status, setStatus] = useState({ type: "", msg: "" });
  // ✅ Tracks whether the user actually changed the role field
  const [roleTouched, setRoleTouched] = useState(false);

  const flash = useCallback((type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: "", msg: "" }), 3500);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await securityApi.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      flash("error", err?.response?.data?.message || "Failed to load users");
    }
  }, [flash]);

  useEffect(() => {
    (async () => {
      try {
        const [uRes, rRes] = await Promise.all([
          securityApi.getUsers(),
          securityApi.getactiveRoles(),
        ]);
        setUsers(uRes.data || []);
        setRoles(rRes.data || []);
      } catch (err) {
        console.error("Fetch error", err);
        flash(
          "error",
          err?.response?.data?.message || err?.message || "Failed to load data"
        );
      }
    })();
  }, [flash]);

  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setRoleTouched(false);
  };


const buildPayload = () => {
  const payload = {
    logincode: form.logincode.trim(),
    userfullname: form.userfullname.trim(),
    email: form.email.trim(),
    isActive: Boolean(form.isActive),
  };

  // Send role assignments when creating or changing roles
  if (!editingId || roleTouched) {
    payload.roleIds = form.roleId
      ? [Number(form.roleId)]
      : [];
  }

  // Password is required when creating a user
  if (form.password) {
    payload.password = form.password;
  }

  return payload;
};

const handleSubmit = async (e) => {
  e.preventDefault();

  const payload = buildPayload();

  // Frontend validation
  const missing = [];

  if (!payload.logincode) missing.push("Username");
  if (!payload.userfullname) missing.push("Full Name");
  if (!payload.email) missing.push("Email");

  if (!editingId && !payload.password) {
    missing.push("Password");
  }

  if (
    !editingId &&
    (!Array.isArray(payload.roleIds) || payload.roleIds.length === 0)
  ) {
    missing.push("Role");
  }

  if (missing.length > 0) {
    flash("error", `Please fill: ${missing.join(", ")}`);
    return;
  }

  // Debug: verify the actual request data
  console.log("USER API PAYLOAD:", payload);

  setLoading(true);

  try {
    let res;

    if (editingId) {
      res = await securityApi.updateUser(editingId, payload);
    } else {
      res = await securityApi.addUser(payload);
    }

    if (res.success) {
      await fetchUsers();

      flash(
        "success",
        editingId
          ? "User updated successfully!"
          : "User registered successfully!"
      );

      resetForm();
    } else {
      flash("error", res.message || "User operation failed");
    }
  } catch (err) {
    console.error("User registration error:", err);
    console.error("Backend response:", err?.response?.data);

    flash(
      "error",
      err?.response?.data?.message ||
        err?.message ||
        "User operation failed"
    );
  } finally {
    setLoading(false);
  }
};



  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this user?")) return;
    try {
      const res = await securityApi.deleteUser(id);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isActive: false } : u))
        );
        if (editingId === id) resetForm();
        flash("success", "User deactivated");
      }
    } catch (err) {
      flash(
        "error",
        err?.response?.data?.message || err?.message || "Delete failed"
      );
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setForm({
      logincode: user.logincode || "",
      userfullname: user.userfullname || "",
      email: user.email || "",
      roleId: user.roles?.[0]?.id ?? "",
      password: "",
      isActive: user.isActive ?? true,
    });
    setRoleTouched(false); // ✅ reset "touched" flag
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const term = searchTerm.toLowerCase().trim();
  const filteredUsers = users.filter(
    (u) =>
      !term ||
      u?.logincode?.toLowerCase().includes(term) ||
      u?.userfullname?.toLowerCase().includes(term) ||
      u?.email?.toLowerCase().includes(term)
  );

  return (
    <div className="mx-auto space-y-6">
      {/* FORM */}
      <section className="bg-white rounded-xl shadow-sm border p-5">
        <div className="flex items-center gap-2 mb-4 text-indigo-600">
          {editingId ? <Edit2 size={20} /> : <UserPlus size={20} />}
          <h2 className="font-bold">
            {editingId ? "Edit User" : "Register User"}
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input
            className="border p-2 rounded-lg text-sm"
            placeholder="Username"
            value={form.logincode}
            onChange={(e) => setForm({ ...form, logincode: e.target.value })}
            required
          />
          <input
            className="border p-2 rounded-lg text-sm"
            placeholder="Full Name"
            value={form.userfullname}
            onChange={(e) =>
              setForm({ ...form, userfullname: e.target.value })
            }
            required
          />
          <input
            className="border p-2 rounded-lg text-sm"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="border p-2 rounded-lg text-sm"
            type="password"
            placeholder={editingId ? "New Password (optional)" : "Password"}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editingId}
            autoComplete="new-password"
          />

          <select
            className="border p-2 rounded-lg text-sm bg-white"
            value={form.roleId}
            onChange={(e) => {
              setForm({ ...form, roleId: e.target.value });
              setRoleTouched(true); // ✅ mark as changed
            }}
            required={!editingId}
          >
            <option value="">Select Role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {roleLabel(r)}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-gray-700 px-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-600"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
            />
            Active
          </label>

          <div className="md:col-span-4 flex justify-between items-center mt-2">
            <span
              className={`text-xs ${
                status.type === "error" ? "text-red-500" : "text-green-600"
              }`}
            >
              {status.msg}
            </span>

            <div className="flex gap-2">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm bg-gray-100 rounded-lg flex items-center gap-1"
                >
                  <X size={14} /> Cancel
                </button>
              )}
              <button
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-60"
              >
                {loading ? "..." : editingId ? "Update" : "Register"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-700">Accounts ({users.length})</h3>
          <div className="relative">
            <Search
              className="absolute left-2 top-2.5 text-gray-400"
              size={14}
            />
            <input
              className="pl-8 pr-3 py-1.5 border rounded-md text-xs w-48"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b">
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <p className="font-semibold">{user.logincode}</p>
                  <p className="text-xs text-gray-500">{user.userfullname}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </td>
                <td className="p-3 space-x-1">
                  {user.roles?.length ? (
                    user.roles.map((r) => (
                      <span
                        key={r.id}
                        className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"
                      >
                        {roleLabel(r)}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      N/A
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${
                      user.isActive
                        ? "bg-green-50 text-green-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-right space-x-3">
                  <button
                    onClick={() => startEdit(user)}
                    title="Edit"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    title="Deactivate"
                    disabled={!user.isActive}
                    className="text-red-500 hover:text-red-700 disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-6 text-center text-gray-400 text-xs"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;