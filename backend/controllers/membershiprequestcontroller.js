const { Op } = require("sequelize");
const db = require("../models");
const smstemplate = require("./smstemplatecontroller");

const STATUSES = ["pending", "approved", "rejected"];
const GENDERS = ["Male", "Female"];
const PAYMENTS = ["Cash", "Mobile Money", "Bank Transfer"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- helpers ---------- */
// trims, collapses whitespace and limits the length
const clean = (v, max) =>
  v == null ? "" : String(v).replace(/\s+/g, " ").trim().slice(0, max);

// keeps line breaks (for free-text notes)
const cleanText = (v, max) => (v == null ? "" : String(v).trim().slice(0, max));

const norm = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const isValidDate = (s) => {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};

// today's date as YYYY-MM-DD in the server's local time zone
const todayString = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

const fail = (res, status, message) =>
  res.status(status).json({ success: false, message });

// Sets obj[column] = value using the first column name that really exists on
// the model, so this works whatever your MemberInfo table calls these columns.
const setIfColumn = (obj, Model, names, value) => {
  if (value === undefined || value === null || value === "") return;
  const attrs = (Model && Model.rawAttributes) || {};
  const key = names.find((n) => attrs[n]);
  if (key) obj[key] = value;
};

// Extra membership info copied onto the MemberInfo row (only existing columns are used)
const buildMemberExtras = (Model, request, m) => {
  const extra = {};
  setIfColumn(extra, Model, ["MembershipTypeId"], m.typeId);
  setIfColumn(extra, Model, ["ServiceTypeId"], m.serviceId);
  setIfColumn(extra, Model, ["MembershipNo"], m.membershipNo);
  setIfColumn(extra, Model, ["RegistryDate", "StartDate"], m.registryDate);
  setIfColumn(extra, Model, ["ExpiryDate", "EndDate"], m.expiryDate);
  setIfColumn(
    extra,
    Model,
    ["EmergencyName", "EmergencyContactName", "EmergencyContact"],
    request.emergencyName,
  );
  setIfColumn(
    extra,
    Model,
    ["EmergencyPhone", "EmergencyContactPhone", "EmergencyMobile"],
    request.emergencyPhone,
  );
  setIfColumn(extra, Model, ["PaymentMethod"], request.paymentMethod);
  setIfColumn(extra, Model, ["Remarks", "Notes", "Note"], request.notes);
  return extra;
};

/* =====================================================
   PUBLIC: submit a registration from the Gym page
===================================================== */
exports.createRequest = async (req, res) => {
  try {
    const b = req.body || {};

    const planTitle = clean(b.planTitle, 160);
    const planPrice = clean(b.planPrice, 80) || null;
    const fullName = clean(b.fullName, 160);
    const gender = clean(b.gender, 10);
    const dateOfBirth = clean(b.dateOfBirth, 10);
    const email = clean(b.email, 160).toLowerCase();
    const phone = clean(b.phone, 40);
    const address = clean(b.address, 255) || null;
    const emergencyName = clean(b.emergencyName, 160);
    const emergencyPhone = clean(b.emergencyPhone, 40);
    const startDate = clean(b.startDate, 10);
    const paymentMethod = clean(b.paymentMethod, 30);
    const notes = cleanText(b.notes, 2000) || null;

    // ---- validation ----
    if (!planTitle) return fail(res, 400, "Please choose a membership plan.");
    if (fullName.length < 2)
      return fail(res, 400, "Please enter your full name.");
    if (!GENDERS.includes(gender))
      return fail(res, 400, "Please select your gender.");

    if (!isValidDate(dateOfBirth))
      return fail(res, 400, "Invalid date of birth.");
    if (dateOfBirth > todayString() || dateOfBirth < "1900-01-01") {
      return fail(res, 400, "Invalid date of birth.");
    }

    if (!PHONE_RE.test(phone))
      return fail(res, 400, "Please enter a valid phone number.");
    if (email && !EMAIL_RE.test(email))
      return fail(res, 400, "Invalid email address.");

    if (!emergencyName)
      return fail(res, 400, "Emergency contact name is required.");
    if (!PHONE_RE.test(emergencyPhone)) {
      return fail(res, 400, "Please enter a valid emergency phone number.");
    }

    if (!isValidDate(startDate)) return fail(res, 400, "Invalid start date.");
    if (startDate < todayString())
      return fail(res, 400, "Start date cannot be in the past.");

    if (!PAYMENTS.includes(paymentMethod)) {
      return fail(res, 400, "Please select a payment method.");
    }
    if (b.agree !== true) {
      return fail(
        res,
        400,
        "You must accept the gym rules and membership terms.",
      );
    }

    // ---- stop double submissions / duplicates ----
    const duplicate = await db.MembershipRequest.findOne({
      where: { phone, planTitle, status: "pending", isDeleted: false },
    });
    if (duplicate) {
      return fail(
        res,
        409,
        "You already have a pending request for this plan. We will contact you shortly.",
      );
    }

    const created = await db.MembershipRequest.create({
      planTitle,
      planPrice,
      fullName,
      gender,
      dateOfBirth,
      email: email || null,
      phone,
      address,
      emergencyName,
      emergencyPhone,
      startDate,
      paymentMethod,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Registration received.",
      data: { Id: created.Id, status: created.status },
    });
  } catch (err) {
    console.error("createRequest:", err);
    return fail(res, 500, "Server error.");
  }
};

/* =====================================================
   ADMIN: list (filters + pagination)
===================================================== */
exports.getRequests = async (req, res) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 10, 1),
      100,
    );

    const where = { isDeleted: false };
    if (STATUSES.includes(status)) where.status = status;
    if (search) {
      const like = { [Op.like]: `%${search}%` };
      where[Op.or] = [{ fullName: like }, { phone: like }, { email: like }];
    }

    const { rows, count } = await db.MembershipRequest.findAndCountAll({
      where,
      order: [["Id", "DESC"]],
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
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error("getRequests:", err);
    return fail(res, 500, "Server error.");
  }
};

