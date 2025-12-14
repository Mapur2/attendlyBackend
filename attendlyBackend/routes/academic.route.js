const express = require('express');
const { createDepartment, listDepartments, addYear, listYears, addSubject, listSubjects, getCampuses } = require('../controller/academic.controller');
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

module.exports = router;


