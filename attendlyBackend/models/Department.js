const { DataTypes } = require("sequelize");

const createDepartmentModel = (sequelize) => {
  const Department = sequelize.define(
    "Department",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      departmentCode: {
        type: DataTypes.STRING(10), 
        allowNull: false,
        unique: true,
      },
      institutionId: {
        type: DataTypes.UUID,
        references: {
          model: "Institutions",
          key: "id",
        },
        allowNull: false,
      },
    },
    {
      timestamps: true,
      tableName: "Departments",
    }
  );

  return Department;
};

module.exports = createDepartmentModel;