/* ---------- ADMIN: counts per status ---------- */
exports.getRequestStats = async (req, res) => {
  try {
    const rows = await db.MembershipRequest.findAll({
      attributes: [
        "status",
        [
          db.MembershipRequest.sequelize.fn(
            "COUNT",
            db.MembershipRequest.sequelize.col("Id"),
          ),
          "count",
        ],
      ],
      where: { isDeleted: false },
      group: ["status"],
      raw: true,
    });

    const data = { pending: 0, approved: 0, rejected: 0, total: 0 };
    rows.forEach((r) => {
      const n = parseInt(r.count, 10) || 0;
      if (r.status in data) data[r.status] = n;
      data.total += n;
    });
    return res.json({ success: true, data });
  } catch (err) {
    console.error("getRequestStats:", err);
    return fail(res, 500, "Server error.");
  }
};

/* ---------- ADMIN: get one ---------- */
exports.getRequestById = async (req, res) => {
  try {
    const item = await db.MembershipRequest.findOne({
      where: { Id: req.params.id, isDeleted: false },
    });
    if (!item) return fail(res, 404, "Request not found.");
    return res.json({ success: true, data: item });
  } catch (err) {
    console.error("getRequestById:", err);
    return fail(res, 500, "Server error.");
  }
};

/* =====================================================
   ADMIN: approve -> creates/updates MemberInfo + creates MembershipDetail
   -> sends the "membership_welcome" SMS template
   body: { MembershipTypeId?, ServiceTypeId?, MembershipNo?, RegistryDate?,
           ExpiryDate, sendSms? (default true) }
===================================================== */
exports.approveRequest = async (req, res) => {
  const t = await db.sequelize.transaction();
  try {
    const b = req.body || {};

    const request = await db.MembershipRequest.findOne({
      where: { Id: req.params.id, isDeleted: false },
      transaction: t,
    });
    if (!request) {
      await t.rollback();
      return fail(res, 404, "Request not found.");
    }
    if (request.status !== "pending") {
      await t.rollback();
      return fail(res, 409, `This request is already ${request.status}.`);
    }

    const registryDate = clean(b.RegistryDate, 10) || request.startDate;
    const expiryDate = clean(b.ExpiryDate, 10);
    if (!isValidDate(registryDate)) {
      await t.rollback();
      return fail(res, 400, "Invalid registry date.");
    }
    if (!isValidDate(expiryDate)) {
      await t.rollback();
      return fail(res, 400, "Expiry date is required.");
    }
    if (expiryDate <= registryDate) {
      await t.rollback();
      return fail(res, 400, "Expiry date must be after the registry date.");
    }

    const typeId = parseInt(b.MembershipTypeId, 10) || null;
    const serviceId = parseInt(b.ServiceTypeId, 10) || null;
    const membershipNo = clean(b.MembershipNo, 60);

    // 1) claim the request first - a second admin approving at the same moment gets a 409
    const [claimed] = await db.MembershipRequest.update(
      { status: "approved", reviewedAt: new Date(), rejectReason: null },
      { where: { Id: request.Id, status: "pending" }, transaction: t },
    );
    if (claimed !== 1) {
      await t.rollback();
      return fail(
        res,
        409,
        "This request was already handled by someone else.",
      );
    }

    // 2) re-use the member if the same phone + same name already exists, otherwise create one
    const sameNumber = await db.MemberInfo.findAll({
      where: { Mobile: request.phone },
      transaction: t,
    });
    let member = sameNumber.find(
      (m) => norm(m.Name) === norm(request.fullName),
    );
    const existingMember = Boolean(member);

    const extras = buildMemberExtras(db.MemberInfo, request, {
      typeId,
      serviceId,
      membershipNo,
      registryDate,
      expiryDate,
    });

    if (!member) {
      const memberPayload = {
        Name: request.fullName,
        Gender: request.gender === "Male" ? 1 : 2, // same codes the Members page uses
        DateOfBirth: request.dateOfBirth,
        Mobile: request.phone,
        ...extras,
      };
      if (request.email) memberPayload.Email = request.email;
      if (request.address) memberPayload.AddressStreet1 = request.address;
      member = await db.MemberInfo.create(memberPayload, { transaction: t });
    } else if (Object.keys(extras).length) {
      // existing member: refresh the membership info on their row
      await member.update(extras, { transaction: t });
    }

    // 3) create the membership the same way POST /members/:memberId/memberships does
    const membershipPayload = {
      MemberId: member.external_id ?? member.Id,
      RegistryDate: registryDate,
      ExpiryDate: expiryDate,
    };
    if (typeId) membershipPayload.MembershipTypeId = typeId;
    if (serviceId) membershipPayload.ServiceTypeId = serviceId;
    if (membershipNo) membershipPayload.MembershipNo = membershipNo;

    const membership = await db.MembershipDetail.create(membershipPayload, {
      transaction: t,
    });

    // 4) link everything back on the request
    await db.MembershipRequest.update(
      { memberId: member.Id, membershipId: membership.Id },
      { where: { Id: request.Id }, transaction: t },
    );

    await t.commit();

    // 5) welcome SMS (after commit: the approval is kept even if the SMS fails)
    let sms = { sent: false, reason: "SMS not requested" };
    if (b.sendSms !== false) {
      let planName = request.planTitle;
      try {
        if (typeId && db.MembershipType) {
          const mt = await db.MembershipType.findByPk(typeId);
          if (mt && mt.Name) planName = mt.Name;
        }
      } catch (e) {
        /* fall back to the plan the customer chose */
      }

      sms = await smstemplate.sendTemplateSms(
        "membership_welcome",
        request.phone,
        {
          name: request.fullName,
          plan: planName,
          membershipNo: membership.MembershipNo || membershipNo || "-",
          startDate: registryDate,
          expiryDate,
        },
      );
    }

    const fresh = await db.MembershipRequest.findByPk(request.Id);
    return res.json({
      success: true,
      message: existingMember
        ? `Request approved. Membership added to existing member ${member.Name}.`
        : `Request approved. New member ${member.Name} created.`,
      data: {
        request: fresh,
        member: {
          Id: member.Id,
          external_id: member.external_id,
          Name: member.Name,
        },
        membership,
        existingMember,
      },
      sms,
    });
  } catch (err) {
    await t.rollback();
    console.error("approveRequest:", err);
    if (err.name === "SequelizeUniqueConstraintError") {
      return fail(
        res,
        409,
        "That membership number is already in use. Use a different one.",
      );
    }
    return fail(res, 500, "Could not approve the request.");
  }
};

