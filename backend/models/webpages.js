module.exports = (sequelize, DataTypes) => {
  const WebPages = sequelize.define(
    "WebPages",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      pageName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      subPageName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pageDescription: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      timestamps: true,
    },
  );

  WebPages.associate = (models) => {
    WebPages.hasMany(models.WebPageSections, {
      foreignKey: "pageId",
      as: "sections",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return WebPages;
};
