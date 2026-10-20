const jwt = require("jsonwebtoken");
const db = require("../models");

function checkAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET || "secret");
    next();
  } catch (err) {
    console.error("checkAuth error:", err.message);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
}

function checkPermission(moduleName, actionName) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthenticated" });
      }

      // Read models at request time, not at require time
      const { SecUser, SecRole, SecPermission, Modules, SecPermissionActions } =
        db;

      const user = await SecUser.findByPk(req.user.id, {
        include: [
          {
            model: SecRole,
            as: "roles",
            through: { attributes: [] },
            include: [
              {
                model: SecPermission,
                as: "permissions",
                through: { attributes: [] },
                include: [
                  { model: Modules, as: "module" },
                  { model: SecPermissionActions, as: "action" },
                ],
              },
            ],
          },
        ],
      });

      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "User not found" });
      }

      const has = (user.roles || []).some((role) =>
        (role.permissions || []).some((p) => {
          const mod =
            p.module?.ModuleName ?? p.module?.moduleName ?? p.module?.name;
          const act =
            p.action?.ActionName ?? p.action?.actionName ?? p.action?.name;
          return (
            String(mod).toLowerCase() === String(moduleName).toLowerCase() &&
            String(act).toLowerCase() === String(actionName).toLowerCase()
          );
        }),
      );

      if (!has) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }

      next();
    } catch (err) {
      console.error("checkPermission error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  };
}

module.exports = { checkAuth, checkPermission };
