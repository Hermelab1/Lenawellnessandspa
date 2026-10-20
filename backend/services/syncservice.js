const { getMssqlPool, sql } = require("../config/db");

let MemberModel; // MemberInfo
let MembershipDetail; // MembershipDetail
let MembershipType; // MembershipType
let ServiceType; // ServiceType
let SyncState;
let BOUND = false;

const SYNC_KEY = "RsMember_last_id";

/* ========================================================================== */
/*                              MODEL BINDING                                 */
/* ========================================================================== */

function bindModels(models) {
  if (!models) throw new Error("bindModels: models undefined");

  MemberModel = models.MemberInfo || models.MemberInformation;
  if (!MemberModel) {
    throw new Error(
      "bindModels: could not find MemberInfo or MemberInformation. Got keys: " +
        Object.keys(models).join(","),
    );
  }
  if (!models.SyncState) {
    throw new Error(
      "bindModels: missing SyncState. Got keys: " +
        Object.keys(models).join(","),
    );
  }

  MembershipDetail = models.MembershipDetail || null;
  MembershipType = models.MembershipType || null;
  ServiceType = models.ServiceType || null;
  SyncState = models.SyncState;
  BOUND = true;

  console.log(
    `🔗 syncService bound (member: ${MemberModel.name}, ` +
      `detail: ${MembershipDetail ? MembershipDetail.name : "N/A"}, ` +
      `type: ${MembershipType ? MembershipType.name : "N/A"}, ` +
      `service: ${ServiceType ? ServiceType.name : "N/A"})`,
  );
}

function ensureBound() {
  if (!BOUND) {
    throw new Error(
      "syncService models not bound. Call bindModels(models) after initModels().",
    );
  }
}

/* ========================================================================== */
/*                             CURSOR HELPERS                                 */
/* ========================================================================== */

async function getLastId() {
  ensureBound();
  const row = await SyncState.findByPk(SYNC_KEY);
  return row ? Number(row.value) : 0;
}

async function setLastId(id) {
  ensureBound();
  await SyncState.upsert({ key: SYNC_KEY, value: String(id) });
}

/* ========================================================================== */
/*                                UTILITIES                                   */
/* ========================================================================== */

function toBufferOrNull(v) {
  if (v == null) return null;
  return Buffer.isBuffer(v) ? v : Buffer.from(v);
}

function nz(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" && v.trim() === "") return null;
  return v;
}

function safeDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  if (d.getFullYear() < 1900) return null;
  return d;
}

function safeDateOnly(v) {
  const d = safeDate(v);
  return d ? d.toISOString().slice(0, 10) : null;
}

/* ========================================================================== */
/*                         SCHEMA INTROSPECTION                               */
/* ========================================================================== */

/**
 * Returns a Set of column names for a given table (returns empty Set if the
 * table does not exist).
 */
async function getTableColumns(pool, tableName) {
  try {
    const res = await pool.request().input("t", sql.NVarChar, tableName).query(`
        SELECT c.name AS ColumnName
        FROM sys.columns c
        JOIN sys.tables t ON t.object_id = c.object_id
        WHERE t.name = @t
      `);
    return new Set(res.recordset.map((r) => r.ColumnName));
  } catch (err) {
    console.warn(`⚠️ Could not read schema for ${tableName}: ${err.message}`);
    return new Set();
  }
}

/**
 * Builds a "tableAlias.column AS alias_column" fragment, omitting columns that
 * don't exist in the target table.
 */
function buildCols(alias, cols, wanted) {
  return wanted
    .filter(([col]) => cols.has(col))
    .map(([col, asName]) => `${alias}.${col} AS ${asName}`)
    .join(",\n        ");
}

/* ========================================================================== */
/*                                 PULL                                       */
/* ========================================================================== */

