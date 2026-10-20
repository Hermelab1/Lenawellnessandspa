module.exports = (sequelize, DataTypes) => {
  const SecPermissionActions = sequelize.define("SecPermissionActions", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ActionName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    permissionDescription: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  // ADD THIS ASSOCIATION
  SecPermissionActions.associate = (models) => {
    SecPermissionActions.hasMany(models.SecPermission, {
      foreignKey: "ActionId",
      as: "permissions",
    });
  };

  return SecPermissionActions;
};
