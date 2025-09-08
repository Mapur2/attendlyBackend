const { DataTypes } = require("sequelize");

const createUserModel = (sequelize) => {
  const User = sequelize.define(
    "User",
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
      emailVerified:{
        type:DataTypes.BOOLEAN,
        default:false
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("student", "faculty", "admin"),
        defaultValue: "student",
      },
      institutionId: {
        type: DataTypes.UUID,
        references: {
          model: "Institutions", 
          key: "id",
        },
      },
      collegeCode: {
        type: DataTypes.STRING,
      },
      phone: {
        type: DataTypes.STRING,
      },
      isOnboarded:{
        type:DataTypes.BOOLEAN,
        defaultValue:false
      }
    },
    {
      timestamps: true,
      tableName: "Users",
    }
  );

  return User;
};

module.exports = createUserModel;