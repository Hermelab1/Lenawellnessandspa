"use strict";
const express = require("express");
const router = express.Router();

const smsController = require("../controllers/smsconfigurationcontroller");
// const { verifyToken } = require("../middleware/authMiddleware"); // <- use the middleware your other routes use

[
  "getConfig",
  "updateConfig",
  "sendTest",
  "sendSms",
  "sendBulkSms",
  "sendOtp",
  "getBalance",
  "handleCallback",
  "handleNotify",
].forEach((fn) => {
  if (typeof smsController[fn] !== "function") {
    throw new Error(`smsController.${fn} is not a function. Check exports!`);
  }
});

/* --- public webhooks (GeezSMS calls these, no JWT) --- */
router.post("/webhook/callback", smsController.handleCallback);
router.post("/webhook/notify", smsController.handleNotify);

/* --- protected: uncomment once the import above is correct --- */
// router.use(verifyToken);

router.get("/config", smsController.getConfig);
router.put("/config", smsController.updateConfig);

router.post("/test", smsController.sendTest);
router.get("/balance", smsController.getBalance);

router.post("/send", smsController.sendSms);
router.post("/send/bulk", smsController.sendBulkSms);
router.post("/otp", smsController.sendOtp);

router.get("/synclog", smsController.getlogs);

module.exports = router;
