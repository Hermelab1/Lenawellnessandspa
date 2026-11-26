const { Op } = require("sequelize");

let M = {}; // models

exports.bindModels = (models) => {
  if (!models)
    throw new Error("membershipController.bindModels: models undefined");
  for (const k of [
    "MemberInfo",
    "MembershipDetail",
    "MembershipType",
    "ServiceType",
  ]) {
    if (!models[k])
      throw new Error(`membershipController.bindModels: missing model ${k}`);
  }
  M = models;
  console.log("🔗 membershipController bound");
};

/* ---------------- mappers (DB PascalCase -> frontend camelCase) ---------------- */
const splitName = (full = "") => {
  const parts = String(full).trim().split(/\s+/);
  return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
};

const memberOut = (m) => {
  const j = m.toJSON ? m.toJSON() : m;
  return {
    id: j.Id,
    externalId: j.external_id,
    ...splitName(j.Name),
    phone: j.Mobile || "",
    email: j.Email || "",
    isActive: j.IsActive !== false,
  };
};

// Row from the raw "member + latest membership" query in listMembers
const memberWithLatestOut = (r) => {
  const frozen = !!r.isFreeze;
  const hasMembership = r.MembershipDetailId != null;
  return {
    // ---- member (header) ----
    id: r.MemberId,
    externalId: r.ExternalId,
    memberName: r.MemberName,
    ...splitName(r.MemberName),
    gender: r.Gender,
    phone: r.Mobile || "",
    email: r.Email || "",
    isActive: r.MemberIsActive !== 0 && r.MemberIsActive !== false,

    // ---- latest membership (detail); null when the member has none ----
    membershipId: r.MembershipDetailId,
    membershipNo: r.MembershipNo,
    startDate: r.RegistryDate,
    endDate: r.ExpiryDate,
    freezeDate: r.freezDate,
    unfreezeDate: r.unfreezDate,
    freezeCount: r.freezeCount ?? 0,
    isFrozen: frozen,
    membershipIsActive: hasMembership ? !!r.MembershipIsActive : null,
    membershipStatusCode: r.MembershipStatus,
    membershipTypeName: r.MembershipTypeName,
    serviceTypeName: r.ServiceTypeName,
    status: !hasMembership
      ? "None"
      : frozen
        ? "Frozen"
        : new Date(r.ExpiryDate) < new Date()
          ? "Expired"
          : "Active",
  };
};

const typeOut = (t) => {
  const j = t.toJSON ? t.toJSON() : t;
  return {
    id: j.Id,
    name: j.Name,
    description: j.Description,
    isActive: !!j.IsActive,
    price: j.Price ?? 0,
    durationDays: j.DurationDays ?? 0,
  };
};

const msOut = (r) => {
  const j = r.toJSON ? r.toJSON() : r;
  const frozen = !!j.isFreeze;
  return {
    id: j.Id,
    membershipNo: j.MembershipNo,
    memberId: j.MemberId,
    membershipTypeId: j.MembershipTypeId,
    serviceTypeId: j.ServiceTypeId,
    membershipTypeName: j.membershipType?.Name,
    serviceTypeName: j.serviceType?.Name,
    startDate: j.RegistryDate,
    endDate: j.ExpiryDate,
    isFrozen: frozen,
    isActive: !!j.isActive,
    status: frozen
      ? "Frozen"
      : new Date(j.ExpiryDate) < new Date()
        ? "Expired"
        : "Active",
  };
};

const fail = (res, e, code = 500) =>
  res.status(code).json({ success: false, message: e.message });

const toBool = (v) => v === true || v === "true" || v === "1" || v === 1;