/* ---------- ADMIN: reject (pending only) ---------- */
exports.rejectRequest = async (req, res) => {
  try {
    const reason = clean((req.body || {}).reason, 255) || null;
    const [affected] = await db.MembershipRequest.update(
      { status: "rejected", rejectReason: reason, reviewedAt: new Date() },
      { where: { Id: req.params.id, status: "pending", isDeleted: false } },
    );
    if (affected !== 1)
      return fail(res, 409, "Only pending requests can be rejected.");

    const item = await db.MembershipRequest.findByPk(req.params.id);
    return res.json({
      success: true,
      message: "Request rejected.",
      data: item,
    });
  } catch (err) {
    console.error("rejectRequest:", err);
    return fail(res, 500, "Server error.");
  }
};

/* ---------- ADMIN: reopen a rejected request ---------- */
exports.reopenRequest = async (req, res) => {
  try {
    const [affected] = await db.MembershipRequest.update(
      { status: "pending", rejectReason: null, reviewedAt: null },
      { where: { Id: req.params.id, status: "rejected", isDeleted: false } },
    );
    if (affected !== 1)
      return fail(res, 409, "Only rejected requests can be reopened.");

    const item = await db.MembershipRequest.findByPk(req.params.id);
    return res.json({
      success: true,
      message: "Request reopened.",
      data: item,
    });
  } catch (err) {
    console.error("reopenRequest:", err);
    return fail(res, 500, "Server error.");
  }
};

/* ---------- ADMIN: soft delete (approved ones are kept as history) ---------- */
exports.deleteRequest = async (req, res) => {
  try {
    const item = await db.MembershipRequest.findOne({
      where: { Id: req.params.id, isDeleted: false },
    });
    if (!item) return fail(res, 404, "Request not found.");
    if (item.status === "approved") {
      return fail(
        res,
        409,
        "Approved requests are kept as history and cannot be deleted.",
      );
    }
    item.isDeleted = true;
    await item.save();
    return res.json({ success: true, message: "Request deleted." });
  } catch (err) {
    console.error("deleteRequest:", err);
    return fail(res, 500, "Server error.");
  }
};
