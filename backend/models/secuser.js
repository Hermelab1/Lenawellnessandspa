module.exports = (sequelize, DataTypes) => {
  const SecUser = sequelize.define(
    "SecUser",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      logincode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      userfullname: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      timestamps: true,
    },
  );

  SecUser.associate = (models) => {
    SecUser.belongsToMany(models.SecRole, {
      through: models.Secusermember,
      foreignKey: "userId",
      otherKey: "roleId",
      as: "roles",
    });
  };

  return SecUser;
};
