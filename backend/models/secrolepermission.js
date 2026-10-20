module.exports = (sequelize, DataTypes) => {
  const SecRolePermission = sequelize.define(
    "SecRolePermission",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "SecRoles", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      permissionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "SecPermissions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["roleId", "permissionId"],
        },
      ],
    },
  );

  SecRolePermission.associate = (models) => {
    SecRolePermission.belongsTo(models.SecRole, {
      foreignKey: "roleId",
      as: "role",
    });
    SecRolePermission.belongsTo(models.SecPermission, {
      foreignKey: "permissionId",
      as: "permission",
    });
  };

  return SecRolePermission;
};