/* ---------------- generic lookup CRUD (membership types / service types) ---------------- */
const lookupCrud = (modelKey, hasPriceFields) => ({
  list: async (req, res) => {
    try {
      const where = toBool(req.query.activeOnly) ? { IsActive: true } : {};
      const rows = await M[modelKey].findAll({ where, order: [["Id", "ASC"]] });
      res.json(rows.map(typeOut));
    } catch (e) {
      fail(res, e);
    }
  },
  create: async (req, res) => {
    try {
      const b = req.body;
      if (!b.name) return fail(res, new Error("Name is required"), 400);
      const data = {
        Name: b.name,
        Description: b.description || null,
        IsActive: b.isActive !== false,
      };
      if (hasPriceFields) {
        data.Price = Number(b.price) || 0;
        data.DurationDays = Number(b.durationDays) || 0;
      }
      res.status(201).json(typeOut(await M[modelKey].create(data)));
    } catch (e) {
      fail(res, e);
    }
  },
  update: async (req, res) => {
    try {
      const row = await M[modelKey].findByPk(req.params.id);
      if (!row) return fail(res, new Error("Not found"), 404);
      const b = req.body;
      const data = {
        Name: b.name,
        Description: b.description ?? null,
        IsActive: b.isActive !== false,
      };
      if (hasPriceFields) {
        data.Price = Number(b.price) || 0;
        data.DurationDays = Number(b.durationDays) || 0;
      }
      await row.update(data);
      res.json(typeOut(row));
    } catch (e) {
      fail(res, e);
    }
  },
  remove: async (req, res) => {
    try {
      const row = await M[modelKey].findByPk(req.params.id);
      if (!row) return fail(res, new Error("Not found"), 404);
      await row.destroy();
      res.json({ success: true });
    } catch (e) {
      fail(
        res,
        new Error(
          "Cannot delete: it is used by existing memberships. Deactivate it instead.",
        ),
        409,
      );
    }
  },
});

// Change false -> true only after adding Price/DurationDays to the MembershipType model + table
exports.membershipTypes = lookupCrud("MembershipType", false);
exports.serviceTypes = lookupCrud("ServiceType", false);

/* ---------------- members ---------------- */

// Which member column membershipdetail.MemberId points to.
// false = memberinformation.Id (matches your SQL), true = memberinformation.external_id.
// Used by the list query, getMemberships, createMembership and createMember.
const LINK_BY_EXTERNAL_ID = false;
const MEMBER_JOIN_COL = LINK_BY_EXTERNAL_ID ? "mi.external_id" : "mi.Id";
const linkValue = (m) => (LINK_BY_EXTERNAL_ID ? m.external_id : m.Id);

// One row per member (header) + their latest membership (detail)
exports.listMembers = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const pageSize = Math.min(Number(req.query.pageSize) || 20, 200);
    const search = (req.query.search || "").trim();

    const searchSql = search
      ? `WHERE (mi.Name LIKE :s OR mi.Mobile LIKE :s OR mi.Email LIKE :s)`
      : "";

    const sql = `
      SELECT
        mi.Id AS MemberId,
        mi.external_id AS ExternalId,
        mi.Name AS MemberName,
        mi.Gender,
        mi.Mobile,
        mi.Email,
        mi.IsActive AS MemberIsActive,

        md.Id AS MembershipDetailId,
        md.MembershipNo,
        md.RegistryDate,
        md.ExpiryDate,
        md.freezDate,
        md.unfreezDate,
        md.freezeCount,
        md.isFreeze,
        md.isActive AS MembershipIsActive,
        md.Status AS MembershipStatus,

        mt.Name AS MembershipTypeName,
        st.Name AS ServiceTypeName

      FROM lenawallness.memberinformation mi

      LEFT JOIN (
        SELECT md1.*
        FROM lenawallness.membershipdetail md1
        INNER JOIN (
          SELECT MemberId, MAX(Id) AS LatestMembershipId
          FROM lenawallness.membershipdetail
          GROUP BY MemberId
        ) latest ON latest.LatestMembershipId = md1.Id
      ) md ON md.MemberId = ${MEMBER_JOIN_COL}

      LEFT JOIN lenawallness.membershiptype mt ON mt.Id = md.MembershipTypeId
      LEFT JOIN lenawallness.servicetype st ON st.Id = md.ServiceTypeId

      ${searchSql}
      ORDER BY mi.Id ASC
      LIMIT :limit OFFSET :offset`;

    const sequelize = M.MemberInfo.sequelize;
    const rows = await sequelize.query(sql, {
      type: sequelize.QueryTypes.SELECT,
      replacements: {
        s: `%${search}%`,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      },
    });

    res.json(rows.map(memberWithLatestOut));
  } catch (e) {
    fail(res, e);
  }
};

