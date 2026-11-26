const { getMssqlPool, sql } = require("../config/db");

let MemberModel; // MemberInfo
let MembershipDetail; // MembershipDetail
let MembershipType; // MembershipType
let ServiceType; // ServiceType
let SyncState;
let BOUND = false;
let RUNNING = false;

const SYNC_KEY = "RsMember_last_id";
const BATCH_SIZE = Number(process.env.SYNC_BATCH_SIZE) || 500;

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
 * Returns a Set of column names for a dbo table (empty Set if the table does
 * not exist or cannot be read).
 */
async function getTableColumns(pool, tableName) {
  try {
    const res = await pool.request().input("t", sql.NVarChar, tableName).query(`
        SELECT c.name AS ColumnName
        FROM sys.columns c
        JOIN sys.tables  t ON t.object_id = c.object_id
        JOIN sys.schemas s ON s.schema_id = t.schema_id
        WHERE t.name = @t AND s.name = 'dbo'
      `);
    return new Set(res.recordset.map((r) => r.ColumnName));
  } catch (err) {
    console.warn(`⚠️ Could not read schema for ${tableName}: ${err.message}`);
    return new Set();
  }
}

/** "alias.[col] AS asName" fragments, skipping columns the table doesn't have */
function buildCols(alias, cols, wanted) {
  return wanted
    .filter(([col]) => cols.has(col))
    .map(([col, asName]) => `${alias}.[${col}] AS ${asName}`)
    .join(",\n        ");
}

/* ========================================================================== */
/*                         1) REFERENCE TABLES                                */
/* ========================================================================== */

/**
 * RsMembershipType / RsServiceType are small lookup tables, so they are synced
 * in full on every run (no JOIN needed, no row multiplication).
 */
async function syncReferenceTable(pool, tableName, model, label) {
  if (!model) return 0;

  const cols = await getTableColumns(pool, tableName);
  if (!cols.has("Id")) return 0;

  const fields = ["Id", "Name", "Description", "IsActive"].filter((c) =>
    cols.has(c),
  );
  const result = await pool
    .request()
    .query(
      `SELECT ${fields.map((c) => `[${c}]`).join(", ")} FROM dbo.${tableName}`,
    );

  let count = 0;
  for (const r of result.recordset) {
    try {
      const row = { Id: r.Id };
      if (cols.has("Name")) row.Name = nz(r.Name);
      if (cols.has("Description")) row.Description = nz(r.Description);
      if (cols.has("IsActive")) row.IsActive = r.IsActive ?? null;
      await model.upsert(row);
      count++;
    } catch (e) {
      console.warn(`⚠️ ${label} ${r.Id}: ${e.message}`);
    }
  }
  return count;
}

/* ========================================================================== */
/*                              2) MEMBERS                                    */
/* ========================================================================== */

const MEMBER_FIELDS = [
  "Name",
  "Gender",
  "Nationality",
  "TIN",
  "IDNo",
  "IdentificationType",
  "Profession",
  "Mobile",
  "HomeTelephone",
  "WorkTelephone",
  "Fax",
  "POBox",
  "Email",
  "AddressStreet1",
  "AddressStreet2",
  "Country",
  "Region",
  "City",
  "Subcity",
  "Woreda",
  "DateOfBirth",
  "Picture",
  "QRCode",
  "Signature",
];
const BLOB_FIELDS = new Set(["Picture", "QRCode", "Signature"]);

function mapMember(r, fields) {
  const data = { external_id: r.Id, synced_at: new Date() };
  for (const f of fields) {
    if (BLOB_FIELDS.has(f)) data[f] = toBufferOrNull(r[f]);
    else if (f === "DateOfBirth") data[f] = safeDate(r[f]);
    else if (f === "Gender") data[f] = r[f] ?? null;
    else data[f] = nz(r[f]);
  }
  return data;
}

async function upsertMember(r, fields) {
  const data = mapMember(r, fields);
  const existing = await MemberModel.findOne({
    where: { external_id: r.Id },
  });
  if (existing) await existing.update(data);
  else await MemberModel.create(data);
}

/**
 * Pulls members with Id > startId in batches (no JOINs, so the Picture / QRCode
 * / Signature blobs are transferred exactly once per member).
 *
 * The persisted cursor (safeLastId) only advances up to the first failure, so
 * a member that failed is retried on the next run instead of being skipped.
 */
