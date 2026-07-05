const express = require('express');
const router = express.Router();
const { getAttendanceCsv, getAttendanceStats, getStudentAttendance, getDeptYearDailyAttendance, getSubjectDayAttendees, getDeptYearSubjectDailyAttendance } = require('../controller/reports.controller');
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

/**
 * @swagger
 * /reports/student:
 *   get:
 *     summary: Get attendance history for a specific student (must be logged in as student)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved student history
 */
router.get('/student', authLayer, getStudentAttendance);

/**
 * @swagger
 * /reports/dept-year-daily:
 *   get:
 *     summary: Department → Year → Day-wise attendance report
 *     description: |
 *       Returns a hierarchical report of attendance broken down by:
 *       **Department → Year → Date**.
 *       Each day entry includes present count, absent count, total enrolled students,
 *       and attendance rate (%). Defaults to the last 30 days if no date range is given.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-01"
 *         description: Start of date range (YYYY-MM-DD). Defaults to 30 days ago.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-06-30"
 *         description: End of date range (YYYY-MM-DD). Defaults to today.
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter to a single department UUID (optional).
 *     responses:
 *       200:
 *         description: Hierarchical attendance report
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
 *                     meta:
 *                       type: object
 *                       properties:
 *                         from:
 *                           type: string
 *                           example: "2025-06-01"
 *                         to:
 *                           type: string
 *                           example: "2025-06-30"
 *                         totalDays:
 *                           type: integer
 *                         dates:
 *                           type: array
 *                           items:
 *                             type: string
 *                     report:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           department:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               code:
 *                                 type: string
 *                           years:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 year:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                     name:
 *                                       type: string
 *                                 totalStudents:
 *                                   type: integer
 *                                 averageAttendanceRate:
 *                                   type: number
 *                                 days:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       date:
 *                                         type: string
 *                                       present:
 *                                         type: integer
 *                                       absent:
 *                                         type: integer
 *                                       total:
 *                                         type: integer
 *                                       attendanceRate:
 *                                         type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/dept-year-daily', authLayer, getDeptYearDailyAttendance);

/**
 * @swagger
 * /reports/subject-day-attendees:
 *   get:
 *     summary: List all attendees for a subject on a specific date
 *     description: Returns every unique student who marked attendance for a given subject on a given date. De-duplicated by student — only the earliest check-in per student is kept.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "769b1040-55ae-4f04-b469-05119fe0bcbd"
 *         description: UUID of the subject
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-09-10"
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: List of attendees
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
 *                     subject:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         code:
 *                           type: string
 *                     date:
 *                       type: string
 *                       example: "2025-09-10"
 *                     totalPresent:
 *                       type: integer
 *                     attendees:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank:
 *                             type: integer
 *                           attendanceId:
 *                             type: string
 *                           sessionId:
 *                             type: string
 *                           checkedInAt:
 *                             type: string
 *                             format: date-time
 *                           ip:
 *                             type: string
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
 *                           student:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *                               collegeCode:
 *                                 type: string
 *                               isOnboarded:
 *                                 type: boolean
 *                               yearId:
 *                                 type: string
 *                               departmentId:
 *                                 type: string
 *       400:
 *         description: Missing or invalid subjectId / date
 *       404:
 *         description: Subject not found
 */
router.get('/subject-day-attendees', authLayer, getSubjectDayAttendees);

/**
 * @swagger
 * /reports/dept-year-subject-daily:
 *   get:
 *     summary: Get day-wise subject attendance grouped by Department and Year
 *     description: |
 *       Returns a hierarchical report broken down by Department -> Year -> Subject -> Date.
 *       Includes daily present/absent stats and attendance rate per subject.
 *       Defaults to last 30 days.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by department ID
 *     responses:
 *       200:
 *         description: Hierarchical subject report
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
 *                     meta:
 *                       type: object
 *                       properties:
 *                         from:
 *                           type: string
 *                         to:
 *                           type: string
 *                         totalDays:
 *                           type: integer
 *                         dates:
 *                           type: array
 *                           items:
 *                             type: string
 *                     report:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           department:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               code:
 *                                 type: string
 *                           years:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 year:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                     name:
 *                                       type: string
 *                                 totalStudents:
 *                                   type: integer
 *                                 subjects:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       subject:
 *                                         type: object
 *                                         properties:
 *                                           id:
 *                                             type: string
 *                                           name:
 *                                             type: string
 *                                           code:
 *                                             type: string
 *                                       averageAttendanceRate:
 *                                         type: number
 *                                       days:
 *                                         type: array
 *                                         items:
 *                                           type: object
 *                                           properties:
 *                                             date:
 *                                               type: string
 *                                             present:
 *                                               type: integer
 *                                             absent:
 *                                               type: integer
 *                                             total:
 *                                               type: integer
 *                                             attendanceRate:
 *                                               type: number
 *                                             studentsPresent:
 *                                               type: array
 *                                               items:
 *                                                 type: object
 *                                                 properties:
 *                                                   id:
 *                                                     type: string
 *                                                   name:
 *                                                     type: string
 *                                                   email:
 *                                                     type: string
 *                                                   phone:
 *                                                     type: string
 *                                                   collegeCode:
 *                                                     type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/dept-year-subject-daily', authLayer, getDeptYearSubjectDailyAttendance);

module.exports = router;