// Creates the member (header) and, when `membership` is sent, its first
// membership (detail) in one transaction: both are saved or neither is.
exports.createMember = async (req, res) => {
  let t;
  try {
    const {
      firstName = "",
      lastName = "",
      phone,
      email,
      membership,
    } = req.body;
    if (!firstName.trim())
      return fail(res, new Error("First name is required"), 400);
    if (membership) {
      if (!membership.membershipTypeId || !membership.startDate)
        return fail(
          res,
          new Error("Membership type and start date are required"),
          400,
        );
      if (LINK_BY_EXTERNAL_ID)
        return fail(
          res,
          new Error(
            "New members have no external_id yet, so a membership can't be created with them.",
          ),
          400,
        );
    }

    t = await M.MemberInfo.sequelize.transaction();

    const member = await M.MemberInfo.create(
      {
        Name: `${firstName} ${lastName}`.trim(),
        Mobile: phone || null,
        Email: email || null,
      },
      { transaction: t },
    );

    let detail = null;
    if (membership) {
      detail = await M.MembershipDetail.create(
        {
          MemberId: linkValue(member),
          MembershipTypeId: Number(membership.membershipTypeId),
          ServiceTypeId: membership.serviceTypeId
            ? Number(membership.serviceTypeId)
            : null,
          RegistryDate: membership.startDate,
          ExpiryDate: membership.endDate || membership.startDate, // NOT NULL
          isActive: true,
          isFreeze: false,
          Status: 0,
        },
        { transaction: t },
      );
    }

    await t.commit();
    res.status(201).json({
      ...memberOut(member),
      membership: detail ? msOut(detail) : null,
    });
  } catch (e) {
    if (t && !t.finished) await t.rollback();
    fail(res, e);
  }
};

exports.updateMember = async (req, res) => {
  try {
    const row = await M.MemberInfo.findByPk(req.params.id);
    if (!row) return fail(res, new Error("Member not found"), 404);
    const { firstName = "", lastName = "", phone, email } = req.body;
    await row.update({
      Name: `${firstName} ${lastName}`.trim(),
      Mobile: phone || null,
      Email: email || null,
    });
    res.json(memberOut(row));
  } catch (e) {
    fail(res, e);
  }
};

