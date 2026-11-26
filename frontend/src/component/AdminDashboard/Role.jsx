import React, { useState, useEffect, useCallback } from "react";
import { securityApi } from "../Api/apilist";
import { Shield, Edit3, Lock, Unlock, Save, Trash2, Search } from "lucide-react";

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ roleName: "", description: "", isActive: true });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState({ type: "", msg: "" });
  const [selectedRole, setSelectedRole] = useState(null);
  const [allPermissions, setAllPermissions] = useState({});
  const [rolePermissions, setRolePermissions] = useState([]);
  const [permissionLoading, setPermissionLoading] = useState(false);

  const showStatus = useCallback((type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: "", msg: "" }), 4000);
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await securityApi.getRoles();
      if (res.success) setRoles(res.data || []);
    } catch (err) {
      console.error(err);
      showStatus("error", "Could not load roles");
    }
  }, [showStatus]);

  const fetchAllPermissions = useCallback(async () => {
    try {
      const res = await securityApi.getAllPermissions();
      if (res.success && Array.isArray(res.permissions)) {
        const grouped = res.permissions.reduce((acc, perm) => {
          const moduleName =
            perm.module?.ModuleName ||
            perm.module?.moduleName ||
            perm.module?.name ||
            "Other";
          const submodule =
            perm.module?.Submodule || perm.module?.submodule || "";
          const groupKey = submodule
            ? `${moduleName} — ${submodule}`
            : moduleName;
          if (!acc[groupKey]) {
            acc[groupKey] = { module: perm.module, permissions: [] };
          }
          acc[groupKey].permissions.push(perm);
          return acc;
        }, {});
        setAllPermissions(grouped);
      }
    } catch (err) {
      console.error("fetchAllPermissions error:", err);
    }
  }, []);

  const fetchRolePermissions = useCallback(
    async (roleId) => {
      setPermissionLoading(true);
      try {
        const res = await securityApi.getRolePermissions(roleId);
        const list = res?.data?.permissions || [];
        setRolePermissions(list.map((p) => p.id ?? p.PermissionId));
      } catch (err) {
        console.error(err);
        showStatus("error", "Failed to load permissions");
      } finally {
        setPermissionLoading(false);
      }
    },
    [showStatus],
  );

  useEffect(() => {
    fetchRoles();
    fetchAllPermissions();
  }, [fetchRoles, fetchAllPermissions]);

  useEffect(() => {
    if (selectedRole) fetchRolePermissions(selectedRole.id);
  }, [selectedRole, fetchRolePermissions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        roleName: form.roleName,
        description: form.description,
        isActive: form.isActive,
      };
      const res = editingId
        ? await securityApi.updateRole(editingId, payload)
        : await securityApi.addRole(payload);

      if (res.success) {
        await fetchRoles();
        setForm({ roleName: "", description: "", isActive: true });
        setEditingId(null);
        showStatus("success", editingId ? "Role updated" : "Role created");
      } else {
        showStatus("error", res.message || "Submit failed");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", err.message || "Submit failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setPermissionLoading(true);
    try {
      const res = await securityApi.updateRolePermissions(selectedRole.id, {
        permissionIds: rolePermissions,
      });
      if (res?.success === false) {
        showStatus("error", res.message || "Update failed");
      } else {
        showStatus("success", "Permissions updated");
      }
    } catch (err) {
      console.error(err);
      showStatus("error", err.message || "Update failed");
    } finally {
      setPermissionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this role?")) return;
    try {
      const res = await securityApi.deleteRole(id);
      // Backend now returns 200 with {success:true, data:{isActive:false}} when
      // the role was only deactivated because users were assigned.
      if (res?.data?.isActive === false) {
        showStatus("success", res.message || "Role deactivated (assigned to users)");
      } else {
        showStatus("success", "Role deleted");
      }
      if (selectedRole?.id === id) setSelectedRole(null);
      await fetchRoles();
    } catch (err) {
      console.error(err);
      showStatus("error", err?.response?.data?.message || "Delete failed");
    }
  };

  const togglePermission = (id) => {
    setRolePermissions((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const filteredRoles = roles.filter((r) =>
    (r.RoleName || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="text-blue-600" /> Access Control
          </h1>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search roles..."
              className="pl-9 pr-4 py-2 border rounded-xl text-sm"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        {status.msg && (
          <div
            className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg z-50 text-white ${
              status.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {status.msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border shadow-sm h-fit">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "Edit Role" : "New Role"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="roleName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Role Name
                </label>
                <input
                  id="roleName"
                  className="w-full p-3 border rounded-xl text-sm"
                  placeholder="Role Name"
                  value={form.roleName}
                  onChange={(e) =>
                    setForm({ ...form, roleName: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Role Description
                </label>
                <textarea
                  id="description"
                  className="w-full p-3 border rounded-xl text-sm"
                  placeholder="Role Description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                  />
                  Active
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save Role"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm({
                        roleName: "",
                        description: "",
                        isActive: true,
                      });
                    }}
                    className="px-4 bg-gray-100 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="lg:col-span-2 space-y-4">
            {filteredRoles.map((role) => (
              <div
                key={role.id}
                className="bg-white p-5 rounded-2xl border shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg">
                      {role.RoleName}
                      {role.isActive === false && (
                        <span className="ml-2 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                          inactive
                        </span>
                      )}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {role.RoleDescription}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setSelectedRole(
                          selectedRole?.id === role.id ? null : role,
                        )
                      }
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg"
                      title="Manage Permissions"
                    >
                      {selectedRole?.id === role.id ? (
                        <Unlock size={20} />
                      ) : (
                        <Lock size={20} />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(role.id);
                        setForm({
                          roleName: role.RoleName,
                          description: role.RoleDescription,
                          isActive: role.isActive !== false,
                        });
                      }}
                      className="p-2 text-amber-600"
                      title="Edit Role"
                    >
                      <Edit3 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="p-2 text-red-600"
                      title="Delete Role"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>

                {selectedRole?.id === role.id && (
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex justify-between items-center mb-4">
                      <span className="font-bold text-sm">
                        Module Permissions
                      </span>
                      <button
                        onClick={handleSavePermissions}
                        disabled={permissionLoading}
                        className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50 font-medium"
                      >
                        <Save size={14} /> Save Changes
                      </button>
                    </div>

                    {permissionLoading ? (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        Loading permissions...
                      </div>
                    ) : Object.keys(allPermissions).length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        No permissions found.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                        {Object.entries(allPermissions).map(
                          ([groupKey, group]) => (
                            <div
                              key={groupKey}
                              className="border rounded-xl overflow-hidden bg-white"
                            >
                              <div className="bg-gray-50 px-3 py-2 font-semibold text-xs text-gray-700 border-b">
                                {groupKey}
                              </div>
                              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {group.permissions.map((p) => {
                                  const pid = p.id ?? p.PermissionId;
                                  const actionName =
                                    p.action?.ActionName ||
                                    p.action?.actionName ||
                                    p.action?.name ||
                                    "action";
                                  return (
                                    <label
                                      key={pid}
                                      className="flex items-center gap-2 text-xs cursor-pointer select-none"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={rolePermissions.includes(pid)}
                                        onChange={() => togglePermission(pid)}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <span className="text-gray-700">
                                        {actionName}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;