module.exports = (sequelize, DataTypes) => {
  const SecPermission = sequelize.define("SecPermission", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ActionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    moduleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  SecPermission.associate = (models) => {
    SecPermission.belongsTo(models.SecPermissionActions, {
      foreignKey: "ActionId",
      as: "action",
    });

    SecPermission.belongsTo(models.Modules, {
      foreignKey: "moduleId",
      as: "module",
    });

    // This was missing: the other side of Role <-> Permission
    SecPermission.belongsToMany(models.SecRole, {
      through: models.SecRolePermission,
      foreignKey: "permissionId",
      otherKey: "roleId",
      as: "roles",
    });
  };

  return SecPermission;
};
