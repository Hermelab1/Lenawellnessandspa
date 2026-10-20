// src/Components/SideMenu.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { moduleApi } from "../../Api/apilist";
import logo from "../../../asset/img/Logo/Logos.png";

/**
 * SideMenu Component
 * ------------------
 * Props:
 *   - onMenuSelect(title, meta?)
 *   - userId (number|string): optional, falls back to storage
 */
const SideMenu = ({ onMenuSelect, userId: userIdProp }) => {
  const [openSubMenu, setOpenSubMenu] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();

  const resolveUserId = useCallback(() => {
    if (userIdProp) return userIdProp;
    return (
      localStorage.getItem("userId") ||
      sessionStorage.getItem("userId") ||
      null
    );
  }, [userIdProp]);

  const iconMap = {
    dashboard: "fa-solid fa-gauge-high",
    users: "fa-solid fa-users",
    "user management": "fa-solid fa-users-gear",
    security: "fa-solid fa-shield-halved",
    roles: "fa-solid fa-user-shield",
    permissions: "fa-solid fa-key",
    reports: "fa-solid fa-chart-line",
    setting: "fa-solid fa-gear",
    settings: "fa-solid fa-gear",
    inventory: "fa-solid fa-boxes-stacked",
    sales: "fa-solid fa-cart-shopping",
    purchases: "fa-solid fa-truck",
    finance: "fa-solid fa-coins",
    hr: "fa-solid fa-user-tie",
    payroll: "fa-solid fa-money-check-dollar",
    website: "fa-solid fa-globe",
    gym: "fa-solid fa-dumbbell",
    sms: "fa-solid fa-comment-sms",
  };

  const getIcon = (moduleName = "") =>
    iconMap[moduleName.toLowerCase().trim()] || "fa-solid fa-folder";

  /**
   * ✅ CHANGED: now prefixes with /admin and matches routeConfig keys exactly.
   * toPath("Security", "User")        => "/admin/security-user"
   * toPath("Gym", "Membership type")  => "/admin/gym-membership-type"
   */
  const toPath = (moduleName = "", submodule = "") => {
    const raw = submodule ? `${moduleName}-${submodule}` : moduleName;
    const slug = raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `/admin/${slug}`;
  };

  const buildMenuStructure = (modules = []) => {
    const grouped = new Map();

    modules.forEach((mod) => {
      if (!grouped.has(mod.moduleName)) {
        grouped.set(mod.moduleName, {
          title: mod.moduleName,
          icon: getIcon(mod.moduleName),
          path: null,
          submenu: [],
          actions: [],
        });
      }

      const entry = grouped.get(mod.moduleName);

      (mod.actions || []).forEach((act) => {
        if (!entry.actions.find((a) => a.actionId === act.actionId)) {
          entry.actions.push(act);
        }
      });

      if (mod.submodule && mod.submodule.trim() !== "") {
        const exists = entry.submenu.find(
          (s) => s.title.toLowerCase() === mod.submodule.toLowerCase()
        );
        if (!exists) {
          entry.submenu.push({
            title: mod.submodule,
            path: toPath(mod.moduleName, mod.submodule),
          });
        }
      }
    });

    return Array.from(grouped.values()).map((item) => {
      if (item.submenu.length === 0) item.path = toPath(item.title);
      return item;
    });
  };

  const fetchMenu = useCallback(async () => {
    const userId = resolveUserId();
    if (!userId) {
      setError("No user session found. Please log in again.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await moduleApi.getByUser(userId);
      if (data?.success && Array.isArray(data.data)) {
        setMenuItems(buildMenuStructure(data.data));
      } else {
        setMenuItems([]);
      }
    } catch (err) {
      console.error("SideMenu fetch error:", err);
      setError(err?.message || "Failed to load menu. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [resolveUserId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Auto-open submenu that matches the current URL
  useEffect(() => {
    if (!menuItems.length) return;
    const idx = menuItems.findIndex((item) =>
      (item.submenu || []).some((sub) => sub.path === location.pathname)
    );
    if (idx !== -1 && openSubMenu !== idx) setOpenSubMenu(idx);
  }, [menuItems, location.pathname]); // eslint-disable-line

  const emitSelect = (title, meta = null) => {
    if (typeof onMenuSelect === "function") onMenuSelect(title, meta);
  };

  const toggleSubMenu = (index, item) => {
    setOpenSubMenu(openSubMenu === index ? null : index);
    emitSelect(item.title, { module: item.title, submodule: null, path: null });
  };

  const isParentActive = (item) => {
    if (item.path && location.pathname === item.path) return true;
    return (item.submenu || []).some((s) => location.pathname === s.path);
  };

  return (
    <nav className="bg-[#082f49] text-slate-300 w-64 h-full flex flex-col shadow-xl z-20">
      <div className="h-[8vh] flex items-center justify-center bg-white border-b border-slate-200">
        <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
      </div>

      <div className="flex-grow overflow-y-auto py-6 px-4 space-y-1">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <i className="fa-solid fa-spinner fa-spin text-blue-400 text-xl"></i>
            <span className="ml-2 text-sm text-slate-400">Loading menu…</span>
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-xs text-red-200">
            <i className="fa-solid fa-circle-exclamation mr-1"></i>
            {error}
            <button
              onClick={fetchMenu}
              className="mt-2 w-full text-center bg-red-700 hover:bg-red-600 text-white py-1 rounded transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && menuItems.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            <i className="fa-solid fa-lock text-2xl mb-2 block"></i>
            No modules available for your account.
          </div>
        )}

        {!loading &&
          !error &&
          menuItems.map((item, index) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isActive = item.path
              ? location.pathname === item.path
              : isParentActive(item);

            return (
              <div key={index} className="space-y-1">
                {!hasSubmenu && item.path ? (
                  <Link
                    to={item.path}
                    onClick={() =>
                      emitSelect(item.title, {
                        module: item.title,
                        submodule: null,
                        path: item.path,
                      })
                    }
                    className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <i className={`${item.icon} w-6 text-center mr-3`}></i>
                    <span className="font-medium text-sm">{item.title}</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => toggleSubMenu(index, item)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors group ${
                      isActive
                        ? "bg-slate-800 text-white"
                        : "hover:bg-slate-800 bg-transparent"
                    }`}
                  >
                    <div className="flex items-center">
                      <i
                        className={`${item.icon} w-6 text-center mr-3 group-hover:text-blue-400 ${
                          isActive ? "text-blue-400" : ""
                        }`}
                      ></i>
                      <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    <i
                      className={`fa-solid fa-chevron-right text-[10px] transition-transform duration-200 ${
                        openSubMenu === index ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                )}

                {hasSubmenu && openSubMenu === index && (
                  <div className="ml-9 mt-1 space-y-1 border-l border-slate-700">
                    {item.submenu.map((sub, i) => {
                      const subActive = location.pathname === sub.path;
                      return (
                        <Link
                          key={i}
                          to={sub.path}
                          onClick={() =>
                            emitSelect(sub.title, {
                              module: item.title,
                              submodule: sub.title,
                              path: sub.path,
                            })
                          }
                          className={`block px-6 py-2 text-xs transition-colors ${
                            subActive
                              ? "text-blue-400 font-semibold"
                              : "text-slate-400 hover:text-blue-400"
                          }`}
                        >
                          {sub.title}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <div className="border-t border-slate-700 p-3 text-[10px] text-slate-500 text-center">
        © {new Date().getFullYear()} Your Company
      </div>
    </nav>
  );
};

export default SideMenu;