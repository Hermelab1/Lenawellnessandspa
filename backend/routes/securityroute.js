// routes/security.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/securityconteroller");
const { checkAuth, checkPermission } = require("../middleware/auth");

router.use(checkAuth);

/* ---------- Roles ---------- */
router.get("/allroles", ctrl.allrole);
router.get("/activeroles", ctrl.getActiveRoles);
router.post("/addrole", ctrl.addrole);
router.put(
  "/updaterole/:id",
  checkPermission("Security", "Role", "Edit"), // ⬅ submodule used as context
  ctrl.updaterole,
);
router.delete(
  "/deleterole/:id",
  checkPermission("Security", "Role", "Delete"),
  ctrl.deleterole,
);

/* ---------- Permissions ---------- */
router.get("/permissions", ctrl.allpermissions);
router.get("/roles/:roleId/permissions", ctrl.getrolepermission);
router.post("/roles/:roleId/permissions", ctrl.assignPermissionsToRole);

/* ---------- Users ---------- */
router.get("/users", ctrl.allusers);
router.post("/users", ctrl.adduser);
router.put(
  "/users/:id",
  checkPermission("Security", "User", "Edit"),
  ctrl.updateuser,
);
router.delete(
  "/users/:id",
  checkPermission("Security", "User", "Delete"),
  ctrl.deleteuser,
);
router.get("/users/:userId/roles", ctrl.getuserrole);

router.get("/userreport", ctrl.userreport);
router.get("/rolereports", ctrl.rolereports);

module.exports = router;