async function pullMemberRows(pool, memberCols, startId) {
  const fields = MEMBER_FIELDS.filter((f) => memberCols.has(f));
  const select = ["m.[Id]", ...fields.map((f) => `m.[${f}]`)].join(", ");

  let fetchCursor = startId;
  let safeLastId = startId;
  let blocked = false;
  let fetched = 0;
  let upserted = 0;
  let failed = 0;

  while (true) {
    const result = await pool
      .request()
      .input("lastId", sql.Int, fetchCursor)
      .input("batch", sql.Int, BATCH_SIZE).query(`
        SELECT TOP (@batch) ${select}
        FROM dbo.RsMember AS m
        WHERE m.Id > @lastId
        ORDER BY m.Id ASC
      `);

    const rows = result.recordset;
    if (rows.length === 0) break;
    fetched += rows.length;

    for (const r of rows) {
      try {
        await upsertMember(r, fields);
        upserted++;
        if (!blocked) safeLastId = r.Id;
      } catch (e) {
        failed++;
        blocked = true;
        console.error(`⚠️ Failed to upsert RsMember.Id=${r.Id}: ${e.message}`);
      }
      fetchCursor = r.Id;
    }

    if (rows.length < BATCH_SIZE) break;
  }

  return { fetched, upserted, failed, safeLastId };
}

/* ========================================================================== */
/*                            3) MEMBERSHIPS                                  */
/* ========================================================================== */

/**
 * MembershipDetail.MemberId has a foreign key to memberinformation.external_id,
 * so every member referenced by a membership must exist in MySQL first.
 * Missing members are back-filled from SQL Server; ids that do not exist in
 * RsMember at all are orphans (reported and skipped).
 */
async function ensureMembersExist(pool, memberCols, memberIds) {
  const ids = [...new Set(memberIds)]
    .map(Number)
    .filter((n) => Number.isInteger(n));

  const present = new Set();
  const CHUNK = 500;

  for (let i = 0; i < ids.length; i += CHUNK) {
    const rows = await MemberModel.findAll({
      attributes: ["external_id"],
      where: { external_id: ids.slice(i, i + CHUNK) },
      raw: true,
    });
    for (const r of rows) present.add(Number(r.external_id));
  }

  const missing = ids.filter((id) => !present.has(id));
  let backfilled = 0;

  if (missing.length > 0) {
    console.log(
      `🩹 ${missing.length} member(s) referenced by memberships are missing in MySQL - back-filling`,
    );
    const fields = MEMBER_FIELDS.filter((f) => memberCols.has(f));
    const select = ["m.[Id]", ...fields.map((f) => `m.[${f}]`)].join(", ");

    for (let i = 0; i < missing.length; i += CHUNK) {
      // ids are validated integers, safe to inline
      const list = missing.slice(i, i + CHUNK).join(",");
      const result = await pool
        .request()
        .query(
          `SELECT ${select} FROM dbo.RsMember AS m WHERE m.Id IN (${list})`,
        );

      for (const r of result.recordset) {
        try {
          await upsertMember(r, fields);
          present.add(Number(r.Id));
          backfilled++;
        } catch (e) {
          console.error(`⚠️ Back-fill RsMember.Id=${r.Id}: ${e.message}`);
        }
      }
    }
  }

  const orphans = ids.filter((id) => !present.has(id));
  if (orphans.length > 0) {
    console.warn(
      `⚠️ ${orphans.length} membership member id(s) not found in RsMember ` +
        `(first few: ${orphans.slice(0, 10).join(", ")})`,
    );
  }

  return { present, backfilled, orphans: orphans.length };
}

/**
 * Memberships are re-synced for ALL members on every run, so renewals,
 * freezes and new services of existing members are picked up too.
 */
