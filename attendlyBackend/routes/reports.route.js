const express = require('express');
const router = express.Router();
const { getAttendanceCsv, getAttendanceStats, getStudentAttendance } = require('../controller/reports.controller');
const authLayer = require('../middleware/authLayer');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Analytics and Reporting APIs
 */

/**
 * @swagger
 * /reports/attendance/csv:
 *   get:
 *     summary: Download attendance report as CSV
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: string
 *         description: Filter by Session ID
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *         description: Filter by Subject ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/attendance/csv', authLayer, getAttendanceCsv);

/**
 * @swagger
 * /reports/attendance/stats:
 *   get:
 *     summary: Get daily attendance statistics for charts
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Successfully retrieved stats
 */
router.get('/attendance/stats', authLayer, getAttendanceStats);

/**
 * @swagger
 * /reports/student/{id}:
 *   get:
 *     summary: Get attendance history for a specific student
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Successfully retrieved student history
 */
router.get('/student/:id', authLayer, getStudentAttendance);

module.exports = router;
