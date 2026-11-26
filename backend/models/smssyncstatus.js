module.exports = (sequelize, DataTypes) => {
  const SmsSyncStatus = sequelize.define(
    "SmsSyncStatus",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      Type: {
        type: DataTypes.ENUM(
          "Reservation",
          "Test",
          "Expire reminder",
          "OTP",
          "Bulk",
          "Other",
        ),
        allowNull: false,
        defaultValue: "Other",
      },
      Phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      Message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "pending",
      },
      providerLogId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      providerResponse: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      errorDetail: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lastSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "sms_sync_status",
      timestamps: true,
    },
  );
  return SmsSyncStatus;
};
