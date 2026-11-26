// controllers/smstemplatecontroller.js
const crypto = require("crypto");
const axios = require("axios");
const { Op } = require("sequelize");
const db = require("../models");

// IMPORTANT: reuse the controller that already works for /api/sms/test
// Adjust the path if your file is named differently (e.g. "./smsController")
const smsController = require("./smsconfigurationcontroller");

const GEEZ_BASE =
  process.env.GEEZSMS_BASE_URL || "https://api.geezsms.com/api/v1";

const Template = () => db.SmsTemplate;
const Config = () =>
  db.SmsConfig ||
  db.SMSConfig ||
  db.SmsConfiguration ||
  db.SMSConfiguration ||
  db.Smsconfig ||
  db.SmsConfigs;

/* ----------------------------- helpers ----------------------------- */

const extractVariables = (body = "") => {
  const found = new Set();
  const re = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;
  let m;
  while ((m = re.exec(body))) found.add(m[1]);
  return [...found];
};

const renderBody = (body = "", values = {}) =>
  body.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) =>
    values[key] !== undefined && values[key] !== ""
      ? String(values[key])
      : `{{${key}}}`,
  );

const decryptToken = (stored) => {
  if (!stored) return null;
  try {
    const key = crypto
      .createHash("sha256")
      .update(String(process.env.SMS_ENC_KEY || ""))
      .digest();
    const raw = Buffer.from(stored, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  } catch (e) {
    return stored;
  }
};

const normalizePhone = (phone = "") => {
  let p = String(phone).replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("0")) p = "251" + p.slice(1);
  if (/^[79]\d{8}$/.test(p)) p = "251" + p;
  return p;
};

const fail = (res, code, message) =>
  res.status(code).json({ success: false, message });

/* ------------------------------ CRUD ------------------------------- */