async function pullMembershipRows(pool, memberCols) {
  const stats = {
    fetched: 0,
    upserted: 0,
    skipped: 0,
    failed: 0,
    backfilledMembers: 0,
    orphanMembers: 0,
    orphanRows: 0,
  };
  if (!MembershipDetail) return stats;

  const [msCols, memsCols] = await Promise.all([
    getTableColumns(pool, "RsMembership"),
    getTableColumns(pool, "RsMemberService"),
  ]);

  if (!msCols.has("Id") || !msCols.has("MemberId")) {
    console.warn("⚠️ RsMembership missing or has no Id/MemberId - skipping");
    return stats;
  }
  const hasMems = memsCols.has("MembershipId");

  const msSelect = buildCols("ms", msCols, [
    ["Id", "ms_Id"],
    ["MembershipNo", "ms_MembershipNo"],
    ["MemberId", "ms_MemberId"],
    ["MembershipTypeId", "ms_MembershipTypeId"],
    ["RegistryDate", "ms_RegistryDate"],
    ["ExpiryDate", "ms_ExpiryDate"],
  ]);
  const memsSelect = hasMems
    ? buildCols("mems", memsCols, [
        ["Id", "mems_Id"],
        ["MembershipTypeId", "mems_MembershipTypeId"],
        ["ServiceTypeId", "mems_ServiceTypeId"],
        ["RegistryDate", "mems_RegistryDate"],
        ["ExpiryDate", "mems_ExpiryDate"],
        ["FreezeDate", "mems_FreezeDate"],
        ["UnfreezeDate", "mems_UnfreezeDate"],
        ["FreezeCount", "mems_FreezeCount"],
      ])
    : "";

  const query = `
    SELECT ${[msSelect, memsSelect].filter(Boolean).join(",\n        ")}
    FROM dbo.RsMembership AS ms
    ${hasMems ? "LEFT JOIN dbo.RsMemberService AS mems ON ms.Id = mems.MembershipId" : ""}
    ORDER BY ms.Id ASC
  `;

  if (process.env.DEBUG_SYNC_SQL === "1") {
    console.log("🔎 Membership SQL:\n" + query);
  }

  const result = await pool.request().query(query);
  stats.fetched = result.recordset.length;

  // make sure every referenced member exists in MySQL (foreign key)
  const ensured = await ensureMembersExist(
    pool,
    memberCols,
    result.recordset.map((r) => r.ms_MemberId).filter((v) => v != null),
  );
  stats.backfilledMembers = ensured.backfilled;
  stats.orphanMembers = ensured.orphans;

  for (const r of result.recordset) {
    try {
      const registry = safeDateOnly(r.mems_RegistryDate ?? r.ms_RegistryDate);
      if (r.ms_MemberId == null || registry == null) {
        stats.skipped++;
        continue;
      }
      if (!ensured.present.has(Number(r.ms_MemberId))) {
        stats.orphanRows++;
        continue;
      }

      const typeId = r.mems_MembershipTypeId ?? r.ms_MembershipTypeId ?? null;
      const serviceId = r.mems_ServiceTypeId ?? null;

      const where = {
        MemberId: r.ms_MemberId,
        RegistryDate: registry,
        MembershipTypeId: typeId,
        ServiceTypeId: serviceId,
      };

      const syncedFields = {
        MembershipNo: nz(r.ms_MembershipNo),
        MemberId: r.ms_MemberId,
        MembershipTypeId: typeId,
        ServiceTypeId: serviceId,
        RegistryDate: registry,
        ExpiryDate: safeDateOnly(r.mems_ExpiryDate ?? r.ms_ExpiryDate),
        freezDate: safeDateOnly(r.mems_FreezeDate),
        unfreezDate: safeDateOnly(r.mems_UnfreezeDate),
        freezeCount: r.mems_FreezeCount ?? null,
        isFreeze: r.mems_FreezeDate != null && r.mems_UnfreezeDate == null,
      };

      const existing = await MembershipDetail.findOne({ where });
      if (existing) {
        // do NOT overwrite isActive / Status - the app may have changed them
        await existing.update(syncedFields);
      } else {
        await MembershipDetail.create({
          ...syncedFields,
          isActive: true,
          Status: 0,
        });
      }
      stats.upserted++;
    } catch (e) {
      stats.failed++;
      console.error(
        `⚠️ Membership row (ms_Id=${r.ms_Id}, mems_Id=${r.mems_Id}): ${e.message}`,
      );
    }
  }

  return stats;
}

/* ========================================================================== */
/*                                 PULL                                       */
/* ========================================================================== */

/**
 * @param {{ full?: boolean }} options  full=true re-reads every member from Id 0
 *        (use it to refresh edited member data; the cursor never moves back).
 */
async function pullMembers({ full = false } = {}) {
  ensureBound();

  if (RUNNING) throw new Error("A sync is already running");
  RUNNING = true;

  try {
    const pool = await getMssqlPool();
    const storedLastId = await getLastId();
    const startId = full ? 0 : storedLastId;

    const memberCols = await getTableColumns(pool, "RsMember");
    if (!memberCols.has("Id")) {
      throw new Error("dbo.RsMember not found (or it has no Id column)");
    }

    // 1) lookup tables
    const membershipTypes = await syncReferenceTable(
      pool,
      "RsMembershipType",
      MembershipType,
      "MembershipType",
    );
    const serviceTypes = await syncReferenceTable(
      pool,
      "RsServiceType",
      ServiceType,
      "ServiceType",
    );

    // 2) members
    const members = await pullMemberRows(pool, memberCols, startId);
    console.log(
      `📥 Members: fetched ${members.fetched}, saved ${members.upserted}, failed ${members.failed}`,
    );

    // 3) memberships (all members)
    const memberships = await pullMembershipRows(pool, memberCols);
    console.log(
      `📥 Memberships: fetched ${memberships.fetched}, saved ${memberships.upserted}, ` +
        `skipped ${memberships.skipped}, orphan rows ${memberships.orphanRows}, ` +
        `members back-filled ${memberships.backfilledMembers}, failed ${memberships.failed}`,
    );

    // 4) cursor (never moves backwards)
    if (members.safeLastId > storedLastId) await setLastId(members.safeLastId);
    const lastId = Math.max(storedLastId, members.safeLastId);

    return {
      pulled: members.upserted,
      failed: members.failed,
      memberships: memberships.upserted,
      membershipsSkipped: memberships.skipped,
      membershipsFailed: memberships.failed,
      membersBackfilled: memberships.backfilledMembers,
      orphanMembershipRows: memberships.orphanRows,
      referenceData: { membershipTypes, serviceTypes },
      lastId,
    };
  } finally {
    RUNNING = false;
  }
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
