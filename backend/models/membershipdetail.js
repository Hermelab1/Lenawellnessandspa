module.exports = (sequelize, DataTypes) => {
  const MembershipDetail = sequelize.define(
    "MembershipDetail",
    {
      Id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
        field: "Id",
      },
      MembershipNo: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "MembershipNo",
      },
      MemberId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "MemberId",
      },
      MembershipTypeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "MembershipTypeId",
      },
      ServiceTypeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "ServiceTypeId",
      },
      RegistryDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "RegistryDate",
      },
      ExpiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: "ExpiryDate",
      },
      freezDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "freezDate",
      },
      unfreezDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "unfreezDate",
      },
      freezeCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "freezeCount",
      },
      isFreeze: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: "isFreeze",
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: "isActive",
        defaultValue: true,
      },
      Status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "Status",
        defaultValue: 0,
      },
    },
    {
      tableName: "MembershipDetail",
      timestamps: false,
      indexes: [
        { fields: ["MemberId"] },
        { fields: ["MemberId", "RegistryDate"] },
        { fields: ["MembershipTypeId"] },
        { fields: ["ServiceTypeId"] },
      ],
    },
  );

  MembershipDetail.associate = (models) => {
    MembershipDetail.belongsTo(models.MemberInfo, {
      foreignKey: "MemberId",
      targetKey: "external_id",
      as: "memberInfo",
    });

    if (models.MembershipType) {
      MembershipDetail.belongsTo(models.MembershipType, {
        foreignKey: "MembershipTypeId",
        targetKey: "Id",
        as: "membershipType",
      });
    }

    if (models.ServiceType) {
      MembershipDetail.belongsTo(models.ServiceType, {
        foreignKey: "ServiceTypeId",
        targetKey: "Id",
        as: "serviceType",
      });
    }
  };

  return MembershipDetail;
};
