module.exports = (sequelize, DataTypes) => {
  const Secusermember = sequelize.define(
    "Secusermember",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "SecUsers",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "SecRoles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["userId", "roleId"],
        },
      ],
    },
  );

  Secusermember.associate = (models) => {
    Secusermember.belongsTo(models.SecUser, {
      foreignKey: "userId",
      as: "user",
    });

    Secusermember.belongsTo(models.SecRole, {
      foreignKey: "roleId",
      as: "role",
    });
  };

  return Secusermember;
};
