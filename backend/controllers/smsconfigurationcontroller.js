const { SMSConfiguration, SmsSyncStatus } = require("../models");
const geezSms = require("../services/geezservice");

/* ---------------------------------------------------------
 * Helpers
 * --------------------------------------------------------- */
const PHONE_RE = /^2519\d{8}$/; // GeezSMS docs: must start with 2519 (12 digits)
const MAX_MSG = 335;
const MAX_BULK = 1000;

// 0912345678 / +251912345678 / 912345678 -> 251912345678
function normalizePhone(raw) {
  let p = String(raw || "").replace(/[\s+\-()]/g, "");
  if (/^0[79]\d{8}$/.test(p)) p = "251" + p.slice(1);
  else if (/^[79]\d{8}$/.test(p)) p = "251" + p;
  return p;
}
const isValidPhone = (p) => PHONE_RE.test(p);

const isUrlOrEmpty = (v) => {
  if (v === undefined || v === null || v === "") return true;
  try {
    const u = new URL(String(v));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};
const intInRange = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

/* The table holds a single settings row */
async function getOrCreateConfig() {
  let config = await SMSConfiguration.findOne({ order: [["id", "ASC"]] });
  if (!config) {
    config = await SMSConfiguration.create({
      status: "enabled",
      environment: "sandbox",
    });
  }
  return config;
}

const retriesFor = (config) =>
  config.retryOnFailure ? Number(config.maxRetries) || 0 : 0;

function redactOtp(data) {
  if (!data || typeof data !== "object") return data;
  let clone;
  try {
    clone = JSON.parse(JSON.stringify(data));
  } catch {
    return data; // circular / non-serializable
  }
  const walk = (o) =>
    Object.keys(o).forEach((k) => {
      if (/^(otp|code|otp_code|token)$/i.test(k)) delete o[k];
      else if (o[k] && typeof o[k] === "object") walk(o[k]);
    });
  walk(clone);
  return clone;
}

/* ---------------------------------------------------------
 * Persist SMS send attempt status. Never throws.
 * --------------------------------------------------------- */
async function recordSmsStatus({
  type = "Other",
  phone = null,
  message = null,
  status,
  response = null,
  error = null,
}) {
  try {
    // Try to extract provider log id for later callback matching
    let providerLogId = null;
    if (response && typeof response === "object") {
      providerLogId =
        response.api_log_id ||
        response.apiLogId ||
        response.log_id ||
        response.id ||
        response?.data?.api_log_id ||
        null;
      if (providerLogId !== null) providerLogId = String(providerLogId);
    }

    await SmsSyncStatus.create({
      Type: type,
      Phone: phone,
      Message: message ? String(message).slice(0, 1000) : null,
      status: status || "unknown",
      providerLogId,
      providerResponse: response ? redactOtp(response) : null,
      errorDetail: error
        ? typeof error === "string"
          ? error
          : JSON.stringify(error).slice(0, 2000)
        : null,
      lastSyncedAt: new Date(),
    });
  } catch (logErr) {
    console.error("[SMS][recordSmsStatus] failed to persist status:", logErr);
  }
}

function upstreamError(res, tag, err, message) {
  const detail = err.response?.data || err.message;
  console.error(`[SMS][${tag}]`, detail);
  return res.status(502).json({ success: false, message, detail });
}

/* ---------------------------------------------------------
 * GET /api/sms/config
 * --------------------------------------------------------- */
const getConfig = async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    return res.status(200).json({ success: true, data: config.toPublicJSON() });
  } catch (err) {
    console.error("[SMS][getConfig]", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load configuration." });
  }
};

/* ---------------------------------------------------------
 * PUT /api/sms/config
 * --------------------------------------------------------- */
