require('dotenv').config();
const {Sequelize}  = require("sequelize")
const createInstitutionModel = require("../models/Institution.js")
const createUserModel = require("../models/User.js");
const createLicenseModel = require('../models/License.js');
const createDepartmentModel = require('../models/Department.js');
const createYearModel = require('../models/Year.js');
const createSubjectModel = require('../models/Subject.js');
const createCampusModel = require("../models/Campus.js")
const createIpModel = require("../models/Ip.js")

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  protocol: "postgres",
  logging: false,
});

// Initialize models
const Institution = createInstitutionModel(sequelize);
const User = createUserModel(sequelize);
const License = createLicenseModel(sequelize);
const Department = createDepartmentModel(sequelize)
const Year = createYearModel(sequelize)
const Subject = createSubjectModel(sequelize)
const Campus = createCampusModel(sequelize)
const Ip = createIpModel(sequelize)

// Associations
Institution.hasMany(License, { foreignKey: "institutionId" });
License.belongsTo(Institution, { foreignKey: "institutionId" });
Institution.hasMany(User, { foreignKey: "institutionId" });
User.belongsTo(Institution, { foreignKey: "institutionId" });
Institution.hasMany(Department, { foreignKey: "institutionId" });
Department.belongsTo(Institution, { foreignKey: "institutionId" });

Campus.hasMany(Department, { foreignKey: "campusId" });
Department.belongsTo(Campus, { foreignKey: "campusId" });

Department.hasMany(Year, { foreignKey: "departmentId" });
Year.belongsTo(Department, { foreignKey: "departmentId" });

Year.hasMany(Subject, { foreignKey: "yearId" });
Subject.belongsTo(Year, { foreignKey: "yearId" });

Department.hasMany(Subject, { foreignKey: "departmentId" });
Subject.belongsTo(Department, { foreignKey: "departmentId" });

Institution.hasOne(Ip, { foreignKey: "institutionId", as: "ipData" });
Ip.belongsTo(Institution, { foreignKey: "institutionId", as: "institution" });


// Function to connect and sync
const connectDb = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connected successfully");

    await sequelize.sync({ alter: true }); 
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

module.exports =  { sequelize, connectDb, Institution, User, Institution, License, Department,Year, Subject, Campus, Ip };
