const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authLayer');
const { startClass, getSessionQR, getLiveAttendance, streamLiveAttendance } = require('../controller/teacher.controller');
const licenseAuth = require('../middleware/licenseLayer');

/**
 * @swagger
 * /teacher/start-class:
 *   post:
 *     summary: Start a new class session
 *     description: Creates a new class session for attendance tracking. Generates session ID and QR code.
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StartClass'
 *     responses:
 *       201:
 *         description: Class session started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessionId:
 *                       type: integer
 *                       example: 1
 *                     subjectId:
 *                       type: integer
 *                       example: 1
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-12-15T10:00:00Z
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-12-15T11:00:00Z
 *                     qrCode:
 *                       type: string
 *                       description: Base64 encoded QR code image
 *                 message:
 *                   type: string
 *                   example: Class session started successfully
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request - Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.post('/start-class', authMiddleware, startClass);

/**
 * @swagger
 * /teacher/session/{id}/qr:
 *   get:
 *     summary: Get QR code for a class session
 *     description: Retrieves the QR code for students to scan and join the class session
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Session ID
 *         example: 1
 *     responses:
 *       200:
 *         description: QR code retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: string
 *                       description: Base64 encoded QR code image
 *                     sessionId:
 *                       type: integer
 *                       example: 1
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - Teacher role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Session not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/session/:id/qr', authMiddleware, licenseAuth(["teacher"]), getSessionQR);

/**
 * @swagger
 * /teacher/live-attendance:
 *   get:
 *     summary: Get live attendance for active sessions
 *     description: Retrieves real-time attendance data for all active class sessions
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema:
 *           type: integer
 *         description: Optional session ID to filter specific session
 *         example: 1
 *     responses:
 *       200:
 *         description: Live attendance data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           sessionId:
 *                             type: integer
 *                             example: 1
 *                           subjectName:
 *                             type: string
 *                             example: Data Structures
 *                           totalStudents:
 *                             type: integer
 *                             example: 50
 *                           presentCount:
 *                             type: integer
 *                             example: 45
 *                           absentCount:
 *                             type: integer
 *                             example: 5
 *                           attendanceList:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 studentId:
 *                                   type: integer
 *                                   example: 1
 *                                 studentName:
 *                                   type: string
 *                                   example: John Doe
 *                                 status:
 *                                   type: string
 *                                   enum: [present, absent]
 *                                   example: present
 *                                 timestamp:
 *                                   type: string
 *                                   format: date-time
 *                                   example: 2024-12-15T10:15:00Z
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - Teacher or admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/live-attendance', authMiddleware, licenseAuth(["teacher", "admin"]), getLiveAttendance);

/**
 * @swagger
 * /teacher/live-attendance/stream:
 *   get:
 *     summary: Stream live attendance updates via SSE
 *     description: Establishes a Server-Sent Events connection for real-time attendance updates
 *     tags: [Teacher]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID to stream attendance for
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: SSE stream established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-Sent Events stream
 *               example: |
 *                 event: connected
 *                 data: {"sessionId":"123","count":5,"timestamp":"2024-12-16T15:25:58Z"}
 *                 
 *                 event: new_attendance
 *                 data: {"userId":"456","user":{"name":"John Doe"},"timestamp":"2024-12-16T15:26:10Z"}
 *       400:
 *         description: Bad request - sessionId required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - Not authorized for this session
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Session not found or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/live-attendance/stream', authMiddleware, licenseAuth(["teacher", "admin"]), streamLiveAttendance);

module.exports = router;
