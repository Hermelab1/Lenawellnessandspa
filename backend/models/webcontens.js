module.exports = (sequelize, DataTypes) => {
  const WebContents = sequelize.define(
    "WebContents",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sectionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "WebPageSections",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      contentType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      contentImages: {
        type: DataTypes.JSON,
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

  WebContents.associate = (models) => {
    WebContents.belongsTo(models.WebPageSections, {
      foreignKey: "sectionId",
      as: "section",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  };

  return WebContents;
};
