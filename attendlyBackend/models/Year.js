const { DataTypes } = require("sequelize");

const createYearModel = (sequelize) => {
  const Year = sequelize.define(
    "Year",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.ENUM("First", "Second", "Third", "Fourth","Fifth"), 
        allowNull: false,
      },
      departmentId: {
        type: DataTypes.UUID,
        references: {
          model: "Departments",
          key: "id",
        },
        allowNull: false,
      },
    },
    {
      timestamps: true,
      tableName: "Years",
    }
  );

  return Year;
};

module.exports = createYearModel;
