module.exports = (sequelize, DataTypes) => {
  const SmsContent = sequelize.define(
    "SmsContent",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      holidayId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      message: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "smscontent",
      timestamps: true,
    },
  );
  return SmsContent;
};
