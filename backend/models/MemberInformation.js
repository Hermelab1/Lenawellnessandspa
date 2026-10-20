module.exports = (sequelize, DataTypes) => {
  const MemberInfo = sequelize.define(
    "MemberInfo",
    {
      Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      external_id: { type: DataTypes.INTEGER, unique: true, allowNull: true },

      Name: { type: DataTypes.STRING(300) },
      Gender: { type: DataTypes.INTEGER },
      Nationality: { type: DataTypes.STRING(100) },
      TIN: { type: DataTypes.STRING(100) },
      IDNo: { type: DataTypes.STRING(100) },
      IdentificationType: { type: DataTypes.STRING(100) },
      Profession: { type: DataTypes.STRING(200) },
      Mobile: { type: DataTypes.STRING(100) },
      HomeTelephone: { type: DataTypes.STRING(100) },
      WorkTelephone: { type: DataTypes.STRING(100) },
      Fax: { type: DataTypes.STRING(100) },
      POBox: { type: DataTypes.STRING(100) },
      Email: { type: DataTypes.STRING(200) },
      AddressStreet1: { type: DataTypes.STRING(300) },
      AddressStreet2: { type: DataTypes.STRING(300) },
      Country: { type: DataTypes.STRING(100) },
      Region: { type: DataTypes.STRING(100) },
      City: { type: DataTypes.STRING(100) },
      Subcity: { type: DataTypes.STRING(100) },
      Woreda: { type: DataTypes.STRING(100) },
      DateOfBirth: { type: DataTypes.DATE },
      Picture: { type: DataTypes.BLOB("long") },
      QRCode: { type: DataTypes.BLOB("long") },
      Signature: { type: DataTypes.BLOB("long") },

      mssql_updated_at: { type: DataTypes.DATE, allowNull: true },
      synced_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      tableName: "memberinformation",
      timestamps: false,
      indexes: [{ unique: true, fields: ["external_id"] }],
    },
  );

  MemberInfo.associate = (models) => {
    if (models.MembershipDetail) {
      MemberInfo.hasMany(models.MembershipDetail, {
        foreignKey: "MemberId",
        sourceKey: "external_id",
        as: "memberships",
      });
    }
  };

  return MemberInfo;
};
