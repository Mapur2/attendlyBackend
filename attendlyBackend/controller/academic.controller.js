const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { Department, Year, Subject, Campus, User } = require("../db/connectDb.js");

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

// Students

/**
 * GET /academic/students?yearId=&departmentId=&page=&limit=
 * Lists all students belonging to a given year and/or department.
 * Scoped to the caller's institution.
 */
const listStudents = asyncHandler(async (req, res) => {
  const { yearId, departmentId, page = 1, limit = 50 } = req.query;
  const { institutionId } = req.user;

  if (!yearId && !departmentId) {
    throw new ApiError(400, "Provide at least yearId or departmentId as a query param.");
  }

  const where = { institutionId, role: "student" };
  if (yearId)       where.yearId       = yearId;
  if (departmentId) where.departmentId = departmentId;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  const { rows: students, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ["password"] },
    include: [
      { model: Year,       as: "year",       attributes: ["id", "name"] },
      { model: Department, as: "department",  attributes: ["id", "name", "departmentCode"] },
    ],
    order: [["name", "ASC"]],
    limit:  parseInt(limit),
    offset,
  });

  return res.json(new ApiResponse(200, {
    students,
    pagination: {
      total:      count,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(count / parseInt(limit)),
    },
  }, "Students fetched"));
});

/**
 * PATCH /academic/students/:userId/assign
 * Body: { yearId, departmentId }
 * Assigns (or re-assigns) a student to a year and department.
 * Admin only.
 */
const assignStudentYear = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { yearId, departmentId } = req.body;
  const { institutionId } = req.user;

  if (!yearId || !departmentId) {
    throw new ApiError(400, "Both yearId and departmentId are required.");
  }

  // Verify the student belongs to this institution
  const student = await User.findOne({ where: { id: userId, institutionId, role: "student" } });
  if (!student) throw new ApiError(404, "Student not found in your institution.");

  // Verify yearId + departmentId actually exist
  const [year, department] = await Promise.all([
    Year.findByPk(yearId),
    Department.findByPk(departmentId),
  ]);
  if (!year)       throw new ApiError(404, "Year not found.");
  if (!department) throw new ApiError(404, "Department not found.");

  await student.update({ yearId, departmentId });

  return res.json(new ApiResponse(200, {
    userId:       student.id,
    name:         student.name,
    email:        student.email,
    yearId,
    departmentId,
    yearName:     year.name,
    departmentName: department.name,
  }, "Student assigned to year and department."));
});

module.exports = {
  getCampuses,
  createDepartment,
  listDepartments,
  addYear,
  listYears,
  addSubject,
  listSubjects,
  listStudents,
  assignStudentYear,
};


