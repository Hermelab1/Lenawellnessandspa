const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// Load backend/.env explicitly (path relative to THIS file, not to where node was started)
const ENV_PATH = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: ENV_PATH });

const ALGO = "aes-256-gcm";

function getKey() {
  // tolerate quotes / spaces around the value
  const raw = (process.env.SMS_ENC_KEY || "")
    .trim()
    .replace(/^["']|["']$/g, "");

  if (!raw) {
    throw new Error(
      `SMS_ENC_KEY is empty. Looked for .env at: ${ENV_PATH} (file exists: ${fs.existsSync(ENV_PATH)}). ` +
        `Add the line SMS_ENC_KEY=<64 hex chars> and restart the server.`,
    );
  }
  if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
    throw new Error(
      `SMS_ENC_KEY is set but invalid: length=${raw.length}, expected 64 hex characters (0-9, a-f only).`,
    );
  }
  return Buffer.from(raw, "hex");
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([
    cipher.update(String(plain), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(payload) {
  const buf = Buffer.from(String(payload), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    "utf8",
  );
}

module.exports = { encrypt, decrypt };
