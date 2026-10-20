module.exports = (sequelize, DataTypes) => {
  const Holidays = sequelize.define(
    "Holidays",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "holidays",
      timestamps: true,
    },
  );
  return Holidays;
};