exports.deactivateMember = async (req, res) => {
  try {
    const row = await M.MemberInfo.findByPk(req.params.id);
    if (!row) return fail(res, new Error("Member not found"), 404);
    await row.update({ IsActive: false }); // needs IsActive on the MemberInfo model
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
};

exports.memberImage = async (req, res) => {
  try {
    const row = await M.MemberInfo.findByPk(req.params.id, {
      attributes: ["Id", "Picture"],
    });
    if (!row || !row.Picture) return res.status(404).end();
    const buf = Buffer.from(row.Picture);
    const type = buf[0] === 0x89 ? "image/png" : "image/jpeg";
    res
      .set("Content-Type", type)
      .set("Cache-Control", "public, max-age=300")
      .send(buf);
  } catch (e) {
    fail(res, e);
  }
};

/* ---------------- memberships (MembershipDetail) ---------------- */
// MembershipDetail.MemberId points at MemberInfo.Id or .external_id (see LINK_BY_EXTERNAL_ID).
const resolveMember = async (localId) => {
  const m = await M.MemberInfo.findByPk(localId, {
    attributes: ["Id", "external_id"],
  });
  if (!m) throw Object.assign(new Error("Member not found"), { code: 404 });
  if (LINK_BY_EXTERNAL_ID && m.external_id == null)
    throw Object.assign(
      new Error(
        "This member has no external_id (not synced), so memberships can't be linked yet.",
      ),
      { code: 400 },
    );
  return m;
};

const withIncludes = () => [
  { model: M.MembershipType, as: "membershipType", attributes: ["Id", "Name"] },
  { model: M.ServiceType, as: "serviceType", attributes: ["Id", "Name"] },
];

exports.getMemberships = async (req, res) => {
  try {
    const m = await resolveMember(req.params.id);
    const rows = await M.MembershipDetail.findAll({
      where: { MemberId: linkValue(m) },
      include: withIncludes(),
      order: [["RegistryDate", "DESC"]],
    });
    res.json(rows.map(msOut));
  } catch (e) {
    fail(res, e, e.code || 500);
  }
};

exports.createMembership = async (req, res) => {
  try {
    const m = await resolveMember(req.params.id);
    const b = req.body;
    if (!b.membershipTypeId || !b.startDate)
      return fail(
        res,
        new Error("Membership type and start date are required"),
        400,
      );

    const row = await M.MembershipDetail.create({
      MemberId: linkValue(m),
      MembershipTypeId: Number(b.membershipTypeId),
      ServiceTypeId: b.serviceTypeId ? Number(b.serviceTypeId) : null,
      RegistryDate: b.startDate,
      ExpiryDate: b.endDate || b.startDate, // ExpiryDate is NOT NULL
      isActive: true,
      isFreeze: false,
      Status: 0,
    });
    res.status(201).json(msOut(row));
  } catch (e) {
    fail(res, e, e.code || 500);
  }
};

exports.updateMembership = async (req, res) => {
  try {
    const row = await M.MembershipDetail.findByPk(req.params.id);
    if (!row) return fail(res, new Error("Membership not found"), 404);
    const b = req.body;
    await row.update({
      MembershipTypeId: b.membershipTypeId ? Number(b.membershipTypeId) : null,
      ServiceTypeId: b.serviceTypeId ? Number(b.serviceTypeId) : null,
      RegistryDate: b.startDate,
      ExpiryDate: b.endDate || b.startDate,
    });
    res.json(msOut(row));
  } catch (e) {
    fail(res, e);
  }
};

const today = () => new Date().toISOString().slice(0, 10);

exports.freezeMembership = async (req, res) => {
  try {
    const row = await M.MembershipDetail.findByPk(req.params.id);
    if (!row) return fail(res, new Error("Membership not found"), 404);
    if (row.isFreeze) return fail(res, new Error("Already frozen"), 400);
    await row.update({
      isFreeze: true,
      freezDate: today(),
      unfreezDate: null,
      freezeCount: (row.freezeCount || 0) + 1,
    });
    res.json(msOut(row));
  } catch (e) {
    fail(res, e);
  }
};

exports.unfreezeMembership = async (req, res) => {
  try {
    const row = await M.MembershipDetail.findByPk(req.params.id);
    if (!row) return fail(res, new Error("Membership not found"), 404);
    if (!row.isFreeze) return fail(res, new Error("Not frozen"), 400);

    // extend expiry by the number of days it was frozen
    const frozenDays = Math.max(
      0,
      Math.round(
        (new Date(today()) - new Date(row.freezDate || today())) / 86400000,
      ),
    );
    const newExpiry = new Date(row.ExpiryDate);
    newExpiry.setDate(newExpiry.getDate() + frozenDays);

    await row.update({
      isFreeze: false,
      unfreezDate: today(),
      ExpiryDate: newExpiry.toISOString().slice(0, 10),
    });
    res.json(msOut(row));
  } catch (e) {
    fail(res, e);
  }
};
