const { DataTypes } = require("sequelize");

const createSubjectModel = (sequelize) => {
  const Subject = sequelize.define(
    "Subject",
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
      code: {
        type: DataTypes.STRING(15), 
        allowNull: false,
        unique: true,
      },
      yearId: {
        type: DataTypes.UUID,
        references: {
          model: "Years",
          key: "id",
        },
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
      tableName: "Subjects",
    }
  );

  return Subject;
};

module.exports = createSubjectModel;
