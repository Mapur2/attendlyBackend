const express = require('express');

const router = express.Router();

const {
    createOrder,
    verifyPayment,
    activateLicense,
    deactivateLicense,
    getLicenseStatus,
} = require('../controller/license.controller.js');
const authMiddleware = require('../middleware/authLayer.js');
const licenseAuth = require('../middleware/licenseLayer.js');

/**
 * @swagger
 * /license/verify-payment:
 *   get:
 *     summary: Verify payment status
 *     description: Verifies payment transaction from payment gateway callback
 *     tags: [License]
 *     parameters:
 *       - in: query
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID from payment gateway
 *         example: TXN123456789
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/verify-payment', verifyPayment);

router.use(authMiddleware);

/**
 * @swagger
 * /license/buy:
 *   post:
 *     summary: Create license purchase order
 *     description: Initiates a new license purchase and returns payment gateway URL
 *     tags: [License]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrder'
 *     responses:
 *       200:
 *         description: Order created successfully
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
 *                     orderId:
 *                       type: string
 *                       example: ORDER123456
 *                     paymentUrl:
 *                       type: string
 *                       example: https://payment.gateway.com/pay?id=ORDER123456
 *                     amount:
 *                       type: number
 *                       example: 5000
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
router.post('/buy', createOrder);

/**
 * @swagger
 * /license/activate:
 *   post:
 *     summary: Activate license
 *     description: Activates a purchased license for the institution
 *     tags: [License]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - licenseKey
 *             properties:
 *               licenseKey:
 *                 type: string
 *                 example: LIC-XXXX-XXXX-XXXX
 *     responses:
 *       200:
 *         description: License activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Invalid license key
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
router.post('/activate', activateLicense);

/**
 * @swagger
 * /license/deactivate:
 *   post:
 *     summary: Deactivate license
 *     description: Deactivates the current active license
 *     tags: [License]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: License deactivated successfully
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
 */
router.post('/deactivate', deactivateLicense);

/**
 * @swagger
 * /license/status:
 *   get:
 *     summary: Get license status
 *     description: Retrieves current license status and details
 *     tags: [License]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: License status retrieved successfully
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
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     licenseType:
 *                       type: string
 *                       example: monthly
 *                     expiryDate:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-01-15T00:00:00Z
 *                     daysRemaining:
 *                       type: integer
 *                       example: 30
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
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */
router.get('/status', licenseAuth(["admin", "student", "teacher"]), getLicenseStatus);

module.exports = router;