exports.getTemplates = async (req, res) => {
  try {
    const { category, active, search } = req.query;
    const where = {};
    if (category) where.category = category;
    if (active !== undefined) where.isActive = active === "true";
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { body: { [Op.like]: `%${search}%` } },
      ];
    }
    const data = await Template().findAll({
      where,
      order: [["updatedAt", "DESC"]],
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("getTemplates:", err);
    fail(res, 500, "Failed to load templates");
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const tpl = await Template().findByPk(req.params.id);
    if (!tpl) return fail(res, 404, "Template not found");
    res.json({ success: true, data: tpl });
  } catch (err) {
    console.error("getTemplate:", err);
    fail(res, 500, "Failed to load template");
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const { name, code, category, body, isActive } = req.body;
    if (!name || !code || !body)
      return fail(res, 400, "name, code and body are required");

    const exists = await Template().findOne({ where: { code } });
    if (exists) return fail(res, 409, "Template code already exists");

    const data = await Template().create({
      name,
      code,
      category: category || "general",
      body,
      variables: extractVariables(body),
      isActive: isActive !== undefined ? !!isActive : true,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error("createTemplate:", err);
    fail(res, 500, "Failed to create template");
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const tpl = await Template().findByPk(req.params.id);
    if (!tpl) return fail(res, 404, "Template not found");

    const { name, code, category, body, isActive } = req.body;

    if (code && code !== tpl.code) {
      const dup = await Template().findOne({ where: { code } });
      if (dup) return fail(res, 409, "Template code already exists");
    }

    const nextBody = body !== undefined ? body : tpl.body;
    await tpl.update({
      name: name ?? tpl.name,
      code: code ?? tpl.code,
      category: category ?? tpl.category,
      body: nextBody,
      variables: extractVariables(nextBody),
      isActive: isActive !== undefined ? !!isActive : tpl.isActive,
    });
    res.json({ success: true, data: tpl });
  } catch (err) {
    console.error("updateTemplate:", err);
    fail(res, 500, "Failed to update template");
  }
};

exports.toggleTemplate = async (req, res) => {
  try {
    const tpl = await Template().findByPk(req.params.id);
    if (!tpl) return fail(res, 404, "Template not found");
    await tpl.update({ isActive: !tpl.isActive });
    res.json({ success: true, data: tpl });
  } catch (err) {
    console.error("toggleTemplate:", err);
    fail(res, 500, "Failed to update template");
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const tpl = await Template().findByPk(req.params.id);
    if (!tpl) return fail(res, 404, "Template not found");
    await tpl.destroy();
    res.json({ success: true, message: "Template deleted" });
  } catch (err) {
    console.error("deleteTemplate:", err);
    fail(res, 500, "Failed to delete template");
  }
};

/* ----------------------- preview + test send ----------------------- */

exports.previewTemplate = async (req, res) => {
  const { body, values } = req.body;
  if (!body) return fail(res, 400, "body is required");
  const message = renderBody(body, values || {});
  res.json({
    success: true,
    data: {
      message,
      length: message.length,
      segments: Math.ceil(message.length / 160) || 1,
    },
  });
};

/**
 * POST /api/sms/templates/:id/send-test
 *
 * Instead of building the GeezSMS request ourselves (which caused
 * "API Not found"), we delegate to smsController.sendTest – the exact
 * same function that backs the working POST /api/sms/test endpoint.
 */
exports.sendTestTemplate = async (req, res) => {
  try {
    const tpl = await Template().findByPk(req.params.id);
    if (!tpl) return fail(res, 404, "Template not found");

    const { phone, values } = req.body;
    const to = normalizePhone(phone);
    if (!/^251[79]\d{8}$/.test(to)) {
      return fail(
        res,
        400,
        "Enter a valid Ethiopian phone number (e.g. 0912345678)",
      );
    }

    const message = renderBody(tpl.body, values || {});
    const unresolved = extractVariables(message);
    if (unresolved.length) {
      return fail(
        res,
        400,
        `Fill in all variables before sending: ${unresolved.join(", ")}`,
      );
    }

    // ---- Delegate to the proven /api/sms/test implementation ----
    let captured = null;
    const fakeRes = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        captured = { statusCode: this.statusCode, data };
        return this;
      },
    };

    await smsController.sendTest({ body: { phone: to, message } }, fakeRes);

    if (!captured) {
      return fail(res, 500, "No response from SMS service");
    }

    if (!captured.data || captured.data.success !== true) {
      const msg =
        (captured.data && captured.data.message) || "Failed to send test SMS";
      return fail(res, 502, msg);
    }

    await tpl.update({ lastTestedAt: new Date() });

    return res.json({
      success: true,
      message: "Test SMS sent",
      data: {
        to,
        message,
        provider: captured.data.data,
      },
    });
  } catch (err) {
    console.error("sendTestTemplate:", err);
    fail(res, 500, "Failed to send test SMS");
  }
};

/* -------- helpers used by other controllers (e.g. reservations) -------- */

exports.getSmsTemplate = async (code) =>
  Template().findOne({ where: { code, isActive: true } });

/**
 * Render a template by its code and send it via the working sendTest path.
 * Never throws: returns { sent: boolean, reason?: string }.
 */
exports.sendTemplateSms = async (code, phone, values = {}) => {
  try {
    const tpl = await exports.getSmsTemplate(code);
    if (!tpl) {
      return {
        sent: false,
        reason: `SMS template "${code}" not found or inactive`,
      };
    }

    const to = normalizePhone(phone);
    if (!/^251[79]\d{8}$/.test(to)) {
      return { sent: false, reason: "Invalid customer phone number" };
    }

    const message = renderBody(tpl.body, values);
    const unresolved = extractVariables(message);
    if (unresolved.length) {
      return {
        sent: false,
        reason: `Unresolved variables: ${unresolved.join(", ")}`,
      };
    }

    let captured = null;
    const fakeRes = {
      statusCode: 200,
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(d) {
        captured = { statusCode: this.statusCode, data: d };
        return this;
      },
    };

    await smsController.sendTest({ body: { phone: to, message } }, fakeRes);

    if (!captured || !captured.data || captured.data.success !== true) {
      return {
        sent: false,
        reason:
          (captured && captured.data && captured.data.message) ||
          "SMS provider error",
      };
    }
    return { sent: true };
  } catch (err) {
    console.error("sendTemplateSms:", err);
    return { sent: false, reason: err.message || "SMS failed" };
  }
};
