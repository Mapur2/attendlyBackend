const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Campus = sequelize.define("Campus", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    institutionId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    coordinates: {
      type: DataTypes.JSON, 
      allowNull: false, // stores array of [lng, lat, alt]
    },
  });

  return Campus;
};
