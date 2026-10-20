require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initSequelize, getMssqlPool } = require("./config/db");
const db = require("./models");
const syncService = require("./services/syncService");

const app = express();

/* ---------- CORS ---------- */
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.options(/.*/, cors());

/* ---------- Body parsers ---------- */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/", (req, res) =>
  res.json({ success: true, message: "Lena Wellness API is running" }),
);

/* ---------- Mount routes (called AFTER models are initialized) ---------- */
function mountRoutes() {
  // These requires must happen here, not at the top of the file,
  // because they pull in controllers/middleware that read db models.
  const makeMemberRoutes = require("./routes/membershiproute");

  app.use("/api/auth", require("./routes/authRoutes"));
  app.use("/api/modules", require("./routes/moduleroute"));
  app.use("/api", require("./routes/webroute"));
  app.use("/api", require("./routes/securityroute"));
  app.use("/api", makeMemberRoutes(db));

  /* ---------- Error handler (must be LAST) ---------- */
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ success: false, message: err.message });
  });
}

/* ---------- Startup ---------- */
const startServer = async () => {
  try {
    const sequelize = await initSequelize();
    await sequelize.authenticate();
    console.log("✅ MySQL database connected");

    db.initModels(sequelize);
    console.log("🔍 db keys =", Object.keys(db));

    syncService.bindModels(db);

    await sequelize.sync({ force: false, alter: false });
    console.log("✅ Models synchronized");

    // Seed security data
    try {
      console.log("⏳ Seeding security data...");
      const seedSecurityData = require("./models/seeddata/moduleseed");
      await seedSecurityData();
      console.log("✅ Security data seeded");
    } catch (e) {
      console.error("❌ Security seeding failed:", e.message);
      console.error(e.stack);
    }

    // Models are ready, so it is now safe to load routes
    mountRoutes();

    await getMssqlPool();

    try {
      const r = await syncService.pullMembers();
      console.log(`✅ Initial sync done: pulled=${r.pulled}`);
    } catch (e) {
      console.error("❌ Initial sync failed:", e.message);
    }

    const SYNC_INTERVAL = Number(process.env.SYNC_INTERVAL_MS) || 60000;
    let running = false;
    setInterval(async () => {
      if (running) return;
      running = true;
      try {
        const r = await syncService.pullMembers();
        if (r.pulled > 0)
          console.log(`🔁 Auto-sync: pulled ${r.pulled} new member(s)`);
      } catch (e) {
        console.error("Auto-pull failed:", e.message);
      } finally {
        running = false;
      }
    }, SYNC_INTERVAL);

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server");
    console.error(error);
    process.exit(1);
  }
};

startServer();
