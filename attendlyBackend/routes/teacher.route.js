const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authLayer');
const { startClass, getSessionQR, getLiveAttendance } = require('../controller/teacher.controller');
const licenseAuth = require('../middleware/licenseLayer');

router.post('/start-class', authMiddleware, startClass);
router.get('/session/:id/qr', authMiddleware,licenseAuth(["teacher"]),getSessionQR);
router.get('/live-attendance', authMiddleware, licenseAuth(["teacher","admin"]), getLiveAttendance);

module.exports = router;
