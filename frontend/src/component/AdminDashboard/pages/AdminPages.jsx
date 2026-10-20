// src/Admin/AdminPages.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "../Dashboard";
import WithUsername from "./WithUsername";
import ComingSoon from "../../../commingsoon";
import { routeConfig } from "../../../Route/routeconfig";

const AdminPages = ({ username }) => {
  return (
    <Routes>
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="/admin" element={<Dashboard username={username} />} />

      {/* Auto-generate routes from routeConfig */}
      {Object.entries(routeConfig).map(([path, cfg]) => {
        // Skip duplicate /admin/dashboard (already covered above)
        if (path === "/admin/dashboard" || path === "/admin") return null;

        const Component = cfg.component || ComingSoon;

        return (
          <Route
            key={path}
            path={path}
            element={
              <WithUsername
                Component={Component}
                username={username}
                extraProps={{ title: cfg.title }}
              />
            }
          />
        );
      })}

      {/* Fallback for unknown routes */}
      <Route path="*" element={<ComingSoon title="Page not found" />} />
    </Routes>
  );
};

export default AdminPages;