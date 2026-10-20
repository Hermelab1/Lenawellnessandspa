// authentication Route
const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  me,
} = require("../controllers/authenticationcontroller");
const { checkAuth } = require("../middleware/auth");

/* ---------- PUBLIC (no token needed) ---------- */
router.post("/register", register);
router.post("/login", login);

/* ---------- PROTECTED (token required) ---------- */
router.post("/logout", checkAuth, logout);
router.get("/me", checkAuth, me);

module.exports = router;
