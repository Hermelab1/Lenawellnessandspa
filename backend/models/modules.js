module.exports = (sequelize, DataTypes) => {
  const Modules = sequelize.define("Modules", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    moduleName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    submodule: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    moduleDescription: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  Modules.associate = (models) => {
    Modules.hasMany(models.SecPermission, {
      foreignKey: "moduleId",
      as: "permissions",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return Modules;
};
