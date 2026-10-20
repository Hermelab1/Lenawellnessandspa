// models/index.js
const fs = require("fs");
const path = require("path");
const { DataTypes, Sequelize } = require("sequelize");

const basename = path.basename(__filename);
const db = {};

let _initialized = false;

function initModels(sequelize) {
  // Idempotent — safe to call multiple times
  if (_initialized && db.sequelize === sequelize) return db;

  fs.readdirSync(__dirname)
    .filter(
      (file) =>
        file.indexOf(".") !== 0 &&
        file !== basename &&
        file.slice(-3) === ".js",
    )
    .forEach((file) => {
      const model = require(path.join(__dirname, file))(sequelize, DataTypes);
      db[model.name] = model;
    });

  // Run associations after all models are loaded
  Object.keys(db).forEach((modelName) => {
    if (db[modelName] && typeof db[modelName].associate === "function") {
      db[modelName].associate(db);
    }
  });

  db.sequelize = sequelize;
  db.Sequelize = Sequelize;
  _initialized = true;

  return db;
}

module.exports = db;
module.exports.initModels = initModels;
