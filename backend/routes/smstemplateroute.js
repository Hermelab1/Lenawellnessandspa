// routes/smstemplateroute.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/smstemplatecontroller");
const { checkAuth } = require("../middleware/auth"); // use the real file name of your middleware

router.use(checkAuth);

router.get("/", ctrl.getTemplates);
router.post("/", ctrl.createTemplate);
router.post("/preview", ctrl.previewTemplate); // keep above "/:id" routes
router.get("/:id", ctrl.getTemplate);
router.put("/:id", ctrl.updateTemplate);
router.patch("/:id/toggle", ctrl.toggleTemplate);
router.delete("/:id", ctrl.deleteTemplate);
router.post("/:id/send-test", ctrl.sendTestTemplate);

module.exports = router;
