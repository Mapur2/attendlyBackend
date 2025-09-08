const { DataTypes } = require("sequelize");

const createInstitutionModel = (sequelize) => {
  const Institution = sequelize.define(
    "Institution",
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
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
      },  
      code: {
        type: DataTypes.STRING(6),
        allowNull: false,
        unique: true,
      },
      numberOfCampus:{
        type:DataTypes.INTEGER
      },
      isDetailsComplete:{
        type:DataTypes.BOOLEAN,
        defaultValue:false
      }
    },
    {
      timestamps: true,
      tableName: "Institutions",
    }
  );

  return Institution;
};

module.exports = createInstitutionModel;
