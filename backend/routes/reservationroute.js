const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/reservationcontroller");
// const { verifyToken, isAdmin } = require("../middleware/auth");

// public (website forms)
router.post("/reservations", ctrl.createReservation);

// admin
router.get("/reservations", /* verifyToken, */ ctrl.getReservations);
router.get(
  "/reservations/stats/summary",
  /* verifyToken, */ ctrl.getReservationStats,
);
router.get("/reservations/:id", /* verifyToken, */ ctrl.getReservationById);
router.patch(
  "/reservations/:id/status",
  /* verifyToken, */ ctrl.updateReservationStatus,
);
router.delete("/reservations/:id", /* verifyToken, */ ctrl.deleteReservation);

module.exports = router;
