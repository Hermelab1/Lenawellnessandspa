module.exports = (sequelize, DataTypes) => {
  const ServiceType = sequelize.define(
    "ServiceType",
    {
      Id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "Id",
      },
      Name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        field: "Name",
      },
      Description: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: "Description",
      },
      IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: "IsActive",
      },
    },
    {
      tableName: "ServiceType",
      timestamps: false,
    },
  );

  ServiceType.associate = (models) => {
    ServiceType.hasMany(models.MembershipDetail, {
      foreignKey: "ServiceTypeId",
      sourceKey: "Id",
      as: "memberships",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  };

  return ServiceType;
};
