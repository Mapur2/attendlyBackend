const express = require('express');
const { createDepartment, listDepartments, addYear, listYears, addSubject, listSubjects, getCampuses, listStudents, assignStudentYear } = require('../controller/academic.controller');
const authMiddleware = require('../middleware/authLayer');
const licenseAuth = require('../middleware/licenseLayer');

const router = express.Router();

/**
 * @swagger
 * /academic/departments:
 *   post:
 *     summary: Create a new department
 *     description: Creates a new academic department within a campus. Admin only.
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDepartment'
 *     responses:
 *       201:
 *         description: Department created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/departments', authMiddleware, licenseAuth(["admin"]), createDepartment);

/**
 * @swagger
 * /academic/departments:
 *   get:
 *     summary: List all departments
 *     description: Retrieves all departments for the authenticated user's institution
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: campusId
 *         schema:
 *           type: integer
 *         description: Filter by campus ID
 *         example: 1
 *     responses:
 *       200:
 *         description: List of departments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Computer Science
 *                       campusId:
 *                         type: integer
 *                         example: 1
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/departments', authMiddleware, licenseAuth(["admin", "teacher", "student"]), listDepartments);

/**
 * @swagger
 * /academic/years:
 *   post:
 *     summary: Add a new academic year
 *     description: Creates a new year level within a department. Admin only.
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddYear'
 *     responses:
 *       201:
 *         description: Year added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/years', authMiddleware, licenseAuth(["admin"]), addYear);

/**
 * @swagger
 * /academic/years:
 *   get:
 *     summary: List all academic years
 *     description: Retrieves all year levels for the authenticated user's institution
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: integer
 *         description: Filter by department ID
 *         example: 1
 *     responses:
 *       200:
 *         description: List of years
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       year:
 *                         type: string
 *                         example: First Year
 *                       departmentId:
 *                         type: integer
 *                         example: 1
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/years', authMiddleware, licenseAuth(["admin", "teacher", "student"]), listYears);

/**
 * @swagger
 * /academic/subjects:
 *   post:
 *     summary: Add a new subject
 *     description: Creates a new subject within a year. Admin only.
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddSubject'
 *     responses:
 *       201:
 *         description: Subject added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/subjects', authMiddleware, licenseAuth(["admin"]), addSubject);

/**
 * @swagger
 * /academic/subjects:
 *   get:
 *     summary: List all subjects
 *     description: Retrieves all subjects for the authenticated user's institution
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: yearId
 *         schema:
 *           type: integer
 *         description: Filter by year ID
 *         example: 1
 *     responses:
 *       200:
 *         description: List of subjects
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Data Structures
 *                       code:
 *                         type: string
 *                         example: CS201
 *                       yearId:
 *                         type: integer
 *                         example: 1
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/subjects', authMiddleware, licenseAuth(["admin", "teacher", "student"]), listSubjects);

/**
 * @swagger
 * /academic/campuses:
 *   get:
 *     summary: List all campuses
 *     description: Retrieves all campuses for the authenticated user's institution
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of campuses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: Main Campus
 *                       location:
 *                         type: string
 *                         example: Mumbai
 *                       institutionId:
 *                         type: integer
 *                         example: 1
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/campuses', authMiddleware, licenseAuth(["admin", "teacher", "student"]), getCampuses);

/**
 * @swagger
 * /academic/students:
 *   get:
 *     summary: List all students in a year / department
 *     description: Returns all students (role=student) scoped to the caller's institution. Filter by yearId and/or departmentId. Supports pagination.
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: yearId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the year to filter by
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the department to filter by
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated list of students
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     students:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           collegeCode:
 *                             type: string
 *                           isOnboarded:
 *                             type: boolean
 *                           year:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                           department:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               departmentCode:
 *                                 type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       400:
 *         description: yearId or departmentId required
 *       401:
 *         description: Unauthorized
 */
router.get('/students', authMiddleware, licenseAuth(["admin", "teacher"]), listStudents);

/**
 * @swagger
 * /academic/students/{userId}/assign:
 *   patch:
 *     summary: Assign a student to a year and department
 *     description: Sets (or updates) the yearId and departmentId on a student's account. Admin only.
 *     tags: [Academic]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the student user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - yearId
 *               - departmentId
 *             properties:
 *               yearId:
 *                 type: string
 *                 format: uuid
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Student assigned successfully
 *       400:
 *         description: Missing yearId or departmentId
 *       403:
 *         description: Admin only
 *       404:
 *         description: Student, year, or department not found
 */
router.patch('/students/:userId/assign', authMiddleware, licenseAuth(["admin"]), assignStudentYear);

module.exports = router;


