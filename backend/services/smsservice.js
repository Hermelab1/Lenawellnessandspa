const axios = require("axios");
const moment = require("moment");
const { Op } = require("sequelize");
const {
  initSequelize,
  getMssqlPool,
  sql,
} = require("./path/to/your/db-config-file"); // Adjust path to your db config file

// Initialize Sequelize instance
let sequelize;
let models = {};

// Import your models (assuming they are in a 'models' folder)
const HolidaysModel = require("./models/Holidays");
const SmsContentModel = require("./models/SmsContent");
const SmsSyncStatusModel = require("./models/SmsSyncStatus");

// Configuration
const ESMS_API_URL = "https://sms.esmsafrica.io/api/v3/sms/send"; // Standard eSMS endpoint
const ESMS_API_KEY = process.env.ESMS_API_KEY;
const ESMS_SENDER_ID = process.env.ESMS_SENDER_ID || "Lenawallness"; // Default sender ID

/**
 * Initialize Database and Models
 */
async function initialize() {
  if (!sequelize) {
    sequelize = await initSequelize();

    // Initialize Sequelize Models
    models.Holidays = HolidaysModel(sequelize, require("sequelize").DataTypes);
    models.SmsContent = SmsContentModel(
      sequelize,
      require("sequelize").DataTypes,
    );
    models.SmsSyncStatus = SmsSyncStatusModel(
      sequelize,
      require("sequelize").DataTypes,
    );

    // Sync models (optional, only if you want to create tables automatically)
    // await sequelize.sync({ alter: true });
  }
  return sequelize;
}

/**
 * Helper: Send SMS via eSMS Africa
 */
async function sendSms(recipient, message) {
  try {
    // Sanitize phone number (remove dashes, spaces, ensure country code)
    // Assuming input like +251-929085641 -> 251929085641
    let cleanPhone = recipient.replace(/[^0-9]/g, "");

    // eSMS usually expects format without '+' but with country code (e.g., 251...)
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "251" + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith("+")) {
      cleanPhone = cleanPhone.substring(1);
    }

    const response = await axios.post(
      ESMS_API_URL,
      {
        recipient: cleanPhone,
        sender_id: ESMS_SENDER_ID,
        type: "plain",
        message: message,
      },
      {
        headers: {
          Authorization: `Bearer ${ESMS_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    console.log(`✅ SMS sent to ${cleanPhone}: ${response.data.status}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(
      `❌ Failed to send SMS to ${recipient}:`,
      error.response ? error.response.data : error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * 1. Holiday Greeting Logic
 * Checks for holidays today and sends messages to all members.
 */
async function processHolidayGreetings() {
  const today = moment().format("YYYY-MM-DD");
  console.log(`Checking for holidays on: ${today}`);

  try {
    // Find holiday happening today
    const holiday = await models.Holidays.findOne({
      where: sequelize.where(
        sequelize.fn("DATE", sequelize.col("date")),
        today,
      ),
    });

    if (!holiday) {
      console.log("No holiday today.");
      return;
    }

    console.log(`Found Holiday: ${holiday.name}`);

    // Get the custom message template for this holiday
    const contentRecord = await models.SmsContent.findOne({
      where: { holidayId: holiday.id },
    });

    const messageTemplate = contentRecord
      ? contentRecord.message
      : "Happy Holiday {Name}!";

    // Fetch all members from SQL Server
    const pool = await getMssqlPool();
    const result = await pool
      .request()
      .query(
        "SELECT Name, Mobile FROM lenawallness.memberinformation WHERE Mobile IS NOT NULL",
      );
    const members = result.recordset;

    console.log(`Sending holiday greetings to ${members.length} members...`);

    for (const member of members) {
      // Replace placeholders
      let msg = messageTemplate
        .replace("{Name}", member.Name || "Member")
        .replace("{content}", holiday.name);

      await sendSms(member.Mobile, msg);
    }
  } catch (error) {
    console.error("Error processing holiday greetings:", error);
  }
}

/**
 * 2. Membership Expiry & Unfreeze Logic
 * Checks for expiries in 5 days and unfreeze dates in 5 days.
 */
async function processMembershipReminders() {
  const targetDate = moment().add(5, "days").format("YYYY-MM-DD");
  console.log(`Checking for memberships expiring/unfreezing on: ${targetDate}`);

  try {
    const pool = await getMssqlPool();

    // --- A. Expiry Reminder (5 days remaining) ---
    // Query membershipdetail joined with memberinformation
    const expiryQuery = `
      SELECT m.Name, m.Mobile, md.ExpiryDate 
      FROM lenawallness.membershipdetail md
      JOIN lenawallness.memberinformation m ON md.MemberId = m.Id
      WHERE CAST(md.ExpiryDate AS DATE) = '${targetDate}'
      AND md.isActive = 1
    `;

    const expiryResult = await pool.request().query(expiryQuery);
    const expiringMembers = expiryResult.recordset;

    console.log(
      `Found ${expiringMembers.length} memberships expiring in 5 days.`,
    );

    for (const member of expiringMembers) {
      const msg = `Dear ${member.Name}, your membership expires in 5 days (${moment(member.ExpiryDate).format("YYYY-MM-DD")}). Please renew your payment to avoid interruption.`;
      await sendSms(member.Mobile, msg);
    }

    // --- B. Unfreeze Reminder (5 days remaining) ---
    const unfreezeQuery = `
      SELECT m.Name, m.Mobile, md.unfreezDate 
      FROM lenawallness.membershipdetail md
      JOIN lenawallness.memberinformation m ON md.MemberId = m.Id
      WHERE CAST(md.unfreezDate AS DATE) = '${targetDate}'
      AND md.isFreeze = 1
    `;

    const unfreezeResult = await pool.request().query(unfreezeQuery);
    const unfreezingMembers = unfreezeResult.recordset;

    console.log(
      `Found ${unfreezingMembers.length} members unfreezing in 5 days.`,
    );

    for (const member of unfreezingMembers) {
      const msg = `Dear ${member.Name}, your freeze period ends in 5 days. Get back to work!`;
      await sendSms(member.Mobile, msg);
    }
  } catch (error) {
    console.error("Error processing membership reminders:", error);
  }
}

/**
 * Main Sync Runner
 */
async function runSync() {
  await initialize();

  const syncStatus = await models.SmsSyncStatus.findOne(); // Assuming single row status or create one

  try {
    console.log("Starting SMS Sync Service...");

    // Run Logic
    await processHolidayGreetings();
    await processMembershipReminders();

    // Update Sync Status
    if (syncStatus) {
      syncStatus.status = "Success";
      syncStatus.lastSyncedAt = new Date();
      await syncStatus.save();
    } else {
      await models.SmsSyncStatus.create({
        status: "Success",
        lastSyncedAt: new Date(),
      });
    }

    console.log("SMS Sync Service Completed Successfully.");
  } catch (error) {
    console.error("SMS Sync Service Failed:", error);
    if (syncStatus) {
      syncStatus.status = "Failed";
      await syncStatus.save();
    }
  }
}

// Export for use in a cron job or controller
module.exports = {
  runSync,
  processHolidayGreetings,
  processMembershipReminders,
};

// If running directly (e.g., node syncService.js)
if (require.main === module) {
  runSync();
}
