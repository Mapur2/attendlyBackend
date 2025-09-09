const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { Department, Year, Subject, Campus } = require("../db/connectDb.js");

const getCampuses = asyncHandler(async (req, res) => {
  const { institutionId } = req.query || {};
  const where = {};

  // Single institution only: prefer explicit query param, fallback to user's institution
  where.institutionId = institutionId || req.user?.institutionId;

  const campuses = await Campus.findAll({ where, attributes: { exclude: ["coordinates"] } });
  return res.json(new ApiResponse(200, { campuses }, "Campuses fetched"));
});

// Departments
const createDepartment = asyncHandler(async (req, res) => {
  const { name, departmentCode, campusId } = req?.body || {};
  if (!name || !departmentCode) throw new ApiError(400, "name and departmentCode are required");

  const department = await Department.create({
    name,
    departmentCode,
    campusId: campusId || null,
    institutionId: req.user?.institutionId || req.body?.institutionId,
  });

  return res.status(201).json(new ApiResponse(201, { department }, "Department created"));
});

const listDepartments = asyncHandler(async (req, res) => {
  const where = { institutionId: req.user?.institutionId || req.query?.institutionId };
  const departments = await Department.findAll({ where, include: [Campus] });
  return res.json(new ApiResponse(200, { departments }, "Departments fetched"));
});

// Years
const addYear = asyncHandler(async (req, res) => {
  const { departmentId, name } = req.body;
  if (!departmentId || !name) throw new ApiError(400, "departmentId and name are required");

  const year = await Year.create({ departmentId, name });
  return res.status(201).json(new ApiResponse(201, { year }, "Year added"));
});

const listYears = asyncHandler(async (req, res) => {
  const { departmentId } = req.query;
  if (!departmentId) throw new ApiError(400, "departmentId is required");
  const years = await Year.findAll({ where: { departmentId } });
  return res.json(new ApiResponse(200, { years }, "Years fetched"));
});

// Subjects
const addSubject = asyncHandler(async (req, res) => {
  const { departmentId, yearId, name, code } = req.body;
  if (!departmentId || !yearId || !name || !code) throw new ApiError(400, "departmentId, yearId, name, code are required");
  const subject = await Subject.create({ departmentId, yearId, name, code });
  return res.status(201).json(new ApiResponse(201, { subject }, "Subject added"));
});

const listSubjects = asyncHandler(async (req, res) => {
  const { departmentId, yearId } = req.query || {};
  const where = {};
  if (departmentId) where.departmentId = departmentId;
  if (yearId) where.yearId = yearId;
  const subjects = await Subject.findAll({ where });
  return res.json(new ApiResponse(200, { subjects }, "Subjects fetched"));
});

module.exports = {
  getCampuses,
  createDepartment,
  listDepartments,
  addYear,
  listYears,
  addSubject,
  listSubjects,
};


