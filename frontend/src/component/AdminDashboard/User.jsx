import React, { useState, useEffect } from "react";
import { securityApi } from "../Api/apilist";
import { UserPlus, Trash2, Edit2, Search } from "lucide-react";

const EMPTY_FORM = { username: "", email: "", password: "", roleId: "" };

const roleLabel = (r) => r?.RoleName ?? r?.roleName ?? "N/A";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState({ type: "", msg: "" });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const flash = (type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: "", msg: "" }), 3000);
  };

  // Backend: GET /users -> { success, data: [...] }, GET /roles -> { success, data: [...] }
  const fetchUsers = async () => {
    const res = await securityApi.getUsers();
    setUsers(res.data || []);
  };

  const fetchInitialData = async () => {
    try {
      const [uRes, rRes] = await Promise.all([
        securityApi.getUsers(),
        securityApi.getRoles(),
      ]);
      setUsers(uRes.data || []);
      setRoles(rRes.data || []);
    } catch (err) {
      console.error("Fetch error", err);
      flash("error", err?.response?.data?.message || err?.message || "Failed to load data");
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = editingId
        ? await securityApi.updateUser(editingId, form)
        : await securityApi.addUser(form);

      if (res.success) {
        // Refetch so roles (many-to-many include) are accurate
        await fetchUsers();
        flash("success", `User ${editingId ? "updated" : "registered"}!`);
        resetForm();
      } else {
        flash("error", res.message || "Action failed");
      }
    } catch (err) {
      flash("error", err?.response?.data?.message || err?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;

    try {
      const res = await securityApi.deleteUser(id);
      if (res.success) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
        if (editingId === id) resetForm();
      }
    } catch (err) {
      flash("error", err?.response?.data?.message || "Delete failed");
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setForm({
      username: user.logincode || "",
      email: user.email || "",
      roleId: user.roles?.[0]?.id ?? "",
      password: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const term = searchTerm.toLowerCase();
  const filteredUsers = users.filter(
    (u) =>
      u?.logincode?.toLowerCase().includes(term) ||
      u?.userfullname?.toLowerCase().includes(term) ||
      u?.email?.toLowerCase().includes(term),
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
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
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
          />

          <select
            className="border p-2 rounded-lg text-sm bg-white"
            value={form.roleId}
            onChange={(e) => setForm({ ...form, roleId: e.target.value })}
            required
          >
            <option value="">Select Role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {roleLabel(r)}
              </option>
            ))}
          </select>

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
                  className="px-4 py-2 text-sm bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              )}

              <button
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold"
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
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-3">
                  <p className="font-semibold">
                    {user.logincode || user.userfullname}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
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

                <td className="p-3 text-right space-x-2">
                  <button onClick={() => startEdit(user)} title="Edit">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(user.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-gray-400 text-xs">
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