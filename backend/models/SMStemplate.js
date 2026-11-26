// models/smstemplate.js  (factory style, same as your other models)
module.exports = (sequelize, DataTypes) => {
  const SmsTemplate = sequelize.define(
    "SmsTemplate",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      // unique slug, e.g. "welcome_sms", "otp_login"
      code: { type: DataTypes.STRING(80), allowNull: false, unique: true },
      category: {
        type: DataTypes.ENUM(
          "general",
          "otp",
          "appointment",
          "marketing",
          "alert",
        ),
        allowNull: false,
        defaultValue: "general",
      },
      // message with {{placeholders}}
      body: { type: DataTypes.TEXT, allowNull: false },
      // detected placeholder names, e.g. ["name","otp"]
      variables: { type: DataTypes.JSON, allowNull: true, defaultValue: [] },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastTestedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "smstemplates",
      timestamps: true,
    },
  );

  return SmsTemplate;
};