const updateConfig = async (req, res) => {
  try {
    const b = req.body || {};

    if (b.environment && !["sandbox", "production"].includes(b.environment)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid environment." });
    }
    if (b.status && !["enabled", "disabled"].includes(b.status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    }
    if (!isUrlOrEmpty(b.callbackUrl) || !isUrlOrEmpty(b.notifyUrl)) {
      return res.status(400).json({
        success: false,
        message: "Callback/Notify URL must be a valid http(s) URL.",
      });
    }
    if (b.defaultMessage && String(b.defaultMessage).length > MAX_MSG) {
      return res.status(400).json({
        success: false,
        message: `Default message must be ≤ ${MAX_MSG} characters.`,
      });
    }
    if (b.otpLength !== undefined && !intInRange(b.otpLength, 4, 8)) {
      return res
        .status(400)
        .json({ success: false, message: "OTP length must be 4–8." });
    }
    if (b.otpExpiry !== undefined && !intInRange(b.otpExpiry, 1, 30)) {
      return res
        .status(400)
        .json({ success: false, message: "OTP expiry must be 1–30 minutes." });
    }
    if (b.maxRetries !== undefined && !intInRange(b.maxRetries, 0, 10)) {
      return res
        .status(400)
        .json({ success: false, message: "Max retries must be 0–10." });
    }

    const config = await getOrCreateConfig();

    const pick = (key) => (b[key] !== undefined ? b[key] : config[key]);
    const emptyToNull = (v) => (v === "" ? null : v);

    config.set({
      status: pick("status"),
      environment: pick("environment"),
      shortcodeId: emptyToNull(pick("shortcodeId")),
      senderId: emptyToNull(pick("senderId")),
      defaultMessage: emptyToNull(pick("defaultMessage")),
      callbackUrl: emptyToNull(pick("callbackUrl")),
      notifyUrl: emptyToNull(pick("notifyUrl")),
      otpEnabled:
        typeof b.otpEnabled === "boolean" ? b.otpEnabled : config.otpEnabled,
      otpLength: b.otpLength !== undefined ? b.otpLength : config.otpLength,
      otpExpiry: b.otpExpiry !== undefined ? b.otpExpiry : config.otpExpiry,
      retryOnFailure:
        typeof b.retryOnFailure === "boolean"
          ? b.retryOnFailure
          : config.retryOnFailure,
      maxRetries: b.maxRetries !== undefined ? b.maxRetries : config.maxRetries,
    });

    // Blank token = keep the existing one
    if (b.apiToken && String(b.apiToken).trim()) {
      config.setToken(String(b.apiToken).trim());
    }

    await config.save();

    return res.status(200).json({
      success: true,
      message: "SMS configuration updated successfully.",
      data: config.toPublicJSON(),
    });
  } catch (err) {
    console.error("[SMS][updateConfig]", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update configuration." });
  }
};

/* ---------------------------------------------------------
 * POST /api/sms/test
 * --------------------------------------------------------- */
const sendTest = async (req, res) => {
  let phone;
  let msg;
  try {
    phone = normalizePhone(req.body?.phone);
    const message = req.body?.message;

    if (!phone) {
      await recordSmsStatus({
        type: "Test",
        status: "invalid",
        error: "Phone number is required.",
      });
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required." });
    }
    if (!isValidPhone(phone)) {
      await recordSmsStatus({
        type: "Test",
        phone,
        status: "invalid",
        error: "Phone must start with 2519 and be 12 digits.",
      });
      return res.status(400).json({
        success: false,
        message: "Phone must start with 2519 and be 12 digits.",
      });
    }
    if (message && String(message).length > MAX_MSG) {
      await recordSmsStatus({
        type: "Test",
        phone,
        message,
        status: "invalid",
        error: `Message must be ≤ ${MAX_MSG} characters.`,
      });
      return res.status(400).json({
        success: false,
        message: `Message must be ≤ ${MAX_MSG} characters.`,
      });
    }

    const config = await getOrCreateConfig();
    const token = config.getDecryptedToken();
    if (!token) {
      await recordSmsStatus({
        type: "Test",
        phone,
        status: "failed",
        error: "API token is not configured.",
      });
      return res
        .status(400)
        .json({ success: false, message: "API token is not configured." });
    }

    msg = message || config.defaultMessage || "Test message from your store.";

    const response = await geezSms.withRetry(
      () =>
        geezSms.sendSms({
          token,
          phone,
          msg,
          shortcodeId: config.shortcodeId,
          callback: config.callbackUrl,
        }),
      { retries: retriesFor(config) },
    );

    await recordSmsStatus({
      type: "Test",
      phone,
      message: msg,
      status: "sent",
      response,
    });

    return res
      .status(200)
      .json({ success: true, message: "Test SMS sent.", data: response });
  } catch (err) {
    const detail = err.response?.data || err.message;
    await recordSmsStatus({
      type: "Test",
      phone: phone || null,
      message: msg || null,
      status: "failed",
      error: detail,
    });
    return upstreamError(res, "sendTest", err, "Failed to send test SMS.");
  }
};

/* ---------------------------------------------------------
 * POST /api/sms/send
 * --------------------------------------------------------- */
const sendSms = async (req, res) => {
  let phone;
  let message;
  try {
    phone = normalizePhone(req.body?.phone);
    message = req.body?.message;
    // Optional: allow caller to tag the type (Reservation / Expire reminder / Other)
    const type = req.body?.type || "Other";

    if (!phone || !message) {
      await recordSmsStatus({
        type,
        phone: phone || null,
        message: message || null,
        status: "invalid",
        error: "phone and message are required.",
      });
      return res
        .status(400)
        .json({ success: false, message: "phone and message are required." });
    }
    if (!isValidPhone(phone)) {
      await recordSmsStatus({
        type,
        phone,
        message,
        status: "invalid",
        error: "Phone must start with 2519 and be 12 digits.",
      });
      return res.status(400).json({
        success: false,
        message: "Phone must start with 2519 and be 12 digits.",
      });
    }
    if (String(message).length > MAX_MSG) {
      await recordSmsStatus({
        type,
        phone,
        message,
        status: "invalid",
        error: `Message must be ≤ ${MAX_MSG} characters.`,
      });
      return res.status(400).json({
        success: false,
        message: `Message must be ≤ ${MAX_MSG} characters.`,
      });
    }

    const config = await getOrCreateConfig();
    if (config.status !== "enabled") {
      await recordSmsStatus({
        type,
        phone,
        message,
        status: "disabled",
        error: "SMS integration is disabled.",
      });
      return res
        .status(403)
        .json({ success: false, message: "SMS integration is disabled." });
    }
    const token = config.getDecryptedToken();
    if (!token) {
      await recordSmsStatus({
        type,
        phone,
        message,
        status: "failed",
        error: "API token is not configured.",
      });
      return res
        .status(400)
        .json({ success: false, message: "API token is not configured." });
    }

    const response = await geezSms.withRetry(
      () =>
        geezSms.sendSms({
          token,
          phone,
          msg: message,
          shortcodeId: config.shortcodeId,
          callback: config.callbackUrl,
        }),
      { retries: retriesFor(config) },
    );

    await recordSmsStatus({
      type,
      phone,
      message,
      status: "sent",
      response,
    });

    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    const detail = err.response?.data || err.message;
    await recordSmsStatus({
      type: req.body?.type || "Other",
      phone: phone || null,
      message: message || null,
      status: "failed",
      error: detail,
    });
    return upstreamError(res, "sendSms", err, "Failed to send SMS.");
  }
};

/* ---------------------------------------------------------
 * POST /api/sms/send/bulk
 * body: { contacts: ["0912...", "2519..."] | [{ phone }], message }
 * --------------------------------------------------------- */
const sendBulkSms = async (req, res) => {
  let valid = [];
  let message = req.body?.message;
  try {
    const { contacts } = req.body || {};

    if (!Array.isArray(contacts) || contacts.length === 0) {
      await recordSmsStatus({
        type: "Bulk",
        message,
        status: "invalid",
        error: "contacts must be a non-empty array.",
      });
      return res.status(400).json({
        success: false,
        message: "contacts must be a non-empty array.",
      });
    }
    if (contacts.length > MAX_BULK) {
      await recordSmsStatus({
        type: "Bulk",
        message,
        status: "invalid",
        error: `Max ${MAX_BULK} contacts per request.`,
      });
      return res.status(400).json({
        success: false,
        message: `Max ${MAX_BULK} contacts per request.`,
      });
    }
    if (!message) {
      await recordSmsStatus({
        type: "Bulk",
        status: "invalid",
        error: "message is required.",
      });
      return res
        .status(400)
        .json({ success: false, message: "message is required." });
    }
    if (String(message).length > MAX_MSG) {
      await recordSmsStatus({
        type: "Bulk",
        message,
        status: "invalid",
        error: `Message must be ≤ ${MAX_MSG} characters.`,
      });
      return res.status(400).json({
        success: false,
        message: `Message must be ≤ ${MAX_MSG} characters.`,
      });
    }

    const seen = new Set();
    const invalid = [];
    for (const c of contacts) {
      const raw = typeof c === "object" && c !== null ? c.phone : c;
      const phone = normalizePhone(raw);
      if (!isValidPhone(phone)) invalid.push(raw);
      else if (!seen.has(phone)) {
        seen.add(phone);
        valid.push({ phone });
      }
    }
    if (valid.length === 0) {
      await recordSmsStatus({
        type: "Bulk",
        message,
        status: "invalid",
        error: "No valid phone numbers.",
      });
      return res
        .status(400)
        .json({ success: false, message: "No valid phone numbers.", invalid });
    }

    const config = await getOrCreateConfig();
    if (config.status !== "enabled") {
      await recordSmsStatus({
        type: "Bulk",
        message,
        status: "disabled",
        error: "SMS integration is disabled.",
      });
      return res
        .status(403)
        .json({ success: false, message: "SMS integration is disabled." });
    }
    const token = config.getDecryptedToken();
    if (!token) {
      await recordSmsStatus({
        type: "Bulk",
        message,
        status: "failed",
        error: "API token is not configured.",
      });
      return res
        .status(400)
        .json({ success: false, message: "API token is not configured." });
    }

    const response = await geezSms.withRetry(
      () =>
        geezSms.sendBulkSms({
          token,
          contacts: valid,
          senderId: config.senderId,
          msg: message,
          notifyUrl: config.notifyUrl || config.callbackUrl,
        }),
      { retries: retriesFor(config) },
    );

    // One summary row
    await recordSmsStatus({
      type: "Bulk",
      message,
      status: "sent",
      response: {
        count: valid.length,
        invalid,
        provider: response,
      },
    });

    return res.status(200).json({
      success: true,
      sent: valid.length,
      skippedInvalid: invalid,
      data: response,
    });
  } catch (err) {
    const detail = err.response?.data || err.message;
    await recordSmsStatus({
      type: "Bulk",
      message: message || null,
      status: "failed",
      error: detail,
    });
    return upstreamError(res, "sendBulkSms", err, "Failed to send bulk SMS.");
  }
};

/* ---------------------------------------------------------
 * POST /api/sms/otp
 * --------------------------------------------------------- */
const sendOtp = async (req, res) => {
  let phone;
  try {
    phone = normalizePhone(req.body?.phone);
    if (!phone) {
      await recordSmsStatus({
        type: "OTP",
        status: "invalid",
        error: "phone is required.",
      });
      return res
        .status(400)
        .json({ success: false, message: "phone is required." });
    }
    if (!isValidPhone(phone)) {
      await recordSmsStatus({
        type: "OTP",
        phone,
        status: "invalid",
        error: "Phone must start with 2519 and be 12 digits.",
      });
      return res.status(400).json({
        success: false,
        message: "Phone must start with 2519 and be 12 digits.",
      });
    }

    const config = await getOrCreateConfig();
    if (config.status !== "enabled") {
      await recordSmsStatus({
        type: "OTP",
        phone,
        status: "disabled",
        error: "SMS integration is disabled.",
      });
      return res
        .status(403)
        .json({ success: false, message: "SMS integration is disabled." });
    }
    if (!config.otpEnabled) {
      await recordSmsStatus({
        type: "OTP",
        phone,
        status: "disabled",
        error: "OTP sending is disabled.",
      });
      return res
        .status(403)
        .json({ success: false, message: "OTP sending is disabled." });
    }
    const token = config.getDecryptedToken();
    if (!token) {
      await recordSmsStatus({
        type: "OTP",
        phone,
        status: "failed",
        error: "API token is not configured.",
      });
      return res
        .status(400)
        .json({ success: false, message: "API token is not configured." });
    }

    const response = await geezSms.withRetry(
      () => geezSms.sendOtp({ token, phone, shortcodeId: config.shortcodeId }),
      { retries: retriesFor(config) },
    );

    await recordSmsStatus({
      type: "OTP",
      phone,
      status: "sent",
      response, // OTP fields are redacted inside recordSmsStatus
    });

    return res.status(200).json({ success: true, data: redactOtp(response) });
  } catch (err) {
    const detail = err.response?.data || err.message;
    await recordSmsStatus({
      type: "OTP",
      phone: phone || null,
      status: "failed",
      error: detail,
    });
    return upstreamError(res, "sendOtp", err, "Failed to send OTP.");
  }
};

/* ---------------------------------------------------------
 * GET /api/sms/balance
 * GeezSMS returns:
 * { error:false, msg:"Sufficient balance",
 *   data:{ total_amount:"634.6275 ETB", total_sms:849, ... } }
 * -> { success, data: { balance, currency, total_sms, total_amount } }
 * --------------------------------------------------------- */
const toNum = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

// "634.6275 ETB" -> { amount: 634.6275, currency: "ETB" }
const parseMoney = (v) => {
  if (v === undefined || v === null || v === "") {
    return { amount: null, currency: null };
  }
  if (typeof v === "number") {
    return { amount: Number.isFinite(v) ? v : null, currency: null };
  }
  const s = String(v).trim();
  const numMatch = s.match(/-?[\d,]*\.?\d+/);
  const curMatch = s.match(/[A-Za-z]{3}/);
  return {
    amount: numMatch ? toNum(numMatch[0]) : null,
    currency: curMatch ? curMatch[0].toUpperCase() : null,
  };
};

const getBalance = async (req, res) => {
  try {
    const config = await getOrCreateConfig();
    const token = config.getDecryptedToken();
    if (!token) {
      return res
        .status(400)
        .json({ success: false, message: "API token is not configured." });
    }

    const response = await geezSms.withRetry(
      () => geezSms.getBalance({ token }),
      { retries: retriesFor(config) },
    );

    // GeezSMS can answer 200 with an error body (e.g. invalid token)
    const failed =
      response?.error === true ||
      response?.success === false ||
      response?.status === false;
    if (failed) {
      return res.status(502).json({
        success: false,
        message:
          response?.message ||
          response?.msg ||
          "GeezSMS rejected the balance request.",
        detail: response,
      });
    }

    const payload =
      response?.data && typeof response.data === "object"
        ? response.data
        : response;

    const totalSms = toNum(payload?.total_sms);
    const money = parseMoney(payload?.total_amount);
    const totalAmount = money.amount;

    // Main balance = money amount; fall back to SMS count
    const balance = totalAmount !== null ? totalAmount : totalSms;
    const currency =
      money.currency || payload?.currency || config.balanceCurrency || "ETB";

    if (balance === null) {
      console.warn("[SMS][getBalance] unexpected response shape");
      return res.status(200).json({
        success: true,
        data: {
          balance: null,
          currency,
          total_sms: null,
          total_amount: null,
        },
        warning:
          "Balance field not found in GeezSMS response. Check the server log.",
      });
    }

    await config.update({
      balance,
      balanceCurrency: currency,
      balanceUpdatedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      data: {
        balance,
        currency,
        total_sms: totalSms,
        total_amount: totalAmount,
      },
    });
  } catch (err) {
    return upstreamError(res, "getBalance", err, "Failed to fetch balance.");
  }
};

/* ---------------------------------------------------------
 * Webhooks
 * --------------------------------------------------------- */
const webhookAllowed = (req) => {
  const secret = process.env.SMS_WEBHOOK_SECRET;
  return !secret || req.query?.secret === secret;
};

const processWebhook = async (tag, req) => {
  const body = req.body || {};
  console.log(`[SMS][${tag}]`, body);

  const logId =
    body.api_log_id || body.apiLogId || body.log_id || body.id || null;
  const newStatus = body.status || body.state || "updated";

  if (logId) {
    const [updated] = await SmsSyncStatus.update(
      {
        status: String(newStatus),
        providerResponse: body,
        lastSyncedAt: new Date(),
      },
      { where: { providerLogId: String(logId) } },
    );
    if (!updated) {
      console.warn(
        `[SMS][${tag}] no SmsSyncStatus row matched providerLogId`,
        logId,
      );
    }
  }
};

const handleCallback = async (req, res) => {
  if (!webhookAllowed(req)) return res.status(401).json({ success: false });
  try {
    await processWebhook("callback", req);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[SMS][callback]", err);
    return res.status(200).json({ success: false });
  }
};

const handleNotify = async (req, res) => {
  if (!webhookAllowed(req)) return res.status(401).json({ success: false });
  try {
    await processWebhook("notify", req);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[SMS][notify]", err);
    return res.status(200).json({ success: false });
  }
};

/* ---------------------------------------------------------
 * GET /api/sms/logs
 * --------------------------------------------------------- */
const getlogs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query?.limit, 10) || 100, 500);
    const offset = Math.max(parseInt(req.query?.offset, 10) || 0, 0);

    const { rows, count } = await SmsSyncStatus.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      success: true,
      total: count,
      limit,
      offset,
      data: rows,
    });
  } catch (err) {
    console.error("[SMS][getlogs]", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load SMS logs." });
  }
};

module.exports = {
  getConfig,
  updateConfig,
  sendTest,
  sendSms,
  sendBulkSms,
  sendOtp,
  getBalance,
  handleCallback,
  handleNotify,
  getlogs,
};
