module.exports = (sequelize, DataTypes) => {
  const Reservation = sequelize.define(
    "Reservation",
    {
      Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

      // which page the booking came from
      type: {
        type: DataTypes.ENUM("spa", "beauty"),
        allowNull: false,
      },

      // customer
      name: { type: DataTypes.STRING(120), allowNull: false },
      email: { type: DataTypes.STRING(160), allowNull: false },
      phone: { type: DataTypes.STRING(40), allowNull: false },

      // schedule
      date: { type: DataTypes.DATEONLY, allowNull: false },
      time: { type: DataTypes.TIME, allowNull: false },
      hours: { type: DataTypes.INTEGER, allowNull: true }, // spa only

      // what was booked (treatment / service / package title)
      serviceName: { type: DataTypes.STRING(160), allowNull: true },

      // "form" = main reservation form, "package" = spa package popup, "service" = beauty popup
      source: {
        type: DataTypes.ENUM("form", "package", "service"),
        allowNull: false,
        defaultValue: "form",
      },

      // selected therapist (spa) / expert (beauty) - taken from the CMS content
      staffId: { type: DataTypes.INTEGER, allowNull: true },
      staffName: { type: DataTypes.STRING(160), allowNull: true },

      message: { type: DataTypes.TEXT, allowNull: true },

      status: {
        type: DataTypes.ENUM("pending", "confirmed", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },

      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "Reservations",
      timestamps: true, // createdAt, updatedAt
      indexes: [
        { fields: ["type"] },
        { fields: ["date"] },
        { fields: ["status"] },
        { fields: ["staffId", "date", "time"] },
      ],
    },
  );

  return Reservation;
};
