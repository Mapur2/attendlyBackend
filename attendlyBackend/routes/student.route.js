const express = require('express');
const upload = require('../middleware/multer');
const { studentVerifyFace, joinClassSession } = require('../controller/student.controller.js');
const licenseAuth = require('../middleware/licenseLayer');
const authMiddleware = require('../middleware/authLayer');

const router = express.Router();

/**
 * @swagger
 * /student/verify-face:
 *   post:
 *     summary: Verify student's face for attendance
 *     description: Uploads student's face image for verification against registered face. Requires authentication and active license.
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Face image file (JPEG, PNG)
 *     responses:
 *       200:
 *         description: Face verification successful
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
 *                     verified:
 *                       type: boolean
 *                       example: true
 *                     confidence:
 *                       type: number
 *                       example: 0.95
 *                     message:
 *                       type: string
 *                       example: Face verified successfully
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request - No image uploaded or verification failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       403:
 *         description: Forbidden - No active license
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route("/verify-face").post(authMiddleware, licenseAuth(["student", "admin", "teacher"]), upload.single("image"), studentVerifyFace);

/**
 * @swagger
 * /student/join-class:
 *   post:
 *     summary: Join an active class session
 *     description: Allows student to join a class session by providing session ID and location. Validates geolocation and WiFi.
 *     tags: [Student]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/JoinClass'
 *     responses:
 *       200:
 *         description: Successfully joined class session
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
 *                     sessionId:
 *                       type: integer
 *                       example: 1
 *                     attendanceMarked:
 *                       type: boolean
 *                       example: true
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: 2024-12-15T10:30:00Z
 *                 message:
 *                   type: string
 *                   example: Attendance marked successfully
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request - Invalid session or location
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
 *         description: Forbidden - Not in campus range or invalid WiFi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Session not found or not active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route("/join-class").post(authMiddleware, licenseAuth(["student", "admin", "teacher"]), joinClassSession);

module.exports = router;