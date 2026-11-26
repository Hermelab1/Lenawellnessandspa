const express = require("express");
const router = express.Router();

const syncCtrl = require("../controllers/memberSyncController");
const requestCtrl = require("../controllers/membershiprequestcontroller");
const ctrl = require("../controllers/membershipController");

function makeRoutes(models) {
  syncCtrl.bindModels(models);
  ctrl.bindModels(models);

  // ---------- SYNC (most specific first) ----------
  router.post("/members/sync", syncCtrl.syncNow);
  router.post("/members/sync/reset", syncCtrl.reset);
  router.get("/members/sync/status", syncCtrl.status);

  // ---------- MEMBERS ----------
  router.get("/members", ctrl.listMembers);
  router.post("/members", ctrl.createMember);
  router.put("/members/:id", ctrl.updateMember);
  router.patch("/members/:id/deactivate", ctrl.deactivateMember);
  router.get("/members/:id/image", ctrl.memberImage);

  // ---------- MEMBERSHIPS OF A MEMBER ----------
  router.get("/members/:id/memberships", ctrl.getMemberships);
  router.post("/members/:id/memberships", ctrl.createMembership);
  router.put("/memberships/:id", ctrl.updateMembership);
  router.patch("/memberships/:id/freeze", ctrl.freezeMembership);
  router.patch("/memberships/:id/unfreeze", ctrl.unfreezeMembership);

  // ---------- MEMBERSHIP TYPES ----------
  router.get("/membership-types", ctrl.membershipTypes.list);
  router.post("/membership-types", ctrl.membershipTypes.create);
  router.put("/membership-types/:id", ctrl.membershipTypes.update);
  router.delete("/membership-types/:id", ctrl.membershipTypes.remove);

  // ---------- SERVICE TYPES ----------
  router.get("/service-types", ctrl.serviceTypes.list);
  router.post("/service-types", ctrl.serviceTypes.create);
  router.put("/service-types/:id", ctrl.serviceTypes.update);
  router.delete("/service-types/:id", ctrl.serviceTypes.remove);

  // ---------- MEMBERSHIP REQUESTS ----------
  router.post("/membership-requests", requestCtrl.createRequest);
  router.get("/membership-requests", requestCtrl.getRequests);
  router.get("/membership-requests/stats/summary", requestCtrl.getRequestStats);
  router.get("/membership-requests/:id", requestCtrl.getRequestById);
  router.post("/membership-requests/:id/approve", requestCtrl.approveRequest);
  router.patch("/membership-requests/:id/reject", requestCtrl.rejectRequest);
  router.patch("/membership-requests/:id/reopen", requestCtrl.reopenRequest);
  router.delete("/membership-requests/:id", requestCtrl.deleteRequest);

  return router;
}

module.exports = makeRoutes;
