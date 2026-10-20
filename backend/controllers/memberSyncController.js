const { pullMembers, resetCursor } = require("../services/syncservice");

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
  console.log(`🔗 controller bound (member model: ${MemberModel.name})`);
}

exports.syncNow = async (req, res) => {
  try {
    const result = await pullMembers();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Sync failed:", err);
    res.status(500).json({ success: false, message: err.message });
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
