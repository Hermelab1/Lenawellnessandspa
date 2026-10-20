const db = require("../models");
const bcrypt = require("bcrypt");

/* ============================================================
   ROLE MANAGEMENT
   ============================================================ */

// GET all roles
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

// CREATE role
async function addrole(req, res) {
  try {
    const RoleName = req.body.RoleName ?? req.body.roleName;
    const RoleDescription =
      req.body.RoleDescription ?? req.body.description ?? "";

    if (!RoleName) {
      return res
        .status(400)
        .json({ success: false, message: "RoleName is required" });
    }

    const role = await db.SecRole.create({ RoleName, RoleDescription });
    return res.status(201).json({ success: true, data: role });
  } catch (error) {
    console.error("addrole error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// UPDATE role
async function updaterole(req, res) {
  try {
    const { id } = req.params;
    const RoleName = req.body.RoleName ?? req.body.roleName;
    const RoleDescription =
      req.body.RoleDescription ?? req.body.description ?? "";

    const role = await db.SecRole.findByPk(id);
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }

    await role.update({ RoleName, RoleDescription });
    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    console.error("updaterole error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// DELETE role
async function deleterole(req, res) {
  try {
    const { id } = req.params;
    const role = await db.SecRole.findByPk(id);
    if (!role) {
      return res
        .status(404)
        .json({ success: false, message: "Role not found" });
    }
    await role.destroy();
    return res
      .status(200)
      .json({ success: true, message: "Role deleted successfully" });
  } catch (error) {
    console.error("deleterole error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/* ============================================================
   PERMISSIONS
   ============================================================ */

// GET all permissions
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

// GET permissions assigned to a role
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

// ASSIGN permissions to role (bulk)
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

// CREATE user
async function adduser(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const { logincode, userfullname, email, password, roleIds } = req.body;

    if (!logincode || !userfullname || !email || !password) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "logincode, userfullname, email, password are required",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await db.SecUser.create(
      { logincode, userfullname, email, password: hashed },
      { transaction: t },
    );

    if (Array.isArray(roleIds) && roleIds.length > 0) {
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

// UPDATE user
async function updateuser(req, res) {
  const t = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const { logincode, userfullname, email, password, roleIds } = req.body;

    const user = await db.SecUser.findByPk(id, { transaction: t });
    if (!user) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const updates = { logincode, userfullname, email };
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    await user.update(updates, { transaction: t });

    if (Array.isArray(roleIds)) {
      await db.Secusermember.destroy({
        where: { userId: id },
        transaction: t,
      });
      const rows = roleIds.map((roleId) => ({ userId: id, roleId }));
      if (rows.length) {
        await db.Secusermember.bulkCreate(rows, { transaction: t });
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

// GET user's roles
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

// GET all users
async function allusers(req, res) {
  try {
    const users = await db.SecUser.findAll({
      attributes: { exclude: ["password"] },
      include: [
        { model: db.SecRole, as: "roles", through: { attributes: [] } },
      ],
    });
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("allusers error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// DELETE user
async function deleteuser(req, res) {
  try {
    const { id } = req.params;
    const user = await db.SecUser.findByPk(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    await user.destroy();
    return res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("deleteuser error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  allrole,
  addrole,
  updaterole,
  deleterole,
  allpermissions,
  getrolepermission,
  assignPermissionsToRole,
  adduser,
  updateuser,
  getuserrole,
  allusers,
  deleteuser,
};
