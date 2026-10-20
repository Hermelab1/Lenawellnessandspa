const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const db = require("../models");

/* ============================================================
   REGISTER (public)
   ============================================================ */
async function register(req, res) {
  const { SecUser, SecRole, Secusermember, sequelize } = db;

  if (!SecUser || !sequelize) {
    return res.status(503).json({
      success: false,
      message: "Server is still initializing. Please retry in a moment.",
    });
  }

  const t = await sequelize.transaction();
  try {
    const { logincode, userfullname, email, password, roleIds } = req.body;

    if (!logincode || !email || !password) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "logincode, email and password are required",
      });
    }

    // Duplicate check
    const existing = await SecUser.findOne({
      where: { email },
      transaction: t,
    });
    if (existing) {
      await t.rollback();
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await SecUser.create(
      {
        logincode,
        userfullname: userfullname || logincode,
        email,
        password: hashed,
      },
      { transaction: t },
    );

    /* ---------------------------------------------------------
       ROLE ASSIGNMENT — safe
       --------------------------------------------------------- */
    let rolesToAssign = [];

    if (Array.isArray(roleIds) && roleIds.length > 0 && SecRole) {
      // Validate passed role ids exist
      const found = await SecRole.findAll({
        where: { id: { [Op.in]: roleIds } },
        attributes: ["id"],
        transaction: t,
      });
      rolesToAssign = found.map((r) => r.id);
    }

    if (rolesToAssign.length === 0 && SecRole) {
      // Fallback: default "User" role
      const defaultRole =
        (await SecRole.findOne({
          where: { RoleName: "User" },
          transaction: t,
        })) || (await SecRole.findOne({ transaction: t }));
      if (defaultRole) rolesToAssign = [defaultRole.id];
    }

    if (rolesToAssign.length > 0 && Secusermember) {
      const rows = rolesToAssign.map((roleId) => ({
        userId: user.id,
        roleId,
      }));
      await Secusermember.bulkCreate(rows, { transaction: t });
    } else {
      console.warn(
        `⚠️ Register: no role assigned to user ${user.id} (no roles in secrole)`,
      );
    }

    await t.commit();

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(201).json({
      success: true,
      message: "Registered successfully",
      token,
      user: {
        id: user.id,
        logincode: user.logincode,
        email: user.email,
        roleIds: rolesToAssign,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("register error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/* ============================================================
   LOGIN (public)
   ============================================================ */
async function login(req, res) {
  const { SecUser } = db;
  if (!SecUser) {
    return res.status(503).json({
      success: false,
      message: "Server is still initializing. Please retry in a moment.",
    });
  }

  try {
    const { identifier, email, password } = req.body;
    const loginId = identifier || email;

    if (!loginId || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Credentials required" });
    }

    const user = await SecUser.findOne({
      where: { [Op.or]: [{ email: loginId }, { logincode: loginId }] },
    });

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, logincode: user.logincode, email: user.email },
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/* ============================================================
   LOGOUT (protected)
   ============================================================ */
async function logout(req, res) {
  return res.status(200).json({ success: true, message: "Logged out" });
}

/* ============================================================
   ME (protected)
   ============================================================ */
async function me(req, res) {
  return res.status(200).json({ success: true, user: req.user });
}

module.exports = { register, login, logout, me };
