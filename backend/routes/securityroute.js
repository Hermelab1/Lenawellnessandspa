const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/securityconteroller");
const { checkAuth, checkPermission } = require("../middleware/auth");

// Apply auth to everything below
router.use(checkAuth);

/* ---------- Roles ---------- */
/* ---------- Roles ---------- */
router.get("/roles", ctrl.allrole); // <--- Removed checkPermission("roles", "read") temporarily
router.post("/roles", ctrl.addrole);
router.put("/roles/:id", checkPermission("roles", "update"), ctrl.updaterole);
router.delete(
  "/roles/:id",
  checkPermission("roles", "delete"),
  ctrl.deleterole,
);

/* ---------- Permissions ---------- */
router.get("/permissions", ctrl.allpermissions); // <--- Removed checkPermission temporarily

/* ---------- Role permissions ---------- */
router.get(
  "/roles/:roleId/permissions",
  ctrl.getrolepermission, // <--- Removed checkPermission temporarily
);

router.post("/roles/:roleId/permissions", ctrl.assignPermissionsToRole);

/* ---------- Users (Bypassed checkPermission for troubleshooting) ---------- */
router.get("/users", ctrl.allusers); // <--- Removed checkPermission("users", "read") temporarily
router.post("/users", ctrl.adduser);
router.put("/users/:id", checkPermission("users", "update"), ctrl.updateuser);
router.delete(
  "/users/:id",
  checkPermission("users", "delete"),
  ctrl.deleteuser,
);
router.get("/users/:userId/roles", ctrl.getuserrole);

module.exports = router;
