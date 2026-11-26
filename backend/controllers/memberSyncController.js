const syncService = require("../services/syncService");
const { pullMembers, resetCursor } = syncService;

let MemberModel;
let SyncState;

function bindModels(models) {
  if (!models) throw new Error("controller.bindModels: models undefined");

  MemberModel = models.MemberInfo || models.MemberInformation;
  if (!MemberModel) {
    throw new Error(
      "controller.bindModels: no MemberInfo/MemberInformation. Keys: " +
        Object.keys(models).join(","),
    );
  }
  if (!models.SyncState) {
    throw new Error(
      "controller.bindModels: no SyncState. Keys: " +
        Object.keys(models).join(","),
    );
  }

  SyncState = models.SyncState;

  // IMPORTANT: the service needs the models too, otherwise pullMembers()
  // throws "syncService models not bound".
  syncService.bindModels(models);

  console.log(`🔗 controller bound (member model: ${MemberModel.name})`);
}

exports.syncNow = async (req, res) => {
  try {
    const full = req.query.full === "1" || req.query.full === "true";
    const result = await pullMembers({ full });
    // success only if nothing failed; details are always returned
    res.json({ success: result.failed === 0, ...result });
  } catch (err) {
    console.error("Sync failed:", err);
    const status = /already running/i.test(err.message) ? 409 : 500;
    res.status(status).json({ success: false, message: err.message });
  }
};

exports.reset = async (req, res) => {
  try {
    await resetCursor();
    res.json({ success: true, message: "Cursor reset." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.list = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const offset = Number(req.query.offset) || 0;
    const { rows, count } = await MemberModel.findAndCountAll({
      attributes: { exclude: ["Picture", "QRCode", "Signature"] },
      limit,
      offset,
      order: [["Id", "DESC"]],
    });
    res.json({ success: true, total: count, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const m = await MemberModel.findOne({
      where: { external_id: req.params.id },
    });
    if (!m)
      return res.status(404).json({ success: false, message: "Not found" });

    const json = m.toJSON();
    for (const k of ["Picture", "QRCode", "Signature"]) {
      if (json[k]) json[k] = Buffer.from(json[k]).toString("base64");
    }
    res.json({ success: true, data: json });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.status = async (req, res) => {
  try {
    const total = await MemberModel.count();
    const state = await SyncState.findByPk("RsMember_last_id");
    res.json({
      success: true,
      totalInMySQL: total,
      lastPulledId: state ? Number(state.value) : 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.bindModels = bindModels;
