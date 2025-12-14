const express = require('express');
const upload = require('../middleware/multer');
const { readFromKml, addWifiDetails, studentFaceDetect } = require('../controller/onboard.controller');
const licenseAuth = require('../middleware/licenseLayer');
const authMiddleware = require('../middleware/authLayer');

const router = express.Router();

/**
 * @swagger
 * /onboard/upload-kml:
 *   post:
 *     summary: Upload KML file for campus boundaries
 *     description: Uploads a KML file to define campus geographical boundaries. Admin only.
 *     tags: [Onboarding]
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
 *               - kml
 *               - campusId
 *             properties:
 *               kml:
 *                 type: string
 *                 format: binary
 *                 description: KML file containing campus boundaries
 *               campusId:
 *                 type: integer
 *                 description: Campus ID to associate boundaries with
 *                 example: 1
 *     responses:
 *       200:
 *         description: KML file processed successfully
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
 *                     campusId:
 *                       type: integer
 *                       example: 1
 *                     boundaries:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           latitude:
 *                             type: number
 *                             example: 19.0760
 *                           longitude:
 *                             type: number
 *                             example: 72.8777
 *                 message:
 *                   type: string
 *                   example: Campus boundaries updated successfully
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request - Invalid KML file
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
 *         description: Forbidden - Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route("/upload-kml").post(authMiddleware, licenseAuth(["admin"]), upload.single("kml"), readFromKml);

/**
 * @swagger
 * /onboard/add-ip:
 *   post:
 *     summary: Add WiFi network details
 *     description: Configures WiFi network SSID and IP range for campus attendance verification. Admin only.
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddWifiDetails'
 *     responses:
 *       200:
 *         description: WiFi details added successfully
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
 *                     ssid:
 *                       type: string
 *                       example: MIT-Campus-WiFi
 *                     ipRange:
 *                       type: string
 *                       example: 192.168.1.0/24
 *                     campusId:
 *                       type: integer
 *                       example: 1
 *                 message:
 *                   type: string
 *                   example: WiFi details configured successfully
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request - Invalid data
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
 *         description: Forbidden - Admin role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route("/add-ip").post(authMiddleware, licenseAuth(["admin"]), addWifiDetails);

/**
 * @swagger
 * /onboard/student/face-detect:
 *   post:
 *     summary: Register student face for attendance
 *     description: Uploads and registers student's face image for future attendance verification
 *     tags: [Onboarding]
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
 *                 description: Student face image (JPEG, PNG)
 *     responses:
 *       200:
 *         description: Face registered successfully
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
 *                     faceId:
 *                       type: string
 *                       example: FACE123456
 *                     registered:
 *                       type: boolean
 *                       example: true
 *                     imageUrl:
 *                       type: string
 *                       example: https://cloudinary.com/face/student123.jpg
 *                 message:
 *                   type: string
 *                   example: Face registered successfully
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Bad request - No face detected or invalid image
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
 *         description: Forbidden - No active license
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.route("/student/face-detect").post(authMiddleware, licenseAuth(["student", "admin", "teacher"]), upload.single("image"), studentFaceDetect);

module.exports = router;