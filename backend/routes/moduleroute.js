// routes/moduleroute.js
const express = require("express");
const router = express.Router();

// Make sure this file name and case match EXACTLY: controllers/moduleController.js
const {
  getModulesByUser,
  getAllModules,
  getModuleById,
} = require("../controllers/modulecontroller");

// Specific routes first, generic "/:id" last
router.get("/user/:userId", getModulesByUser);
router.get("/", getAllModules);
router.get("/:id", getModuleById);

module.exports = router;
