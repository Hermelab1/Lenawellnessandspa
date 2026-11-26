const { Op } = require("sequelize");
const db = require("../models");
const Reservation = db.Reservation;

const smstemplate = require("./smstemplatecontroller");

const TYPES = ["spa", "beauty"];
const STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const SOURCES = ["form", "package", "service"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (v, max) => (v == null ? "" : String(v).trim().slice(0, max));

// today's date as YYYY-MM-DD in the server's local time zone
const todayString = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// "14:30:00" -> "2:30 PM"
const prettyTime = (t) => {
  const [h, m] = String(t || "")
    .split(":")
    .map(Number);
  if (Number.isNaN(h)) return String(t || "");
  const ap = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${ap}`;
};

// Sends the "reservation_approve" SMS template. Never throws.
const notifyApproved = (item) =>
  smstemplate.sendTemplateSms("reservation_approve", item.phone, {
    name: item.name,
    date: item.date,
    time: prettyTime(item.time),
    service: item.serviceName || "",
    staff: item.staffName || "",
  });

/* ---------- PUBLIC: create a reservation ---------- */
exports.createReservation = async (req, res) => {
  try {
    const b = req.body || {};

    const type = clean(b.type, 10).toLowerCase();
    const name = clean(b.name, 120);
    const email = clean(b.email, 160).toLowerCase();
    const phone = clean(b.phone, 40);
    const date = clean(b.date, 10);
    const time = clean(b.time, 8);
    const serviceName = clean(b.serviceName, 160) || null;
    const staffName = clean(b.staffName, 160) || null;
    const message = clean(b.message, 2000) || null;
    const source = SOURCES.includes(b.source) ? b.source : "form";

    const staffId = b.staffId ? parseInt(b.staffId, 10) || null : null;
    const hours = b.hours ? parseInt(b.hours, 10) : null;

    // ---- validation ----
    if (!TYPES.includes(type)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid reservation type." });
    }
    if (!name || !email || !phone || !date || !time) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone, date and time are required.",
      });
    }
    if (!EMAIL_RE.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email address." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      return res.status(400).json({ success: false, message: "Invalid date." });
    }
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
      return res.status(400).json({ success: false, message: "Invalid time." });
    }
    if (date < todayString()) {
      return res
        .status(400)
        .json({ success: false, message: "Date cannot be in the past." });
    }
    if (type === "spa" && (!hours || hours < 1 || hours > 12)) {
      return res
        .status(400)
        .json({ success: false, message: "Please choose how many hours." });
    }

    // ---- double-booking check (same staff member, same date & time) ----
    if (staffId) {
      const clash = await Reservation.findOne({
        where: {
          type,
          staffId,
          date,
          time,
          isDeleted: false,
          status: { [Op.in]: ["pending", "confirmed"] },
        },
      });
      if (clash) {
        return res.status(409).json({
          success: false,
          message:
            "This specialist is already booked at that time. Please choose another time.",
        });
      }
    }

    const reservation = await Reservation.create({
      type,
      name,
      email,
      phone,
      date,
      time,
      hours: type === "spa" ? hours : null,
      serviceName,
      source,
      staffId,
      staffName,
      message,
    });

    return res.status(201).json({
      success: true,
      message: "Reservation received.",
      data: reservation,
    });
  } catch (err) {
    console.error("createReservation:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ---------- ADMIN: list (filters + pagination) ---------- */
exports.getReservations = async (req, res) => {
  try {
    const { type, status, staffId, date, from, to, search } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100,
    );

    const where = { isDeleted: false };
    if (TYPES.includes(type)) where.type = type;
    if (STATUSES.includes(status)) where.status = status;
    if (staffId) where.staffId = parseInt(staffId, 10);
    if (date) where.date = date;
    if (from && to) where.date = { [Op.between]: [from, to] };
    if (search) {
      const like = { [Op.like]: `%${search}%` };
      where[Op.or] = [{ name: like }, { email: like }, { phone: like }];
    }

    const { rows, count } = await Reservation.findAndCountAll({
      where,
      order: [
        ["date", "DESC"],
        ["time", "DESC"],
        ["Id", "DESC"],
      ],
      limit,
      offset: (page - 1) * limit,
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error("getReservations:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ---------- ADMIN: get one ---------- */
exports.getReservationById = async (req, res) => {
  try {
    const item = await Reservation.findOne({
      where: { Id: req.params.id, isDeleted: false },
    });
    if (!item)
      return res.status(404).json({ success: false, message: "Not found." });
    return res.json({ success: true, data: item });
  } catch (err) {
    console.error("getReservationById:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ---------- ADMIN: change status (sends SMS when newly confirmed) ---------- */
exports.updateReservationStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    }
    const item = await Reservation.findOne({
      where: { Id: req.params.id, isDeleted: false },
    });
    if (!item)
      return res.status(404).json({ success: false, message: "Not found." });

    const wasConfirmed = item.status === "confirmed";
    item.status = status;
    await item.save();

    // SMS only when it newly becomes confirmed (avoids duplicate texts)
    let sms = null;
    if (status === "confirmed" && !wasConfirmed) {
      sms = await notifyApproved(item);
    }

    return res.json({ success: true, data: item, sms });
  } catch (err) {
    console.error("updateReservationStatus:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ---------- ADMIN: soft delete ---------- */
exports.deleteReservation = async (req, res) => {
  try {
    const item = await Reservation.findOne({
      where: { Id: req.params.id, isDeleted: false },
    });
    if (!item)
      return res.status(404).json({ success: false, message: "Not found." });

    item.isDeleted = true;
    await item.save();
    return res.json({ success: true, message: "Reservation deleted." });
  } catch (err) {
    console.error("deleteReservation:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ---------- ADMIN: counts per status (for the dashboard cards) ---------- */
exports.getReservationStats = async (req, res) => {
  try {
    const where = { isDeleted: false };
    if (TYPES.includes(req.query.type)) where.type = req.query.type;

    const rows = await Reservation.findAll({
      attributes: [
        "status",
        [
          Reservation.sequelize.fn("COUNT", Reservation.sequelize.col("Id")),
          "count",
        ],
      ],
      where,
      group: ["status"],
      raw: true,
    });

    const data = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      total: 0,
    };
    rows.forEach((r) => {
      const n = parseInt(r.count, 10) || 0;
      if (r.status in data) data[r.status] = n;
      data.total += n;
    });

    return res.json({ success: true, data });
  } catch (err) {
    console.error("getReservationStats:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

/* ---------- ADMIN: approve (status + SMS) ---------- */
exports.approveReservation = async (req, res) => {
  try {
    const item = await Reservation.findOne({
      where: { Id: req.params.id, isDeleted: false },
    });
    if (!item)
      return res.status(404).json({ success: false, message: "Not found." });

    const wasConfirmed = item.status === "confirmed";
    item.status = "confirmed";
    await item.save();

    // The approval is saved even if the SMS fails; the result tells the UI.
    const sms = wasConfirmed
      ? { sent: false, reason: "Already approved" }
      : await notifyApproved(item);

    return res.json({ success: true, data: item, sms });
  } catch (err) {
    console.error("approveReservation:", err);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
