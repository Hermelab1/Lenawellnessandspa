const { encrypt, decrypt } = require("../utils/smsCrypto"); // <- path to YOUR crypto file (uses SMS_ENC_KEY)

module.exports = (sequelize, DataTypes) => {
  const SMSConfiguration = sequelize.define(
    "SMSConfiguration",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "enabled",
      },
      environment: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "sandbox",
      },

      // stores the ENCRYPTED token (never the plain one)
      apiToken: { type: DataTypes.TEXT, allowNull: true },

      shortcodeId: { type: DataTypes.STRING(100), allowNull: true },
      senderId: { type: DataTypes.STRING(100), allowNull: true },
      defaultMessage: { type: DataTypes.STRING(335), allowNull: true },
      callbackUrl: { type: DataTypes.STRING(500), allowNull: true },
      notifyUrl: { type: DataTypes.STRING(500), allowNull: true },

      otpEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      otpLength: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 6 },
      otpExpiry: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },

      retryOnFailure: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      maxRetries: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
      },

      balance: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      balanceCurrency: {
        type: DataTypes.STRING(10),
        allowNull: true,
        defaultValue: "ETB",
      },
      balanceUpdatedAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "smsconfigs",
      timestamps: true, // createdAt, updatedAt
    },
  );

  /* Encrypt and store a plain token */
  SMSConfiguration.prototype.setToken = function (plain) {
    this.apiToken = plain ? encrypt(plain) : null;
  };

  /* Decrypt for server-side use only */
  SMSConfiguration.prototype.getDecryptedToken = function () {
    const enc = this.getDataValue("apiToken");
    if (!enc) return null;
    try {
      return decrypt(enc);
    } catch (e) {
      console.error(
        "[SMS] token decrypt failed (wrong SMS_ENC_KEY or old plain-text value):",
        e.message,
      );
      return null;
    }
  };

  /* Safe for the browser: no token, only a flag */
  SMSConfiguration.prototype.toPublicJSON = function () {
    const j = this.toJSON();
    delete j.apiToken;
    j.hasToken = Boolean(this.getDataValue("apiToken"));
    j.balance =
      j.balance !== null && j.balance !== undefined ? Number(j.balance) : null;
    return j;
  };

  return SMSConfiguration;
};
