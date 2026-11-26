const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const db = require("../models");

const BCRYPT_REGEX = /^\$2[aby]\$\d{2}\$/;
const DEBUG_AUTH = process.env.DEBUG_AUTH === "true";

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1d" });
}

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
    const { userfullname, password, roleIds } = req.body;
    const logincode = String(req.body.logincode || "").trim();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!logincode || !email || !password) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "logincode, email and password are required",
      });
    }

    // Duplicate check (email or logincode)
    const existing = await SecUser.findOne({
      where: { [Op.or]: [{ email }, { logincode }] },
      transaction: t,
    });
    if (existing) {
      await t.rollback();
      return res.status(409).json({
        success: false,
        message: "Email or login code already registered",
      });
    }

    // Hash ONCE here. Make sure the SecUser model has NO beforeCreate /
    // beforeUpdate hook that hashes the password again.
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

    /* ---------------- ROLE ASSIGNMENT ---------------- */
    let rolesToAssign = [];

    if (Array.isArray(roleIds) && roleIds.length > 0 && SecRole) {
      const found = await SecRole.findAll({
        where: { id: { [Op.in]: roleIds } },
        attributes: ["id"],
        transaction: t,
      });
      rolesToAssign = found.map((r) => r.id);
    }

    if (rolesToAssign.length === 0 && SecRole) {
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
        `Register: no role assigned to user ${user.id} (no roles in secrole)`,
      );
    }

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "Registered successfully",
      token: signToken(user.id),
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
    const { identifier, email, logincode, username } = req.body;
    const password = req.body.password;
    const loginId = String(
      identifier || email || logincode || username || "",
    ).trim();

    if (!loginId || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Credentials required" });
    }

    if (DEBUG_AUTH)
      console.log("LOGIN BODY:", { loginId, hasPassword: !!password });

    const user = await SecUser.findOne({
      where: {
        [Op.or]: [
          { email: loginId },
          { email: loginId.toLowerCase() },
          { logincode: loginId },
        ],
      },
    });

    if (!user) {
      if (DEBUG_AUTH) console.warn("LOGIN: user not found for", loginId);
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Read the password safely (works with Sequelize instances)
    const stored = user.get("password") || "";

    if (DEBUG_AUTH) {
      console.log("LOGIN: user found, id =", user.id);
      console.log(
        "LOGIN: stored looks like bcrypt:",
        BCRYPT_REGEX.test(stored),
      );
      console.log("LOGIN: stored length:", stored.length);
    }

    let ok = false;

    if (BCRYPT_REGEX.test(stored)) {
      ok = await bcrypt.compare(password, stored);
    } else if (stored && stored === password) {
      // Legacy plain-text password: accept once, then upgrade to a bcrypt hash.
      // Uses a raw update so model hooks can't hash it a second time.
      ok = true;
      const newHash = await bcrypt.hash(password, 10);
      await SecUser.update(
        { password: newHash },
        { where: { id: user.id }, hooks: false },
      );
    }

    if (!ok) {
      if (DEBUG_AUTH) console.warn("LOGIN: password mismatch for", loginId);
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    return res.status(200).json({
      success: true,
      token: signToken(user.id),
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
