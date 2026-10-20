// controllers/moduleController.js
const db = require("../models");

/**
 * Resolve models at request time (not at require time), so it works even if
 * initModels(sequelize) finishes after this file is loaded. Also tolerates
 * common naming differences (Modules / Module / modules).
 */
const getModels = () => {
  const models = {
    Modules: db.Modules || db.Module || db.modules || db.module,
    SecPermission: db.SecPermission || db.Secpermission || db.secPermission,
    SecPermissionActions:
      db.SecPermissionActions ||
      db.SecPermissionAction ||
      db.Secpermissionactions,
    SecRolePermission:
      db.SecRolePermission || db.Secrolepermission || db.secRolePermission,
    Secusermember: db.Secusermember || db.SecUserMember || db.secusermember,
  };

  const missing = Object.entries(models)
    .filter(([, model]) => !model)
    .map(([name]) => name);

  return { models, missing };
};

const modelsNotLoaded = (res, missing) =>
  res.status(500).json({
    success: false,
    message: `Server misconfiguration: model(s) not loaded: ${missing.join(
      ", ",
    )}. Models available on db: ${Object.keys(db).join(", ")}`,
  });

/**
 * GET /api/modules/user/:userId
 * Fetch all modules the user has access to (based on roles & permissions)
 */
exports.getModulesByUser = async (req, res) => {
  try {
    const { models, missing } = getModels();
    if (missing.length) return modelsNotLoaded(res, missing);

    const {
      Modules,
      SecPermission,
      SecPermissionActions,
      SecRolePermission,
      Secusermember,
    } = models;

    const { userId } = req.params;

    // 1. Roles assigned to this user
    const userRoles = await Secusermember.findAll({
      where: { userId },
      attributes: ["roleId"],
      raw: true,
    });

    if (!userRoles || userRoles.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No roles assigned to this user.",
        data: [],
      });
    }

    const roleIds = [...new Set(userRoles.map((r) => r.roleId))];

    // 2. Permissions linked to those roles
    const rolePermissions = await SecRolePermission.findAll({
      where: { roleId: roleIds },
      attributes: ["permissionId"],
      raw: true,
    });

    if (!rolePermissions || rolePermissions.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No permissions assigned to this user's roles.",
        data: [],
      });
    }

    const permissionIds = [
      ...new Set(rolePermissions.map((p) => p.permissionId)),
    ];

    // 3. Permissions (with module + action)
    const permissions = await SecPermission.findAll({
      where: { id: permissionIds },
      include: [
        {
          model: Modules,
          as: "module",
          attributes: ["id", "moduleName", "submodule", "moduleDescription"],
        },
        {
          model: SecPermissionActions,
          as: "action",
          attributes: ["id", "ActionName", "permissionDescription"],
        },
      ],
    });

    // 4. Group by module and collect allowed actions
    const moduleMap = new Map();

    permissions.forEach((perm) => {
      if (!perm.module) return;

      const mod = perm.module;
      const key = mod.id;

      if (!moduleMap.has(key)) {
        moduleMap.set(key, {
          moduleId: mod.id,
          moduleName: mod.moduleName,
          submodule: mod.submodule,
          moduleDescription: mod.moduleDescription,
          actions: [],
        });
      }

      if (perm.action) {
        const entry = moduleMap.get(key);
        if (!entry.actions.find((a) => a.actionId === perm.action.id)) {
          entry.actions.push({
            actionId: perm.action.id,
            actionName: perm.action.ActionName,
            description: perm.action.permissionDescription,
          });
        }
      }
    });

    const result = Array.from(moduleMap.values());

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching modules by user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch modules for user.",
      error: error.message,
    });
  }
};

/**
 * GET /api/modules
 * Fetch all modules (admin/general listing)
 */
exports.getAllModules = async (req, res) => {
  try {
    const { models, missing } = getModels();
    if (missing.length) return modelsNotLoaded(res, missing);

    const { Modules, SecPermission } = models;

    const modules = await Modules.findAll({
      include: [
        {
          model: SecPermission,
          as: "permissions",
          attributes: ["id", "moduleId", "ActionId"],
        },
      ],
      order: [["moduleName", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      count: modules.length,
      data: modules,
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch modules.",
      error: error.message,
    });
  }
};

/**
 * GET /api/modules/:id
 * Fetch a single module by ID
 */
exports.getModuleById = async (req, res) => {
  try {
    const { models, missing } = getModels();
    if (missing.length) return modelsNotLoaded(res, missing);

    const { Modules, SecPermission, SecPermissionActions } = models;

    const { id } = req.params;

    // Guard against non-numeric ids (e.g. "user") hitting this route by mistake
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid module id.",
      });
    }

    const moduleRecord = await Modules.findByPk(id, {
      include: [
        {
          model: SecPermission,
          as: "permissions",
          include: [
            {
              model: SecPermissionActions,
              as: "action",
              attributes: ["id", "ActionName", "permissionDescription"],
            },
          ],
        },
      ],
    });

    if (!moduleRecord) {
      return res.status(404).json({
        success: false,
        message: "Module not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: moduleRecord,
    });
  } catch (error) {
    console.error("Error fetching module:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch module.",
      error: error.message,
    });
  }
};
