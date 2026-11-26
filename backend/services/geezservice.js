const axios = require("axios");

const BASE_URL = "https://api.geezsms.com/api/v1";
const TIMEOUT = 15000;
const formHeaders = { "Content-Type": "application/x-www-form-urlencoded" };

/** Retry on network errors, 5xx and 429 only. 4xx (bad token / phone) fails the same way again. */
async function withRetry(fn, { retries = 0, delayMs = 800 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const retryable = !status || status >= 500 || status === 429;
      if (!retryable || attempt === retries) break;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw lastErr;
}

/** POST /sms/send (form: token, phone, msg, shortcode_id?, callback?) */
async function sendSms({ token, phone, msg, shortcodeId, callback }) {
  const body = new URLSearchParams();
  body.append("token", token);
  body.append("phone", phone);
  body.append("msg", msg);
  if (shortcodeId) body.append("shortcode_id", shortcodeId);
  if (callback) body.append("callback", callback);

  const { data } = await axios.post(`${BASE_URL}/sms/send`, body, {
    timeout: TIMEOUT,
    headers: formHeaders,
  });
  return data;
}

/** POST /sms/send/bulk (JSON) */
async function sendBulkSms({ token, contacts, senderId, msg, notifyUrl }) {
  const payload = { token, contacts, msg };
  if (senderId) payload.sender_id = senderId;
  if (notifyUrl) payload.notify_url = notifyUrl;

  const { data } = await axios.post(`${BASE_URL}/sms/send/bulk`, payload, {
    timeout: TIMEOUT,
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

/** POST /sms/otp (form: token, phone, shortcode_id?) */
async function sendOtp({ token, phone, shortcodeId }) {
  const body = new URLSearchParams();
  body.append("token", token);
  body.append("phone", phone);
  if (shortcodeId) body.append("shortcode_id", shortcodeId);

  const { data } = await axios.post(`${BASE_URL}/sms/otp`, body, {
    timeout: TIMEOUT,
    headers: formHeaders,
  });
  return data;
}

/** GET /balance (token, billing_id?) */
async function getBalance({ token, billingId }) {
  const { data } = await axios.get(`${BASE_URL}/balance`, {
    timeout: TIMEOUT,
    params: { token, ...(billingId ? { billing_id: billingId } : {}) },
  });
  return data;
}

module.exports = { withRetry, sendSms, sendBulkSms, sendOtp, getBalance };
