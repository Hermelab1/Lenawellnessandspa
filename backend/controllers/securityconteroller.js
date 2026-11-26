const db = require("../models");
const bcrypt = require("bcrypt");

/* ============================================================
   ROLE MANAGEMENT
   ============================================================ */

async function allrole(req, res) {
  try {
    const roles = await db.SecRole.findAll({
      include: [
        {
          model: db.SecUser,
          as: "users",
          attributes: ["id", "logincode", "userfullname", "email"],
          through: { attributes: [] },
        },
      ],
      order: [["id", "ASC"]],
    });
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    console.error("allrole error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getActiveRoles(req, res) {
  try {
    const roles = await db.SecRole.findAll({
      where: { isActive: true },
    });
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    console.error("getActiveRoles error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function addrole(req, res) {
  try {
    const RoleName = req.body.RoleName ?? req.body.roleName;
    const RoleDescription =
      req.body.RoleDescription ?? req.body.description ?? "";
    const isActive =
      req.body.isActive !== undefined ? !!req.body.isActive : true;

    if (!RoleName) {
      return res
        .status(400)
        .json({ success: false, message: "RoleName is required" });
    }

    const role = await db.SecRole.create({
      RoleName,
      RoleDescription,
      isActive,
    });
    return res.status(201).json({ success: true, data: role });
  } catch (error) {
    console.error("addrole error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updaterole(req, res) {
  try {
    const { id } = req.params;
    const RoleName = req.body.RoleName ?? req.body.roleName;
    const RoleDescription =
      req.body.RoleDescription ?? req.body.description ?? "";
    const isActive =
      req.body.isActive !== undefined ? !!req.body.isActive : undefined;

    const role = await db.SecRole.findByPk(id);
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    const updates = { RoleName, RoleDescription };
    if (isActive !== undefined) updates.isActive = isActive;

    await role.update(updates);
    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    console.error("updaterole error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleterole(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;

    const role = await db.SecRole.findByPk(id, { transaction: t });
    if (!role) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    const userCount = await db.Secusermember.count({
      where: { roleId: id },
      transaction: t,
    });

    const permissionCount = await db.SecRolePermission.count({
      where: { roleId: id },
      transaction: t,
    });

    if (userCount > 0 || permissionCount > 0) {
      await db.SecRolePermission.destroy({
        where: { roleId: id },
        transaction: t,
      });
      await role.update({ isActive: false }, { transaction: t });
      await t.commit();
      return res.status(200).json({
        success: true,
        message:
          "Role is assigned to users or has permissions, so it was deactivated instead of deleted. It can no longer be used.",
        data: { id: role.id, isActive: false },
      });
    }

    await db.SecRolePermission.destroy({
      where: { roleId: id },
      transaction: t,
    });
    await role.destroy({ transaction: t });
    await t.commit();
    return res
      .status(200)
      .json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    await t.rollback();
    console.error("deleterole error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/* ============================================================
   PERMISSIONS
   ============================================================ */

async function allpermissions(req, res) {
  try {
    const permissions = await db.SecPermission.findAll({
      include: [
        { model: db.Modules, as: "module" },
        { model: db.SecPermissionActions, as: "action" },
      ],
      order: [["id", "ASC"]],
    });
    return res.status(200).json({ success: true, permissions });
  } catch (error) {
    console.error("allpermissions error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getrolepermission(req, res) {
  try {
    const { roleId } = req.params;

    const role = await db.SecRole.findByPk(roleId, {
      include: [
        {
          model: db.SecPermission,
          as: "permissions",
          through: { attributes: [] },
          include: [
            { model: db.Modules, as: "module" },
            { model: db.SecPermissionActions, as: "action" },
          ],
        },
      ],
    });

    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    console.error("getrolepermission error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function assignPermissionsToRole(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;

    if (!Array.isArray(permissionIds)) {
      await t.rollback();
      return res
        .status(400)
        .json({ success: false, message: "permissionIds must be an array" });
    }

    const role = await db.SecRole.findByPk(roleId, { transaction: t });
    if (!role) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    if (permissionIds.length > 0) {
      const existing = await db.SecPermission.findAll({
        where: { id: permissionIds },
        attributes: ["id"],
        transaction: t,
      });
      const existingIds = new Set(existing.map((p) => String(p.id)));
      const missing = permissionIds.filter(
        (id) => !existingIds.has(String(id)),
      );
      if (missing.length > 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: `Unknown permissionIds: ${missing.join(", ")}`,
        });
      }
    }

    await db.SecRolePermission.destroy({ where: { roleId }, transaction: t });

    const rows = permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    }));
    if (rows.length) {
      await db.SecRolePermission.bulkCreate(rows, { transaction: t });
    }

    await t.commit();
    return res
      .status(200)
      .json({ success: true, message: "Permissions assigned successfully" });
  } catch (error) {
    await t.rollback();
    console.error("assignPermissionsToRole error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/* ============================================================
   USER MANAGEMENT
   ============================================================ */
async function adduser(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const { logincode, userfullname, email, password, roleIds, isActive } =
      req.body;

    const missing = [];
    if (!logincode) missing.push("logincode");
    if (!userfullname) missing.push("userfullname");
    if (!email) missing.push("email");
    if (!password) missing.push("password");

    if (missing.length) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
        received: Object.keys(req.body),
      });
    }

    // Guard against duplicate logincode / email
    const existing = await db.SecUser.findOne({
      where: {
        [db.Sequelize.Op.or]: [{ logincode }, { email }],
      },
      transaction: t,
    });
    if (existing) {
      await t.rollback();
      const field = existing.logincode === logincode ? "logincode" : "email";
      return res.status(409).json({
        success: false,
        message: `A user with this ${field} already exists`,
      });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await db.SecUser.create(
      {
        logincode,
        userfullname,
        email,
        password: hashed,
        isActive: isActive !== undefined ? isActive : true,
      },
      { transaction: t },
    );

    if (roleIds.length) {
      const rows = roleIds.map((roleId) => ({ userId: user.id, roleId }));
      await db.Secusermember.bulkCreate(rows, { transaction: t });
    }

    await t.commit();

    const created = await db.SecUser.findByPk(user.id, {
      attributes: { exclude: ["password"] },
      include: [
        { model: db.SecRole, as: "roles", through: { attributes: [] } },
      ],
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    await t.rollback();
    console.error("adduser error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateuser(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { logincode, userfullname, email, password, roleIds, isActive } =
      req.body;

    const user = await db.SecUser.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Only update fields that were actually provided
    const updates = {};
    if (logincode !== undefined) updates.logincode = logincode;
    if (userfullname !== undefined) updates.userfullname = userfullname;
    if (email !== undefined) updates.email = email;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password) updates.password = await bcrypt.hash(password, 10);

    if (Object.keys(updates).length) {
      await user.update(updates, { transaction: t });
    }

    // Replace role memberships only if role info was sent
    if (Array.isArray(req.body.roleIds) || req.body.roleId !== undefined) {
      await db.Secusermember.destroy({
        where: { userId: id },
        transaction: t,
      });
      if (roleIds.length) {
        await db.Secusermember.bulkCreate(
          roleIds.map((roleId) => ({ userId: id, roleId })),
          { transaction: t },
        );
      }
    }

    await t.commit();

    const updated = await db.SecUser.findByPk(id, {
      attributes: { exclude: ["password"] },
      include: [
        { model: db.SecRole, as: "roles", through: { attributes: [] } },
      ],
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    await t.rollback();
    console.error("updateuser error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getuserrole(req, res) {
  try {
    const { userId } = req.params;
    const user = await db.SecUser.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        { model: db.SecRole, as: "roles", through: { attributes: [] } },
      ],
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("getuserrole error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function allusers(req, res) {
  try {
    const users = await db.SecUser.findAll({
      attributes: { exclude: ["password"] },
      include: [
        { model: db.SecRole, as: "roles", through: { attributes: [] } },
      ],
      order: [["id", "ASC"]],
    });
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("allusers error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteuser(req, res) {
  try {
    const { id } = req.params;
    const user = await db.SecUser.findByPk(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    // Soft delete — set isActive = false
    await user.update({ isActive: false });
    return res.status(200).json({
      success: true,
      message: "User deactivated",
      data: { id: user.id, isActive: false },
    });
  } catch (error) {
    console.error("deactivateuser error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function userreport(req, res) {
  try {
    const users = await db.SecUser.findAll({
      attributes: { exclude: ["password"] },
      include: [
        { model: db.SecRole, as: "roles", through: { attributes: [] } },
      ],
      order: [["id", "ASC"]],
    });
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("userreport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function rolereports(req, res) {
  try {
    const roles = await db.SecRole.findAll({
      include: [
        {
          model: db.SecUser,
          as: "users",
          attributes: ["id", "logincode", "userfullname", "email"],
          through: { attributes: [] },
        },
      ],
      order: [["id", "ASC"]],
    });
    return res.status(200).json({ success: true, data: roles });
  } catch (error) {
    console.error("rolereports error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  // roles
  getActiveRoles,
  allrole,
  addrole,
  updaterole,
  deleterole,
  // permissions
  allpermissions,
  getrolepermission,
  assignPermissionsToRole,
  // users
  adduser,
  updateuser,
  getuserrole,
  allusers,
  deleteuser,
  userreport,
  rolereports,
};
