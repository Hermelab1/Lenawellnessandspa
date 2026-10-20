const { Sequelize } = require("sequelize");
const mysql = require("mysql2/promise");
const sql = require("mssql");

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = Number(process.env.DB_PORT) || 3306;
const DB_DIALECT = process.env.DB_DIALECT || "mysql";

// ---------- MySQL (Sequelize) ----------
let sequelizeInstance = null;

async function initSequelize() {
  if (sequelizeInstance) return sequelizeInstance;

  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` 
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
  );
  console.log(`✅ MySQL database "${DB_NAME}" is ready`);
  await connection.end();

  sequelizeInstance = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: DB_DIALECT,
    logging: false,
    define: { freezeTableName: true },
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  });

  return sequelizeInstance;
}

// ---------- SQL Server (mssql) ----------
const [serverHost, instanceName] = (process.env.DB_SERVERNAME || "").split(
  "\\",
);

const mssqlConfig = {
  user: process.env.DB_USERSQL,
  password: process.env.DB_PASSWORDSQL,
  server: serverHost || "localhost",
  port: Number(process.env.DB_PORTSQL) || 1433,
  database: process.env.DB_NAMESQL || "PEDSPMS",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    instanceName: instanceName || undefined,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 15000,
  requestTimeout: 30000,
};

let mssqlPoolPromise = null;

function getMssqlPool() {
  if (!mssqlPoolPromise) {
    mssqlPoolPromise = new sql.ConnectionPool(mssqlConfig)
      .connect()
      .then((pool) => {
        console.log(`✅ Connected to SQL Server: ${mssqlConfig.database}`);
        pool.on("error", (err) => console.error("MSSQL pool error:", err));
        return pool;
      })
      .catch((err) => {
        console.error("❌ SQL Server connection failed:", err.message);
        mssqlPoolPromise = null;
        throw err;
      });
  }
  return mssqlPoolPromise;
}

module.exports = { initSequelize, getMssqlPool, sql };
