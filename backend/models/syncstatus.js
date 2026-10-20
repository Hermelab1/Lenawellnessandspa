module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "SyncState",
    {
      key: { type: DataTypes.STRING(80), primaryKey: true, allowNull: false },
      value: { type: DataTypes.STRING(200), allowNull: true },
    },
    { tableName: "sync_state", timestamps: true },
  );
};
