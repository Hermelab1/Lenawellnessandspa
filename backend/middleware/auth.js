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

function ident(sequelize) {
  const d = sequelize.getDialect();
  const q = d === "mysql" || d === "mariadb" ? "`" : '"';
  return (n) => `${q}${n}${q}`;
}

/**
 * checkPermission(module, action)               // old 2-arg form (no submodule filter)
 * checkPermission(module, submodule, action)    // 3-arg form, filters on Modules.submodule
 */
function checkPermission(moduleName, arg2, arg3) {
  const useSubmodule = arg3 !== undefined;
  const submoduleName = useSubmodule ? arg2 : null;
  const actionName = useSubmodule ? arg3 : arg2;

  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthenticated" });
      }

      const {
        sequelize,
        QueryTypes,
        SecUser,
        SecRole,
        SecPermission,
        Modules,
        SecPermissionActions,
      } = db;

      const user = await SecUser.findByPk(req.user.id, {
        include: [
          {
            model: SecRole,
            as: "roles",
            through: { attributes: [] },
            where: { isActive: true },
            required: false,
            include: [
              {
                model: SecPermission,
                as: "permissions",
                through: { attributes: [] },
                required: false,
                include: [
                  { model: Modules, as: "module", required: false },
                  {
                    model: SecPermissionActions,
                    as: "action",
                    required: false,
                  },
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

      const norm = (v) =>
        String(v ?? "")
          .trim()
          .toLowerCase();

      const pickModuleName = (m) =>
        m?.moduleName ?? m?.ModuleName ?? m?.name ?? m?.Name;
      const pickSubmodule = (m) => m?.submodule ?? m?.Submodule ?? null;
      const pickActionName = (a) =>
        a?.ActionName ?? a?.actionName ?? a?.name ?? a?.Name;

      let has = (user.roles || []).some((role) =>
        (role.permissions || []).some((p) => {
          const pMod = pickModuleName(p.module);
          const pSub = pickSubmodule(p.module);
          const pAct = pickActionName(p.action);

          if (process.env.DEBUG_PERM === "1") {
            console.log("[perm-raw]", {
              module: pMod,
              submodule: pSub,
              action: pAct,
            });
          }

          if (norm(pAct) !== norm(actionName)) return false;
          if (norm(pMod) !== norm(moduleName)) return false;
          if (useSubmodule && norm(pSub) !== norm(submoduleName)) return false;
          return true;
        }),
      );

      if (!has) {
        const q = ident(sequelize);
        const submoduleClause = useSubmodule
          ? `AND LOWER(COALESCE(m.${q("submodule")}, '')) = LOWER(?)`
          : "";

        const sql = `
          SELECT 1 AS ok
          FROM ${q("secuser")} u
          JOIN ${q("secusermember")} um   ON um.${q("userId")} = u.id
          JOIN ${q("secrole")} r          ON r.id           = um.${q("roleId")}
          JOIN ${q("secrolepermission")} rp ON rp.${q("roleId")} = r.id
          JOIN ${q("secpermission")} p    ON p.id           = rp.${q("permissionId")}
          JOIN ${q("secpermissionactions")} a ON a.id       = p.${q("ActionId")}
          JOIN ${q("modules")} m          ON m.id           = p.${q("moduleId")}
          WHERE u.id = ?
            AND r.${q("isActive")} = 1
            AND LOWER(m.${q("moduleName")}) = LOWER(?)
            AND LOWER(a.${q("ActionName")}) = LOWER(?)
            ${submoduleClause}
          LIMIT 1
        `;

        const replacements = useSubmodule
          ? [req.user.id, moduleName, actionName, submoduleName]
          : [req.user.id, moduleName, actionName];

        try {
          const rows = await sequelize.query(sql, {
            replacements,
            type: QueryTypes.SELECT,
          });
          has = Array.isArray(rows) && rows.length > 0;
          if (process.env.DEBUG_PERM === "1") {
            console.log("[perm-fallback] matched:", has);
          }
        } catch (sqlErr) {
          console.error("[perm-fallback] SQL error:", sqlErr.message);
          has = false;
        }
      }

      if (!has) {
        if (process.env.DEBUG_PERM === "1") {
          console.warn(
            `[perm-deny] user=${req.user.id} ` +
              `wanted=${moduleName}${useSubmodule ? "/" + submoduleName : ""}/${actionName} ` +
              `roles=${(user.roles || []).map((r) => r.RoleName).join(",") || "<none>"} ` +
              `permCount=${(user.roles || []).reduce(
                (n, r) => n + (r.permissions?.length || 0),
                0,
              )}`,
          );
        }
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
