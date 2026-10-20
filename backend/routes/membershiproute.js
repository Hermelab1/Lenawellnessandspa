//membershoproute

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/memberSyncController");

function makeRoutes(models) {
  ctrl.bindModels(models);

  router.post("/members/sync", ctrl.syncNow);
  router.post("/members/sync/reset", ctrl.reset);
  router.get("/members/sync/status", ctrl.status);
  router.get("/members", ctrl.list);
  router.get("/members/:id", ctrl.getOne);

  return router;
}

module.exports = makeRoutes;