async function pullMembers() {
  ensureBound();

  const pool = await getMssqlPool();
  const lastId = await getLastId();

  // ---- introspect schema once ----
  const [memberCols, msCols, memsCols, mtCols, mtdCols, stCols] =
    await Promise.all([
      getTableColumns(pool, "RsMember"),
      getTableColumns(pool, "RsMembership"),
      getTableColumns(pool, "RsMemberService"),
      getTableColumns(pool, "RsMembershipType"),
      getTableColumns(pool, "RsMembershipTypeDetail"),
      getTableColumns(pool, "RsServiceType"),
    ]);

  const hasMembership = msCols.size > 0;
  const hasMemberService = memsCols.size > 0;
  const hasMembershipType = mtCols.size > 0;
  const hasMembershipTypeDetail = mtdCols.size > 0;
  const hasServiceType = stCols.size > 0;

  console.log(
    `🧭 Schema: RsMembership=${hasMembership}, RsMemberService=${hasMemberService}, ` +
      `RsMembershipType=${hasMembershipType}, RsMembershipTypeDetail=${hasMembershipTypeDetail}, ` +
      `RsServiceType=${hasServiceType}`,
  );

  // ---- build SELECT dynamically ----
  const memberSelect = buildCols("m", memberCols, [
    ["Id", "Id"],
    ["Name", "Name"],
    ["Gender", "Gender"],
    ["Nationality", "Nationality"],
    ["TIN", "TIN"],
    ["IDNo", "IDNo"],
    ["IdentificationType", "IdentificationType"],
    ["Profession", "Profession"],
    ["Mobile", "Mobile"],
    ["HomeTelephone", "HomeTelephone"],
    ["WorkTelephone", "WorkTelephone"],
    ["Fax", "Fax"],
    ["POBox", "POBox"],
    ["Email", "Email"],
    ["AddressStreet1", "AddressStreet1"],
    ["AddressStreet2", "AddressStreet2"],
    ["Country", "Country"],
    ["Region", "Region"],
    ["City", "City"],
    ["Subcity", "Subcity"],
    ["Woreda", "Woreda"],
    ["DateOfBirth", "DateOfBirth"],
    ["Picture", "Picture"],
    ["QRCode", "QRCode"],
    ["Signature", "Signature"],
  ]);

  const msSelect = hasMembership
    ? buildCols("ms", msCols, [
        ["Id", "ms_Id"],
        ["MembershipNo", "ms_MembershipNo"],
        ["MemberId", "ms_MemberId"],
        ["RegistryDate", "ms_RegistryDate"],
        ["ExpiryDate", "ms_ExpiryDate"],
      ])
    : "";

  const memsSelect = hasMemberService
    ? buildCols("mems", memsCols, [
        ["Id", "mems_Id"],
        ["MembershipId", "mems_MembershipId"],
        ["MembershipTypeId", "mems_MembershipTypeId"],
        ["ServiceTypeId", "mems_ServiceTypeId"],
        ["RegistryDate", "mems_RegistryDate"],
        ["ExpiryDate", "mems_ExpiryDate"],
        ["FreezeDate", "mems_FreezeDate"],
        ["UnfreezeDate", "mems_UnfreezeDate"],
        ["FreezeCount", "mems_FreezeCount"],
      ])
    : "";

  const mtSelect = hasMembershipType
    ? buildCols("mt", mtCols, [
        ["Id", "mt_Id"],
        ["Name", "mt_Name"],
        ["Description", "mt_Description"],
        ["IsActive", "mt_IsActive"],
      ])
    : "";

  const mtdSelect = hasMembershipTypeDetail
    ? buildCols("mtd", mtdCols, [
        ["Id", "mtd_Id"],
        ["MembershipTypeId", "mtd_MembershipTypeId"],
        ["ServiceTypeId", "mtd_ServiceTypeId"],
      ])
    : "";

  const stSelect = hasServiceType
    ? buildCols("st", stCols, [
        ["Id", "st_Id"],
        ["Name", "st_Name"],
        ["Description", "st_Description"],
        ["IsActive", "st_IsActive"],
      ])
    : "";

  // join only what exists
  const joins = [];
  if (hasMembership)
    joins.push("LEFT JOIN RsMembership AS ms ON m.Id = ms.MemberId");
  if (hasMembership && hasMemberService)
    joins.push(
      "LEFT JOIN RsMemberService AS mems ON ms.Id = mems.MembershipId",
    );
  if (
    (hasMembershipType &&
      hasMemberService &&
      memsCols.has("MembershipTypeId")) ||
    (hasMembershipType && hasMembershipTypeDetail)
  ) {
    const mtJoinSource = memsCols.has("MembershipTypeId")
      ? "mems.MembershipTypeId"
      : "mtd.MembershipTypeId";
    if (hasMemberService && memsCols.has("MembershipTypeId"))
      joins.push(`LEFT JOIN RsMembershipType AS mt ON ${mtJoinSource} = mt.Id`);
    else if (hasMembershipTypeDetail)
      joins.push(`LEFT JOIN RsMembershipType AS mt ON ${mtJoinSource} = mt.Id`);
  }
  if (hasMembershipType && hasMembershipTypeDetail)
    joins.push(
      "LEFT JOIN RsMembershipTypeDetail AS mtd ON mt.Id = mtd.MembershipTypeId",
    );
  if (hasMembershipTypeDetail && hasServiceType)
    joins.push("LEFT JOIN RsServiceType AS st ON mtd.ServiceTypeId = st.Id");

  const selectParts = [
    memberSelect,
    msSelect,
    memsSelect,
    mtSelect,
    mtdSelect,
    stSelect,
  ]
    .filter(Boolean)
    .join(",\n        ");

  const query = `
    SELECT
        ${selectParts}
    FROM dbo.RsMember AS m
    ${joins.join("\n    ")}
    WHERE m.Id > @lastId
    ORDER BY m.Id ASC
  `;

  if (process.env.DEBUG_SYNC_SQL === "1") {
    console.log("🔎 SQL:\n" + query);
  }

  const result = await pool
    .request()
    .input("lastId", sql.Int, lastId)
    .query(query);

  const rows = result.recordset;
  if (rows.length === 0) return { pulled: 0, lastId };

  console.log(`📥 Fetched ${rows.length} row(s) from SQL Server`);

  /* --------------- group rows by member --------------- */
  const grouped = new Map();

  for (const r of rows) {
    if (!grouped.has(r.Id)) {
      grouped.set(r.Id, {
        member: {
          external_id: r.Id,
          Name: nz(r.Name),
          Gender: r.Gender ?? null,
          Nationality: nz(r.Nationality),
          TIN: nz(r.TIN),
          IDNo: nz(r.IDNo),
          IdentificationType: nz(r.IdentificationType),
          Profession: nz(r.Profession),
          Mobile: nz(r.Mobile),
          HomeTelephone: nz(r.HomeTelephone),
          WorkTelephone: nz(r.WorkTelephone),
          Fax: nz(r.Fax),
          POBox: nz(r.POBox),
          Email: nz(r.Email),
          AddressStreet1: nz(r.AddressStreet1),
          AddressStreet2: nz(r.AddressStreet2),
          Country: nz(r.Country),
          Region: nz(r.Region),
          City: nz(r.City),
          Subcity: nz(r.Subcity),
          Woreda: nz(r.Woreda),
          DateOfBirth: safeDate(r.DateOfBirth),
          Picture: toBufferOrNull(r.Picture),
          QRCode: toBufferOrNull(r.QRCode),
          Signature: toBufferOrNull(r.Signature),
          synced_at: new Date(),
        },
        memberships: new Map(), // key = mems_Id (or ms_Id if no mems)
        serviceTypes: new Map(), // key = st_Id
        membershipTypes: new Map(), // key = mt_Id
      });
    }

    const g = grouped.get(r.Id);

    // reference: ServiceType
    if (r.st_Id != null) {
      g.serviceTypes.set(r.st_Id, {
        Id: r.st_Id,
        Name: nz(r.st_Name),
        Description: nz(r.st_Description),
        IsActive: r.st_IsActive ?? null,
      });
    }

    // reference: MembershipType
    if (r.mt_Id != null) {
      g.membershipTypes.set(r.mt_Id, {
        Id: r.mt_Id,
        Name: nz(r.mt_Name),
        Description: nz(r.mt_Description),
        IsActive: r.mt_IsActive ?? null,
      });
    }

    // membership detail row — prefer RsMemberService.Id, else RsMembership.Id
    const detailId =
      r.mems_Id != null
        ? `mems_${r.mems_Id}`
        : r.ms_Id != null
          ? `ms_${r.ms_Id}`
          : null;
    if (detailId && !g.memberships.has(detailId)) {
      const serviceTypeId =
        r.mems_ServiceTypeId != null
          ? r.mems_ServiceTypeId
          : (r.mtd_ServiceTypeId ?? null);

      g.memberships.set(detailId, {
        MembershipNo: nz(r.ms_MembershipNo),
        MemberId: r.ms_MemberId ?? r.Id,
        MembershipTypeId:
          r.mems_MembershipTypeId ?? r.mtd_MembershipTypeId ?? null,
        ServiceTypeId: serviceTypeId,
        RegistryDate: safeDateOnly(r.mems_RegistryDate ?? r.ms_RegistryDate),
        ExpiryDate: safeDateOnly(r.mems_ExpiryDate ?? r.ms_ExpiryDate),
        freezDate: safeDateOnly(r.mems_FreezeDate),
        unfreezDate: safeDateOnly(r.mems_UnfreezeDate),
        freezeCount: r.mems_FreezeCount ?? null,
        isFreeze: r.mems_FreezeDate != null && r.mems_UnfreezeDate == null,
        isActive: true,
        Status: 0,
      });
    }
  }

  /* --------------- upsert --------------- */
  let maxId = lastId;
  let processedMembers = 0;
  let processedMemberships = 0;

  for (const [memberId, group] of grouped) {
    try {
      // reference: MembershipType
      if (MembershipType) {
        for (const mt of group.membershipTypes.values()) {
          try {
            const existing = await MembershipType.findByPk(mt.Id);
            if (existing) await existing.update(mt);
            else await MembershipType.create(mt);
          } catch (e) {
            console.warn(`⚠️ MembershipType ${mt.Id}: ${e.message}`);
          }
        }
      }

      // reference: ServiceType
      if (ServiceType) {
        for (const st of group.serviceTypes.values()) {
          try {
            const existing = await ServiceType.findByPk(st.Id);
            if (existing) await existing.update(st);
            else await ServiceType.create(st);
          } catch (e) {
            console.warn(`⚠️ ServiceType ${st.Id}: ${e.message}`);
          }
        }
      }

      // member
      let memberRow = await MemberModel.findOne({
        where: { external_id: memberId },
      });
      if (memberRow) await memberRow.update(group.member);
      else memberRow = await MemberModel.create(group.member);

      // memberships
      if (MembershipDetail) {
        for (const detail of group.memberships.values()) {
          // Skip if we have nothing meaningful to match on
          if (detail.MemberId == null || detail.RegistryDate == null) {
            continue;
          }

          const where = {
            MemberId: detail.MemberId,
            RegistryDate: detail.RegistryDate,
          };
          if (detail.MembershipTypeId != null)
            where.MembershipTypeId = detail.MembershipTypeId;
          if (detail.ServiceTypeId != null)
            where.ServiceTypeId = detail.ServiceTypeId;

          const existing = await MembershipDetail.findOne({ where });
          if (existing) await existing.update(detail);
          else await MembershipDetail.create(detail);
          processedMemberships++;
        }
      }

      processedMembers++;
      if (memberId > maxId) maxId = memberId;
    } catch (rowErr) {
      console.error(
        `⚠️ Failed to upsert RsMember.Id=${memberId}:`,
        rowErr.message,
      );
    }
  }

  if (processedMembers > 0) await setLastId(maxId);

  console.log(
    `🔄 Pulled ${processedMembers}/${grouped.size} member(s), ` +
      `${processedMemberships} membership detail row(s) (lastId → ${maxId})`,
  );

  return {
    pulled: processedMembers,
    memberships: processedMemberships,
    lastId: maxId,
  };
}

async function resetCursor() {
  ensureBound();
  await SyncState.destroy({ where: { key: SYNC_KEY } });
  console.log("♻️ Sync cursor reset");
}

module.exports = {
  bindModels,
  pullMembers,
  getLastId,
  setLastId,
  resetCursor,
};
