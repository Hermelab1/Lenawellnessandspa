module.exports = (sequelize, DataTypes) => {
  const MembershipType = sequelize.define(
    "MembershipType",
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
      tableName: "MembershipType",
      timestamps: false,
    },
  );

  MembershipType.associate = (models) => {
    MembershipType.hasMany(models.MembershipDetail, {
      foreignKey: "MembershipTypeId",
      sourceKey: "Id",
      as: "memberships",
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  };

  return MembershipType;
};
