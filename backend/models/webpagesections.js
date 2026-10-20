module.exports = (sequelize, DataTypes) => {
  const WebPageSections = sequelize.define(
    "WebPageSections",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      pageId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "WebPages",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sectionName: {
        type: DataTypes.STRING,
        allowNull: false,
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

  WebPageSections.associate = (models) => {
    WebPageSections.belongsTo(models.WebPages, {
      foreignKey: "pageId",
      as: "page",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });

    WebPageSections.hasMany(models.WebContents, {
      foreignKey: "sectionId",
      as: "contents",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return WebPageSections;
};
