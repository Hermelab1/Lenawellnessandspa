module.exports = (sequelize, DataTypes) => {
  const SmsSyncStatus = sequelize.define(
    "SmsSyncStatus",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "sms_sync_status", // Ensure this table exists or let Sequelize create it
      timestamps: true,
    },
  );
  return SmsSyncStatus;
};
