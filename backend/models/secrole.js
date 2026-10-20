module.exports = (sequelize, DataTypes) => {
  const SecRole = sequelize.define(
    "SecRole",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      RoleName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      RoleDescription: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "",
      },
    },
    {
      timestamps: true,
    },
  );

  SecRole.associate = (models) => {
    // Role <-> Users (through Secusermember)
    SecRole.belongsToMany(models.SecUser, {
      through: models.Secusermember,
      foreignKey: "roleId",
      otherKey: "userId",
      as: "users",
    });

    // Role <-> Permissions (through SecRolePermission)
    SecRole.belongsToMany(models.SecPermission, {
      through: models.SecRolePermission,
      foreignKey: "roleId",
      otherKey: "permissionId",
      as: "permissions",
    });
  };

  return SecRole;
};
